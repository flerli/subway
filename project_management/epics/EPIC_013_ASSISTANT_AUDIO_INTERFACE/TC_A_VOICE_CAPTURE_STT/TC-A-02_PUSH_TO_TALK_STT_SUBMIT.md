# TC-A-02: Push-to-Talk STT Submit with Thread Auto-Create

**Component**: Voice Capture + STT (TC-A)
**Epic**: E-013 Assistant Audio Interface
**V-Model**: SWE3-A-02
**Type**: 🔨 IMPLEMENTATION
**Priority**: P0-Critical
**Estimated Effort**: L
**Dependencies**: TC-A-01 (shared mic/PCM/vocabulary foundation)
**SW-REQ**: SW-REQ-013-01

---

## ⚠️ PROJECT CRITICALITY DISCLAIMER

┌─────────────────────────────────────────────────────────────────────────────┐
│  🚀 MISSION-CRITICAL APPLICATION - READ BEFORE STARTING ANY WORK            │
├─────────────────────────────────────────────────────────────────────────────┤
│  This project is a LIVE PRODUCTION SYSTEM used by real customers.           │
│  • Errors directly impact user trust, data integrity, and revenue.          │
│  • NEVER commit code without understanding its impact.                      │
└─────────────────────────────────────────────────────────────────────────────┘

---

## 🎯 Vision & Criticality

Wire the foundation into a working voice-submit loop: top-bar mic → push-to-talk capture → Whisper-tiny transcription → corrected transcript submitted as the assistant prompt (auto-creating a thread when none is selected). This is the moment voice becomes real.

**High Stakes**: Broken submit path strands users in a listening state with no prompt sent; wrong thread handling loses transcripts.
**Constraints**: Singleton lazy pipeline (`local_files_only`, bundled model, never CDN/`~/.cache` at runtime); chunk 30 s / stride 5 s long-form recipe, single pass for mic clips; ephemeral audio; mic released on unmount/cancel.

---

## 🏗️ Architectural Context

```
[Top-bar mic] → useVoiceCapture → audioInput.capture → normalizeTo16kMono → stt.transcribe (singleton) → vocabulary.postCorrect → assistant API (create thread if needed → send message) → transcript note
```

See: `project_management/architecture/README.md` for full context.

---

## Traceability

| Level | ID | Artifact |
|-------|-----|---------|
| SYS1 | SYS1-013 | Epic: EPIC_013_ASSISTANT_AUDIO_INTERFACE.md |
| SWE1 | SWE1-A | TC: TC-A-00_COMPONENT_DEFINITION.md |
| SWE3 | SWE3-A-02 | This issue |
| SWE4 | — | Unit tests in: `frontend/src/voice/__tests__/stt.test.*`, submit-path tests |

---

## 📋 Task List

### 0.0 Read Architecture Documentation [MANDATORY]
- [x] **Read: `project_management/architecture/README.md`**
- [x] **Read: relevant diagrams** in `project_management/architecture/diagrams/`

### 0.1 Read Predecessor Context [MANDATORY]
- [x] **Read: `TC-A-00_COMPONENT_DEFINITION.md`**
- [x] **Read: `TC-A-01_SHARED_MIC_PCM_PERMISSION_LEVEL_FOUNDATION_COMPLETION_REPORT.md`** ← predecessor's handoff

> ⚠️ Do NOT skip. TC-A-01 defines the PCM/vocabulary/level APIs, version pins, caps, and tooling baseline this issue builds on.

### 0.2 Run Full Test Suite [MANDATORY GATE 🔴]
- [x] `npm --prefix frontend run build` [MANDATORY 🔴] + `npm --prefix frontend run lint` [MANDATORY 🔴 from this issue] + voice unit tests from TC-A-01
- [x] Record baseline; **Gate**: new failures/errors vs TC-A-01 handoff → STOP and investigate.

### 1. Investigate Requirements
- [x] Read: SW-REQ-013-01 (written by TC-A-01)
- [x] Read: `frontend/src/widgets/assistant/AssistantDetailPanel.tsx` (submit flow: `onSubmit`, `onCreateThread`, `onSelectThread`, turn states)
- [x] Read: `frontend/src/api/assistant.ts` (create-thread + send-message signatures, auth/session behavior)

### 1.5 Logging & Observability Integration [MANDATORY CROSS-CUTTING]
- [x] Instrument STT submit boundary per TC-A-01 precedent (state transitions: idle→listening→transcribing→submitting→idle; error classes) without logging transcripts or audio
- [x] Propagate user/session context on the submit call; redact message content from any operational log
- [x] Record logger evidence or specific tested `N/A` rationale in completion report

### 2. Write/Update Requirements
- [x] Refine SW-REQ-013-01 with actual submit semantics (auto-create thread, turn-state handling, timeout/cancel behavior)

### 3. Investigate Architecture
- [x] Review: top-bar shell component (mic mount point, desktop + mobile per Epic 012)
- [x] Review: assistant turn lifecycle (`isTurnBusy`, streaming) to avoid double-submit during busy turns

