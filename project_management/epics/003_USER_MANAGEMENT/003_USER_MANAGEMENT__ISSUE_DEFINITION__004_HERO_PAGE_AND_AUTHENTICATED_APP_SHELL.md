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

004 HERO PAGE AND AUTHENTICATED APP SHELL

## Issue Description

Add the frontend authentication experience so visitors who are not logged in see a minimal hero page instead of the kiosk interface, while authenticated users are restored into the application shell automatically. This issue turns the backend auth foundation into a complete user-facing entry flow.

Clarified scope decisions already fixed for this issue:

- The unauthenticated entry experience is a minimal hero page with branding and a login call to action.
- Public signup is out of scope.
- The frontend shall restore the user's authenticated session automatically until manual logout.

## Previous Issue Within The Epic

003 USER-SCOPED API ENFORCEMENT AND DATA MIGRATION

## Functional Requirements

1. A visitor without a valid authenticated session shall see a hero page instead of the board or settings UI.
2. The hero page shall provide a login entry point for username and password.
3. The frontend shall not render protected application data until the current-session bootstrap check has determined whether the user is authenticated.
4. After a successful login, the user shall be taken into the authenticated application shell without a full manual reconfiguration step.
5. Reloading the page or reopening the browser while the session is still valid shall restore the logged-in user automatically.
6. Logging out shall return the frontend to the unauthenticated hero page and clear the current browser session state.
7. The authenticated shell shall handle expired or invalid sessions by falling back to the login state instead of leaving the board in a broken partial-data state.
8. No public signup flow, registration form, or public data view shall be introduced.

## Involved Modules

- Model:
  frontend auth-state model, current-session bootstrap state, login form state
- View:
  hero page, login form, auth-gated application shell, logout affordance
- Controller:
  session bootstrap, login submission, logout handling, protected data-fetch orchestration

## Implementation Plan

1. Introduce a frontend auth state that distinguishes bootstrapping, unauthenticated, and authenticated application states.
2. Build a minimal hero page with branding and a login call to action.
3. Add a login form wired to the backend auth endpoint.
4. Gate all protected application data loading behind successful session bootstrap or login.
5. Add logout handling that clears local auth state and returns the user to the hero page.

## Test Cases

1. Opening the app without a valid session shows the hero page instead of the board.
2. Logging in with the seeded `flerlage` account transitions from the hero page into the application shell.
3. Reloading the browser while logged in restores the authenticated application state.
4. Logging out returns the user to the hero page.
5. If the backend reports an invalid or expired session, the frontend falls back to the unauthenticated state instead of rendering protected data.
6. A second machine can log into the same account and reach the authenticated shell independently.