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

004 WIDGET LOCALIZATION GUIDELINES AND ISSUE GUIDE EXTENSION

## Issue Description

Extend the development workflow so every future widget issue plans multilingual support from the start. The generic issue creation guide shall explain how new widgets implement translations through a standardized widget-local multi language file and that complete English, German, French, and Spanish coverage is required before widget work is considered complete.

## Previous Issue Within The Epic

003 WIDGET TRANSLATION STANDARD AND EXISTING WIDGET MIGRATION

## Functional Requirements

1. The generic issue creation guide shall state that every new widget shall ship with a standardized widget-local multi language file inside the widget folder.
2. The guide shall explain that the recommended widget translation filename is `translations.ts` and that it shall follow the shared four-language schema.
3. The guide shall require English, German, French, and Spanish entries for every widget-owned static UI string before the widget issue can be considered complete.
4. The guide shall distinguish shared application texts from widget-local texts so translation ownership is not duplicated.
5. The guide shall clarify that only static UI copy belongs into the widget multi language file, while user-entered data and dynamic external content stay outside that file.
6. The guide shall instruct developers to cover multilingual support explicitly in functional requirements, implementation plans, and test cases for new widget issues.

## Involved Modules

- Model:
  project-management workflow conventions, widget translation file contract documentation
- View:
  issue definition templates and written developer guidance
- Controller:
  issue authoring workflow, implementation-readiness checklist for new widgets

## Implementation Plan

1. Update the generic issue creation guide with one dedicated section for widget localization requirements.
2. Document the standardized widget-local multi language file pattern and the required languages.
3. Add guidance that separates shared application texts from widget-local texts.
4. Extend the guide so widget issue definitions explicitly mention translation work in their requirements, plan, and tests.

## Test Cases

1. A developer reading the generic issue creation guide can identify where a new widget's translation file belongs and what languages are mandatory.
2. A new widget issue definition created from the guide includes multilingual support in its functional requirements, implementation plan, and test cases.
3. The guide makes it clear that shared application texts and widget-local texts must not duplicate ownership.