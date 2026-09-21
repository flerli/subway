# TC-A-04: TC-A Closer — Integration, Architecture/Traceability, SYS3 Smoke

**Component**: Voice Capture + STT (TC-A)
**Epic**: E-013 Assistant Audio Interface
**V-Model**: SWE3-A-04
**Type**: 🔨 IMPLEMENTATION (TC CLOSER — inherits SWE5 review/docs duties for TC-A's scope)
**Priority**: P1-High
**Estimated Effort**: M
**Dependencies**: TC-A-03 (circle/errors/keyboard/i18n complete)
**SW-REQ**: SW-REQ-013-01, SW-REQ-013-04 (input half)

> **No-reviews variant**: there is no SWE5 review issue. This last implementation issue owns gap analysis, integration tests, architecture/traceability updates, and the SYS3 runtime smoke for TC-A. Execution: `swaibian-impl-no-reviews` (or `swaibian-impl` self-detecting the marker); self-verify per STEP E-NR; `swaibian-review` is never spawned.

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

Close TC-A with evidence: prove the whole capture path works together, fix gaps found across TC-A-01…03, and leave architecture/traceability current so TC-B and future teams inherit truth. A TC without a verified closer ships untested seams.

**High Stakes**: Unverified seams (permission→PCM→STT→submit) fail on the kiosk, not in unit tests.
**Constraints**: Integration tests must mock hardware-audio boundaries deterministically; SYS3 smoke needs a mic or a documented hardware-fallback run.

---

## 🏗️ Architectural Context

```
[TC-A-01 foundation] + [TC-A-02 submit loop] + [TC-A-03 UX] ──closer──► verified capture path + diagrams + traceability + smoke evidence
```

See: `project_management/architecture/README.md` for full context.

---

## Traceability

| Level | ID | Artifact |
|-------|-----|---------|
| SYS1 | SYS1-013 | Epic: EPIC_013_ASSISTANT_AUDIO_INTERFACE.md |
| SWE1 | SWE1-A | TC: TC-A-00_COMPONENT_DEFINITION.md |
| SWE3 | SWE3-A-04 | This issue (closer) |
| SWE4 | — | Unit tests (prior issues) |
| SWE5 | — | Integration tests in: `frontend/src/voice/__tests__/capture.integration.*` (new, this issue) |
| SWE2 | — | Arch updates in: `project_management/architecture/diagrams/flow-assistant-voice.md`, `component-overview.md`, `api-contracts.md`, ADR proposal (this issue) |
| SYS3 | — | Runtime smoke (this issue, Task 9) |

---

## 📋 Task List

### 0.0 Read Architecture Documentation [MANDATORY]
- [x] **Read: `project_management/architecture/README.md`**
- [x] **Read: relevant diagrams** in `project_management/architecture/diagrams/`

### 0.1 Read Predecessor Context [MANDATORY]
- [x] **Read: `TC-A-00_COMPONENT_DEFINITION.md`**
- [x] **Read: `TC-A-01_SHARED_MIC_PCM_PERMISSION_LEVEL_FOUNDATION_COMPLETION_REPORT.md`**
- [x] **Read: `TC-A-02_PUSH_TO_TALK_STT_SUBMIT_COMPLETION_REPORT.md`**
- [x] **Read: `TC-A-03_INPUT_CIRCLE_ERRORS_KEYBOARD_I18N_COMPLETION_REPORT.md`**

> Closer reads ALL TC-A predecessor reports (review-duty equivalent).

### 0.2 Run Full Test Suite [MANDATORY GATE 🔴]
- [x] Build [🔴] + lint [🔴] + all unit suites; record baseline; new failures → STOP.

### 1. Gap Analysis over TC-A-01…03 (SWE5 duty)
- [x] Re-read all three completion reports; list every open risk, Known Limitation, and deferred item
- [x] Verify each: fixed in this issue, owned by TC-B with explicit handoff, or recorded as accepted gap with rationale
- [x] Check cross-issue consistency: PCM contract vs STT call, hook API vs circle props, i18n keys vs rendered copy, keyboard rule vs actual focus flow

### 2. Bug/Flaw Fixes Found in Review
- [x] Fix gaps found in Task 1 (mic release leaks, double-submit races, missing error copy, stale hook states)
- [x] Each fix gets a unit test or an explicit why-not-tested note

### 3. Integration Tests SWE5 (MANDATORY on closer 🔴)
- [x] `capture.integration`: permission→PCM→STT(mocked)→correction→submit→thread auto-create, end to end with mocked hardware + mocked pipeline
- [x] Denial/isolation: unauthenticated submit blocked (reuses Epic 003 session enforcement — assert, don't reimplement auth); no transcript in logs asserted
- [x] Silence auto-stop + interrupt + error-taxonomy paths at integration level
- [x] 0 failures allowed

### 4. Architecture / Traceability Updates SWE2 (closer duty)
- [x] Populate `project_management/architecture/diagrams/flow-assistant-voice.md` capture half (Mermaid + table + `Last updated by: SWE3-A-04`)
- [x] Update `component-overview.md` (voice capture modules), `api-contracts.md` (reused thread/message endpoints — no new endpoints in TC-A)
- [x] Update `traceability/requirements-matrix.md` + `coverage-map.md` rows for SW-REQ-013-01 / 013-04-input
- [x] Propose ADR (local STT singleton + shared PCM module) if the decision has lasting impact; otherwise record explicit no-ADR rationale in completion report
- [x] Update `architecture/README.md` changelog (`Last updated by: SWE3-A-04`)

### 5. Unit-Test Health
- [x] Fill any coverage holes in TC-A-01…03 pure modules found during review; coverage must not regress

### 6. Run Full Test Suite + Coverage [MANDATORY GATE 🔴]
- [x] Build + lint (🔴) + unit + integration; 0 failures; coverage not regressed

### 7. Create Documentation
- [x] Document final hook/module APIs + keyboard rule + error taxonomy for TC-B consumers

### 8. SYS3 Runtime Smoke (MANDATORY on closer 🔴)
- [x] Start the stack: `npm --prefix backend run dev` + `npm --prefix frontend run dev`
- [x] Trigger the feature: authenticated session → top-bar mic → speak/stop (or simulated utterance when no mic hardware) → verify transcript submits to a thread
- [x] Verify output: thread contains the prompt; errors (if hardware absent) show the designed fallback copy
- [x] If no mic/display available: run the documented hardware-fallback path and record `SYS3 SMOKE (fallback)` evidence + remaining HIGH gap note. Skip only with documented reason.

### 9. Write Completion Report & Handoff [MANDATORY]
- [x] Complete `TC-A-04_CAPTURE_CLOSER_INTEGRATION_SMOKE_COMPLETION_REPORT.md`
- [x] **Write handoff section for TC-B team** — MUST include:
  - What was verified: capture path integration results, smoke evidence (or fallback + gap)
  - Architecture artifacts updated (exact files + what changed)
  - Gaps fixed vs deferred (each deferred gap: severity + explicit TC-B owner or accepted rationale)
  - Reuse contract for TC-B/Epic 007: module paths, import examples, level-hook rate
  - Gate results table (build/lint/unit/integration/smoke)
- [x] Update `TC-A-00_COMPONENT_DEFINITION.md`: all rows ✅, Status → ✅ Complete, decisions + arch-revision entry

---

## ⚠️ Constraints

- No new STT engines or TTS work (TC-B owns synthesis); closer fixes and verifies only
- Integration tests mock hardware deterministically — no flaky real-mic tests in CI
- Raw audio never persisted, including in test fixtures (synthetic PCM only)

---

## 📁 Files to Modify

| Action | File Path | Description |
|--------|-----------|-------------|
| Create | `frontend/src/voice/__tests__/capture.integration.*` | SWE5 capture-path integration tests |
| Update | `project_management/architecture/diagrams/flow-assistant-voice.md` | Capture sequence (Mermaid + table) |
| Update | `project_management/architecture/diagrams/component-overview.md` | Voice capture modules |
| Update | `project_management/architecture/diagrams/api-contracts.md` | Reused endpoints note |
| Update | `project_management/architecture/traceability/requirements-matrix.md` | TC-A rows |
| Update | `project_management/architecture/traceability/coverage-map.md` | TC-A coverage |
| Update | `project_management/architecture/README.md` | Changelog + links |
| Fix | Files flagged by gap analysis | Review fixes + tests |

---

## ✅ Acceptance Criteria

- [x] Gap analysis covers TC-A-01…03 with every open item dispositioned (fixed / owned by TC-B / accepted with rationale)
- [x] Integration tests green (SWE5 🔴); unit suite green; build+lint clean (🔴); coverage not regressed
- [x] Architecture + traceability updated (or explicit gap note); ADR proposed or no-ADR rationale recorded
- [x] SYS3 smoke executed with evidence (or documented fallback + HIGH gap)
- [x] Completion report with TC-B handoff; TC-A-00 Status ✅ Complete

---

## 📖 Reference Documents

- V-Model Framework: `project_management/swaibian_V-Model_Agents/_templates/V_MODEL_FRAMEWORK.md`
- Architecture: `project_management/architecture/README.md`
- Epic: `project_management/epics/EPIC_013_ASSISTANT_AUDIO_INTERFACE.md`
- Component: `project_management/epics/EPIC_013_ASSISTANT_AUDIO_INTERFACE/TC_A_VOICE_CAPTURE_STT/TC-A-00_COMPONENT_DEFINITION.md`
- Predecessor Reports: `TC-A-01_*_COMPLETION_REPORT.md`, `TC-A-02_*_COMPLETION_REPORT.md`, `TC-A-03_*_COMPLETION_REPORT.md`
- SW Requirements: SW-REQ-013-01, SW-REQ-013-04 (input half)

---

## 🔗 Related Issues

- Depends On: TC-A-01, TC-A-02, TC-A-03
- Blocks: TC-B execution (handoff consumer)
- Related: Epic 007 (shared-module consumer), Epic 006/012 (verified rules)

---

## Gate Results (filled during execution)

| Gate | Level | Result | Notes |
|------|-------|--------|-------|
| Pre-check suite (Task 0.2) | SWE4 | ⬜ PENDING | |
| Integration suite (Task 3/6) | SWE5 🔴 | ⬜ PENDING | |
| Post-implementation suite (Task 6) | SWE4 | ⬜ PENDING | |
| Coverage vs baseline | SWE4 | ⬜ PENDING | |
| Build `npm --prefix frontend run build` | SWE4-BUILD 🔴 | ⬜ PENDING | |
| Lint `npm --prefix frontend run lint` | SWE4-LINT 🔴 | ⬜ PENDING | |
| SYS3 runtime smoke (Task 8) | SYS3 🔴 | ⬜ PENDING | |
