# ISSUE REPORT

## Epic

009 ROBOROCK INTEGRATION

## Issue

001 PYTHON SIDECAR AND EMAIL CODE CONNECTION FOUNDATION

## Implementation Summary

The Roborock integration foundation was implemented across the Node backend, a dedicated Python sidecar, Docker compose wiring, and a custom widget settings surface.

The backend foundation lives in `backend/server.mjs`.

The server now creates a persistent `roborock_integrations` table with:

- user-scoped Roborock email storage
- encrypted Roborock session payload storage
- cached Roborock base-url storage for later region reuse
- connection status, last-connected, and last-validated timestamps

Roborock session persistence is reversible but encrypted at rest through `ROBOROCK_SESSION_ENCRYPTION_KEY`. The backend never returns the stored session payload in plaintext to the frontend.

The Node backend now exposes authenticated Roborock settings endpoints:

- `GET /api/roborock/settings`
- `POST /api/roborock/settings/request-code`
- `PATCH /api/roborock/settings`
- `POST /api/roborock/settings/session`

The internal Python Roborock bridge was added in `backend/roborock_sidecar/server.py` and is packaged separately through:

- `backend/roborock_sidecar/Dockerfile`
- `backend/roborock_sidecar/requirements.txt`

The sidecar keeps one shared `aiohttp` session and maps upstream Roborock login, invalid-code, agreement, and rate-limit failures into stable JSON error codes for the Node backend.

The frontend settings flow was implemented through a widget-specific settings hook:

- `frontend/src/api/roborock.ts` provides the Roborock settings API client
- `frontend/src/widgets/roborock/` provides the custom settings panel, translations, and widget module
- `frontend/src/widgets/widgetRegistry.ts` and `frontend/src/widgets/widgetDatabase.ts` now include the Roborock widget metadata

Implementation detail:

- the Roborock widget is seeded in backend metadata but starts with no placement zones, so issue 001 exposes only the settings foundation and does not yet place a board tile
- `compose.yml` now starts the internal `roborock-sidecar` service and passes `ROBOROCK_SIDECAR_URL` to the backend
- `README.md` now documents the local Roborock sidecar process and the required session-encryption environment variable

## Notes For Next Issue

Issue 002 can build on this foundation by adding:

- device discovery and filtering to vacuum-capable models
- selected robot persistence
- routine or scene discovery and persistence
- capability-aware status snapshots and authenticated quick-start command endpoints

## Validation

Validated with:

- `npm --prefix frontend run build`
- `node --check backend/server.mjs`
- `python3 -m py_compile backend/roborock_sidecar/server.py`
- `docker compose config >/dev/null`