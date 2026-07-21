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

007 ASSISTANT SETTINGS MULTI CONNECTION MANAGEMENT UI

## Issue Description

Build the assistant settings workflow that lets a user create, edit, delete, test, and default-select multiple assistant LLM connections directly from the board settings surface. This issue shall provide the user-facing management UI on top of the multi-connection backend foundation from issue 006 and make the default route selection discoverable and safe.

## Previous Issue Within The Epic

006 MULTI CONNECTION ROUTE REGISTRY AND DEFAULT SELECTION FOUNDATION

## Functional Requirements

1. The assistant widget settings panel shall render an inventory of all saved assistant connections for the authenticated user.
2. A user shall be able to create a new assistant connection, edit an existing connection, delete a saved connection, and mark one connection as the default for newly created conversations.
3. The settings UI shall clearly indicate which connection is currently the default route and which connections are enabled or disabled.
4. The settings UI shall allow the user to test a connection before relying on it for new conversations and shall surface a deterministic success or failure state.
5. The settings UI shall preserve the current secure stored-token behavior: leaving the credential field empty during an edit shall keep the already stored token instead of clearing it unintentionally.
6. Deleting a non-default connection shall remove it from the inventory immediately; deleting the current default connection shall either require selecting another default first or shall force the user into a deterministic not-configured state for new conversations.
7. The settings UI shall not expose provider implementation details beyond the fields needed to manage the connection; normal assistant conversations shall still only use the resolved default route automatically.
8. Any new widget-owned static UI copy introduced for multi-connection management shall live in `/frontend/src/widgets/assistant/translations.ts` with English, German, French, and Spanish entries.
9. Shared application texts such as generic save states shall remain in the shared localization files instead of being duplicated into the assistant widget-local translation file.

## Involved Modules

- Model:
  assistant connection drafts, default-selection state, test-result state, secure stored-token presence metadata
- View:
  assistant settings inventory list, create and edit form, default-selection control, delete flow, connection test status, localized settings copy
- Controller:
  assistant settings API client, optimistic inventory refresh, default selection save flow, delete handling, connection test handling

## Implementation Plan

1. Extend the assistant settings frontend API client to manage multi-connection CRUD, default selection, and connection testing.
2. Replace the current single-record assistant settings form with an inventory plus editor workflow inside the assistant widget settings panel.
3. Add clear UI affordances for create, save, delete, test, enable or disable, and make-default actions.
4. Handle saved-token semantics explicitly so blank credential fields preserve the stored token unless the user intentionally clears or replaces it.
5. Refresh the assistant widget's route availability and new-thread behavior immediately after settings changes so the user sees the selected default route take effect without a full reload.
6. Extend `/frontend/src/widgets/assistant/translations.ts` with all new widget-owned connection-management texts in English, German, French, and Spanish.

## Test Cases

1. A user can create two assistant connections in settings, mark one as default, and then create a new conversation that uses that default route.
2. Editing one saved connection preserves the stored token when the token field is left empty.
3. Deleting a saved non-default connection removes it from the inventory without affecting the default route.
4. The UI surfaces deterministic success or failure feedback for connection testing.
5. After changing the default connection in settings, the assistant widget uses the new default for the next created conversation without requiring a full application reload.
6. Any new assistant widget-owned static texts introduced by the issue render through `/frontend/src/widgets/assistant/translations.ts` in English, German, French, and Spanish.