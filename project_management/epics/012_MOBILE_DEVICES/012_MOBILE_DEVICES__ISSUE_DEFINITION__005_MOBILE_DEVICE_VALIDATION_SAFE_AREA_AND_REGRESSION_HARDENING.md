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

005 MOBILE DEVICE VALIDATION SAFE AREA AND REGRESSION HARDENING

## Issue Description

Validate and harden the mobile rollout across real narrow-device conditions so the new shell, one-column board, and full-screen detail flow remain usable on iPhone-class devices and small tablets. This issue covers the final fit-and-finish pass that turns the mobile layout from a conceptual responsive mode into a reliable product surface.

## Previous Issue Within The Epic

004 FULL SCREEN WIDGET DETAIL NAVIGATION

## Functional Requirements

1. The mobile rollout shall be verified against iPhone-class viewports and at least one small-tablet viewport.
2. The app shall respect device safe areas so critical controls are not obscured by notches, rounded corners, or browser chrome.
3. Mobile shell, board, and full-screen detail surfaces shall remain vertically scrollable where intended without creating broken nested-scroll traps.
4. Touch interactions for filtering, dropdown selection, widget entry, back navigation, settings access, and logout shall be validated after the responsive changes.
5. Mobile layout changes shall not regress the existing desktop kiosk presentation.
6. Any diagnostic overlays or logging used to validate mobile behavior shall remain safe for production use or stay behind the existing maintenance-only affordances.

## Involved Modules

- Model:
  validation matrix, layout diagnostics, safe-area-related spacing tokens, regression checklist state
- View:
  safe-area padding, mobile spacing refinements, overflow handling, touch target sizing
- Controller:
  validation instrumentation, interaction regression checks, final layout hardening adjustments

## Implementation Plan

1. Validate the completed mobile mode against representative phone and small-tablet viewport sizes, including iPhone-class browsers.
2. Add or refine safe-area-aware spacing where controls or content can collide with device edges or browser chrome.
3. Review scroll behavior across shell, board, settings, and full-screen detail surfaces and remove broken nested-scroll or clipped-content cases.
4. Confirm that the mobile rollout does not regress the desktop board and settings experience.
5. Capture the concrete validation and hardening work in the issue report so later responsive work can build on known device findings.

## Test Cases

1. On an iPhone-class viewport, critical shell controls remain visible and touch-usable within safe areas.
2. On a small-tablet viewport, the mobile layout remains legible and usable.
3. Mobile board scrolling and full-screen detail scrolling behave as intended without trapping touch input.
4. Widget dropdown, filter changes, settings navigation, logout, widget entry, and back navigation all work after the mobile rollout.
5. A desktop viewport still renders the existing kiosk layout correctly after the mobile hardening pass.