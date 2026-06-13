# ISSUE REPORT

## Epic

004 MULTI LANGUAGE SUPPORT

## Issue

003 WIDGET TRANSLATION STANDARD AND EXISTING WIDGET MIGRATION

## Implementation Summary

Issue 003 introduced the standardized widget-local translation pattern and migrated the currently active widgets onto it.

Implemented foundation work:

- added `frontend/src/widgets/widgetLocalization.ts` as the shared widget-localization helper layer
- extended `frontend/src/widgets/widgetTypes.ts` with widget translation definitions and widget-local settings text definitions
- added a standardized `translations.ts` file inside each migrated widget folder:
  - `arrival-board`
  - `weather`
  - `calendar`
  - `todo`
  - `bulletins`

Implemented widget-contract changes:

- each migrated widget module now exposes a widget-local translation resolver through the widget contract
- widgets can declare whether a persisted title still matches one of their default translated titles, which allows the UI to show translated default widget titles without overwriting user-custom titles blindly
- localized widget settings definitions are now derived from widget-local translations instead of keeping widget-owned field labels, placeholders, titles, and descriptions hard-coded in shared hosts

Implemented widget migration work:

- `arrival-board` now resolves its board kicker, arrival titles, board-side labels, and empty state through its widget-local translation file
- `weather` now resolves widget title ownership, forecast kicker ownership, settings fields, status labels such as `live` and `cached`, `Updated` labels, refresh countdown text, and fallback weather copy through its widget-local translation file
- `calendar` now resolves its widget title, upcoming-events meta copy, empty state copy, fallback agenda item copy, and settings labels through its widget-local translation file
- `todo` now resolves its widget title, open-items meta copy, `Done` and `Reopen` action labels, empty state copy, fallback todo item copy, and settings labels through its widget-local translation file
- `bulletins` now resolves its widget title, board meta copy, and empty state copy through its widget-local translation file

Shared host integration delivered in this issue:

- `frontend/src/widgets/WidgetBoardHost.tsx` now renders widget-owned static copy from each widget's translation contract
- `frontend/src/widgets/WidgetMetadataAdminHost.tsx` now renders localized widget settings labels and localized default widget titles in the metadata administration surface
- `frontend/src/widgets/WidgetSettingsHost.tsx` now renders localized widget settings titles, descriptions, field labels, and board kickers
- `frontend/src/widgets/WidgetDebugOverlay.tsx` now resolves localized default widget titles when a widget is still using its default name
- the old static widget `boardKicker` ownership in `frontend/src/widgets/widgetRegistry.ts` was removed so widget presentation copy now comes from the widget folders themselves

Implementation boundary preserved:

- dynamic household content such as arrivals, news headlines, todo task text, calendar event content, and commute notes was intentionally left untouched because this epic was scoped to static UI copy only
- widget-owned copy that still lives inside future or inactive widget surfaces remains outside this issue until those widgets are integrated or explicitly scheduled

## Notes For Next Work

Issue 004 can stay focused on documentation and workflow guidance because the active widget implementation contract is now in place.

If later widgets are added, their `index.ts` files should expose widget-local translations through the same widget contract and ship a `translations.ts` file from the start.

## Validation

Validated with:

- `npm --prefix /Users/flerli/01_Swaibian/Swaibian-Main_Office/05_Products/subway/frontend run build`
- `docker compose up --build -d frontend`
- scripted browser verification with Playwright against `http://127.0.0.1:8081`

The browser validation confirmed this concrete language-switch behavior:

- English board view showed widget titles `Weather`, `Calendar`, `Todo`, and `Bulletins`
- English arrival-board copy showed `All household arrivals`
- English todo action copy showed `Done`
- after switching to German, the metadata host showed localized widget titles `Ankunftstafel`, `Wetter`, `Kalender`, `Aufgaben`, and `Meldungen`
- after switching to German, weather settings fields showed localized labels such as `Bezeichnung fuer Ort 1`, `Laengengrad von Ort 1`, and `Breitengrad von Ort 1`
- after switching to German, the board view showed localized widget titles `Wetter`, `Kalender`, `Aufgaben`, and `Meldungen`
- after switching to German, arrival-board copy showed `Alle Haushaltsankuenfte`
- after switching to German, todo action copy showed `Erledigt`
- switching back to English restored the shared shell to `Settings`