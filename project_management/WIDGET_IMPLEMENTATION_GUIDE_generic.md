# GENERIC WIDGET IMPLEMENTATION GUIDE

## Purpose

This guide defines the baseline implementation contract for Subway widgets.
It applies to both new widgets and existing widgets that gain new behavior.
Every widget is a Subway-owned micro app that participates in the shared widget registry, localization model, settings surface, and MCP tool runtime.

## Required Widget Building Blocks

Every widget implementation shall define or extend the following responsibilities:

1. A widget folder in `/frontend/src/widgets/<widget-folder>/` with an `index.ts` entry that exports the widget module contract.
2. A widget-local `translations.ts` file when the widget owns user-facing static UI copy.
3. A shared widget registration path through the existing registry and source-location discovery model.
4. A widget settings surface, even when the widget has no business-specific settings outside MCP configuration.
5. A widget MCP tool interface that covers every functionality the human user can perform for that widget.

## Widget Contract Expectations

The widget module shall remain compatible with the shared widget host and settings host.
When implementing or extending a widget, developers shall account for:

1. Widget metadata such as title ownership, source location, placement behavior, and capabilities.
2. Widget data loading and mutation flows through the authenticated Subway backend rather than direct browser-only shortcuts for durable behavior.
3. Widget-specific settings persistence through the shared settings contract.
4. Localized widget-owned static copy through the standardized four-language schema for English, German, French, and Spanish.

## MCP Tool Interface Rules

Every widget shall expose a standardized MCP tool interface through the existing Subway assistant MCP runtime.
Widgets shall not bypass the shared runtime by exposing direct browser-to-tool calls.

The widget MCP tool interface shall satisfy all of the following:

1. Human-parity coverage: every functionality available to a human user in the widget UI shall have an MCP equivalent.
2. Stable tool identity: each tool shall have a stable name and a clear, implementation-owned description.
3. Structured arguments: each tool shall declare a predictable input schema and validation behavior.
4. Structured results: each tool shall return normalized, assistant-consumable results rather than raw UI fragments.
5. Approval metadata: sensitive tools shall declare whether human approval is required before execution.
6. Discoverability: once a widget registers its tools, the assistant runtime shall be able to discover them automatically.
7. Redaction awareness: argument or result fields that should not be exposed in plaintext shall be markable for safe logging and rendering.

## Human-Parity Mapping

Before implementing widget tools, create a parity map between the human UI and the MCP surface.
That map shall enumerate:

1. Read or query actions.
2. Configuration actions.
3. Mutating actions.
4. Destructive or risky actions.
5. Preconditions, validation rules, and permissions.

If a human can do it through the widget, the developer shall either provide a corresponding tool or explicitly document why the capability is intentionally out of scope for the current issue.

## Parity Map Template

When planning or implementing a widget, write the parity map in a compact table or list that makes review easy.
The parity map should cover at least:

1. Human action name.
2. MCP tool name.
3. Tool type: read, configuration, mutation, destructive, or integration.
4. Expected end-state or returned result.
5. Approval requirement: none or required.
6. Status: implemented in this issue or explicitly deferred.

If a capability is deferred, document why it is deferred and what contract is still missing.

## Assistant Discovery Rules

Widget MCP tools are discovered through the shared Subway assistant runtime.
To keep discovery predictable, every widget implementation shall ensure:

1. Tool names are unique across all widgets.
2. Tool descriptions are written for assistant consumption rather than UI copy reuse.
3. Tool arguments are explicit enough for the assistant to call the tool without relying on hidden browser state.
4. Tool metadata is registered through the widget contract so shared discovery can pick it up automatically.
5. Disabled tools and approval-gated tools still preserve stable identity in the widget-owned parity documentation.

## Settings Panel Requirements

Every widget settings panel shall include an MCP configuration area.
Widgets that previously had no custom settings shall still expose a settings panel once MCP support is introduced.

The MCP configuration area shall cover:

1. Tool availability or enablement state for the current user.
2. Per-tool approval configuration for sensitive tools.
3. Any widget-specific MCP defaults or limits that are user-configurable.
4. Access to the widget-scoped MCP tool-call log.

## Tool-Call Logging Requirements

Widget MCP activity shall be persisted in backend-owned history rather than only transient client state.
The widget settings experience shall surface the resulting audit trail.

The logging model should preserve, at minimum:

1. Widget identity.
2. Tool identity.
3. User identity.
4. Submitted arguments in redaction-aware form.
5. Approval state when applicable.
6. Execution state transitions.
7. Final result or failure summary.
8. Timestamps required to reconstruct the sequence after reload.

## Human-In-The-Loop Approval Rules

Sensitive tools shall support human-in-the-loop approval.
Approval is configured per tool and is surfaced in two places:

1. Policy and history visibility in the widget settings panel.
2. Runtime approval interaction at the moment the assistant attempts execution.

Approval-gated tools shall not execute until the configured approval step is satisfied.
Rejected or expired approvals shall be reflected in the persisted tool-call history.

## Deferred Scope Rules

Some human-visible behaviors are intentionally not good MCP candidates in an early issue, for example browser-only media capture, fullscreen-only affordances, or flows that still lack a durable backend contract.
When this happens, the issue definition and issue report shall:

1. Name the deferred capability explicitly.
2. State why the capability is not yet a truthful MCP tool.
3. State what backend, runtime, or product contract is still missing.
4. State which later issue is expected to pick the capability up when known.

## Localization Rules

Widget-owned MCP settings, logging, and approval copy shall follow the same localization rules as the rest of the widget.
Use `/frontend/src/widgets/<widget-folder>/translations.ts` for widget-owned static texts.
Keep shared shell texts in the shared application localization files.

Every widget-owned static MCP string shall be covered in English, German, French, and Spanish before the issue is considered complete.

## Testing Checklist

Every widget implementation or change with MCP scope shall verify:

1. The widget registers its tools through the shared runtime and the assistant can discover them.
2. Each human-visible widget action has a matching MCP path with equivalent end-state behavior.
3. The widget settings panel exposes MCP configuration for the current user.
4. Tool-call history persists across page reload and is visible in settings.
5. Approval-gated tools cannot execute without the configured approval step.
6. Redacted fields do not leak through logs or UI rendering.
7. Widget-owned MCP copy renders correctly in English, German, French, and Spanish.

## Issue Authoring Expectations

When writing a widget issue definition, explicitly cover the MCP tool interface in:

1. Functional requirements.
2. Implementation plan.
3. Test cases.

Issue definitions should name the human-parity scope, the settings-panel impact, the assistant discovery path, the approval behavior, the logging behavior, any explicitly deferred capabilities, and the localization ownership of any new static copy.