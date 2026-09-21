# TC-A-01: Shared Mic/PCM/Permission/Level Foundation — Completion Report

**Issue**: TC-A-01
**Component**: Voice Capture + STT (TC-A)
**V-Model**: SWE3-A-01
**Type**: 🔨 IMPLEMENTATION
**Status**: ✅ COMPLETE
**Completed**: 2026-09-21

---

## 1. What Was Built

### New Files

| File | Purpose |
|------|---------|
| `frontend/src/voice/audioInput.ts` | Mic permission, MIME probe, 16 kHz mono PCM normalizer, validation, RMS/silence helpers (SW-REQ-013-01) |
| `frontend/src/voice/audioLevel.ts` | Framework-free scalar level monitor + time-domain sampler + clamp/smooth math (SW-REQ-013-04 input half) |
| `frontend/src/voice/useAudioLevel.ts` | React binding for the level monitor (scalar state only, lifecycle-safe) |
| `frontend/src/voice/vocabulary.ts` | Whisper `initial_prompt` builder + ordered post-correction rules + STT language normalize (SW-REQ-013-01) |
| `frontend/src/voice/__tests__/audioInput.test.ts` | 16 PCM/validation/RMS/decode tests (positive + negative) |
| `frontend/src/voice/__tests__/audioLevel.test.ts` | 9 level/monitor tests incl. no-buffer-leakage assertions |
| `frontend/src/voice/__tests__/vocabulary.test.ts` | 6 correction/prompt/language tests incl. German-verb false-positive guard |
| `frontend/tsconfig.voice.json` | Isolated compile config for voice unit tests (node16, strict) |
| `project_management/epics/EPIC_013_ASSISTANT_AUDIO_INTERFACE/SW-REQ-013-01_VOICE_CAPTURE_STT.md` | SW-REQ-013-01 (7 shall statements + verification) |
| `project_management/epics/EPIC_013_ASSISTANT_AUDIO_INTERFACE/SW-REQ-013-04_AUDIO_FEEDBACK_I18N.md` | SW-REQ-013-04 draft (input half defined, output half open for TC-B) |

### Changed Files

| File | Change |
|------|--------|
| `frontend/package.json` | Added `@huggingface/transformers@^4.3.0` (exact tarball pinned by `package-lock.json`) + `test:voice` script |
| `frontend/package-lock.json` | Dependency tree for the above (generated) |
| `frontend/tsconfig.app.json` | Excluded `src/voice/__tests__` from the app build (test files need node types; app scope is `vite/client` only) |
| `.gitignore` | Ignored `/voice-test-dist/` (generated test output) |

### APIs / Contracts Defined

**`frontend/src/voice/audioInput.ts`** (SW-REQ-013-01):
- `requestMicPermission(): Promise<MicPermissionResult>` — explicit-tap mic acquisition; never throws, typed `VoiceInputError` codes (`denied`, `no-device`, `unsupported`, `aborted`)
- `downmixAndResample(channels, sourceRate, targetRate=16000): PcmData` — pure average-downmix + linear resample
- `validatePcmSamples(samples): VoiceInputError | null` — empty / over-cap / non-finite rejection
- `decodeToMono16k(recording: Blob, decoder: VoiceAudioDecoder): Promise<PcmDecodeResult>` — blob → validated 16 kHz mono PCM; cap enforced before render
- `pickSupportedMimeType(candidates, isSupported): string` + `browserMimeTypeProbe`
- `browserVoiceAudioDecoder` — real Web Audio implementation (`decodeAudioData` + `OfflineAudioContext` render)
- `computeRmsLevel(samples): number`, `isSilent(rms, threshold=0.02): boolean`

**`frontend/src/voice/audioLevel.ts`** (SW-REQ-013-04 input half):
- `createLevelMonitor(sampler, options): LevelMonitor` — `start/stop/isRunning/currentLevel`, injected timers
- `sampleRmsFromTimeDomain(read, fftSize): number`, `clampLevel`, `smoothLevel`
- `useAudioLevel(sampler, active, intervalMs=50): number` (in `useAudioLevel.ts`)

**`frontend/src/voice/vocabulary.ts`** (SW-REQ-013-01):
- `postCorrectTranscript(text): string` — Swaibian/scaiCo/Roborock/Bring-mangling/Subway repairs; bare German "bring" untouched
- `buildInitialPrompt(languageCode): string`, `normalizeSttLanguage(value): SttLanguage`

---

## 2. Key Decisions

