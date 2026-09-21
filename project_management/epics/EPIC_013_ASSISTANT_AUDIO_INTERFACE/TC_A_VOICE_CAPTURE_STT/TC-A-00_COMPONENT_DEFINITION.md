# TC-A-00: Voice Capture + STT — Component Definition

> **Epic**: E-013 — `project_management/epics/EPIC_013_ASSISTANT_AUDIO_INTERFACE.md`
> **V-Model**: SWE1-A (derived from SYS1-013)
> **Requirements**: [SW-REQ-013-01](../SW-REQ-013-01_VOICE_CAPTURE_STT.md), [SW-REQ-013-04](../SW-REQ-013-04_AUDIO_FEEDBACK_I18N.md) (draft)
> **Review Mode**: no-reviews (impl self-verifies per STEP E-NR; no reviewer is spawned)
> **Status**: 🔄 In Progress
> **Last Updated**: 2026-09-21

---

## Component Goal

Deliver the input half of the voice loop: an always-visible top-bar mic with push-to-talk, shared mic/permission/16 kHz PCM/level foundation, in-process Whisper-tiny STT with vocabulary correction, and transcript submit into the assistant thread flow — so kiosk users never need the keyboard to ask.

## Responsibilities

1. **Shared audio-input foundation** — one `getUserMedia` permission flow, one 16 kHz mono Float32 PCM normalizer (`AudioContext`/`OfflineAudioContext`), one level-meter hook; designed for reuse by Epic 007.
2. **Push-to-talk + STT submit** — top-bar mic button, manual stop + silence auto-stop, Whisper-tiny singleton (`@huggingface/transformers`, vendored model, `local_files_only`), `initial_prompt` + regex post-correction, submit as prompt with thread auto-create.
3. **Input feedback + error UX** — pulsating amplitude circle (input direction), permission/denied/model-missing states via top-bar toast + transcript note, keyboard suppression during voice flow, 4-language copy, mobile top-bar behavior.

## Logging & Observability Allocation (mandatory cross-cutting)

This repo has no central project logger yet (`docs/mvc_architecture.md` does not exist; backend is `server.mjs`, frontend is React). TC-A-01 establishes the precedent: backend voice-adjacent events (if any) log via `console` with `[voice]` prefix + user/session context and never log transcripts, raw audio, or secrets; frontend voice state changes are traceable via explicit state + error copy (no PII in logs). Each issue records logger evidence or a specific tested `N/A — no runtime event` rationale in its completion report. The TC-A closer (TC-A-04) verifies the real wiring and that no unapproved raw-audio/secret logging path exists.

## Integration Points

| Direction | Component | Interface |
|:----------|:----------|:----------|
| **Uses** | Assistant threads (Epic 010) | `frontend/src/api/assistant.ts` — create-thread + send-message; auto-create when none selected |
| **Uses** | Global language (Epic 004) | Board language code → STT language selection |
| **Uses** | Top-bar / app shell | Mic button mount point (desktop + Epic 012 mobile shell) |
| **Provides to** | TC-B playback | Submitted transcript + thread/message IDs; shared level-hook + PCM module reuse |
| **Coordinates with** | Epic 007 audio-visual | Shared mic/permission/PCM/level module (TC-A-01 owns it; 007 reuses, no history merge) |
| **Coordinates with** | Epic 006 keyboard | Focus/keyboard-suppression rule during voice flow (TC-A-03) |

## Runtime Instantiation Map

| Component Class | Instantiated In | Lifecycle Owner | Route / Tool / Export Path |
|:----------------|:----------------|:----------------|:---------------------------|
| `useVoiceCapture` hook (or equivalent) | Top-bar shell component (wired in TC-A-02) | React shell lifecycle (mount/unmount releases mic) | Top-bar mic button → hook → assistant API |
| `normalizeTo16kMono` PCM module | `frontend/src/voice/` (created TC-A-01) | Pure function, no lifecycle | Imported by STT path (TC-A-02) and Epic 007 later |
| `correctTranscript` vocab module | `frontend/src/voice/` (created TC-A-01) | Pure function, no lifecycle | Imported by STT submit path (TC-A-02) |
| Whisper-tiny singleton pipeline | `frontend/src/voice/stt.ts` (created TC-A-02) | Lazy singleton, cached promise | In-process call from capture hook |

> Rules: any class without a row is dead code. TC-A-02 owns "wire mic into top-bar shell" explicitly. The closer (TC-A-04) verifies every row: module exists, importer wires it, route/export path registered.

## Architecture References

| Artifact | Path | Relevance |
|----------|------|-----------|
| Component Overview | `project_management/architecture/diagrams/component-overview.md` | Voice capture position in shell + assistant |
| Data Model | `project_management/architecture/diagrams/data-model.md` | No new tables in TC-A (ephemeral audio only) — closer confirms |
| API Contracts | `project_management/architecture/diagrams/api-contracts.md` | Reused assistant thread/message endpoints |
| Voice Flow | `project_management/architecture/diagrams/flow-assistant-voice.md` | Capture→STT→submit sequence (closer populates) |
| Logging & Observability | `docs/mvc_architecture.md` | Does not exist — TC-A-01 documents precedent instead |

