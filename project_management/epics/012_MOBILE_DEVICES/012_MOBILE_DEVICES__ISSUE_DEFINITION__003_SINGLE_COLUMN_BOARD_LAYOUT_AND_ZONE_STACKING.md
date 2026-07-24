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

003 SINGLE COLUMN BOARD LAYOUT AND ZONE STACKING

## Issue Description

Reflow the board for mobile devices so the current desktop 2x3 grid becomes a single vertical widget stream that remains legible and scrollable on phones and small tablets. The mobile board shall preserve the existing zone semantics while rendering them in a narrow-screen order.

This issue focuses on the compact board layout itself, not the full-screen widget drill-down experience.

## Previous Issue Within The Epic

002 MOBILE SHELL CONTROLS AND WIDGET DROPDOWN NAVIGATION

## Functional Requirements

1. In mobile layout mode, the widget board shall render as a one-column layout.
2. The mobile board shall stack the grid zones in the order A1, A2, A3, B1, B2, B3.
3. The mobile board shall preserve the existing widget visibility rules and filter behavior.
4. The mobile board shall preserve widget placement semantics so widgets assigned to the same desktop zones still resolve predictably in mobile mode.
5. The mobile board shall remain scrollable and usable on touch devices without forcing horizontal scrolling.
6. Desktop board layout shall remain the current multi-column kiosk presentation outside mobile layout mode.
7. The implementation shall define how service-board content is ordered relative to the mobile widget column so the shell-to-board reading flow remains consistent.

## Involved Modules

- Model:
  mobile board ordering rules, zone-to-render-order mapping, widget placement resolution
- View:
  one-column board layout, mobile widget spacing, scroll container behavior, service-board ordering
- Controller:
  layout-mode-aware board rendering, widget placement adaptation, active-filter-driven board updates

## Implementation Plan

1. Reuse the existing placement-zone model and add a mobile render-order mapping rather than inventing a second widget-placement system.
2. Render the grid zones as a one-column stream in the required A1, A2, A3, B1, B2, B3 order when mobile layout mode is active.
3. Review merged-cell and multi-zone widget behavior so desktop placement semantics degrade predictably into the single-column mobile presentation.
4. Keep mobile scrolling vertical and contained so touch navigation remains stable.
5. Leave the desktop board rendering path intact for non-mobile viewports.

## Test Cases

1. In mobile layout mode, the board renders as a single vertical column.
2. Widgets assigned to A1, A2, A3, B1, B2, and B3 appear in that order.
3. Changing the active family-member filter updates the mobile board content consistently with desktop behavior.
4. The mobile board does not require horizontal scrolling on an iPhone-class viewport.
5. Switching back to desktop layout mode restores the current desktop board presentation.