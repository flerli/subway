#!/usr/bin/env python3
"""Supertonic-3 TTS helper CLI (SW-REQ-013-02).

One-JSON-object-on-stdout contract: stdout carries exactly one JSON document
(`{"ok": true, ...}` or `{"ok": false, "error": ...}`) and nothing else.
Tracebacks and diagnostics go to stderr only, so the Node caller can parse
stdout unconditionally.

Usage:
    tts_helper.py --probe [--model-dir DIR]
    tts_helper.py --text "..." --voice M1 --lang de --output-file out.wav
        [--model-dir DIR] [--offline] [--steps 8] [--format wav]
"""

import argparse
import json
import os
import sys
import traceback
import wave

SUPERTONIC_PIN = "1.3.1"
DEFAULT_STEPS = 8
MIN_STEPS = 5
MAX_STEPS = 12
MAX_TEXT_CHARS = 1000

PRESET_VOICES = ("M1", "M2", "M3", "M4", "M5", "F1", "F2", "F3", "F4", "F5")

# Supertonic-3 language codes plus the language-agnostic fallback.
SUPPORTED_LANGS = (
    "en", "ko", "ja", "ar", "bg", "cs", "da", "de", "el", "es", "et",
    "fi", "fr", "hi", "hr", "hu", "id", "it", "lt", "lv", "nl", "pl",
    "pt", "ro", "ru", "sk", "sl", "sv", "tr", "uk", "vi", "na",
)

REQUIRED_MODEL_FILES = (
    os.path.join("onnx", "tts.json"),
    os.path.join("onnx", "unicode_indexer.json"),
    os.path.join("onnx", "duration_predictor.onnx"),
    os.path.join("onnx", "text_encoder.onnx"),
    os.path.join("onnx", "vector_estimator.onnx"),
    os.path.join("onnx", "vocoder.onnx"),
)


def emit(payload):
    """Write the single stdout document. Nothing else may print to stdout."""
    sys.stdout.write(json.dumps(payload))
    sys.stdout.flush()


def fail(message):
    emit({"ok": False, "error": message})
    return 1


def log_diagnostic(message):
    sys.stderr.write(str(message) + "\n")
    sys.stderr.flush()


def import_supertonic():
    try:
        import supertonic  # noqa: PLC0415

        return supertonic, getattr(supertonic, "__version__", "unknown")
    except Exception as exc:  # noqa: BLE001 - reported as JSON, never raised
        log_diagnostic("supertonic import failed: %s" % exc)
        return None, None


def default_model_dir():
    return os.path.expanduser(os.path.join("~", ".cache", "supertonic3"))


def check_model_files(model_dir):
    missing = [
        rel
        for rel in REQUIRED_MODEL_FILES
        if not os.path.isfile(os.path.join(model_dir, rel))
    ]
    voices = [
        name
        for name in PRESET_VOICES
        if os.path.isfile(os.path.join(model_dir, "voice_styles", name + ".json"))
    ]
    return missing, voices


def run_probe(model_dir):
    supertonic, sdk_version = import_supertonic()
    missing, voices = check_model_files(model_dir)
    emit(
        {
            "ok": True,
            "import_ok": supertonic is not None,
            "sdk_version": sdk_version,
            "sdk_pin": SUPERTONIC_PIN,
            "model_dir": model_dir,
            "model_files_present": len(missing) == 0,
            "missing_files": missing,
            "voices": voices,
        }
    )
    return 0


def normalize_voice(value):
    voice = (value or "").strip().upper()
    return voice if voice in PRESET_VOICES else None


def normalize_lang(value):
    lang = (value or "").strip().lower()
    return lang if lang in SUPPORTED_LANGS else "na"


def run_synth(args):
    text = (args.text or "").strip()
    if not text:
        return fail("Empty text.")
    if len(text) > MAX_TEXT_CHARS:
        return fail("Text exceeds the %d character cap." % MAX_TEXT_CHARS)

    voice = normalize_voice(args.voice)
    if not voice:
        return fail("Unknown voice '%s'." % (args.voice or ""))

    lang = normalize_lang(args.lang)
    steps = max(MIN_STEPS, min(MAX_STEPS, int(args.steps or DEFAULT_STEPS)))

    if (args.format or "wav").lower() != "wav":
        return fail("Unsupported format '%s' (wav only)." % (args.format or ""))

    output_file = os.path.abspath(args.output_file or "")
    if not output_file:
        return fail("Missing --output-file.")

    supertonic, sdk_version = import_supertonic()
    if supertonic is None:
        return fail("Speech runtime is not installed (reinstall / repair runtime).")

    if sdk_version != SUPERTONIC_PIN:
        log_diagnostic(
            "supertonic version %s differs from pin %s." % (sdk_version, SUPERTONIC_PIN)
        )

    missing, voices = check_model_files(args.model_dir)
    if missing:
        return fail(
            "Speech model files are missing from %s (reinstall / repair runtime)."
            % args.model_dir
        )
    if voice not in voices:
        return fail("Voice '%s' is not installed." % voice)

    try:
        tts = supertonic.TTS(
            model="supertonic-3",
            model_dir=args.model_dir,
            auto_download=not args.offline,
        )
        style = tts.get_voice_style(voice_name=voice)
        result = tts.synthesize(text, voice_style=style, total_steps=steps, lang=lang)
        samples = result[0]
    except Exception as exc:  # noqa: BLE001 - reported as JSON, never raised
        log_diagnostic("synthesis failed: %s\n%s" % (exc, traceback.format_exc()))
        return fail("Speech synthesis failed.")

    try:
        tts.save_audio(samples, output_file)
    except Exception as exc:  # noqa: BLE001 - reported as JSON, never raised
        log_diagnostic("save failed: %s" % exc)
        return fail("Could not write synthesized audio.")

    try:
        with wave.open(output_file, "rb") as wav:
            frames = wav.getnframes()
            rate = wav.getframerate()
            channels = wav.getnchannels()
    except Exception as exc:  # noqa: BLE001 - reported as JSON, never raised
        log_diagnostic("verify failed: %s" % exc)
        return fail("Synthesized audio failed verification.")

    emit(
        {
            "ok": True,
            "audio_path": output_file,
            "duration_seconds": round(frames / rate, 3) if rate else 0,
            "voice": voice,
            "language": lang,
            "mime_type": "audio/wav",
            "sample_rate": rate,
            "channels": channels,
        }
    )
    return 0


def main(argv=None):
    parser = argparse.ArgumentParser(description="Local Supertonic-3 TTS helper.")
    parser.add_argument("--probe", action="store_true")
    parser.add_argument("--text", default="")
    parser.add_argument("--voice", default="M1")
    parser.add_argument("--lang", default="na")
    parser.add_argument("--output-dir", default="")
    parser.add_argument("--output-file", default="")
    parser.add_argument("--format", default="wav")
    parser.add_argument("--model-dir", default=default_model_dir())
    parser.add_argument("--offline", action="store_true")
    parser.add_argument("--steps", type=int, default=DEFAULT_STEPS)
    args = parser.parse_args(argv)

    if args.probe:
        return run_probe(os.path.abspath(args.model_dir))

    if args.output_dir and not args.output_file:
        parser.error("--output-file is required for synthesis.")

    try:
        return run_synth(args)
    except Exception as exc:  # noqa: BLE001 - last-resort JSON guard
        log_diagnostic("unexpected failure: %s\n%s" % (exc, traceback.format_exc()))
        return fail("Speech helper failed unexpectedly.")


if __name__ == "__main__":
    sys.exit(main())
