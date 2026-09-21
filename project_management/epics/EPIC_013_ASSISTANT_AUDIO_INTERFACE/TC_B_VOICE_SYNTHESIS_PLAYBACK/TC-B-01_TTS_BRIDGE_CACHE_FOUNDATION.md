# TC-B-01: TTS Bridge + WAV→MP3 + Cache Foundation

**Component**: Voice Synthesis + Playback + Prefs (TC-B)
**Epic**: E-013 Assistant Audio Interface
**V-Model**: SWE3-B-01
**Type**: 🔨 IMPLEMENTATION
**Priority**: P0-Critical
**Estimated Effort**: L
**Dependencies**: TC-A-04 handoff (reuse contract) + TC-B-00; first TC-B issue (tooling gate applies)
**SW-REQ**: SW-REQ-013-02 (written in this issue), SW-REQ-013-03 (drafted here)

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

Build the synthesis backbone: a disciplined Python helper process running Supertonic-3, fronted by backend `/api/voice/*` routes, with WAV→MP3 encoding and a disk cache — before any autoplay UI exists. If the process boundary is sloppy (blocking spawns, unbounded buffers, unkeyed cache), the kiosk hangs or leaks.

**High Stakes**: Blocking/uncapped helper spawns freeze the Node backend for all users; unkeyed cache serves the wrong voice.
**Constraints**: One-JSON-object-on-stdout contract (never traceback/audio bytes on stdout); `--model-dir` + offline flags in production; 120 s timeout with TERM→KILL; stdout/stderr buffer caps; `supertonic==1.3.1` pin; cache key = SHA256(sdk_version + text + voice + language); offline-by-construction.

---

## 🏗️ Architectural Context

```
[TC-B-02/03 later] → POST /api/voice/synthesize {text, voice, lang} → backend spawns tts_helper.py --text … --voice … --lang … --output-dir … [--model-dir … --offline]
  → helper stdout: {"ok": true, "audio_path": …, "duration_seconds": …, "voice": …, "language": …, "mime_type": "audio/wav"} → WAV→MP3 (lamejs) → cache → data:audio/mpeg + durationMs
  → GET /api/voice/status (readiness: import OK? pinned version? model files complete? voices list?)
```

See: `project_management/architecture/README.md` for full context.

---

## Traceability

| Level | ID | Artifact |
|-------|-----|---------|
| SYS1 | SYS1-013 | Epic: EPIC_013_ASSISTANT_AUDIO_INTERFACE.md |
| SWE1 | SWE1-B | TC: TC-B-00_COMPONENT_DEFINITION.md |
| SWE3 | SWE3-B-01 | This issue |
| SWE4 | — | Unit tests in: helper-contract tests, cache-key tests, route tests |

---

## 📋 Task List

### 0.0 Read Architecture Documentation [MANDATORY]
- [ ] **Read: `project_management/architecture/README.md`**
- [ ] **Read: relevant diagrams** in `project_management/architecture/diagrams/`

### 0.1 Read Predecessor Context [MANDATORY]
- [ ] **Read: `TC-B-00_COMPONENT_DEFINITION.md`**
- [ ] **Read: `TC-A-04_CAPTURE_CLOSER_INTEGRATION_SMOKE_COMPLETION_REPORT.md`** ← TC-A closer handoff (reuse contract, level conventions, open gaps)

> TC-B-01 is the first TC-B issue: component definition + TC-A closer handoff. No TC-B predecessor report exists yet.

### 0.2 Run Full Test Suite [MANDATORY GATE 🔴]
- [ ] `npm --prefix frontend run build` [🔴] + `npm --prefix frontend run lint` [🟢 ADVISORY on TC-B-01] + backend boot check + TC-A voice unit suites
- [ ] **TOOLING GATE**: typecheck + tests + lint recorded; clean before handoff. Record baseline.

