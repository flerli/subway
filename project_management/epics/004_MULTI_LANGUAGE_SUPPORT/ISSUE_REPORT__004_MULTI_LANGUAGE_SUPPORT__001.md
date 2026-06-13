# ISSUE REPORT

## Epic

004 MULTI LANGUAGE SUPPORT

## Issue

001 SHARED LOCALIZATION FOUNDATION AND LANGUAGE SETTING

## Implementation Summary

The multilingual foundation was implemented across the backend persistence layer, new frontend localization helpers, and the main application shell.

Implemented backend work:

- added a dedicated `app_preferences` table in `backend/server.mjs`
- added authenticated `GET /api/app-preferences` and `PATCH /api/app-preferences` routes
- persisted one `language_code` per authenticated user so the selected language survives reloads and multiple devices
- normalized invalid stored language values back to the deterministic default `en`

Implemented frontend foundation work:

- added `frontend/src/i18n/localization.ts` as the shared localization contract for supported languages, fallback handling, interpolation, and future widget translation files
- added `frontend/src/i18n/appText.ts` as the shared application translation file for non-widget texts
- added `frontend/src/api/appPreferences.ts` for authenticated language-preference loading and persistence

Implemented application-shell integration:

- `frontend/src/App.tsx` now bootstraps the authenticated user's language preference before entering the protected shell
- if the stored language preference cannot be loaded, the shell falls back to English and shows a frontend warning instead of breaking
- the settings page now includes a global language selector backed by the new app-preferences API
- the auth bootstrap screen, auth entry screen, authenticated loading screen, top shell navigation, and the primary family-settings shell copy now resolve through the shared application translation file

Implementation notes:

- a dedicated app-preferences model was used instead of reusing widget settings because language is application-wide state, not widget-owned state
- the selector was implemented in this issue as the smallest complete user-facing surface for choosing and persisting the global language
- because the selector and the first shared-shell text migration shipped in issue 001, issue 002 was narrowed to the remaining shared application copy and shared-host localization work

## Notes For Next Work

Issue 002 should finish the remaining untranslated shared application copy, especially host-level administration and widget-settings surfaces that still render hard-coded English text.

Issue 003 can then migrate widget-owned static strings onto widget-local `translations.ts` files using the shared localization contract introduced here.

## Validation

Validated with:

- `node --check backend/server.mjs`
- `npm --prefix /Users/flerli/01_Swaibian/Swaibian-Main_Office/05_Products/subway/frontend run build`

The backend syntax check passed and the frontend production build passed after integrating:

- app-preferences persistence
- shared localization helpers
- shared application translation file
- authenticated language bootstrap
- settings-page language selection