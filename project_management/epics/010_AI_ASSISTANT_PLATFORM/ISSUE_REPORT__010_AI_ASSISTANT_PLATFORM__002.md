# ISSUE REPORT

## Epic

010 AI ASSISTANT PLATFORM

## Issue

002 LITELLM WRAPPER AND CUSTOM BACKEND CONNECTOR RUNTIME

## Implementation Summary

The assistant runtime was implemented in `backend/server.mjs` as one normalized provider adapter that can execute assistant turns through either a LiteLLM-backed route or a direct custom backend route.

The runtime now adds:

- `AssistantRuntimeError` with stable Subway-side error codes
- normalized route validation and capability gating
- a shared outbound HTTP adapter with timeout handling and hidden provider credentials
- one LiteLLM connector that posts to `chat/completions`
- one direct custom backend connector that accepts the Subway-native request shape
- normalized response mapping for assistant text, finish reason, token usage, and streaming metadata

The runtime consumes the active assistant route from the issue 001 registry and keeps provider details behind the backend. Environment configuration now supports:

- `ASSISTANT_BACKEND_REQUEST_TIMEOUT_MS`
- `ASSISTANT_BACKEND_API_KEY`
- `ASSISTANT_BACKEND_HEADERS_JSON`

The assistant execution contract is now exposed through:

- `POST /api/assistant/threads/:threadId/messages`

This endpoint now:

- validates that the assistant thread exists and belongs to the authenticated user
- resolves the admin-managed route for that thread
- rejects unsupported streaming or tool requests before contacting the provider
- persists the user message
- executes the assistant turn through LiteLLM or a direct custom backend
- persists the normalized assistant response
- updates assistant route health state in the registry

Normalized runtime failure behavior now distinguishes:

- route missing or invalid configuration
- route disabled
- tool-calling unsupported
- streaming unsupported
- upstream provider authentication failure
- upstream timeout or rate-limiting style failure
- upstream temporary unavailability
- malformed provider payload

The runtime intentionally remains JSON-response based for now. Issue 003 can reuse the same adapter and persistence model when the chat UI starts consuming assistant turns and streaming delivery.

## Notes For Next Issue

Issue 003 can now focus on user-facing chat flow by wiring the frontend to:

- create prompts against `POST /api/assistant/threads/:threadId/messages`
- render persisted user and assistant messages from the normalized transcript
- introduce frontend streaming UX on top of the existing runtime capability metadata

## Validation

Validated with:

- `node --check backend/server.mjs`
- a mock-provider integration script that verified:
  - LiteLLM success path normalization
  - direct custom backend success path normalization
  - deterministic `assistant_tools_unsupported` rejection
  - deterministic `assistant_provider_auth_failed` mapping
