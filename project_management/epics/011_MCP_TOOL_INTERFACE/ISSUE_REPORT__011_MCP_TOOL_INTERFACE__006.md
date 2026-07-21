# ISSUE REPORT

## Epic

011 MCP TOOL INTERFACE

## Issue

006 MUTATING AND INTEGRATION WIDGET MCP ROLLOUT

## Implementation Summary

The higher-risk MCP rollout batch was implemented for the remaining currently exposed mutation-heavy and integration-heavy widget surfaces that have a truthful backend-owned execution contract in this repository state.

Implemented widget batches:

- `calendar`
- `todo`
- `bring`
- `roborock`

This issue also fixed one runtime defect in the shared MCP foundation: internal widget tool handlers now receive the owning `ownerUserId` context correctly, so settings-backed and user-scoped widget tools execute against the authenticated user instead of a missing owner context.

## Parity Scope Implemented

### Calendar

Implemented MCP parity for:

- reading range-based calendar event state with member and household filtering
- creating events and recurring series
- updating existing events and recurring series
- deleting events and recurring series
- saving the calendar widget settings

Delete is approval-gated by default.

The backend implementation reuses the existing calendar validation and persistence helpers in `backend/server.mjs`, including `buildCalendarEventFromInput`, recurring-occurrence expansion, and the same family-member scope validation already used by the HTTP API.

### Todo

Implemented MCP parity for:

- reading the filtered todo widget state
- toggling a todo item done or undone
- saving the todo widget settings

The rollout maps directly to the already implemented `todo_items` persistence and `updateTodoItemDone` flow.

### Bring

Implemented MCP parity for the currently exposed human widget flows:

- reading the current Bring widget state
- loading available Bring lists from settings
- saving Bring settings including selected list and stored credentials
- refreshing the selected Bring list
- adding items
- completing items
- reopening recent items

Bring settings update and list discovery tools are approval-gated by default and redact arguments, because they may carry user credentials.

The backend implementation reuses the existing encrypted Bring credential model, selected-list snapshot cache, and sidecar-backed list mutation helpers already present in `backend/server.mjs`.

### Roborock

Implemented MCP parity for the currently exposed human settings flows:

- reading the current Roborock settings state
- requesting a login code by email
- creating and storing a Roborock session with verification code
- loading available devices and routines
- saving selected device and routine
- validating the stored session

Requesting a login code and creating a session are approval-gated by default and redact arguments, because they carry account or verification data.

The backend implementation reuses the existing encrypted session model, device discovery helpers, and sidecar-backed validation flows already present in `backend/server.mjs`.

## Explicit Deferrals

This issue intentionally does not claim parity for surfaces that do not yet have a truthful backend-owned execution contract or are not currently exposed as human widget actions in this repo state.

Deferred items:

- `audio-visual` capture and recording workflows, because the current human flow depends on browser media capture and binary payload creation rather than assistant-safe backend-native inputs
- `assistant` self-management as widget MCP tools, because that would create a self-referential tool surface that needs a separate design pass
- Roborock compact start controls, because the start-widget rollout is still planned in Epic 009 and is not currently exposed as a stable human widget action in this repository state
- Bring item update and delete actions, because the current Bring detail UI in this repository exposes add, complete, reopen, refresh, and settings flows, but does not surface edit or delete controls in the active view

## Backend Runtime Changes

The internal widget runtime in `backend/server.mjs` now covers the higher-risk tool handlers for calendar, todo, Bring, and Roborock.

The implementation reuses existing owning helpers instead of duplicating route logic:

- calendar domain validation and CRUD helpers
- todo done-state persistence helpers
- Bring encrypted credential resolution, selected-list snapshot refresh, and item mutation helpers
- Roborock encrypted session handling, device discovery, and session validation helpers

The shared approval system introduced in Issue 004 is now exercised by real mutating and integration-heavy tools. Default approval-gated tools emit the same pending, approved, rejected, canceled, and expired event states through the existing assistant transcript and widget log infrastructure.

## Notes For Next Issue

Issue 007 can now focus on workflow and documentation alignment rather than runtime foundations. If the team wants assistant parity for binary media capture or self-referential assistant widget management later, those should start with a separate contract decision before implementation.

## Validation

Validated with:

- `node --check backend/server.mjs`
- `npm --prefix frontend run build`
- editor error checks on the touched backend, widget contract, and project-management files