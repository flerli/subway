# TC-B-03: Voice Prefs API + Settings Section — Completion Report

**Issue**: TC-B-03
**Component**: Voice Synthesis + Playback + Prefs (TC-B)
**V-Model**: SWE3-B-03
**Type**: 🔨 IMPLEMENTATION
**Status**: ✅ COMPLETE
**Completed**: 2026-09-21

---

## 1. What Was Built

### New Files

| File | Purpose |
|------|---------|
| `backend/voice/__tests__/prefsRoutes.test.mjs` | Live-server prefs/sample route tests (5: 401, defaults, roundtrip, 400s, sample RIFF/SKIP) |
| `frontend/src/api/voice.ts` | `fetchVoicePreferences` / `updateVoicePreferences` / `fetchVoiceSample` (sample decoded + encoded client-side via `tts.ts`) |
| `frontend/src/voice/voicePrefsStore.ts` | Framework-free live prefs store (`get/set/subscribe/reset`) — single source for playback guard + settings panel |
| `frontend/src/voice/__tests__/voicePrefsStore.test.ts` | 3 tests: defaults, clamping + subscription/unsubscribe, playback-guard integration (disabled-TTS silence) |

### Changed Files

| File | Change |
|------|--------|
| `backend/server.mjs` | `voice_preferences` table (PK `owner_user_id`) + bootstrap exec; `selectVoicePreferences`/`upsertVoicePreferences` (defaults `{true,'F1',80}`); shared `synthesizeVoiceWavBytes` (synthesize route refactored onto it); `GET/PUT /api/voice/preferences` (validation: voice enum 400, volume int 0–100 400); `GET /api/voice/samples/:voice?lang=` (per-language `VOICE_SAMPLE_TEXTS`, cache-first) |
| `frontend/src/widgets/assistant/AssistantSettingsPanel.tsx` | Voice section: toggle, preset grid (10 voices) with per-voice sample playback (`new Audio` + stop-on-replay), volume slider, Save via API + `setVoicePrefsState`; prefs fetched on mount alongside routes |
| `frontend/src/widgets/assistant/translations.ts` | 9 `copy.voice*` keys × en/de/fr/es (ASCII-only per convention) |
| `frontend/src/App.tsx` | Bootstrap fetch → `setVoicePrefsState` (non-fatal fallback to defaults); playback `getPrefs` now reads `useSyncExternalStore(subscribeVoicePrefsState, getVoicePrefsState)` — live guard |
| `frontend/src/App.css` | Voice-section styles (preset grid/cards) |
| `frontend/tsconfig.voice.json`, `package.json` | Store + tests in suite (`api/voice.ts` intentionally excluded from Node test scope — it imports `request.ts` with Vite `import.meta.env`) |
| `project_management/epics/EPIC_013_ASSISTANT_AUDIO_INTERFACE/SW-REQ-013-03_VOICE_PREFS.md` | Finalized (4 shall statements + verification) |

### APIs / Contracts Defined

- `GET /api/voice/preferences` → `{voicePreferences: {ttsEnabled, voice, volume, updatedAt}}` (defaults when none)
- `PUT /api/voice/preferences` `{ttsEnabled?, voice?, volume?}` → 200 stored record | 400 unknown voice / volume ∉ [0,100] | 401
- `GET /api/voice/samples/:voice?lang=xx` → `{voice: {audioBase64 WAV, voice, language, cacheHit}}` | 400/401/503/504
- `voicePrefsStore`: `getVoicePrefsState() / setVoicePrefsState(next) / subscribeVoicePrefsState(fn)→unsub / resetVoicePrefsStateForTests`

---

## 2. Key Decisions

| Decision | Rationale |
|----------|-----------|
| Prefs live in a dedicated `voice_preferences` table (not widget settings) | User-level concern (like app_preferences), not per-widget; clean per-user PK + no widget-settings coupling |
| Framework-free prefs store instead of threading props through the widget registry | Playback guard (App) + settings panel (widget-rendered, fixed props) both need live prefs; store is testable and Vite-free |
| Sample text is fixed per language and synthesized through the SAME cache-first pipeline | Reuses the TC-B-01 cache, so repeated previews are instant; text never user-supplied (no arbitrary synthesis from settings) |
| Synthesize route refactored onto shared `synthesizeVoiceWavBytes` | Two callers (synthesize + samples) with identical cache/cleanup/error semantics; eliminates the inline duplication |
| `api/voice.ts` excluded from `tsconfig.voice.json` | It statically imports `request.ts` (Vite `import.meta.env`) which cannot run in Node; store is self-contained instead |
| Live-server tests use the seeded dev credential | Kiosk-internal seed (server default); proves 401/validation/roundtrip against the real stack without new fixtures |

---

## 3. Gate Results

| Gate | Result | Notes |
|------|--------|-------|
| Pre-check build/lint/unit (Task 0.2) | ✅ | exit 0 / 48+14 / 94+37 |
| Post-implementation build | ✅ | `npm --prefix frontend run build` exit 0 |
| Post-implementation lint | ✅ | 48 errors/14 warnings = baseline, 0 new |
| Post-implementation unit | ✅ | frontend `test:voice` 97/97 (+3 store/guard); backend `test:voice` 37/37 (+5 prefs routes, incl. real sample RIFF with weights staged) |
| Coverage vs baseline | ✅ | Store/guard/routes covered; no regressions |

