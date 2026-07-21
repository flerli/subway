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

004 HUMAN IN THE LOOP APPROVAL WORKFLOW FOR SENSITIVE WIDGET TOOLS

## Issue Description

Introduce human-in-the-loop approval for sensitive widget MCP tools. This issue shall add a runtime approval gate when the assistant attempts to execute an approval-required widget tool, keep the approval policy configurable per tool in widget settings, and persist approval outcomes so they are visible both during execution time and later in the widget settings audit history.

## Previous Issue Within The Epic

003 WIDGET SCOPED TOOL CALL PERSISTENCE AND SETTINGS AUDIT LOG

## Functional Requirements

1. Sensitive widget tools shall be able to declare that human approval is required before execution.
2. Approval policy shall be configurable per tool through the widget settings MCP configuration area.
3. When the assistant attempts to execute an approval-gated widget tool, execution shall pause until the required approval action is resolved.
4. The runtime approval interaction shall be visible at execution time rather than only in deferred settings history.
5. Approval outcomes shall be persisted and surfaced in the widget settings tool-call log.
6. Rejected, expired, canceled, and approved outcomes shall be distinguishable from generic execution failure.
7. Approval-gated tools shall not mutate widget or external state until approval succeeds.
8. Any widget-owned static UI copy introduced for approval prompts, statuses, or actions shall be translated through the widget-local `translations.ts` file when the copy belongs to the widget.

## Involved Modules

- Model:
  per-tool approval policy state, approval request records, approval outcome states, pending execution metadata
- View:
  runtime approval prompts, settings policy controls, approval history states, localized approval copy
- Controller:
  assistant execution interception, approval queue or prompt orchestration, persistence of approval decisions, resumption or cancellation logic

## Implementation Plan

1. Extend the shared widget MCP contract and runtime metadata so tools can declare approval requirements.
2. Implement execution interception that pauses approval-gated tool calls before mutating work begins.
3. Add runtime approval UX in the assistant execution flow while keeping policy visibility in widget settings.
4. Persist approval requests and final outcomes so they can be reconstructed in the widget audit history.
5. Make approval outcomes first-class execution states rather than collapsing them into generic tool failures.
6. Localize any new widget-owned approval copy through the widget-local translation files and shared shell copy through shared app localization.

## Test Cases

1. An approval-gated widget tool does not execute until a human approves it.
2. A rejected approval request prevents the tool from mutating state and records a rejection outcome in history.
3. Approved tool execution resumes successfully after approval and records both the approval and execution outcome.
4. Expired or canceled approvals render as distinct outcomes from execution failure.
5. Widget-owned approval copy renders in English, German, French, and Spanish when introduced.