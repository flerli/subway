# ADR-002: Supertonic-3 TTS Bridge + Per-User Keyed Cache

**Status**: Accepted
**Date**: 2026-09-21  |  **Issue**: SWE3-B-04 (TC-B closer)  |  **V-Model**: SWE2

## Context

Local speech synthesis on a Node backend needs a Python/ONNX runtime
(Supertonic-3), a disciplined process boundary, and a cache so repeated
answers don't re-synthesize. The install is ~400 MB of weights, and the
kiosk NDoe process must never block on a hung helper.

## Decision

- A helper CLI (`backend/tts_helper/tts_helper.py`) owns model loading and
  synthesis; it speaks exactly ONE JSON document on stdout and puts
  tracebacks/diagnostics on stderr.
- `backend/voice/ttsBridge.mjs` owns the process boundary: 120 s timeout
  with TERM→KILL escalation, capped stdout/stderr buffers, strict JSON
  parsing (traceback-polluted stdout is rejected, never trusted), and a
  60 s probe TTL that never caches failures permanently.
- `backend/voice/voiceCache.mjs` caches WAV per user on disk keyed
  `SHA256(sdk|text|voice|lang)`, evicted by age (7 d) and total size
  (500 MB), oldest-first; raw text never appears in paths; user scopes are
  traversal-sanitized.
- `POST /api/voice/synthesize` and `GET /api/voice/samples/:voice` share one
  cache-first pipeline; `GET /api/voice/status` reports readiness truthfully.
- Model weights resolve via `TTS_MODEL_DIR` (env) or the helper default
  `~/.cache/supertonic3`; production always passes `--offline` (runtime
  downloads forbidden). Docker staging is a documented follow-up.

## Alternatives

| Alt | Pros | Cons | Why Rejected |
|-----|------|------|-------------|
| Browser-only WASM TTS | No backend | No voice parity; not in the tech doc | Rejected in discovery |
| Direct `supertonic` import in `server.mjs` | One process | Blocks/freezes the Node event loop; no isolation; unmanageable stdout discipline | Rejected: kiosk availability |
| In-process cache only | Simpler | Re-synthesis on restart; no cross-user eviction | Rejected: latency |

## Consequences

- Positive: hung/unruly helpers cannot take down the backend; cache hits
  serve in ~30 ms; per-user cache isolation + eviction proven by tests
  (40 backend tests incl. two-session isolation on a temp DB).
- Negative: helper spawn startup cost (~0.6 s load), first synthesis latency
  (~1.5–3 s); model weights must be staged into Docker images (follow-up).
- Risks: system `python3` + `supertonic` availability at runtime — the
  probe reflects it truthfully and routes fail closed (503) with repair copy.