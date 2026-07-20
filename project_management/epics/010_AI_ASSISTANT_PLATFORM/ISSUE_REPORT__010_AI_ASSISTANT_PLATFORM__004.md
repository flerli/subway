# ISSUE REPORT

## Epic

010 AI ASSISTANT PLATFORM

## Issue

004 MCP TOOL EXECUTION ORCHESTRATION AND RENDERING

## Implementation Summary

MCP-only tool execution was added to the assistant runtime in `backend/server.mjs`, and structured tool activity rendering was added to the Assistant transcript in `frontend/src/App.tsx`.

The backend implementation uses the already introduced `assistant_message_events` table to persist structured tool-call activity attached to assistant turns.

The assistant runtime now supports provider-returned tool calls by:

- parsing tool-call requests from assistant provider responses
- resolving tools only from admin-configured MCP server definitions
- executing those tools behind the Subway backend
- persisting structured running, completed, and error tool-call events linked to the assistant message
- redacting configured argument and result payloads before anything reaches the browser

MCP server configuration is now driven through:

- `ASSISTANT_MCP_SERVERS_JSON`

This configuration currently defines:

- MCP server name
- MCP server POST endpoint
- optional request headers
- allowed tool names
- per-tool redaction rules for arguments and results

The assistant runtime now distinguishes deterministic MCP-related failure classes including:

- `assistant_tool_not_found`
- `assistant_tool_execution_failed`
- `assistant_mcp_unavailable`
- `assistant_tool_result_invalid`

For successful tool-capable turns, the assistant message endpoint now returns the persisted tool events together with the assistant turn payload. For tool execution failures, the assistant turn still completes, but the transcript now receives a structured tool event with `status: 'error'` and a deterministic tool error code instead of collapsing into a generic chat failure.

The frontend assistant client in `frontend/src/api/assistant.ts` now normalizes thread-level assistant events, and the Assistant transcript in `frontend/src/App.tsx` renders tool activity inline under the related assistant message.

The transcript now shows at least:

- tool name
- MCP server name
- submitted arguments
- running or completed or error status
- final result when available
- structured error message when execution fails

Tool activity survives page refresh because `GET /api/assistant/threads/:threadId` now returns the persisted event records alongside thread messages.

## Notes For Next Issue

Issue 005 can build on the current transcript composition by keeping tool activity on its own structured rendering path while adding markdown rendering only for assistant text content.

## Validation

Validated with:

- `node --check backend/server.mjs`
- `npm --prefix frontend run build`
- a mock-provider and mock-MCP integration script that verified:
  - successful MCP tool execution persisted two transcript events
  - redacted arguments and results reached the frontend payload
  - persisted tool events were returned again through thread reload
  - failed MCP execution produced a persisted `error` event with deterministic error metadata
