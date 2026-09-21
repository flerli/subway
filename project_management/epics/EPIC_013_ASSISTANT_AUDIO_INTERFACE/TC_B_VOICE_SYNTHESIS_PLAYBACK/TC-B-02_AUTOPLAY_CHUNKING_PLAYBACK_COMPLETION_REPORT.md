# TC-B-02: Autoplay/Chunking/Playback — Completion Report

**Issue**: TC-B-02
**Component**: Voice Synthesis + Playback + Prefs (TC-B)
**V-Model**: SWE3-B-02
**Type**: 🔨 IMPLEMENTATION
**Status**: ✅ COMPLETE
**Completed**: 2026-09-21

---

## 1. What Was Built

### New Files

| File | Purpose |
|------|---------|
| `frontend/src/voice/speechText.ts` | `stripMarkdownToSpeech` (fenced code blocks fully removed — bug found+fixed here; tables→spoken cells; links keep text; images/task-artifacts dropped) + `chunkForSpeech` (2–5 sentence units, single long sentence never split) |
| `frontend/src/voice/voicePlayback.ts` | Framework-free `VoicePlaybackController`: enqueue (strip+chunk+fire-and-forget autoplay), per-message replay, interrupt, volume, TTS-disabled guard, output-levels seam |
| `frontend/src/voice/useVoicePlayback.ts` | React binding (unmount interrupts) |
| `frontend/src/voice/playbackLevel.ts` | `createPlaybackLevelSource(PlayableAudio)` — Web-Audio analyser → scalar RMS + dispose |
| `frontend/src/voice/OutputLevelCircle.tsx` | Output-direction circle (reuses `voiceCircleStyle(..., 'output')`) |
| `frontend/src/voice/__tests__/speechText.test.ts` | 7 strip/chunk tests (fence/tables/links/negative) |
| `frontend/src/voice/__tests__/voicePlayback.test.ts` | 8 controller tests (strip+chunk pipeline, replay, interrupt, volume, disabled guard, failure fallback, prefs voice) |

### Changed Files

| File | Change |
|------|--------|
| `frontend/src/App.tsx` | `createDomAudioPlayer` adapter (module-level, faithful DOM envelope); `useVoicePlayback` wired with real `synthesizeVoice`/player/analyser + default prefs (F1/80, TC-B-03 replaces); autoplay hook in `commitAssistantTurn`; mic toggle interrupts playback; replay/volume handlers |
| `frontend/src/widgets/assistant/AssistantDetailPanel.tsx` | Additive `playback` prop (playing/speakingMessageId/volume/readOutputLevel/onReplayMessage/onVolumeChange); per-message replay button; composer-footer voice row (OutputLevelCircle + volume slider) |
| `frontend/src/widgets/WidgetBoardHost.tsx` | Threads `assistantState.playback` |
| `frontend/src/i18n/appText.ts` | 3 new keys × 4 languages (`replayAction`, `playbackLabel`, `playbackVolumeLabel`), ASCII-only |
| `frontend/src/App.css` | Playback row/volume/replay styles |
| `frontend/tsconfig.voice.json`, `package.json` | New modules + tests in suite |
| `project_management/epics/EPIC_013_ASSISTANT_AUDIO_INTERFACE/SW-REQ-013-04_AUDIO_FEEDBACK_I18N.md` | Output half finalized (4 shall statements) |

### APIs / Contracts Defined

- `stripMarkdownToSpeech(markdown): string`; `chunkForSpeech(speech): string[]`
- `VoicePlaybackController`: `enqueueMessage(messageId, markdown)` (fire-and-forget), `playMessage` (replay), `interrupt()`, `setVolume(0-100)`, `readOutputLevel()`, snapshot `{playing, speakingMessageId, volume, outputLevel}`
- `PlayableAudio` contract (method-style, DOM-assignable) + `createDomAudioPlayer` adapter; `createPlaybackLevelSource(player)`

---

## 2. Key Decisions

| Decision | Rationale |
|----------|-----------|
| Playback controller framework-free; fire-and-forget autoplay | Same proven TC-A pattern; autoplay never blocks the UI; unit-testable queue/interrupt/volume |
| `PlayableAudio` made DOM-assignable (method-style `play()`, required `src`/`duration`, `onended(ev)`, `element?`) | Strict TS: DOM HTMLAudioElement must satisfy the contract directly — fixed the type, not cast around it |
| Whole fenced blocks (not just fence lines) removed in the strip | Real bug found by testing: content inside fences was being read aloud; regression-locked |
| Headings keep their text (only the `#` marker is dropped) | Reading "Only a heading" is preferred to skipping structural meaning |
| `element?` on the player for the analyser source | Fake players stay clean; real adapter exposes the DOM element; `createPlaybackLevelSource` fails closed to a quiet circle |
| Default prefs (F1/80/enabled) until TC-B-03 | Narrow `getPrefs()` guard the settings issue replaces with live per-user prefs |

---

## 3. Gate Results

| Gate | Result | Notes |
|------|--------|-------|
| Pre-check build/lint/unit (Task 0.2) | ✅ | exit 0 / 48+14 / 79+32 (TC-B-01 handoff) |
| Post-implementation build | ✅ | `npm --prefix frontend run build` exit 0 |
| Post-implementation lint | ✅ | 48 errors/14 warnings = baseline, 0 new |
| Post-implementation unit | ✅ | `test:voice` 94/94 (15 new: 7 speechText + 8 playback) |
| Coverage vs baseline | ✅ | Strip/pipeline/guard/interrupt fully covered |