### 4. Implement Code
- [x] `frontend/src/voice/stt.ts`: lazy singleton `getTranscriber(lang)` (`automatic-speech-recognition`, `Xenova/whisper-tiny`, `quantized: true, local_files_only: true`), `transcribeUtterance(pcm, {lang, initialPrompt})`, model-load failure → fail-closed error
- [x] `frontend/src/voice/useVoiceCapture.ts`: states (idle/listening/transcribing/submitting/error), manual stop, silence auto-stop (energy threshold + timeout), mic release on unmount, busy-turn guard
- [x] `frontend/src/voice/VoiceMicButton.tsx` + top-bar wiring: always visible when authenticated; tap toggles; listening state visible (text/icon, not audio-only); disabled with explanatory copy when `getUserMedia` unavailable
- [x] Submit path: corrected transcript → existing assistant send flow (create thread when `selectedThreadId == null` → send); STT language = board language
- [x] Wire into Runtime Instantiation Map ("wire mic into top-bar shell" responsibility)

### 5. Create Unit Tests (SWE4) [MANDATORY]
- [x] STT pipeline mocked: happy path (PCM → text → corrected → submit called with thread handling), error paths (model load fail, empty transcript, busy turn guard, timeout)
- [x] Thread auto-create branch: no-thread vs existing-thread cases
- [x] Silence auto-stop: timer/energy logic unit-tested with fake timers
- [x] Logger/redaction tests for the submit boundary (no transcript in logs)

### 6. Run Full Test Suite + Coverage [MANDATORY GATE 🔴]
- [x] Full build + lint + unit suites; 0 new failures/errors vs Task 0.2 baseline [MANDATORY 🔴, lint MANDATORY from this issue]; coverage not regressed

### 7. Create Documentation
- [x] JSDoc for singleton contract (model path, offline flags, chunk/stride), hook state machine, submit semantics
- [x] Note for closer: STT module + wiring to add to flow/component diagrams

### 8. Write Completion Report & Handoff [MANDATORY]
- [x] Complete `TC-A-02_PUSH_TO_TALK_STT_SUBMIT_COMPLETION_REPORT.md`
- [x] **Write handoff section for TC-A-03 team** — MUST include:
  - What was built: hook API (states, props, events), STT module API with usage example, shell wiring point
  - Key decisions/deviations (timeout values, busy-turn behavior, fallback copy)
  - Known limitations (no circle yet, error copy provisional, keyboard behavior unchanged)
  - Open risks (model first-load latency, Safari quirks, mobile permission UX)
  - Gate results table
- [x] Update `TC-A-00_COMPONENT_DEFINITION.md` with status + new decisions

---

## ⚠️ Constraints

- Bundled model only — no runtime download; fail closed with reinstall/repair copy
- Ephemeral audio buffers; no transcript in operational logs
- No autoplay/TTS in this issue (TC-B); no settings changes (TC-B-03)

---

## 📁 Files to Modify

| Action | File Path | Description |
|--------|-----------|-------------|
| Create | `frontend/src/voice/stt.ts` | Whisper singleton + transcribe entry |
| Create | `frontend/src/voice/useVoiceCapture.ts` | Capture state machine hook |
| Create | `frontend/src/voice/VoiceMicButton.tsx` | Top-bar mic button |
| Update | Top-bar shell component | Mount mic button (authenticated only) |
| Update | `frontend/src/widgets/assistant/AssistantDetailPanel.tsx` | Voice submit integration if needed |
| Read   | `frontend/src/api/assistant.ts` | Thread/message API |

---

## ✅ Acceptance Criteria

- [x] Tap → speak → tap submits corrected transcript; no thread → thread auto-created then sent
- [x] Silence auto-stop closes mic; mic released on unmount/cancel
- [x] Model-missing/denied states fail closed with user-facing copy
- [x] All unit tests passing (SWE4); coverage not regressed; build+lint clean (lint MANDATORY)
- [x] Completion report with TC-A-03 handoff; TC-A-00 updated; logger evidence included

---

## 📖 Reference Documents

- V-Model Framework: `project_management/swaibian_V-Model_Agents/_templates/V_MODEL_FRAMEWORK.md`
- Architecture: `project_management/architecture/README.md`
- Epic: `project_management/epics/EPIC_013_ASSISTANT_AUDIO_INTERFACE.md`
- Component: `project_management/epics/EPIC_013_ASSISTANT_AUDIO_INTERFACE/TC_A_VOICE_CAPTURE_STT/TC-A-00_COMPONENT_DEFINITION.md`
- Predecessor Report: `project_management/epics/EPIC_013_ASSISTANT_AUDIO_INTERFACE/TC_A_VOICE_CAPTURE_STT/TC-A-01_SHARED_MIC_PCM_PERMISSION_LEVEL_FOUNDATION_COMPLETION_REPORT.md`
- SW Requirements: SW-REQ-013-01 (written by TC-A-01)

---

## 🔗 Related Issues

- Depends On: TC-A-01 (foundation + tooling gate)
- Blocks: TC-A-03 (circle, errors, keyboard, i18n)
- Related: TC-B-02 (autoplay consumes submitted transcripts), Epic 012 (mobile shell)

---

## Gate Results (filled during execution)

| Gate | Level | Result | Notes |
|------|-------|--------|-------|
| Pre-check suite (Task 0.2) | SWE4 | ⬜ PENDING | |
| Post-implementation suite (Task 6) | SWE4 | ⬜ PENDING | |
| Coverage vs baseline | SWE4 | ⬜ PENDING | |
| Build `npm --prefix frontend run build` | SWE4-BUILD 🔴 | ⬜ PENDING | |
| Lint `npm --prefix frontend run lint` | SWE4-LINT 🔴 | ⬜ PENDING | |
