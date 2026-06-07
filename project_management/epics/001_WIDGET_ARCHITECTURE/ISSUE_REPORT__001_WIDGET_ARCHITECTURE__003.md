# ISSUE REPORT

## Epic

001 WIDGET ARCHITECTURE

## Issue

003 CALENDAR WIDGET SAMPLE

## Implementation Summary

Implemented the first database-backed sample widget as the calendar widget.

Concrete changes:

- Added a persistent `calendar_events` table and seed data in `backend/server.mjs`.
- Added a backend API route at `/api/calendar-events`.
- Added a calendar-specific frontend API client in `frontend/src/widgets/calendar/calendarApi.ts`.
- Implemented real `loadData` behavior in `frontend/src/widgets/calendar/index.ts`.
- Replaced the hard-coded frontend calendar sample in `frontend/src/App.tsx` with data loaded through the registered calendar widget module.

## Implementation Choices

1. Calendar events are stored in the backend SQLite database alongside the other centralized metadata.
2. Event scope is represented as a list of member ids, with `*` used for household-wide visibility.
3. The calendar widget filters the backend events according to the focused member passed into `loadData`.
4. The shared widget host continues to render the calendar widget; only the data source changed from a hard-coded array to backend-backed widget loading.
5. The existing kiosk layout and visual calendar card were preserved while the data path was replaced.

## Validation

- `npm --prefix /Users/flerli/01_Swaibian/Swaibian-Main_Office/05_Products/subway/frontend run build` passed.
- Browser validation confirmed `/api/calendar-events` returns `200` with 5 events.
- Browser validation confirmed the board renders the calendar widget through the shared host.
- Executable scope validation confirmed backend event filtering produces:
  - 5 events for `All`
  - 2 events for `family-1`
  - 2 events for `family-3`

## Follow-On Notes For The Next Developer

1. Issue 004 can follow the same pattern by replacing the hard-coded todo sample with a backend-backed widget data path.
2. Issue 005 can reuse the same widget module loading pattern for weather, while still using an external data source.
3. The current calendar route is read-only. Editing calendar events should be added in a later issue if required.