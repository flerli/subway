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

011 MCP TOOL INTERFACE

## Issue Title

003 WIDGET SCOPED TOOL CALL PERSISTENCE AND SETTINGS AUDIT LOG

## Issue Description

Persist widget-scoped MCP tool activity as backend-owned audit history and surface it inside each widget settings panel. This issue shall make tool-call history reload-safe, associate events with the owning widget and user, and show enough structured detail for operators to understand what tool ran, with what inputs, under which approval state, and how the execution finished.

## Previous Issue Within The Epic

002 MCP CONFIGURATION PANELS AND PER-USER TOOL POLICY SETTINGS

## Functional Requirements

1. Widget MCP tool activity shall be persisted in backend-owned history rather than only transient client state.
2. Persisted history shall be scoped to the owning widget and authenticated user.
3. The audit model shall record at least tool identity, timestamped execution state transitions, redaction-aware arguments, approval state when applicable, and final result or failure summary.
4. Each widget settings panel shall surface a widget-scoped MCP tool-call log.
5. The settings log shall survive page reload and shall be hydrated from persisted backend records.
6. Redacted fields shall not be rendered in plaintext in the settings log when the runtime marks them as non-displayable.
7. The log shall distinguish successful execution, deterministic rejection or approval outcomes, execution failure, and unavailable-tool conditions.
8. Any new widget-owned static UI copy introduced for log display shall be translated through the widget-local `translations.ts` file when that copy belongs to the widget.

## Involved Modules

- Model:
  widget-scoped tool-call event records, audit retention metadata, redaction flags, approval state snapshots
- View:
  settings log views, execution-state badges, result summaries, localized log empty or error states
- Controller:
  event persistence, audit retrieval APIs, settings-panel hydration, redaction-aware payload shaping

## Implementation Plan

1. Define backend persistence for widget-scoped MCP tool-call records keyed to the owning user and widget.
2. Store the execution lifecycle details required to reconstruct a widget tool invocation after reload.
3. Extend widget settings experiences with a log surface that reads from persisted audit history.
4. Reuse the redaction and structured-result principles already established by the assistant tool runtime where appropriate.
5. Render distinct execution outcomes so operators can separate approval rejection, execution failure, and successful completion.
6. Add widget-local translations for any widget-owned log copy introduced by the rollout.

## Test Cases

1. A widget tool invocation appears in the widget settings log after execution and remains visible after page reload.
2. The log shows the correct widget association, tool name, execution outcome, and approval state.
3. Redacted fields are not displayed in plaintext in persisted log views.
4. Failure, rejection, and success states are rendered distinctly.
5. Widget-owned log copy renders in English, German, French, and Spanish when introduced.