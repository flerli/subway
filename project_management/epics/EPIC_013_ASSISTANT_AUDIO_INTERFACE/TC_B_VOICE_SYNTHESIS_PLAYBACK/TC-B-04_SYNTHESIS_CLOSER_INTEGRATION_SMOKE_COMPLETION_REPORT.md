# TC-B-04: TC-B Closer — Completion Report

**Issue**: TC-B-04
**Component**: Voice Synthesis + Playback + Prefs (TC-B)
**V-Model**: SWE3-B-04 (closer — inherits SWE5/SWE2/SYS3 duties for TC-B)
**Type**: 🔨 IMPLEMENTATION (CLOSER)
**Status**: ✅ COMPLETE
**Completed**: 2026-09-21

---

## 1. What Was Built

### New Files

| File | Purpose |
|------|---------|
| `backend/voice/__tests__/isolation.test.mjs` | **SWE5 two-session isolation** (3 tests): real server on `BACKEND_DATA_DIR` temp DB, second user seeded with the app's scrypt format; proves B can't read/write A's prefs + 401 still holds |
| `frontend/src/voice/__tests__/synthesis.integration.test.ts` | **SWE5 synthesis integration** (3 tests): REAL strip→chunk→`synthesizeVoice` chain with genuine WAV bytes; 503→`unavailable`; non-WAV rejected as `unsupported-format` |
| `project_management/architecture/decisions/ADR-002-tts-bridge-cache.md` | Accepted: helper/bridge/cache architecture + model distribution |
| `project_management/architecture/decisions/ADR-003-voice-prefs-store.md` | Accepted: prefs table + live store pattern |

### Changed Files

| File | Change |
|------|--------|
| `backend/server.mjs` | `BACKEND_DATA_DIR` env override (additive; lets tests use an isolated DB without touching dev data) |
| `frontend/src/api/request.ts` | `import.meta.env?.VITE_API_BASE_URL` optional chaining — the module now imports cleanly in Node (integration tests) while Vite behavior is unchanged |
| `project_management/architecture/diagrams/flow-assistant-voice.md` | Synthesis half + full loop populated (all rows ✅) |
| `project_management/architecture/diagrams/data-model.md` | `voice_preferences` real (erDiagram, columns, defaults) |
| `project_management/architecture/diagrams/api-contracts.md` | All `/api/voice/*` signatures real |
| `project_management/architecture/traceability/requirements-matrix.md` | All 5 SW-REQs ✅ |
| `project_management/architecture/traceability/coverage-map.md` | TC-B coverage real (105+40 tests, smoke evidence) |
| `project_management/architecture/README.md` | `Last updated by: SWE3-B-04`, ADR-002/003 linked, changelog |

### APIs / Contracts Defined

- `BACKEND_DATA_DIR` env: runtime data dir override (test/ops both)
- SWE5 seam contract: fakes ONLY at hardware/network/model-weight boundaries; all pure seams (strip/chunk/decode/encode/cache/bridge/guard) run real in integration

---

## 2. Key Decisions

| Decision | Rationale |
|----------|-----------|
| Two-session isolation solved in the closer (not deferred again) | The TC-B-03 deferred gap; rule-8 second occurrence → MEDIUM → fixed now. Live server + temp DB + direct user seeding mirrors the app's scrypt format exactly |
| `BACKEND_DATA_DIR` env added for tests | Tests must never write users/prefs into the dev DB; additive one-liner, also useful for ops |
| `request.ts` optional-chain fix | `api/voice`-style modules must import in Node for integration tests; `import.meta.env` is Vite-only, optional chaining is contract-safe in both worlds |
| No-ADR notes: `test:voice` toolchain, sample-text table, `BACKEND_DATA_DIR`, request.ts fix | All are local tooling/config details without lasting architecture impact; ADR-002/003 elevated instead (bridge/cache + prefs patterns) |
| SYS3 recorded FULL for backend paths, FALLBACK for the mic half | Backend voice loop 100% exercised live (status/synth/prefs/sample); live microphone still needs target hardware (HIGH gap, HW-owned) |

---

## 3. Gate Results

| Gate | Result | Notes |
|------|--------|-------|
| Pre-check build/lint/unit (Task 0.2) | ✅ | exit 0 / 48+14 / 97+37 |
| Integration suite SWE5 (Task 3/6) | ✅ | isolation 3/3 (temp DB) + synthesis 3/3 (real chain) |
| Post-implementation suite (Task 6) | ✅ | frontend `test:voice` 105/105; backend `test:voice` 40/40 |
| Coverage vs baseline | ✅ | +8 tests in closer; no regressions |
| Typecheck (`npm --prefix frontend run build`) | ✅ | exit 0 |
| Lint (`npm --prefix frontend run lint`) | ✅ | 48/14 = baseline, 0 new |
| SYS3 runtime smoke (Task 8) | ✅ | dev stack: backend 200 / frontend 200 / login 200 / status available(10 voices) / synthesize 200 RIFF / prefs PUT 200 M3-45 / sample 200 RIFF / prefs restored / servers down. Mic path FALLBACK (HIGH gap) |

## 3.5 Logger Evidence (mandatory)

| Item | Evidence |
|------|----------|
| Event names + allow-listed fields | TC-B adds `[voice]`-scoped `console.error` with `{userId, code}` only; never text/audio/secrets (verified across B-01..04) |
| Request/user/session propagation | `ownerUserId` → prefs rows + cache scopes; global auth gate; isolation test proves cross-session denial |
| Redaction/no-secret tests | stdout-purity (helper), markup PII, console-spy PII, cache-path privacy, non-WAV rejection — all green across suites |
| Sink and failure behavior | Helper stdout JSON-only; timeout TERM→KILL; 503/504 fail-closed JSON; probe never caches failures |
| Audit/metrics separation | N/A — no streams added |

