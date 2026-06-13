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

004 EXTENDED WEEK MONTH YEAR VIEWS AND CRUD

## Issue Description

Build the calendar widget's extended detail experience so users can browse event-only calendar data in week, month, and year views and manage events without leaving the widget context. This issue shall reuse the existing extended-view infrastructure and the shared calendar CRUD workflow from the previous issue, and it shall surface nation flags for events outside the configured user country.

## Previous Issue Within The Epic

003 MINI WEEK WIDGET

## Functional Requirements

1. The extended calendar experience shall support dedicated week, month, and year views.
2. Each extended view shall render calendar events only and shall not mix todo, weather, or unrelated widget content into the surface.
3. Users shall be able to navigate to previous and next ranges within week, month, and year mode.
4. Recurring events shall resolve into the active extended range consistently across all three view modes.
5. Users shall be able to create, edit, and delete calendar events from within the extended calendar experience by reusing the shared event CRUD workflow.
6. Event detail and edit surfaces shall expose title, date, time, description, scope assignment, location city, location country, and recurrence settings.
7. Events whose normalized location country differs from the configured user country shall display the corresponding nation flag throughout the extended calendar experience.
8. Events inside the configured user country shall not display a foreign-country flag.
9. The extended calendar experience shall respect the same family-member filtering and authenticated data ownership rules as the compact widget.
10. Any new widget-owned static UI copy introduced by this issue shall live in `frontend/src/widgets/calendar/translations.ts` with English, German, French, and Spanish entries before the issue is complete.
11. Shared application texts shall remain in the shared localization files instead of being duplicated into the widget-local translation file.

## Involved Modules

- Model:
  extended range query results, selected calendar view mode, foreign-country marker or flag metadata, event editor state, widget-local translation keys
- View:
  extended week, month, and year layouts, view-mode switcher, range navigation, nation flag indicator treatment, event detail and edit surfaces
- Controller:
  extended-view state transitions, range-based event loading, user-country preference consumption, CRUD refresh orchestration, recurring-event projection across active ranges

## Implementation Plan

1. Reuse the existing extended widget framework as the shell for the calendar's detailed experience.
2. Implement week, month, and year calendar presentations driven by range-based event queries.
3. Connect the shared create, edit, and delete event workflow to the extended calendar surface.
4. Derive the foreign-country state for each rendered event from the normalized event country and the configured user country, then show the matching nation flag only for foreign events.
5. Render structured event detail content, including location city and country, in both display and edit flows.
6. Add or update `frontend/src/widgets/calendar/translations.ts` with every widget-owned static text introduced by the extended calendar experience in English, German, French, and Spanish.

## Test Cases

1. Switching between week, month, and year views updates the rendered event range correctly.
2. Navigating forward and backward in each view mode reloads and displays the correct set of events.
3. An event outside the configured user country renders the matching nation flag in week, month, and year views.
4. An event inside the configured user country renders without a foreign-country flag.
5. Creating, editing, and deleting an event from the extended calendar experience updates the rendered data without leaving the widget context.
6. Recurring events appear in the expected positions across week, month, and year ranges.
7. The extended calendar experience renders its widget-owned static texts through `frontend/src/widgets/calendar/translations.ts` in English, German, French, and Spanish.