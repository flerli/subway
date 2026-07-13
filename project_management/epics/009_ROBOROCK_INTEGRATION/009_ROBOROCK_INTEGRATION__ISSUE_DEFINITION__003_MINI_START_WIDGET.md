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

009 ROBOROCK INTEGRATION

## Issue Title

003 MINI START WIDGET

## Issue Description

Implement the compact Roborock widget that brings one-tap cleaning control onto the Subway board. The mini widget shall surface the selected robot, expose a primary start button for the configured default routine or the supported fallback clean action, and communicate configuration, loading, active-cleaning, and failure states clearly within the compact board footprint.

## Previous Issue Within The Epic

002 DEVICE SELECTION DEFAULT ROUTINE AND STATUS API

## Functional Requirements

1. The compact Roborock widget shall render on the board using the selected Roborock robot for the signed-in Subway user.
2. The compact widget shall expose one primary start action that launches the user's configured default Roborock routine or scene when available, or the standard fallback clean action otherwise.
3. The compact widget shall not require pause, stop, or dock controls in the first release; the mini surface is intentionally optimized for a single quick-start action.
4. The compact widget shall show whether the selected robot is idle, cleaning, unavailable, or not yet configured.
5. The compact widget shall prevent duplicate start submissions while a start request is in flight.
6. The compact widget shall communicate when the configured Roborock session has expired, when no robot has been selected, and when no default routine is available for the selected model so the user can open settings instead of seeing a silent failure.
7. The widget-owned static texts for the Roborock compact surface shall live in `frontend/src/widgets/roborock/translations.ts` and shall include the mini widget's action labels and state copy.
8. Shared application texts shall remain in the shared localization files instead of being duplicated into the Roborock widget-local translation file.

## Involved Modules

- Model:
  compact Roborock widget payload, quick-start pending state, widget-local translation keys
- View:
  compact widget card, start button, configuration and unavailable states, active-cleaning state summary
- Controller:
  compact-surface data loading, quick-start command handling, settings redirect or open action, optimistic pending-state handling

## Implementation Plan

1. Add a Roborock widget folder under `frontend/src/widgets/roborock/` and register the widget in the shared widget registry and metadata contracts.
2. Build the compact Roborock board surface around a single primary start action and concise robot-state messaging.
3. Connect the start action to the authenticated Roborock backend command endpoint and render success, loading, and error states without requiring a full page refresh.
4. Route configuration-required and reconnect-required states into the existing widget settings workflow.
5. Create or extend `frontend/src/widgets/roborock/translations.ts` with every widget-owned static text introduced by the compact Roborock experience in English, German, French, and Spanish.

## Test Cases

1. A configured signed-in user can trigger the compact widget's start action and launch the selected default routine or fallback clean action.
2. Repeated taps while the start request is pending do not dispatch duplicate Roborock start commands.
3. A user without a Roborock connection, without a selected robot, or with an expired session sees explicit configuration or reconnect guidance instead of a silent failure.
4. The compact widget reflects idle versus active-cleaning state changes after a successful start action.
5. The compact Roborock widget renders its widget-owned static texts through `frontend/src/widgets/roborock/translations.ts` in English, German, French, and Spanish.