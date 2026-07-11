# ISSUE REPORT

## Epic

008 BRING INTEGRATION

## Issue

003 MINI SHOPPING LIST WIDGET

## Implementation Summary

The compact Bring widget surface was implemented through a new Bring list fetch flow in the frontend, a dedicated compact render case in the widget host, expanded translation coverage, and a backend placement migration so the Bring widget becomes visible on the board by default.

The frontend implementation lives primarily in:

- `frontend/src/App.tsx`
- `frontend/src/api/bring.ts`
- `frontend/src/widgets/WidgetBoardHost.tsx`
- `frontend/src/widgets/bring/translations.ts`
- `frontend/src/widgets/widgetHostModels.ts`
- `frontend/src/App.css`

The compact widget now loads the selected Bring shopping list through `GET /api/bring/list` and maps the response into one of four board states:

- loading
- ready
- not-configured
- error

Ready-state behavior:

- renders a short preview of open items from the selected Bring list
- shows the remaining open-item count in widget meta copy
- preserves stable row identity through the cached Bring item `uuid` when present
- shows explicit stale-state copy when the backend serves cached data

State handling behavior:

- a missing Bring username, password, or selected list maps to a not-configured widget state instead of a generic load failure
- temporary Bring outages use the cached stale snapshot returned by issue 002 and surface the stale state visibly in widget meta and body copy
- generic request failures render an unavailable state

Widget-host integration detail:

- the existing shared expand control is reused for Bring
- because issue 004 has not been implemented yet, expanding the Bring widget currently reuses the compact surface in the lower expanded stage rather than a dedicated detail experience
- this keeps the compact widget on the standard host path without prematurely implementing item-management UI

Placement detail:

- the backend seed metadata now places Bring in the `service-board` zone with order `2`
- a backend bootstrap migration updates existing Bring widget rows with empty placement arrays to that same default placement so issue 001 test data becomes visible without manual metadata edits
- the frontend fallback widget seed in `frontend/src/widgets/widgetDatabase.ts` was updated to match

## Notes For Next Issue

Issue 004 can build directly on this compact widget by adding:

- a dedicated Bring detail view component
- live item add, spec update, complete, delete, and reopen flows
- explicit stale read-only interaction rules in the expanded view
- reconnect guidance that links settings and detail workflows together

## Validation

Validated with:

- `npm --prefix frontend run build`
- `node --check backend/server.mjs`
