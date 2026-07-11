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

004 EXTENDED SHOPPING LIST VIEW AND COMPLETION WORKFLOWS

## Issue Description

Build the extended Bring detail experience so users can manage the selected Bring shopping list without leaving the widget context. The extended view shall support item creation, specification updates, completion, deletion, manual refresh, reconnect guidance, and a reopen-through-readd workflow for recently completed items while explicitly avoiding direct item-name rename behavior that the upstream Bring README discourages.

## Previous Issue Within The Epic

003 MINI SHOPPING LIST WIDGET

## Functional Requirements

1. The extended Bring detail view shall show the currently selected Bring shopping list for the signed-in Subway user.
2. Users shall be able to add a new item with required item name and optional specification from within the extended view.
3. Users shall be able to update an existing item's specification from within the extended view.
4. Users shall be able to complete an open item from within the extended view.
5. Users shall be able to delete an open item from within the extended view.
6. Users shall be able to trigger a manual refresh of the selected Bring list from within the extended view.
7. The extended view shall provide a supported reopen workflow for recently completed items by re-adding them to the open list instead of relying on unsupported rename semantics.
8. The first release of the extended view shall not require a full Bring completed-history browser; an immediate undo or limited recent-completion reopen flow is sufficient.
9. Direct item-name rename shall not be exposed as a first-class UI action because the upstream Bring README documents inconsistent refresh behavior after renaming.
10. When Subway is rendering stale cached Bring data, the extended view shall show the stale state explicitly and restrict mutation actions when the backend reports the integration as read-only.
11. When Bring credentials are invalid or the selected list is no longer available, the extended view shall guide the user back to the Bring settings flow instead of showing a silent empty state.
12. Any new widget-owned static UI copy introduced by this issue shall live in `frontend/src/widgets/bring/translations.ts` with English, German, French, and Spanish entries before the issue is complete.
13. Shared application texts shall remain in the shared localization files instead of being duplicated into the Bring widget-local translation file.

## Involved Modules

- Model:
  extended Bring list payload, pending mutation state, immediate reopen payload, refresh and stale metadata, widget-local translation keys
- View:
  extended Bring list layout, add-item form, spec-edit flow, complete and delete actions, reconnect guidance, stale-state and read-only messaging
- Controller:
  extended-view fetch and refresh orchestration, mutation lifecycle handling, reopen-through-readd flow, settings redirect or open action

## Implementation Plan

1. Reuse the existing extended detail-view framework as the shell for the Bring widget's detailed experience.
2. Build an open-items management surface with add, edit-spec, complete, delete, and manual-refresh actions backed by Subway's authenticated Bring API.
3. Implement a supported reopen flow for recently completed items by capturing enough item data to re-add the item into the open list after completion.
4. Render explicit stale cached, invalid-credentials, selected-list-missing, loading, and empty states so the user can distinguish data freshness from configuration problems.
5. Keep direct rename out of the UI and, if a future name-change flow is ever introduced, require delete-and-recreate behavior instead of uuid-preserving rename.
6. Add or update `frontend/src/widgets/bring/translations.ts` with every widget-owned static text introduced by the extended Bring experience in English, German, French, and Spanish.

## Test Cases

1. A signed-in user can add a new Bring item from the extended view and sees the updated open list without leaving the widget context.
2. A signed-in user can update an existing item's specification from the extended view and sees the updated specification reflected in the list.
3. Completing an item removes it from the open list and enables the supported reopen flow.
4. Reopening a recently completed item returns it to the open list without relying on a direct rename operation.
5. Deleting an item removes it from the extended list view without leaving stale UI rows behind.
6. A stale cached response renders explicit stale or read-only messaging and blocks mutations when the backend reports that writes are unavailable.
7. Invalid Bring credentials or a missing selected list render reconnect guidance instead of a silent empty state.
8. The extended Bring experience renders its widget-owned static texts through `frontend/src/widgets/bring/translations.ts` in English, German, French, and Spanish.