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

003 CALENDAR WIDGET SAMPLE

## Issue Description

Implement the first sample widget as a database-backed calendar widget. This issue validates that a widget can live in its own folder, read scoped data, and render through the shared host.

## Previous Issue Within The Epic

002 WIDGET HOST, SCOPE AND PLACEMENT ZONES

## Functional Requirements

1. A calendar widget shall exist inside its own widget folder.
2. The calendar widget shall read event data from the database.
3. The calendar widget shall present that data to the kiosk UI through the shared widget host.
4. The calendar widget shall respect widget visibility scope.
5. The calendar widget shall support household-wide events and per-member events.

## Involved Modules

- Model:
  calendar event persistence, widget configuration linkage
- View:
  calendar widget UI, event rendering states
- Controller:
  calendar data loading, host registration, scope filtering

## Implementation Plan

1. Create the calendar widget folder and registration entry.
2. Define the database-backed event model required for the widget.
3. Load calendar data through the widget controller path.
4. Render events inside the shared widget host with scope-aware visibility.

## Test Cases

1. Calendar events are read from the database and displayed by the widget.
2. Household events are visible in the `All` view.
3. Member-scoped events are only visible for included members.
4. The calendar widget renders through the shared host without direct page wiring.
