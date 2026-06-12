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

002 WEATHER WIDGET

## Issue Title

004 WEATHER EXTENDED VIEW AND REFRESH COUNTDOWN

## Issue Description

Use the generic extended-view framework to render all configured weather locations at a glance. The expanded weather view shall present one focus location and up to four smaller secondary locations, while also surfacing the configurable time until the next weather refresh.

## Previous Issue Within The Epic

003 GENERIC EXTENDED VIEW DETAIL FRAMEWORK

## Functional Requirements

1. The expanded weather view shall display all configured locations at a glance, with one focus location and up to four secondary locations.
2. The weather widget shall expose the time remaining until the next refresh based on a configurable refresh interval.
3. The refresh countdown shall update in the UI over time and reset after a successful refresh.
4. The expanded weather view shall reuse the multi-location data model and iconography system introduced by earlier issues in this epic.
5. The expanded weather view shall degrade gracefully when fewer than five locations are configured or when weather data is stale for one or more locations.

## Involved Modules

- Model:
  expanded weather dashboard view model, refresh interval configuration, countdown state
- View:
  all-locations weather dashboard, focus and secondary location cards, countdown and refresh-state presentation
- Controller:
  refresh scheduling, countdown recalculation, expanded weather data assembly, stale/error handling across multiple locations

## Implementation Plan

1. Add a configurable refresh interval setting that the weather widget can persist and use for countdown calculations.
2. Compute the next refresh timestamp and expose a countdown model to both compact and extended weather surfaces.
3. Render the expanded weather dashboard with one focus location and up to four secondary locations.
4. Handle stale, partial, and error states so the expanded dashboard remains stable when one location fails or when the next refresh is pending.

## Test Cases

1. The expanded weather view renders correctly with one, three, and five configured locations.
2. The time-until-next-update countdown decreases over time and resets after refresh.
3. Changing the refresh interval setting changes the countdown behavior after persistence.
4. Partial data or stale refresh states do not break the expanded weather dashboard.
