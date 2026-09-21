# ADR-001: Local STT Singleton + Shared PCM Module for Voice Input

**Status**: Accepted
**Date**: 2026-09-21  |  **Issue**: SWE3-A-04 (TC-A closer)  |  **V-Model**: SWE2

## Context

Voice capture needs (a) Whisper-compatible 16 kHz mono PCM from any mic path
and (b) in-process transcription without cloud, keys, or runtime downloads.
Two consumers exist (voice widget now, Epic 007 audio-visual later), and the
installed `@huggingface/transformers` v4.3.0 exposes no `initial_prompt`
decoder-bias option.

## Decision

- One shared module `frontend/src/voice/audioInput.ts` owns permission,
  16 kHz downmix/resample, validation, and RMS math; Epic 007 reuses it
  instead of a second `getUserMedia` path.
- One lazy per-language singleton (`frontend/src/voice/stt.ts`, dynamic
  import for code-splitting) constructs the pipeline with
  `local_files_only: true`, `dtype: 'q8'`, and process-wide
  `env.allowRemoteModels = false`; missing models fail closed.
- Vocabulary accuracy rests on the deterministic `postCorrectTranscript`
  repair (bare German "bring" deliberately untouched); `initial_prompt`
  bias is deferred until a library version supports it.
- Capture orchestration is framework-free (`VoiceCaptureController`) with a
  thin React binding, so the full path is unit-testable without a DOM harness.

## Alternatives

| Alt | Pros | Cons | Why Rejected |
|-----|------|------|-------------|
| Per-widget mic/PCM code | No shared ownership | Duplicate permission flows, divergent sample rates | Fights with Epic 007; wrong PCM = 100% STT failure |
| `openai-whisper` Python + ffmpeg | Batch tooling exists | ~1 GB torch, system ffmpeg, wrong process boundary | Strictly worse for the kiosk bundle (tech doc §1.5) |
| Cloud STT | Higher accuracy | Keys, network, privacy breach | Violates the offline mandate |
| Larger Whisper (`base`/`small`) | Better accuracy | 75–250 MB size | Budget reserved for TTS weights; revisit if `tiny` + correction proves insufficient |

## Consequences

- Positive: single PCM contract (untestable-as-wrong), offline-by-construction STT, 73 deterministic voice tests with zero new frameworks.
- Negative: model binaries not yet vendored — runtime fails closed until TC-B-01 decides distribution; first-tap model-load latency unmitigated (prewarm open).
- Risks: Safari Web Audio quirks on target hardware; `tiny` accuracy on accents — mitigated by correction list + closer HIGH gap for device verification.
