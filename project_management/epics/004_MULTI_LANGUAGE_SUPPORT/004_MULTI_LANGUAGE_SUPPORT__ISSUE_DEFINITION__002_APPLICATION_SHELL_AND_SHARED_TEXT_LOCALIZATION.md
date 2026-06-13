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

004 MULTI LANGUAGE SUPPORT

## Issue Title

002 APPLICATION SHELL AND SHARED TEXT LOCALIZATION

## Issue Description

Localize the current non-widget application shell using the shared translation foundation from issue 001. This includes the authenticated shell, the unauthenticated auth flow, the settings page, and shared host-level copy that is not owned by one specific widget.

Scope note for this issue:

- Issue 001 already introduced the per-user language preference backend, the shared translation primitives, the settings-page language selector, and the first migration of core auth-shell and settings-shell copy.
- This issue completes the remaining shared application copy that still stays outside widget-local translation files.
- Frontend-defined static UI copy is in scope.
- Raw backend error payloads may remain untranslated unless they are mapped onto stable frontend-owned message keys.

## Previous Issue Within The Epic

001 SHARED LOCALIZATION FOUNDATION AND LANGUAGE SETTING

## Functional Requirements

1. Changing the language through the existing global language selector shall update the remaining visible shared application copy without requiring a manual page reload.
2. The authenticated shell shall resolve its remaining shared static texts from the shared application translation file, including any navigation, auth status, and logout-adjacent copy not yet migrated in issue 001.
3. The unauthenticated auth flow shall resolve its remaining headings, helper copy, warnings, and status copy from the shared application translation file.
4. The settings page shall resolve its remaining headings, helper copy, field labels, buttons, and frontend-owned warning or loading copy from the shared application translation file.
5. Shared host-level copy outside individual widgets, such as widget settings host actions and widget metadata administration chrome, shall use the same translation infrastructure.
6. The selected language shall be respected immediately after bootstrap so remaining shared application copy does not flash back to an unintended language during normal startup.

## Involved Modules

- Model:
  shared application translation key set, settings-page language option model
- View:
  auth hero and login form, top navigation shell, settings page, shared host components
- Controller:
  language selection UI handling, runtime language switching, startup language restore

## Implementation Plan

1. Audit the remaining hard-coded shared application strings in the app shell and shared host components after the foundational migration from issue 001.
2. Replace the remaining hard-coded shared application texts with translation lookups from the shared application translation file.
3. Ensure runtime language switching updates the remaining shell, auth, settings, and shared-host copy without a manual reload.
4. Normalize frontend-owned status, helper, or warning copy so it can be translated through stable keys.

## Test Cases

1. Switching the language in settings updates the remaining visible shared application copy immediately.
2. The unauthenticated auth screen renders its remaining static UI copy in each supported language.
3. The settings page renders its remaining static headings, helper copy, warnings, and controls in each supported language.
4. Shared host-level actions such as widget settings save controls render their translated copy through the shared translation layer.
5. Reloading after a language change restores the same translated shell without flashing back to the previous language.