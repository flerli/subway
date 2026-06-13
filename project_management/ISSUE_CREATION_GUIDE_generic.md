# ISSUE CREATION GUIDE

## folder structure
/project_management/
Folder that stores a markdown file EPIC_OVERVIEW.md that includes an overview about all epics.

/project_management/epics/
Folder that includes folders named "001_EPIC_TITLE"

/project_management/epics/001_EPIC_TITLE/
Folder that includes markdown files. 
- the issue definition files are named 001_EPIC_TITLE__ISSUE_DEFINITION__001_ISSUE_TITLE
- the issue implementation reports are named ISSUE_REPORT__001_EPIC_TITLE__001

## file schemas

### EPIC_OVERVIEW.md
epics are listed in order of their numbering
title
description
list of issues of an epic
issues status: planned, implemented, canceled

### ISSUE_DEFINITION
epic
issue title
issue description
previous issue within the epic
functional requirements
involved modules: model, view, controller
implementation plan
test cases

### ISSUE_REPORT
decription of the actual implementation

### widget localization requirements
if a new issue introduces a new widget or adds new widget-owned static ui copy, the issue definition shall explicitly cover multilingual support.
- each widget shall keep its user-facing static texts in a standardized multi language file inside the widget folder, recommended path and filename: `/frontend/src/widgets/<widget-folder>/translations.ts`
- the widget multi language file shall follow the shared four-language schema and provide translations for english, german, french, and spanish
- shared application texts such as `Settings` do not belong into a widget file and shall stay in the shared application translation file
- only static ui copy belongs into the multi language file; user-entered data and dynamic external content do not
- every widget-owned static ui string shall be covered in english, german, french, and spanish before the widget issue is considered complete
- test cases for widget issues shall verify that the widget renders its translated static texts through the shared language setting


## developer team rules
include the rules as preamble into each issue definition

### Before implementing the issue
read codebase /src first in order to understand the existing implementation
read original ISSUE_DEFINITION document at /project_management/epics/<path to issue definition>
read ISSUE_REPORT of previous issue if existing

### After implementing the issue
document your concrete implementation choices in an ISSUE_REPORT for your issue in order to inform a proceeding developer about your work 
document your work in /project_management/epics/EPIC_OVERVIEW.md by updating the status of the current issue

### When writing a widget issue definition
mention the widget multi language file explicitly in the functional requirements, implementation plan, and test cases.
- define in the functional requirements which widget-local static texts must be translated via the widget-local multi language file
- require in the implementation plan that the widget ships with `/frontend/src/widgets/<widget-folder>/translations.ts` and complete english, german, french, and spanish entries
- require in the test cases that language switching proves the translated widget-owned texts actually render in the ui
- distinguish widget-local texts from shared application texts so the implementation does not duplicate translation ownership

### Widget issue definition checklist
for every new widget issue definition, the multilingual sectioning shall be explicit.
- functional requirements: name the widget-owned static texts that must live in `translations.ts`
- implementation plan: state that the widget-local `translations.ts` file is created or extended using the shared four-language schema
- test cases: state that english, german, french, and spanish rendering is verified through the global language setting

⁠*Issue Type on Repository*: ALWAYS add label type feature "type/feature" when creating the issue on the github repository!
