# TC-A-01: Shared Mic/PCM/Permission/Level Foundation + Tooling Gate

**Component**: Voice Capture + STT (TC-A)
**Epic**: E-013 Assistant Audio Interface
**V-Model**: SWE3-A-01
**Type**: 🔨 IMPLEMENTATION
**Priority**: P0-Critical
**Estimated Effort**: M
**Dependencies**: TC-A-00 only (first issue)
**SW-REQ**: SW-REQ-013-01 (written in this issue), SW-REQ-013-04 (input half, drafted here)

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

Build the single shared audio-input foundation every voice feature (and later Epic 007) stands on: permission flow, 16 kHz mono PCM normalizer, level-meter hook, and vocabulary-correction module — plus the repo's first clean tooling baseline. If this foundation is wrong (wrong sample rate, duplicated mic paths, untested correction), every later voice issue inherits broken audio.

**High Stakes**: Wrong PCM = 100% STT failure; duplicated mic logic = permission fights with Epic 007.
**Constraints**: Offline-only (no network in audio path); ephemeral buffers (no raw-audio persistence); 4-language-ready copy keys; no new backend endpoints in this issue.

---

## 🏗️ Architectural Context

```
mic (getUserMedia) → audioInput.ts (permission + capture) → normalizeTo16kMono (resample/downmix) → Float32Array → [TC-A-02: Whisper-tiny]
                                                                                ↘ level hook → [TC-A-03: input circle]
transcript → vocabulary.ts (initial_prompt + post-correction) → [TC-A-02: submit]
```

See: `project_management/architecture/README.md` for full context.

---

## Traceability

| Level | ID | Artifact |
|-------|-----|---------|
| SYS1 | SYS1-013 | Epic: EPIC_013_ASSISTANT_AUDIO_INTERFACE.md |
| SWE1 | SWE1-A | TC: TC-A-00_COMPONENT_DEFINITION.md |
| SWE3 | SWE3-A-01 | This issue |
| SWE4 | — | Unit tests in: `frontend/src/voice/__tests__/` (new) |

---

## 📋 Task List

### 0.0 Read Architecture Documentation [MANDATORY]
- [x] **Read: `project_management/architecture/README.md`**
- [x] **Read: relevant diagrams** in `project_management/architecture/diagrams/`
  for the area this issue changes (scaffold stubs this epic creates; note gaps)

> Understand the current system architecture before making changes.
> If architecture docs don't exist yet, note this — the closer (TC-A-04) will populate them.

### 0.1 Read Predecessor Context [MANDATORY]
- [x] **Read: `TC-A-00_COMPONENT_DEFINITION.md`**

> First issue: component definition only, no predecessor report.

### 0.2 Run Full Test Suite [MANDATORY GATE 🔴]
- [x] Record repo baseline: `npm --prefix frontend run build` (`tsc -b && vite build`), `npm --prefix frontend run lint` (eslint)
- [x] Backend boot check: `npm --prefix backend start` boots and serves `/api/auth/session`
- [x] **Run typecheck** via build [MANDATORY GATE 🔴]; **Run linter** [ADVISORY 🟢 on TC-A-01]
- [x] Record baseline: build errors, lint errors, backend boot result
- [x] **Gate**: If build fails at baseline, STOP and report before writing code.

> No `make` targets and no test runner exist in this repo (no `package.json` test script). This issue establishes the unit-test approach for pure voice modules (see Task 5).

### 1. Investigate Requirements
- [x] Read: `project_management/epics/EPIC_013_ASSISTANT_AUDIO_INTERFACE/DISCOVERY_BRIEF.md` (§2–§5, §11)
- [x] Read: `project_management/ideas/audio-interface/audio_interface_documentation.md` (§1.3 PCM contract, §1.4 vocabulary)
- [x] Read: `frontend/src/widgets/assistant/AssistantDetailPanel.tsx` (composer submit path to reuse in TC-A-02)
- [x] Read: `project_management/epics/007_AUDIO_VISUAL_INPUT/007_AUDIO_VISUAL_INPUT__ISSUE_DEFINITION__002_RECORDING_STILL_VIDEO_AND_AUDIO_CAPTURE.md` (overlap surface)

