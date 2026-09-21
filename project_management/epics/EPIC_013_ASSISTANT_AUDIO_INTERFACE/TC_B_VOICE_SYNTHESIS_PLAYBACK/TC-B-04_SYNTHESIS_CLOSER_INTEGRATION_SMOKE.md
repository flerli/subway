# TC-B-04: TC-B Closer — Integration, Architecture/Traceability, SYS3 Smoke

**Component**: Voice Synthesis + Playback + Prefs (TC-B)
**Epic**: E-013 Assistant Audio Interface
**V-Model**: SWE3-B-04
**Type**: 🔨 IMPLEMENTATION (TC CLOSER — inherits SWE5 review/docs duties for TC-B's scope)
**Priority**: P1-High
**Estimated Effort**: M
**Dependencies**: TC-B-03 (prefs + settings complete)
**SW-REQ**: SW-REQ-013-02, SW-REQ-013-03, SW-REQ-013-04 (output half)

> **No-reviews variant**: there is no SWE5 review issue. This last implementation issue owns gap analysis, integration tests, architecture/traceability updates, and the SYS3 runtime smoke for TC-B (including the full voice loop with TC-A). Execution: `swaibian-impl-no-reviews` (or `swaibian-impl` self-detecting the marker); self-verify per STEP E-NR; `swaibian-review` is never spawned.

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

Close TC-B — and with it the epic's voice loop — with evidence: full synthesis→playback→prefs integration, per-user isolation proof, current architecture/traceability, and a runtime smoke that speaks. This closer also verifies the end-to-end voice journey (TC-A capture → assistant → TC-B speech).

**High Stakes**: Unverified TTS/prefs seams produce wrong-voice playback, cross-user leaks, or silent autoplay failure on the kiosk.
**Constraints**: Integration tests mock the helper process deterministically; SYS3 smoke uses the real bridge when models are present, else the documented fallback with a HIGH gap note.

---

## 🏗️ Architectural Context

```
[TC-B-01 bridge] + [TC-B-02 playback] + [TC-B-03 prefs] ──closer──► verified synthesis path + diagrams + traceability + full-loop smoke
[TC-A capture] ──► assistant answer ──► [TC-B speech] (full loop in SYS3 smoke)
```

See: `project_management/architecture/README.md` for full context.

---

## Traceability

| Level | ID | Artifact |
|-------|-----|---------|
| SYS1 | SYS1-013 | Epic: EPIC_013_ASSISTANT_AUDIO_INTERFACE.md |
| SWE1 | SWE1-B | TC: TC-B-00_COMPONENT_DEFINITION.md |
| SWE3 | SWE3-B-04 | This issue (closer) |
| SWE4 | — | Unit tests (prior issues) |
| SWE5 | — | Integration tests in: `frontend/src/voice/__tests__/synthesis.integration.*`, backend voice-route integration tests (new, this issue) |
| SWE2 | — | Arch updates in: `flow-assistant-voice.md`, `component-overview.md`, `data-model.md`, `api-contracts.md`, ADRs (this issue) |
| SYS3 | — | Runtime smoke incl. full voice loop (this issue, Task 9) |

---

## 📋 Task List

### 0.0 Read Architecture Documentation [MANDATORY]
- [ ] **Read: `project_management/architecture/README.md`**
- [ ] **Read: relevant diagrams** in `project_management/architecture/diagrams/`

### 0.1 Read Predecessor Context [MANDATORY]
- [ ] **Read: `TC-B-00_COMPONENT_DEFINITION.md`**
- [ ] **Read: `TC-B-01_TTS_BRIDGE_CACHE_FOUNDATION_COMPLETION_REPORT.md`**
- [ ] **Read: `TC-B-02_AUTOPLAY_CHUNKING_PLAYBACK_COMPLETION_REPORT.md`**
- [ ] **Read: `TC-B-03_VOICE_PREFS_SETTINGS_COMPLETION_REPORT.md`**
- [ ] **Read: `TC-A-04_CAPTURE_CLOSER_INTEGRATION_SMOKE_COMPLETION_REPORT.md`** (non-adjacent dependency: capture contract for full-loop smoke)

> Closer reads ALL TC-B predecessor reports + the TC-A closer handoff.

### 0.2 Run Full Test Suite [MANDATORY GATE 🔴]
- [ ] Build [🔴] + lint [🔴] + all unit suites; record baseline; new failures → STOP.

### 1. Gap Analysis over TC-B-01…03 (SWE5 duty)
- [ ] Re-read all three completion reports; disposition every open risk, Known Limitation, deferred item (fixed here / accepted with rationale / epic follow-up with owner)
- [ ] Verify consistency: cache keys vs prefs voice values, guard contract vs settings writes, strip/chunk vs real transcript shapes, sample strategy vs cache
- [ ] Audit TC-B decisions against ADR triggers; each non-elevated decision gets an explicit no-ADR note in the completion report

### 2. Bug/Flaw Fixes Found in Review
- [ ] Fix gaps (wrong-voice cache collisions, autoplay races, isolation holes, missing copy); each fix tested

### 3. Integration Tests SWE5 (MANDATORY on closer 🔴)
- [ ] `synthesis.integration`: answer text → strip → chunk → synthesize (mocked helper) → cache hit on repeat → playback queue order with cumulative offsets
- [ ] Prefs isolation: user B denied on user A's prefs (read + write), unauthenticated denied on all `/api/voice/*`, session-isolation with two sessions
- [ ] Failure paths: helper error → fail-closed copy; stdout impurity rejected; TTS-disabled → silence without errors
- [ ] 0 failures allowed

### 4. Architecture / Traceability Updates SWE2 (closer duty)
- [ ] Populate `flow-assistant-voice.md` synthesis half + full-loop sequence (Mermaid + table + `Last updated by: SWE3-B-04`)
- [ ] Update `component-overview.md` (bridge, cache, playback, prefs), `data-model.md` (prefs storage), `api-contracts.md` (all `/api/voice/*` with signatures)
- [ ] Update `traceability/requirements-matrix.md` + `coverage-map.md` rows for SW-REQ-013-02/03/04-output
- [ ] Write ADRs: TTS helper/sidecar choice; per-user prefs storage; model-distribution decision (or explicit deferred-gate follow-up). Non-elevated decisions get no-ADR notes.
- [ ] Update `architecture/README.md` changelog (`Last updated by: SWE3-B-04`); confirm TC-A-04 entries coherent

### 5. Unit-Test Health
- [ ] Fill coverage holes in TC-B-01…03; coverage must not regress

### 6. Run Full Test Suite + Coverage [MANDATORY GATE 🔴]
- [ ] Build + lint (🔴) + unit + integration; 0 failures; coverage not regressed

### 7. Create Documentation
- [ ] Final voice-loop docs: bridge ops (model dir, env, Docker notes), cache ops (location, eviction), prefs API, licensing/attribution checklist

### 8. Licensing & Distribution Check
- [ ] Verify attributions ship (Whisper Apache-2.0 LICENSE + NOTICE, supertonic SDK MIT, weights OpenRAIL-M, lamejs MIT)
- [ ] Record model-distribution decision (vendored vs staged) + deferred build-gate follow-up as explicit gap with owner

### 9. SYS3 Runtime Smoke (MANDATORY on closer 🔴)
- [ ] Start the stack: `npm --prefix backend run dev` + `npm --prefix frontend run dev`
- [ ] Trigger the full loop: mic submit (or seeded prompt when no mic) → assistant answer → autoplay speech → replay + volume + voice change + sample playback
- [ ] Verify output: audible playback (or audio-pipeline evidence: synthesized MP3 + playback state), prefs persist per user, isolation holds across two sessions
- [ ] If models/hardware absent: run the documented fallback path, record `SYS3 SMOKE (fallback)` evidence + remaining HIGH gap. Skip only with documented reason.

### 10. Write Completion Report & Handoff [MANDATORY]
- [ ] Complete `TC-B-04_SYNTHESIS_CLOSER_INTEGRATION_SMOKE_COMPLETION_REPORT.md`
- [ ] **Write epic-handoff section** — MUST include:
  - What was verified: synthesis path + full voice loop results, smoke evidence (or fallback + gap)
  - Architecture artifacts updated (exact files + changes), ADRs written (or no-ADR notes)
  - Gaps fixed vs deferred (severity + owner for each deferred item, incl. build-gate follow-up)
  - Operating notes for release (model dir, env, Docker, cache, licenses)
  - Gate results table
- [ ] Update `TC-B-00_COMPONENT_DEFINITION.md`: all rows ✅, Status → ✅ Complete, decisions + arch-revision entry; notify epic (TC table → ✅)

---

## ⚠️ Constraints

- No new engines/voices beyond presets; no wake-word/streaming scope creep
- Deterministic mocked-helper integration tests — no flaky real-model tests in CI
- Synthetic fixtures only; no user audio persisted anywhere

---

## 📁 Files to Modify

| Action | File Path | Description |
|--------|-----------|-------------|
| Create | `frontend/src/voice/__tests__/synthesis.integration.*` + backend voice-route integration tests | SWE5 suites |
| Update | `project_management/architecture/diagrams/flow-assistant-voice.md` | Full-loop sequence |
| Update | `project_management/architecture/diagrams/component-overview.md` | Synthesis modules |
| Update | `project_management/architecture/diagrams/data-model.md` | Prefs storage |
| Update | `project_management/architecture/diagrams/api-contracts.md` | `/api/voice/*` contracts |
| Update | `project_management/architecture/traceability/requirements-matrix.md` | TC-B rows |
| Update | `project_management/architecture/traceability/coverage-map.md` | TC-B coverage |
| Create | `project_management/architecture/decisions/ADR-*.md` | TTS/prefs/distribution ADRs |
| Update | `project_management/architecture/README.md` | Changelog + links |
| Fix | Files flagged by gap analysis | Review fixes + tests |

---

## ✅ Acceptance Criteria

- [ ] Gap analysis covers TC-B-01…03 with every item dispositioned; no-ADR notes recorded
- [ ] Integration tests green incl. prefs isolation (SWE5 🔴); unit green; build+lint clean (🔴); coverage not regressed
- [ ] Architecture + traceability + ADRs current (or explicit deferred gaps with owners)
- [ ] SYS3 full-loop smoke with evidence (or documented fallback + HIGH gap); licenses verified; distribution decision recorded
- [ ] Completion report with epic handoff; TC-B-00 Status ✅ Complete

---

## 📖 Reference Documents

- V-Model Framework: `project_management/swaibian_V-Model_Agents/_templates/V_MODEL_FRAMEWORK.md`
- Architecture: `project_management/architecture/README.md`
- Epic: `project_management/epics/EPIC_013_ASSISTANT_AUDIO_INTERFACE.md`
- Component: `project_management/epics/EPIC_013_ASSISTANT_AUDIO_INTERFACE/TC_B_VOICE_SYNTHESIS_PLAYBACK/TC-B-00_COMPONENT_DEFINITION.md`
- Predecessor Reports: `TC-B-01_*_COMPLETION_REPORT.md`, `TC-B-02_*_COMPLETION_REPORT.md`, `TC-B-03_*_COMPLETION_REPORT.md`
- Non-adjacent: `project_management/epics/EPIC_013_ASSISTANT_AUDIO_INTERFACE/TC_A_VOICE_CAPTURE_STT/TC-A-04_CAPTURE_CLOSER_INTEGRATION_SMOKE_COMPLETION_REPORT.md`
- SW Requirements: SW-REQ-013-02, SW-REQ-013-03, SW-REQ-013-04 (output half)

---

## 🔗 Related Issues

- Depends On: TC-B-01, TC-B-02, TC-B-03; non-adjacent: TC-A-04 (full-loop smoke)
- Blocks: Epic completion (last closer of the epic)
- Related: Epics 004/006/007/010/012 (verified integration surfaces)

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
| SYS3 runtime smoke (Task 9) | SYS3 🔴 | ⬜ PENDING | |
