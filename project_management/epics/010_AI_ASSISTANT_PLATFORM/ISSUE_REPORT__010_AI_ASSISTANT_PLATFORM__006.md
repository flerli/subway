# ISSUE REPORT

## Epic

010 AI ASSISTANT PLATFORM

## Issue

006 MULTI CONNECTION ROUTE REGISTRY AND DEFAULT SELECTION FOUNDATION

## Implementation Summary

The assistant backend foundation in `backend/server.mjs` was extended from a single active route model to a per-user multi-route registry with one default route used for newly created conversations.

The `assistant_backend_routes` persistence model now includes:

- `owner_user_id`
- `is_default`
- the previously introduced connection, capability, and stored-auth fields

The backend now backfills legacy assistant route records to the default seeded Subway user and initializes `is_default` from the previous `is_active` flag so existing databases keep working after migration.

Assistant route lookup is now owner-scoped for:

- assistant availability
- assistant settings
- route-by-id resolution
- default route resolution for new conversations
- assistant runtime execution for existing threads

New conversation creation no longer assumes one global route. `POST /api/assistant/threads` now requires one enabled and correctly configured default route for the authenticated user and persists that selected route id on the new thread.

Existing threads keep their stored `route_id` and are not reassigned when the default route changes later.

The backend also now exposes route-registry APIs that issue 007 can build on:

- `GET /api/assistant/routes`
- `POST /api/assistant/routes`
- `PATCH /api/assistant/routes/:id`
- `POST /api/assistant/routes/:id/default`
- `DELETE /api/assistant/routes/:id`

The earlier single-record assistant settings endpoint now resolves against the authenticated user's default route instead of the previous global singleton route.

## Notes For Next Issue

Issue 007 can now focus on the assistant settings UI for managing multiple saved connections, testing them, and switching the default without another backend data-model rewrite.

## Validation

Validated with:

- `node --check backend/server.mjs`

Editor diagnostics on the touched backend file were also clean after the route-registry refactor.