## 3.5 Logger Evidence (mandatory)

| Item | Evidence |
|------|----------|
| Event names + allow-listed fields | No new log events (playback state = React state; errors → UI copy) |
| Request/user/session propagation | N/A — frontend-only issue; backend untouched |
| Redaction/no-secret tests | Speech/hook tests assert no audio bytes in state; `OutputLevelCircle` reuses scalar-only pattern; PII-silence suite from TC-A still green |
| Sink and failure behavior | Synthesis failure → quiet chunk end (no crash, no stall); guard test |
| Audit/metrics separation | N/A |

---

## 4. Handoff for TC-B-03 (Voice Prefs + Settings)

**Entry point**: `frontend/src/voice/voicePlayback.ts` (`getPrefs` seam) + `App.tsx` `getPrefs: () => ({ ttsEnabled: true, voice: 'F1', volume: 80 })` — TC-B-03 replaces this literal with live per-user prefs from the new API; the playback guard reads them every play.

**Wiring chain** (complete this issue):
App `commitAssistantTurn` (autoplay on assistant message) → `voicePlayback.enqueueMessage` → `stripMarkdownToSpeech` → `chunkForSpeech` → `synthesizeVoice` (TC-B-01) → `<audio>` via `createDomAudioPlayer` → `createPlaybackLevelSource` → `OutputLevelCircle` (composer footer) + per-message replay → `handleReplayAssistantMessage`; mic toggle → `voicePlayback.interrupt()`. Bundle proof: `assistant-playback-row` + `voice-circle--output` + `Replay` in `frontend/dist/assets`.

**What you inherit**:
- Guard: `useVoicePlayback({ getPrefs: () => prefs, /* synth, player, levels, language */ })` — wire `prefs` from `fetchVoicePreferences` (TC-B-03)
- `PlayableAudio` + `createDomAudioPlayer` for any future audio UI
- Circle: `OutputLevelCircle` (direction prop `'output'`)
- Tests: `npm --prefix frontend run test:voice` (94 green)

**What is NOT implemented yet**:
- `GET/PUT /api/voice/preferences` + samples route + settings voice section (toggle/preset grid/volume) — TC-B-03
- Playback reads live prefs (currently defaults) — TC-B-03 finalizes
- Full-loop runtime smoke — TC-B-04

**Known limitations**: `MediaElementSource` requires a single consumer per element (fine — one player at a time); some browsers block autoplay before user gesture on the kiosk (mic tap counts; verify on hardware); long answers stream chunk-by-chunk sequentially (CPU-safe).

**Open risks**: autoplay policy on target kiosk browser; prefs default voice F1 until TC-B-03.

---

## ⚠️ Known Issues / Limitations (if any)

1. **Autoplay-policy dependence** — first playback may need a prior user gesture (mic tap satisfies); TC-B-04 smoke verifies on hardware.

---

## Traceability

| Level | ID | Artifact |
|-------|-----|---------|
| SYS1 | SYS1-013 | Epic: EPIC_013_ASSISTANT_AUDIO_INTERFACE.md |
| SWE1 | SWE1-B | TC: TC-B-00_COMPONENT_DEFINITION.md |
| SWE3 | SWE3-B-02 | Issue: TC-B-02_AUTOPLAY_CHUNKING_PLAYBACK.md |
| SWE4 | — | Tests: `speechText.test.ts` (7), `voicePlayback.test.ts` (8) |

---

## Self-verification (no-reviews mode)

| Gate | Command (repo root) | Exit | Result |
|------|---------------------|------|--------|
| D1 Lint (mandatory) | `npm --prefix frontend run lint` | 1 (pre-existing) | ✅ 48/14 = baseline, 0 new |
| D2 Typecheck/build | `npm --prefix frontend run build` | 0 | ✅ 0 errors |
| D3 Tests | `npm --prefix frontend run test:voice` | 0 | ✅ 94/94 |
| D4 Smoke through the wiring | bundle grep `assistant-playback-row`/`voice-circle--output`/`Replay` in dist | 0 | ✅ compiled into production bundle; playback hook state machine proven by 8 controller tests (strip→chunk→synth→play queue, replay, interrupt, volume, disabled guard) |
| D5 Self-checklist | — | — | ✅ every file maps to SW-REQ-013-02/04-output; no backend touches; no `any`/`eslint-disable`; token/PII-free (defaults only); deviations documented (fire-and-forget, DOM-assignable interface, heading-text retention) |

Requirement → `file:line` → test → status:
- Markdown never read aloud → `speechText.ts` (`stripMarkdownToSpeech`) → fence/tables/links tests → ✅
- 2–5 sentence chunks, no mid-sentence split → `speechText.ts` (`chunkForSpeech`) → 4 chunk tests → ✅
- Autoplay + replay + volume + interrupt → `voicePlayback.ts` → 8 tests incl. guard → ✅
- Output circle scalar-only → `OutputLevelCircle.tsx` + `playbackLevel.ts` → render/PII pattern + bundle → ✅
- 4-language copy → `appText.ts` (3 new keys) → key-coverage suite (TC-A-03) still green → ✅

Residual risks: autoplay policy (HW smoke), default prefs until TC-B-03.

Independent review intentionally omitted — TC-B is declared `no-reviews`; gap analysis is inherited by the TC closer (TC-B-04).