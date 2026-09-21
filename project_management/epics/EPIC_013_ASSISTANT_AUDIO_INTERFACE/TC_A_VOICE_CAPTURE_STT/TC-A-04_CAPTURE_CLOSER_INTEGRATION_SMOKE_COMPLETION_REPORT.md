# TC-A-04: TC-A Closer — Completion Report

**Issue**: TC-A-04
**Component**: Voice Capture + STT (TC-A)
**V-Model**: SWE3-A-04 (closer — inherits SWE5/SWE2/SYS3 duties for TC-A)
**Type**: 🔨 IMPLEMENTATION (CLOSER)
**Status**: ✅ COMPLETE
**Completed**: 2026-09-21

---

## 1. What Was Built

### New Files

| File | Purpose |
|------|---------|
| `frontend/src/voice/__tests__/capture.integration.test.ts` | SWE5 suite: real decode/vocab/singleton seams with fakes only at mic-hardware/weights/backend (4 tests) |
| `frontend/src/voice/__tests__/micButton.test.tsx` | Button-state render tests closing the TC-A-02/03 presentation hole (3 tests) |
| `project_management/architecture/decisions/ADR-001-local-stt-shared-pcm.md` | Accepted: local STT singleton + shared PCM module + deferred `initial_prompt` |

### Changed Files

| File | Change |
|------|--------|
| `frontend/src/voice/voiceCapture.ts` | **Review fix**: late-granted permission streams are released on cancel/restart (mic-leak fix) |
| `frontend/src/voice/__tests__/voiceCapture.test.ts` | Leak-fix regression test |
| `frontend/src/voice/__tests__/capture.integration.test.ts` | (new, above) |
| `frontend/package.json` | `test:voice` extended (integration + button files) |
| `project_management/architecture/diagrams/flow-assistant-voice.md` | Capture half populated with real modules/rules (`Last updated by: SWE3-A-04`) |
| `project_management/architecture/diagrams/component-overview.md` | Voice-capture modules real; synthesis stays stubbed for TC-B-04 |
| `project_management/architecture/diagrams/api-contracts.md` | TC-A note: zero new endpoints, assistant routes reused |
| `project_management/architecture/diagrams/data-model.md` | TC-A confirmation: no new tables (ephemeral audio only) |
| `project_management/architecture/traceability/requirements-matrix.md` | TC-A rows ✅ |
| `project_management/architecture/traceability/coverage-map.md` | TC-A coverage real (73 tests, fallback smoke noted) |
| `project_management/architecture/README.md` | `Last updated by: SWE3-A-04`, ADR-001 linked, changelog |

### APIs / Contracts Defined

- SWE5 seam contract (for TC-B/007): fakes belong ONLY at mic hardware, Web Audio decode, model weights, and backend submit; every pure seam (PCM math, validation, singleton plumbing, vocabulary, copy) runs real in integration tests.

---

## 2. Key Decisions

