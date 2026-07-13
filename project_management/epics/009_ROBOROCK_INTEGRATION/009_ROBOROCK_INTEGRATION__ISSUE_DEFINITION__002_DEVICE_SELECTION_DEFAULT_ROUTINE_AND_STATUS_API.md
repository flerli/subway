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

002 DEVICE SELECTION DEFAULT ROUTINE AND STATUS API

## Issue Description

Build the authenticated Roborock device domain on top of the connection foundation so each Subway user can discover compatible Roborock robot vacuums, select one active robot, choose one default Roborock routine or scene for the quick-start action when available, and retrieve a capability-aware status snapshot that the widget surfaces can consume.

## Previous Issue Within The Epic

001 PYTHON SIDECAR AND EMAIL CODE CONNECTION FOUNDATION

## Functional Requirements

1. Subway shall load the Roborock devices available to the signed-in user's Roborock account and filter first-release support to robot vacuums that expose the library traits needed for status and cleaning commands.
2. The user shall be able to select one active Roborock robot within Subway settings for use by the widget.
3. The user shall be able to select one default Roborock routine or scene for the quick-start action when the selected robot account exposes routable routines or scenes through the upstream library.
4. If the selected robot or account does not expose routines or scenes, Subway shall surface that capability explicitly and fall back to a standard start-clean action instead of failing silently.
5. The backend shall persist the selected robot identity and selected default routine configuration per authenticated Subway user.
6. Subway shall expose authenticated backend endpoints for loading the selected robot status snapshot and for triggering the configured start action against the selected robot.
7. The status snapshot shall include stable fields for current robot state, battery level, and last-refresh metadata.
8. The status snapshot shall include time elapsed, time remaining, current room or location, active cleaning area or room coverage, and similar telemetry only when the selected robot model and upstream library expose those values reliably.
9. The backend status response shall include capability flags or equivalent metadata so frontend surfaces can hide unsupported location, ETA, or room-detail fields gracefully.
10. When the Roborock session has expired, the selected robot is no longer reachable, or the configured routine is no longer available, Subway shall return deterministic error states that guide the user back to reconnect or reconfigure instead of returning a silent empty payload.
11. Any widget-owned static UI copy introduced by the robot-selection, routine-selection, or capability-state settings flow in this issue shall live in `frontend/src/widgets/roborock/translations.ts` with English, German, French, and Spanish entries before the issue is complete.
12. Shared application texts shall remain in the shared localization files instead of being duplicated into the Roborock widget-local translation file.

## Involved Modules

- Model:
  Roborock device metadata, selected robot reference, selected default routine configuration, status snapshot payload, capability flags
- View:
  device-selection settings controls, routine-selection settings controls, capability and unsupported-state messaging
- Controller:
  device discovery, routine discovery, selected-robot persistence, status polling and normalization, quick-start command orchestration

## Implementation Plan

1. Extend the Python Roborock sidecar with device-discovery, selected-robot status, routine or scene discovery, and start-command endpoints backed by `python-roborock` device traits.
2. Add Node backend routes for Roborock device list, selected-device settings, selected routine settings, status retrieval, and quick-start execution.
3. Persist selected robot and default routine configuration in SQLite on a per-user basis.
4. Normalize upstream Roborock device and status payloads into a stable Subway contract that separates guaranteed fields from optional capability-driven fields.
5. Implement settings UI for selecting the active robot and default routine or scene, including an explicit unsupported-capability fallback when the account or model cannot provide routine choices.
6. Add or update `frontend/src/widgets/roborock/translations.ts` with every widget-owned static text introduced by the robot-selection, routine-selection, and capability-state settings experience in English, German, French, and Spanish.

## Test Cases

1. A signed-in user with multiple compatible Roborock vacuums can load the available devices and persist one selected robot.
2. A signed-in user can load and persist one default Roborock routine or scene when the selected account exposes routable choices.
3. A selected robot that does not expose routines or scenes falls back to standard start-clean behavior with explicit frontend messaging instead of a backend failure.
4. The normalized Roborock status payload always returns state, battery, and last-refresh metadata and includes optional fields only when supported by the selected model.
5. Expired Roborock sessions, missing devices, and deleted routines return deterministic backend error states that the frontend can map into reconnect or reconfiguration guidance.
6. The Roborock device-selection and routine-selection settings UI renders its widget-owned static texts through `frontend/src/widgets/roborock/translations.ts` in English, German, French, and Spanish.