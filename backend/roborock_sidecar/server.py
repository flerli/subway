import dataclasses
import os
from typing import Any

from aiohttp import ClientSession, web
from roborock.data import UserData
from roborock.devices.device_manager import UserParams, create_device_manager
from roborock.exceptions import (
    RoborockAccountDoesNotExist,
    RoborockException,
    RoborockInvalidCode,
    RoborockInvalidCredentials,
    RoborockInvalidEmail,
    RoborockInvalidUserAgreement,
    RoborockMissingParameters,
    RoborockNoUserAgreement,
    RoborockRateLimit,
    RoborockTooFrequentCodeRequests,
)
from roborock.web_api import RoborockApiClient


HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "8789"))


def sanitize_text(value: Any, max_length: int) -> str:
    if not isinstance(value, str):
        return ""

    return value.strip()[:max_length]


def error_response(message: str, error_code: str, status: int) -> web.Response:
    return web.json_response({"error": message, "errorCode": error_code}, status=status)


def parse_email(body: Any) -> str:
    email = sanitize_text(body.get("email") if isinstance(body, dict) else None, 320)

    if not email:
        raise web.HTTPBadRequest(
            text=web.json_response(
                {"error": "email is required.", "errorCode": "roborock_email_required"}
            ).text,
            content_type="application/json",
        )

    return email


def parse_verification_code(body: Any) -> str:
    verification_code = sanitize_text(
        body.get("verificationCode") if isinstance(body, dict) else None,
        32,
    )

    if not verification_code:
        raise web.HTTPBadRequest(
            text=web.json_response(
                {
                    "error": "verificationCode is required.",
                    "errorCode": "roborock_code_required",
                }
            ).text,
            content_type="application/json",
        )

    return verification_code


def parse_session_payload(body: Any) -> tuple[dict[str, Any], str | None]:
    payload = body.get("sessionPayload") if isinstance(body, dict) else None

    if not isinstance(payload, dict):
        raise web.HTTPBadRequest(
            text=web.json_response(
                {
                    "error": "sessionPayload is required.",
                    "errorCode": "roborock_session_payload_required",
                }
            ).text,
            content_type="application/json",
        )

    user_data = payload.get("userData")
    base_url = sanitize_text(payload.get("baseUrl"), 320) or None

    if not isinstance(user_data, dict):
        raise web.HTTPBadRequest(
            text=web.json_response(
                {
                    "error": "sessionPayload.userData is required.",
                    "errorCode": "roborock_user_data_required",
                }
            ).text,
            content_type="application/json",
        )

    return user_data, base_url


def parse_device_duid(body: Any) -> str:
    device_duid = sanitize_text(
        body.get("deviceDuid") if isinstance(body, dict) else None,
        160,
    )

    if not device_duid:
        raise web.HTTPBadRequest(
            text=web.json_response(
                {
                    "error": "deviceDuid is required.",
                    "errorCode": "roborock_device_duid_required",
                }
            ).text,
            content_type="application/json",
        )

    return device_duid


def parse_routine_id(body: Any) -> int | None:
    value = body.get("routineId") if isinstance(body, dict) else None

    if value is None or value == "":
        return None

    if isinstance(value, bool):
        raise web.HTTPBadRequest(
            text=web.json_response(
                {
                    "error": "routineId must be an integer when provided.",
                    "errorCode": "roborock_routine_id_invalid",
                }
            ).text,
            content_type="application/json",
        )

    try:
        return int(value)
    except (TypeError, ValueError):
        raise web.HTTPBadRequest(
            text=web.json_response(
                {
                    "error": "routineId must be an integer when provided.",
                    "errorCode": "roborock_routine_id_invalid",
                }
            ).text,
            content_type="application/json",
        )


def build_user_params(email: str, session_payload: dict[str, Any], base_url: str | None) -> UserParams:
    return UserParams(
        username=email,
        user_data=UserData.from_dict(session_payload),
        base_url=base_url,
    )


def normalize_device(device: Any) -> dict[str, Any]:
    routines_trait = getattr(device.v1_properties, "routines", None)

    return {
        "duid": sanitize_text(getattr(device, "duid", None), 160),
        "name": sanitize_text(getattr(device, "name", None), 160),
        "model": sanitize_text(getattr(device.product, "model", None), 160),
        "productName": sanitize_text(getattr(device.product, "name", None), 160),
        "online": bool(getattr(device.device_info, "online", False)),
        "supportsRoutineSelection": routines_trait is not None,
        "supportsQuickStart": getattr(device.v1_properties, "command", None) is not None,
    }


