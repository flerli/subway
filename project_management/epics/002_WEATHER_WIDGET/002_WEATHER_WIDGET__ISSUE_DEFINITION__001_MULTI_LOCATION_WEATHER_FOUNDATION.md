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

001 MULTI LOCATION WEATHER FOUNDATION

## Issue Description

Expand the weather widget from a single configured location to a multi-location foundation. The kiosk shall support up to five configured weather locations, with one focus location for the compact widget and up to four additional secondary locations for later extended-view use.

## Previous Issue Within The Epic

none

## Functional Requirements

1. The weather widget shall support up to five configured locations.
2. Each configured location shall store at least a label, latitude, and longitude.
3. One configured location shall act as the focus location used by the compact weather widget.
4. The configured location order shall be stable so later extended views can render one focus location plus up to four secondary locations.
5. Existing single-location weather settings shall normalize safely into the new multi-location model.

## Involved Modules

- Model:
  weather widget settings schema, multi-location configuration, focus-location ordering
- View:
  weather settings UI for multiple locations, compact weather rendering from the focus location, validation and empty states
- Controller:
  settings normalization, multi-location weather loading orchestration, compatibility migration from the single-location configuration

## Implementation Plan

1. Replace the single-location weather settings schema with a normalized array-based location model capped at five entries.
2. Add persistence and normalization rules so existing weather settings migrate into the new shape without breaking the widget.
3. Load weather data for the configured locations and assemble a shared multi-location view model.
4. Keep the compact weather widget focused on one primary location while exposing the additional locations for later extended-view work.

## Test Cases

1. A pre-existing single-location weather configuration loads without crashing and normalizes into the new model.
2. Up to five weather locations can be saved and loaded in a stable order.
3. The configured focus location drives the compact weather widget output.
4. Invalid location entries are rejected or normalized without breaking widget rendering.
