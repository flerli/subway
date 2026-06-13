# ISSUE REPORT

## Epic

004 MULTI LANGUAGE SUPPORT

## Issue

002 APPLICATION SHELL AND SHARED TEXT LOCALIZATION

## Implementation Summary

Issue 002 completed the remaining shared application localization work on top of the language foundation from Issue 001.

Implemented in the frontend shell:

- converted the remaining App-level warning and status messages from hard-coded English strings into stable translation keys
- localized shared filter labels and captions in the board shell
- switched the top-level board date and time formatting to the selected language locale
- kept backend-originated auth messages out of scope and mapped frontend-owned auth states onto stable translated keys

Implemented in shared host components:

- localized generic board-host controls and labels in `frontend/src/widgets/WidgetBoardHost.tsx`, including expand and collapse actions, filter-region labels, grid-region labels, and shared empty states for the expanded stage and service-board host zone
- localized widget metadata administration chrome in `frontend/src/widgets/WidgetMetadataAdminHost.tsx`, including sync states, metadata field labels, scope labels, and layout labels
- localized the hidden diagnostics overlay in `frontend/src/widgets/WidgetDebugOverlay.tsx`, including refresh labels, scope labels, failure labels, and status values
- localized the generic widget-settings host action and save-state labels in `frontend/src/widgets/WidgetSettingsHost.tsx`

Implementation details:

- the shared translation catalog in `frontend/src/i18n/appText.ts` was expanded with dedicated sections for filters, board-host chrome, widget-admin chrome, diagnostics, widget-settings host actions, and frontend-owned message keys
- `frontend/src/App.tsx` now stores shared warning and status messages as translation keys instead of already-rendered strings so visible warnings update immediately when the user switches languages
- debug health failures now carry stable message keys where the failure originates from shared frontend code, which lets the diagnostics overlay localize those failures on render

Backend integration note:

- while validating the browser-side language switch, the `/api/app-preferences` handler exposed an overly broad catch block that incorrectly masked internal route failures as `Invalid JSON body.`
- the handler in `backend/server.mjs` now distinguishes JSON parse failures from later route failures and returns a proper server-error response for the latter

Scope boundary preserved for later issues:

- widget-owned static copy inside the existing widgets was not moved into shared app text
- those widget-local strings remain in scope for Issue 003, where each widget will get its own standardized `translations.ts` file

## Notes For Next Work

Issue 003 should migrate the widget-owned English strings that still live in widget modules or widget render branches, including widget settings definitions, widget captions, widget empty states, and widget metadata/kicker ownership.

Issue 004 remains documentation and workflow work only.

## Validation

Validated with:

- `npm --prefix /Users/flerli/01_Swaibian/Swaibian-Main_Office/05_Products/subway/frontend run build`
- `docker compose up --build -d backend`
- `docker compose up --build -d frontend`
- authenticated `PATCH /api/app-preferences` through the running stack
- scripted browser verification with Playwright against `http://127.0.0.1:8081`

The runtime browser check verified this concrete sequence:

- the board host initially rendered the English shared action `Expand`
- switching the language to German updated shared metadata-host copy such as `Umfang`
- the board host then updated its shared action label to `Oeffnen` without a page reload
- switching back to English restored the shell to `Settings` and persisted the preference cleanly