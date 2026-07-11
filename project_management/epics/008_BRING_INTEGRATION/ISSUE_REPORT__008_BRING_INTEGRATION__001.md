# ISSUE REPORT

## Epic

008 BRING INTEGRATION

## Issue

001 PYTHON SIDECAR AND CONNECTION SETTINGS FOUNDATION

## Implementation Summary

The Bring integration foundation was implemented across the Node backend, a dedicated Python sidecar, Docker compose wiring, and a custom widget settings surface.

The backend foundation lives in `backend/server.mjs`.

The server now creates a persistent `bring_integrations` table with:

- user-scoped Bring username storage
- encrypted password payload storage
- selected Bring list uuid and name
- created and updated timestamps

Bring password persistence is reversible but encrypted at rest through `BRING_CREDENTIAL_ENCRYPTION_KEY`. The backend never returns the stored password in plaintext to the frontend.

The Node backend now exposes authenticated Bring settings endpoints:

- `GET /api/bring/settings`
- `POST /api/bring/settings/lists`
- `PATCH /api/bring/settings`

The internal Python Bring bridge was added in `backend/bring_sidecar/server.py` and is packaged separately through:

- `backend/bring_sidecar/Dockerfile`
- `backend/bring_sidecar/requirements.txt`

The sidecar keeps one shared `aiohttp` session and maps upstream Bring exceptions into stable JSON error codes for the Node backend.

The frontend settings flow was implemented through a widget-specific settings hook:

- `frontend/src/widgets/widgetTypes.ts` now supports `renderSettingsPanel`
- `frontend/src/widgets/WidgetSettingsHost.tsx` delegates to a custom panel when provided
- `frontend/src/widgets/bring/` provides the Bring widget module, translations, and the custom settings panel

Implementation detail:

- the Bring widget is seeded in backend metadata but starts with no placement zones, so issue 001 exposes only the settings foundation and does not yet place a board tile
- `compose.yml` now starts the internal `bring-sidecar` service and passes `BRING_SIDECAR_URL` to the backend
- `README.md` now documents the local sidecar process and the required encryption-key environment variable

## Notes For Next Issue

Issue 002 can build on this foundation by adding:

- selected-list snapshot persistence
- stale cached read fallback
- authenticated selected-list read endpoint
- item add, update-spec, complete, and delete operations

## Validation

Validated with:

- `npm --prefix frontend run build`
- `node --check backend/server.mjs`
- `python3 -m py_compile backend/bring_sidecar/server.py`
- `docker compose config >/dev/null`
