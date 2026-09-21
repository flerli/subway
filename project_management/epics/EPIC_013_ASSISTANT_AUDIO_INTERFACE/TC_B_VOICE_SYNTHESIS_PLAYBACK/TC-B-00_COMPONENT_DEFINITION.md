# TC-B-00: Voice Synthesis + Playback + Prefs — Component Definition

> **Epic**: E-013 — `project_management/epics/EPIC_013_ASSISTANT_AUDIO_INTERFACE.md`
> **V-Model**: SWE1-B (derived from SYS1-013)
> **Requirements**: SW-REQ-013-02 (local TTS synthesis + autoplay/replay), SW-REQ-013-03 (per-user voice prefs), SW-REQ-013-04 (output circle, errors, 4-language copy — output half)
> **Review Mode**: no-reviews (impl self-verifies per STEP E-NR; no reviewer is spawned)
> **Status**: ✅ Complete
> **Last Updated**: 2026-09-21

---

## Component Goal

Deliver the output half of the voice loop: local Supertonic-3 speech synthesis behind a sidecar/helper bridge, markdown-aware chunked playback with volume and replay, per-user voice preferences with sample playback in the assistant settings — so every assistant answer can be heard, tuned, and trusted.

## Responsibilities

1. **TTS synthesis bridge** — Python helper/sidecar (`supertonic==1.3.1`, one-JSON-on-stdout, timeout TERM→KILL), readiness probe, WAV→MP3 (`@breezystack/lamejs`, 64 kbps mono), disk cache keyed text+voice+language with age/size eviction.
2. **Playback UX** — markdown→plain-text stripping, 2–5 sentence chunking, autoplay on new assistant messages (when enabled), volume control, per-message replay, interrupt on mic/replay tap, output-level pulsating circle.
3. **Per-user voice prefs** — backend records (voice id, TTS enabled, volume) behind cookie-session auth with denial + isolation tests; assistant settings voice section (toggle, preset grid M1–M5/F1–F5 + `na`, sample playback, volume); 4-language copy; license attributions shipped (Whisper Apache-2.0 + NOTICE, supertonic MIT, weights OpenRAIL-M, lamejs MIT).

## Logging & Observability Allocation (mandatory cross-cutting)

Follows the TC-A-01 precedent: backend TTS/prefs events log `[voice]`-prefixed with user/session context; never log prompts, message content, transcripts, audio bytes, or secrets. Frontend playback state is UI-traceable. Each issue records logger evidence or a specific tested `N/A` rationale. The TC-B closer (TC-B-04) verifies the wiring and the no-secret/no-audio logging contract, including the helper process's stdout discipline (JSON only, never traceback/audio bytes on stdout).

## Integration Points

| Direction | Component | Interface |
|:----------|:----------|:----------|
| **Uses** | TC-A capture | Submitted transcripts + thread/message IDs; shared visual language for circles |
| **Uses** | Assistant transcript (Epic 010-005) | `AssistantMarkdown` content as TTS source (stripped to plain text) |
| **Uses** | Assistant settings (Epic 010-007) | Voice section mount point in `AssistantSettingsPanel` |
| **Uses** | Global language (Epic 004) | TTS language = board language, `na` fallback |
| **Uses** | Bring/Roborock sidecar precedent (Epics 008/009) | Helper-process spawning, timeout, buffered-output caps |
| **Provides to** | Kiosk user | Audible answers + replay + volume + voice choice |

## Runtime Instantiation Map

| Component Class | Instantiated In | Lifecycle Owner | Route / Tool / Export Path |
|:----------------|:----------------|:----------------|:---------------------------|
| TTS helper process (`tts_helper.py` or sidecar) | Spawned by backend on synthesize call (TC-B-01) | Backend request lifecycle (timeout TERM→KILL) | Backend `/api/voice/*` routes (TC-B-01/03) |
| Voice prefs store (SQLite table or settings record) | `backend/server.mjs` voice routes (TC-B-03) | Backend process, per-user rows | `GET/PUT /api/voice/preferences`, sample audio route |
| `useVoicePlayback` hook | Assistant transcript (TC-B-02) | React component lifecycle (interrupt on unmount) | Transcript message → hook → `<audio>`/WebAudio |
| `markdownToSpeechText` + chunker | `frontend/src/voice/` (TC-B-02) | Pure functions | Imported by playback hook |

> Rules: any class without a row is dead code. TC-B-01 owns "backend spawns helper" and TC-B-02 owns "transcript wires playback" explicitly. The closer (TC-B-04) verifies every row.

## Architecture References

| Artifact | Path | Relevance |
|----------|------|-----------|
| Component Overview | `project_management/architecture/diagrams/component-overview.md` | TTS bridge + prefs + playback position |
| Data Model | `project_management/architecture/diagrams/data-model.md` | Voice prefs storage (TC-B-03) |
| API Contracts | `project_management/architecture/diagrams/api-contracts.md` | New `/api/voice/*` endpoints (TC-B-01/03) |
| Voice Flow | `project_management/architecture/diagrams/flow-assistant-voice.md` | Synthesis→playback sequence (closer populates) |

## Key Files

