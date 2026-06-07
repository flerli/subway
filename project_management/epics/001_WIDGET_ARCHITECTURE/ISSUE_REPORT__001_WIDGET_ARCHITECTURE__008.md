# ISSUE REPORT

## Epic

001 WIDGET ARCHITECTURE

## Issue

008 WIDGET METADATA ADMINISTRATION

## Implementation Summary

Implemented a backend-backed widget metadata administration flow inside the existing settings screen.

Concrete changes:

- Added backend widget metadata update support in `backend/server.mjs` through `PATCH /api/widgets/:id`.
- Added backend validation for:
  - invalid `sourceLocation`
  - missing or invalid placement zones
  - invalid scope/member combinations
- Added a frontend widget metadata update helper in `frontend/src/api/widgets.ts`.
- Added a dedicated metadata administration UI in `frontend/src/widgets/WidgetMetadataAdminHost.tsx`.
- Wired the metadata administration UI into `frontend/src/App.tsx`.
- Added metadata-admin-specific styles in `frontend/src/App.css`.
- Updated the metadata save flow so the widget registry is rehydrated from the backend immediately after save.

## Implementation Choices

1. Widget metadata administration was added as a separate section inside the existing settings screen rather than a new route.
2. The UI supports editing:
   - title
   - subway letter
   - subway color
   - source location
   - scope mode
   - scope members
   - placement zones
   - placement order
3. Source location is validated against the available widget module discovery contract on the backend.
4. After a successful save, the frontend refetches widget metadata and rebuilds the widget registry so board changes take effect immediately.
5. The metadata admin flow is kept separate from per-widget settings panels, which continue to handle widget-specific behavior settings.

## Validation

- `npm --prefix /Users/flerli/01_Swaibian/Swaibian-Main_Office/05_Products/subway/frontend run build` passed.
- Browser validation confirmed the settings screen renders 6 widget metadata cards.
- Browser validation confirmed `/api/widgets` returns `200` with 6 widget records.
- Browser validation confirmed invalid metadata updates are rejected:
  - invalid `sourceLocation` returned `400`
  - invalid placement zones returned `400`
- Browser validation confirmed a real metadata update works through the UI:
  - Weather title changed to `Weather Live`
  - `/api/widgets` returned the updated title
  - the live board reflected `Weather Live` immediately
  - the title was then reverted to `Weather`

## Follow-On Notes For The Next Developer

1. This issue now provides the central administrative surface for widget identity and board behavior metadata.
2. The source location field should be changed carefully because it controls which widget module is discovered for a given widget record.
3. The existing diagnostics overlay from issue 007 is useful for validating metadata changes during future maintenance work.