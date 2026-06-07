# ISSUE REPORT

## Epic

001 WIDGET ARCHITECTURE

## Issue

001 WIDGET REGISTRY FOUNDATION

## Implementation Summary

Implemented the first widget architecture foundation inside the frontend codebase.

Concrete changes:

- Added a widget domain model in `frontend/src/widgets/widgetTypes.ts`.
- Added a widget entity normalization and seed layer in `frontend/src/widgets/widgetDatabase.ts`.
- Added per-widget micro app folders under `frontend/src/widgets/` for:
  - arrival-board
  - weather
  - calendar
  - todo
  - bulletins
  - calibration
- Added a widget registry in `frontend/src/widgets/widgetRegistry.ts` that resolves widget entities to widget modules and presentation metadata.
- Rewired the current kiosk UI in `frontend/src/App.tsx` so widget titles, colors, and widget numbering come from the widget registry rather than from hard-coded inline widget metadata.
- Later follow-up work moved widget metadata persistence into the backend SQLite store and introduced `sourceLocation` for module discovery.

## Implementation Choices

1. The initial foundation introduced the frontend widget domain and seeded metadata contract; persistence now lives in the backend SQLite layer.
2. Widget metadata now includes:
   - title
   - subway letter
   - subway color
   - user scope
  - source location
3. The default subway letter is derived from the widget title unless an explicit letter is provided.
4. The widget contract supports both read-only and write-capable widgets through `capabilities`, `loadData`, and optional `mutateData` hooks.
5. The widget registry now supports source-location-based module discovery.
6. The current UI still uses numbered widget badges visually, but the architectural widget entity now stores subway letter and color metadata so later issues can decide how and where to expose that branding.
7. Existing kiosk behavior was preserved intentionally while removing the monolithic widget metadata from `App.tsx`.

## Follow-On Notes For The Next Developer

1. Issue 002 can now focus on a true widget host and placement zones because the registry and entity contract already exist.
2. Widget metadata is now centrally stored in the backend, but there is still no widget-metadata editing UI.
3. The sample widgets already have dedicated folders, so later issues can grow their internal implementation without reopening the registry foundation.