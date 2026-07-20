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

001 CHAT DOMAIN AND ADMIN MANAGED BACKEND REGISTRY FOUNDATION

## Issue Description

Define the Subway-owned assistant domain model and governance contract for a new authenticated chat section outside the widget system. This issue shall establish persistent per-user conversation ownership, assistant thread and message records, application-level backend routing metadata, and the rule that model or provider selection is controlled by admins rather than by normal end users.

## Previous Issue Within The Epic

None (first issue in epic)

## Functional Requirements

1. Subway shall introduce a dedicated authenticated assistant section as an application surface outside the widget architecture.
2. Every authenticated Subway user shall own an independent set of assistant conversation threads and messages that cannot be read or modified by other users.
3. The backend shall persist assistant threads, messages, message roles, ordering metadata, lifecycle state, and timestamps so a user can leave and return to previous conversations.
4. The assistant foundation shall define a normalized backend registry that supports at least two backend kinds: `litellm` routes and direct custom backend routes.
5. Backend selection, model selection, and routing policy shall be application-level admin-managed configuration and shall not be editable by normal end users in the first release.
6. The browser shall communicate only with Subway-owned `/api/assistant/*` endpoints; upstream model providers, LiteLLM services, and custom model backends shall remain private infrastructure behind the Subway backend.
7. The backend registry shall store capability metadata required by later issues, including whether a route supports streaming responses, tool calling, and markdown-rich output.
8. The chat domain shall reserve a normalized structure for future tool-call events so tool execution records can be attached to assistant turns without redesigning the thread schema later.
9. Any new user-facing static UI copy introduced by the assistant section shall use the shared localization foundation from Epic 004 instead of hard-coded strings.
10. The issue shall define deterministic not-configured, unavailable, and disabled states so the assistant section can fail gracefully when no admin-managed backend route is active.

## Involved Modules

- Model:
  assistant threads, assistant messages, backend registry entries, route capability metadata, assistant availability state
- View:
  assistant entry point, empty-state shell, unavailable-state shell, shared localized section chrome
- Controller:
  authenticated `/api/assistant/*` surface, per-user ownership enforcement, admin-managed route resolution, thread lifecycle orchestration

## Implementation Plan

1. Define SQLite or equivalent persistence for assistant threads, assistant messages, and admin-managed backend registry records with explicit ownership and timestamps.
2. Add authenticated backend routes for listing threads, creating threads, loading a thread transcript, and exposing read-only assistant availability metadata to the frontend.
3. Introduce an internal backend registry contract that can describe LiteLLM-backed routes and direct custom backend routes through one normalized schema.
4. Implement routing resolution rules so one admin-managed active route can be selected for all normal users without any end-user provider picker.
5. Define the message and event schema so later issues can append streaming chunks, tool-call events, and rendered markdown content without breaking persisted transcripts.
6. Wire any new assistant section chrome into the shared localization pattern already used by the application shell.

## Test Cases

1. A signed-in Subway user can create a new assistant thread, reload the application, and still see the thread listed and owned by that same user.
2. Two different Subway users cannot read or overwrite each other's assistant threads or messages.
3. The backend can persist both `litellm` and direct custom backend registry entries through one normalized route schema.
4. A normal end user cannot select or change the active backend route through the assistant UI.
5. When no active route is configured, the assistant section returns and renders a deterministic unavailable or not-configured state instead of a generic server failure.
