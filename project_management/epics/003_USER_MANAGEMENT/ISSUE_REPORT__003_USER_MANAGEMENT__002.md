# ISSUE REPORT

## Epic

003 USER MANAGEMENT

## Issue

002 PASSWORD AUTH AND PERSISTENT SESSIONS

## Implementation Summary

Password-based authentication and persistent session handling were implemented in `backend/server.mjs`.

The backend now includes a persistent `user_sessions` table with:

- stable session id
- owning user id
- unique session token hash
- created and updated timestamps

Authentication implementation details:

- login is available at `POST /api/auth/login`
- logout is available at `POST /api/auth/logout`
- current-session bootstrap is available at `GET /api/auth/session`
- successful login creates a new persistent session row for the authenticated user
- the browser receives a long-lived `HttpOnly` session cookie
- multiple concurrent sessions for the same user are supported because session rows are stored independently per login
- logout deletes only the current session row and clears only the current browser cookie

Password verification now uses the stored `scrypt` hash format introduced in Issue 001. The backend returns the same generic authentication failure message whether the username is unknown or the password is wrong.

The existing initial user bootstrap remains idempotent. The seeded `flerlage` user continues to exist exactly once and can authenticate with the configured bootstrap password.

To support a smooth transition into Issue 003, request ownership resolution now prefers the authenticated session user when a valid session cookie is present. Requests without a valid session still fall back to the temporary default owner-user context until route protection is enforced in the next issue.

## Notes For Next Issue

Issue 003 should build directly on the new auth context and remove the unauthenticated fallback from protected data routes.

That means:

- require a valid session for protected application routes
- return unauthorized responses instead of silently falling back to the seeded user
- use the authenticated session user consistently for all protected reads and writes

## Validation

Validated by starting the backend and executing the live auth flow:

- unauthenticated current-session lookup returns `authenticated: false`
- wrong password returns `401` with the generic auth error
- unknown username returns the same generic auth error
- valid login for `flerlage` succeeds and sets a persistent `HttpOnly` cookie
- current-session lookup works across repeated requests with the same cookie
- a second login creates a different concurrent session
- logout clears only the first session while the second session remains valid
- the seeded `flerlage` user still exists only once in the database