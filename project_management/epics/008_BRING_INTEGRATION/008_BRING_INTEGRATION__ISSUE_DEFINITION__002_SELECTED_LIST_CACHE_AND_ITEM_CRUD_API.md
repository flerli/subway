# DEVELOPER TEAM RULES

## Before implementing the issue

- Read the codebase in `/src` first in order to understand the existing implementation.
- Read the original `ISSUE_DEFINITION` document at `/project_management/epics/<path to issue definition>`.
- Read the `ISSUE_REPORT` of the previous issue if it exists.

## After implementing the issue

- Document the concrete implementation choices in an `ISSUE_REPORT` for this issue in order to inform a proceeding developer about the work.
- Update `/project_management/EPIC_OVERVIEW.md` by changing the status of the current issue.

## Repository issue metadata

- GitHub repository label: `type/feature`

# ISSUE DEFINITION

## Epic

008 BRING INTEGRATION

## Issue Title

002 SELECTED LIST CACHE AND ITEM CRUD API

## Issue Description

Add the operational backend API for the selected Bring shopping list. This issue shall fetch and cache the selected list snapshot, provide stale-read fallback when Bring is temporarily unavailable, and expose authenticated CRUD-style item operations that respect the upstream Bring API's documented constraints around uuid-based identity and discouraged item renaming.

## Previous Issue Within The Epic

001 PYTHON SIDECAR AND CONNECTION SETTINGS FOUNDATION

## Functional Requirements

1. Subway shall expose authenticated backend endpoints for reading the currently selected Bring shopping list for the signed-in Subway user.
2. On a successful upstream refresh, Subway shall persist a normalized snapshot of the selected Bring list, including open items and refresh metadata, so the widget can recover from temporary upstream outages.
3. When the upstream Bring API is temporarily unavailable but a prior successful snapshot exists, Subway shall return the cached snapshot together with explicit stale-state metadata rather than failing the widget outright.
4. When no successful snapshot exists and the upstream Bring API is unavailable, Subway shall return a deterministic error state that the frontend can render clearly.
5. Subway shall support adding a new Bring item with required name and optional specification fields.
6. Subway shall support updating an existing Bring item's specification while preserving uuid-based item identity when available.
7. Subway shall support deleting an existing Bring item from the selected list.
8. Subway shall support completing an existing Bring item from the selected list.
9. Subway shall not expose direct item-name rename as a first-class user operation because the upstream Bring README documents inconsistent app refresh behavior after renaming.
10. If the user flow needs to return a completed item to the open list, the backend contract shall allow a supported re-add workflow rather than relying on unsupported rename semantics.
11. When multiple Bring items share the same name, Subway shall use uuid-aware matching so operations do not unintentionally overwrite or complete the wrong row.
12. The backend contract shall preserve enough upstream identifiers and metadata for the later mini widget and extended view to render stable row actions and stale-state copy.

## Involved Modules

- Model:
  normalized Bring list snapshot, item uuid identity, stale-cache metadata, selected-list refresh timestamp, operation result payloads
- View:
  none directly required beyond developer-facing API payload expectations for later widget stages
- Controller:
  Node bring routes, Python sidecar list and item operation handlers, cache persistence, stale-fallback selection, exception-to-response mapping

## Implementation Plan

1. Extend the internal Python Bring service with selected-list fetch, add, update-spec, delete, and complete operations using the upstream library's supported methods.
2. Reuse the same long-lived Python async session so the sidecar does not create per-request event-loop conflicts described in the upstream README.
3. Add per-user selected-list snapshot persistence in SQLite, including normalized item rows or JSON snapshot storage and refreshed-at or stale-at metadata.
4. Implement authenticated Node endpoints for selected-list read and item mutation operations, with a stable JSON contract for the frontend.
5. Return explicit freshness metadata so the frontend can distinguish fresh data, stale cached data, missing configuration, invalid credentials, and upstream unavailability.
6. Exclude direct rename from the public API surface and document that name changes, if ever required later, must be modeled as delete-and-recreate behavior instead.

## Test Cases

1. Reading the selected Bring list after a successful refresh returns the expected open-item snapshot for the signed-in Subway user.
2. Adding an item through Subway persists the new item in Bring and returns an updated selected-list snapshot.
3. Updating an item's specification preserves the correct item identity when duplicate item names exist.
4. Completing an item removes it from the open-list response returned to the widget.
5. Deleting an item removes it from the selected-list response returned to the widget.
6. When Bring is unavailable after a prior successful refresh, Subway returns the last cached snapshot with an explicit stale indicator.
7. When Bring is unavailable before any successful refresh, Subway returns a deterministic unavailable error instead of an empty success payload.