def normalize_routines(routines: list[Any]) -> list[dict[str, Any]]:
    normalized_routines: list[dict[str, Any]] = []

    for routine in routines:
        routine_id = getattr(routine, "id", None)
        name = sanitize_text(getattr(routine, "name", None), 160)

        if not isinstance(routine_id, int) or not name:
            continue

        normalized_routines.append(
            {
                "id": routine_id,
                "name": name,
            }
        )

    return normalized_routines


def normalize_status(status_trait: Any) -> dict[str, Any]:
    state = getattr(status_trait, "state", None)
    dock_state = getattr(status_trait, "dock_state", None)
    clean_area_square_meters = getattr(status_trait, "square_meter_clean_area", None)
    clean_time_seconds = getattr(status_trait, "clean_time", None)
    clean_percent = getattr(status_trait, "clean_percent", None)
    current_map_id = getattr(status_trait, "current_map", None)
    error_code_name = sanitize_text(getattr(status_trait, "error_code_name", None), 160)
    state_name = sanitize_text(getattr(status_trait, "state_name", None), 160)

    return {
        "state": state.value if hasattr(state, "value") else state,
        "stateName": state_name or None,
        "battery": getattr(status_trait, "battery", None)
        if isinstance(getattr(status_trait, "battery", None), int)
        else None,
        "cleanTimeSeconds": clean_time_seconds if isinstance(clean_time_seconds, int) else None,
        "cleanAreaSquareMeters": clean_area_square_meters
        if isinstance(clean_area_square_meters, (int, float))
        else None,
        "cleanPercent": clean_percent if isinstance(clean_percent, int) else None,
        "currentMapId": current_map_id if isinstance(current_map_id, int) else None,
        "dockState": str(dock_state) if dock_state is not None else None,
        "errorCodeName": error_code_name or None,
        "capabilities": {
            "supportsElapsedTime": isinstance(clean_time_seconds, int),
            "supportsCleaningArea": isinstance(clean_area_square_meters, (int, float)),
            "supportsCleaningPercent": isinstance(clean_percent, int),
            "supportsCurrentMap": isinstance(current_map_id, int),
            "supportsLocation": False,
            "supportsRemainingTime": False,
        },
    }


async def build_device_manager_for_request(
    request: web.Request,
    email: str,
    session_payload: dict[str, Any],
    base_url: str | None,
):
    session: ClientSession = request.app["client_session"]
    user_params = build_user_params(email, session_payload, base_url)
    return await create_device_manager(user_params, session=session, prefer_cache=False)


async def resolve_single_supported_device(
    request: web.Request,
    email: str,
    session_payload: dict[str, Any],
    base_url: str | None,
    device_duid: str,
) -> Any:
    manager = await build_device_manager_for_request(request, email, session_payload, base_url)

    try:
        devices = await manager.get_devices()

        for device in devices:
            if getattr(device, "duid", None) != device_duid:
                continue

            if (
                getattr(device, "v1_properties", None) is None
                or getattr(device.v1_properties, "status", None) is None
                or getattr(device.v1_properties, "command", None) is None
            ):
                raise web.HTTPBadRequest(
                    text=web.json_response(
                        {
                            "error": "The selected Roborock device is not supported.",
                            "errorCode": "roborock_device_unsupported",
                        }
                    ).text,
                    content_type="application/json",
                )

            status_trait = device.v1_properties.status
            await status_trait.refresh()
            return device, normalize_status(status_trait)

        raise web.HTTPNotFound(
            text=web.json_response(
                {
                    "error": "The selected Roborock device was not found.",
                    "errorCode": "roborock_device_not_found",
                }
            ).text,
            content_type="application/json",
        )
    except web.HTTPException:
        raise
    finally:
        await manager.close()


