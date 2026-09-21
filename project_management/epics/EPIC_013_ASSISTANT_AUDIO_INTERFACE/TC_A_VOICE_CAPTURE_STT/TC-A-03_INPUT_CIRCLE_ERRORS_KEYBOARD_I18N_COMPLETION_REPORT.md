# TC-A-03: Input Circle, Errors, Keyboard, i18n — Completion Report

**Issue**: TC-A-03
**Component**: Voice Capture + STT (TC-A)
**V-Model**: SWE3-A-03
**Type**: 🔨 IMPLEMENTATION
**Status**: ✅ COMPLETE
**Completed**: 2026-09-21

---

## 1. What Was Built

### New Files

| File | Purpose |
|------|---------|
| `frontend/src/voice/voiceCircle.ts` | Pure circle geometry (scale/opacity/gradient per state, input/output palettes, reduced-motion) — shared visual language for TC-B-02 (SW-REQ-013-04) |
| `frontend/src/voice/InputLevelCircle.tsx` | Presentational pulsating circle, self-animated via `useAudioLevel` (no parent re-renders), `role="img"` + localized label |
| `frontend/src/voice/voiceCopy.ts` | Error-code → localized copy mapping for both error surfaces (single source, SW-REQ-013-04) |
| `frontend/src/voice/__tests__/voiceCircle.test.ts` | 6 style tests (states, scaling, clamps, reduced motion, palettes) |
| `frontend/src/voice/__tests__/voiceCopy.test.ts` | 5 copy tests (15 keys × 4 langs, ASCII convention, per-code mapping, fallback) |
| `frontend/src/voice/__tests__/inputCircle.test.tsx` | 2 static-markup render tests (per-state markup, labels, no-audio-in-markup) |

### Changed Files