## Key Files

| Action | File | Purpose |
|:-------|:-----|:--------|
| Create | `frontend/src/voice/audioInput.ts` | Permission flow + 16 kHz PCM normalizer + level hook (TC-A-01) |
| Create | `frontend/src/voice/vocabulary.ts` | `initial_prompt` builder + post-correction regex list (TC-A-01) |
| Create | `frontend/src/voice/stt.ts` | Whisper-tiny singleton + transcribe entry (TC-A-02) |
| Create | `frontend/src/voice/VoiceMicButton.tsx` | Top-bar mic + states (TC-A-02) |
| Create | `frontend/src/voice/InputLevelCircle.tsx` | Pulsating input circle (TC-A-03) |
| Update | Top-bar shell component | Mount mic button (TC-A-02) |
| Update | `frontend/src/widgets/assistant/AssistantDetailPanel.tsx` | Voice submit path + error notes (TC-A-02/03) |
| Update | `frontend/src/i18n/*` + assistant translations | 4-language voice copy (TC-A-03) |

## Issues

| Issue | Title | Type | V-Model | Priority | Effort | Status |
|:------|:------|:-----|:--------|:---------|:-------|:-------|
| [TC-A-01](TC-A-01_SHARED_MIC_PCM_PERMISSION_LEVEL_FOUNDATION.md) | Shared mic/PCM/permission/level foundation + tooling gate | 🔨 Impl | SWE3-A-01 | P0-Critical | M | ✅ |
| [TC-A-02](TC-A-02_PUSH_TO_TALK_STT_SUBMIT.md) | Push-to-talk STT submit with thread auto-create | 🔨 Impl | SWE3-A-02 | P0-Critical | L | ✅ |
| [TC-A-03](TC-A-03_INPUT_CIRCLE_ERRORS_KEYBOARD_I18N.md) | Input circle, errors, keyboard suppression, i18n, mobile | 🔨 Impl | SWE3-A-03 | P1-High | M | ✅ |
| [TC-A-04](TC-A-04_CAPTURE_CLOSER_INTEGRATION_SMOKE.md) | TC-A closer: integration, arch/traceability, SYS3 smoke | 🔨 Impl | SWE3-A-04 | P1-High | M | 🔲 |

> No SWE5 review issues (no-reviews variant). TC-A-04 is the closer and inherits review/docs duties.

## Acceptance Test Plan (SWE6)

| # | Acceptance Criterion | Test Type | Gate |
|---|---------------------|-----------|------|
| 1 | Tap mic → speak → tap stop submits transcript as assistant prompt (auto-creates thread if none) | Integration | 🔴 |
| 2 | Silence auto-stop closes an open mic without manual tap | Integration | 🔴 |
| 3 | Domain words (Swaibian/scaiCo/Bring/Roborock) transcribe with correct spelling | Unit | 🔴 |
| 4 | Mic denied / model missing fails closed with toast + transcript note, never silent | Integration | 🔴 |
| 5 | `npm --prefix frontend run build` + `npm --prefix frontend run lint` clean; no raw audio persisted | Unit/Build | 🔴 |

## Decisions Log

| Date | Decision | Rationale | ADR |
|:-----|:---------|:----------|:----|
| 2026-09-21 | TC-A owns the shared mic/PCM/level module; Epic 007 reuses it | Avoid duplicate getUserMedia paths (brief §6) | — (closer proposes ADR if warranted) |
| 2026-09-21 | Unit tests via `tsc` + `node --test` (`test:voice`), output to git-ignored `/voice-test-dist` | No repo test runner; zero new deps; 31 tests green | — |
| 2026-09-21 | `tsconfig.app.json` excludes `src/voice/__tests__` | Test files need node types; app scope is `vite/client` only | — |
| 2026-09-21 | Bare "bring" never auto-corrected | Common German verb; only unambiguous manglings repaired | — |
| 2026-09-21 | One turn runner for typed + voice prompts (`runAssistantTurn`) | No duplicated turn logic to drift (TC-A-02 refactor) | — |
| 2026-09-21 | Model binaries not vendored in TC-A-02; `initial_prompt` deferred | v4.3.0 lacks the option; distribution is TC-B-01's decision | — (closer proposes ADRs) |
| 2026-09-21 | No toast framework; header-inline status note + transcript note | Only widget-local toast exists; framework would be scope creep | — |
| 2026-09-21 | Mic cell persists outside collapsible mobile filters | Collapse hid the mic; `terminal-cell--voice` never collapses | — |
| 2026-09-21 | Circle self-animates; keyboard suppression via ref | No App re-render storm; focusin-only gate, idle behavior identical | — |

## Architecture Documentation Revisions

| Date | Issue | Changes Made |
|------|-------|-------------|
| — | TC-A-04 | (closer populates: voice flow diagram, component overview entries, traceability rows) |

---

*Shared context document — read before starting any TC-A issue, update after completing each one.*
