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

003 LANGUAGE DRIVEN LAYOUTS AND SYSTEM ROLLOUT

## Issue Description

Bind software keyboard layout behavior to the existing global application language setting so key arrangement and language-dependent characters follow the selected system language. Complete the system rollout by validating that all board text-entry flows use the shared keyboard contract without widget-specific coupling.

## Previous Issue Within The Epic

002 LOWER OVERLAY AND KIOSK INTERACTION MODEL

## Functional Requirements

1. The keyboard layout shall resolve from the existing global language setting used by the application.
2. The first rollout shall support language-aligned layouts for the currently supported application languages English, German, French, and Spanish.
3. When the user changes the application language, the keyboard layout shall update deterministically for the next keyboard session.
4. Language-specific key labels and characters shall remain consistent with the selected language layout.
5. The keyboard shall remain a shared system component and shall not introduce widget-level keyboard forks.
6. Existing and future widget text-entry fields using supported input types shall activate the same shared keyboard contract.
7. Any new keyboard-owned static UI copy shall be localized through shared application localization files, not through widget-local translation files.
8. Fallback behavior shall be defined when an unsupported language keymap is requested.

## Involved Modules

- Model:
  language-to-layout mapping, layout definition schema, fallback layout policy, localization keys for shared keyboard copy
- View:
  keycap labels per active language, shared keyboard action labels, language-aware rendered key rows
- Controller:
  language setting subscription, layout resolver, fallback selection, global rollout verification hooks

## Implementation Plan

1. Define a shared keyboard layout map keyed by the existing global language codes.
2. Implement a layout resolver that selects the active keymap from the app language setting with explicit fallback behavior.
3. Render key rows and labels from the resolved layout rather than hardcoded key definitions.
4. Ensure keyboard-owned shared UI copy uses shared app localization files.
5. Validate end-to-end behavior across representative text-entry fields on the board to ensure shared keyboard activation everywhere.
6. Document rollout assumptions so future widgets inherit the same keyboard behavior automatically.

## Test Cases

1. With application language set to English, the keyboard renders the English layout and key labels.
2. With application language set to German, the keyboard renders the German layout and expected language-specific key behavior.
3. With application language set to French, the keyboard renders the French layout and expected language-specific key behavior.
4. With application language set to Spanish, the keyboard renders the Spanish layout and expected language-specific key behavior.
5. Changing the application language and reopening the keyboard applies the corresponding language layout.
6. If an unsupported language code is forced, the keyboard falls back to the defined default layout deterministically.
7. Text-entry flows across multiple widgets all activate the same shared software keyboard without widget-specific keyboard implementations.
