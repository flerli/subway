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

005 LOW RISK WIDGET MCP ROLLOUT AND SAFE TOOL PARITY

## Issue Description

Roll out the shared widget MCP contract to the first group of lower-risk widgets. This issue shall cover widgets whose human-visible behavior is primarily read-oriented or otherwise safe to automate, such as informational widgets and low-risk configuration flows, so the team can prove end-to-end parity before moving into destructive, device-control, or external-service mutation scenarios.

## Previous Issue Within The Epic

004 HUMAN IN THE LOOP APPROVAL WORKFLOW FOR SENSITIVE WIDGET TOOLS

## Functional Requirements

1. The first rollout slice shall implement full MCP parity for the selected lower-risk widgets rather than partial tool coverage.
2. The selected rollout slice shall include read-oriented widget capabilities and any safe configuration actions that a human can perform without destructive consequences.
3. The rollout shall explicitly document the parity map for each included widget so human-visible capabilities can be checked against the resulting tool set.
4. Included widgets shall expose their MCP configuration area and settings log through the shared widget settings experience.
5. Included widgets shall be automatically discoverable to the assistant once their tools are registered.
6. Any widget-owned static UI copy introduced by the rollout for settings, approval-free tool states, or logs shall be translated through each widget's `translations.ts` file.
7. Destructive, device-control, or integration-heavy tool flows that need higher-risk handling may be deferred to the next rollout slice only when the issue documentation names them explicitly.

## Involved Modules

- Model:
  per-widget parity maps, lower-risk tool definitions, widget-local settings and audit data
- View:
  widget settings MCP sections, widget log views, any rollout-specific localized widget copy
- Controller:
  widget tool registration, backend execution handlers for safe tools, assistant discovery integration, settings and audit orchestration

## Implementation Plan

1. Select the first rollout batch of lower-risk widgets and document the human-to-tool parity map for each one.
2. Implement the widget MCP tool definitions and backend handlers required for those widgets.
3. Connect each included widget to the shared settings MCP configuration block and widget-scoped tool-call log.
4. Validate that the assistant can discover and call the included tools automatically through the shared runtime.
5. Localize any new widget-owned static copy introduced across the included widgets through their widget-local translation files.
6. Document the higher-risk capabilities that remain intentionally deferred to the next rollout issue.

## Test Cases

1. Each included lower-risk widget exposes MCP tools for every documented human-visible action in its approved parity map.
2. The assistant can discover and call the included lower-risk widget tools through the shared runtime.
3. Each included widget shows the shared MCP configuration area and persisted tool-call log in settings.
4. The included widget tools produce the same end-state or read result as the equivalent human UI flow.
5. Widget-owned rollout copy renders correctly in English, German, French, and Spanish.