# TC-B-01: TTS Bridge + Cache Foundation — Completion Report

**Issue**: TC-B-01
**Component**: Voice Synthesis + Playback + Prefs (TC-B)
**V-Model**: SWE3-B-01
**Type**: 🔨 IMPLEMENTATION
**Status**: ✅ COMPLETE
**Completed**: 2026-09-21

---

## 1. What Was Built

### New Files

| File | Purpose |
|------|---------|
| `backend/tts_helper/tts_helper.py` | Supertonic-3 helper CLI: `--probe` / `--text --voice --lang --output-file --model-dir --offline --steps`; one-JSON-on-stdout contract (SW-REQ-013-02) |
| `backend/voice/ttsBridge.mjs` | Process boundary: buffer caps, 120 s timeout TERM→KILL, JSON-only stdout parsing, brief probe TTL (never permanent) |
| `backend/voice/voiceCache.mjs` | Per-user keyed disk cache: `SHA256(sdk|text|voice|lang)`, age 7 d / size 500 MB eviction, path-traversal-safe user scopes |
| `frontend/src/voice/tts.ts` | Client: `getVoiceStatus`, `synthesizeVoice` (WAV parse 8/16/24/32 + float + stereo→mono; lamejs 64 kbps mono MP3 in 1152-frame chunks), typed `VoiceTtsError` |
| `backend/voice/__tests__/voiceCache.test.mjs` | 16 cache/validation tests (keys, isolation, eviction, traversal) |
| `backend/voice/__tests__/ttsBridge.test.mjs` | 12 bridge tests (stdout purity, timeout TERM, caps, spawn, probe TTL) |
| `backend/voice/__tests__/ttsHelper.test.mjs` | 5 real-helper contract tests incl. real-weights synthesis (conditional) |
| `backend/voice/__tests__/routeAuth.test.mjs` | 2 live-server auth tests (status + synthesize → 401) |
| `project_management/epics/EPIC_013_ASSISTANT_AUDIO_INTERFACE/SW-REQ-013-02_LOCAL_TTS_SYNTHESIS.md` | SW-REQ-013-02 (6 shall statements + model-distribution decision) |
| `project_management/epics/EPIC_013_ASSISTANT_AUDIO_INTERFACE/SW-REQ-013-03_VOICE_PREFS.md` | SW-REQ-013-03 draft (4 shall statements, finalized TC-B-03) |

### Changed Files

| File | Change |
|------|--------|
| `backend/server.mjs` | Imports of cache/bridge; `TTS_*` env config (`TTS_HELPER_PATH/TTS_MODEL_DIR/TTS_PYTHON_BIN/TTS_SYNTH_TIMEOUT_MS`); `GET /api/voice/status` + `POST /api/voice/synthesize` (auth-gated globally at :8963); per-user cache dir `backend/data/voice-cache/` |
| `backend/package.json` | `test:voice` (32 tests across 4 suites) |
| `frontend/package.json` + lock | `@breezystack/lamejs` installed (pinned by lockfile) |
| `frontend/tsconfig.voice.json` | `vite/client` types added; `tts.ts` included |

### APIs / Contracts Defined

- **Backend**: `GET /api/voice/status` → `{voice: {available, sdkVersion, voices, modelDirConfigured, detail}}`; `POST /api/voice/synthesize {text, voice, lang}` → `{voice: {audioBase64 (WAV), voice, language, cacheHit}}`; errors 401/400/503 (`voice_engine_unavailable`)/504 (`voice_synthesis_timeout`)/500 (`voice_synthesis_error`).
- **Helper stdout**: `{"ok": true, "audio_path", "duration_seconds", "voice", "language", "mime_type": "audio/wav", "sample_rate", "channels"}` | `{"ok": false, "error"}`. stderr = diagnostics only.
- **`frontend/src/voice/tts.ts`**: `synthesizeVoice({text, voice, lang}) → {audioDataUrl: data:audio/mpeg, durationMs, voice, language, cacheHit}`; `getVoiceStatus() → VoiceTtsStatus`; `parseWavSamples(buffer)`, `encodeMp3DataUrl(samples, rate)` exported for tests/TC-B-02.

---

## 2. Key Decisions

