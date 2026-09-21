# Subway Architecture

> Living architecture overview. Every implementation issue reads this at Task 0.0; each TC's last implementation issue updates it.
> `Last updated by: SWE3-B-04` (2026-09-21, TC-B closer: synthesis/playback/prefs flow + data-model + API real, ADR-002/003 accepted)

## 1. Purpose

Subway is a portrait-first family smart-home kiosk UI (dark transit-inspired visual language) on a 27" 4K display: family arrival board, weather, calendar, todos, shopping (Bring), vacuum (Roborock), and an AI assistant section — all behind cookie-session auth with per-user data scoping. This document indexes the system's components, data model, API contracts, key flows, decisions, and traceability.

## 2. Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| View | React 19 + Vite + TypeScript (`frontend/`) | `npm --prefix frontend run build` (`tsc -b && vite build`), `run lint` (eslint), `run dev` (5173, proxies `/api` → 8787) |
| Controller | Node + `backend/server.mjs` + SQLite (`backend/data/subway.sqlite`) | `npm --prefix backend run dev` / `start`; cookie sessions; `GET /api/auth/session` public, other `/api/*` authenticated |
| Bridges | Python sidecars (`backend/bring_sidecar`, `backend/roborock_sidecar`; `backend/tts_helper` planned E-013) | Per-user encrypted credentials/sessions; spawned-helper pattern with timeouts |
| Voice (E-013) | Whisper-tiny ONNX (`@huggingface/transformers`, frontend) + Supertonic-3 (`supertonic==1.3.1`, Python) + `@breezystack/lamejs` | Fully local/offline; models: `Xenova/whisper-tiny`, `Supertone/supertonic-3` |
| i18n | 4-language contract (en/de/fr/es) | Per-user global language; widget translation standard (Epic 004) |
| Deploy | Docker Compose (app :8081) + GH Actions → VPS + shared Nginx | Named volume `subway_subway-data`; see README.md |

> Skill-stack note: the swaibian-vmodel skill assumes Django/FastAPI/`src/*` + `make` targets; this repo uses Node/React above. Gates are adapted per epic (build/lint/boot + issue-level unit/integration tests).

## 3. System Architecture

See [component-overview.md](diagrams/component-overview.md) — system components (shell, widgets, assistant, bridges, voice loop) and their interfaces.

## 4. Data Model

See [data-model.md](diagrams/data-model.md) — SQLite tables (users, sessions, widget metadata/settings, assistant threads/messages/routes, voice prefs planned E-013).

## 5. API Contracts

See [api-contracts.md](diagrams/api-contracts.md) — `/api/*` endpoint sequences (auth, widgets, assistant, voice planned E-013).

## 6. Key Flows

- [flow-assistant-voice.md](diagrams/flow-assistant-voice.md) — E-013 voice loop: mic → STT → submit → answer → TTS → playback (stubs; populated by TC-A-04 / TC-B-04).
- (Future flows added by later epics/closers.)

## 7. Architecture Decisions

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [ADR-001](decisions/ADR-001-local-stt-shared-pcm.md) | Local STT singleton + shared PCM module | Accepted | 2026-09-21 |
| [ADR-002](decisions/ADR-002-tts-bridge-cache.md) | Supertonic-3 TTS bridge + per-user keyed cache | Accepted | 2026-09-21 |
| [ADR-003](decisions/ADR-003-voice-prefs-store.md) | Per-user voice preferences — table + live store | Accepted | 2026-09-21 |

## 8. Traceability

- [requirements-matrix.md](traceability/requirements-matrix.md) — SYS1 → SWE1 → SWE3 → SWE4/SWE5 mapping (headers; rows populated by TC closers).
- [coverage-map.md](traceability/coverage-map.md) — requirements → test coverage summary (populated by TC closers).

## 9. Change Log

| Date | Issue | Change |
|------|-------|--------|
| 2026-09-21 | swaibian-architect-no-reviews (E-013) | Initial scaffold: README, diagram stubs, traceability headers, decisions folder |
| 2026-09-21 | SWE3-A-04 | TC-A close: capture flow populated, component/API entries real, traceability ✅ for SW-REQ-013-01/04-input, ADR-001 accepted |
| 2026-09-21 | SWE3-B-04 | TC-B close: synthesis/playback/prefs flow, `voice_preferences` in data-model, `/api/voice/*` signatures real, traceability ✅ (all E-013 SW-REQs), ADR-002/003 accepted |
