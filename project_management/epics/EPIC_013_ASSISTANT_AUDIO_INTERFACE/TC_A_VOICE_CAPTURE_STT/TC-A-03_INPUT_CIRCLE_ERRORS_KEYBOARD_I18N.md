# TC-A-03: Input Circle, Errors, Keyboard Suppression, i18n, Mobile

**Component**: Voice Capture + STT (TC-A)
**Epic**: E-013 Assistant Audio Interface
**V-Model**: SWE3-A-03
**Type**: 🔨 IMPLEMENTATION
**Priority**: P1-High
**Estimated Effort**: M
**Dependencies**: TC-A-02 (working submit loop)
**SW-REQ**: SW-REQ-013-04 (input half)

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

Make voice feel alive and trustworthy: a pulsating gradient circle driven by live mic amplitude, bulletproof error states, no keyboard ambush during voice flow, full 4-language copy, and a touch-usable mobile mic. Without this, voice works but feels broken on the kiosk.

**High Stakes**: Silent failures destroy trust; keyboard popping over voice flow breaks the kiosk illusion.
**Constraints**: Circle is scalar-level driven only (no audio in render path); transit dark visual language; touch targets ≥ kiosk/mobile usable; all copy en/de/fr/es per Epic 004 contract.

---

## 🏗️ Architectural Context

```
useAudioLevel (scalars) → InputLevelCircle (gradient pulse, input direction)
voice errors → top-bar toast + transcript note (never silent)
voice active → keyboard suppress (Epic 006 hook) → restore on idle/error
board language → voice copy keys (en/de/fr/es) + STT lang (TC-A-02)
```

See: `project_management/architecture/README.md` for full context.

---

## Traceability

| Level | ID | Artifact |
|-------|-----|---------|
| SYS1 | SYS1-013 | Epic: EPIC_013_ASSISTANT_AUDIO_INTERFACE.md |
| SWE1 | SWE1-A | TC: TC-A-00_COMPONENT_DEFINITION.md |
| SWE3 | SWE3-A-03 | This issue |
| SWE4 | — | Unit tests in: circle render tests, keyboard-suppression tests, i18n key-coverage tests |

---

## 📋 Task List

### 0.0 Read Architecture Documentation [MANDATORY]
- [x] **Read: `project_management/architecture/README.md`**
- [x] **Read: relevant diagrams** in `project_management/architecture/diagrams/`

### 0.1 Read Predecessor Context [MANDATORY]
- [x] **Read: `TC-A-00_COMPONENT_DEFINITION.md`**
- [x] **Read: `TC-A-02_PUSH_TO_TALK_STT_SUBMIT_COMPLETION_REPORT.md`** ← predecessor's handoff

### 0.2 Run Full Test Suite [MANDATORY GATE 🔴]
- [x] Build [🔴] + lint [🔴 MANDATORY] + all voice unit tests; record baseline; new failures → STOP.

### 1. Investigate Requirements
- [x] Read: SW-REQ-013-04 input half (TC-A-01 draft)
- [x] Read: Epic 004 translation standard (`004_MULTI_LANGUAGE_SUPPORT__ISSUE_DEFINITION__003_*`) + assistant `translations` structure
- [x] Read: `frontend/src/keyboard/` activation logic + Epic 006-002 overlay behavior
- [x] Read: Epic 012 mobile shell (top-bar controls, safe-area) for mic placement

### 1.5 Logging & Observability Integration [MANDATORY CROSS-CUTTING]
- [x] Error states carry user/session context without logging transcripts/audio; circle renders no PII
- [x] Record logger evidence or specific tested `N/A` rationale

### 2. Write/Update Requirements
- [x] Finalize SW-REQ-013-04 input half (circle spec, error taxonomy, keyboard rule, i18n keys)

### 3. Investigate Architecture
- [x] Review: top-bar shell + toast/notification system for error surfacing
- [x] Review: `App.css` / transit tokens for circle gradients

### 4. Implement Code
- [x] `InputLevelCircle.tsx`: gradient pulsating circle driven by `useAudioLevel` scalars; states (idle/listening/transcribing/error); `prefers-reduced-motion` respected; aria labels localized
- [x] Error taxonomy: denied, no-device, model-missing, timeout, submit-failed → top-bar toast + transcript note copy (en/de/fr/es), fail-closed guidance
- [x] Keyboard suppression: while voice state != idle, suppress global keyboard auto-open on the composer; restore after; no widget-specific hacks (shared rule)
- [x] i18n: all new voice-input copy in 4 languages (mic labels, states, errors, fallback); key-coverage follows widget translation standard
- [x] Mobile: mic + circle touch-usable in narrow viewport shell; safe-area respected

