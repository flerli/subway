# TC-A-02: Push-to-Talk STT Submit — Completion Report

**Issue**: TC-A-02
**Component**: Voice Capture + STT (TC-A)
**V-Model**: SWE3-A-02
**Type**: 🔨 IMPLEMENTATION
**Status**: ✅ COMPLETE
**Completed**: 2026-09-21

---

## 1. What Was Built

### New Files

| File | Purpose |
|------|---------|
| `frontend/src/voice/stt.ts` | Whisper-tiny lazy singleton + `transcribeUtterance` with typed fail-closed errors (SW-REQ-013-01) |
| `frontend/src/voice/voiceCapture.ts` | Framework-free push-to-talk state machine (`VoiceCaptureController`) + production `MediaRecorder` factory (SW-REQ-013-01) |
| `frontend/src/voice/useVoiceCapture.ts` | React binding for the controller (snapshot + start/stop/cancel) |
| `frontend/src/voice/VoiceMicButton.tsx` | Presentational top-bar mic button reusing `terminal-button` classes |
| `frontend/src/voice/__tests__/stt.test.ts` | 7 singleton/transcribe tests (cache, eviction, options, negatives) |
| `frontend/src/voice/__tests__/voiceCapture.test.ts` | 12 controller tests (happy path, auto-stop, busy, failures, PII silence) |

### Changed Files

| File | Change |
|------|--------|
| `frontend/src/App.tsx` | Extracted `adoptAssistantThread` + `runAssistantTurn` (behavior-preserving, single-caller refactor); added `handleVoiceTranscriptSubmit` (thread auto-create + turn reuse), voice hook wiring, mic button mount in header actions, mic cancel on logout |
| `frontend/package.json` | `test:voice` extended with the two new test files |
| `project_management/epics/EPIC_013_ASSISTANT_AUDIO_INTERFACE/SW-REQ-013-01_VOICE_CAPTURE_STT.md` | Refined with submit semantics (states, mic release, busy, transcript preservation) |
| `frontend/src/voice/audioInput.ts` | None (reused as-is — foundation held) |

### APIs / Contracts Defined

**`frontend/src/voice/stt.ts`**:
- `transcribeUtterance(samples: PcmData, language: SttLanguage, factory?): Promise<TranscribeResult>` — `{ok, text}` or typed `{code: model-missing | transcribe-failed | empty-audio}`
- `defaultWhisperPipelineFactory` — dynamic import (code-split) + `env.allowRemoteModels = false` + `{local_files_only: true, dtype: 'q8'}`; chunk 30 s / stride 5 s
- `resetSttPipelineCacheForTests`, `VOICE_STT_MODEL_PATH = '/voice-models/whisper-tiny'`

**`frontend/src/voice/voiceCapture.ts`**:
- `VoiceCaptureController` — `start(language)` / `stop()` / `cancel()` / `updateDeps()` / `subscribe()`; states `idle→requesting→listening→transcribing→submitting→idle` + `error`
- `createMediaRecorder` — MIME-negotiated production recorder factory
- Errors: `VoiceInputErrorCode | 'busy' | 'model-missing' | 'transcribe-failed' | 'submit-failed'`; transcripts never logged

**App wiring**: `handleVoiceTranscriptSubmit(content)` (auto-create via `adoptAssistantThread`, send via `runAssistantTurn`), `handleVoiceMicToggle` (listening→stop, requesting→cancel, else start with board language).

---

## 2. Key Decisions

| Decision | Rationale |
|----------|-----------|
| Model binaries NOT vendored in this issue (deviation, documented) | 40 MB+ binaries in git need the architect-level distribution decision (epic risk, TC-B-01 investigates). Singleton implements the full offline contract (`local_files_only`, remote disabled, fail-closed `model-missing`) and is unit-tested with injected factories. Gap recorded for the closer. |
| `initial_prompt` bias deferred (deviation, verified) | Installed v4.3.0 contains zero `initial_prompt` references (checked the bundle). V1 accuracy = `postCorrectTranscript`; `buildInitialPrompt` stays for a future upgrade. SW-REQ updated. |
| Dynamic `import('@huggingface/transformers')` | Keeps the large runtime out of the initial kiosk bundle; loaded on first utterance only |
| Controller is framework-free; hook is a thin binding | Same proven pattern as TC-A-01 (`createLevelMonitor`/`useAudioLevel`): 12 deterministic controller tests, no React harness needed |
| One turn runner for typed + voice prompts | `runAssistantTurn` extracted from `handleAssistantSubmit` (single caller, same-file) so voice transcripts travel the identical streaming/non-streaming path — no duplicated turn logic to drift |
| Mic released right after blob production | Never held during STT/submit; verified by test (`released == ['track']` before submit asserts) |
| AssistantDetailPanel untouched | Submit flows through App state; panel needs no changes — documented per C6 instead of edited |

