import os
from typing import Any
from uuid import uuid4

from aiohttp import ClientSession, web
from bring_api import Bring

try:
    from bring_api.exceptions import (
        BringAuthException,
        BringParseException,
        BringRequestException,
    )
except ImportError:
    BringAuthException = Exception
    BringParseException = Exception
    BringRequestException = Exception


HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "8788"))


def sanitize_text(value: Any, max_length: int) -> str:
    if not isinstance(value, str):
        return ""

    return value.strip()[:max_length]


def read_field(value: Any, field_name: str, fallback: Any = None) -> Any:
    if isinstance(value, dict):
        return value.get(field_name, fallback)

    return getattr(value, field_name, fallback)


def normalize_lists(payload: Any) -> list[dict[str, Any]]:
    lists = read_field(payload, "lists", [])

    if not isinstance(lists, list):
        return []

    normalized_lists: list[dict[str, Any]] = []

    for entry in lists:
        list_uuid = sanitize_text(read_field(entry, "listUuid"), 120)
        name = sanitize_text(read_field(entry, "name"), 160)

        if not list_uuid or not name:
            continue

        normalized_lists.append(
            {
                "listUuid": list_uuid,
                "name": name,
                "theme": read_field(entry, "theme")
                if isinstance(read_field(entry, "theme"), str)
                else None,
            }
        )

    return normalized_lists


def normalize_items(items: Any) -> list[dict[str, str]]:
    if not isinstance(items, list):
        return []

    normalized_items: list[dict[str, str]] = []

    for item in items:
        item_name = sanitize_text(read_field(item, "itemId"), 160)

        if not item_name:
            continue

        normalized_items.append(
            {
                "itemName": item_name,
                "specification": sanitize_text(read_field(item, "spec"), 320),
                "uuid": sanitize_text(read_field(item, "uuid"), 120),
                "category": sanitize_text(
                    read_field(item, "category", read_field(item, "itemCategory", "")),
                    120,
                ),
                "recentAt": sanitize_text(
                    read_field(
                        item,
                        "updatedAt",
                        read_field(
                            item,
                            "createdAt",
                            read_field(item, "changedAt", read_field(item, "lastModified", "")),
                        ),
                    ),
                    64,
                ),
            }
        )

    return normalized_items


def normalize_list_snapshot(list_uuid: str, list_name: str, payload: Any) -> dict[str, Any]:
    items = read_field(payload, "items", {})

    return {
        "listUuid": list_uuid,
        "listName": list_name,
        "openItems": normalize_items(read_field(items, "purchase", [])),
        "recentItems": normalize_items(read_field(items, "recently", [])),
    }


async def build_bring_context(
    session: ClientSession,
    username: str,
    password: str,
    list_uuid: str,
) -> tuple[Bring, str]:
    bring = Bring(session, username, password)
    await bring.login()

    available_lists = normalize_lists(await bring.load_lists())
    selected_list = next((entry for entry in available_lists if entry["listUuid"] == list_uuid), None)

    if not selected_list:
        raise web.HTTPNotFound(
            text=web.json_response(
                {
                    "error": "Selected Bring shopping list was not found.",
                    "errorCode": "bring_list_not_found",
                }
            ).text,
            content_type="application/json",
        )

    return bring, selected_list["name"]


def parse_item_body(body: Any) -> tuple[str, str, str]:
    item_name = sanitize_text(read_field(body, "itemName"), 160)
    specification = sanitize_text(read_field(body, "specification"), 320)
    item_uuid = sanitize_text(read_field(body, "itemUuid"), 120)

    if not item_name:
        raise web.HTTPBadRequest(
            text=web.json_response(
                {
                    "error": "itemName is required.",
                    "errorCode": "bring_item_name_required",
                }
            ).text,
            content_type="application/json",
        )

    return item_name, specification, item_uuid


def parse_credentials(body: Any) -> tuple[str, str, str]:
    username = sanitize_text(read_field(body, "username"), 320)
    password = read_field(body, "password") if isinstance(read_field(body, "password"), str) else ""
    list_uuid = sanitize_text(read_field(body, "listUuid"), 120)

    if not username:
        raise web.HTTPBadRequest(
            text=web.json_response(
                {"error": "username is required.", "errorCode": "bring_username_required"}
            ).text,
            content_type="application/json",
        )

    if not password:
        raise web.HTTPBadRequest(
            text=web.json_response(
                {"error": "password is required.", "errorCode": "bring_password_required"}
            ).text,
            content_type="application/json",
        )

    if not list_uuid:
        raise web.HTTPBadRequest(
            text=web.json_response(
                {"error": "listUuid is required.", "errorCode": "bring_list_uuid_required"}
            ).text,
            content_type="application/json",
        )

    return username, password, list_uuid


def error_response(message: str, error_code: str, status: int) -> web.Response:
    return web.json_response({"error": message, "errorCode": error_code}, status=status)


