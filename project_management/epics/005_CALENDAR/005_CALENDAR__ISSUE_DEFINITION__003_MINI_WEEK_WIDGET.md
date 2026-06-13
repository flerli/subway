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

003 MINI WEEK WIDGET

## Issue Description

Implement the compact calendar widget view that shows the next seven days of upcoming events on the kiosk board. This issue turns the underlying event model into a concise operational widget surface while preserving family-member scoping, recurring event rendering, foreign-event nation flag indicators, and widget-local multilingual support.

## Previous Issue Within The Epic

002 EVENT CRUD OPERATIONS

## Functional Requirements

1. The compact calendar widget shall show only the next seven calendar days starting from the current day.
2. Events in the compact widget shall be grouped by day and ordered chronologically within each day.
3. Recurring events shall appear as concrete upcoming occurrences when they fall inside the seven-day range.
4. The compact widget shall respect the existing host and family-member filter semantics so only relevant events are shown for the active scope.
5. Events whose normalized location country differs from the configured user country shall display the corresponding nation flag in the compact widget.
6. Events inside the configured user country shall not display a foreign-country flag.
7. The compact widget shall provide a clear empty state when no events exist in the next seven days.
8. Any new widget-owned static UI copy introduced by this issue shall live in `frontend/src/widgets/calendar/translations.ts` with English, German, French, and Spanish entries before the issue is complete.
9. Shared application texts and shared date-formatting infrastructure shall remain outside the widget-local translation file.
10. The compact widget shall provide an affordance to open the widget's extended calendar experience when the host supports expanded presentation.

## Involved Modules

- Model:
  seven-day occurrence projection, compact event summary shape, foreign-country marker or flag metadata, widget-local translation keys
- View:
  compact seven-day calendar widget layout, grouped day sections, nation flag indicator treatment, empty and loading states
- Controller:
  seven-day calendar query wiring, user-country preference consumption, host scope filtering, navigation into the extended calendar view

## Implementation Plan

1. Extend the calendar widget to query and project events for the next seven days only.
2. Render one compact grouped layout optimized for quick kiosk scanning.
3. Reuse the recurring-event range projection so one-off and recurring events appear uniformly.
4. Derive the foreign-country state for each rendered event from the normalized event country and the configured user country, then show the matching nation flag only for foreign events.
5. Add or update `frontend/src/widgets/calendar/translations.ts` with every widget-owned static text in English, German, French, and Spanish.
6. Wire the compact surface to the extended-view entry point instead of adding full CRUD controls directly into the board view.

## Test Cases

1. Events scheduled within the next seven days render in chronological day groups.
2. Events outside the next seven days do not appear in the compact widget.
3. An event outside the configured user country renders the matching nation flag in the compact widget.
4. An event inside the configured user country renders without a foreign-country flag.
5. Member-scoped and household-wide events render correctly when the active host scope changes.
6. The compact widget renders its widget-owned static texts through `frontend/src/widgets/calendar/translations.ts` in English, German, French, and Spanish.