def map_roborock_exception(error: Exception) -> web.Response:
    if isinstance(error, RoborockInvalidCode):
        return error_response(
            "Roborock verification code is invalid.",
            "roborock_invalid_code",
            401,
        )

    if isinstance(error, RoborockInvalidCredentials):
        return error_response(
            "Roborock session is no longer valid.",
            "roborock_session_invalid",
            401,
        )

    if isinstance(error, RoborockAccountDoesNotExist):
        return error_response(
            "Roborock account does not exist.",
            "roborock_account_not_found",
            404,
        )

    if isinstance(error, RoborockInvalidEmail):
        return error_response(
            "Roborock email address is invalid.",
            "roborock_email_invalid",
            400,
        )

    if isinstance(error, RoborockTooFrequentCodeRequests):
        return error_response(
            "Roborock verification codes were requested too frequently.",
            "roborock_code_rate_limited",
            429,
        )

    if isinstance(error, RoborockRateLimit):
        return error_response(
            "Roborock temporarily rejected the request due to rate limiting.",
            "roborock_rate_limited",
            429,
        )

    if isinstance(error, RoborockNoUserAgreement):
        return error_response(
            "The Roborock user agreement must be accepted in the Roborock app.",
            "roborock_user_agreement_required",
            409,
        )

    if isinstance(error, RoborockInvalidUserAgreement):
        return error_response(
            "The Roborock user agreement must be accepted again in the Roborock app.",
            "roborock_user_agreement_invalid",
            409,
        )

    if isinstance(error, RoborockMissingParameters):
        return error_response(
            "Roborock rejected the request because required parameters were missing.",
            "roborock_missing_parameters",
            400,
        )

    if isinstance(error, RoborockException):
        return error_response(
            "Roborock is temporarily unavailable.",
            "roborock_request_failed",
            502,
        )

    return error_response(
        "Roborock sidecar request failed.",
        "roborock_sidecar_internal_error",
        500,
    )


async def health(_: web.Request) -> web.Response:
    return web.json_response({"ok": True})


async def request_code(request: web.Request) -> web.Response:
    try:
        body = await request.json()
    except Exception:
        return error_response("Invalid JSON body.", "roborock_invalid_body", 400)

    try:
        email = parse_email(body)
    except web.HTTPException as error:
        return error

    session: ClientSession = request.app["client_session"]

    try:
        web_api = RoborockApiClient(username=email, session=session)
        await web_api.request_code_v4()
        return web.json_response({"ok": True})
    except Exception as error:
        return map_roborock_exception(error)


async def login(request: web.Request) -> web.Response:
    try:
        body = await request.json()
    except Exception:
        return error_response("Invalid JSON body.", "roborock_invalid_body", 400)

    try:
        email = parse_email(body)
        verification_code = parse_verification_code(body)
    except web.HTTPException as error:
        return error

    session: ClientSession = request.app["client_session"]

    try:
        web_api = RoborockApiClient(username=email, session=session)
        user_data = await web_api.code_login_v4(verification_code)
        base_url = await web_api.base_url
        return web.json_response(
            {
                "sessionPayload": {
                    "userData": dataclasses.asdict(user_data),
                    "baseUrl": base_url,
                }
            }
        )
    except Exception as error:
        return map_roborock_exception(error)


async def session_status(request: web.Request) -> web.Response:
    try:
        body = await request.json()
    except Exception:
        return error_response("Invalid JSON body.", "roborock_invalid_body", 400)

    try:
        email = parse_email(body)
        user_data_payload, base_url = parse_session_payload(body)
        user_data = UserData.from_dict(user_data_payload)
    except web.HTTPException as error:
        return error
    except Exception:
        return error_response(
            "sessionPayload.userData is invalid.",
            "roborock_user_data_invalid",
            400,
        )

    session: ClientSession = request.app["client_session"]

    try:
        web_api = RoborockApiClient(username=email, base_url=base_url, session=session)
        await web_api.get_home_data_v3(user_data)
        return web.json_response({"connected": True})
    except Exception as error:
        return map_roborock_exception(error)


