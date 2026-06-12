# DEVELOPER TEAM RULES

## Before implementing the issue

- Read the codebase in `/src` first in order to understand the existing implementation.
- Read the original `ISSUE_DEFINITION` document at `/project_management/epics/<path to issue definition>`.
- Read the `ISSUE_REPORT` of the previous issue if it exists.

## After implementing the issue

- Document the concrete implementation choices in an `ISSUE_REPORT` for this issue in order to inform a proceeding developer about the work.
- Update `/project_management/EPIC_OVERVIEW.md` by changing the status of the current issue.

## Repository issue metadata

- GitHub repository label: `type/feature`

# ISSUE DEFINITION

## Epic

003 USER MANAGEMENT

## Issue Title

002 PASSWORD AUTH AND PERSISTENT SESSIONS

## Issue Description

Add a password-based authentication layer for pre-created users and persist sessions so the application can identify the current user across reloads, browser restarts, and parallel logins from multiple machines. This issue introduces the actual login credential flow on top of the user model defined in the previous issue.

Clarified scope decisions already fixed for this issue:

- The seeded initial user shall be `flerlage`.
- The bootstrap password for that user shall be `xupjo0-hyhdoF-tovsuc`.
- A user stays logged in until manual logout.
- Multiple simultaneous sessions for the same account across different machines are allowed.
- Session-management UI beyond login and logout is out of scope.

## Previous Issue Within The Epic

001 USER ACCOUNT AND OWNERSHIP FOUNDATION

## Functional Requirements

1. Pre-created users shall be able to authenticate with username and password.
2. The system bootstrap or migration path shall ensure the initial user `flerlage` exists with the specified bootstrap password.
3. Passwords shall be stored only as secure hashes and shall never be persisted or returned in plaintext after initial seeding.
4. A successful login shall create a persistent authenticated session bound to the user account.
5. The authenticated session shall survive page reloads and browser restarts until the user explicitly logs out or the session is administratively invalidated.
6. The same user account shall be allowed to hold multiple concurrent active sessions across multiple machines.
7. Logging out from one machine shall invalidate only the current session and shall not force-logout other active sessions for the same account.
8. Failed login attempts shall return a generic authentication failure response without exposing whether the username or password was incorrect.

## Involved Modules

- Model:
  password-hash storage, session persistence, seeded user bootstrap data
- View:
  no main user-facing view work is required in this backend-focused issue
- Controller:
  login endpoint, logout endpoint, current-session bootstrap endpoint, cookie or token session handling

## Implementation Plan

1. Add persistent session storage keyed to user accounts and capable of holding multiple active sessions per user.
2. Implement backend authentication endpoints for login, logout, and current-session lookup.
3. Add secure password hashing and verification for pre-created users.
4. Seed or migrate the initial `flerlage` user idempotently while storing only the resulting password hash.
5. Configure the session transport so browsers can restore the authenticated user after reload and restart without re-entering credentials.

## Test Cases

1. Logging in with `flerlage` and the bootstrap password succeeds.
2. Logging in with an incorrect password fails with a generic authentication error.
3. The seeded `flerlage` user is not duplicated when the server starts more than once.
4. Reloading the browser with an active session keeps the user authenticated.
5. Two separate machines or browser profiles can stay logged in to the same account at the same time.
6. Logging out on one machine does not invalidate the same account on another machine.