# TC-B-03: Per-User Voice Prefs API + Settings Voice Section

**Component**: Voice Synthesis + Playback + Prefs (TC-B)
**Epic**: E-013 Assistant Audio Interface
**V-Model**: SWE3-B-03
**Type**: 🔨 IMPLEMENTATION
**Priority**: P1-High
**Estimated Effort**: M
**Dependencies**: TC-B-02 (playback guard contract to satisfy)
**SW-REQ**: SW-REQ-013-03

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

Give every user their own voice: persisted toggle/preset/volume, a settings section with sample playback per preset, and airtight per-user isolation. Prefs without isolation leak one household member's choices (and audio) to another.

**High Stakes**: Cross-user prefs/audio exposure = privacy breach; unprotected endpoints = auth bypass.
**Constraints**: Cookie-session auth on all new routes (reuse Epic 003 patterns); per-user denial + session-isolation tests; no token leakage (offline stack has no tokens — assert none introduced); all copy en/de/fr/es.

---

## 🏗️ Architectural Context

```
AssistantSettingsPanel → voice section (toggle, preset grid M1–M5/F1–F5, sample-play, volume) → GET/PUT /api/voice/preferences (per-user) → playback guard (TC-B-02) reads prefs → synthesize uses prefs.voice/lang
```

See: `project_management/architecture/README.md` for full context.

---

## Traceability

| Level | ID | Artifact |
|-------|-----|---------|
| SYS1 | SYS1-013 | Epic: EPIC_013_ASSISTANT_AUDIO_INTERFACE.md |
| SWE1 | SWE1-B | TC: TC-B-00_COMPONENT_DEFINITION.md |
| SWE3 | SWE3-B-03 | This issue |
| SWE4 | — | Unit tests in: prefs validation tests, route auth tests, settings-panel tests |

---

## 📋 Task List

### 0.0 Read Architecture Documentation [MANDATORY]
- [ ] **Read: `project_management/architecture/README.md`**
- [ ] **Read: relevant diagrams** in `project_management/architecture/diagrams/`

### 0.1 Read Predecessor Context [MANDATORY]
- [ ] **Read: `TC-B-00_COMPONENT_DEFINITION.md`**
- [ ] **Read: `TC-B-02_AUTOPLAY_CHUNKING_PLAYBACK_COMPLETION_REPORT.md`** ← predecessor's handoff (guard contract to satisfy)

### 0.2 Run Full Test Suite [MANDATORY GATE 🔴]
- [ ] Build [🔴] + lint [🔴] + all voice suites; record baseline; new failures → STOP.

### 1. Investigate Requirements
- [ ] Read: SW-REQ-013-03 draft (TC-B-01) + DISCOVERY_BRIEF §2 (voice settings) + §5 interaction 2
- [ ] Read: `frontend/src/widgets/assistant/AssistantSettingsPanel.tsx` (route editor patterns to extend, not duplicate)
- [ ] Read: Epic 003-003 enforcement (`003_USER_MANAGEMENT__ISSUE_DEFINITION__003_*`) + `backend/server.mjs` session middleware (patterns to reuse)
- [ ] Read: Epic 004 translation standard for new settings copy

### 1.5 Logging & Observability Integration [MANDATORY CROSS-CUTTING]
- [ ] Prefs read/write events with user/session context; never log voice audio, message content, or secrets
- [ ] Record logger evidence or specific tested `N/A` rationale

### 2. Write/Update Requirements
- [ ] Finalize SW-REQ-013-03 (fields: `ttsEnabled`, `voice` enum M1–M5/F1–F5, `volume` 0–100; defaults; ownership; denial/isolation expectations)

### 3. Investigate Architecture
- [ ] Review: assistant settings persistence shape (extend route/widget-settings pattern vs new table — decide, document, follow Epic 010 precedent)
- [ ] Review: sample-audio strategy (pre-generated per preset via TC-B-01 bridge vs live synthesize on demand — decide for latency + cache)

### 4. Implement Code
- [ ] Backend (authenticated): `GET /api/voice/preferences`, `PUT /api/voice/preferences` (validated: voice enum, volume range, boolean toggle), per-user ownership enforced; `GET /api/voice/samples/:voice` (or equivalent) for preset previews
- [ ] Frontend voice section in `AssistantSettingsPanel`: TTS toggle, preset grid with per-voice sample-play button, volume slider, saved-state copy; satisfies TC-B-02 guard contract (playback reads live prefs)
- [ ] Validation: unknown voice rejected, volume clamped, `na` language fallback honored at synthesize time
- [ ] i18n: all settings copy en/de/fr/es; attributions note where required (weights OpenRAIL-M)

