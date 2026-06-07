# ISSUE REPORT

## Epic

001 WIDGET ARCHITECTURE

## Issue

004 TODO WIDGET SAMPLE

## Implementation Summary

Implemented the first read/write sample widget as the todo widget.

Concrete changes:

- Added a persistent `todo_items` table and seed data in `backend/server.mjs`.
- Added backend API routes for reading todo items and updating todo done state.
- Added a todo-specific frontend API client in `frontend/src/widgets/todo/todoApi.ts`.
- Implemented real `loadData` and `mutateData` behavior in `frontend/src/widgets/todo/index.ts`.
- Replaced the hard-coded frontend todo sample in `frontend/src/App.tsx` with data loaded through the registered todo widget module.
- Added a `Done` / `Reopen` widget action in `frontend/src/widgets/WidgetBoardHost.tsx`.

## Implementation Choices

1. Todo items are stored in the backend SQLite database alongside family members, widget metadata, and calendar events.
2. Todo scope is represented with member id arrays and `*` for household-wide items.
3. The todo widget filters tasks by focused member in `loadData`.
4. The write action is modeled as a safe `done` state change through `mutateData` rather than freeform task editing.
5. Completed tasks stay visible and can be reopened so the widget demonstrates both update persistence and reversible state changes.

## Validation

- `npm --prefix /Users/flerli/01_Swaibian/Swaibian-Main_Office/05_Products/subway/frontend run build` passed.
- Browser validation confirmed `/api/todo-items` returns `200` with 4 tasks.
- Browser validation confirmed the todo widget renders through the shared host.
- Browser validation confirmed the widget action updates backend state:
  - first todo item changed from `done: false` to `done: true`
  - the same item was reverted from `done: true` back to `done: false`

## Follow-On Notes For The Next Developer

1. Issue 005 can reuse the same backend-backed widget pattern while keeping weather read-only.
2. Later product work can add richer task editing once the safe read/write pattern is stable.
3. The todo widget now has a reversible write path, so future issues can extend from `done` state into snooze or reassignment without redesigning the widget contract.