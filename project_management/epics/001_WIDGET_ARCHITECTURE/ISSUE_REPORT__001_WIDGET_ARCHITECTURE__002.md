# ISSUE REPORT

## Epic

001 WIDGET ARCHITECTURE

## Issue

002 WIDGET HOST, SCOPE AND PLACEMENT ZONES

## Implementation Summary

Implemented the shared widget host and placement zone system for the kiosk board.

Concrete changes:

- Added widget placement metadata to the widget entity model.
- Added placement zone definitions in `frontend/src/widgets/widgetPlacementZones.ts`.
- Added widget visibility resolution in `frontend/src/widgets/widgetVisibility.ts`.
- Added a shared board host in `frontend/src/widgets/WidgetBoardHost.tsx`.
- Updated `frontend/src/App.tsx` so the board now renders through `WidgetBoardHost` instead of hard-coding board widgets inline.
- Updated `frontend/src/App.css` with zone layout classes for hero, triad, bottom-wide, and bottom-side placements.
- Added migration logic in `frontend/src/widgets/widgetDatabase.ts` so older stored widget entities inherit the new placement metadata and seeded scope model.

## Implementation Choices

1. Placement zones are currently modeled as named board regions:
   - `hero`
   - `triad`
   - `bottom-wide`
   - `bottom-side`
2. The board host groups registered widgets by placement metadata and renders each zone independently.
3. The household `All` view intentionally shows all seeded widgets so the kiosk remains a complete overview board.
4. Member-focused views apply widget-level visibility rules, so widgets outside the active focus scope are removed entirely from the board.
5. Seeded widget scopes are treated as authoritative at this stage because the product does not yet expose widget-scope editing in the UI.
6. Existing widget content was preserved while moving rendering responsibility into the shared host so later issues can deepen widget-specific behavior without reopening the page architecture.

## Validation

- `npm --prefix /Users/flerli/01_Swaibian/Swaibian-Main_Office/05_Products/subway/frontend run build` passed.
- Browser validation confirmed the board renders through four placement zones.
- Browser validation confirmed one-member widget filtering works for Alex.
- Browser validation confirmed multi-member widget filtering works for Chris, including bulletins and todo visibility.

## Follow-On Notes For The Next Developer

1. Issue 003 can now implement the calendar widget against the host instead of wiring directly into the page.
2. Issue 004 and Issue 005 can reuse the same host/zone registration path without touching the board layout contract.
3. If widget scope editing is later introduced in the product, the current seeded-scope authority in `widgetDatabase.ts` should be revisited.