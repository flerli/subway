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

009 ROBOROCK INTEGRATION

## Issue Title

001 PYTHON SIDECAR AND EMAIL CODE CONNECTION FOUNDATION

## Issue Description

Establish the technical and configuration foundation for integrating Roborock robot vacuums into Subway by using the upstream `python-roborock` library through an internal Python sidecar behind the existing Node backend. This issue shall introduce per-authenticated-user Roborock email-code connection setup, encrypted-at-rest Roborock session persistence, reconnect lifecycle handling, and the first Roborock widget-local translation contract.

## Previous Issue Within The Epic

None (first issue in epic)

## Functional Requirements

1. Subway shall integrate Roborock through the upstream `python-roborock` package rather than through a custom Roborock implementation in Node.
2. The first release scope shall target Roborock robot vacuums only; non-vacuum Roborock device families are out of scope for this epic.
3. The browser shall communicate only with Subway-owned `/api/roborock/*` endpoints; the Python Roborock service shall remain internal and unreachable from the public browser surface.
4. The Python Roborock integration shall run as a long-lived sidecar process or container behind the Node backend and shall reuse its async HTTP session and event loop instead of spawning a fresh Python process per request.
5. Every authenticated Subway user shall be able to maintain an independent Roborock connection consisting of Roborock account email address, an email verification-code setup flow, and persisted Roborock session or user-data payload for later device access.
6. Verification codes shall be treated as temporary setup inputs only and shall never be persisted after successful login.
7. Persisted Roborock session or user-data payloads shall be stored reversibly but encrypted at rest with a server-side secret from environment configuration; raw Roborock session payloads shall not be stored in plaintext in SQLite.
8. The backend shall never return the persisted Roborock session payload in plaintext to the frontend after it has been saved; the frontend may receive presence-state, last-connected, and reconnect-needed metadata instead.
9. The connection settings shall be manageable through the Subway widget settings workflow so users can enter their Roborock email address, request a verification code, submit the code, and see connection health without leaving the application shell.
10. Roborock authentication, request, and parse failures reported by the upstream library shall be mapped into stable Subway backend error responses so the frontend can distinguish invalid verification flow, expired session, temporary upstream outages, and malformed upstream payloads.
11. Any widget-owned static UI copy introduced by this issue shall live in `frontend/src/widgets/roborock/translations.ts` with English, German, French, and Spanish entries before the issue is complete.
12. Shared application texts such as generic save states shall remain in the shared localization files instead of being duplicated into the Roborock widget-local translation file.

## Involved Modules

- Model:
  per-user Roborock connection record, encrypted session payload, sidecar health state, reconnect metadata, widget-local translation keys
- View:
  Roborock widget settings form, code-request and code-submit states, connection-health and reconnect feedback states
- Controller:
  internal Node-to-Python bridge, Roborock email-code orchestration, encrypted session persistence, settings save and validation flow

## Implementation Plan

1. Add a Python Roborock sidecar service that depends on the upstream `python-roborock` package and exposes a narrow internal HTTP contract for requesting login codes, validating login codes, checking session health, and future robot operations.
2. Keep the existing Node backend as the only browser-facing API surface and proxy Roborock-related requests from Node to the internal Python service.
3. Introduce per-user Roborock integration persistence in SQLite, including Roborock email address, encrypted session payload, session-health metadata, and updated-at metadata.
4. Add environment-variable-driven encryption key handling for Roborock session storage and document the startup failure behavior when the encryption key is missing.
5. Implement frontend settings UI for Roborock email-code connection management within the existing widget settings host flow.
6. Create `frontend/src/widgets/roborock/translations.ts` and include every widget-owned static setting, connection, and validation text in English, German, French, and Spanish.
7. Normalize and map upstream Roborock authentication and request failures into stable Subway error codes and user-facing states.

## Test Cases

1. A signed-in Subway user can request a Roborock login code, submit the code successfully, and persist a working Roborock connection for later robot access.
2. Two different Subway users can persist different Roborock accounts without reading or overwriting each other's data.
3. The persisted Roborock session payload is encrypted in SQLite and is not returned in plaintext by the backend settings payload.
4. An invalid or expired verification code produces a deterministic authentication error state instead of a generic backend failure.
5. Temporary Python sidecar or upstream Roborock request failures produce a deterministic unavailable-state response distinct from invalid setup input.
6. The Roborock settings UI renders its widget-owned static texts through `frontend/src/widgets/roborock/translations.ts` in English, German, French, and Spanish.