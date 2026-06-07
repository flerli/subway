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


## developer team rules
include the rules as preamble into each issue definition

### Before implementing the issue
read codebase /src first in order to understand the existing implementation
read original ISSUE_DEFINITION document at /project_management/epics/<path to issue definition>
read ISSUE_REPORT of previous issue if existing

### After implementing the issue
document your concrete implementation choices in an ISSUE_REPORT for your issue in order to inform a proceeding developer about your work 
document your work in /project_management/epics/EPIC_OVERVIEW.md by updating the status of the current issue

⁠*Issue Type on Repository*: ALWAYS add label type feature "type/feature" when creating the issue on the github repository!