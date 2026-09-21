# Epic 013: Assistant Audio Interface (Voice STT/TTS)

**ID**: E-013
**V-Model**: SYS1-013
**Status**: 🔲 Planning
**Priority**: P1-High
**Created**: 2026-09-21
**Last Updated**: 2026-09-21

> Discovery: `project_management/epics/EPIC_013_ASSISTANT_AUDIO_INTERFACE/DISCOVERY_BRIEF.md`
> Tech reference (normative): `project_management/ideas/audio-interface/audio_interface_documentation.md`
> Stack note: this repo is `frontend/` (React 19 + Vite + TS) + `backend/server.mjs` (Node + SQLite, cookie-session auth). There are no `src/model`, `src/controller`, `src/view` Django/FastAPI paths and no `make test-model / test-controller / build-view` targets — gates below are adapted to the real repo (`npm --prefix frontend run build`, `npm --prefix frontend run lint`, `npm --prefix backend start`).

---

## Vision

Turn the assistant widget from a typing-only feature into a kiosk-natural voice companion: tap the always-visible top-bar mic, speak, hear the answer read back — fully local and offline, with clear pulsating feedback that the user is being heard.

## Goals

1. Push-to-talk voice input in the top bar submits transcripts as assistant prompts (auto-creating a thread when none is selected), with silence auto-stop and domain-vocabulary correction.
2. Assistant answers autoplay as local speech (Supertonic-3 bridge) with volume control and per-message replay, chunked and cached for low repeat latency.
3. Per-user voice preferences (TTS on/off, voice preset M1–M5/F1–F5, volume) with sample playback, persisted behind cookie-session auth; speech language follows the global board language (en/de/fr/es).
4. No cloud, no API keys, no inference-time network; mic only on explicit tap; raw audio never persisted; all new endpoints per-user isolated.

## Scope

### In Scope
- Top-bar mic (authenticated shell, desktop + mobile), push-to-talk + silence auto-stop (timer + energy threshold; no wake-word, no streaming).
- Frontend in-process STT (`@huggingface/transformers` + vendored `Xenova/whisper-tiny` quantized ONNX, 16 kHz mono PCM singleton, `initial_prompt` + regex post-correction, ephemeral buffers).
- TTS bridge (Supertonic-3 `supertonic==1.3.1` Python helper/sidecar, Bring/Roborock precedent, one-JSON-on-stdout, timeout TERM→KILL), status probe, WAV→MP3 (`@breezystack/lamejs`, 64 kbps mono), markdown→plain-text + 2–5 sentence chunking, disk cache keyed text+voice+language.
- Playback UX: autoplay, volume, per-message replay, interrupt on mic/replay tap, pulsating amplitude circle both directions.
- Voice section in assistant settings (toggle, preset grid + samples, volume), per-user backend persistence.
- 4-language UI copy (en/de/fr/es); STT/TTS language = board language (`na` fallback).
- Shared mic/permission/PCM/level module reused with Epic 007 (no history merge); keyboard-focus suppression during voice flow (Epic 006 conflict resolved).

### Out of Scope
- Wake-word / always-listening, streaming STT/TTS, Silero-class VAD (follow-up), voice cloning / custom voice import, file-upload transcription.
- Epic 007 family recording history, new LLM backends/routes, MCP tool changes (Epic 011).
- Strict installer build-gate (model checksum + offline synthesis gate) — deferred follow-up; closer issues document the gap.

## Requirements (SYS1)

> No formal REQ/SW-REQ files exist in this repo yet. The SW-REQs below are defined by this epic and written by the owning TC's first issue.

| Requirement | Title | V-Model | Link |
|:------------|:------|:--------|:-----|
| SW-REQ-013-01 | Voice capture + push-to-talk + STT submit | SWE1 | TBD — written by TC-A-01 (`TC_A_VOICE_CAPTURE_STT/`) |
| SW-REQ-013-02 | Local TTS synthesis + autoplay/replay playback | SWE1 | TBD — written by TC-B-01 (`TC_B_VOICE_SYNTHESIS_PLAYBACK/`) |
| SW-REQ-013-03 | Per-user voice preferences (toggle/voice/volume) | SWE1 | TBD — written by TC-B-01 |
| SW-REQ-013-04 | Audio feedback circle, error states, 4-language copy | SWE1 | TBD — written by TC-A-01 / TC-B-01 |

## System Architecture (SYS2)

