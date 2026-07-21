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

006 MUTATING AND INTEGRATION WIDGET MCP ROLLOUT

## Issue Description

Roll out the shared widget MCP contract to the higher-risk widget capabilities that mutate data, control devices, or act through external integrations. This issue shall complete full human-feature parity for the remaining widget actions, including destructive or sensitive flows, while applying the approval, settings, logging, and redaction rules established by the earlier issues in the epic.

## Previous Issue Within The Epic

005 LOW RISK WIDGET MCP ROLLOUT AND SAFE TOOL PARITY

## Functional Requirements

1. The rollout shall cover the remaining widget actions that mutate data, invoke external integrations, control devices, or otherwise require higher-risk handling.
2. Included widgets shall reach full human-feature parity for the selected mutation and integration flows rather than stopping at read-only coverage.
3. Destructive or sensitive widget tools shall honor the per-tool approval model where configured.
4. Included widgets shall participate in the shared settings MCP configuration model and persisted widget-scoped tool-call log.
5. Mutating and integration widget tools shall return normalized results and deterministic failure states that are suitable for assistant rendering and audit review.
6. Redacted fields from credentials, device sessions, or sensitive payloads shall not be exposed in plaintext through tool results or logs.
7. Any widget-owned static UI copy introduced for tool configuration, approval, or logging shall be translated through the widget-local `translations.ts` file.

## Involved Modules

- Model:
  mutating widget tool definitions, approval-aware settings state, sensitive result redaction metadata, external integration execution records
- View:
  widget settings MCP sections, approval-aware audit history, localized widget settings and status copy
- Controller:
  backend execution handlers for mutations and integrations, approval gating, redaction shaping, settings and logging orchestration

## Implementation Plan

1. Select the remaining mutation-heavy and integration-heavy widget capabilities and document a parity map for each included widget.
2. Implement the standardized tool definitions and backend handlers for data mutation, external-service operations, and device-control flows.
3. Apply per-tool approval requirements to destructive or sensitive tools and verify runtime interception before state changes occur.
4. Reuse the shared settings configuration and persisted audit log patterns across the included widgets.
5. Normalize tool results and deterministic error states so assistant execution remains predictable.
6. Add or extend widget-local translations for any new widget-owned static copy introduced by the rollout.

## Test Cases

1. Each included mutating or integration widget exposes MCP tools for every documented human-visible action in its approved parity map.
2. Approval-gated tools do not mutate state until approval succeeds.
3. Sensitive payload fields do not leak in plaintext through logs or assistant-visible tool rendering.
4. The assistant can execute included widget tools and reach the same end-state as the equivalent human UI flow.
5. Widget-owned rollout copy renders correctly in English, German, French, and Spanish.