async def devices(request: web.Request) -> web.Response:
    try:
        body = await request.json()
    except Exception:
        return error_response("Invalid JSON body.", "roborock_invalid_body", 400)

    try:
        email = parse_email(body)
        user_data_payload, base_url = parse_session_payload(body)
        selected_device_duid = sanitize_text(body.get("selectedDeviceDuid"), 160)
        manager = await build_device_manager_for_request(request, email, user_data_payload, base_url)
    except web.HTTPException as error:
        return error
    except Exception as error:
        return map_roborock_exception(error)

    try:
        devices_list = [
            device
            for device in await manager.get_devices()
            if getattr(device, "v1_properties", None) is not None
            and getattr(device.v1_properties, "status", None) is not None
            and getattr(device.v1_properties, "command", None) is not None
        ]
        selected_device = next(
            (device for device in devices_list if getattr(device, "duid", None) == selected_device_duid),
            devices_list[0] if devices_list else None,
        )
        routines_trait = (
            getattr(selected_device.v1_properties, "routines", None)
            if selected_device is not None
            else None
        )
        routines = (
            normalize_routines(await routines_trait.get_routines())
            if routines_trait is not None
            else []
        )

        return web.json_response(
            {
                "devices": [normalize_device(device) for device in devices_list],
                "selectedDeviceDuid": getattr(selected_device, "duid", None),
                "routines": routines,
            }
        )
    except Exception as error:
        return map_roborock_exception(error)
    finally:
        await manager.close()


async def status(request: web.Request) -> web.Response:
    try:
        body = await request.json()
    except Exception:
        return error_response("Invalid JSON body.", "roborock_invalid_body", 400)

    try:
        email = parse_email(body)
        user_data_payload, base_url = parse_session_payload(body)
        device_duid = parse_device_duid(body)
        device, status_payload = await resolve_single_supported_device(
            request,
            email,
            user_data_payload,
            base_url,
            device_duid,
        )

        return web.json_response(
            {
                "device": normalize_device(device),
                "status": status_payload,
            }
        )
    except web.HTTPException as error:
        return error
    except Exception as error:
        return map_roborock_exception(error)


async def quick_start(request: web.Request) -> web.Response:
    try:
        body = await request.json()
    except Exception:
        return error_response("Invalid JSON body.", "roborock_invalid_body", 400)

    try:
        email = parse_email(body)
        user_data_payload, base_url = parse_session_payload(body)
        device_duid = parse_device_duid(body)
        routine_id = parse_routine_id(body)
        manager = await build_device_manager_for_request(request, email, user_data_payload, base_url)
    except web.HTTPException as error:
        return error
    except Exception as error:
        return map_roborock_exception(error)

    try:
        devices_list = await manager.get_devices()
        selected_device = next(
            (device for device in devices_list if getattr(device, "duid", None) == device_duid),
            None,
        )

        if selected_device is None:
            return error_response(
                "The selected Roborock device was not found.",
                "roborock_device_not_found",
                404,
            )

        if (
            getattr(selected_device, "v1_properties", None) is None
            or getattr(selected_device.v1_properties, "status", None) is None
            or getattr(selected_device.v1_properties, "command", None) is None
        ):
            return error_response(
                "The selected Roborock device is not supported.",
                "roborock_device_unsupported",
                400,
            )

        routines_trait = getattr(selected_device.v1_properties, "routines", None)

        if routine_id is not None:
            if routines_trait is None:
                return error_response(
                    "The selected Roborock device does not expose routines.",
                    "roborock_routines_unsupported",
                    400,
                )

            available_routines = normalize_routines(await routines_trait.get_routines())

            if not any(routine["id"] == routine_id for routine in available_routines):
                return error_response(
                    "The selected Roborock routine was not found.",
                    "roborock_routine_not_found",
                    404,
                )

            await routines_trait.execute_routine(routine_id)
            start_mode = "routine"
        else:
            await selected_device.v1_properties.command.send("app_start")
            start_mode = "standard"

        status_trait = selected_device.v1_properties.status
        await status_trait.refresh()

        return web.json_response(
            {
                "device": normalize_device(selected_device),
                "status": normalize_status(status_trait),
                "startMode": start_mode,
            }
        )
    except Exception as error:
        return map_roborock_exception(error)
    finally:
        await manager.close()


async def on_startup(app: web.Application) -> None:
    app["client_session"] = ClientSession()


async def on_cleanup(app: web.Application) -> None:
    session: ClientSession = app["client_session"]
    await session.close()


def create_app() -> web.Application:
    app = web.Application()
    app.router.add_get("/health", health)
    app.router.add_post("/request-code", request_code)
    app.router.add_post("/login", login)
    app.router.add_post("/session-status", session_status)
    app.router.add_post("/devices", devices)
    app.router.add_post("/status", status)
    app.router.add_post("/quick-start", quick_start)
    app.on_startup.append(on_startup)
    app.on_cleanup.append(on_cleanup)
    return app


if __name__ == "__main__":
    web.run_app(create_app(), host=HOST, port=PORT)