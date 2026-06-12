# ISSUE REPORT

## Epic

002 WEATHER WIDGET

## Issue

001 MULTI LOCATION WEATHER FOUNDATION

## Implementation Summary

Implemented the first weather-widget expansion step by replacing the single-location settings path with a normalized multi-location model and using one configured focus location for the compact board card.

Concrete changes:

- Broadened frontend widget settings handling so structured widget settings can persist nested arrays and objects.
- Reworked the weather widget settings normalization to support up to five ordered locations plus a focus-location slot.
- Preserved backward compatibility with the original single-location weather settings keys.
- Updated weather loading to fetch all configured locations and return one focused weather summary plus the full ordered location list.
- Extended the weather widget data model so future extended-view work can consume all loaded locations without changing the compact board contract.
- Updated the epic overview to mark this issue as implemented.

## Implementation Choices

1. The backend `/api/weather` endpoint remains single-location per request; the frontend weather widget now orchestrates multiple calls rather than expanding backend scope in this issue.
2. Weather settings are normalized into a structured model with `locations` plus `focusLocationSlot`, while still exposing flat fields for the existing generic settings UI.
3. The persisted settings model is backward-compatible with legacy `locationLabel`, `latitude`, and `longitude` values, which migrate into slot 1 automatically.
4. The compact weather card still renders a single focused location, but the weather payload now also carries the full ordered `locations` array for later detailed/extended-view work.
5. Health-state item counts now reflect the number of configured weather locations instead of the forecast-day count.

## Validation

- `npm --prefix /Users/flerli/01_Swaibian/Swaibian-Main_Office/05_Products/subway/frontend run build` passed.
- Browser validation confirmed the weather settings row now exposes `Focus location slot` and five location triplets.
- Browser validation confirmed a temporary two-location weather configuration could switch the compact board card focus to Munich, proving the focus-location model drives compact rendering.
- Browser validation restored the previous weather settings after the focus-location check.

## Follow-On Notes For The Next Developer

1. Issue 002 can now map iconography against either the focused location or any entry in the `locations` array without changing the weather loading contract.
2. Issue 003 should consume the new `locations` array directly when defining the generic extended-detail widget framework.
3. Issue 004 can add refresh countdown behavior and all-locations rendering on top of the existing multi-location settings and focused compact view.
