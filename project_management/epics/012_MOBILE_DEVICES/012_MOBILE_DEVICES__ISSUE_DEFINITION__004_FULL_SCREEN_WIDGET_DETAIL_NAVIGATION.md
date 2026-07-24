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

004 FULL SCREEN WIDGET DETAIL NAVIGATION

## Issue Description

Replace the desktop lower expanded stage with a mobile drill-down model where entering a widget opens a full-screen detail surface and returning exits back to the board. The interaction philosophy is that mobile detail mode goes one level deeper into a widget rather than trying to preserve the desktop split-screen arrangement.

This issue defines the shared mobile extended-view contract, back navigation behavior, and full-screen presentation requirements.

## Previous Issue Within The Epic

003 SINGLE COLUMN BOARD LAYOUT AND ZONE STACKING

## Functional Requirements

1. In mobile layout mode, opening a widget detail shall replace the board with a full-screen widget detail view.
2. The mobile detail view shall provide a clear back action that returns the user to the board.
3. The mobile detail view shall not depend on the desktop lower expanded stage.
4. The existing expanded-widget state shall be adapted so widgets with detail views can participate in the mobile drill-down flow without inventing separate widget-specific navigation systems.
5. Mobile detail mode shall work consistently across widgets that already support extended views.
6. Widgets without a dedicated detail view shall degrade predictably according to the shared contract rather than trapping the user in a broken expand path.
7. If new shared back-navigation copy is introduced, it shall live in the shared application translation files.

## Involved Modules

- Model:
  mobile detail navigation state, selected widget detail target, board-versus-detail presentation mode, shared shell copy
- View:
  full-screen widget detail frame, back button, detail-stage replacement layout, mobile detail transitions
- Controller:
  expand and collapse orchestration, back navigation handling, layout-mode-aware rendering of widget detail views

## Implementation Plan

1. Reuse the existing expanded-widget concept where possible, but reinterpret it as a full-screen mobile detail state instead of a lower split-screen panel.
2. Introduce a shared mobile detail frame with explicit back navigation.
3. Route widget expand actions and dropdown-driven detail entry through the same mobile detail state contract.
4. Define a consistent fallback for widgets that do not currently implement `renderDetailView`.
5. Keep the existing desktop expanded-stage behavior unchanged outside mobile layout mode.

## Test Cases

1. Opening a supported widget from the mobile board enters a full-screen detail view.
2. Activating the back action from mobile detail view returns to the board.
3. A widget with an existing detail view renders inside the shared full-screen mobile frame.
4. A widget without a dedicated detail view follows the defined fallback behavior instead of producing a broken state.
5. Desktop viewports continue to use the current lower expanded stage.