async def perform_item_mutation(
    request: web.Request,
    operation: str,
) -> web.Response:
    try:
        body = await request.json()
    except Exception:
        return error_response("Invalid JSON body.", "bring_invalid_body", 400)

    try:
        username, password, list_uuid = parse_credentials(body)
        item_name, specification, item_uuid = parse_item_body(body)
    except web.HTTPException as error:
        return error

    session: ClientSession = request.app["client_session"]

    try:
        bring, list_name = await build_bring_context(session, username, password, list_uuid)

        if operation == "add":
            await bring.save_item(
                list_uuid,
                item_name,
                specification,
                item_uuid or str(uuid4()),
            )
        elif operation == "update":
            await bring.update_item(list_uuid, item_name, specification, item_uuid or None)
        elif operation == "remove":
            await bring.remove_item(list_uuid, item_name, item_uuid or None)
        elif operation == "complete":
            await bring.complete_item(list_uuid, item_name, specification, item_uuid or None)
        else:
            return error_response("Unsupported Bring operation.", "bring_operation_invalid", 400)

        items_payload = await bring.get_list(list_uuid)
        return web.json_response({"snapshot": normalize_list_snapshot(list_uuid, list_name, items_payload)})
    except BringAuthException:
        return error_response("Bring authentication failed.", "bring_auth_failed", 401)
    except BringParseException:
        return error_response("Bring returned an unexpected payload.", "bring_parse_failed", 502)
    except BringRequestException:
        return error_response("Bring is temporarily unavailable.", "bring_request_failed", 502)
    except web.HTTPException as error:
        return error
    except Exception:
        return error_response("Bring sidecar request failed.", "bring_sidecar_internal_error", 500)


async def health(_: web.Request) -> web.Response:
    return web.json_response({"ok": True})


async def load_lists(request: web.Request) -> web.Response:
    try:
        body = await request.json()
    except Exception:
        return web.json_response(
            {"error": "Invalid JSON body.", "errorCode": "bring_invalid_body"},
            status=400,
        )

    username = sanitize_text(body.get("username"), 320)
    password = body.get("password") if isinstance(body.get("password"), str) else ""

    if not username:
        return web.json_response(
            {"error": "username is required.", "errorCode": "bring_username_required"},
            status=400,
        )

    if not password:
        return web.json_response(
            {"error": "password is required.", "errorCode": "bring_password_required"},
            status=400,
        )

    session: ClientSession = request.app["client_session"]

    try:
        bring = Bring(session, username, password)
        await bring.login()
        lists_payload = await bring.load_lists()
        return web.json_response({"lists": normalize_lists(lists_payload)})
    except BringAuthException:
        return web.json_response(
            {
                "error": "Bring authentication failed.",
                "errorCode": "bring_auth_failed",
            },
            status=401,
        )
    except BringParseException:
        return web.json_response(
            {
                "error": "Bring returned an unexpected payload.",
                "errorCode": "bring_parse_failed",
            },
            status=502,
        )
    except BringRequestException:
        return web.json_response(
            {
                "error": "Bring is temporarily unavailable.",
                "errorCode": "bring_request_failed",
            },
            status=502,
        )
    except Exception:
        return web.json_response(
            {
                "error": "Bring sidecar request failed.",
                "errorCode": "bring_sidecar_internal_error",
            },
            status=500,
        )


async def get_selected_list(request: web.Request) -> web.Response:
    try:
        body = await request.json()
    except Exception:
        return error_response("Invalid JSON body.", "bring_invalid_body", 400)

    try:
        username, password, list_uuid = parse_credentials(body)
    except web.HTTPException as error:
        return error

    session: ClientSession = request.app["client_session"]

    try:
        bring, list_name = await build_bring_context(session, username, password, list_uuid)
        items_payload = await bring.get_list(list_uuid)
        return web.json_response({"snapshot": normalize_list_snapshot(list_uuid, list_name, items_payload)})
    except BringAuthException:
        return error_response("Bring authentication failed.", "bring_auth_failed", 401)
    except BringParseException:
        return error_response("Bring returned an unexpected payload.", "bring_parse_failed", 502)
    except BringRequestException:
        return error_response("Bring is temporarily unavailable.", "bring_request_failed", 502)
    except web.HTTPException as error:
        return error
    except Exception:
        return error_response("Bring sidecar request failed.", "bring_sidecar_internal_error", 500)


async def add_item(request: web.Request) -> web.Response:
    return await perform_item_mutation(request, "add")


async def update_item(request: web.Request) -> web.Response:
    return await perform_item_mutation(request, "update")


async def remove_item(request: web.Request) -> web.Response:
    return await perform_item_mutation(request, "remove")


async def complete_item(request: web.Request) -> web.Response:
    return await perform_item_mutation(request, "complete")


async def on_startup(app: web.Application) -> None:
    app["client_session"] = ClientSession()


async def on_cleanup(app: web.Application) -> None:
    await app["client_session"].close()


def create_app() -> web.Application:
    app = web.Application()
    app.add_routes(
        [
            web.get("/health", health),
            web.post("/lists", load_lists),
            web.post("/selected-list", get_selected_list),
            web.post("/selected-list/items/add", add_item),
            web.post("/selected-list/items/update", update_item),
            web.post("/selected-list/items/remove", remove_item),
            web.post("/selected-list/items/complete", complete_item),
        ]
    )
    app.on_startup.append(on_startup)
    app.on_cleanup.append(on_cleanup)
    return app


if __name__ == "__main__":
    web.run_app(create_app(), host=HOST, port=PORT)