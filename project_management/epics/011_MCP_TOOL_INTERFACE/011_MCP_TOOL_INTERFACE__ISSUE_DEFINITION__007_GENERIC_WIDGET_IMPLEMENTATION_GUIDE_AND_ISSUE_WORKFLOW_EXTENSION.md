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

011 MCP TOOL INTERFACE

## Issue Title

007 GENERIC WIDGET IMPLEMENTATION GUIDE AND ISSUE WORKFLOW EXTENSION

## Issue Description

Extend the Subway development workflow so future widget work plans the MCP tool interface from the start. This issue shall add a dedicated generic widget implementation guide and extend the generic issue creation guide so new or changed widgets explicitly define MCP parity, settings-panel impact, tool-call logging, approval behavior, and localization ownership before implementation begins.

## Previous Issue Within The Epic

006 MUTATING AND INTEGRATION WIDGET MCP ROLLOUT

## Functional Requirements

1. The project-management workflow shall include a dedicated generic widget implementation guide that explains the baseline widget architecture, localization expectations, and MCP tool interface requirements.
2. The generic issue creation guide shall be extended so widget issues explicitly plan MCP parity, assistant discovery, settings-panel integration, tool-call logging, and approval behavior.
3. The written guidance shall state that every widget shall expose MCP tools through the shared Subway assistant MCP runtime rather than ad hoc browser-only paths.
4. The written guidance shall state that every widget settings panel shall include an MCP configuration area and access to the widget-scoped tool-call log.
5. The written guidance shall state that widget tools must cover every human-visible widget capability unless an issue definition explicitly documents a deferred scope.
6. The written guidance shall explain how widget-owned static MCP copy continues to follow the standardized four-language translation requirement.

## Involved Modules

- Model:
  project-management conventions, widget implementation documentation contracts, issue authoring checklist
- View:
  generic documentation, issue-definition templates, written workflow guidance
- Controller:
  issue authoring workflow, implementation-readiness checklist for future widget changes

## Implementation Plan

1. Create a dedicated generic widget implementation guide that documents the widget architecture and MCP tool interface expectations.
2. Extend the generic issue creation guide with an explicit section for widget MCP tool interface planning.
3. Document how future widget issue definitions shall capture parity maps, settings integration, logging expectations, approval behavior, and localization ownership.
4. Keep the workflow guidance aligned with the existing widget-local translation requirements introduced in Epic 004.

## Test Cases

1. A developer reading the generic widget implementation guide can identify the baseline widget contract and the required MCP tool interface expectations.
2. A developer reading the generic issue creation guide can see that widget issues must explicitly cover MCP parity, settings, logging, approval, and localization responsibilities.
3. A new widget issue definition created from the guidance includes MCP coverage in functional requirements, implementation plan, and test cases.
4. The guidance makes it clear which static texts belong in widget-local translations and which belong in shared application translations.