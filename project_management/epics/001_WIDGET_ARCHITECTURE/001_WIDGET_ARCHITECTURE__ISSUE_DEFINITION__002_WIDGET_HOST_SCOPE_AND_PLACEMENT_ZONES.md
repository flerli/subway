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

002 WIDGET HOST, SCOPE AND PLACEMENT ZONES

## Issue Description

Build the shared widget host after the registry basics are stable. This issue connects widget metadata to actual kiosk rendering, resolves visibility from the active focus filters, and introduces configurable placement zones so widgets can be attached to defined regions of the board.

## Previous Issue Within The Epic

001 WIDGET REGISTRY FOUNDATION

## Functional Requirements

1. The kiosk shall render widgets through a shared widget host rather than hard-coding widget logic directly in one screen component.
2. The widget host shall resolve visibility for:
   - all members
   - one selected member
   - multiple selected members
3. Widgets outside the current focus scope shall not be rendered in the active board view.
4. The system shall define configurable placement zones for widgets.
5. A widget shall be assignable to one or more placement zones without changing widget code.
6. Placement zones shall support future expansion into different board layouts or screen regions.

## Involved Modules

- Model:
  widget placement metadata, scope resolution inputs, board zone representation
- View:
  widget host, board layout zones, widget visibility behavior
- Controller:
  scope evaluation, placement resolution, widget loading orchestration

## Implementation Plan

1. Define placement zone metadata and its relationship to widgets.
2. Implement a widget host that reads widget registrations and placement assignments.
3. Connect host rendering to the existing user focus filters.
4. Hide widgets when they are out of scope for the active focused member.
5. Render widgets into their configured placement zones.

## Test Cases

1. A widget assigned to the board is rendered through the shared host.
2. A widget scoped to one member is hidden for another member.
3. A widget scoped to multiple members is visible for each included member and hidden for excluded members.
4. Changing placement metadata moves the widget without modifying widget source code.
