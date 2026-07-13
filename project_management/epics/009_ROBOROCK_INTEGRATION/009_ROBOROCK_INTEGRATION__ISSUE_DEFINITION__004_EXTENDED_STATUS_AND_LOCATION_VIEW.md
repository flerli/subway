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

004 EXTENDED STATUS AND LOCATION VIEW

## Issue Description

Build the extended Roborock detail experience so users can inspect the current state of the selected robot without leaving the widget context. The extended view shall surface live cleaning status, battery, elapsed and remaining time, optional current room or location details, optional cleaning area or room coverage, and explicit reconnect or unsupported-capability messaging when the selected model does not expose all telemetry.

## Previous Issue Within The Epic

003 MINI START WIDGET

## Functional Requirements

1. The extended Roborock detail view shall show the currently selected Roborock robot for the signed-in Subway user.
2. The extended view shall show the selected robot's current status or state, battery level, and last-refresh metadata.
3. The extended view shall show cleaning time elapsed and remaining time when the selected model and upstream library expose those values.
4. The extended view shall show current room, map position, or other location detail when the selected model and upstream library expose those values reliably.
5. The extended view shall show cleaning area, active rooms, or similar coverage details when the selected model and upstream library expose them.
6. Unsupported telemetry fields such as missing location or ETA data shall be hidden gracefully or replaced by explicit unsupported messaging rather than rendering broken placeholders.
7. The extended view shall allow the user to trigger a manual refresh of the Roborock status snapshot.
8. The extended view shall guide the user back to Roborock settings when the session has expired, the selected robot is unavailable, or the configured routine or robot selection is no longer valid.
9. The first release of the extended view shall prioritize status observability and guidance; advanced live map rendering or route-history playback is out of scope unless already provided cheaply by the upstream library and backend contract.
10. Any widget-owned static UI copy introduced by this issue shall live in `frontend/src/widgets/roborock/translations.ts` with English, German, French, and Spanish entries before the issue is complete.
11. Shared application texts shall remain in the shared localization files instead of being duplicated into the Roborock widget-local translation file.

## Involved Modules

- Model:
  extended Roborock status payload, optional telemetry capability flags, refresh metadata, widget-local translation keys
- View:
  extended status layout, battery and timing panels, optional room or location sections, refresh action, reconnect guidance
- Controller:
  extended-view status refresh orchestration, capability-aware rendering decisions, settings redirect or open action

## Implementation Plan

1. Reuse the existing extended detail-view framework as the shell for the Roborock widget's detailed experience.
2. Build a capability-aware extended status surface that separates guaranteed fields from optional location, ETA, and coverage fields.
3. Implement manual refresh behavior backed by the authenticated Roborock status endpoint.
4. Render explicit reconnect-required, robot-missing, unsupported-capability, loading, and unavailable states so users can distinguish missing configuration from missing telemetry.
5. Add or update `frontend/src/widgets/roborock/translations.ts` with every widget-owned static text introduced by the extended Roborock experience in English, German, French, and Spanish.

## Test Cases

1. A configured signed-in user can open the extended Roborock view and see current state, battery, and last-refresh metadata for the selected robot.
2. When the selected model exposes time elapsed and time remaining, those values render correctly in the extended view.
3. When the selected model exposes room, location, or coverage data, those values render correctly in the extended view.
4. When the selected model does not expose ETA or location telemetry, the extended view hides or marks those fields as unsupported without rendering broken placeholders.
5. Manual refresh updates the extended status payload without leaving the widget context.
6. Expired sessions, missing robots, or invalid routine or selection states render reconnect or reconfiguration guidance instead of a silent empty state.
7. The extended Roborock experience renders its widget-owned static texts through `frontend/src/widgets/roborock/translations.ts` in English, German, French, and Spanish.