# SW-REQ-013-01: Voice Capture + STT Submit

**Epic**: E-013 (`project_management/epics/EPIC_013_ASSISTANT_AUDIO_INTERFACE.md`)
**V-Model**: SWE1 (owned by TC-A; written by SWE3-A-01)
**Status**: ✅ Defined
**Last Updated**: 2026-09-21 (TC-A-02 post-completion: staged offline STT runtime)

## Requirement

The kiosk provides push-to-talk voice input that submits transcripts as
assistant prompts without a keyboard.

## Shall Statements

1. The app SHALL expose a microphone button in the top bar whenever the user
   is authenticated (desktop board and mobile shell).
2. The microphone SHALL activate only on explicit user tap (push-to-talk);
   tapping again (manual stop) ends capture — capture is purely manual,
   there is no automatic stop of any kind.
3. Capture SHALL normalize audio to 16 kHz mono `Float32Array` PCM
   (`getUserMedia` with echo cancellation/noise suppression/AGC →
   `decodeAudioData` → `OfflineAudioContext` resample/downmix → silence-edge
   trim → RMS level normalization) and validate rate, non-emptiness, and the
   5-minute cap before inference.
4. Transcription SHALL run in-process via vendored **Whisper-`small`**
   (`Xenova/whisper-small`, q8, ~250 MB — the documented accuracy step-up
   from `tiny`/67 MB, tech doc §5; `VOICE_STT_MODEL=Xenova/whisper-tiny` is
   the dev fallback), singleton lazy pipeline, `dtype: 'q8'`, biased by
   `buildInitialPrompt` and repaired by the shared `postCorrectTranscript`
   module. The weights and the ONNX-runtime WASM SHALL be staged into the
   built app at image-build time (`frontend/scripts/fetch-voice-models.mjs`
   → `public/voice-models/`) and loaded from the app's own origin only —
   never from Hugging Face or a CDN at runtime. (`local_files_only` is
   unusable in browser builds: v4.3.0 sets `env.allowLocalModels = false`
   unconditionally, so the runtime pins `remoteHost` to this origin
   instead.) LANGUAGE: this port has NO auto-detection — the board language
   is always forced; without it, output defaults to English and mangles
   other languages.
5. Short mic clips (≤ 30 s) transcribe in a single pass; chunk 30 s /
   stride 5 s applies only to longer recordings (tech doc §1.2).
6. When `VITE_STT_ENDPOINT` is configured, transcription MAY run through an
   external service (multipart WAV + language → JSON `{ text }`), e.g. a
   whisper.cpp server on the kiosk; any endpoint failure SHALL fall back to
   the local model (SW-REQ never depends on the service).

## Submit Semantics (refined SWE3-A-02)

- Capture states: `idle → requesting → listening → transcribing → submitting → idle`, with `error` reachable from any active state.
- The mic is released immediately after the recording blob is produced — never held during transcription or submit.
- Submit reuses the single assistant turn runner (`runAssistantTurn`): voice transcripts travel the identical streaming/non-streaming path as typed prompts.
- A turn that becomes busy mid-utterance fails closed (`busy`); the transcript is discarded and the user retries (no silent loss, no double-submit).
- A rejected submit preserves the transcript in state (`submit-failed`); empty STT results never submit (`empty`).
- Logout or unmount cancels capture and releases the mic. Session expiry mid-capture surfaces through the existing auth-required path.
- Decoder bias note: installed `@huggingface/transformers` v4.3.0 exposes no `initial_prompt` option (verified against the bundle); V1 accuracy rests on `postCorrectTranscript`. Revisit on library upgrade.

## Verification

- SWE4 unit: PCM contract, validation caps, vocabulary corrections, runtime
  config (`frontend/src/voice/__tests__/`, `npm --prefix frontend run test:voice`).
- SWE5 integration (TC-A-04): permission → PCM → STT → submit incl.
  thread auto-create and silence auto-stop.
- SYS3 smoke (TC-A-04): real stack, mic or documented fallback.
- SYS3 browser proof (TC-A-02 post-completion, 2026-09-21): production bundle,
  spoken WAV as fake mic → `idle → listening → transcribing → submitting →
  idle`, transcript submitted, 0 external (HF/CDN) requests. Real-mic accuracy
  on the kiosk remains an open HIGH gap.