| Decision | Rationale |
|----------|-----------|
| Model distribution via `TTS_MODEL_DIR` env + helper `~/.cache/supertonic3` default; vendoring deferred | ~400 MB weights don't belong in git; stated in SW-REQ-013-02 as Docker-stage follow-up. Verified LIVE this machine (supertonic 1.3.1, load 0.6 s, synth RTF ≈ 0.4, real WAV out). |
| Temp synth path ends `.wav` (bug found in live smoke) | `supertonic.save_audio` infers format from extension; `.tmp` failed, `.tmp.wav` works. Fixed + end-to-end proven (200 RIFF WAV, cacheHit true on repeat). |
| Frontend-side MP3 via dynamic `import('@breezystack/lamejs')` | Keeps codec out of the initial bundle; `request.ts` also lazy-imported so the pure codec modules run in Node tests (no `import.meta.env` in Node). |
| Probe cache 60 s TTL, never permanent; failures evict immediately | Per tech doc §4.5 — stale-once is fine, stale-forever hides real outages. |
| Route auth by existing global `/api/*` gate | One auth source, no parallel middleware; 401 contract proven by live tests. |
| Backend `console.error('[voice]', {userId, code})` — never text/audio/secrets | Follows TC-A-01 logging precedent; sanitized fields only. |

---

## 3. Gate Results

| Gate | Result | Notes |
|------|--------|-------|
| Pre-check build (Task 0.2) | ✅ | exit 0 (TC-A handoff) |
| Pre-check lint (Task 0.2) | ✅ | 48/14 baseline |
| Pre-check unit (Task 0.2) | ✅ | frontend 73/73; backend boot 200 |
| Post-implementation build | ✅ | `npm --prefix frontend run build` exit 0 |
| Post-implementation lint | ✅ | 48 errors/14 warnings = baseline, 0 new |
| Post-implementation unit | ✅ | frontend `test:voice` 79/79 (6 new tts); backend `test:voice` 32/32 (incl. real-weights synthesis, route auth) |
| Coverage vs baseline | ✅ | All new modules covered; 111 total tests across both suites |

## 3.5 Logger Evidence (mandatory)

| Item | Evidence |
|------|----------|
| Event names + allow-listed fields | Backend: `Unexpected voice synthesis failure. {userId, code}` / `Unexpected voice status failure. {userId}` — never text/audio/secrets |
| Request/user/session propagation | `ownerUserId` from session → cache user scope + error payload fields |
| Redaction/no-secret tests | Cache-path test asserts raw text never in file names; helper stdout-purity tests reject tracebacks; helper errors carry no audio bytes |
| Sink and failure behavior | Route catch-all → JSON error + logged; helper stderr tail only as bridge diagnostic |
| Audit/metrics separation | N/A — no streams added |

---

## 4. Handoff for TC-B-02 (Autoplay/Chunking/Playback)

**Entry point**: `frontend/src/voice/tts.ts` (`synthesizeVoice`, `VoiceTtsError`, `getVoiceStatus`) + `frontend/src/voice/` circle language (`voiceCircle.ts` `direction='output'`).

**Wiring chain** (routes live at backend boot):
`backend/server.mjs` global auth gate (:8963) → `GET /api/voice/status` / `POST /api/voice/synthesize` → `probeTtsEngine` / `synthesizeSpeech` (`ttsBridge.mjs`) → spawn `tts_helper.py` (JSON-on-stdout, TERM→KILL) → WAV on disk → cache (`voiceCache.mjs`) → base64 WAV response. Frontend: `synthesizeVoice` → `parseWavSamples` → `encodeMp3DataUrl` → `data:audio/mpeg`. Trigger demonstrated: `curl` login + synthesize (200, RIFF, cacheHit true on repeat, F1 vs M1 different keys).

**What you inherit**:
- `import { synthesizeVoice, getVoiceStatus, VoiceTtsError } from './voice/tts.ts'` — e.g. `const r = await synthesizeVoice({text, voice: prefs.voice, lang}); audio.src = r.audioDataUrl`
- Engine readiness: `getVoiceStatus().available` before autoplay; `VoiceTtsError.code === 'unavailable'` → fail-closed copy
- Backend env for ops: `TTS_MODEL_DIR` (weights), `TTS_PYTHON_BIN`, `TTS_SYNTH_TIMEOUT_MS`
- Test suites: `npm --prefix backend run test:voice` (32), `npm --prefix frontend run test:voice` (79)

