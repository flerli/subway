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

010 AI ASSISTANT PLATFORM

## Issue Title

006 MULTI CONNECTION ROUTE REGISTRY AND DEFAULT SELECTION FOUNDATION

## Issue Description

Extend the assistant route registry and thread-creation behavior so each authenticated Subway user can maintain multiple assistant LLM connections and mark exactly one of them as the default route used for every new conversation. This issue shall define the multi-connection persistence model, backend CRUD and default-selection semantics, and thread creation behavior that resolves the selected default route instead of assuming a single active connection.

## Previous Issue Within The Epic

005 MARKDOWN TRANSCRIPT RENDERING AND RESPONSE PRESENTATION

## Functional Requirements

1. Every authenticated Subway user shall be able to persist multiple assistant LLM connection records instead of only one active assistant route.
2. Each assistant connection record shall store at least a stable id, human-readable label, backend kind, base URL, model identifier, capability flags, optional stored credential material, optional headers JSON, enabled state, and updated timestamp.
3. Each authenticated Subway user shall be able to mark exactly one persisted assistant connection as the default route for newly created conversations.
4. New assistant threads shall resolve their initial route from the currently selected default connection for the owning user instead of from one global singleton route.
5. Existing assistant threads shall continue to use the route id already persisted on the thread and shall not be silently reassigned when the user changes the default connection later.
6. The backend shall reject thread creation when no enabled default connection exists for the authenticated user and shall return a deterministic not-configured state instead of creating route-less chats by accident.
7. The backend shall preserve the existing normalized assistant runtime contract from issues 002 through 005 while changing the route lookup source from single-route to per-user multi-route selection.
8. Stored assistant credential material and header payloads shall remain hidden from normal transcript payloads and shall only be surfaced through the assistant settings workflow where required.
9. Any new widget-owned static UI copy introduced by this issue for assistant connection management shall be translated through `/frontend/src/widgets/assistant/translations.ts` in English, German, French, and Spanish.
10. Shared application texts shall remain in the shared localization files and shall not be duplicated into widget-local assistant translations.

## Involved Modules

- Model:
  per-user assistant connection records, default-connection flag, thread-to-route assignment, route capability metadata, secure stored assistant auth material
- View:
  assistant availability state driven by user-selected default connection, connection inventory summaries, localized assistant settings copy
- Controller:
  authenticated assistant connection CRUD API, default-connection resolution, thread creation route selection, route lookup changes in the assistant runtime

## Implementation Plan

1. Replace the current single active assistant route assumption with a per-user assistant connection table or ownership-aware extension of the existing route table.
2. Add authenticated backend APIs to list, create, update, delete, and default-select assistant connection records for the signed-in user.
3. Persist one default connection flag per user and enforce that at most one enabled default record exists at a time.
4. Update assistant thread creation so new threads attach the currently selected default route id, while existing threads continue using their saved route id.
5. Keep the normalized assistant runtime, MCP tooling, and markdown pipeline intact by changing only the route-source lookup semantics rather than rewriting downstream execution logic.
6. Extend `/frontend/src/widgets/assistant/translations.ts` with any new widget-owned static copy needed for connection inventory and default-selection surfaces in English, German, French, and Spanish.

## Test Cases

1. One Subway user can persist multiple assistant connections and set exactly one of them as the default route.
2. Two different Subway users can maintain different assistant connection inventories and default selections without reading or overwriting each other's records.
3. Creating a new assistant conversation attaches the currently selected default route id to the thread.
4. Changing the default connection does not retroactively change the route id already stored on older assistant threads.
5. Attempting to create a new assistant conversation without an enabled default connection returns a deterministic not-configured error state.
6. Any new assistant widget-owned static texts introduced by the issue render through `/frontend/src/widgets/assistant/translations.ts` in English, German, French, and Spanish.