| Decision | Rationale |
|----------|-----------|
| Test approach: `tsc` + `node --test`, no new framework | Repo has no runner; Node 23 builtins + project TS give 31 deterministic tests with zero new dependencies |
| `test:voice` compiles to `../voice-test-dist` (repo root) | `frontend/` is `"type": "module"`, which breaks CJS test output; root has no `package.json` so `.js` stays CJS. Output git-ignored. |
| Explicit `.ts` import extensions in voice sources | Required for resolvable compiled output under `node16`; app config already allows it (`allowImportingTsExtensions`) |
| `tsconfig.app.json` excludes `src/voice/__tests__` (deviation, documented) | Test files import `node:test`; app scope types are `vite/client` only and the app build broke (TS2591). Exclusion is the minimal, standard fix. |
| `@huggingface/transformers@^4.3.0` installed now, wired in TC-A-02 | Registry reachable; lockfile pins the exact tarball. Install-only per plan. |
| Bare "bring" never corrected | It is a everyday German verb; only unambiguous manglings (`brink`, `pring`) map to `Bring` |
| Unknown STT language → `auto`, not a guess | Wrong forced language degrades transcription more than decoder auto-detect |
| `docs/mvc_architecture.md` does not exist (confirmed) | Voice logging precedent set here instead: `[voice]`-prefixed backend logs with user/session context; transcripts/audio/secrets never logged; frontend surfaces voice errors as UI copy |

---

## 3. Gate Results

| Gate | Result | Notes |
|------|--------|-------|
| Pre-check build (Task 0.2) | ✅ | Baseline passed (chunk-size warning only, pre-existing) |
| Pre-check lint (Task 0.2) | ✅ recorded | Baseline: 62 problems (48 errors, 14 warnings), all pre-existing — ADVISORY on this issue |
| Pre-check backend boot (Task 0.2) | ✅ | `npm --prefix backend start` serves `/api/auth/session` → HTTP 200 |
| Post-implementation build (Task 6) | ✅ | `npm --prefix frontend run build` exit 0, 0 errors |
| Post-implementation lint (Task 6) | ✅ | 62 problems (48 errors, 14 warnings) — identical to baseline, 0 new |
| Voice unit tests (Task 6) | ✅ | `npm --prefix frontend run test:voice`: 31 tests, 31 pass, 0 fail |
| Coverage vs baseline | ✅ | New modules fully covered by 31 tests; no existing tests to regress (repo has no runner) |
| TOOLING GATE (handoff blocker) | ✅ | Build + unit tests clean, lint delta zero — TC-A-02 may start |

## 3.5 Logger Evidence (mandatory)

| Item | Evidence |
|------|----------|
| Event names and allow-listed fields | No runtime events added (pure foundation modules). Precedent defined: future `[voice]` backend events carry user/session context only |
| Request/user/session propagation | N/A — no request path touched (no backend changes in this issue) |
| Redaction/no-secret tests | Tests assert level/monitor paths emit scalars only (`typeof level === 'number'`, range-checked); `sampleRmsFromTimeDomain` never retains the byte buffer |
| Sink and failure behavior | N/A — no logging sink added |
| Audit/metrics separation | N/A — precedent recorded for TC-A-02/TC-B: operational logs separate from audit, transcripts never logged |

---

## 4. Handoff for TC-A-02 (Push-to-Talk STT Submit)

**Entry point**: `frontend/src/voice/audioInput.ts` — start with `requestMicPermission`, `decodeToMono16k`, and `VOICE_*` constants; then `vocabulary.ts` (`buildInitialPrompt`, `postCorrectTranscript`, `normalizeSttLanguage`).

**Wiring chain** (deferred to TC-A-02 by plan — this issue ships pure, intentionally unwired modules):
`App.tsx` header `.terminal-marquee` (line ~3658, mount next to `.filter-actions`) → new `VoiceMicButton onClick` → new `useVoiceCapture` → `audioInput.requestMicPermission/decodeToMono16k` (this issue) → new `stt.ts` singleton (`@huggingface/transformers`, already installed) → `vocabulary.postCorrectTranscript` (this issue) → `frontend/src/api/assistant.ts` `createAssistantThread` (line 808) / `sendAssistantThreadMessage` (line 859) / `streamAssistantThreadMessage` (line 886). Trigger in-app: top-bar mic tap → speak → tap stop → prompt appears in the assistant thread (auto-created when none selected).

**What you inherit**:
- Permission + PCM + validation + RMS/silence: `import { requestMicPermission, decodeToMono16k, browserVoiceAudioDecoder, computeRmsLevel, isSilent, VOICE_TARGET_SAMPLE_RATE } from '../voice/audioInput.ts'` — e.g. `const res = await decodeToMono16k(blob, browserVoiceAudioDecoder); if (!res.ok) return failClosed(res.error); transcribe(res.samples);`
- Vocabulary: `import { buildInitialPrompt, postCorrectTranscript, normalizeSttLanguage } from '../voice/vocabulary.ts'` — e.g. `postCorrectTranscript(raw)` before submit; `normalizeSttLanguage(selectedLanguageCode)` for the pipeline language
- Levels: `import { createLevelMonitor } from '../voice/audioLevel.ts'` + `useAudioLevel` hook for the TC-A-03 circle
- Tests: `npm --prefix frontend run test:voice` from repo root (compiles + runs 31 tests)

