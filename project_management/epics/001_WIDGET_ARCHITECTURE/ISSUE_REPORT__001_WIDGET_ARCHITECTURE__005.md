# ISSUE REPORT

## Epic

001 WIDGET ARCHITECTURE

## Issue

005 WEATHER WIDGET SAMPLE

## Implementation Summary

Implemented the weather widget as the first live external-data widget sample.

Concrete changes:

- Added a backend `/api/weather` route in `backend/server.mjs`.
- Integrated the backend with the Open-Meteo API and added a lightweight in-memory cache.
- Added a weather-specific frontend API client in `frontend/src/widgets/weather/weatherApi.ts`.
- Implemented real `loadData` behavior in `frontend/src/widgets/weather/index.ts`.
- Added a typed weather payload model in `frontend/src/widgets/widgetHostModels.ts`.
- Replaced the old placeholder weather card data path in `frontend/src/App.tsx` and `frontend/src/widgets/WidgetBoardHost.tsx` with backend-fetched live weather and refresh state.

## Implementation Choices

1. The weather widget remains read-only and keeps `dataSource: external-api` in its widget contract.
2. The backend fetches weather from Open-Meteo so the frontend continues to talk only to the local backend API.
3. The backend uses a simple TTL cache to avoid hitting the external API on every frontend request.
4. The widget surfaces live/cached state, data source, location, and updated time in the UI.
5. The frontend falls back to a safe placeholder weather payload if live weather loading fails.

## Validation

- `npm --prefix /Users/flerli/01_Swaibian/Swaibian-Main_Office/05_Products/subway/frontend run build` passed.
- Browser validation confirmed `/api/weather` returns `200` with live weather data.
- Browser validation confirmed the weather widget renders through the shared host using the backend payload.
- Browser validation confirmed the card displays source, location, live/cached state, condition, range summary, and updated time.

## Follow-On Notes For The Next Developer

1. Issue 006 can use the same widget contract patterns when exposing weather-specific settings later.
2. The backend weather location is currently environment-driven with defaults; a later settings/admin issue can make that editable.
3. If stronger resilience is needed, the current cache can be extended into persistent backend caching or scheduled refresh jobs.