### 1. Investigate Requirements
- [ ] Read: DISCOVERY_BRIEF §2/§4/§6 + `audio_interface_documentation.md` §2 (SDK), §2.3 (process boundary), §3 (codec), §4 (reuse checklist)
- [ ] Read: `backend/server.mjs` (route/auth/persistence patterns for assistant + Bring/Roborock sidecar precedent: spawn, timeout, per-user scoping)
- [ ] Read: `backend/bring_sidecar/server.py` + `backend/roborock_sidecar/server.py` (bridge patterns to mirror)

### 1.5 Logging & Observability Integration [MANDATORY CROSS-CUTTING]
- [ ] Backend `[voice]` events for synthesize/status with user/session context; never log text prompts, message content, audio bytes, or secrets
- [ ] Helper stdout discipline enforced + tested (JSON only); stderr for diagnostics; probe failures cached briefly, never permanently
- [ ] Record logger evidence or specific tested `N/A` rationale

### 2. Write/Update Requirements
- [ ] Write SW-REQ-013-02 (synthesis: engine, process contract, timeout, cache, status probe, offline behavior)
- [ ] Draft SW-REQ-013-03 (prefs storage + isolation expectations; finalized TC-B-03)

### 3. Investigate Architecture
- [ ] Review: model distribution decision (vendored vs staged; record decision + gap for build-gate follow-up)
- [ ] Review: cache location + eviction (age 7 d / size 500 MB guidance from tech doc) adapted to backend data dir conventions

### 4. Implement Code
- [ ] `backend/tts_helper/tts_helper.py`: CLI (`--text --voice --lang --output-dir --format [--model-dir --offline]`), `TTS(model='supertonic-3', auto_download=False, …)`, `get_voice_style`, `synthesize(..., total_steps=8)`, JSON-only stdout contract + error object (never traceback on stdout)
- [ ] Backend routes (cookie-session authenticated): `GET /api/voice/status` (readiness probe), `POST /api/voice/synthesize` (spawn with timeout TERM→KILL, buffer caps, `--model-dir` + offline in production), cache lookup/store keyed SHA256(sdk + text + voice + lang), eviction by age/size
- [ ] `frontend/src/voice/tts.ts`: client (`getStatus`, `synthesize`), WAV→MP3 via `@breezystack/lamejs` (1 ch, 64 kbps, 1152-sample frames + flush), `data:audio/mpeg;base64` + `durationMs`; never label WAV as MP3
- [ ] Deps: `supertonic==1.3.1` (helper env), `@breezystack/lamejs` (frontend, pinned); document model sources (`Supertone/supertonic-3`, voices JSONs) + license files to ship
- [ ] No autoplay UI in this issue (TC-B-02); no prefs UI (TC-B-03) — routes return real audio for tests/scripts

### 5. Create Unit Tests (SWE4) [MANDATORY]
- [ ] Helper-contract tests: ok/error JSON shapes, stdout purity (no traceback/bytes), timeout behavior mocked
- [ ] Cache-key tests: voice/language in key (same text + different voice ⇒ different entries), eviction rules
- [ ] Route tests: unauthenticated denied, per-user cache separation, status probe states
- [ ] Codec tests: WAV parse (8/16/24/32-bit, mono/stereo downmix) → MP3 frames + durationMs math

### 6. Run Full Test Suite + Coverage [MANDATORY GATE 🔴]
- [ ] Build [🔴] + lint [🟢 this issue] + unit suites; 0 new failures; coverage not regressed; TOOLING GATE clean before handoff

### 7. Create Documentation
- [ ] Helper CLI contract doc + cache/eviction doc + model/licensing note (Apache-2.0 NOTICE, MIT, OpenRAIL-M)
- [ ] Note for closer: bridge + cache + routes to add to api-contracts/data-model/flow diagrams

