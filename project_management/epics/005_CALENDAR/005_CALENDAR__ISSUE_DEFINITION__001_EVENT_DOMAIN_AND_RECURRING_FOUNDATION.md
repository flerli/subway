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

001 EVENT DOMAIN AND RECURRING FOUNDATION

## Issue Description

Define the persistent calendar event model and the authenticated data contract that later calendar work depends on. The first rollout shall support timed events with structured location fields, a per-user home-country preference configured in the shared settings panel, household-wide or family-member scope assignment, and recurring event rules that can be rendered consistently in seven-day, week, month, and year views.

Clarified scope decisions already fixed for this issue:

- Recurring events are in scope from the start of the epic.
- The first rollout focuses on timed events; all-day, multi-day, and occurrence-exception handling are out of scope.
- Event scope refers to household-wide visibility or assignment to one or more selected family members.
- Location is stored as structured `city` and normalized `country` fields instead of one free-text location string.
- The user country is one global per-user application setting and acts as the reference point for foreign-event flagging.

## Previous Issue Within The Epic

None

## Functional Requirements

1. A calendar event record shall include at least a logical identifier, date, time, title, description, scope assignment, location city, normalized location country, and recurrence definition.
2. The event scope model shall support both household-wide events and events assigned to one or more selected family members.
3. The recurrence contract shall support non-recurring events and recurring events with enough structure for later week, month, and year rendering.
4. Calendar event persistence and all event queries shall remain authenticated and user-scoped, consistent with the existing account ownership model.
5. The system shall define one global user country preference that is persisted per authenticated user, edited through the shared settings panel, and restored across reloads and devices.
6. Any new shared settings-panel static UI copy introduced for the user-country preference shall use the shared application localization files rather than widget-local translations.
7. The backend and frontend contract shall support deterministic range-based event queries for the next seven days, an arbitrary week, an arbitrary month, and an arbitrary year.
8. Recurring events returned for a date range shall resolve into a stable, chronologically ordered set of occurrences for rendering.
9. The data contract shall preserve the distinction between required timed event data and optional descriptive fields without breaking later CRUD workflows.
10. The calendar contract shall make foreign-versus-domestic event detection deterministic by comparing an event's normalized country value against the configured user country.

## Involved Modules

- Model:
  calendar event entity, recurrence rule contract, family-member scope representation, structured location fields, normalized country identifiers, user country preference record, range query result shape
- View:
  calendar event consumers in compact and extended widget presentations, shared settings-panel country preference surface
- Controller:
  authenticated calendar query surfaces, recurrence expansion for rendered ranges, frontend API contract bootstrap, user-country preference load and save

## Implementation Plan

1. Define the persistent calendar event schema and typed frontend data contract.
2. Represent scope assignment so one event can be household-wide or target one or more family members.
3. Normalize event country values and the user-country preference so country comparison and flag rendering remain deterministic.
4. Define a recurring-event contract that later views can project into explicit occurrences within a requested date range.
5. Add one per-user global user-country setting to the shared settings panel and persist it through the existing authenticated preference model.
6. Ensure any new settings-panel labels or helper copy for the user-country setting resolve through the shared application localization files.
7. Add authenticated range-query support for seven-day, week, month, and year use cases.
8. Normalize ordering and serialization so downstream widget views can render one-off and recurring events consistently.

## Test Cases

1. A non-recurring event can be stored and read back with date, time, title, description, scope, city, and normalized country intact.
2. A recurring event produces the expected ordered occurrences when queried for the next seven days and for a later month.
3. Changing the global user-country setting in the shared settings panel persists for the authenticated user and restores after reload.
4. Household-wide events and family-member-scoped events resolve correctly for later host filtering.
5. The same event country is classified consistently as domestic or foreign when compared with the configured user country.
6. A user cannot read or infer another authenticated user's calendar events or country preference through the calendar data contract.