# ISSUE REPORT

## Epic

008 BRING INTEGRATION

## Issue

002 SELECTED LIST CACHE AND ITEM CRUD API

## Implementation Summary

The selected Bring list backend API was implemented through new Node routes, a dedicated snapshot cache table, and extended Python sidecar endpoints that always return the normalized selected-list snapshot shape.

The backend implementation lives in `backend/server.mjs`.

The server now creates a persistent `bring_list_snapshots` table with:

- one cached selected-list snapshot per authenticated Subway user
- selected Bring list uuid
- normalized snapshot JSON payload
- last successful refresh timestamp
- stale timestamp for cached fallback reads
- updated timestamp

The Node backend now exposes authenticated Bring list endpoints:

- `GET /api/bring/list`
- `POST /api/bring/list/items`
- `PATCH /api/bring/list/items`
- `DELETE /api/bring/list/items`
- `POST /api/bring/list/items/complete`

Read behavior:

- a normal list read tries the live Bring sidecar first
- on success, the normalized snapshot is written to `bring_list_snapshots`
- on temporary Bring availability failures, the backend returns the cached snapshot with `freshness: 'stale'`, `readOnly: true`, and stale timestamps
- if no cached snapshot exists for the selected list, the backend returns the upstream availability error instead of an empty success payload

Mutation behavior:

- add, update-spec, delete, and complete operations always go live
- successful mutations re-fetch the selected Bring list through the sidecar and refresh the cached snapshot
- the add route generates a UUID server-side when the caller does not provide one so later duplicate item names remain addressable
- direct rename was intentionally not implemented

The Python sidecar in `backend/bring_sidecar/server.py` now exposes internal endpoints for:

- selected-list fetch
- add item
- update item specification
- remove item
- complete item

The sidecar normalizes the upstream Bring payload into:

- `listUuid`
- `listName`
- `openItems`
- `recentItems`

Each item preserves:

- `itemName`
- `specification`
- `uuid`

This keeps enough identity and metadata for later mini-widget and extended-view work, including duplicate item names and reopen-through-readd flows.

## Notes For Next Issue

Issue 003 can build on this API by rendering:

- compact open-item preview rows
- open-item and recent-item count metadata
- stale-state widget messaging
- not-configured and empty states from the new backend error and freshness contract

## Validation

Validated with:

- `node --check backend/server.mjs`
- `python3 -m py_compile backend/bring_sidecar/server.py`
