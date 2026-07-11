# ISSUE REPORT

## Epic

008 BRING INTEGRATION

## Issue

004 EXTENDED SHOPPING LIST VIEW AND COMPLETION WORKFLOWS

## Implementation Summary

The Bring extended detail experience was implemented as a dedicated expanded widget view that reuses the existing lower detail-stage framework while keeping the compact and expanded Bring surfaces synchronized through App-owned state.

The frontend implementation lives primarily in:

- `frontend/src/api/bring.ts`
- `frontend/src/App.tsx`
- `frontend/src/widgets/WidgetBoardHost.tsx`
- `frontend/src/widgets/bring/BringDetailView.tsx`
- `frontend/src/widgets/bring/index.ts`
- `frontend/src/widgets/bring/translations.ts`
- `frontend/src/App.css`

The extended view now supports:

- manual refresh of the selected Bring list
- add item with optional specification
- update specification for an existing item
- complete an item
- delete an item
- reopen a recently completed item by re-adding it to the open list

Implementation detail:

- App owns the canonical `BringWidgetData` state and the Bring mutation handlers
- `frontend/src/api/bring.ts` now exposes typed helpers for add, update, delete, and complete operations in addition to the existing selected-list fetch
- every successful mutation returns the refreshed Bring list and immediately updates the compact widget and the expanded detail view from the same App-owned source of truth
- the Bring widget now provides `renderDetailView` through `frontend/src/widgets/bring/index.ts`
- `WidgetBoardHost.tsx` passes Bring detail data and callbacks into the expanded widget framework and reuses the existing `onViewModeChange('settings')` path for reconnect guidance

Read-only and stale behavior:

- when the backend serves stale cached Bring data, the expanded view renders explicit stale and read-only notices
- mutation controls are disabled while the list is read-only
- manual refresh stays available so the user can retry the live Bring fetch

Reconnect behavior:

- if Bring is not configured or the live read fails into a non-usable state, the expanded view shows reconnect guidance instead of a silent empty panel
- the guidance card includes a direct button that switches Subway into the shared settings view so the user can revisit the Bring settings panel

Scope decision carried into implementation:

- direct item rename was intentionally not implemented
- the recent-items column is a limited immediate reopen surface rather than a full completed-history browser
- reopen uses the normal add-item flow so the backend can generate a fresh UUID when needed and avoid rename-style ambiguity

## Notes For Next Issue

The Bring epic is now functionally complete for the requested scope. Any follow-up work would be enhancement-oriented, for example:

- richer recent-history browsing
- duplicate-item grouping or sorting options
- explicit stale refresh timestamps in the compact tile
- analytics or diagnostics for Bring API failure patterns

## Validation

Validated with:

- `npm --prefix frontend run build`