---

## 3. Gate Results

| Gate | Result | Notes |
|------|--------|-------|
| Pre-check build (Task 0.2) | ✅ | exit 0 (TC-A-01 handoff) |
| Pre-check lint (Task 0.2) | ✅ | 48 errors / 14 warnings baseline |
| Pre-check unit (Task 0.2) | ✅ | 31/31 voice tests |
| Post-implementation build (Task 6) | ✅ | `npm --prefix frontend run build` exit 0, 0 errors |
| Post-implementation lint (Task 6) | ✅ | 48 errors / 14 warnings — identical to baseline, 0 new (2 interim findings fixed via contract, not suppression) |
| Post-implementation unit (Task 6) | ✅ | `npm --prefix frontend run test:voice`: 50 tests, 50 pass, 0 fail (31 + 7 stt + 12 capture) |
| Coverage vs baseline | ✅ | All new modules covered; no repo runner to regress |

## 3.5 Logger Evidence (mandatory)

| Item | Evidence |
|------|----------|
| Event names and allow-listed fields | No new runtime log events (voice state = React state; errors = returned values, not logs) |
| Request/user/session propagation | Voice submit reuses the existing turn runner → existing session/auth context path unchanged; no new request surface |
| Redaction/no-secret tests | `voiceCapture.test.ts` "never logs transcripts or audio": spies `console.log/error/warn` across the happy path, asserts zero calls |
| Sink and failure behavior | N/A — no sink added |
| Audit/metrics separation | N/A — no audit/metrics streams touched |

---

## 4. Handoff for TC-A-03 (Input Circle, Errors, Keyboard, i18n)

**Entry point**: `frontend/src/App.tsx` — `voiceCapture.snapshot` (state/error/transcript), `handleVoiceMicToggle`, `isVoiceInputSupported`; button at the header `.filter-actions`/`.terminal-actions` cell.

**Wiring chain** (complete in-app this issue):
`App.tsx` header `.terminal-marquee` (~line 3800) → `<VoiceMicButton data-voice-state>` → `onToggle=handleVoiceMicToggle` → `useVoiceCapture.start(selectedLanguageCode)/stop()/cancel()` → `VoiceCaptureController` → `stt.transcribeUtterance` (singleton, dynamic import) → `postCorrectTranscript` → `handleVoiceTranscriptSubmit` (auto-create via `adoptAssistantThread` when `selectedAssistantThreadId == null`, send via `runAssistantTurn`) → `frontend/src/api/assistant.ts` (`createAssistantThread:808`, `streamAssistantThreadMessage:886`/`sendAssistantThreadMessage:859`). Trigger: top-bar mic (first button in header actions, desktop + mobile shared header, authenticated shell only) → speak → tap stop → prompt lands in the assistant thread. Bundle proof: `terminal-button--voice` + `data-voice-state` present in `frontend/dist/assets/index-*.js`.

**What you inherit**:
- Capture snapshot: `voiceCapture.snapshot.{state, error, transcript}` — drive the circle (`state === 'listening'`), error taxonomy (`error.code`: `denied|no-device|decode-failed|too-long|empty|unsupported|aborted|busy|model-missing|transcribe-failed|submit-failed`), transcript note
- Level source for the circle: `createLevelMonitor`/`useAudioLevel` (TC-A-01) — wire a real analyser sampler; silence sampler seam already exists in the controller (`sampleInputLevel: null` currently → auto-stop falls back to the 120 s hard cap until TC-A-03 provides live levels)
- Button props take plain labels — replace English defaults with 4-language keys; `aria-label`/`aria-pressed`/`data-voice-state` already in place
- Keyboard suppression: gate the App `focusin` handler (line ~861) on `voiceCapture.snapshot.state` (active = `requesting|listening|transcribing|submitting`); the composer is `AssistantDetailPanel`'s textarea with `data-submit-on-enter`
- i18n conventions: `frontend/src/i18n/localization.ts` + `widgets/assistant/translations.ts` catalog pattern