### 1.5 Logging & Observability Integration [MANDATORY CROSS-CUTTING]
- [x] `docs/mvc_architecture.md` does not exist — document that fact in the completion report
- [x] Define the voice logging precedent: backend `[voice]`-prefixed logs carry user/session context; never log transcripts, raw audio, secrets, or prompts
- [x] Frontend: voice errors surface as UI copy (toast + transcript note), never `console.log` of audio data
- [x] Record the precedent + `N/A — no runtime event` rationale where no boundary is touched (pure PCM/correction functions)

### 2. Write/Update Requirements
- [x] Write SW-REQ-013-01 (voice capture + STT submit: permission, PCM contract, push-to-talk, silence stop, auto-create thread, ephemeral audio)
- [x] Draft SW-REQ-013-04 input half (input circle data source = level hook @ ~10–30 Hz, error states, 4-language keys)
- [x] Store requirement text under `project_management/epics/EPIC_013_ASSISTANT_AUDIO_INTERFACE/` and link from TC-A-00

### 3. Investigate Architecture
- [x] Review: `frontend/src/api/assistant.ts` (thread/message surfaces for TC-A-02)
- [x] Review: top-bar shell component + `frontend/src/keyboard/` (focus behavior for TC-A-03)
- [x] Review: `frontend/src/i18n/` + assistant `translations` files (key conventions for TC-A-03)

### 4. Implement Code
- [x] `frontend/src/voice/audioInput.ts`: `requestMicPermission()`, `captureUtterance()` (MediaRecorder `audio/webm;codecs=opus` or raw path), `normalizeTo16kMono()` (`decodeAudioData` → `OfflineAudioContext(1, len*16000, 16000)` → channel 0), 5-min mic cap validation (rate == 16000, non-empty, length % 4 == 0)
- [x] `frontend/src/voice/useAudioLevel.ts`: level-meter hook emitting RMS/peak at ~10–30 Hz for the circle (no audio data leaves the hook — scalar levels only)
- [x] `frontend/src/voice/vocabulary.ts`: `buildInitialPrompt(lang)` + ordered `postCorrectTranscript(text)` regex list (Swaibian, scaiCo, Bring, Roborock, …) in one shared module
- [x] `frontend/package.json`: add `@huggingface/transformers` dependency (install only; singleton wiring is TC-A-02) — or document version pin decision if deferred
- [x] No mic UI in this issue (button/circle are TC-A-02/03); no backend changes

### 5. Create Unit Tests (SWE4) [MANDATORY]
- [x] PCM normalizer tests: 44.1 kHz stereo → 16 kHz mono length math, downmix averaging, empty-input rejection, cap enforcement
- [x] Vocabulary tests: mangled variants (`wodivity`, `sky-co`, …) → canonical spellings, per language where relevant
- [x] Level-hook tests: scalar output range, no audio-buffer leakage (assert Float32 data never emitted)
- [x] Approach: repo has no runner — add the lightest viable path (e.g. `frontend/src/voice/__tests__/` + `npm --prefix frontend run test:voice` script with node-based assertions, or documented `GATE SKIPPED` reason if truly unrunnable). New pure modules MUST have tests.

### 6. Run Full Test Suite + Coverage [MANDATORY GATE 🔴]
- [x] Re-run `npm --prefix frontend run build` — 0 errors [MANDATORY 🔴]
- [x] Re-run `npm --prefix frontend run lint` — record result [ADVISORY 🟢 on this issue]
- [x] Run new voice unit tests — 0 failures [MANDATORY 🔴]
- [x] **TOOLING GATE (handoff blocker)**: typecheck + voice unit tests + lint MUST be clean (lint advisory but reported) before TC-A-02 starts; record exact commands + results in completion report

### 7. Create Documentation
- [x] Inline JSDoc for `normalizeTo16kMono`, `useAudioLevel`, `postCorrectTranscript` (contract, units, caps)
- [x] Note for closer (TC-A-04): PCM/level modules to add to flow + component diagrams