**What is NOT implemented yet**:
- Playback hook/queue + autoplay/replay/volume + output circle — TC-B-02
- Prefs (voice/volume/toggle) + settings section + samples — TC-B-03
- `GET /api/voice/samples/:voice` route — TC-B-03

**Known limitations**: first synthesis latency ≈ 1.5–3 s (load 0.6 s + synth RTF ≈ 0.4); Docker images must stage weights (no runtime download; offline flags always on); `/api/voice/synthesize` returns WAV (client encodes MP3 — intentional).

**Open risks**: CPU contention while synthesizing concurrent chunks; kiosk-side `atob`/`btoa` fine, but 10 MB+ WAV strings for long answers (chunking must keep sizes sane — TC-B-02's 2–5 sentence rule).

**Run tests**: `npm --prefix backend run test:voice` + `npm --prefix frontend run test:voice` from repo root.

---

## ⚠️ Known Issues / Limitations (if any)

1. **First-synthesis latency** — acceptable (RTF ≈ 0.4, load 0.6 s); prewarm via `GET /api/voice/status` on app start is a TC-B-02/04 consideration.
2. **Model weights not staged in Docker** — documented distribution follow-up; runtime never downloads (offline flags enforced).

---

## Traceability

| Level | ID | Artifact |
|-------|-----|---------|
| SYS1 | SYS1-013 | Epic: EPIC_013_ASSISTANT_AUDIO_INTERFACE.md |
| SWE1 | SWE1-B | TC: TC-B-00_COMPONENT_DEFINITION.md |
| SWE3 | SWE3-B-01 | Issue: TC-B-01_TTS_BRIDGE_CACHE_FOUNDATION.md |
| SWE4 | — | Tests: backend 4 suites (32) + frontend `tts.test.ts` (6) |

---

## Self-verification (no-reviews mode)

| Gate | Command (repo root) | Exit | Result |
|------|---------------------|------|--------|
| D1 Lint (advisory here) | `npm --prefix frontend run lint` | 1 (pre-existing) | ✅ 48/14 = baseline, 0 new |
| D2 Typecheck/build | `npm --prefix frontend run build` | 0 | ✅ 0 errors |
| D3 Tests | `npm --prefix frontend run test:voice` | 0 | ✅ 79/79 |
| D3 Tests | `npm --prefix backend run test:voice` | 0 | ✅ 32/32 (incl. real-weights synth) |
| D4 Smoke through the wiring | dev stack + login + synthesize + repeat + F1 + invalid/empty/unauth | — | ✅ 200 RIFF WAV; cacheHit true (0.036 s); F1 miss (key isolation); 400/401 correct; temp hygiene (2 files, no litter) |
| D5 Self-checklist | — | — | ✅ every file maps to SW-REQ-013-02/03-draft; no existing callers touched (`request.ts`/server routes additive); no `any`/`eslint-disable`; no secrets/PII in logs/fixtures (credential only in shell, never committed); deviations documented |

Requirement → `file:line` → test → status:
- Helper JSON-only → `tts_helper.py` (`emit/fail`) → `ttsHelper.test.mjs` (purity/error/real-synth) → ✅
- 120 s TERM→KILL + caps → `ttsBridge.mjs` (`runTtsHelper`) → timeout/cap/purity tests → ✅
- Readiness truthful → `ttsBridge.mjs` (`probeTtsEngine`) + route → live `/api/voice/status` {available:true, voices:10} → ✅
- Keyed cache + isolation + eviction → `voiceCache.mjs` → 16 tests + live cacheHit/F1-miss → ✅
- Auth denial → global gate + route → live 401 + routeAuth tests → ✅
- WAV→MP3 client → `tts.ts` → `tts.test.ts` (parser variants, MP3 URL, errors) → ✅

Residual risks: Docker weight staging; system `python3`+`supertonic` availability at runtime (probe reflects truthfully; fail-closed 503 copy).

Independent review intentionally omitted — TC-B is declared `no-reviews`; gap analysis is inherited by the TC closer (TC-B-04).