| File | Change |
|------|--------|
| `frontend/src/i18n/appText.ts` | Added `voice` section: 15 keys × en/de/fr/es (ASCII-only); one existing import switched to explicit `.ts` extension (voice-test compile requirement, app-allowed) |
| `frontend/src/voice/VoiceMicButton.tsx` | Renders `InputLevelCircle` beside the button when active; labels + circle label via props; default ellipsis fixed to ASCII `...` |
| `frontend/src/voice/useVoiceCapture.ts` | Returns `readLevel()` (controller's live RMS) for the circle |
| `frontend/src/voice/voiceCapture.ts` | Additive only: `isVoiceCaptureActiveState`, `createStreamLevels` dep, live level tracking, `readInputLevel()`, dispose-on-release |
| `frontend/src/voice/audioLevel.ts` | Added `createMicrophoneLevelSource` (analyser → scalar sampler + dispose); `sampleRmsFromTimeDomain` param widened to `Uint8Array<ArrayBuffer>` (DOM contract) |
| `frontend/src/voice/useAudioLevel.ts` | Import path to explicit `.ts` extension (voice-test compile requirement) |
| `frontend/src/App.tsx` | Mic moved to persistent `terminal-cell--voice` (survives mobile collapse); localized button props; header error note (`role="status"`); `voiceNote` passed to transcript; keyboard suppression via `voiceCaptureActiveRef` |
| `frontend/src/widgets/WidgetBoardHost.tsx` | Threaded additive `voiceNote` (prop type + detail-data mapping) |
| `frontend/src/widgets/assistant/AssistantDetailPanel.tsx` | Additive optional `voiceNote` rendered as transcript-head warning note |
| `frontend/src/App.css` | Voice cell/circle/note styles + mobile 44 px touch rule |
| `frontend/tsconfig.voice.json` | `jsx: react-jsx` + new files included |
| `frontend/package.json` | `test:voice` extended (3 new files) + `node_modules` symlink for ESM bare imports in test output |
| `project_management/epics/EPIC_013_ASSISTANT_AUDIO_INTERFACE/SW-REQ-013-04_AUDIO_FEEDBACK_I18N.md` | Input half finalized (5 shall statements) |

### APIs / Contracts Defined

**`frontend/src/voice/voiceCircle.ts`**: `voiceCircleStyle(level, state, direction='input', reducedMotion=false): VoiceCircleStyle` (`scale/opacity/background/boxShadow`)
**`frontend/src/voice/voiceCopy.ts`**: `resolveVoiceErrorCopy(appText, code): string` (11 codes + fallback)
**Controller additions**: `isVoiceCaptureActiveState(state)`, `readInputLevel()`, `createStreamLevels` dep
**`audioLevel.ts`**: `createMicrophoneLevelSource(stream): StreamLevelSource | null`
**Copy keys**: `appText.voice.*` (15 keys); translator table in §4 handoff below.

---

## 2. Key Decisions

| Decision | Rationale |
|----------|-----------|
| No global toast framework; header-inline `role="status"` note + transcript note | Repo has no toast system (only a widget-local stage toast); a framework would be scope creep. The two surfaces satisfy "toast + note" (top-bar + transcript) with existing patterns. |
| Mic moved out of the filters cell into `terminal-cell--voice` | Mobile collapse (`display:none` on the filters cell) hid the mic — violating "always visible". New cell is never collapsed; desktop grid row 3. |
| Circle self-animates inside `InputLevelCircle` | 20 Hz `setLevel` re-renders stay inside the circle component; App never re-renders for animation (kiosk jank avoidance). |
| Keyboard suppression via ref, `focusin` only | The `focusin` effect mounts once (stale closure) → `voiceCaptureActiveRef` synced per render. `focusout` clearing untouched; idle behavior byte-identical. |
| Static-markup render tests via `react-dom/server` | No DOM harness in repo; `renderToStaticMarkup` genuinely asserts per-state markup/labels/PII-absence in Node. Animation-rate behavior is closer-verified. |
| `test:voice` symlinks `node_modules` into test output | Compiled tests are ESM (nearest `package.json` has `type: module`); ESM ignores `NODE_PATH`, so bare `react` imports need a real lookup path. One `ln -sfn` line, git-ignored dir. |
| English default ellipsis fixed to ASCII | `Working…` → `Working...` to honor the file-wide ASCII convention (caught while wiring props). |

---

## 3. Gate Results

| Gate | Result | Notes |
|------|--------|-------|
| Pre-check build (Task 0.2) | ✅ | exit 0 (TC-A-02 handoff) |
| Pre-check lint (Task 0.2) | ✅ | 48 errors / 14 warnings baseline |
| Pre-check unit (Task 0.2) | ✅ | 50/50 voice tests |
| Post-implementation build (Task 6) | ✅ | `npm --prefix frontend run build` exit 0, 0 errors |
| Post-implementation lint (Task 6) | ✅ | 48 errors / 14 warnings — identical to baseline, 0 new (1 interim `set-state-in-effect` fixed via lazy initializer) |
| Post-implementation unit (Task 6) | ✅ | `npm --prefix frontend run test:voice`: 65 tests, 65 pass, 0 fail (50 + 15 new) |
| Coverage vs baseline | ✅ | All new modules covered (style, copy, keys, render, stream-levels, active-states) |

## 3.5 Logger Evidence (mandatory)

| Item | Evidence |
|------|----------|
| Event names and allow-listed fields | No new log events; error states are returned values + UI copy, never logs |
| Request/user/session propagation | N/A — no request path touched |
| Redaction/no-secret tests | `inputCircle.test.tsx` asserts no `Float32`/`base64` in markup; `data-voice-level` is a 2-decimal scalar; circle props typed scalar-only |
| Sink and failure behavior | N/A — no sink added |
| Audit/metrics separation | N/A |

---

## 4. Handoff for TC-A-04 (TC-A Closer)

**Entry point**: `frontend/src/voice/` (`voiceCircle.ts`, `InputLevelCircle.tsx`, `voiceCopy.ts`) + `App.tsx` voice cell (~line 3700) + `App.css` voice rules.

**What was built** (contracts + example):
- Circle: `<InputLevelCircle readLevel={...} active={state==='listening'} captureState={...} label={...} />` — self-animated; style math in `voiceCircleStyle(level, state, direction, reducedMotion)`. Output circle (TC-B-02) reuses with `direction='output'`.
- Error taxonomy (code → surfaces): `denied|no-device|model-missing|transcribe-failed|submit-failed|too-long|empty|busy|aborted|unsupported|decode-failed` → `resolveVoiceErrorCopy(appText, code)` → header `p[role=status].terminal-voice-note` + panel `voiceNote`. Unknown codes fall back to `errorTranscribeFailed`.
- Keyboard rule: `isVoiceCaptureActiveState(state)` gates the App `focusin` handler via `voiceCaptureActiveRef`; suppression scope = voice-active only.
- Copy-key table for translators (`appText.voice`, 15 keys): micLabel/stopLabel/workingLabel/unsupportedLabel + errorDenied/errorNoDevice/errorModelMissing/errorTranscribeFailed/errorSubmitFailed/errorTooLong/errorEmpty/errorBusy/errorAborted/errorUnsupported/errorDecodeFailed — en/de/fr/es shipped, ASCII-only.
- Live levels: controller `createStreamLevels` wired to `createMicrophoneLevelSource` — silence auto-stop is now LIVE (no longer hard-cap only).

**Key decisions/deviations**: no toast framework (documented above); mic cell moved for mobile persistence; symlink in test script; ASCII ellipsis fix.

**Known limitations/edge cases**: Safari analyser quirks unverified on target hardware (`createMicrophoneLevelSource` returns null → graceful fallback); static render tests assert markup, not animation timing; collapsed-mobile header verified by CSS rule, not device test.

**Open risks for closer verification**: visual review of circle/button (transit language fit); device test (touch, permission UX, safe-area); coverage of `focusin` suppression (build-verified wiring, needs browser proof in SYS3 smoke).

**Run tests**: `npm --prefix frontend run test:voice` from repo root (65/65 green).

---

## ⚠️ Known Issues / Limitations (if any)

1. **Animation timing browser-only** — pulse rate asserted by math tests, not wall-clock.
2. **No-device copy untested on hardware** — fallback path unit-covered (`supported=false` renders disabled button).

---

## Traceability

| Level | ID | Artifact |
|-------|-----|---------|
| SYS1 | SYS1-013 | Epic: EPIC_013_ASSISTANT_AUDIO_INTERFACE.md |
| SWE1 | SWE1-A | TC: TC-A-00_COMPONENT_DEFINITION.md |
| SWE3 | SWE3-A-03 | Issue: TC-A-03_INPUT_CIRCLE_ERRORS_KEYBOARD_I18N.md |
| SWE4 | — | Tests: `voiceCircle.test.ts`, `voiceCopy.test.ts`, `inputCircle.test.tsx` (+2 capture additions) |

---

## Self-verification (no-reviews mode)

| Gate | Command (repo root) | Exit | Result |
|------|---------------------|------|--------|
| D1 Lint (mandatory) | `npm --prefix frontend run lint` | 1 (pre-existing) | ✅ 48/14 = baseline, 0 new |
| D2 Typecheck/build | `npm --prefix frontend run build` | 0 | ✅ 0 errors |
| D3 Tests | `npm --prefix frontend run test:voice` | 0 | ✅ 65/65 pass |
| D4 Smoke through the wiring | bundle grep `voice-circle--` + `terminal-cell--voice` in `frontend/dist` | 0 | ✅ circle + persistent cell compiled into production bundle; header chain (cell → button + note) verified in source. Live-mic runtime smoke belongs to closer TC-A-04. |
| D5 Self-checklist | — | — | ✅ every file maps to SW-REQ-013-04-input; `main.tsx` unaffected; assistant API unchanged; `WidgetBoardHost`/panel changes additive-optional; no `any`/`eslint-disable`; no secrets/PII (markup test); mobile collapse fixed, not worked around |

Requirement → `file:line` → test → status:
- Circle scalar/animated/reduced-motion → `voiceCircle.ts` + `InputLevelCircle.tsx` → `voiceCircle.test.ts` (6) + `inputCircle.test.tsx` (2) → ✅
- Error taxonomy both surfaces → `voiceCopy.ts` + App cell + panel `voiceNote` → `voiceCopy.test.ts` (5: mapping, fallback, board-language) → ✅
- Keyboard suppression → App `focusin` + `isVoiceCaptureActiveState` → active-state truth-table test + build proof → ✅
- 4-language copy → `appText.ts` voice section → key-coverage + ASCII tests (2) → ✅
- Mobile persistence + touch → `App.css` cell + 44 px rule → bundle proof → ✅ (device proof deferred to closer)
- Live silence levels → controller `createStreamLevels` + `createMicrophoneLevelSource` → stream-level/dispose test → ✅

Wiring chain: header `.terminal-marquee` → `terminal-cell--voice` (persistent) → `VoiceMicButton` + `InputLevelCircle` + `role=status` note → hook/controller → analyser sampler → transcript note via `assistantState.voiceNote` → `WidgetBoardHost` → `AssistantDetailPanel`.

Residual risks / limitations / open questions: see Handoff + Known Issues (visual review, device test, animation timing, Safari analyser).

Independent review intentionally omitted — TC-A is declared `no-reviews`; gap analysis is inherited by the TC closer (TC-A-04).
