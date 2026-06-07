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

007 WIDGET HEALTH DEBUG OVERLAY

## Issue Description

Add a hidden maintenance overlay for widget diagnostics. The overlay should help kiosk operators and developers inspect widget scope, source, last refresh, and failure state without exposing debugging chrome during normal household use.

## Previous Issue Within The Epic

006 WIDGET SETTINGS PANELS

## Functional Requirements

1. The kiosk shall support a hidden widget debug mode.
2. The debug mode shall show widget scope, source, refresh status, and failure state.
3. The overlay shall be non-invasive and hidden during normal kiosk usage.
4. The overlay shall work for the calendar, todo, and weather widgets.

## Involved Modules

- Model:
  widget status metadata, refresh state, failure state
- View:
  debug overlay UI, health state indicators
- Controller:
  widget diagnostics aggregation, debug mode toggling

## Implementation Plan

1. Define widget health and debug metadata required by the overlay.
2. Implement a hidden debug mode trigger.
3. Render widget diagnostics in a maintenance-oriented overlay.
4. Feed the overlay from the sample widgets and host layer.

## Test Cases

1. Debug mode can be entered without affecting normal widget rendering.
2. The overlay displays widget scope, source, refresh state, and failures.
3. Calendar, todo, and weather widgets surface diagnostics into the overlay.
4. The overlay remains hidden during normal kiosk use.
