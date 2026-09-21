# Audio Interface — Local Speech-to-Text and Text-to-Speech Technology Stack

Technology reference for reusing a fully **local, offline, open-source /
open-weight** speech stack in another project. No cloud STT/TTS, no API keys,
no network at inference time.

| Direction | Core technology | Package / model | License |
|---|---|---|---|
| Speech-to-text | OpenAI Whisper (`tiny`, ONNX port) + Transformers.js + ONNX Runtime | `Xenova/whisper-tiny`, `@xenova/transformers` (now `@huggingface/transformers`) | Apache-2.0 |
| Text-to-speech | Supertone Supertonic-3 (99M params, CPU ONNX) | `supertonic==1.3.1` (PyPI), `Supertone/supertonic-3` (Hugging Face) | SDK MIT, weights OpenRAIL-M |
| Audio transcode | Pure-JS WAV parse + MP3 encode | `@breezystack/lamejs` (fork of `lamejs`) | MIT |

```
mic / audio file
  → 16 kHz mono Float32 PCM            (Web Audio resample/downmix)
  → Whisper-tiny ONNX (Transformers.js, in-process JS)   → text     [STT]
text (+ voice + lang)
  → Supertonic-3 ONNX (Python, spawned helper) → WAV 44.1 kHz
  → lamejs (pure JS) → MP3 64 kbps mono / data: URL      [TTS]
```

---

## 1. Speech-to-text: Whisper-tiny via Transformers.js

### 1.1 What the pieces are

- **Whisper** (OpenAI, 2022, “Robust Speech Recognition via Large-Scale Weak
  Supervision”): encoder-decoder Transformer trained on ~680k hours of weakly
  supervised multilingual audio. Tasks: `transcribe` / `translate`, with language
  detection. Model sizes: tiny (39M) → base (74M) → small → medium → large.
  `tiny` is the speed/accuracy floor: fast on CPU, weak on accents, jargon, and
  noisy audio.
- **Xenova/whisper-tiny** (Hugging Face): community ONNX port of
  `openai/whisper-tiny` for Transformers.js. Converted with 🤗 Optimum; weights
  live under `onnx/` (`encoder_model_quantized.onnx`,
  `decoder_model_merged_quantized.onnx`, plus `config.json`,
  `tokenizer.json`, `preprocessor_config.json`, …). Multilingual `whisper-tiny`
  vs English-only `whisper-tiny.en` — pick multilingual unless the product is
  English-only.
- **Transformers.js** (`@xenova/transformers` v2, successor
  `@huggingface/transformers` v3): Hugging Face `pipeline()` API in JavaScript,
  backed by **ONNX Runtime** (Node / Electron / browser via
  `onnxruntime-web`, WebGPU optional). The `automatic-speech-recognition`
  pipeline handles log-Mel feature extraction, chunked encode/decode, and
  timestamp stitching.
- **Quantization**: shipped as quantized INT8 / q4f16 ONNX (~40 MB total instead
  of ~150 MB fp32). That is what makes CPU, in-app, offline transcription
  practical.

### 1.2 Canonical usage

```js
import { pipeline } from '@huggingface/transformers'; // or @xenova/transformers

const transcriber = await pipeline(
  'automatic-speech-recognition',
  'Xenova/whisper-tiny',
  { quantized: true, local_files_only: true }
);

const out = await transcriber(float32_16kHzMonoSamples, {
  chunk_length_s: 30,
  stride_length_s: 5,
  task: 'transcribe',       // or 'translate'
  // return_timestamps: true | 'word'
});
// out: { text, chunks? }
```

Critical settings for an offline product build:

- `local_files_only: true`, `allowRemoteModels: false`, explicit
  `localModelPath` — the model must resolve from the app bundle, never from a
  CDN or `~/.cache` at runtime.
- Singleton pipeline (lazy, cached promise). Model load is the slow part
  (hundreds of ms to seconds); per-utterance inference on `tiny` is ~real-time
  or faster on a modern laptop CPU.
- Chunk 30 s / stride 5 s is the standard long-form recipe; short mic clips
  go through in one pass.

### 1.3 The PCM contract (applies to any frontend)

Whisper expects **16 kHz mono `Float32Array` in [-1, 1]**. Any capture path must
normalize to that before inference:

1. Capture: `getUserMedia({ audio: { echoCancellation, noiseSuppression,
   autoGainControl } })` + `MediaRecorder` (e.g. `audio/webm;codecs=opus`), or
   decode an existing file (`mp3/wav/m4a/ogg/webm`).
2. Decode + resample + downmix: `AudioContext.decodeAudioData()` →
   `OfflineAudioContext(1, duration*16000, 16000)` render → channel 0.
3. Validate: sample rate == 16000, non-empty, length % 4 == 0, enforce a cap
   (e.g. 5 min for mic clips ≈ 4.8M samples, 30 min for file transcription).
4. Send raw PCM (not the compressed blob) to the inference boundary.

