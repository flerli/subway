# ISSUE REPORT

## Epic

003 USER MANAGEMENT

## Issue

003 USER-SCOPED API ENFORCEMENT AND DATA MIGRATION

## Implementation Summary

Backend route protection and user-scoped enforcement were completed in `backend/server.mjs`.

The temporary fallback introduced in Issue 002 was removed. Protected application routes no longer fall back to the seeded `flerlage` account when the request has no valid session.

Implementation details:

- every non-auth `/api/*` route now requires a valid authenticated session
- requests with no valid session receive `401 Authentication required`
- requests with stale or invalid session cookies also receive `401` and the backend clears the cookie
- protected reads continue to use the authenticated session user id as the ownership filter
- protected writes continue to attach or verify the authenticated session user id through the existing ownership-aware helpers

This means the following backend routes are now protected:

- family members
- widgets
- widget settings
- calendar events
- todo items
- weather

The weather route is intentionally protected even though it fetches external live data, because the request is still part of the authenticated application surface and later user-owned widget configuration depends on that user context.

The data migration requirement was already satisfied by Issue 001. Existing persisted data remains assigned to the seeded `flerlage` account, while newly created manual or admin-created users start with empty datasets.

## Notes For Next Issue

Issue 004 should now add the frontend behavior required to handle the enforced backend protection cleanly.

That means:

- use `GET /api/auth/session` during app bootstrap
- show the unauthenticated hero and login UI instead of letting the current app shell run into protected-route `401` responses
- switch into the authenticated app shell only after the session is confirmed or login succeeds

Until Issue 004 is implemented, loading the current frontend without a valid session will naturally hit backend `401` responses for protected application data.

## Validation

Validated by starting the backend and exercising the protected routes and ownership boundaries:

- unauthenticated requests to `family-members` and `weather` return `401`
- stale session cookies return `401` and are cleared by `Set-Cookie`
- authenticated `flerlage` requests still receive the migrated household dataset
- a manually created second user can authenticate but starts with empty `family-members`, `widgets`, `widget-settings`, `calendar-events`, and `todo-items`
- that second user cannot patch `flerlage` widget records by guessing ids
- writes created by the second user stay isolated to that user and do not appear in the `flerlage` dataset