| Decision | Rationale |
|----------|-----------|
| Fixed the cancel-during-request mic leak in the closer (don't defer) | Real resource leak found by review; one focused fix + regression test, no behavior change otherwise |
| ADR-001 written; all other TC-A decisions get explicit no-ADR notes below | Only the STT/PCM architecture has lasting cross-epic impact |
| SYS3 recorded as FALLBACK + HIGH gap, not skipped | Stack boots and serves voice UI (evidence below); live-mic proof is impossible in this env and belongs on target hardware |
| No-ADR notes: test-runner choice (`tsc`+`node --test`) — toolchain detail, reversible; bare-`bring` conservatism — data-list detail inside `vocabulary.ts`; toast-less error surfaces — UI pattern, no protocol impact; symlink in `test:voice` — local script detail; `tsconfig.app.json` test exclusion — standard build hygiene | None meets the ADR triggers (lasting technology/pattern/breaking impact) |

---

## 3. Gate Results

| Gate | Result | Notes |
|------|--------|-------|
| Pre-check build/lint/unit (Task 0.2) | ✅ | exit 0 / 48+14 baseline / 65–66 tests (grew during closer work) |
| Integration suite SWE5 (Task 3/6) | ✅ | 4/4 `capture.integration` green (real seams) |
| Post-implementation suite (Task 6) | ✅ | `npm --prefix frontend run test:voice`: 73 tests, 73 pass, 0 fail |
| Coverage vs baseline | ✅ | +8 tests in closer (leak fix, 4 integration, 3 button); no regressions |
| Typecheck (`npm --prefix frontend run build`) | ✅ | exit 0, 0 errors |
| Lint (`npm --prefix frontend run lint`) | ✅ | 48 errors / 14 warnings = baseline, 0 new |
| SYS3 runtime smoke (Task 8) | ✅ FALLBACK | Backend `:8787/session` 200 + frontend `:5173` 200 + bundle voice markers; live-mic HIGH gap (below) |

## 3.5 Logger Evidence (mandatory)

| Item | Evidence |
|------|----------|
| Event names and allow-listed fields | TC-A adds zero log events (verified across all three issues; PII-silence test guards regressions) |
| Request/user/session propagation | Voice reuses the existing turn runner — no new request surface, no new auth surface (zero new endpoints) |
| Redaction/no-secret tests | Console-spy PII test (TC-A-02) + markup PII test (TC-A-03) + synthetic-PCM-only fixtures (this issue) |
| Sink and failure behavior | N/A — no sink added |
| Audit/metrics separation | N/A — untouched |

---

## 4. Handoff for TC-B (Voice Synthesis + Playback)

**Entry point**: `frontend/src/voice/` (8 modules + `__tests__/` with 73 green tests) + `project_management/architecture/` (capture halves populated).

**What was verified**:
- Capture path integration: permission → real PCM math → real singleton plumbing → real vocabulary → submit seam (4 SWE5 tests green).
- Review fix: cancel-during-request stream leak fixed + regression-tested; double-submit races, release ordering, stale states all covered.
- Smoke (fallback): `npm --prefix backend run dev` → `/api/auth/session` 200; `npm --prefix frontend run dev` → app 200 "Home Info Kiosk"; production bundle contains `terminal-cell--voice`, `voice-circle--`, `data-voice-state`. Dev servers shut down after (verified down).
- Arch artifacts changed: flow/component/API/data-model diagrams, requirements-matrix + coverage-map TC-A rows ✅, README changelog, ADR-001.

**Gaps fixed vs deferred**:
| Gap (source) | Disposition |
|---|---|
| Cancel-during-request mic leak (closer review) | ✅ FIXED here + regression test |
| Hook/component render paths (TC-A-01/02) | ✅ FIXED here via `renderToStaticMarkup` suites (micButton, inputCircle) |
| Vendored model binaries (TC-A-02) | → TC-B-01 owns distribution decision (MEDIUM); runtime fails closed meanwhile |
| Model first-load latency / prewarm (TC-A-01/02) | → TC-B-04 full-loop smoke must measure on HW (MEDIUM) |
| Safari Web Audio quirks (TC-A-01/02/03) | Accepted gap, LOW: graceful `null`/fail-closed paths unit-covered; HW proof in gap below |
| Epic 007 reuse order (TC-A-01) | Accepted: module ready with import examples (below); flag when 007 starts |
| Live-mic E2E + visual/device proof (all) | HIGH gap: target-hardware run required (mic → transcript → thread) — TC-B-04 or HW bring-up owns it |
| Pending recorder-stop promise after cancel (closer review) | Accepted rationale: benign (no timers/resources held, GC'd); no test added |

**Reuse contract for TC-B / Epic 007** (import paths + example):
- `import { requestMicPermission, decodeToMono16k, browserVoiceAudioDecoder, downmixAndResample, computeRmsLevel, VOICE_TARGET_SAMPLE_RATE } from './voice/audioInput.ts'` (or `../voice/` from widgets)
- `import { createLevelMonitor, createMicrophoneLevelSource } from './voice/audioLevel.ts'` — circle rate ~20 Hz (`intervalMs: 50`); scalars only
- `import { postCorrectTranscript, buildInitialPrompt, normalizeSttLanguage } from './voice/vocabulary.ts'`
- Output circle: `voiceCircleStyle(level, state, 'output')` — same language, green palette
- Level hook rate: monitor default 50 ms; silence poll 200 ms / 2.5 s window / 120 s cap (controller defaults)

**Run tests**: `npm --prefix frontend run test:voice` from repo root (73/73). Build: `npm --prefix frontend run build` (exit 0). Lint: `npm --prefix frontend run lint` (48/14 baseline).

---

## ⚠️ Known Issues / Limitations (if any)

1. **HIGH: no live-mic proof in this environment** — fallback smoke only; target-HW run required before release.
2. Model binaries absent by design (TC-B-01 decides distribution).

---

## Traceability

| Level | ID | Artifact |
|-------|-----|---------|
| SYS1 | SYS1-013 | Epic: EPIC_013_ASSISTANT_AUDIO_INTERFACE.md |
| SWE1 | SWE1-A | TC: TC-A-00_COMPONENT_DEFINITION.md |
| SWE3 | SWE3-A-04 | Issue: TC-A-04_CAPTURE_CLOSER_INTEGRATION_SMOKE.md |
| SWE4 | — | Unit tests: `frontend/src/voice/__tests__/` (73 total) |
| SWE5 | — | Integration: `capture.integration.test.ts` (4/4) |
| SYS3 | — | Fallback smoke evidence (§4); HIGH gap for HW run |

---

## Self-verification (no-reviews mode)

| Gate | Command (repo root) | Exit | Result |
|------|---------------------|------|--------|
| D1 Lint (mandatory) | `npm --prefix frontend run lint` | 1 (pre-existing) | ✅ 48/14 = baseline, 0 new |
| D2 Typecheck/build | `npm --prefix frontend run build` | 0 | ✅ 0 errors |
| D3 Tests (unit + integration) | `npm --prefix frontend run test:voice` | 0 | ✅ 73/73 (incl. 4 SWE5) |
| D4 Smoke through the wiring | dev-stack boot + curls + bundle grep (fallback; no mic/models here) | 0 | ✅ backend 200, frontend 200, voice markers in bundle; HIGH gap recorded |
| D5 Self-checklist | — | — | ✅ gap analysis dispositioned every item; arch/traceability/ADR current; no `any`/`eslint-disable`; synthetic fixtures only; no scope creep (no STT-engine/TTS changes) |

Requirement → `file:line` → test → status: SW-REQ-013-01 (controller/stt/PCM → 73 tests incl. integration) ✅; SW-REQ-013-04-input (circle/copy/keys/keyboard/mobile → render + key + predicate tests, bundle proof) ✅.

Wiring chain: `.terminal-marquee` → `terminal-cell--voice` → `VoiceMicButton` + `InputLevelCircle` + status note → `useVoiceCapture` → `VoiceCaptureController` → `stt.ts` → `vocabulary.ts` → `handleVoiceTranscriptSubmit` → `runAssistantTurn` → `api/assistant.ts` — every hop built, tested, and bundle-verified.

Residual risks: HIGH live-mic gap; model distribution (TC-B-01); Safari HW quirks; first-load latency.

Independent review intentionally omitted — TC-A is declared `no-reviews`; gap analysis is inherited by the TC closer (TC-A-04 — this issue).
