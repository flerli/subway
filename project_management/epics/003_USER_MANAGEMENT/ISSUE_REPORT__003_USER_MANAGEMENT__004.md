# ISSUE REPORT

## Epic

003 USER MANAGEMENT

## Issue

004 HERO PAGE AND AUTHENTICATED APP SHELL

## Implementation Summary

The frontend authentication shell was implemented across `frontend/src/App.tsx`, `frontend/src/App.css`, and new API helpers under `frontend/src/api/`.

The app now distinguishes three frontend auth states:

- bootstrapping
- unauthenticated
- authenticated

Frontend behavior delivered in this issue:

- the app bootstraps through `GET /api/auth/session` before rendering protected application data
- visitors without a valid session now see a hero page instead of the board or settings UI
- the hero page includes a minimal username/password login form
- successful login transitions directly into the authenticated application shell
- authenticated users can log out from the top bar
- expired or invalid sessions detected through protected API calls now return the user to the hero page

Implementation details:

- added `frontend/src/api/request.ts` as the shared auth-aware request layer
- added `frontend/src/api/auth.ts` for current-session lookup, login, and logout calls
- protected API modules now throw a dedicated auth-required error when the backend returns `401`
- `App.tsx` catches that auth-required error and switches back to the unauthenticated state instead of leaving partial stale UI on screen
- the new hero and loading screens reuse the existing subway visual language instead of introducing a separate design system

To align the authenticated shell with the backend ownership model, the frontend also stopped falling back to seeded member and widget data after login. That means a newly created user with empty backend datasets now remains visually empty instead of inheriting the seeded frontend defaults.

## Notes For Next Work

The full Epic 003 user-management flow is now complete.

If later work introduces manual user administration on the frontend, it should reuse the existing session bootstrap and auth-required request helper instead of adding a second auth flow.

## Validation

Validated with a production frontend build:

- `npm --prefix frontend run build`

The build passed after integrating:

- auth bootstrap state handling
- hero/login view rendering
- logout affordance
- auth-aware API request handling
- empty-user frontend data behavior

Backend auth and route-protection behavior had already been validated in Issues 002 and 003, so this issue focused on frontend integration and compile-time verification.