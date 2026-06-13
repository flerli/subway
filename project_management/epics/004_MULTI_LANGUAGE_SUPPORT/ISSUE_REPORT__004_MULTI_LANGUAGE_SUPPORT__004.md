# ISSUE REPORT

## Epic

004 MULTI LANGUAGE SUPPORT

## Issue

004 WIDGET LOCALIZATION GUIDELINES AND ISSUE GUIDE EXTENSION

## Implementation Summary

The generic issue creation guide was extended so future widget work must plan multilingual support explicitly from the start.

Implemented guide changes:

- clarified that every widget keeps widget-owned static ui copy in `/frontend/src/widgets/<widget-folder>/translations.ts`
- clarified that the widget translation file follows the shared four-language schema and must include english, german, french, and spanish
- clarified that every widget-owned static ui string must be covered before the issue is considered complete
- kept the ownership boundary explicit: shared application texts stay in the shared application translation file, while widget-owned static copy stays in the widget folder
- kept user-entered data and dynamic external content explicitly out of the widget translation file scope

Workflow change delivered in this issue:

- the guide now requires multilingual support to be mentioned explicitly in all three issue-definition sections for widget work:
  - functional requirements
  - implementation plan
  - test cases

Implementation note:

- issue 001 had already added an initial widget-localization note to the guide while defining the epic structure
- this issue completed that documentation by turning the note into an explicit authoring checklist that future widget issue definitions must follow

## Notes For Next Work

Future widget epics should treat the checklist in the generic issue creation guide as mandatory instead of re-explaining the localization workflow from scratch.

If a later widget deviates from the standard `translations.ts` pattern, that deviation should be documented in a dedicated issue definition instead of being handled informally.

## Validation

Validated by reviewing the updated guide against the issue requirements:

- widget-local translation file location is explicit
- required languages are explicit
- shared-vs-widget translation ownership is explicit
- static-ui-only scope is explicit
- functional requirements, implementation plan, and test-case coverage are each explicit