### 1.4 Accuracy add-on: domain vocabulary

`tiny` mangles product names. Two complementary, engine-agnostic techniques:

- **Initial prompt** (Whisper-native): pass a vocabulary string as
  `initial_prompt` so the decoder is biased toward spellings like
  “Swaibian”, “scaiCo”, “Globetrotter”. Supported by both the Python
  `openai-whisper` package and Transformers.js-style decoders.
- **Post-correction pass** (deterministic): ordered regex replacements over the
  transcript (`wodivity|wordivity plaza` → `Wodivity Plaza`,
  `sky-co` → `scaiCo`, …). Cheap, testable, language-independent; keep the list
  in one shared module used by every STT entry point.

### 1.5 Python alternative (heavier, legacy)

`openai-whisper` (PyPI) + system `ffmpeg`: `whisper.load_model('base')` →
`model.transcribe(path, initial_prompt=…, language=…)`. Output: text + language
+ segments (`start/end/text`), convertible to SRT. Requires a Python
interpreter, ~1 GB torch install, and `ffmpeg` on PATH — strictly worse for a
desktop/Electron bundle than the in-process ONNX path, but useful for scripts
and batch jobs.

---

## 2. Text-to-speech: Supertonic-3 via the `supertonic` Python SDK

### 2.1 What it is

- **Supertonic-3** (Supertone, 2026): 99M-parameter open-weight multilingual TTS,
  **ONNX Runtime, CPU-only, no GPU, no cloud**. ~5–8× smaller than typical
  500–800M GPU TTS baselines with comparable real-time factor
  (RTF ≈ 0.2, i.e. ~5× faster than real time on a 16-thread CPU).
- **Audio**: studio-grade **44.1 kHz 16-bit WAV** out, no external vocoder or
  upsampler needed.
- **Languages**: 31 (`en, ko, ja, ar, bg, cs, da, de, el, es, et, fi, fr, hi,
  hr, hu, id, it, lt, lv, nl, pl, pt, ro, ru, sk, sl, sv, tr, uk, vi`) plus
  `na` = language-agnostic fallback when the input language is unknown.
  One model, no per-language adapters.
- **Voices**: 10 built-in presets (`M1–M5` male, `F1–F5` female) as
  `voice_styles/*.json` embeddings, plus **zero-shot custom voices** (Voice
  Builder export → `get_voice_style_from_path()`), plus 10 inline
  **expression tags** (`<laugh>`, `<breath>`, `<sigh>`, …).
- **Model layout** (~400 MB): `onnx/tts.json`, `onnx/unicode_indexer.json`,
  `onnx/duration_predictor.onnx`, `onnx/text_encoder.onnx`,
  `onnx/vector_estimator.onnx`, `onnx/vocoder.onnx`, and
  `voice_styles/{M1..M5,F1..F5}.json`.

### 2.2 SDK (`pip install supertonic`, currently 1.3.1)

```python
from supertonic import TTS

tts = TTS(model='supertonic-3', model_dir='/path/to/model',
          auto_download=False, intra_op_num_threads=2, inter_op_num_threads=1)
style = tts.get_voice_style(voice_name='M1')          # or get_voice_style_from_path('my_voice.json')
wav, duration = tts.synthesize(text, voice_style=style, lang='en',
                               total_steps=8)          # quality 5 (fast) .. 12 (best)
tts.save_audio(wav, 'output.wav')
```

Also ships a CLI (`supertonic tts '…' -o out.wav --voice F1 --lang ko --steps 10`)
and, since 1.3.1, `supertonic serve` — a loopback-only HTTP wrapper with native
`/v1/tts` and OpenAI-compatible `/v1/audio/speech` endpoints, useful when the
caller cannot easily spawn Python (browser extensions, automation tools).

References: PyPI `supertonic`, GitHub `supertone-inc/supertonic` (+
`supertonic-py`), Hugging Face `Supertone/supertonic-3`, papers
SupertonicTTS / RobustSpeechFlow / LARoPE (arXiv).

### 2.3 Recommended process boundary

The model runs under ONNX Runtime inside Python, while most app shells are
Node/Electron. The robust pattern is a **thin helper process with a
one-JSON-object-on-stdout contract**:

```
my_tts_helper.py --text … --voice M1 --lang en --output-dir <cache> --format wav [--model-dir … --offline]
stdout: {"ok": true, "audio_path": "/abs/….wav", "duration_seconds": 2.1,
         "voice": "M1", "language": "en", "mime_type": "audio/wav"}
        {"ok": false, "error": "…"}   # never traceback/audio bytes on stdout
```

Caller responsibilities (any language):

- Probe the interpreter first (`import supertonic` + version pin check) and
  cache the result briefly; probe failures are never cached permanently.
- Pass `--model-dir` + `--offline` in production so first-run
  `~/.cache/supertonic3` downloads can never trigger at runtime.