> Detailed diagrams live in `project_management/architecture/diagrams/` (scaffolded in §C; populated by each TC's last implementation issue).

### Key Architectural Decisions
| Decision | Choice | Rationale | ADR |
|----------|--------|-----------|-----|
| STT runtime | Frontend in-process Whisper-tiny ONNX singleton | Offline, no keys, ~40 MB, CPU real-time-ish | none yet (TC-A closer proposes ADR) |
| TTS runtime | Python helper/sidecar bridge (Bring/Roborock precedent) | Supertonic-3 is Python/ONNX; isolates CPU work off UI thread | none yet (TC-B closer proposes ADR) |
| Voice prefs storage | Per-user backend records, cookie-session auth | Matches Epic 003/010 ownership model | none yet (TC-B closer proposes ADR) |
| Model distribution | Vendored bundle preferred; lazy load + disk cache | Offline-by-construction; ~440 MB size tradeoff open | none yet (TC-B closer records decision/gap) |

### Component Interaction
```
Top-bar mic ──► shared mic/PCM/level module ──► Whisper-tiny (frontend) ──► vocab correction ──► assistant thread submit (auto-create)
Assistant transcript ──► markdown→text + chunking ──► TTS helper (Python) ──► WAV→MP3 ──► cache ──► autoplay/volume/replay + output circle
Assistant settings ──► voice prefs API (per-user) ──► voice toggle/preset/volume + samples
```
(see `project_management/architecture/diagrams/flow-assistant-voice.md`)

## Technical Components

| TC | Name | V-Model | Issues | Review Issues | Status |
|:---|:-----|:--------|:-------|:--------------|:-------|
| TC-A | Voice Capture + STT | SWE1-A | 4 (TC-A-01…04) | none (no-reviews; TC-A-04 is closer) | ✅ |
| TC-B | Voice Synthesis + Playback + Prefs | SWE1-B | 4 (TC-B-01…04) | none (no-reviews; TC-B-04 is closer) | ✅ |

## Test Plan

| V-Level | Test Type | Scope | Gate | Notes |
|---------|-----------|-------|------|-------|
| SWE4 | Unit tests | Every issue (PCM, correction, markdown-strip, cache-key, prefs validation) | 🔴 MANDATORY | Repo has no test runner yet — TC-A-01 establishes baseline + approach; 0 failures |
| SWE4-BUILD | Typecheck | Every issue: `npm --prefix frontend run build` (`tsc -b`) | 🔴 MANDATORY | 0 new errors vs Task 0.2 baseline |
| SWE4-LINT | Lint | `npm --prefix frontend run lint` (eslint) — 🟢 ADVISORY on TC-X-01, 🔴 MANDATORY from TC-X-02 | 🟢→🔴 | First issue may bootstrap config |
| SWE5 | Integration tests | Each TC's last issue (mic→submit, prefs isolation, synth→playback) | 🔴 MANDATORY (on closer) | No SWE5 review issues in this epic |
| SWE6 | TC acceptance | TC completion | 🟡 CONDITIONAL | Acceptance plan in each TC-00 |
| SYS3 | Runtime smoke | Each TC's last issue: start stack (`npm --prefix backend run dev` + `npm --prefix frontend run dev`), trigger feature, verify output (or documented hardware fallback when no mic) | 🔴 MANDATORY (on closer) | Kiosk mic/speakers assumed; fallback UX when `getUserMedia` unavailable |

## Dependencies

- Epic 010 (assistant threads/composer/settings — direct parent; read `frontend/src/widgets/assistant/`, `frontend/src/api/assistant.ts`, `backend/server.mjs` assistant routes)
- Epic 007 (mic/permission/level overlap — share one module; coordinate ordering)
- Epic 006 (keyboard auto-open vs voice focus — suppression rule)
- Epic 004 (4-language copy contract), Epic 003 (cookie-session per-user scoping), Epic 012 (mobile top-bar)
- Epics 008/009 (Python sidecar precedent); npm: `@huggingface/transformers`, `@breezystack/lamejs`; PyPI: `supertonic==1.3.1`; HF: `Xenova/whisper-tiny`, `Supertone/supertonic-3`

## Risks

| Risk | Impact | Mitigation |
|:-----|:-------|:-----------|
| ~440 MB model weight distribution (Supertonic-3 + Whisper) | Installer size, first-load delay, deploy friction | Lazy singleton, disk cache (7d/500 MB guidance), chunked synthesis; TC-B records bundle-vs-staged decision; build-gate deferred as documented gap |
| Whisper-tiny accuracy (accents, jargon, noise) | Mis-transcription | `initial_prompt` + shared post-correction module; short-clip single pass; 5-min mic cap |
| Keyboard overlay clash on voice submit focus | Jarring kiosk UX | Explicit focus/keyboard-suppression rule owned by TC-A-03 |
| Duplicate mic paths with Epic 007 | Two `getUserMedia`/PCM implementations | One shared module owned by TC-A-01; Epic 007 reuses it |
| No test runner in repo | Weak SWE4 enforcement | TC-A-01 tooling gate establishes baseline (build+lint clean, unit approach for pure modules) before handoff |
| No kiosk mic/speakers on target hardware | Feature unrunnable | Fallback UX (disabled mic with explanatory copy) + SYS3 smoke documents hardware fallback path |

## §9 V-Model & Review Mode

**Review Mode**: no-reviews

This epic runs **without SWE5 review issues** — every issue created is a SWE3 implementation issue. There is no batch-of-5 cycle. Review duties move to each TC's last implementation issue (the closer), which — as far as its scope allows — owns: gap analysis over its TC's issues, architecture/traceability updates (diagrams, ADRs, requirements-matrix), integration tests, and the SYS3 runtime smoke (start the stack, trigger the feature, verify output).

Execution runs with `swaibian-impl-no-reviews` (or `swaibian-impl`, which self-detects the `**Review Mode**: no-reviews` marker in each TC-00 header): every issue self-verifies per STEP E-NR, and `swaibian-review` is never spawned.

Traceability chain for this epic:
```
SYS1-013 (this epic)
  └→ SWE1-A (TC-A) → SWE3-A-01…04 → SWE4 (unit) ; closer adds SWE5 (integration) + SWE2 (arch) + SYS3 (smoke)
  └→ SWE1-B (TC-B) → SWE3-B-01…04 → SWE4 (unit) ; closer adds SWE5 (integration) + SWE2 (arch) + SYS3 (smoke)
```
