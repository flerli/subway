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

005 CALENDAR

## Issue Title

002 EVENT CRUD OPERATIONS

## Issue Description

Implement authenticated create, read, update, and delete operations for calendar events on top of the event-domain foundation. This issue shall cover validation, ownership enforcement, normalized country input, and a shared frontend editor workflow that later compact and extended calendar views can reuse.

Clarified scope decisions already fixed for this issue:

- Recurring events are managed at the series level in the first rollout.
- Editing or deleting a single occurrence inside a recurring series is out of scope.
- Location remains a structured `city` and normalized `country` pair rather than one free-text field.

## Previous Issue Within The Epic

001 EVENT DOMAIN AND RECURRING FOUNDATION

## Functional Requirements

1. Authenticated users shall be able to create calendar events with date, time, title, description, scope assignment, location city, normalized location country, and recurrence settings.
2. Authenticated users shall be able to update every editable event property without changing event ownership.
3. Authenticated users shall be able to delete one-off events and recurring series they own.
4. Backend validation shall reject malformed or incomplete event payloads with deterministic error behavior.
5. The CRUD surface shall preserve the distinction between household-wide events and events assigned to one or more selected family members.
6. Event create and edit flows shall constrain or validate location country input against the normalized country format required for user-country comparison and flag rendering.
7. The frontend shall expose one shared event editor workflow that later calendar widget surfaces can reuse instead of duplicating form state and validation rules.
8. CRUD operations for recurring events shall apply to the entire series in this first rollout.

## Involved Modules

- Model:
  calendar event write payloads, recurrence input shape, normalized country input contract, validation rules, ownership constraints
- View:
  shared event editor form states, reusable create and edit affordances, normalized country selection or entry control, delete confirmation states
- Controller:
  authenticated create, update, delete routes, frontend request helpers, error handling and optimistic refresh decisions

## Implementation Plan

1. Add authenticated create, update, delete, and read endpoints or handlers for calendar events.
2. Validate required fields, normalized country values, and unsupported recurrence or scope payloads before persistence.
3. Introduce reusable frontend request helpers and one shared event editor state model for later widget use.
4. Enforce ownership and scope rules on every write path.
5. Return stable success and error responses so later widget views can refresh predictably after CRUD actions.

## Test Cases

1. Creating a valid one-off event persists the full event payload, including normalized country, and returns it to the authenticated owner.
2. Creating and updating a recurring event series preserves the recurrence definition and the scope assignment.
3. Invalid or unsupported country values are rejected before persistence.
4. Deleting an event removes it from later range queries for the same authenticated user.
5. Invalid payloads, unauthenticated requests, and attempts to modify another user's event are rejected.