- Enforce a timeout (e.g. 120 s) with TERM → KILL escalation; cap stdout/stderr
  buffers.
- Cache by `SHA256(sdk_version + cacheKey + text + voice + language)` on disk;
  evict by age (e.g. 7 days) and total size (e.g. 500 MB).

---

## 3. Audio codec: WAV in, MP3 out (no ffmpeg)

Raw 44.1 kHz WAV is ~10× larger than needed for speech playback/storage.
The portable, dependency-free recipe:

1. Parse the WAV in-process (RIFF/`fmt `/`data` chunks; PCM int 8/16/24/32 and
   float32; mono or stereo → downmix to mono by averaging channels).
2. Encode with **`@breezystack/lamejs`** (pure-JS MP3, MIT) — 1 channel, source
   sample rate, ~64 kbps — in 1152-sample frames + `flush()`.
3. Store/ship `data:audio/mpeg;base64,…` + `durationMs = round(samples /
   sampleRate * 1000)`. Never persist or label raw WAV as MP3.

This removes any need for system `ffmpeg` or native codecs on the synthesis
path (ffmpeg is still only relevant to the legacy Python `openai-whisper` file
path in §1.5).

---

## 4. Reuse blueprint (engine-agnostic checklist)

1. **Bundle models at build time, verify by checksum.** STT (~40 MB quantized
   ONNX + tokenizer) and TTS (~400 MB ONNX + voice JSONs) ship inside the
   installer; verify required files + SHA-256 at staging and at pack time; run
   one real offline synthesis as a build gate.
2. **Keep inference offline by construction.** `allowRemoteModels: false` /
   `--offline` + explicit model dir; fail closed with a “reinstall / repair
   runtime” message instead of downloading.
3. **Isolate runtimes.** STT = in-process JS (ONNX Runtime, singleton pipeline);
   TTS = spawned Python (helper CLI, timeouts, buffered-output caps). Never
   block the UI thread on either.
4. **Normalize audio once.** One shared 16 kHz-mono-PCM function used by mic
   input, file transcription, and tests.
5. **Cache TTS aggressively.** Text+voice+language key; voice and language are
   part of the key even when the caller supplies its own `cacheKey`.
6. **Gate before synthesizing.** A `get_status()`-style readiness check
   (runtime import OK? pinned version? model files complete? voices list?)
   precedes any batch narration run.
7. **Playback sync is just offsets.** For narrated content, stack per-chapter
   durations into cumulative `startMs`; the active chapter at time `t` is the
   one with `startMs <= t < startMs + durationMs`.

---

## 5. Trade-offs, limits, licensing

- **Accuracy vs size (STT):** `tiny` is the smallest Whisper; expect errors on
  proper nouns, overlapping speech, heavy accents — that is what §1.4 mitigates.
  Step up to `base`/`small` only if the ~75–250 MB size budget allows.
- **Throughput (TTS):** ~5× real-time on desktop CPU; batch chapters in
  parallel (`Promise.all`-style fan-out); keep chapters to 2–5 spoken sentences
  for stable prosody and retry granularity.
- **No streaming / wake-word / VAD in this stack:** push-to-talk mic capture +
  whole-utterance inference + whole-chapter synthesis. Add a VAD (e.g.
  Silero-VAD via ONNX) and streaming decoder only if hands-free is required.
- **Licenses (ship with the app):** Whisper weights + port Apache-2.0 (include
  `LICENSE` + attribution `NOTICE.txt` next to the staged model);
  `supertonic` SDK MIT; Supertonic-3 weights OpenRAIL-M (comply with its use
  restrictions); `lamejs` fork MIT. Quantized STT ~tens of MB; TTS ~401 MB
  pre-compression — plan installer size accordingly.
- **Privacy posture:** microphone only after explicit user action; recognition
  and synthesis never emit network traffic; transcripts/audio stay on device
  unless the surrounding product explicitly exports them.

---

## 6. Minimal dependency list for a new project

| Need | Dependency | Source |
|---|---|---|
| STT inference (JS) | `@huggingface/transformers` (successor of `@xenova/transformers`) + `onnxruntime` (pulled in transitively; `onnxruntime-web` for browser) | npm |
| STT weights | `Xenova/whisper-tiny` (or `.en`) — `onnx/*quantized*.onnx`, `config.json`, `tokenizer*.json`, `preprocessor_config.json` | Hugging Face, vendored + checksummed |
| TTS engine | `supertonic==1.3.1` | PyPI |
| TTS weights | `Supertone/supertonic-3` — `onnx/*.onnx` + `*.json`, `voice_styles/*.json` | Hugging Face, vendored + checksummed |
| WAV→MP3 | `@breezystack/lamejs` | npm |
| Resample (frontend) | Built-in `AudioContext` / `OfflineAudioContext` | Web platform, no dep |
| File-path STT only (optional) | `openai-whisper` + system `ffmpeg` | PyPI + OS package manager |
