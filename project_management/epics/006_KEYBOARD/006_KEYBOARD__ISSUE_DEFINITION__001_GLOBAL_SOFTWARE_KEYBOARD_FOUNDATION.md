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

001 GLOBAL SOFTWARE KEYBOARD FOUNDATION

## Issue Description

Create a global software keyboard system for kiosk usage where no physical keyboard is available. The keyboard shall be a shared infrastructure component, not a widget-owned component, and must activate automatically whenever the user focuses any supported text input surface on the board.

This first issue establishes the technical foundation and focus orchestration contract used by all current and future widgets.

## Previous Issue Within The Epic

None

## Functional Requirements

1. The frontend shall provide one global software keyboard controller that is independent from any single widget implementation.
2. Focusing a supported text field or textarea anywhere on the board shall open the software keyboard immediately.
3. The keyboard input stream shall write characters into the currently focused field so widgets receive normal text values.
4. The keyboard system shall support at least standard text inputs and textareas in this first rollout.
5. Only one active keyboard session shall exist at a time, bound to the currently focused editable element.
6. Blur and focus handover between supported fields shall switch the keyboard target deterministically without stale references.
7. The keyboard shall expose explicit open, close, and target-switch events so later issues can attach visual behavior and diagnostics.
8. The solution shall avoid widget-specific hooks and instead provide a reusable shared contract that all widgets can consume implicitly.

## Involved Modules

- Model:
  keyboard session state, focused target descriptor, key event payloads, open or closed keyboard lifecycle state
- View:
  shared keyboard root mount point and input-target highlighting state
- Controller:
  global focus listeners, target binding and unbinding, key press dispatch into active editable element, lifecycle event emission

## Implementation Plan

1. Introduce a shared keyboard module in the frontend shared architecture layer rather than in a widget folder.
2. Register global focus handlers for supported editable elements and open the keyboard on focus.
3. Implement deterministic target tracking so keyboard key presses mutate only the active focused field.
4. Add close and retarget handling for blur, focus transfer, and explicit close actions.
5. Define typed keyboard events and state transitions to support testing and later UI issues.
6. Keep the contract generic so future widgets automatically benefit without adding widget-specific integration code.

## Test Cases

1. Focusing a supported text input opens the keyboard and binds it to that field.
2. Focusing a textarea opens the keyboard and binds it to that textarea.
3. Typing via software keyboard updates the bound field value in order and preserves caret insertion behavior.
4. Switching focus from one supported field to another retargets the keyboard without requiring manual reopen.
5. Closing the keyboard clears the active session and stops text injection until a new supported focus occurs.
6. A widget with supported fields requires no widget-specific keyboard wiring to receive keyboard input.
