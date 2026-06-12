# ISSUE REPORT

## Epic

002 WEATHER WIDGET

## Issue

004 WEATHER EXTENDED VIEW AND REFRESH COUNTDOWN

## Implementation Summary

Implemented the weather widget’s first detailed multi-location dashboard and added a configurable time-until-next-update countdown. The compact weather card now surfaces the countdown, and the expanded weather view shows one focused location plus up to four secondary locations at a glance.

Concrete changes:

- Added a `refreshIntervalMinutes` weather widget setting with normalization and persistence.
- Scheduled frontend weather refreshes against the configured interval and surfaced a live countdown label in the UI.
- Updated compact weather rendering to show `Next update in ...` beneath the weather note.
- Replaced the expanded weather forecast-only layout with a focus location summary plus secondary location cards for the remaining configured locations.
- Made multi-location weather loading resilient by returning a fallback weather card per failing location instead of collapsing the entire widget.
- Updated the epic overview to mark this issue as implemented.

## Implementation Choices

1. Refresh scheduling is handled in the frontend app shell rather than the backend. The app calculates `nextWeatherRefreshAt`, updates the countdown once per second via the existing clock tick, and triggers a refetch when the interval elapses.
2. The countdown resets on successful widget refresh by recalculating from the local fetch completion time, which avoids coupling UI refresh timing to the weather provider’s own update cadence.
3. Per-location weather requests now degrade gracefully: if one location fails, that location becomes a stale fallback card while other configured locations still render normally.
4. The expanded weather detail view now prioritizes all-locations comparison over the old forecast-only detail layout, using the focus location as the hero panel and up to four additional configured locations as smaller secondary cards.
5. The generic detail-view framework from Issue 003 remained unchanged; weather only extended its own detail renderer and the detail data passed into it.

## Validation

- `npm --prefix /Users/flerli/01_Swaibian/Swaibian-Main_Office/05_Products/subway/frontend run build` passed.
- Browser validation confirmed the compact weather card shows a live countdown label such as `Next update in 9:52`.
- Browser validation confirmed the expanded weather view renders one focus location plus four secondary location cards when five locations are configured.
- Browser validation confirmed the visible `Refresh interval minutes` control changes the compact countdown from `10:01` to `1:01`, and restoring the setting resets the countdown back to `10:01`.

## Follow-On Notes For The Next Developer

1. The detail-view framework is now exercised by a richer real-world weather dashboard, so later widgets can follow the same host/detail separation.
2. If backend-driven refresh scheduling is ever introduced, the current countdown and `nextWeatherRefreshAt` logic can be redirected to a backend-supplied next-refresh timestamp without changing the weather detail renderer.
3. Further weather-specific polish can now focus on visual refinement, richer per-location details, or provider diversity rather than host framework changes.