**What is NOT implemented yet** (stubs for TC-A-02/03):
- Whisper-tiny singleton `stt.ts` — TC-A-02
- `useVoiceCapture` state machine + `VoiceMicButton` + shell mount — TC-A-02
- `InputLevelCircle`, error copy, keyboard suppression, 4-language voice keys — TC-A-03
- SW-REQ-013-04 output half — TC-B

**Run tests**: `npm --prefix frontend run test:voice` from repo root (`/Users/flerli/01_Swaibian/Swaibian-Main_Office/05_Products/subway`).

**Known limitations / edge cases**:
- `useAudioLevel` hook itself is not render-tested (no React test harness in repo); its logic core `createLevelMonitor` is fully tested with injected timers
- Safari `OfflineAudioContext`/`MediaRecorder` quirks not verified — TC-A-02/03 must test on target hardware; `pickSupportedMimeType` returns `''` when unsupported (caller must fail closed)
- `decodeToMono16k` trusts `decoded.getChannelData(0).length` for duration; corrupt headers surface as `decode-failed`

**Open risks / questions**:
- Epic 007 reuse order: this module is ready; 007 issues must import (not duplicate) it — flag when 007 starts
- Model first-load latency (hundreds of ms–seconds) — TC-A-02 singleton design must prewarm/lazy-load off the tap path
- Kiosk mic hardware unconfirmed — TC-A-04 smoke defines the fallback run

---

## ⚠️ Known Issues / Limitations (if any)

1. **Hook render path untested** — `useAudioLevel` has no jsdom/harness; mitigated by testing `createLevelMonitor` (the full logic core) directly.

---

## Traceability

| Level | ID | Artifact |
|-------|-----|---------|
| SYS1 | SYS1-013 | Epic: EPIC_013_ASSISTANT_AUDIO_INTERFACE.md |
| SWE1 | SWE1-A | TC: TC-A-00_COMPONENT_DEFINITION.md |
| SWE3 | SWE3-A-01 | Issue: TC-A-01_SHARED_MIC_PCM_PERMISSION_LEVEL_FOUNDATION.md |
| SWE4 | — | Tests: `frontend/src/voice/__tests__/` (31 tests via `test:voice`) |

---

## Self-verification (no-reviews mode)

| Gate | Command (repo root) | Exit | Result |
|------|---------------------|------|--------|
| D1 Lint (advisory here) | `npm --prefix frontend run lint` | 1 (pre-existing) | ✅ 48 errors/14 warnings = baseline, 0 new |
| D2 Typecheck/build | `npm --prefix frontend run build` | 0 | ✅ 0 errors |
| D3 Tests (module suite = new voice suite; no repo runner exists) | `npm --prefix frontend run test:voice` | 0 | ✅ 31/31 pass |
| D3 Backend boot | `npm --prefix backend start` + curl `/api/auth/session` | 0 | ✅ HTTP 200 |
| D4 Smoke through the wiring | N/A this issue | — | Pure foundation, intentionally unwired; wiring chain named above with owner TC-A-02. Verified instead: `decodeToMono16k` happy/negative paths + permission-error taxonomy via unit tests (31/31). |
| D5 Self-checklist | — | — | ✅ every file maps to SW-REQ-013-01/04-input or the tooling gate; no existing callers touched (AudioVisual*/uiClickSound verified untouched); no `any`/`eslint-disable`; no secrets/PII; `tsconfig.app.json` deviation documented above |

Requirement → `file:line` → test → status:
- PCM contract → `audioInput.ts` (`downmixAndResample`, `decodeToMono16k`) → `__tests__/audioInput.test.ts` (16 tests) → ✅
- Validation/caps → `audioInput.ts` (`validatePcmSamples`) → empty/oversized/NaN cases → ✅
- Scalar levels, no leakage → `audioLevel.ts` (`createLevelMonitor`, `sampleRmsFromTimeDomain`) → `__tests__/audioLevel.test.ts` (9 tests) → ✅
- Vocabulary → `vocabulary.ts` → `__tests__/vocabulary.test.ts` (6 tests) → ✅
- Tooling gate → `package.json` (`test:voice`), `tsconfig.voice.json` → 31/31 + build exit 0 → ✅
- SW-REQ-013-01 written, SW-REQ-013-04 input drafted → epic folder → ✅

Wiring chain: none yet (foundation issue) — entry → … → new code deferred to TC-A-02 (named above with `file:line` per hop).

Residual risks / limitations / open questions: see Handoff + §Known Issues (hook render path, Safari quirks, 007 reuse order, model load latency, kiosk mic hardware).

Independent review intentionally omitted — TC-A is declared `no-reviews`; gap analysis is inherited by the TC closer (TC-A-04).