---

## 4. Epic Handoff (Voice Loop Complete)

**What was verified**: full backend voice loop live (status/synthesize/prefs/sample, cacheHit+isolation semantics); full frontend chain in integration (strip→chunk→client→MP3, error mapping); the mic→submit half proven in TC-A (capture integration + fallback smoke).

**Deferred gaps and owners** (final disposition):
| Gap | Severity | Owner |
|---|---|---|
| Live-mic E2E + visual/device proof (both TCs) | HIGH | Target-kiosk hardware bring-up (SWE6/SYS4 gate) — the only remaining runtime proof |
| Model-weight staging in Docker images | MEDIUM | Epic follow-up (Dockerfile + compose `TTS_MODEL_DIR`); runtime never downloads (`--offline` enforced) |
| `initial_prompt` decoder bias | LOW | Revisit on `@huggingface/transformers` upgrade (documented in SW-REQ-013-01) |
| First-tap STT model latency / prewarm | LOW | Optional perf follow-up |

**Operating notes for release**:
- Env: `TTS_MODEL_DIR` (weights; default `~/.cache/supertonic3`), `TTS_PYTHON_BIN` (default `python3`), `TTS_SYNTH_TIMEOUT_MS` (default 120000), `BACKEND_DATA_DIR` (optional override)
- Supertonic pin `==1.3.1`; ~400 MB weights in `onnx/` + 10 `voice_styles/*.json`; licensing: Whisper Apache-2.0 + NOTICE, supertonic SDK MIT, weights OpenRAIL-M, lamejs MIT (ship attributions)
- Cache: `backend/data/voice-cache/` (7 d / 500 MB auto-evict); prefs table `voice_preferences`
- Runtime never downloads models; probe (`/api/voice/status`) tells the truth; all voice routes fail closed

**Run tests**: `npm --prefix backend run test:voice` (40) + `npm --prefix frontend run test:voice` (105) from repo root. Build: `npm --prefix frontend run build` (exit 0). Lint: baseline 48/14.

---

## ⚠️ Known Issues / Limitations (if any)

1. **HIGH: live-mic proof needs target hardware** — all other seams proven; the physical mic→transcript→thread run is a HW/SYS4 gate.
2. Backend test servers need unique ports + clean shutdown (leaked dev server caused one flaky boot — mitigated by killing strays; `after()` kills are best-effort).

---

## Traceability

| Level | ID | Artifact |
|-------|-----|---------|
| SYS1 | SYS1-013 | Epic: EPIC_013_ASSISTANT_AUDIO_INTERFACE.md |
| SWE1 | SWE1-B | TC: TC-B-00_COMPONENT_DEFINITION.md |
| SWE3 | SWE3-B-04 | Issue: TC-B-04_SYNTHESIS_CLOSER_INTEGRATION_SMOKE.md |
| SWE4 | — | Unit tests: 105 frontend + 40 backend |
| SWE5 | — | Integration: `isolation.test.mjs` (3), `synthesis.integration.test.ts` (3) |
| SYS3 | — | Full-loop smoke evidence (§3); mic path FALLBACK + HIGH gap |

---

## Self-verification (no-reviews mode)

| Gate | Command (repo root) | Exit | Result |
|------|---------------------|------|--------|
| D1 Lint (mandatory) | `npm --prefix frontend run lint` | 1 (pre-existing) | ✅ 48/14 = baseline, 0 new |
| D2 Typecheck/build | `npm --prefix frontend run build` | 0 | ✅ 0 errors |
| D3 Tests | `npm --prefix frontend run test:voice` | 0 | ✅ 105/105 (incl. SWE5 synthesis) |
| D3 Tests | `npm --prefix backend run test:voice` | 0 | ✅ 40/40 (incl. SWE5 isolation) |
| D4 Smoke through the wiring | dev stack + login + status + synth + prefs + sample + restore + shutdown | 0 | ✅ full backend voice loop live; bundle carries voice UI (grep proof) |
| D5 Self-checklist | — | — | ✅ gap analysis dispositioned every item; two-session isolation FIXED here; ADR-002/003 + no-ADR notes recorded; arch/traceability current; no `any`/`eslint-disable`; credentials only as committed seed defaults (documented); synthetic fixtures only |

Requirement → `file:line` → test → status: SW-REQ-013-02 (helper/bridge/cache/client→105+40 incl. integration) ✅; SW-REQ-013-03 (table/routes/store/isolation) ✅; SW-REQ-013-04-output (circle/copy/guard) ✅.

Wiring chain (verified): header `terminal-cell--voice` → mic button/circle → capture controller → STT → vocab → `runAssistantTurn` → `commitAssistantTurn` → `useVoicePlayback` → `speechText` → `synthesizeVoice` → `/api/voice/synthesize` → bridge → helper → cache → WAV → MP3 → `<audio>` + output circle + replay/volume; prefs: panel → `/api/voice/preferences` → store → guard. Every hop built, tested, bundle-verified; full backend loop smoked live.

Residual risks: HIGH live-mic HW gap; Docker weight staging; autoplay policy on kiosk browser.

Independent review intentionally omitted — TC-B is declared `no-reviews`; gap analysis is inherited by the TC closer (TC-B-04 — this issue).