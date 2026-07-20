# ISSUE REPORT

## Epic

010 AI ASSISTANT PLATFORM

## Issue

001 CHAT DOMAIN AND ADMIN MANAGED BACKEND REGISTRY FOUNDATION

## Implementation Summary

The assistant foundation was implemented as a dedicated authenticated application section outside the widget system, backed by per-user persistence and an admin-managed backend registry in `backend/server.mjs`.

The backend now creates and serves the assistant domain through four new tables:

- `assistant_backend_routes`
- `assistant_threads`
- `assistant_messages`
- `assistant_message_events`

The first issue established:

- one active admin-managed assistant route record seeded from `ASSISTANT_BACKEND_*` environment variables
- persistent per-user assistant threads and message ownership
- authenticated assistant API endpoints for availability, thread listing, thread creation, and thread transcript loading
- assistant route capability metadata for streaming, tools, and markdown support

The frontend implementation lives in:

- `frontend/src/App.tsx`
- `frontend/src/api/assistant.ts`
- `frontend/src/i18n/appText.ts`
- `frontend/src/App.css`

The application shell now exposes a dedicated Assistant tab outside the widget board. The section renders:

- assistant availability state
- admin-managed route metadata in read-only form
- persistent per-user thread listing
- empty transcript and empty-list states for newly created conversations

Normal end users do not receive provider or model selection controls. The shell only surfaces the active admin-managed route state and the persistent conversation inventory.

## Notes For Next Issue

Issue 002 can build directly on the new persistence and route registry by adding:

- a normalized provider adapter layer
- LiteLLM-backed execution
- direct custom backend execution
- stable assistant runtime error mapping
- one backend message-execution endpoint for future chat UI work

## Validation

Validated with:

- `node --check backend/server.mjs`
- `npm --prefix frontend run build`
