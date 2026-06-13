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

001 SHARED LOCALIZATION FOUNDATION AND LANGUAGE SETTING

## Issue Description

Introduce the shared multilingual foundation for frontend-owned static UI copy. The system shall support English, German, French, and Spanish, use one shared application translation file for non-widget texts, and persist one selected language per authenticated user across devices.

Clarified scope decisions already fixed for this issue:

- The selected language is global at the application level but persisted per authenticated user across devices.
- Only static UI copy is in scope for this epic. User-entered content and third-party dynamic content are out of scope.
- Initial translation coverage includes shared application shell texts, settings page texts, and widget metadata texts.
- New widgets are expected to ship complete English, German, French, and Spanish translations.

## Previous Issue Within The Epic

None

## Functional Requirements

1. The localization system shall support exactly four languages in the first rollout: English, German, French, and Spanish.
2. Frontend-owned static application copy shall resolve through a shared localization contract instead of scattered hard-coded strings.
3. General application texts such as `Board`, `Settings`, `Log out`, and auth-shell labels shall be stored in one dedicated shared application translation file rather than in widget modules.
4. The selected language shall be a global application setting that is persisted per authenticated user and restored after login, reload, and use on a second device.
5. The shared localization contract shall support standardized per-widget translation files with one consistent schema across all widgets.
6. Invalid stored language values or missing translation lookups shall fall back deterministically without breaking rendering.
7. Dynamic user-entered content and dynamic third-party content feeds are out of scope for this issue.

## Involved Modules

- Model:
  supported language identifiers, shared translation schema, global language preference record
- View:
  application-level translation provider entry points, shared language-aware text rendering
- Controller:
  language bootstrap, preference load and save, translation lookup and fallback handling

## Implementation Plan

1. Define the supported language identifiers and the shared translation object shape.
2. Introduce one shared application translation file for non-widget copy.
3. Add one persistent application-level language preference surface that can be restored per authenticated user.
4. Bootstrap the selected language before shared application texts are rendered in the authenticated shell.
5. Add deterministic fallback behavior for invalid language values and missing keys.

## Test Cases

1. The localization foundation accepts and resolves English, German, French, and Spanish.
2. Selecting a non-default language, reloading the app, and logging in on a second device restores the same language for the same account.
3. An invalid stored language value falls back to the deterministic default language instead of breaking the UI.
4. Shared application translation lookups resolve without runtime errors for every defined key.