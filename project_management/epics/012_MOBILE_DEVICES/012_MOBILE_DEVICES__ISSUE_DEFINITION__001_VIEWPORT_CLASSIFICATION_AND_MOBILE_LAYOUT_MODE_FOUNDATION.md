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

001 VIEWPORT CLASSIFICATION AND MOBILE LAYOUT MODE FOUNDATION

## Issue Description

Define the shared frontend contract that detects when Subway should leave the desktop kiosk board and enter a dedicated mobile layout mode. The goal is to support phones and small tablets, including iPhone-class devices, without relying on brittle user-agent assumptions.

This issue establishes the viewport-resolution and layout-mode foundation that later mobile-shell, board, and full-screen-detail issues will consume.

## Previous Issue Within The Epic

None

## Functional Requirements

1. The frontend shall classify the active viewport into at least desktop and mobile layout modes.
2. Mobile layout mode shall target phones and small tablets rather than desktop-sized screens.
3. The layout-mode decision shall be derived from runtime viewport characteristics such as width, height, and orientation, not user-agent sniffing alone.
4. The system shall react to viewport changes at runtime so device rotation, browser chrome changes, and dynamic viewport resizing update the chosen layout mode deterministically.
5. The frontend shall expose the resolved layout mode through one shared state contract that the application shell and widget board can consume without duplicating detection logic.
6. The contract shall make the measured viewport dimensions available for diagnostics and future responsive decisions.
7. The solution shall preserve the existing desktop board behavior when the viewport does not qualify for mobile layout mode.

## Involved Modules

- Model:
  viewport classification state, measured viewport dimensions, layout-mode enum, optional orientation metadata
- View:
  layout-mode CSS hooks, app-shell mode classes, responsive rendering gates
- Controller:
  viewport measurement lifecycle, resize and orientation listeners, shared layout-mode state orchestration

## Implementation Plan

1. Introduce a shared frontend utility or hook that measures the active viewport and resolves the current layout mode.
2. Base classification on viewport dimensions and narrow-device intent so the implementation remains robust across iPhone and small-tablet browsers.
3. Surface the measured viewport state to the application shell and widget board through one shared contract.
4. Add diagnostic visibility for the resolved layout mode and dimensions so mobile-device behavior can be verified during rollout.
5. Keep the foundation desktop-safe so existing wide-screen kiosk rendering remains unchanged until later mobile issues actively consume the new mode.

## Test Cases

1. A desktop-sized viewport resolves to desktop mode and keeps the current board behavior.
2. An iPhone-class narrow viewport resolves to mobile mode.
3. A small-tablet narrow viewport resolves to mobile mode when it matches the agreed mobile dimensions.
4. Rotating a mobile device or resizing the browser updates the resolved layout mode and measured dimensions without stale state.
5. The application shell and widget board can consume the same shared layout-mode state without implementing separate viewport-detection logic.