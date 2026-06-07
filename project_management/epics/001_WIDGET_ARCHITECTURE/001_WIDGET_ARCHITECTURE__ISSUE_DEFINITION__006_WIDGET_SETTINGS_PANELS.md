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

006 WIDGET SETTINGS PANELS

## Issue Description

Add per-widget settings after the sample widgets are working. The goal is to let each widget expose its own configuration UI without forcing all widget settings into one shared global panel.

## Previous Issue Within The Epic

005 WEATHER WIDGET SAMPLE

## Functional Requirements

1. A widget may expose its own settings panel through a shared widget settings contract.
2. Widget settings shall persist configuration required by that widget.
3. Widgets without custom settings shall not be forced to implement a settings UI.
4. The settings architecture shall work with at least the calendar, todo, and weather widgets.

## Involved Modules

- Model:
  widget settings persistence, widget-specific configuration schemas
- View:
  settings entry points, widget settings panels, validation states
- Controller:
  settings loading, settings save/update flows, widget-specific configuration orchestration

## Implementation Plan

1. Define a shared widget settings contract.
2. Implement a routing or host mechanism for widget-specific settings panels.
3. Add sample settings support to calendar, todo, and weather widgets.
4. Persist widget settings and load them back into each widget.

## Test Cases

1. A widget can declare that it has a settings panel.
2. Widget settings can be saved and loaded.
3. Calendar, todo, and weather widgets each work with the settings architecture.
4. Widgets without settings continue to render normally.
