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

001 WIDGET ARCHITECTURE

## Issue Title

004 TODO WIDGET SAMPLE

## Issue Description

Implement the todo widget as the first read/write widget sample. This issue validates that a widget can modify database-backed data while still following the same folder, scope, and host architecture.

## Previous Issue Within The Epic

003 CALENDAR WIDGET SAMPLE

## Functional Requirements

1. A todo widget shall exist inside its own widget folder.
2. The todo widget shall read task data from the database.
3. The todo widget shall be able to modify task data in the database.
4. The todo widget shall respect widget visibility scope.
5. The todo widget shall demonstrate at least one write action, such as done, snooze, or state update.

## Involved Modules

- Model:
  task persistence, widget-to-task linkage, task state model
- View:
  todo widget UI, actionable task states
- Controller:
  task read/write orchestration, widget actions, scope filtering

## Implementation Plan

1. Create the todo widget folder and registration entry.
2. Define the database-backed task model required for the widget.
3. Load task data through the widget controller path.
4. Implement at least one safe write operation.
5. Render scope-aware tasks through the shared widget host.

## Test Cases

1. Tasks are read from the database and displayed by the widget.
2. A widget action updates task state in the database.
3. Scope-filtered tasks are only shown for included members.
4. Todo widget behavior is implemented without breaking widget registry conventions.
