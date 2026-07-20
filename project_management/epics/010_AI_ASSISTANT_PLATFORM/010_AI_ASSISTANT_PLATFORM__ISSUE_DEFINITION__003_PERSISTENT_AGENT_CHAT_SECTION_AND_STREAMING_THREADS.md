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

003 PERSISTENT AGENT CHAT SECTION AND STREAMING THREADS

## Issue Description

Build the user-facing assistant experience as a dedicated application section outside the widget system. This issue shall add persistent thread navigation, message composition, streaming assistant replies, and authenticated transcript loading while preserving the rule that normal users only chat and do not choose providers or models.

## Previous Issue Within The Epic

002 LITELLM WRAPPER AND CUSTOM BACKEND CONNECTOR RUNTIME

## Functional Requirements

1. Subway shall expose the assistant as a dedicated authenticated application section rather than as a compact widget.
2. A signed-in user shall be able to create a conversation, reopen an existing conversation, and continue the same thread with persisted history.
3. User-submitted prompts and assistant responses shall be stored into the persistent transcript in stable chronological order.
4. Assistant replies shall support streaming delivery so the user can see the answer arrive incrementally instead of waiting only for the final full payload.
5. The assistant section shall render distinct states for idle, sending, streaming, completed, failed, and unavailable turns.
6. Normal end users shall not be able to choose the underlying model, provider, or backend route in the assistant UI.
7. The UI may show read-only assistant availability or route-label metadata when useful, but it shall not expose admin-only configuration controls.
8. The assistant section shall use the existing authentication model so unauthenticated visitors cannot access thread history or send prompts.
9. Any new user-facing static UI copy introduced by the assistant section shall use the shared localization foundation from Epic 004.

## Involved Modules

- Model:
  persisted thread metadata, transcript messages, streaming message state, localized assistant shell copy
- View:
  assistant section navigation, thread list, transcript panel, composer, streaming state UI, localized empty and failure states
- Controller:
  thread create and load flows, prompt submission, streaming transport, transcript refresh, auth-aware assistant bootstrap

## Implementation Plan

1. Add a dedicated frontend assistant section within the authenticated application shell rather than within the widget board.
2. Implement a thread list and transcript layout that can create new threads and reopen persisted conversations from the backend APIs defined earlier in the epic.
3. Add prompt composition and message-send flow using the normalized assistant runtime from issue 002.
4. Implement streaming response handling so assistant turns can append partial content before the final completion state is committed.
5. Persist user and assistant messages into the thread transcript and reconcile optimistic frontend state with the stored backend record.
6. Localize all new assistant section chrome through the shared application localization system.

## Test Cases

1. A signed-in user can create a new assistant thread, send a prompt, refresh the page, and still see the full transcript.
2. Assistant responses stream incrementally in the UI and settle into a completed persisted assistant message when the turn finishes.
3. An unauthenticated visitor cannot access assistant thread APIs or view another user's transcript.
4. A normal end user sees no provider or model selection controls in the assistant section.
5. Localized assistant section shell texts render through the shared language setting in English, German, French, and Spanish.
