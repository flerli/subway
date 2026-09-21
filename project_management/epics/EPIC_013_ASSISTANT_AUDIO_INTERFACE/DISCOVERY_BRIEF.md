# Discovery Brief: Assistant Audio Interface (Voice STT/TTS)

**Date**: 2026-09-21
**Participants**: User (flerlage) + swaibian-discovery agent
**Status**: ✅ Ready for Architecture

> Stack note for architect: this repo is `frontend/` (React 19 + Vite + TS) + `backend/server.mjs` (Node + SQLite, cookie-session auth). It does NOT use the skill's assumed `src/model` (Django) / `src/controller` (FastAPI) / `src/view` layout. No `api_key_auth.py` / `mcp_auth.py` exist. Auth = cookie session via `GET /api/auth/session` (public) + all other `/api/*` authenticated + per-user data scoping (Epic 003). Brief is written against the real stack.

---

## 1. Problem Statement

The assistant widget is text-only on a portrait kiosk (27" 4K) where typing — even with the global software keyboard (Epic 006) — is slow and awkward. Household members want to tap a mic, speak naturally, and hear the answer read back, with clear feedback that they are being heard. Without this, the assistant stays a sit-down typing feature instead of a kiosk-natural voice companion. Fully local/offline speech is mandated (no cloud STT/TTS, no API keys, no inference-time network) per `project_management/ideas/audio-interface/audio_interface_documentation.md`.

## 2. Agreed Scope

### In Scope
- Top-bar mic button, always visible when authenticated; push-to-talk V1: tap to start listening, speak, tap again (manual stop) to submit transcript as assistant prompt.
- Silence auto-stop after MVP push-to-talk (timer + energy threshold now; Silero-VAD-class upgrade later, no wake-word).
- Frontend in-process STT: `@huggingface/transformers` + vendored `Xenova/whisper-tiny` quantized ONNX, 16 kHz mono PCM contract (`getUserMedia` → `decodeAudioData` → `OfflineAudioContext` resample/downmix), singleton lazy pipeline, `local_files_only` / bundled model.
- Domain-vocabulary bias: Whisper `initial_prompt` + shared deterministic post-correction regex module (Swaibian, scaiCo, Bring, Roborock, …).
- TTS via Supertonic-3 (`supertonic==1.3.1` Python bridge, sidecar/helper pattern like Bring/Roborock): 44.1 kHz WAV → MP3 via `@breezystack/lamejs` (64 kbps mono), markdown→plain-text stripping + 2–5 sentence chunking, disk cache keyed on text+voice+language.
- Autoplay assistant answers when voice enabled; volume control; replay button per assistant message.
- Voice settings inside existing assistant settings panel: TTS on/off, voice preset (M1–M5/F1–F5 + `na` fallback), per-voice sample playback, volume; persisted per-user.
- Pulsating amplitude circle (gradients, both directions: mic input level + TTS output level) as hearing/understood feedback.
- STT/TTS language follows global board language (en/de/fr/es, Epic 004); 4-language UI copy for all new strings.
- No-thread-selected behavior: mic auto-creates a thread then submits.
- Interrupt: tapping mic/replay stops autoplay; errors via top-bar toast + transcript note.

### Out of Scope
- Wake-word / hands-free always-listening; streaming STT/TTS; voice activity beyond simple silence timeout in V1.
- File-upload transcription; Epic 007 family recording history integration (reuse mic/permission/PCM code only, no shared history).
- New assistant backends, new LLM routes, MCP tool changes (Epic 011 untouched).
- Voice cloning / custom Voice Builder imports (preset voices only in V1).
- Strict installer build-gate (checksum verification + offline synthesis gate) — deferred to architect/follow-up (see §8.5).

### Open Questions (unresolved)
- Kiosk hardware: mic/speaker availability on target 27" panel — assumed present; architect to confirm fallback UX when `getUserMedia` unavailable.
- Supertonic-3 ~400 MB weight bundling vs lazy first-run download: installer-size decision deferred to architect (offline-by-construction preferred).
- Exact top-bar placement + circle visual design: no mockup; architect/implementer to propose within transit visual language.

## 3. User Stories / Use Cases

| # | As a... | I want to... | So that... | Priority |
|---|---------|-------------|------------|----------|
| 1 | Household member at kiosk | Tap top-bar mic, speak, tap to stop and submit | I don't need the keyboard to ask the assistant | P0 |
| 2 | Household member | Hear the assistant answer read aloud automatically with volume + replay | I can listen hands-free | P0 |
| 3 | Household member | See a pulsating circle react to my voice and to playback | I know I'm being heard | P0 |
| 4 | Per-user owner | Choose a voice, hear a sample, set volume in assistant settings | Answers sound the way I like | P0 |
| 5 | German/French/Spanish speaker | Have speech follow the board language automatically | I speak my own language | P1 |
| 6 | Privacy-aware user | Mic only activates on explicit tap, raw audio never persisted | I trust the kiosk | P0 |

## 4. Technology Decisions

| Decision | Choice | Rationale | Alternatives Considered |
|---|---|---|---|
| STT engine | Whisper-tiny quantized ONNX via `@huggingface/transformers`, in-process frontend, singleton pipeline | Mandated by tech doc; offline, no keys, ~40 MB, real-time-ish on CPU | `base/small` (better accuracy, too big); `openai-whisper` Python + ffmpeg (heavier, legacy/scripts only); cloud STT (rejected: privacy/keys) |
| PCM contract | Shared 16 kHz mono Float32 normalizer (mic + future file paths + tests) | Whisper requirement; one module reused with Epic 007 | Per-call ad-hoc resample (rejected: duplication) |
| Vocabulary accuracy | `initial_prompt` bias + ordered regex post-correction module | Cheap, testable, fixes tiny-model proper-noun errors | Larger model only (rejected: size) |
| TTS engine | Supertonic-3 via `supertonic==1.3.1` Python helper/sidecar (Bring/Roborock precedent), one-JSON-on-stdout contract, timeout TERM→KILL | Mandated by tech doc; 99M params, CPU ONNX, 31 langs + `na`, 10 presets, RTF ≈ 0.2 | Browser-only WASM TTS (rejected: not in doc, voice parity); cloud TTS (rejected) |
| Codec | WAV parse in-process + `@breezystack/lamejs` MP3 64 kbps mono, `data:audio/mpeg` | No ffmpeg/native deps on playback path | Raw WAV persistence (rejected: 10× size) |
| Settings persistence | Per-user backend records (like assistant routes), cookie-session auth | Matches Epic 003/010 ownership model | localStorage only (rejected: not per-user durable) |
| Language routing | STT/TTS lang = global board language; TTS `na` fallback when unknown | Agreed in Q&A; Epic 004 contract | Per-thread language picker (deferred) |

## 5. UI / UX Requirements

- **Layout**: Mic button in top bar, always visible when authenticated (desktop board + mobile shell per Epic 012). Pulsating circle adjacent to mic and/or in assistant transcript during playback; exact visuals to match transit dark language (no mockup supplied).
- **Key interactions**:
  1. Tap mic → permission check (reuse Epic 007 flow) → listening state + input-level circle → tap again (or silence timeout) → STT → transcript fills/submits as prompt (auto-create thread if none) → streaming/complete response → markdown→plain-text → chunked TTS → autoplay with output-level circle → volume/replay available; tap mic or replay interrupts playback.
  2. Settings: assistant settings panel → voice section → TTS toggle, voice preset grid with sample-play per voice, volume slider; saved per user.
  3. Errors: mic denied / model missing / TTS unavailable → top-bar toast + transcript note, fail closed ("reinstall/repair runtime"), never silent.
- **Accessibility**: visible listening/playing states, keyboard-operable mic button, aria labels in 4 languages, no audio-only signaling.
- **Responsive**: portrait kiosk primary; mobile narrow-viewport behavior per Epic 012 (touch-sized controls, permission UX differences).

## 6. Constraints & Risks

| Type | Description | Impact | Mitigation |
|---|---|---|---|
| Technical | Supertonic-3 weights ~400 MB + Whisper ~40 MB inflate installer/bundle | Deploy size, first-load delay | Lazy singleton load, disk cache (7d/500 MB guidance from doc), chunked synthesis; architect to decide bundle vs staged download |
| Technical | Whisper-tiny weak on accents/jargon/noise | Mis-transcription | initial_prompt + post-correction module; short-clip single-pass; cap (e.g. 5 min mic) |
| Technical | Global keyboard auto-opens on textarea focus (Epic 006) may clash with voice submit focus | Jarring overlay during voice flow | Architect to define focus/keyboard suppression during mic flow |
| Technical | Mic/level code overlaps Epic 007 (planned, not implemented) | Duplicate getUserMedia paths | Shared PCM/permission/level module; coordinate ordering with Epic 007 |
| Security | Mic/audio is sensitive; raw audio must not leak or persist | Privacy breach, cross-user exposure | Explicit-tap only; ephemeral buffers; per-user voice prefs; cookie-session on all new endpoints; no raw audio persistence; session isolation tests |
| Performance | First STT/TTS inference slow (model load), kiosk CPU-bound | 2–5 s tolerated, more is not | Prewarm/status probe (`get_status`-style readiness), cache, 2–5 sentence chunks, parallel batch where safe |
| UX | No mockup for top-bar mic + circle | Visual rework risk | Keep styling tokens from transit language; review issue validates visuals |

Auth implications (for architect): per-user voice prefs (voice id, TTS enabled, volume) behind existing cookie session; no new tokens/API keys (offline stack has none); every new endpoint (voice prefs, TTS synthesize/status, sample audio) requires authenticated user + ownership checks + per-user denial tests + session isolation (two users, no cross-read) + no audio/transcript leakage across sessions. Reuse Epic 003 enforcement patterns.

## 7. Existing Requirements Found

No REQ-/SW-REQ-numbered requirements exist in this repo (epics use `*_ISSUE_DEFINITION__*.md` + issue reports, no formal REQ IDs). Related planned/implemented work:

| Requirement | Title | Relevance |
|---|---|---|
| Epic 010-003 | Persistent agent chat section + streaming threads | Direct parent: composer submit path, auto-create thread, transcript is TTS source |
| Epic 010-005 | Markdown transcript rendering | TTS must strip markdown (code fences/tables/task lists) before synthesis |
| Epic 010-006/007 | Multi-connection route registry + settings UI | Home for voice section (voice preset/volume/TTS toggle per user) |
| Epic 007-001/002 | Live camera/mic foundation, recording + level viz | Overlap: reuse permission + PCM + level-meter code; do NOT merge histories |
| Epic 006-001/002 | Global software keyboard + lower overlay | Interaction conflict with composer focus during voice flow |
| Epic 004-001..004 | Shared localization + widget translation standard | 4-language copy required (en/de/fr/es); STT/TTS lang follows board lang |
| Epic 003-001..004 | User accounts, sessions, per-user scoping | Auth model for voice prefs + new endpoints |
| Epic 012-001..005 | Mobile layout + full-screen detail nav | Top-bar mic must work on narrow viewports |
| Epic 008/009 sidecars | Bring/Roborock Python bridges | Precedent for TTS Python helper process boundary |

*New REQ/SW-REQ needed: yes — architect to create for voice prefs, STT UX, TTS synthesis/status, and audio feedback components.*

## 8. Brainstorming Outcomes

### Accepted Ideas
- Silence auto-stop after push-to-talk MVP: kiosk-friendly close of open mic (timer + energy threshold; VAD upgrade later).
- Domain-vocabulary bias + post-correction: `initial_prompt` + shared regex module for Swaibian/scaiCo/Bring/Roborock.
- Markdown→plain-text + sentence-chunked synthesis with disk cache: no code read aloud; stable prosody; low repeat latency.
- Reuse Epic 007 mic permission + PCM + level path: single `getUserMedia`/16 kHz normalizer/level hook.

### Rejected Ideas
- Cloud STT/TTS: rejected — violates offline/no-keys/privacy mandate in tech doc.
- Wake-word / always-listening V1: rejected — out of stack (doc §5), privacy + scope cost; push-to-talk first.
- Voice cloning / custom voice import V1: rejected — preset M1–M5/F1–F5 only for scope control.
- File-upload transcription V1: rejected — mic clips only; doc §1.5 Python path stays scripts-only.

### Deferred Ideas (future consideration)
- Strict offline build-gate (checksum verify + one real offline synthesis at build/pack): deferred to architect/follow-up (installer-size tradeoff open).
- Per-thread language picker; streaming TTS playback; VAD (Silero-class) hands-free mode; Epic 007 history sharing.

## 9. V-Model Scope Classification

| Aspect | Classification | Notes |
|--------|---------------|-------|
| System Impact | 🟡 Module | Touches assistant widget + top bar + settings + new TTS bridge, but no shared data-model rewrite; integration with 007/006/004/012 |
| Integration Scope | Multi-component | Frontend STT + TTS bridge + prefs API + top-bar UX + settings; needs cross-epic coordination |
| Test Level Needed | SWE4+SWE5 (Full V smoke on closer) | Unit (PCM, correction, markdown-strip, cache key) + integration (mic→submit→autoplay, per-user isolation) + SYS3 stack smoke (model/TTS present) |
| Architecture Docs Exist? | Partial | Assistant/widget/keyboard/i18n docs exist; no audio-architecture docs yet — first review issue should scaffold audio section |
| Estimated Batch Count | 2 batches (~8–10 issues) | Guess only; architect finalizes |

## 10. Suggested Component Breakdown (preliminary)

| TC | Tentative Name | Responsibilities | Estimated Size |
|----|---------------|------------------|----------------|
| TC-A | Voice capture + STT (frontend) | Top-bar mic, permission flow, 16 kHz PCM normalizer, Whisper-tiny singleton, vocab correction, silence auto-stop, submit/auto-create thread, level circle (input) | M/L |
| TC-B | Voice synthesis + playback + prefs | TTS helper/sidecar bridge + status probe, markdown-strip + chunking, MP3 encode, disk cache, autoplay/volume/replay, output-level circle, per-user prefs + sample playback in assistant settings, 4-lang copy | M/L |

Auth cross-cutting (both TCs): cookie-session on new endpoints, per-user prefs isolation, no raw-audio persistence, session-isolation + denial tests.

## 11. Handoff Notes for Architecture Agent

- Tentative epic: `EPIC_013_ASSISTANT_AUDIO_INTERFACE` (next free number after 012); this brief saved at `project_management/epics/EPIC_013_ASSISTANT_AUDIO_INTERFACE/DISCOVERY_BRIEF.md` — finalize name/numbering.
- Tech doc is normative: `project_management/ideas/audio-interface/audio_interface_documentation.md` (local-only stack, PCM contract, helper-process contract, cache/eviction guidance, licensing: Whisper Apache-2.0 + NOTICE, supertonic SDK MIT, weights OpenRAIL-M, lamejs MIT — ship attributions).
- Prior art to read: `frontend/src/widgets/assistant/AssistantDetailPanel.tsx` (composer), `AssistantSettingsPanel.tsx` (settings home), `frontend/src/api/assistant.ts` + `backend/server.mjs` assistant routes (auth/persistence patterns), Epic 007-001/002 drafts (mic/level), Epic 006 keyboard focus logic, Epic 004 translation contract, Epic 012 mobile shell.
- Watch conflicts: keyboard auto-open vs voice focus; Epic 007 ordering (shared mic module first or duplicated temporarily with dedup follow-up); installer size (~440 MB models) vs offline-by-construction.
- Test gates in this repo (adjust skill defaults): `npm --prefix frontend run build` (`tsc -b`), `npm --prefix frontend run lint` (eslint), backend `npm --prefix backend start` smoke; no `make test-model/controller` targets exist — architect to define applicable gates + SYS3 smoke (`run dev` frontend+backend, exercise mic→STT→autoplay or documented hardware fallback).
- Do NOT create epics/issues/code in discovery; architect owns epic + TCs + issues + scaffold.
