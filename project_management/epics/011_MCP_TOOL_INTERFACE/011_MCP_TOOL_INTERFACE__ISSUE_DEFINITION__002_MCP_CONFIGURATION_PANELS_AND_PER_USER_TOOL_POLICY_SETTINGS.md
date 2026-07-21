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

002 MCP CONFIGURATION PANELS AND PER-USER TOOL POLICY SETTINGS

## Issue Description

Add an MCP configuration section to every widget settings panel so each authenticated user can inspect and manage the widget's tool surface. This issue shall ensure that every widget has a settings surface, even when it previously had no custom business settings, and that the settings experience can configure per-user tool availability and per-tool approval policy for sensitive widget tools.

## Previous Issue Within The Epic

001 SHARED WIDGET MCP TOOL CONTRACT AND DISCOVERY FOUNDATION

## Functional Requirements

1. Every widget shall expose a settings panel that includes an MCP configuration section.
2. Widgets that currently have no custom settings shall still gain a settings surface once MCP support is introduced.
3. The MCP configuration section shall let the authenticated user inspect the widget's registered tools and their current availability state.
4. The configuration section shall support per-user tool enablement or disablement where the product allows a tool to be turned on or off.
5. Sensitive tools shall expose per-tool approval configuration so the user can decide whether that tool requires human approval before execution.
6. The configuration model shall be consistent across widgets while still allowing widget-specific explanatory copy or constraints.
7. MCP configuration shall be integrated into the existing widget settings host rather than through a separate global-only admin surface.
8. Any widget-owned static MCP configuration copy shall be translated through the widget-local `translations.ts` file; shared shell text shall remain in shared application localization files.

## Involved Modules

- Model:
  per-user widget MCP settings, tool policy state, approval configuration state, widget settings persistence extensions
- View:
  widget settings cards, MCP configuration sections, tool state indicators, localized widget settings copy
- Controller:
  widget settings host orchestration, settings persistence, tool policy normalization, configuration loading and save flows

## Implementation Plan

1. Extend the widget settings architecture so every widget can render a standard MCP configuration block.
2. Add or normalize settings persistence for per-user tool enablement and per-tool approval policy values.
3. Ensure widgets without existing custom settings can still participate in the settings host solely for MCP configuration.
4. Provide a shared rendering pattern for tool lists, approval toggles, and widget-specific explanatory states while preserving widget-local customization when needed.
5. Wire the MCP configuration block into the authenticated settings save or load flow already used by widgets.
6. Add or extend widget-local translations for any widget-owned configuration copy introduced by the rollout.

## Test Cases

1. A widget with existing settings renders an MCP configuration section alongside its current settings.
2. A widget without prior custom settings still appears in the settings host and can expose MCP configuration.
3. Per-user tool enablement settings can be saved and loaded correctly.
4. Per-tool approval policies can be saved and loaded correctly.
5. Widget-owned MCP configuration copy renders in English, German, French, and Spanish through the existing language setting.