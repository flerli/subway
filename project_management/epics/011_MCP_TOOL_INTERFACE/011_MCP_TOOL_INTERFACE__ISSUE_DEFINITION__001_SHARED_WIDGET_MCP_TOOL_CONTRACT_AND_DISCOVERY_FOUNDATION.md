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

001 SHARED WIDGET MCP TOOL CONTRACT AND DISCOVERY FOUNDATION

## Issue Description

Define the standardized Subway widget MCP tool contract so every widget can register assistant-callable tools through the existing Subway assistant MCP runtime. This issue shall establish automatic tool discovery from widget registration, a human-parity mapping rule for widget capabilities, structured tool metadata, and the baseline backend contract that later rollout issues will implement across individual widgets.

## Previous Issue Within The Epic

None

## Functional Requirements

1. Every widget shall expose MCP tools through the existing Subway assistant MCP runtime rather than through direct browser access or per-widget standalone MCP servers.
2. The shared widget MCP contract shall support automatic assistant discovery once a widget registers its tools through the widget registry path.
3. The shared contract shall require human-parity mapping so every human-available widget capability is either represented by an MCP tool or explicitly documented as out of scope for a given rollout issue.
4. The contract shall define stable tool names, clear descriptions, structured argument schemas, normalized result shapes, and deterministic validation or failure handling expectations.
5. The contract shall support both read-oriented and mutating widget tools, including destructive actions when those actions already exist in the human UI.
6. The contract shall include metadata that later issues can use for approval gating, redaction, logging, and settings exposure.
7. Tool execution shall continue to be orchestrated by the Subway backend and shall never expose direct tool execution trust boundaries to the browser.
8. Any new shared or widget-owned static UI copy introduced for this foundation shall follow the existing localization rules from Epic 004.

## Involved Modules

- Model:
  widget tool metadata, human-parity mapping rules, standardized tool schema, approval and redaction metadata
- View:
  assistant-facing tool discovery surfaces, any localized configuration chrome introduced by the shared foundation
- Controller:
  widget registration integration, assistant runtime discovery, backend execution contract, schema validation orchestration

## Implementation Plan

1. Extend the shared widget module contract so widgets can declare a standardized MCP tool surface alongside their existing data, mutation, and settings hooks.
2. Define the metadata needed for tool identity, descriptions, argument schemas, result shaping, approval flags, and safe logging.
3. Connect widget-declared tools to the existing assistant MCP runtime so assistant discovery follows widget registration automatically.
4. Define the parity-mapping documentation requirement that later widget rollout issues shall satisfy for every human-visible capability.
5. Keep execution backend-owned and compatible with the existing assistant tool runtime rather than introducing separate widget-specific MCP servers.
6. Localize any new user-facing shell copy through the shared or widget-local translation paths as appropriate.

## Test Cases

1. A widget that registers MCP tools through the shared contract becomes discoverable to the assistant runtime without manual per-widget routing code.
2. The shared contract can describe both read-oriented and mutating tools with stable schemas and deterministic validation behavior.
3. A widget rollout can reference the contract to show which human-visible actions are covered and which remain intentionally deferred.
4. Tool execution still flows through the backend-owned assistant runtime and does not require direct browser-to-tool access.
5. Any new UI copy introduced by the shared foundation renders through the existing localization system.