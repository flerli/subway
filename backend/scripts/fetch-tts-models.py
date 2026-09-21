#!/usr/bin/env python3
"""Stage the Supertonic-3 TTS weights for the offline kiosk (SW-REQ-013-02).

Downloads exactly the files the voice helper requires (mirrors
REQUIRED_MODEL_FILES in backend/tts_helper/tts_helper.py plus the 10 preset
voice styles and license files) from the model host into TARGET_DIR.

Run at backend image build time (network required, ~400 MB); the kiosk never
downloads weights at runtime (the helper runs with --offline). Idempotent:
existing non-empty files are kept unless --force. `--verify` checks an
existing staging without downloading.

Usage:
    python3 scripts/fetch-tts-models.py TARGET_DIR [--force] [--host URL]
    python3 scripts/fetch-tts-models.py --verify TARGET_DIR
"""

import argparse
import os
import shutil
import sys
import tempfile
import urllib.request

MODEL_ID = "Supertone/supertonic-3"
REVISION = "main"

MODEL_FILES = [
    "onnx/tts.json",
    "onnx/unicode_indexer.json",
    "onnx/duration_predictor.onnx",
    "onnx/text_encoder.onnx",
    "onnx/vector_estimator.onnx",
    "onnx/vocoder.onnx",
]
VOICE_STYLES = [f"voice_styles/{voice}.json" for voice in ("M1", "M2", "M3", "M4", "M5", "F1", "F2", "F3", "F4", "F5")]
LINKED_FILES = ["README.md", "LICENSE", "config.json"]

REQUIRED = MODEL_FILES + VOICE_STYLES
ALL_FILES = REQUIRED + LINKED_FILES

DEFAULT_HOST = "https://huggingface.co"


def stage_url(host, file_name):
    return f"{host}/{MODEL_ID}/resolve/{REVISION}/{file_name}"


def file_size(path):
    try:
        return os.path.getsize(path) if os.path.isfile(path) else None
    except OSError:
        return None


def download(host, file_name, target):
    url = stage_url(host, file_name)
    os.makedirs(os.path.dirname(target), exist_ok=True)
    request = urllib.request.Request(url, headers={"User-Agent": "subway-fetch-tts"})
    with urllib.request.urlopen(request, timeout=120) as response:
        expected = response.headers.get("Content-Length")
        expected_bytes = int(expected) if expected else 0
        with tempfile.NamedTemporaryFile(dir=os.path.dirname(target), prefix=".part-", delete=False) as tmp:
            written = 0
            while True:
                chunk = response.read(1024 * 256)
                if not chunk:
                    break
                tmp.write(chunk)
                written += len(chunk)
            tmp_path = tmp.name
    if written == 0 or (expected_bytes > 0 and written != expected_bytes):
        os.unlink(tmp_path)
        raise RuntimeError(f"Incomplete download for {file_name} ({written}/{expected_bytes} bytes)")

    os.replace(tmp_path, target)
    return written


def format_mb(value):
    return f"{value / (1024 * 1024):.1f} MB"


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("target_dir", help="directory that receives the staged weights")
    parser.add_argument("--force", action="store_true", help="re-download existing files")
    parser.add_argument("--host", default=os.environ.get("SUPERTONIC_MODEL_HOST", DEFAULT_HOST))
    parser.add_argument("--verify", action="store_true", help="check an existing staging without downloading")
    args = parser.parse_args(argv)

    target_root = os.path.abspath(args.target_dir)
    os.makedirs(target_root, exist_ok=True)

    if args.verify:
        missing = [file_name for file_name in REQUIRED if file_size(os.path.join(target_root, file_name)) in (None, 0)]
        if missing:
            print(f"[tts-models] NOT staged: {', '.join(missing)}", file=sys.stderr)
            print("[tts-models] run: python3 scripts/fetch-tts-models.py <dir>", file=sys.stderr)
            return 1
        total = sum(size for name in REQUIRED if (size := file_size(os.path.join(target_root, name))))
        print(f"[tts-models] all required files staged ({format_mb(total)})")
        return 0

    print(f"[tts-models] staging {MODEL_ID} into {target_root}")
    fetched = 0
    for file_name in ALL_FILES:
        target = os.path.join(target_root, file_name)
        existing = file_size(target)
        if existing and existing > 0 and not args.force:
            print(f"[tts-models] keep {file_name} ({format_mb(existing)})")
            continue
        size = download(args.host, file_name, target)
        fetched += size
        print(f"[tts-models] {file_name} ({format_mb(size)})")

    print(f"[tts-models] done: +{format_mb(fetched)} fetched/copied, {len(ALL_FILES)} files in {target_root}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))