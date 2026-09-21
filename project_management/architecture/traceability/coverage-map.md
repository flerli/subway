# Coverage Map

> `Last updated by: SWE3-B-04` (2026-09-21, TC-B verified — E-013 fully covered)

| SW-REQ | Unit coverage | Integration coverage | Smoke | Notes |
|--------|---------------|---------------------|-------|-------|
| SW-REQ-013-01 | PCM, vocabulary, STT-mocked, auto-stop, controller states (105 voice tests) | capture path incl. real decode/vocab/singleton seams + leak fix (`capture.integration.test.ts`) | SYS3 capture FALLBACK (SWE3-A-04): stack boots, bundle serves voice UI; live-mic HIGH gap for target HW | No repo-wide runner; voice suites are the module suites |
| SW-REQ-013-04-input | circle style/render, copy mapping, 15×4 key coverage, ASCII, active-state predicate, button states | error→copy chain (model-missing en/de), decode-empty seam | Visual/device proof deferred (HIGH gap, target HW) | — |
| SW-REQ-013-02 | helper contract (incl. real-weights synth), bridge timeout/caps/purity, cache keys/eviction, WAV→MP3 codec, strip/chunk | `synthesis.integration.test.ts` (real strip→chunk→client chain; 503→unavailable; non-WAV rejected) + live route smoke (status/synth RIFF/cacheHit) | SYS3 full-loop smoke (SWE3-B-04): status available, synth RIFF, prefs roundtrip, sample RIFF on dev stack | — |
| SW-REQ-013-03 | store clamp/subscribe/guard-integration; route 401/roundtrip/400s | `isolation.test.mjs` (two-session denial on temp DB) | SYS3 prefs persistence (SWE3-B-04) | — |