### 5. Create Unit Tests (SWE4) [MANDATORY]
- [x] Circle: renders per state, scales with scalar input, no audio data in props
- [x] Keyboard suppression: voice-active suppresses, idle restores (mock keyboard hook)
- [x] i18n: all voice-input keys present in en/de/fr/es, no missing-key fallback in tests
- [x] Error taxonomy: each class produces toast + note copy (assert copy keys, not pixels)

### 6. Run Full Test Suite + Coverage [MANDATORY GATE 🔴]
- [x] Build + lint (both 🔴) + unit suites; 0 new failures; coverage not regressed

### 7. Create Documentation
- [x] JSDoc + copy-key table for translators; note circle/output-circle shared visual language for TC-B-02
- [x] Note for closer: circle + error + keyboard rule to add to diagrams

### 8. Write Completion Report & Handoff [MANDATORY]
- [x] Complete `TC-A-03_INPUT_CIRCLE_ERRORS_KEYBOARD_I18N_COMPLETION_REPORT.md`
- [x] **Write handoff section for TC-A-04 (closer) team** — MUST include:
  - What was built: circle props/state contract with usage example, error taxonomy table, keyboard rule, i18n keys added
  - Key decisions/deviations (gradient tokens, suppression scope, reduced-motion handling)
  - Known limitations/edge cases (Safari audio, no-device copy, mobile viewport quirks)
  - Open risks for closer verification (visual review, coverage gaps)
  - Gate results table
- [x] Update `TC-A-00_COMPONENT_DEFINITION.md` with status + new decisions

---

## ⚠️ Constraints

- No STT/engine changes (TC-A-02 owns); no TTS/playback (TC-B)
- Circle amplitude from scalars only; respect reduced-motion
- All user-facing copy in 4 languages — no hardcoded single-language strings

---

## 📁 Files to Modify

| Action | File Path | Description |
|--------|-----------|-------------|
| Create | `frontend/src/voice/InputLevelCircle.tsx` | Pulsating input circle |
| Update | `frontend/src/voice/VoiceMicButton.tsx` | Circle integration + states |
| Update | Top-bar shell + toast system | Error surfacing |
| Update | `frontend/src/keyboard/` or shell focus logic | Voice-active suppression rule |
| Update | `frontend/src/i18n/*` + assistant translations | 4-language voice-input copy |

---

## ✅ Acceptance Criteria

- [x] Circle visibly pulsates with mic level; distinct error state; keyboard-operable mic
- [x] Every error class shows toast + transcript note in the board language
- [x] Keyboard never auto-opens from voice submit; normal typing flow unaffected
- [x] No missing i18n keys in en/de/fr/es; mobile mic usable
- [x] Build+lint clean (🔴); tests green; coverage not regressed
- [x] Completion report with TC-A-04 handoff; TC-A-00 updated; logger evidence included

---

## 📖 Reference Documents

- V-Model Framework: `project_management/swaibian_V-Model_Agents/_templates/V_MODEL_FRAMEWORK.md`
- Architecture: `project_management/architecture/README.md`
- Epic: `project_management/epics/EPIC_013_ASSISTANT_AUDIO_INTERFACE.md`
- Component: `project_management/epics/EPIC_013_ASSISTANT_AUDIO_INTERFACE/TC_A_VOICE_CAPTURE_STT/TC-A-00_COMPONENT_DEFINITION.md`
- Predecessor Report: `project_management/epics/EPIC_013_ASSISTANT_AUDIO_INTERFACE/TC_A_VOICE_CAPTURE_STT/TC-A-02_PUSH_TO_TALK_STT_SUBMIT_COMPLETION_REPORT.md`
- SW Requirements: SW-REQ-013-01, SW-REQ-013-04 (input half)

---

## 🔗 Related Issues

- Depends On: TC-A-02 (submit loop + hook API)
- Blocks: TC-A-04 (closer verifies circle/errors/keyboard/i18n)
- Related: TC-B-02 (output circle shares visual language), Epic 006/012

---

## Gate Results (filled during execution)

| Gate | Level | Result | Notes |
|------|-------|--------|-------|
| Pre-check suite (Task 0.2) | SWE4 | ⬜ PENDING | |
| Post-implementation suite (Task 6) | SWE4 | ⬜ PENDING | |
| Coverage vs baseline | SWE4 | ⬜ PENDING | |
| Build `npm --prefix frontend run build` | SWE4-BUILD 🔴 | ⬜ PENDING | |
| Lint `npm --prefix frontend run lint` | SWE4-LINT 🔴 | ⬜ PENDING | |