### 8. Write Completion Report & Handoff [MANDATORY]
- [ ] Complete `TC-B-01_TTS_BRIDGE_CACHE_FOUNDATION_COMPLETION_REPORT.md`
- [ ] **Write handoff section for TC-B-02 team** — MUST include:
  - What was built: routes (paths, payloads, auth, error codes), helper CLI usage examples, client API + cache conventions
  - Key decisions/deviations (model-dir strategy, timeouts, eviction values, dep pins)
  - Known limitations (no UI yet, model distribution gap, first-synthesis latency)
  - Open risks (CPU contention RTF≈0.2, Docker image size, sidecar env parity)
  - Gate results table
- [ ] Update `TC-B-00_COMPONENT_DEFINITION.md` with status + new decisions

---

## ⚠️ Constraints

- Offline-by-construction: explicit model dir + offline flags in production; fail closed ("reinstall/repair runtime"), never download at runtime
- Helper stdout JSON-only; TERM→KILL escalation; buffer caps
- Authenticated routes only (except nothing public); per-user cache separation

---

## 📁 Files to Modify

| Action | File Path | Description |
|--------|-----------|-------------|
| Create | `backend/tts_helper/tts_helper.py` | Supertonic-3 helper CLI |
| Update | `backend/server.mjs` | `/api/voice/status`, `/api/voice/synthesize` + cache |
| Create | `frontend/src/voice/tts.ts` | Frontend TTS client + MP3 encode |
| Update | `frontend/package.json` | Add `@breezystack/lamejs` (pinned) |
| Read   | `backend/bring_sidecar/server.py` | Bridge precedent |
| Read   | `project_management/ideas/audio-interface/audio_interface_documentation.md` | Normative contracts |

---

## ✅ Acceptance Criteria

- [ ] `synthesize(text, voice, lang)` returns playable MP3 data + duration through the real helper path (or documented model-absent fallback with status probe reflecting it)
- [ ] Status probe reports readiness truthfully (import/version/files/voices)
- [ ] Cache keyed correctly with eviction; stdout JSON-only proven by test
- [ ] Unauthenticated synthesize/status denied; users isolated
- [ ] Build clean (🔴), lint recorded (🟢), tests green; SW-REQ-013-02 written
- [ ] Completion report with TC-B-02 handoff; TC-B-00 updated; logger evidence included

---

## 📖 Reference Documents

- V-Model Framework: `project_management/swaibian_V-Model_Agents/_templates/V_MODEL_FRAMEWORK.md`
- Architecture: `project_management/architecture/README.md`
- Epic: `project_management/epics/EPIC_013_ASSISTANT_AUDIO_INTERFACE.md`
- Component: `project_management/epics/EPIC_013_ASSISTANT_AUDIO_INTERFACE/TC_B_VOICE_SYNTHESIS_PLAYBACK/TC-B-00_COMPONENT_DEFINITION.md`
- Predecessor Report (TC-A handoff): `project_management/epics/EPIC_013_ASSISTANT_AUDIO_INTERFACE/TC_A_VOICE_CAPTURE_STT/TC-A-04_CAPTURE_CLOSER_INTEGRATION_SMOKE_COMPLETION_REPORT.md`
- SW Requirements: SW-REQ-013-02 (written here), SW-REQ-013-03 (draft)

---

## 🔗 Related Issues

- Depends On: TC-A-04 (handoff), TC-B-00
- Blocks: TC-B-02 (playback consumes this bridge)
- Related: Epics 008/009 (sidecar precedent), TC-A-01 (cache-key conventions)

---

## Gate Results (filled during execution)

| Gate | Level | Result | Notes |
|------|-------|--------|-------|
| Pre-check suite (Task 0.2) | SWE4 | ⬜ PENDING | |
| Post-implementation suite (Task 6) | SWE4 | ⬜ PENDING | |
| Coverage vs baseline | SWE4 | ⬜ PENDING | |
| Build `npm --prefix frontend run build` | SWE4-BUILD 🔴 | ⬜ PENDING | |
| Lint `npm --prefix frontend run lint` | 🟢 ADVISORY (this issue) | ⬜ PENDING | |
