# Coverage Map

> `Last updated by: swaibian-architect-no-reviews` (2026-09-21, headers — populated by TC-A-04 / TC-B-04)

| SW-REQ | Unit coverage | Integration coverage | Smoke | Notes |
|--------|---------------|---------------------|-------|-------|
| SW-REQ-013-01 | PCM, vocabulary, STT-mocked, auto-stop (TC-A-01/02) | capture path incl. thread auto-create (TC-A-04) | SYS3 capture smoke (TC-A-04) | — |
| SW-REQ-013-04-input | circle, keyboard suppression, i18n keys (TC-A-03) | error taxonomy paths (TC-A-04) | SYS3 fallback path if no mic (TC-A-04) | — |
| SW-REQ-013-02 | helper contract, cache-key, codec, strip/chunk (TC-B-01/02) | synthesis queue + failure paths (TC-B-04) | SYS3 full-loop smoke (TC-B-04) | — |
| SW-REQ-013-03 | validation, auth denial, panel (TC-B-03) | prefs isolation two-session (TC-B-04) | SYS3 prefs persistence (TC-B-04) | — |