## 3.5 Logger Evidence (mandatory)

| Item | Evidence |
|------|----------|
| Event names + allow-listed fields | Backend: `Unexpected voice sample failure. {userId, code}` — no prefs/audio/secrets |
| Request/user/session propagation | `ownerUserId` scopes prefs select/upsert + cache dir; global auth gate 401s |
| Redaction/no-secret tests | Route tests assert 401 without cookies; no token/audio in test output; store tests assert clamping not leaking |
| Sink and failure behavior | Sample/synth failures → 503/504/500 JSON; store non-fatal on bootstrap fetch failure |
| Audit/metrics separation | N/A |

---

## 4. Handoff for TC-B-04 (TC-B Closer)

**Entry point**: `frontend/src/voice/voicePrefsStore.ts` + `backend/voice/__tests__/prefsRoutes.test.mjs` + `backend/voice/__tests__/routeAuth.test.mjs`.

**Wiring chain** (complete this issue): `AssistantSettingsPanel` (settings → assistant widget) voice section → `updateVoicePreferences`/`fetchVoicePreferences` (`api/voice.ts` → `/api/voice/preferences`) → `setVoicePrefsState` (store) → `useSyncExternalStore` in App → playback `getPrefs` (voice/volume/toggle live) + bootstrap fetch on auth. Sample play: panel button → `fetchVoiceSample(voice, languageCode)` → `/api/voice/samples/:voice?lang=` → WAV → client MP3 → `<audio>`. Bundle proof: `voice-preset-grid` + `widget-settings-card--voice` in `frontend/dist`.

**What you inherit**:
- `import { getVoicePrefsState, setVoicePrefsState, subscribeVoicePrefsState, DEFAULT_VOICE_PREFS } from './voice/voicePrefsStore.ts'` — usage proven in App + panel + tests
- `fetchVoicePreferences/updateVoicePreferences/fetchVoiceSample` (api/voice.ts) with exact payloads above
- Prefs route tests pattern (live server + committed seed) — extend for the closer's two-session isolation
- Setting panel voice section is self-contained; save-on-button consistent with the rest of the panel

**What is NOT implemented yet**:
- Two-session per-user isolation suite (user B cannot read/write user A) — TC-B-04 (second session via a second DB user record)
- Full-loop runtime smoke (mic → answer → autoplay with prefs applied) — TC-B-04
- Docker weight staging + `TTS_MODEL_DIR` compose wiring — epic-level follow-up (documented TC-B-01)

**Known limitations**: prefs fetch failure at bootstrap falls back to defaults silently (panel surfaces errors on open); sample playback depends on autoplay policy (user gesture from the button satisfies it).

**Open risks**: none new beyond TC-B-01/02 items (autoplay policy, weight staging).

**Run tests**: `npm --prefix backend run test:voice` (37) + `npm --prefix frontend run test:voice` (97).

---

## ⚠️ Known Issues / Limitations (if any)

1. Bootstrap prefs fetch is non-fatal by design (defaults until settings opened).
2. Two-session isolation deferred to TC-B-04 (single seeded user exists).

---

## Traceability

| Level | ID | Artifact |
|-------|-----|---------|
| SYS1 | SYS1-013 | Epic: EPIC_013_ASSISTANT_AUDIO_INTERFACE.md |
| SWE1 | SWE1-B | TC: TC-B-00_COMPONENT_DEFINITION.md |
| SWE3 | SWE3-B-03 | Issue: TC-B-03_VOICE_PREFS_SETTINGS.md |
| SWE4 | — | Tests: store/guard (3), prefs routes live (5), api normalizers via route roundtrip |

---

## Self-verification (no-reviews mode)

| Gate | Command (repo root) | Exit | Result |
|------|---------------------|------|--------|
| D1 Lint (mandatory) | `npm --prefix frontend run lint` | 1 (pre-existing) | ✅ 48/14 = baseline, 0 new |
| D2 Typecheck/build | `npm --prefix frontend run build` | 0 | ✅ 0 errors |
| D3 Tests | `npm --prefix frontend run test:voice` | 0 | ✅ 97/97 |
| D3 Tests | `npm --prefix backend run test:voice` | 0 | ✅ 37/37 (prefs 401/defaults/roundtrip/400s, sample RIFF) |
| D4 Smoke through the wiring | bundle grep + live route tests (login → GET defaults → PUT M3/35 → GET reflects → restore) | 0 | ✅ prefs round-trip proven against the real server; panel/guard chain compiled into bundle |
| D5 Self-checklist | — | — | ✅ every file maps to SW-REQ-013-03; no `any`/`eslint-disable`; seed dev credential only in tests (never committed as secret — it IS the committed seed default, documented); store/guard integration tested |

Requirement → `file:line` → test → status:
- Per-user storage + defaults → `server.mjs` (`voice_preferences`, `selectVoicePreferences`) → defaults/roundtrip tests → ✅
- Auth + validation → global gate + PUT checks → 401/400 tests → ✅
- Settings voice section + live guard → panel + store + App `useSyncExternalStore` → store/guard tests + bundle → ✅ (two-session isolation → TC-B-04)
- 4-language copy → `translations.ts` 9×4 keys → convention + build → ✅

Residual risks: two-session isolation (TC-B-04), autoplay policy, weight staging.

Independent review intentionally omitted — TC-B is declared `no-reviews`; gap analysis is inherited by the TC closer (TC-B-04).