**What is NOT implemented yet**:
- Live analyser sampler for silence auto-stop (currently hard-cap only) — TC-A-03
- `InputLevelCircle`, error toast/note copy, keyboard rule, 4-language keys, mobile polish — TC-A-03
- Vendored model binaries + `/voice-models/` serving — distribution decision TC-B-01, gap for closer

**Run tests**: `npm --prefix frontend run test:voice` from repo root (50/50 green).

**Known limitations**: STT path untestable end-to-end without model files (unit-tested with injected factories); session expiry mid-capture surfaces via existing auth-required path (mic still released; hook unmount cancels).

**Open risks**: model first-load latency on first tap (prewarm strategy for closer); Safari MediaRecorder quirks on target hardware.

---

## ⚠️ Known Issues / Limitations (if any)

1. **No vendored model binaries** — deliberate, documented above; runtime fails closed with repair copy until distribution lands.
2. **Silence auto-stop uses the hard cap only** — live RMS sampler is TC-A-03's integration point (seam ready).

---

## Traceability

| Level | ID | Artifact |
|-------|-----|---------|
| SYS1 | SYS1-013 | Epic: EPIC_013_ASSISTANT_AUDIO_INTERFACE.md |
| SWE1 | SWE1-A | TC: TC-A-00_COMPONENT_DEFINITION.md |
| SWE3 | SWE3-A-02 | Issue: TC-A-02_PUSH_TO_TALK_STT_SUBMIT.md |
| SWE4 | — | Tests: `frontend/src/voice/__tests__/stt.test.ts`, `voiceCapture.test.ts` (19 new; 50 total) |

---

## Self-verification (no-reviews mode)

| Gate | Command (repo root) | Exit | Result |
|------|---------------------|------|--------|
| D1 Lint (mandatory) | `npm --prefix frontend run lint` | 1 (pre-existing) | ✅ 48/14 = baseline, 0 new |
| D2 Typecheck/build | `npm --prefix frontend run build` | 0 | ✅ 0 errors |
| D3 Tests | `npm --prefix frontend run test:voice` | 0 | ✅ 50/50 pass |
| D4 Smoke through the wiring | bundle grep `terminal-button--voice` in `frontend/dist` + 12 controller tests incl. submit-correction + release ordering | 0 | ✅ button compiled into production bundle; submit path unit-proven. Live-mic runtime smoke belongs to closer TC-A-04 (no mic/model in this env). |
| D5 Self-checklist | — | — | ✅ every file maps to SW-REQ-013-01; `main.tsx` caller unaffected (no App prop changes); assistant API reused unchanged; no `any`/`eslint-disable`; no secrets/PII (PII-silence test); deviations (model binaries, initial_prompt, untouched panel) documented |

Requirement → `file:line` → test → status:
- Singleton STT + offline flags → `stt.ts` (`defaultWhisperPipelineFactory`, `transcribeUtterance`) → `stt.test.ts` (7) → ✅
- Push-to-talk + silence + release + busy → `voiceCapture.ts` (`VoiceCaptureController`) → `voiceCapture.test.ts` (12) → ✅
- Top-bar mount + auto-create submit → `App.tsx` (`VoiceMicButton` mount, `handleVoiceTranscriptSubmit`, `runAssistantTurn`) → bundle proof + controller submit test → ✅
- Fail-closed errors → controller error taxonomy → denial/busy/empty/submit-failed tests → ✅

Wiring chain: header → button → hook → controller → stt → vocab → App submit → assistant API (`file:line` per hop in Handoff §4).

Residual risks / limitations / open questions: see Handoff + Known Issues (model binaries, live sampler, first-load latency, Safari).