### 8. Write Completion Report & Handoff [MANDATORY]
- [x] Complete `TC-A-01_SHARED_MIC_PCM_PERMISSION_LEVEL_FOUNDATION_COMPLETION_REPORT.md`
- [x] **Write handoff section for TC-A-02 team** — MUST include:
  - What was built: files created, exported functions with signatures + usage examples
  - Key decisions (transformers version pin, test approach, cap values) and deviations
  - Known limitations (e.g. no singleton yet, no UI yet)
  - Open risks (Epic 007 reuse order, Safari `OfflineAudioContext` quirks)
  - Gate results table (build/lint/unit exact commands + counts)
- [x] Update `TC-A-00_COMPONENT_DEFINITION.md` with status + new decisions

---

## ⚠️ Constraints

- No network calls in the audio path; no raw-audio persistence (ephemeral buffers only)
- No backend endpoint changes in this issue
- No mic button UI (TC-A-02) and no circle UI (TC-A-03)
- Level hook emits scalars only — never audio buffers

---

## 📁 Files to Modify

| Action | File Path | Description |
|--------|-----------|-------------|
| Create | `frontend/src/voice/audioInput.ts` | Permission + capture + 16 kHz PCM normalizer |
| Create | `frontend/src/voice/useAudioLevel.ts` | Scalar level-meter hook |
| Create | `frontend/src/voice/vocabulary.ts` | Initial-prompt builder + post-correction list |
| Create | `frontend/src/voice/__tests__/` | PCM + vocabulary + level tests |
| Update | `frontend/package.json` | Add `@huggingface/transformers` (pinned) |
| Read   | `frontend/src/api/assistant.ts` | Thread/message surfaces for next issue |
| Read   | `project_management/ideas/audio-interface/audio_interface_documentation.md` | PCM + vocabulary contract |

---

## ✅ Acceptance Criteria

- [x] `normalizeTo16kMono` meets the 16 kHz mono Float32 contract with validation + cap; unit-tested
- [x] Vocabulary module corrects the agreed domain list; unit-tested
- [x] Level hook emits scalars at UI-usable rate without leaking audio
- [x] TOOLING GATE: `npm --prefix frontend run build` 0 errors, voice unit tests 0 failures, lint result recorded — before handoff
- [x] SW-REQ-013-01 written; SW-REQ-013-04 input half drafted
- [x] Completion report written with specific TC-A-02 handoff
- [x] TC-A-00 updated with status and decisions
- [x] Logger evidence included (precedent + N/A rationales)

---

## 📖 Reference Documents

- V-Model Framework: `project_management/swaibian_V-Model_Agents/_templates/V_MODEL_FRAMEWORK.md`
- Architecture: `project_management/architecture/README.md`
- Epic: `project_management/epics/EPIC_013_ASSISTANT_AUDIO_INTERFACE.md`
- Component: `project_management/epics/EPIC_013_ASSISTANT_AUDIO_INTERFACE/TC_A_VOICE_CAPTURE_STT/TC-A-00_COMPONENT_DEFINITION.md`
- Discovery: `project_management/epics/EPIC_013_ASSISTANT_AUDIO_INTERFACE/DISCOVERY_BRIEF.md`
- Audio tech reference: `project_management/ideas/audio-interface/audio_interface_documentation.md`

---

## 🔗 Related Issues

- Depends On: TC-A-00 (component definition)
- Blocks: TC-A-02 (push-to-talk STT submit)
- Related: Epic 007-002 (future consumer of shared module), TC-B-01 (TTS side, cache-key conventions)

---

## Gate Results (filled during execution)

| Gate | Level | Result | Notes |
|------|-------|--------|-------|
| Pre-check suite (Task 0.2) | SWE4 | ⬜ PENDING | |
| Post-implementation suite (Task 6) | SWE4 | ⬜ PENDING | |
| Coverage vs baseline | SWE4 | ⬜ PENDING | |
| Build `npm --prefix frontend run build` | SWE4-BUILD 🔴 | ⬜ PENDING | |
| Lint `npm --prefix frontend run lint` | 🟢 ADVISORY (this issue) | ⬜ PENDING | |
