# ISSUE REPORT

## Epic

002 WEATHER WIDGET

## Issue

003 GENERIC EXTENDED VIEW DETAIL FRAMEWORK

## Implementation Summary

Implemented a generic widget detail-view contract so expanded widgets can render a dedicated detailed presentation instead of always reusing their compact board card. Weather is the first adopter, while widgets without a detail renderer continue to expand through the existing fallback path.

Concrete changes:

- Extended the widget contract with an optional detail-view renderer hook.
- Added a dedicated `WeatherDetailView` component as the first detail-view implementation.
- Updated the expanded-stage host to resolve and use a widget detail renderer when one is available.
- Preserved fallback behavior for widgets that do not provide a detail renderer.
- Validated the contract with weather as the first adopter and calendar as a fallback example.
- Updated the epic overview to mark this issue as implemented.

## Implementation Choices

1. The detail-view framework is optional: widgets opt in through `renderDetailView`, and no existing widget is forced to implement a second presentation.
2. The expanded-stage host keeps ownership of the shared widget chrome and expand/collapse interactions; detail renderers only supply the richer body content.
3. The detail-view context currently passes generic `data: unknown` so the host API stays widget-agnostic while each detail renderer remains responsible for its own data narrowing.
4. Weather adopted the framework first by moving its expanded weather presentation into a dedicated component, while the compact weather card continues to render through the shared host path.
5. Widgets without a detail renderer still fall back to the previous `renderWidget(..., 'expanded')` behavior, which preserves compatibility and keeps the change low-risk.

## Validation

- `npm --prefix /Users/flerli/01_Swaibian/Swaibian-Main_Office/05_Products/subway/frontend run build` passed.
- Browser validation confirmed the expanded weather view renders through the dedicated `WeatherDetailView` path in the DOM.
- Browser validation confirmed the calendar widget still expands successfully without a detail renderer, proving fallback behavior remains intact.
- Type validation confirmed the new widget contract and weather adoption compile without errors.

## Follow-On Notes For The Next Developer

1. Issue 004 can now implement the weather all-locations dashboard by extending `WeatherDetailView` instead of modifying the host again.
2. Later widgets can adopt the same contract by providing `renderDetailView` in their widget module and resolving their own detail data shape.
3. If a second or third widget adopts the framework, it may be worth generalizing host-side detail-data resolution beyond the current first-adopter weather path.
