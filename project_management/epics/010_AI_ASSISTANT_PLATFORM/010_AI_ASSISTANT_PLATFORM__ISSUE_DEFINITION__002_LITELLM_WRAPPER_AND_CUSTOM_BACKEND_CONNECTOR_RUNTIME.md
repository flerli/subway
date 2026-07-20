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

002 LITELLM WRAPPER AND CUSTOM BACKEND CONNECTOR RUNTIME

## Issue Description

Implement the internal execution runtime that powers Subway assistant turns through one normalized provider abstraction. This issue shall route model requests through LiteLLM where configured, support direct custom backend connections in the same first pass, and map both paths into a stable Subway-native request and error contract.

## Previous Issue Within The Epic

001 CHAT DOMAIN AND ADMIN MANAGED BACKEND REGISTRY FOUNDATION

## Functional Requirements

1. Subway shall support two provider execution modes behind the assistant API: LiteLLM-wrapped upstream model access and direct custom backend connections.
2. LiteLLM shall be treated as an internal wrapper or gateway behind Subway rather than as a browser-facing endpoint.
3. Direct custom backend routes shall be first-class runtime targets rather than temporary fallbacks, provided that they are configured through the admin-managed backend registry.
4. The backend shall normalize request payloads, response payloads, streaming metadata, and error categories across LiteLLM and direct custom backends before anything reaches the browser.
5. Provider credentials, API keys, and internal endpoint details shall never be exposed to the browser or persisted in user-owned thread records.
6. The runtime shall distinguish deterministic failure classes including misconfiguration, authentication failure to the upstream service, timeout or unavailable state, and malformed provider payload.
7. The runtime shall expose capability-aware route metadata so later chat and tool issues can reject unsupported features such as tool calling on routes that do not declare it.
8. Assistant requests shall be attributable to the authenticated Subway user in backend logs or metadata without leaking internal secrets into the frontend transcript.
9. Any new user-facing static UI copy introduced by runtime health or error surfaces shall use the shared localization foundation from Epic 004.

## Involved Modules

- Model:
  backend registry route metadata, provider health metadata, normalized assistant request and response payloads
- View:
  runtime availability indicators, localized provider-unavailable and misconfiguration states
- Controller:
  internal provider adapter layer, LiteLLM connector, direct custom backend connector, capability gating, normalized error mapping

## Implementation Plan

1. Introduce an internal provider adapter interface that accepts Subway-native chat requests and returns normalized assistant responses independent of backend kind.
2. Implement a LiteLLM connector that can call one admin-configured LiteLLM route and map its responses into the normalized Subway contract.
3. Implement a direct custom backend connector for admin-configured HTTP backends that do not route through LiteLLM but still conform to the Subway adapter interface.
4. Add capability and health validation so unsupported or unavailable routes fail before the frontend receives ambiguous responses.
5. Normalize provider-side failures into stable Subway error codes and messages that later UI work can render consistently.
6. Extend the assistant backend routes from issue 001 so chat execution can be invoked through one stable internal runtime regardless of upstream backend kind.

## Test Cases

1. An assistant request can be executed successfully through a LiteLLM-backed route and return a normalized Subway response.
2. An assistant request can be executed successfully through a direct custom backend route and return the same normalized Subway response shape.
3. Provider secrets and internal endpoint details are not returned to the frontend transcript or thread APIs.
4. A broken LiteLLM route and a broken direct custom backend route both produce deterministic Subway error categories instead of uncategorized failures.
5. A route marked as not supporting streaming or tool calling is rejected consistently when later issues request those capabilities.