Independent review intentionally omitted — TC-A is declared `no-reviews`; gap analysis is inherited by the TC closer (TC-A-04).

---

## Post-completion defect fix (2026-09-21)

**Source**: user browser test on the kiosk — the top-bar mic showed the German
`decode-failed` copy ("Die Aufnahme konnte nicht gelesen werden. Bitte erneut
versuchen.") for every utterance (tap → speak → tap stop). This issue owns
`createMediaRecorder`, so the fix lands here.

**Root cause**: `createMediaRecorder` never called `recorder.start()`. The
recorder stayed `inactive`, so the stop path skipped `recorder.stop()` and
resolved a **0-byte blob**; `decodeToMono16k` handed that empty buffer to
`decodeAudioData`, which throws → `decode-failed`. Every unit/integration test
faked the recorder factory (`createRecorder`), so the production recorder was
never exercised anywhere; the closer's no-mic/no-browser fallback smoke could
not observe it either.

**Fix**

| File | Change |
|:-----|:-------|
| `frontend/src/voice/voiceCapture.ts` | `createMediaRecorder` starts capture on creation (contract documented on the factory); a throwing `start()` bubbles out so the controller fails closed with `unsupported` instead of a silent empty blob |
| `frontend/src/voice/audioInput.ts` | `decodeToMono16k` reports a 0-byte recording as `empty` ("nothing was heard") instead of the misleading `decode-failed` |

**Regression tests (+5, suite 105/105)**

| Test | Covers |
|:-----|:-------|
| `voiceCapture.test.ts` › `createMediaRecorder` "starts capture on creation and returns the recorded bytes" | recorder is `recording` after factory creation; negotiated container; non-empty blob |
| `…` "falls back to the browser default container when nothing is supported" | no probe hit → default constructor, still started |
| `…` "fails closed when the browser refuses to start recording" | `start()` throw → factory throws → controller `unsupported` + mic released |
| `…` "hands real recorded bytes to the decoder through the controller" | controller → production recorder → decoder receives a **non-empty** blob |
| `audioInput.test.ts` › "reports a 0-byte recording as empty, never decode-failed" | empty-blob taxonomy, decoder never called |

**Evidence**

| Check | Command / setup | Result |
|:------|:----------------|:-------|
| Regression power | temporarily comment out `recorder.start()` → `npm --prefix frontend run test:voice` | ✅ 4 new recorder tests fail (101/105), i.e. they catch the defect |
| Unit + integration | `npm --prefix frontend run test:voice` | ✅ 105 tests, 105 pass, 0 fail |
| Typecheck/build | `npm --prefix frontend run build` | ✅ exit 0, 0 errors |
| Lint | `npm --prefix frontend run lint` | ✅ 48 errors / 14 warnings = baseline, 0 new |
| Browser, module level (Playwright Chromium + `--use-fake-device-for-media-stream`, real modules from the Vite dev server) | production factory vs raw recorder control | ✅ before fix: 0-byte blob → `decode-failed`; after fix: 24 446-byte blob → decodes to 24 000 samples (1.5 s @ 16 kHz). Control (raw recorder with `start()`) decoded before and after — isolates the missing `start()` |
| Browser, app level (production bundle via `vite preview`, `/api/**` stubbed at the HTTP boundary, fake mic) | click `button[data-voice-state]` → speak → click stop | ✅ `data-voice-state`: `idle → listening → error`; note = "Speech model is missing. Reinstall or repair the app." — the decode hop now succeeds and STT is reached (screenshot captured) |

**Residual gap (unchanged, now the only blocker for real-browser STT)**: no
Whisper weights are staged — `frontend/public/voice-models/` does not exist, so
`/voice-models/whisper-tiny/*` falls back to the SPA `index.html` and the
runtime fails closed with `model-missing` exactly as designed. The
distribution decision (epic §6 risk row) is recorded as TC-B-closer /
staging follow-up; the STT-weight staging owner issue must be named before the
kiosk hardware test can transcribe.

This also partially closes the closer's "live-mic E2E + visual/device proof"
HIGH gap: the capture→decode→STT chain is now browser-proven with a fake
device; the remaining hardware proof is a real-mic run with staged weights.
