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

003 USER-SCOPED API ENFORCEMENT AND DATA MIGRATION

## Issue Description

Protect the backend so all application data is resolved through the authenticated user context instead of the current global dataset. This issue also migrates the already existing SQLite data into the seeded `flerlage` account so the current installation keeps its content while future users remain isolated.

Clarified scope decisions already fixed for this issue:

- All application data and application API routes are protected behind login, except the auth and hero-entry routes required to become logged in.
- Existing data shall be assigned to `flerlage` rather than copied into every future account.
- Future manually or admin-created users shall start empty and shall not receive cloned sample records.

## Previous Issue Within The Epic

002 PASSWORD AUTH AND PERSISTENT SESSIONS

## Functional Requirements

1. Every protected backend route shall require an authenticated user context before returning application data.
2. Every read operation against protected data shall filter by the authenticated user's id.
3. Every create, update, and delete operation against protected data shall attach or verify the authenticated user's ownership and reject cross-user access.
4. The existing persisted dataset shall be assigned exactly once to the seeded `flerlage` user during bootstrap or migration.
5. No authenticated user shall be able to access another user's data by guessing record ids, omitting filters, or calling a route directly.
6. Routes that combine live external data with user-owned configuration, such as widget-driven data endpoints, shall still require authentication.
7. Future users created outside public signup shall start with empty data and shall not inherit `flerlage` records.

## Involved Modules

- Model:
  ownership backfill logic, protected table migration, route-level ownership constraints
- View:
  error-handling expectations for unauthorized frontend requests
- Controller:
  auth guards, user-scoped query filters, create and update ownership checks, migration bootstrap flow

## Implementation Plan

1. Add a reusable backend auth guard that resolves the current user for protected routes.
2. Update all data queries and mutations so they operate on user-owned rows instead of global rows.
3. Backfill the current family members, widgets, widget settings, calendar events, and todo items to the seeded `flerlage` user.
4. Ensure protected routes fail consistently for missing or invalid sessions.
5. Verify that routes backed by live external services still resolve through authenticated, user-owned settings and metadata.

## Test Cases

1. An unauthenticated request to any protected application route is rejected.
2. An authenticated user receives only rows owned by that user from family member, widget, calendar, todo, and widget-settings routes.
3. An authenticated user cannot update or delete a record owned by another user.
4. The existing SQLite dataset remains available after migration because it is assigned to `flerlage`.
5. A newly created user account starts with empty datasets instead of copied sample data.
6. Weather or other externally sourced widget routes still work only after authentication.