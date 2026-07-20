# ISSUE REPORT

## Epic

010 AI ASSISTANT PLATFORM

## Issue

003 PERSISTENT AGENT CHAT SECTION AND STREAMING THREADS

## Implementation Summary

The authenticated assistant section in `frontend/src/App.tsx` was expanded from a read-only thread browser into a usable chat surface with prompt composition, optimistic transcript rendering, persisted conversation continuation, and streamed assistant reply playback.

The assistant frontend now includes:

- a thread-aware message composer inside the transcript panel
- optimistic local user-message rendering while a turn is in flight
- explicit turn states for idle, sending, streaming, completed, and failed
- disabled send behavior when no thread is selected or no working assistant route is available
- localized assistant-owned shell, composer, status, and role-label copy in English, German, French, and Spanish

The frontend assistant API client in `frontend/src/api/assistant.ts` now supports:

- standard message execution through `POST /api/assistant/threads/:threadId/messages`
- streamed message execution parsing from an NDJSON response
- normalized assistant turn payloads for thread, user message, assistant message, runtime route metadata, and token-usage metadata

The backend in `backend/server.mjs` now supports a streamed assistant delivery mode on the same message-execution endpoint.

When `stream: true` is requested and the route allows streaming, the backend now:

- executes the persisted assistant turn through the normalized runtime from issue 002
- emits a `started` event with thread, user message, and runtime metadata
- emits incremental `chunk` events for the assistant reply
- emits a final `complete` event with the persisted assistant message payload

This keeps the transport contract stable for the frontend while preserving the issue 002 persistence model.

For routes that do not support backend streaming, the frontend still presents incremental assistant output by replaying the final assistant response into the transcript before committing the persisted message payload. This preserves the streamed user experience while staying compatible with capability-limited routes.

## Notes For Next Issue

Issue 004 can build on the current transcript flow by attaching tool-call events to the same chat surface and rendering MCP execution states inline with assistant turns.

## Validation

Validated with:

- `npm --prefix frontend run build`
- `node --check backend/server.mjs`
- a mock-provider integration script that verified:
  - streamed assistant event order (`started`, `chunk`, `complete`)
  - streamed completion payload with `runtime.streaming.delivered = true`
  - persisted transcript storage after a streamed turn
