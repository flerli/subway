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

006 KEYBOARD

## Issue Title

002 LOWER OVERLAY AND KIOSK INTERACTION MODEL

## Issue Description

Implement the keyboard presentation and interaction behavior for kiosk operation. The software keyboard shall appear in the lower board section as a semi-transparent overlay so users can still perceive components beneath it while typing.

This issue focuses on visual placement, overlay layering, and close behavior suitable for touch-only usage.

## Previous Issue Within The Epic

001 GLOBAL SOFTWARE KEYBOARD FOUNDATION

## Functional Requirements

1. The keyboard shall render in the lower board section and occupy an approximately half-height overlay area.
2. The keyboard surface shall be semi-transparent so underlying board components remain partially visible.
3. Overlay z-index behavior shall ensure the keyboard is always tappable while visible and does not become hidden behind widgets.
4. The keyboard shall provide a dedicated close key.
5. Tapping outside the keyboard and outside the active target input shall close the keyboard.
6. The open and close animation behavior shall not block text entry interaction while keeping transitions predictable.
7. The overlay shall work on kiosk-relevant viewport sizes without clipping essential keys.
8. The keyboard shall avoid layout collisions with persistent board chrome that must remain accessible.

## Involved Modules

- Model:
  overlay visibility state, animation state, viewport-responsive keyboard dimension model
- View:
  lower-half keyboard container, semi-transparent surface styling, key grid, close key, outside-tap capture layer
- Controller:
  open and close animation trigger logic, outside-tap dismissal, pointer-event layering and focus preservation

## Implementation Plan

1. Add a dedicated keyboard overlay container in the global app shell layer.
2. Position the container in the lower board region with half-height behavior and responsive constraints.
3. Apply semi-transparent styling so the board remains perceivable underneath.
4. Add a dedicated close key and wire it to the shared keyboard lifecycle controller.
5. Implement outside-tap dismissal with safeguards so taps on the keyboard itself do not close it.
6. Validate layering, hit testing, and visibility behavior on representative kiosk viewport sizes.

## Test Cases

1. When opened, the keyboard appears in the lower half overlay area and remains visually above widget content.
2. Underlying board content is still partially visible through the keyboard surface.
3. Pressing the close key hides the keyboard and returns interaction to normal board behavior.
4. Tapping outside both keyboard and active input closes the keyboard.
5. Tapping keys inside the keyboard does not trigger unintended outside-close behavior.
6. On representative kiosk viewport sizes, no essential keys are clipped or inaccessible.