### 5. Create Unit Tests (SWE4) [MANDATORY]
- [ ] Validation tests: enum/range/boolean coercion, defaults for new users
- [ ] Auth tests: unauthenticated prefs read/write denied; user B cannot read/write user A's prefs (denial + session isolation); no token/secret in responses
- [ ] Settings-panel tests: toggle/preset/sample/volume render + save flow (mocked API)
- [ ] Guard-integration test: playback honors toggled-off + changed voice without restart

### 6. Run Full Test Suite + Coverage [MANDATORY GATE 🔴]
- [ ] Build + lint (both 🔴) + unit suites; 0 new failures; coverage not regressed

### 7. Create Documentation
- [ ] Prefs API doc (paths, payloads, auth, error codes) + settings UX notes
- [ ] Note for closer: prefs storage + new endpoints to add to data-model/api-contracts diagrams

### 8. Write Completion Report & Handoff [MANDATORY]
- [ ] Complete `TC-B-03_VOICE_PREFS_SETTINGS_COMPLETION_REPORT.md`
- [ ] **Write handoff section for TC-B-04 (closer) team** — MUST include:
  - What was built: endpoint table (path/method/payload/auth/errors), settings UI map, guard wiring proof
  - Key decisions/deviations (storage shape, sample strategy, defaults)
  - Known limitations (migration for existing users, Docker volume behavior for prefs/cache)
  - Open risks for closer verification (isolation edge cases, sample latency)
  - Gate results table
- [ ] Update `TC-B-00_COMPONENT_DEFINITION.md` with status + new decisions

---

## ⚠️ Constraints

- Every new endpoint authenticated + per-user scoped; no public voice routes
- No raw audio persisted; samples served from cache/bridge, not user uploads
- All user-facing copy in 4 languages

---

## 📁 Files to Modify

| Action | File Path | Description |
|--------|-----------|-------------|
| Update | `backend/server.mjs` | Prefs + sample routes |
| Update | `frontend/src/widgets/assistant/AssistantSettingsPanel.tsx` | Voice section |
| Update | `frontend/src/voice/useVoicePlayback.ts` | Live prefs guard (finalize) |
| Update | `frontend/src/i18n/*` + assistant translations | 4-language settings copy |
| Read   | `frontend/src/api/assistant.ts` | Settings API patterns |

---

## ✅ Acceptance Criteria

- [ ] Prefs persist per user and drive playback (toggle/voice/volume take effect without restart)
- [ ] Per-user denial + session isolation proven by tests; unauthenticated denied
- [ ] Each preset plays a sample; volume slider works; copy complete in 4 languages
- [ ] Build+lint clean (🔴); tests green; coverage not regressed
- [ ] Completion report with TC-B-04 handoff; TC-B-00 updated; logger evidence included

---

## 📖 Reference Documents

- V-Model Framework: `project_management/swaibian_V-Model_Agents/_templates/V_MODEL_FRAMEWORK.md`
- Architecture: `project_management/architecture/README.md`
- Epic: `project_management/epics/EPIC_013_ASSISTANT_AUDIO_INTERFACE.md`
- Component: `project_management/epics/EPIC_013_ASSISTANT_AUDIO_INTERFACE/TC_B_VOICE_SYNTHESIS_PLAYBACK/TC-B-00_COMPONENT_DEFINITION.md`
- Predecessor Report: `project_management/epics/EPIC_013_ASSISTANT_AUDIO_INTERFACE/TC_B_VOICE_SYNTHESIS_PLAYBACK/TC-B-02_AUTOPLAY_CHUNKING_PLAYBACK_COMPLETION_REPORT.md`
- SW Requirements: SW-REQ-013-03

---

## 🔗 Related Issues

- Depends On: TC-B-02 (guard contract)
- Blocks: TC-B-04 (closer verifies prefs + isolation)
- Related: Epic 003 (auth patterns), Epic 010-007 (settings home), Epic 004 (i18n)

---

## Gate Results (filled during execution)

| Gate | Level | Result | Notes |
|------|-------|--------|-------|
| Pre-check suite (Task 0.2) | SWE4 | ⬜ PENDING | |
| Post-implementation suite (Task 6) | SWE4 | ⬜ PENDING | |
| Coverage vs baseline | SWE4 | ⬜ PENDING | |
| Build `npm --prefix frontend run build` | SWE4-BUILD 🔴 | ⬜ PENDING | |
| Lint `npm --prefix frontend run lint` | SWE4-LINT 🔴 | ⬜ PENDING | |
