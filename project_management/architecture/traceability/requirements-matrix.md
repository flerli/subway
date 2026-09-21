# Requirements Matrix

> `Last updated by: swaibian-architect-no-reviews` (2026-09-21, headers — rows populated by TC-A-04 / TC-B-04)

| SYS1 (Epic) | SWE1 (TC) | SW-REQ | SWE3 (Issue) | SWE4 (Unit Tests) | SWE5 (Integration Tests) | Status |
|---|---|---|---|---|---|---|
| SYS1-013 | SWE1-A | SW-REQ-013-01 (voice capture + STT; written TC-A-01) | SWE3-A-01…04 | `frontend/src/voice/__tests__/` | `capture.integration` (TC-A-04) | 🔲 |
| SYS1-013 | SWE1-A | SW-REQ-013-04-input (circle/errors/keyboard/i18n; drafted TC-A-01, finalized TC-A-03) | SWE3-A-03…04 | circle/keyboard/i18n tests | capture integration (TC-A-04) | 🔲 |
| SYS1-013 | SWE1-B | SW-REQ-013-02 (synthesis + playback; written TC-B-01) | SWE3-B-01/02/04 | helper/cache/codec/strip/chunk tests | `synthesis.integration` (TC-B-04) | 🔲 |
| SYS1-013 | SWE1-B | SW-REQ-013-03 (voice prefs; drafted TC-B-01, finalized TC-B-03) | SWE3-B-03/04 | validation/auth/panel tests | prefs-isolation suite (TC-B-04) | 🔲 |
| SYS1-013 | SWE1-B | SW-REQ-013-04-output (output circle/errors/i18n) | SWE3-B-02/03/04 | playback/i18n tests | synthesis integration (TC-B-04) | 🔲 |
