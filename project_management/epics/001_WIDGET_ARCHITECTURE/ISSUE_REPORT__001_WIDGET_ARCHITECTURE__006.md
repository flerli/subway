# ISSUE REPORT

## Epic

001 WIDGET ARCHITECTURE

## Issue

006 WIDGET SETTINGS PANELS

## Implementation Summary

Implemented a shared widget settings contract and host mechanism with backend-backed persistence for calendar, todo, and weather.

Concrete changes:

- Added a backend `widget_settings` table and API routes in `backend/server.mjs`.
- Added a frontend widget settings API client in `frontend/src/api/widgetSettings.ts`.
- Extended the widget contract in `frontend/src/widgets/widgetTypes.ts` with a shared settings definition model.
- Added a reusable settings host UI in `frontend/src/widgets/WidgetSettingsHost.tsx`.
- Added concrete settings definitions to:
  - `frontend/src/widgets/calendar/index.ts`
  - `frontend/src/widgets/todo/index.ts`
  - `frontend/src/widgets/weather/index.ts`
- Updated `frontend/src/App.tsx` so widget settings are loaded from the backend, persisted back to the backend, and passed into widget `loadData` calls.

## Implementation Choices

1. Widget settings are stored as backend-backed JSON objects keyed by `widget_id`.
2. The shared settings contract is field-driven, supporting text, number, and boolean controls.
3. Widgets that do not define `settingsDefinition` are not forced into the settings UI.
4. The settings UI is hosted inside the existing settings screen rather than adding a separate route.
5. Calendar and todo settings affect the amount/content of data rendered, while weather settings affect the external API query.

## Validation

- `npm --prefix /Users/flerli/01_Swaibian/Swaibian-Main_Office/05_Products/subway/frontend run build` passed.
- Browser validation confirmed `/api/widget-settings` returns `200` and the settings host renders 3 widget settings cards.
- Browser validation confirmed the weather widget settings save to the backend and can be reverted.
- Browser validation confirmed calendar and todo `maxItems` settings save to the backend and affect the board:
  - calendar reduced to `2 active stops`
  - todo reduced to `2 open items`
  - both were reverted to `4`

## Follow-On Notes For The Next Developer

1. Issue 008 can now build on this settings infrastructure for widget metadata administration rather than inventing a second settings pattern.
2. Weather location settings currently use direct query parameters into the backend weather route; if stronger validation is needed, add stricter backend validation there.
3. The settings host is generic enough to support more widgets later as long as they provide `settingsDefinition`.