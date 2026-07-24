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

012 MOBILE DEVICES

## Issue Title

002 MOBILE SHELL CONTROLS AND WIDGET DROPDOWN NAVIGATION

## Issue Description

Adapt the Subway shell for narrow touch devices so the top-level controls remain usable without the current desktop header layout breaking apart. On mobile, the shell must keep member filtering, settings access, and widget navigation available while reducing horizontal pressure.

This issue defines the mobile shell interaction model and introduces dropdown-based widget navigation for touch devices.

## Previous Issue Within The Epic

001 VIEWPORT CLASSIFICATION AND MOBILE LAYOUT MODE FOUNDATION

## Functional Requirements

1. When the app is in mobile layout mode, the shell shall render a dedicated narrow-screen arrangement instead of the current desktop control row.
2. The mobile shell shall keep the family-member filter accessible.
3. The mobile shell shall keep the settings entry point accessible.
4. The mobile shell shall provide dropdown-based widget navigation that is practical on touch devices.
5. The widget dropdown shall support board navigation and provide a clear path into widget-specific drill-down flows.
6. Shared shell actions shall remain reachable without requiring horizontal scrolling.
7. If new shared shell copy is introduced for mobile navigation or back actions, that copy shall be added to the shared application translation files rather than widget-local translation files.
8. The desktop shell arrangement shall remain unchanged outside mobile layout mode.

## Involved Modules

- Model:
  shell navigation state, selected widget target, mobile-shell action availability, shared translated shell texts
- View:
  mobile header arrangement, touch-friendly controls, dropdown trigger and menu, shared shell copy
- Controller:
  layout-mode-driven shell switching, member-filter interactions, settings navigation, widget dropdown selection behavior

## Implementation Plan

1. Consume the shared mobile layout-mode state in the application shell.
2. Introduce a dedicated mobile arrangement for the shell controls so narrow screens do not depend on the current desktop flex and grid distribution.
3. Add a widget dropdown that lists the relevant widgets in a touch-friendly format and routes users either to the chosen board position or the chosen widget drill-down entry path.
4. Reuse existing board and settings navigation state where practical rather than creating a second unrelated navigation system.
5. Extend shared application translations if the mobile shell needs new user-facing copy.

## Test Cases

1. In mobile layout mode, the shell remains usable on a narrow phone viewport without clipped or overlapping controls.
2. The family-member filter remains available and still updates visible board content.
3. The settings entry remains accessible in mobile layout mode.
4. The widget dropdown can be opened and used by touch input.
5. Selecting a widget through the dropdown provides the defined navigation outcome for the board or the widget detail flow.
6. Any new mobile-shell copy renders through the shared application translation files.