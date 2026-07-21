# ISSUE REPORT

## Epic

011 MCP TOOL INTERFACE

## Issue

005 LOW RISK WIDGET MCP ROLLOUT AND SAFE TOOL PARITY

## Implementation Summary

The first low-risk MCP rollout batch was implemented for three widgets:

- `arrival-board`
- `weather`
- `youtube`

These widgets now register discoverable MCP tools through their widget contracts in:

- `frontend/src/widgets/arrival-board/index.ts`
- `frontend/src/widgets/weather/index.ts`
- `frontend/src/widgets/youtube/index.ts`

The rollout intentionally does not include `ui-benchmark` yet. Its current interaction model is highly local and animation-driven, and introducing server-owned tool handlers for that widget without a clearer durable contract would have produced artificial parity rather than a truthful low-risk rollout. It remains deferred to a later issue.

## Parity Scope Implemented

### Arrival Board

Implemented safe parity for:

- reading the current arrival board state in default or member-focused form
- opening one arrival row to inspect the linked calendar event detail
- saving the board title and subheading settings

The backend derives arrival rows from the same persisted calendar domain already used by the application and returns the next upcoming entries using the same timing and filtering model as the board.

### Weather

Implemented safe parity for:

- reading the saved weather widget state and the current payload for configured locations
- reading a one-off weather snapshot for an explicitly requested location
- saving the widget settings for focus slot, refresh interval, and configured locations

The rollout builds on the already existing weather cache and Open-Meteo integration in `backend/server.mjs`.

### YouTube

Implemented safe parity for:

- reading the saved YouTube widget state
- searching videos through the existing backend proxy and optionally selecting a result
- saving the widget auto-play setting

The rollout deliberately avoids browser-only fullscreen toggling and other transient presentation-only state, because those do not have a durable backend-owned result that fits the assistant execution model.

## Backend Runtime Changes

Low-risk internal widget handlers were added to the Subway widget runtime in `backend/server.mjs`.

The new internal safe-tool handlers cover:

- `widget.arrival_board.get_widget_state`
- `widget.arrival_board.get_arrival_event_detail`
- `widget.arrival_board.update_widget_settings`
- `widget.weather.get_widget_state`
- `widget.weather.get_current_weather`
- `widget.weather.update_widget_settings`
- `widget.youtube.get_widget_state`
- `widget.youtube.search_videos`
- `widget.youtube.update_widget_settings`

These handlers reuse existing system capabilities rather than introducing parallel service layers:

- `widget_settings` persistence for safe settings writes
- calendar event expansion and payload building for arrival-board reads
- weather cache and Open-Meteo fetches for weather reads
- the existing YouTube backend search proxy for YouTube reads

## Discovery And Settings Integration

The rollout uses the existing widget MCP discovery path introduced in earlier issues.
Because the shared settings MCP configuration already filters the widget tool catalog per user, the newly added low-risk tools automatically participate in:

- assistant discovery
- per-user enable or disable policy
- per-tool approval configuration
- persisted tool-call logging in widget settings

No additional widget-specific MCP settings UI was required for this issue beyond the shared settings infrastructure added earlier in Epic 011.

## Deferred Capability Notes

The following capabilities were intentionally deferred out of Issue 005 because they are either presentation-only or would require a stronger backend-owned contract before they can claim truthful parity:

- `ui-benchmark` interactive benchmark controls and local reaction panels
- YouTube fullscreen toggling
- YouTube local panel-open or panel-close UI chrome state

Those can be revisited once a later issue decides whether they should become real assistant-facing state transitions or remain browser-only affordances.

## Validation

Validated with:

- `node --check backend/server.mjs`
- `npm --prefix frontend run build`
- editor error checks on the touched backend and widget contract files