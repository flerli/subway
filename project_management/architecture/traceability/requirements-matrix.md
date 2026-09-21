# Requirements Matrix

> `Last updated by: SWE3-B-04` (2026-09-21, TC-B rows verified — all E-013 SW-REQs ✅)

| SYS1 (Epic) | SWE1 (TC) | SW-REQ | SWE3 (Issue) | SWE4 (Unit Tests) | SWE5 (Integration Tests) | Status |
|---|---|---|---|---|---|---|
| SYS1-013 | SWE1-A | SW-REQ-013-01 (voice capture + STT; written SWE3-A-01, refined SWE3-A-02) | SWE3-A-01…04 | `frontend/src/voice/__tests__/` (PCM, vocab, STT, controller) | `capture.integration.test.ts` (SWE3-A-04: real decode/vocab/singleton seams) | ✅ |
| SYS1-013 | SWE1-A | SW-REQ-013-04-input (circle/errors/keyboard/i18n; finalized SWE3-A-03) | SWE3-A-03…04 | circle/copy/keys/render/predicate tests | error→copy chain + taxonomy paths (SWE3-A-04) | ✅ |
| SYS1-013 | SWE1-B | SW-REQ-013-02 (synthesis + playback; written SWE3-B-01) | SWE3-B-01/02/04 | helper/bridge/cache/codec/strip/chunk tests | `synthesis.integration.test.ts` (SWE3-B-04: real strip→chunk→client chain, network-boundary fake) | ✅ |
| SYS1-013 | SWE1-B | SW-REQ-013-03 (voice prefs; drafted SWE3-B-01, finalized SWE3-B-03) | SWE3-B-03/04 | store/guard + api validation via routes | `isolation.test.mjs` (SWE3-B-04: two-session denial, real server + temp DB) | ✅ |
| SYS1-013 | SWE1-B | SW-REQ-013-04-output (output circle/errors/i18n; finalized SWE3-B-02) | SWE3-B-02/03/04 | playback/render/copy tests | synthesis integration + store-guard chain | ✅ |
