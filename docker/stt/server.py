"""Subway STT service: faster-whisper behind a tiny HTTP API.

Contract (matches the board's `VITE_STT_ENDPOINT` client):
  POST /transcribe  multipart: `file` (WAV/PCM audio) + `language` (e.g. `de`)
  -> 200 {"text": "<transcript>"} | 400 missing file | 503 engine unavailable
  GET  /health     -> {"status": "ok"|"degraded", "model": ..., "device": ...}
  OPTIONS *        -> 200 with CORS + Private-Network-Access headers, so kiosk
                      browsers served from the VPS HTTPS origin may call the
                      loopback service (all responses carry the same headers).

Configuration (env):
  WHISPER_MODEL   faster-whisper model id, default "small"
  WHISPER_DEVICE  "cpu" (default) or "cuda"
  WHISPER_COMPUTE compute type, default "int8" on CPU
  WHISPER_PRELOAD "1" (default) downloads/loads the model at container start;
                  with "0" it loads lazily on the first request instead.
  PORT            default 8080

Offline posture: with WHISPER_PRELOAD=1 (and the model cached in the image
or a mounted volume), the service needs no network at request time.
"""

import io
import logging
import os
import wave
from typing import Optional

log = logging.getLogger("subway-stt")

WHISPER_MODEL = os.environ.get("WHISPER_MODEL", "small")
WHISPER_DEVICE = os.environ.get("WHISPER_DEVICE", "cpu")
WHISPER_COMPUTE = os.environ.get("WHISPER_COMPUTE", "int8")
WHISPER_PRELOAD = os.environ.get("WHISPER_PRELOAD", "1") == "1"
PORT = int(os.environ.get("PORT", "8080"))

_model = None
_model_error: Optional[str] = None


def normalize_language(value) -> str:
    """Map board language codes to whisper.cpp/faster-whisper language ids."""
    code = str(value or "").strip().lower()
    if code in ("auto", ""):
        return "auto"
    if len(code) == 2 and code.isalpha():
        return code
    return "auto"


def validate_audio_bytes(raw: bytes) -> tuple[bool, str]:
    """Cheap pre-checks before spending inference time (WAV + sane size)."""
    if not raw:
        return False, "empty audio"
    if len(raw) < 100:
        return False, "audio too short"
    if len(raw) > 25 * 1024 * 1024:
        return False, "audio too large (25 MB cap)"
    if raw[:4] != b"RIFF" or raw[8:12] != b"WAVE":
        return False, "expected a WAV file"
    try:
        with wave.open(io.BytesIO(raw), "rb") as wav:
            if wav.getnframes() <= 0:
                return False, "no audio frames"
    except Exception:
        return False, "unreadable WAV file"
    return True, ""


def get_model():
    """Lazy singleton: import + load faster-whisper on first use."""
    global _model, _model_error
    if _model is not None:
        return _model
    try:
        from faster_whisper import WhisperModel
    except Exception as exc:
        _model_error = f"faster-whisper unavailable: {exc}"
        raise RuntimeError(_model_error) from exc
    try:
        _model = WhisperModel(
            WHISPER_MODEL, device=WHISPER_DEVICE, compute_type=WHISPER_COMPUTE
        )
    except Exception as exc:
        _model_error = f"model load failed ({WHISPER_MODEL}): {exc}"
        raise RuntimeError(_model_error) from exc
    log.info("loaded whisper model %s on %s (%s)", WHISPER_MODEL, WHISPER_DEVICE, WHISPER_COMPUTE)
    return _model


def transcribe_bytes(raw: bytes, language: str) -> str:
    """Run one utterance through the model; returns the joined transcript."""
    model = get_model()
    segments, _info = model.transcribe(
        io.BytesIO(raw),
        language=None if language == "auto" else language,
        vad_filter=True,
        vad_parameters={"min_silence_duration_ms": 300},
    )
    return " ".join(segment.text.strip() for segment in segments).strip()


def create_app():
    from fastapi import FastAPI, File, Form, Request, UploadFile
    from fastapi.responses import JSONResponse, Response

    app = FastAPI(title="subway-stt")

    # Kiosk browsers load the board from the VPS HTTPS origin but reach this
    # service at http://127.0.0.1:8080 — a public-to-loopback hop. Chrome
    # answers that with a Private Network Access preflight (OPTIONS) and
    # enforces CORS. The board fetch carries no credentials, so a wildcard
    # origin is sufficient; without these headers every kiosk request fails
    # before it reaches /transcribe.
    BROWSER_ACCESS_HEADERS = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Private-Network": "true",
        "Access-Control-Max-Age": "86400",
    }

    @app.middleware("http")
    async def kiosk_browser_access(request: Request, call_next):
        if request.method == "OPTIONS":
            return Response(status_code=200, headers=BROWSER_ACCESS_HEADERS)
        response = await call_next(request)
        for key, value in BROWSER_ACCESS_HEADERS.items():
            response.headers[key] = value
        return response

    @app.get("/health")
    def health():
        try:
            get_model()
            return {"status": "ok", "model": WHISPER_MODEL, "device": WHISPER_DEVICE}
        except Exception as exc:
            return JSONResponse(
                status_code=503,
                content={"status": "degraded", "model": WHISPER_MODEL, "detail": str(exc)[:200]},
            )

    @app.post("/transcribe")
    async def transcribe(file: UploadFile = File(...), language: str = Form("auto")):
        raw = await file.read()
        valid, reason = validate_audio_bytes(raw)
        if not valid:
            return JSONResponse(status_code=400, content={"error": reason})
        try:
            text = transcribe_bytes(raw, normalize_language(language))
        except RuntimeError as exc:
            return JSONResponse(status_code=503, content={"error": str(exc)[:200]})
        return {"text": text}

    return app


try:
    app = create_app()
except Exception as exc:  # fastapi missing (unit-test envs) — helpers still importable
    log.warning("API disabled: %s", exc)
    app = None


if __name__ == "__main__":
    import uvicorn

    if app is None:
        raise SystemExit("fastapi is required to serve (pip install -r requirements.txt)")

    if WHISPER_PRELOAD:
        try:
            get_model()
        except Exception as exc:
            log.warning("preload failed, will retry on first request: %s", exc)

    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="info")
