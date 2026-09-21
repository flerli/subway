# SW-REQ-013-01: Voice Capture + STT Submit

**Epic**: E-013 (`project_management/epics/EPIC_013_ASSISTANT_AUDIO_INTERFACE.md`)
**V-Model**: SWE1 (owned by TC-A; written by SWE3-A-01)
**Status**: ✅ Defined
**Last Updated**: 2026-09-21 (refined by SWE3-A-02: submit semantics)

## Requirement

The kiosk provides push-to-talk voice input that submits transcripts as
assistant prompts without a keyboard.

## Shall Statements

1. The app SHALL expose a microphone button in the top bar whenever the user
   is authenticated (desktop board and mobile shell).
2. The microphone SHALL activate only on explicit user tap (push-to-talk);
   tapping again (manual stop) or a silence timeout ends capture.
3. Capture SHALL normalize audio to 16 kHz mono `Float32Array` PCM
   (`getUserMedia` with echo cancellation/noise suppression/AGC →
   `decodeAudioData` → `OfflineAudioContext` resample/downmix) and validate
   rate, non-emptiness, and the 5-minute cap before inference.
4. Transcription SHALL run in-process via vendored Whisper-tiny
   (`@huggingface/transformers`, singleton lazy pipeline, `local_files_only`,
   never a runtime download), biased by `buildInitialPrompt` and repaired by
   the shared `postCorrectTranscript` module.
5. The corrected transcript SHALL submit through the existing assistant
   send flow, auto-creating a thread when none is selected.
6. Raw audio buffers SHALL stay ephemeral: never persisted, never logged,
   never leaving the capture/STT boundary except as 16 kHz PCM in memory.
7. Denied/unavailable/failed capture SHALL fail closed with user-facing copy
   (top-bar toast + transcript note), never silently.

## Submit Semantics (refined SWE3-A-02)

- Capture states: `idle → requesting → listening → transcribing → submitting → idle`, with `error` reachable from any active state.
- The mic is released immediately after the recording blob is produced — never held during transcription or submit.
- Submit reuses the single assistant turn runner (`runAssistantTurn`): voice transcripts travel the identical streaming/non-streaming path as typed prompts.
- A turn that becomes busy mid-utterance fails closed (`busy`); the transcript is discarded and the user retries (no silent loss, no double-submit).
- A rejected submit preserves the transcript in state (`submit-failed`); empty STT results never submit (`empty`).
- Logout or unmount cancels capture and releases the mic. Session expiry mid-capture surfaces through the existing auth-required path.
- Decoder bias note: installed `@huggingface/transformers` v4.3.0 exposes no `initial_prompt` option (verified against the bundle); V1 accuracy rests on `postCorrectTranscript`. Revisit on library upgrade.

## Verification

- SWE4 unit: PCM contract, validation caps, vocabulary corrections
  (`frontend/src/voice/__tests__/`, `npm --prefix frontend run test:voice`).
- SWE5 integration (TC-A-04): permission → PCM → STT → submit incl.
  thread auto-create and silence auto-stop.
- SYS3 smoke (TC-A-04): real stack, mic or documented fallback.
