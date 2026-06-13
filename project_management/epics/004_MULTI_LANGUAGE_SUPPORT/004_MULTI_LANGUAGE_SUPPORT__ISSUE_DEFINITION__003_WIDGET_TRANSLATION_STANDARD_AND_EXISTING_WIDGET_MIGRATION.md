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

003 WIDGET TRANSLATION STANDARD AND EXISTING WIDGET MIGRATION

## Issue Description

Standardize how widget-owned static UI copy is stored and consumed, then migrate the existing widgets onto that contract. Each widget shall own one standardized multi language file inside its own folder for widget-local copy such as titles, captions, settings labels, and other code-defined texts.

Migration scope for this issue:

- Existing widget modules in scope are `arrival-board`, `weather`, `calendar`, and `todo`.
- Only static UI copy is in scope. Dynamic user-entered content and third-party live content are not translated by this issue.

## Previous Issue Within The Epic

002 APPLICATION SHELL AND SHARED TEXT LOCALIZATION

## Functional Requirements

1. Every widget shall store its widget-local static UI copy in a standardized multi language file inside the widget folder. The recommended filename is `translations.ts`.
2. Every widget multi language file shall provide translations for English, German, French, and Spanish using the shared localization schema from issue 001.
3. Widget translation coverage shall include widget titles, captions, empty states, status copy, settings-definition titles, settings descriptions, field labels, placeholders, and other frontend-owned widget texts.
4. The existing `arrival-board`, `weather`, `calendar`, and `todo` widgets shall receive an initial four-language translation pass.
5. Widget metadata and presentation texts that are currently defined outside the widget folder but owned by the widget experience shall be moved into, or resolved through, the widget-owned translation contract so translation ownership stays clear.
6. No existing widget shall keep duplicate hard-coded static UI strings once it has been migrated to the standardized widget translation contract.

## Involved Modules

- Model:
  widget translation key sets, widget-owned translation file schema, widget presentation metadata mapping
- View:
  widget render output, widget detail views, widget settings panels, widget metadata surfaces
- Controller:
  widget-level translation lookup, widget registration wiring, widget settings copy resolution

## Implementation Plan

1. Define the standardized widget-local multi language file pattern and wire it into the widget contract.
2. Migrate widget presentation and metadata texts so widget-owned static copy resolves through the widget translation files.
3. Translate the `arrival-board`, `weather`, `calendar`, and `todo` widgets into English, German, French, and Spanish.
4. Replace hard-coded widget-local strings in settings definitions, captions, placeholders, and empty states with translation lookups.
5. Verify that every migrated widget still renders correctly under each supported language.

## Test Cases

1. Each migrated widget resolves its widget-local static copy from a standardized widget translation file.
2. Switching the global language updates visible static UI copy for `arrival-board`, `weather`, `calendar`, and `todo`.
3. Widget settings titles, descriptions, field labels, and placeholders render in each supported language.
4. Widget presentation texts such as titles or kickers no longer depend on hard-coded English strings once the migration is complete.
5. A migrated widget with one missing key falls back deterministically instead of rendering `undefined` or breaking the widget.