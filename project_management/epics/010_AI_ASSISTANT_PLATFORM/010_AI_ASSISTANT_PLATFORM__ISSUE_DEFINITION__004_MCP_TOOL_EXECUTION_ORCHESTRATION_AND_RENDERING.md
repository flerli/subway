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

010 AI ASSISTANT PLATFORM

## Issue Title

004 MCP TOOL EXECUTION ORCHESTRATION AND RENDERING

## Issue Description

Add tool-calling to the Subway assistant through MCP servers only. This issue shall introduce backend MCP orchestration, persisted tool-call event records attached to assistant turns, and chat transcript rendering that shows tool name, arguments, running state, result, and error outcomes in a structured way.

## Previous Issue Within The Epic

003 PERSISTENT AGENT CHAT SECTION AND STREAMING THREADS

## Functional Requirements

1. The first release of assistant tool calling shall execute tools only through configured MCP servers; Subway-owned non-MCP tool actions are out of scope for this epic.
2. The assistant runtime shall support one or more tool calls during a single assistant turn when the active backend route declares tool-calling capability.
3. Tool execution shall be orchestrated by the Subway backend and shall never expose direct MCP server access to the browser.
4. The persisted transcript model shall store structured tool-call event records linked to the owning thread and assistant turn.
5. The frontend shall render tool activity with at least the following elements: tool name, submitted arguments, running state, final result, and error state when execution fails.
6. Tool execution and rendering states shall survive page refresh by loading from persisted backend records rather than only from transient client memory.
7. The backend shall distinguish deterministic tool failure classes including tool not found, execution failure, MCP server unavailable, and malformed tool result.
8. Tool-call arguments or results that contain sensitive internal values shall be redactable before rendering if the backend marks them as non-displayable.
9. Any new user-facing static UI copy introduced by tool activity rendering shall use the shared localization foundation from Epic 004.

## Involved Modules

- Model:
  MCP server metadata, tool-call event records, tool execution state, redaction metadata, transcript attachments
- View:
  tool activity panels within the transcript, running and failed tool states, localized execution chrome
- Controller:
  MCP client orchestration, assistant-to-tool execution loop, event persistence, transcript hydration, redaction-aware rendering payloads

## Implementation Plan

1. Extend the normalized assistant runtime so a tool-capable route can request MCP tool execution during an assistant turn.
2. Integrate configured MCP servers behind the Subway backend and define a stable execution contract for calling tools and collecting results.
3. Persist structured tool-call records alongside assistant turns so the transcript can be reconstructed after reload.
4. Add frontend transcript components that render tool-call arguments, running progress, final results, and failures in a structured format.
5. Implement redaction-aware payload shaping so sensitive tool fields can be hidden or summarized before they reach the browser.
6. Localize any new tool-rendering shell text through the shared application localization system.

## Test Cases

1. A tool-capable assistant turn can call an MCP tool successfully and render the tool name, arguments, running state, and final result in the transcript.
2. A failed MCP tool execution renders a deterministic error state distinct from generic chat failure.
3. A transcript containing tool activity can be reloaded after a page refresh without losing the structured tool events.
4. A route that does not declare tool-calling capability does not attempt MCP execution and fails predictably if tool use is requested.
5. Redacted tool fields are not rendered in plaintext when the backend marks them as non-displayable.
