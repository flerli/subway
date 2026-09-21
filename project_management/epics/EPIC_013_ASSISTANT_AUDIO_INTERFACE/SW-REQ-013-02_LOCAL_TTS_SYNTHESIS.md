# SW-REQ-013-02: Local TTS Synthesis + Playback Source

**Epic**: E-013 (`project_management/epics/EPIC_013_ASSISTANT_AUDIO_INTERFACE.md`)
**V-Model**: SWE1 (owned by TC-B; written by SWE3-B-01)
**Status**: ✅ Defined
**Last Updated**: 2026-09-21

## Requirement

Assistant answers are synthesized locally (Supertonic-3) through a disciplined
helper process and delivered as MP3 for playback — offline, per-user isolated,
fail-closed.

## Shall Statements

1. Synthesis SHALL run via `backend/tts_helper/tts_helper.py`
   (`supertonic==1.3.1`, preset voices M1–M5/F1–F5, 31 langs + `na`),
   spawned per request by the backend with a 120 s timeout and TERM→KILL
   escalation, capped stdout/stderr buffers, and `--model-dir` + `--offline`
   in production. Runtime downloads are forbidden.
2. The helper SHALL speak exactly one JSON document on stdout
   (`{"ok": true, ...}` / `{"ok": false, "error": ...}`); tracebacks and
   diagnostics go to stderr only and are never trusted as results.
3. `GET /api/voice/status` SHALL report readiness truthfully (SDK import,
   pinned version, model files, installed voices); all `/api/voice/*` routes
   SHALL require cookie-session auth (global `/api/*` gate) with per-user
   cache separation.
4. `POST /api/voice/synthesize` SHALL validate text (1–1000 chars), voice
   (preset enum), and language (known or `na` fallback); SHALL serve keyed cache hits (`SHA256(sdkVersion|text|voice|lang|speed)`) and synthesize misses;
   SHALL fail closed (401 unauthenticated, 400 invalid, 503 engine down,
   504 timeout, 500 unexpected) without logging text, audio, or secrets.
5. Disk cache SHALL live per user under `backend/data/voice-cache/`,
   evicted by age (7 days) and total size (500 MB), oldest first; raw text
   SHALL never appear in file names.
6. Synthesis SHALL honor a speaking-speed multiplier (0.75–1.5, default 1.2 = 15% faster than the SDK's 1.05 baseline); speed is part of the cache key so each speed is its own cached rendering.
7. The frontend client (`synthesizeVoice`) SHALL return playable
   `data:audio/mpeg` + `durationMs`, parsing only verified WAV (PCM/float,
   any rate/channel → mono) and encoding 64 kbps mono MP3 in 1152-sample
   frames — never labeling non-audio as MP3.

## Verification

- SWE4 unit: helper contract (incl. real-weights conditional), bridge
  (timeout/caps/purity), cache (keys/eviction/isolation), codec (WAV
  variants/MP3 math) — `npm --prefix backend run test:voice`,
  `npm --prefix frontend run test:voice`.
- SWE5 integration (TC-B-04): answer → strip → chunk → synthesize → playback
  queue; prefs isolation.
- SYS3 smoke (TC-B-04): full voice loop on hardware.

## Model Distribution (decision TC-B-01)

Weights resolve via `TTS_MODEL_DIR` (env) or the helper default
(`~/.cache/supertonic3`); `--offline` is always passed in production.
Vendoring ~400 MB into git/Docker is explicitly deferred — Docker builds
must stage weights at image-build time (follow-up), never download at
runtime. Verified live on this machine (supertonic 1.3.1, RTF ≈ 0.4).
