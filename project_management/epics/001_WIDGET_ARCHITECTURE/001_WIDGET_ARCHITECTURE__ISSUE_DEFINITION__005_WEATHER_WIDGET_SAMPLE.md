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

005 WEATHER WIDGET SAMPLE

## Issue Description

Implement the weather widget as the read-only external-data sample. This issue validates that the widget system can support a live API-backed widget while still rendering through the same host and scope architecture.

## Previous Issue Within The Epic

004 TODO WIDGET SAMPLE

## Functional Requirements

1. A weather widget shall exist inside its own widget folder.
2. The weather widget shall retrieve current weather data from a live external API.
3. The weather widget shall render through the shared widget host.
4. The weather widget shall support widget metadata, scope, and placement like any other widget.
5. The weather widget shall expose refresh status or last-updated state in the UI or widget metadata.

## Involved Modules

- Model:
  weather widget configuration, optional cached weather metadata
- View:
  weather widget UI, refresh state, empty and error states
- Controller:
  API integration, data normalization, widget loading

## Implementation Plan

1. Create the weather widget folder and registration entry.
2. Implement the external API integration and data normalization path.
3. Render weather data through the shared widget host.
4. Surface refresh status, error state, or last-updated information.

## Test Cases

1. Weather data is fetched successfully from the configured API.
2. The widget renders weather data through the shared host.
3. API failure states are handled without breaking the board.
4. Weather widget registration follows the same convention as other widgets.
