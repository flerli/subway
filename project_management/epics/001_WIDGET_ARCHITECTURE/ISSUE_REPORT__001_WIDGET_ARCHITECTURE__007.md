# ISSUE REPORT

## Epic

001 WIDGET ARCHITECTURE

## Issue

007 WIDGET HEALTH DEBUG OVERLAY

## Implementation Summary

Implemented a hidden maintenance overlay for widget diagnostics.

Concrete changes:

- Added widget health-state types in `frontend/src/widgets/widgetTypes.ts`.
- Added a dedicated overlay component in `frontend/src/widgets/WidgetDebugOverlay.tsx`.
- Updated `frontend/src/App.tsx` to collect per-widget diagnostic snapshots from the weather, calendar, and todo load paths.
- Added a hidden diagnostics trigger on the `HM` badge and keyboard support for `Ctrl+Shift+D`.
- Added close support via `Escape` and a visible close button inside the overlay.
- Added overlay styles in `frontend/src/App.css`.

## Implementation Choices

1. The hidden trigger is the `HM` badge tapped 5 times within a short window.
2. A keyboard shortcut `Ctrl+Shift+D` also toggles the overlay for development convenience.
3. The overlay shows diagnostics for all registered widgets, even when detailed refresh metrics are only available for the currently instrumented widgets.
4. Calendar, todo, and weather are the first widgets feeding real refresh/failure metadata into the overlay.
5. Static or not-yet-instrumented widgets fall back to `idle`/`n/a` diagnostics rather than breaking the overlay.

## Validation

- `npm --prefix /Users/flerli/01_Swaibian/Swaibian-Main_Office/05_Products/subway/frontend run build` passed.
- Browser validation confirmed the overlay is hidden by default.
- Browser validation confirmed the hidden badge trigger opens the overlay.
- Browser validation confirmed the overlay shows scope, source, visibility, placement, refresh status, last refresh time, item count, and failure state.
- Browser validation confirmed real diagnostics for:
  - Weather: `external-api / weather`, `live`, `none`
  - Calendar: `database / calendar`, `ok`, `none`
  - Todo: `database / todo`, `ok`, `none`
- Browser validation confirmed `Escape` closes the overlay again.

## Follow-On Notes For The Next Developer

1. Issue 008 can reuse the diagnostics overlay to inspect widget metadata administration changes.
2. Additional widgets should populate widget health-state data when they gain backend/API data paths.
3. If kiosk operators need a less hidden access path later, the trigger can be expanded without changing the overlay contract itself.