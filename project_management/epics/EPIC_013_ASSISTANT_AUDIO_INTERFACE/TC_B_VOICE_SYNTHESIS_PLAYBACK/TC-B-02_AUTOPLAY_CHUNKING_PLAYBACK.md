# TC-B-02: Autoplay/Chunking/Playback + Output Circle

**Component**: Voice Synthesis + Playback + Prefs (TC-B)
**Epic**: E-013 Assistant Audio Interface
**V-Model**: SWE3-B-02
**Type**: 🔨 IMPLEMENTATION
**Priority**: P0-Critical
**Estimated Effort**: L
**Dependencies**: TC-B-01 (working synthesis bridge + cache)
**SW-REQ**: SW-REQ-013-02

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

Make answers audible: strip markdown to speakable text, chunk into 2–5 sentence units, autoplay new assistant messages with volume and replay, visualize output amplitude, and let any tap interrupt. Reading code fences aloud is the failure mode this issue exists to prevent.

**High Stakes**: Autoplay that reads ` ``` ` aloud or can't be interrupted makes voice unusable.
**Constraints**: 2–5 spoken sentences per chunk (prosody + retry granularity); per-chapter durations stack to cumulative `startMs` for sync; playback never blocks the UI thread; reduced-motion respected.

---

## 🏗️ Architectural Context

```
assistant message → speechText.stripMarkdown → chunker (2–5 sentences) → tts.synthesize per chunk (TC-B-01, parallel fan-out where safe) → cache → useVoicePlayback queue → <audio> → output circle (Analyser/amplitude) → volume/replay/interrupt
```

See: `project_management/architecture/README.md` for full context.

---

## Traceability

| Level | ID | Artifact |
|-------|-----|---------|
| SYS1 | SYS1-013 | Epic: EPIC_013_ASSISTANT_AUDIO_INTERFACE.md |
| SWE1 | SWE1-B | TC: TC-B-00_COMPONENT_DEFINITION.md |
| SWE3 | SWE3-B-02 | This issue |
| SWE4 | — | Unit tests in: `frontend/src/voice/__tests__/speechText.test.*`, playback-hook tests |

---

## 📋 Task List

### 0.0 Read Architecture Documentation [MANDATORY]
- [ ] **Read: `project_management/architecture/README.md`**
- [ ] **Read: relevant diagrams** in `project_management/architecture/diagrams/`

### 0.1 Read Predecessor Context [MANDATORY]
- [ ] **Read: `TC-B-00_COMPONENT_DEFINITION.md`**
- [ ] **Read: `TC-B-01_TTS_BRIDGE_CACHE_FOUNDATION_COMPLETION_REPORT.md`** ← predecessor's handoff

### 0.2 Run Full Test Suite [MANDATORY GATE 🔴]
- [ ] Build [🔴] + lint [🔴 MANDATORY from TC-B-02] + all prior voice suites; record baseline; new failures → STOP.

### 1. Investigate Requirements
- [ ] Read: SW-REQ-013-02 (TC-B-01) + DISCOVERY_BRIEF §5 interaction 1
- [ ] Read: `frontend/src/assistant/AssistantMarkdown.tsx` + Epic 010-005 rendering (code fences, tables, task lists to strip)
- [ ] Read: `frontend/src/widgets/assistant/AssistantDetailPanel.tsx` (message list, turn states for autoplay trigger)

### 1.5 Logging & Observability Integration [MANDATORY CROSS-CUTTING]
- [ ] Playback events (started/finished/interrupted/failed) with user/session context; never log message content or audio
- [ ] Record logger evidence or specific tested `N/A` rationale

### 2. Write/Update Requirements
- [ ] Refine SW-REQ-013-02 playback semantics (autoplay trigger, chunk size, interrupt rule, volume default)

### 3. Investigate Architecture
- [ ] Review: TC-A-03 circle visuals — output circle shares the language (direction variant)
- [ ] Review: turn lifecycle (`streaming` vs `completed`) — decide autoplay on complete vs progressive chunk playback

### 4. Implement Code
- [ ] `frontend/src/voice/speechText.ts`: `stripMarkdownToSpeech()` (drop code fences, tables→ prose, task lists, links→text, tool-event blocks excluded), `chunkForSpeech(text)` (2–5 sentences, stable boundaries)
- [ ] `frontend/src/voice/useVoicePlayback.ts`: chunk queue, parallel fan-out synthesis, cumulative `startMs` offsets, volume, per-message replay, interrupt (mic tap / replay tap / unmount), TTS-disabled guard (reads prefs; TC-B-03 finalizes API but default-off behavior here)
- [ ] `frontend/src/voice/OutputLevelCircle.tsx`: output-direction pulsating circle (shared tokens with input circle)
- [ ] Wire into `AssistantDetailPanel` transcript: autoplay latest assistant message, replay button per message, volume control
- [ ] Wire into Runtime Instantiation Map ("transcript wires playback" responsibility)

### 5. Create Unit Tests (SWE4) [MANDATORY]
- [ ] Strip tests: code fence/table/task-list/link/tool-block fixtures → speakable text without markup artifacts
- [ ] Chunker tests: boundary stability, 2–5 sentence sizing, retry granularity (failed chunk re-synthesizes alone)
- [ ] Playback-hook tests (mocked audio + synthesize): autoplay trigger, interrupt, volume applied, disabled guard, unmount cleanup
- [ ] Redaction test: no message content in logs

### 6. Run Full Test Suite + Coverage [MANDATORY GATE 🔴]
- [ ] Build + lint (both 🔴) + unit suites; 0 new failures; coverage not regressed

### 7. Create Documentation
- [ ] JSDoc for strip/chunk/hook contracts + autoplay/interrupt semantics
- [ ] Note for closer: playback modules to add to flow/component diagrams

### 8. Write Completion Report & Handoff [MANDATORY]
- [ ] Complete `TC-B-02_AUTOPLAY_CHUNKING_PLAYBACK_COMPLETION_REPORT.md`
- [ ] **Write handoff section for TC-B-03 team** — MUST include:
  - What was built: hook API with usage example, strip/chunk behavior + fixtures, wiring points, prefs guard contract TC-B-03 must satisfy
  - Key decisions/deviations (autoplay timing, fan-out degree, volume default)
  - Known limitations (voice fixed until prefs land, no samples yet, long-answer edge cases)
  - Open risks (CPU contention on fan-out, mobile autoplay policies)
  - Gate results table
- [ ] Update `TC-B-00_COMPONENT_DEFINITION.md` with status + new decisions

---

## ⚠️ Constraints

- No code/markup ever spoken; tool-event blocks never synthesized
- Playback off UI thread; interrupt always available; reduced-motion respected
- Prefs API is TC-B-03 — this issue reads prefs through a narrow guard interface it defines

---

## 📁 Files to Modify

| Action | File Path | Description |
|--------|-----------|-------------|
| Create | `frontend/src/voice/speechText.ts` | Markdown-strip + chunker |
| Create | `frontend/src/voice/useVoicePlayback.ts` | Playback queue hook |
| Create | `frontend/src/voice/OutputLevelCircle.tsx` | Output circle |
| Update | `frontend/src/widgets/assistant/AssistantDetailPanel.tsx` | Autoplay + replay + volume wiring |
| Read   | `frontend/src/assistant/AssistantMarkdown.tsx` | TTS source shapes |

---

## ✅ Acceptance Criteria

- [ ] New assistant answer autoplays (when enabled) with volume + replay; tap interrupts
- [ ] Markup fixtures produce clean speech text; chunks 2–5 sentences
- [ ] Disabled-voice guard silences autoplay without errors
- [ ] Build+lint clean (🔴); tests green; coverage not regressed
- [ ] Completion report with TC-B-03 handoff; TC-B-00 updated; logger evidence included

---

## 📖 Reference Documents

- V-Model Framework: `project_management/swaibian_V-Model_Agents/_templates/V_MODEL_FRAMEWORK.md`
- Architecture: `project_management/architecture/README.md`
- Epic: `project_management/epics/EPIC_013_ASSISTANT_AUDIO_INTERFACE.md`
- Component: `project_management/epics/EPIC_013_ASSISTANT_AUDIO_INTERFACE/TC_B_VOICE_SYNTHESIS_PLAYBACK/TC-B-00_COMPONENT_DEFINITION.md`
- Predecessor Report: `project_management/epics/EPIC_013_ASSISTANT_AUDIO_INTERFACE/TC_B_VOICE_SYNTHESIS_PLAYBACK/TC-B-01_TTS_BRIDGE_CACHE_FOUNDATION_COMPLETION_REPORT.md`
- SW Requirements: SW-REQ-013-02

---

## 🔗 Related Issues

- Depends On: TC-B-01 (bridge + cache)
- Blocks: TC-B-03 (prefs finalize the guard), TC-B-04 (closer)
- Related: TC-A-03 (circle visual language), Epic 010-005 (markdown source)

---

## Gate Results (filled during execution)

| Gate | Level | Result | Notes |
|------|-------|--------|-------|
| Pre-check suite (Task 0.2) | SWE4 | ⬜ PENDING | |
| Post-implementation suite (Task 6) | SWE4 | ⬜ PENDING | |
| Coverage vs baseline | SWE4 | ⬜ PENDING | |
| Build `npm --prefix frontend run build` | SWE4-BUILD 🔴 | ⬜ PENDING | |
| Lint `npm --prefix frontend run lint` | SWE4-LINT 🔴 | ⬜ PENDING | |