| Action | File | Purpose |
|:-------|:-----|:--------|
| Create | `backend/tts_helper/tts_helper.py` (or `backend/voice_bridge/`) | Supertonic-3 helper CLI (TC-B-01) |
| Create/Update | `backend/server.mjs` | `/api/voice/*` routes: status, synthesize, prefs, samples (TC-B-01/03) |
| Create | `frontend/src/voice/tts.ts` | Frontend TTS client + cache-key conventions (TC-B-01) |
| Create | `frontend/src/voice/speechText.ts` | Markdown-strip + chunker (TC-B-02) |
| Create | `frontend/src/voice/useVoicePlayback.ts` | Autoplay/volume/replay hook (TC-B-02) |
| Create | `frontend/src/voice/OutputLevelCircle.tsx` | Output-direction circle (TC-B-02) |
| Update | `frontend/src/widgets/assistant/AssistantDetailPanel.tsx` | Autoplay + replay wiring (TC-B-02) |
| Update | `frontend/src/widgets/assistant/AssistantSettingsPanel.tsx` | Voice section (TC-B-03) |
| Update | `frontend/src/i18n/*` + assistant translations | 4-language voice-output copy (TC-B-02/03) |

## Issues

| Issue | Title | Type | V-Model | Priority | Effort | Status |
|:------|:------|:-----|:--------|:---------|:-------|:-------|
| [TC-B-01](TC-B-01_TTS_BRIDGE_CACHE_FOUNDATION.md) | TTS bridge + WAV→MP3 + cache foundation | 🔨 Impl | SWE3-B-01 | P0-Critical | L | ✅ |
| [TC-B-02](TC-B-02_AUTOPLAY_CHUNKING_PLAYBACK.md) | Autoplay/chunking/playback + output circle | 🔨 Impl | SWE3-B-02 | P0-Critical | L | ✅ |
| [TC-B-02](TC-B-02_AUTOPLAY_CHUNKING_PLAYBACK.md) | Autoplay/chunking/playback + output circle | 🔨 Impl | SWE3-B-02 | P0-Critical | L | 🔲 |
| [TC-B-03](TC-B-03_VOICE_PREFS_SETTINGS.md) | Per-user voice prefs API + settings voice section | 🔨 Impl | SWE3-B-03 | P1-High | M | ✅ |
| [TC-B-04](TC-B-04_SYNTHESIS_CLOSER_INTEGRATION_SMOKE.md) | TC-B closer: integration, arch/traceability, SYS3 smoke | 🔨 Impl | SWE3-B-04 | P1-High | M | ✅ |

> No SWE5 review issues (no-reviews variant). TC-B-04 is the closer and inherits review/docs duties.

## Acceptance Test Plan (SWE6)

| # | Acceptance Criterion | Test Type | Gate |
|---|---------------------|-----------|------|
| 1 | New assistant answer autoplays as speech when voice enabled; replay replays; volume applies | Integration | 🔴 |
| 2 | Code fences/tables never read aloud (markdown stripped); long answers chunked 2–5 sentences | Unit | 🔴 |
| 3 | Voice prefs persist per user; user B cannot read/write user A's prefs (denial + isolation) | Integration | 🔴 |
| 4 | TTS unavailable fails closed with copy; helper stdout is JSON-only | Integration/Unit | 🔴 |
| 5 | Build + lint clean; cache key includes text+voice+language; licenses/attributions shipped | Unit/Build | 🔴 |

## Decisions Log

| Date | Decision | Rationale | ADR |
|:-----|:---------|:----------|:----|
| 2026-09-21 | TTS via Python helper/sidecar, not browser-only | Supertonic-3 is Python/ONNX; Bring/Roborock precedent (brief §4) | — (closer proposes ADR) |
| 2026-09-21 | Preset voices only (M1–M5/F1–F5), no custom import in V1 | Scope control (brief §8) | — |
| 2026-09-21 | Backend image now stages the TTS engine itself: Debian base (glibc for onnxruntime), python venv with `supertonic==1.3.1`, weights via `backend/scripts/fetch-tts-models.py` into `/app/tts-models`, `TTS_MODEL_DIR`/`TTS_PYTHON_BIN` set at image build | Post-completion fix: the VPS backend had no python/weights → `/api/voice/status` unavailable → replay died silently. Runtime stays offline-by-construction; `SUPERTONIC_MODEL_HOST` mirrors the 380 MB build-time download | — (closer proposes ADR) |
| 2026-09-21 | Frontend replay: `player.duration` assignment removed from the `PlayableAudio` contract (getter-only wrapper → TypeError killed every replay); synthesis failures now surface as localized copy + `[voice]` warn | Post-completion fix (TC-B-02 report): real-browser proof; `onError`/fail-closed copy per SW-REQ-013-04 | — |

## Architecture Documentation Revisions

| Date | Issue | Changes Made |
|------|-------|-------------|
| 2026-09-21 | SWE3-A-04 | Capture flow populated; component/API/data-model entries real; requirements-matrix + coverage-map TC-A rows ✅; README changelog; ADR-001 accepted |
| 2026-09-21 | SWE3-B-04 | Synthesis/playback/prefs flow populated; `voice_preferences` data-model real; `/api/voice/*` signatures real; traceability ✅ (all E-013 SW-REQs); ADR-002/003 accepted |

---

*Shared context document — read before starting any TC-B issue, update after completing each one.*
