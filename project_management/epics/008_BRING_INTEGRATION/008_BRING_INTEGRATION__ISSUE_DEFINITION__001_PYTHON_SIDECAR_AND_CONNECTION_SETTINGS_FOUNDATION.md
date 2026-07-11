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

008 BRING INTEGRATION

## Issue Title

001 PYTHON SIDECAR AND CONNECTION SETTINGS FOUNDATION

## Issue Description

Establish the technical and configuration foundation for integrating Bring! shopping lists into Subway by using the upstream `bring-api` library through an internal Python sidecar behind the existing Node backend. This issue shall introduce per-authenticated-user Bring connection settings, encrypted-at-rest password storage, selected-shopping-list configuration, and the first Bring widget-local translation contract.

## Previous Issue Within The Epic

None (first issue in epic)

## Functional Requirements

1. Subway shall integrate Bring through the upstream `bring-api` Python package rather than through a custom reverse-engineered implementation in Node.
2. The browser shall communicate only with Subway-owned `/api/bring/*` endpoints; the Python Bring service shall remain internal and unreachable from the public browser surface.
3. The Python Bring integration shall run as a long-lived sidecar process or container behind the Node backend and shall reuse its async HTTP session and event loop instead of spawning a fresh Python process per request.
4. Every authenticated Subway user shall be able to maintain an independent Bring connection consisting of Bring username or email, Bring password, and one selected Bring shopping list.
5. Bring passwords shall be stored reversibly but encrypted at rest with a server-side secret from environment configuration; plaintext Bring passwords shall not be stored in SQLite.
6. The backend shall never return the persisted Bring password in plaintext to the frontend after it has been saved; the frontend may receive presence-state metadata instead.
7. After successful Bring authentication, Subway shall allow the user to load the available Bring shopping lists and persist one selected list for later widget use.
8. The connection settings shall be manageable through the Subway widget settings workflow so users can enter credentials, test or refresh the connection, and choose the active Bring list without leaving the application shell.
9. Bring authentication, request, and parse failures reported by the upstream library shall be mapped into stable Subway backend error responses so the frontend can distinguish invalid credentials, temporary upstream outages, and malformed upstream payloads.
10. Any widget-owned static UI copy introduced by this issue shall live in `frontend/src/widgets/bring/translations.ts` with English, German, French, and Spanish entries before the issue is complete.
11. Shared application texts such as generic save states shall remain in the shared localization files instead of being duplicated into the Bring widget-local translation file.

## Involved Modules

- Model:
  per-user Bring connection record, encrypted credential payload, selected Bring list metadata, sidecar health state, widget-local translation keys
- View:
  Bring widget settings form, list-selection control, connection-test or reconnect feedback states
- Controller:
  internal Node-to-Python bridge, Bring login and list-load orchestration, encrypted credential persistence, settings save and validation flow

## Implementation Plan

1. Add a Python Bring sidecar service that depends on the upstream `bring-api` package and exposes a narrow internal HTTP contract for login validation, list loading, and future list operations.
2. Keep the existing Node backend as the only browser-facing API surface and proxy Bring-related requests from Node to the internal Python service.
3. Introduce per-user Bring integration persistence in SQLite, including Bring username or email, encrypted password payload, selected list identifier, and updated-at metadata.
4. Add environment-variable-driven encryption key handling for Bring credential storage and document the startup failure behavior when the encryption key is missing.
5. Implement frontend settings UI for Bring credentials and selected shopping list within the existing widget settings host flow.
6. Create `frontend/src/widgets/bring/translations.ts` and include every widget-owned static setting, connection, and validation text in English, German, French, and Spanish.
7. Normalize and map upstream `BringAuthException`, `BringRequestException`, and `BringParseException` outcomes into stable Subway error codes and user-facing states.

## Test Cases

1. A signed-in Subway user can save Bring credentials, authenticate successfully, and retrieve the available Bring shopping lists.
2. Two different Subway users can persist different Bring credentials and selected lists without reading or overwriting each other's data.
3. The persisted Bring password is encrypted in SQLite and is not returned in plaintext by the backend settings payload.
4. Invalid Bring credentials produce a deterministic authentication error state instead of a generic backend failure.
5. Temporary Python sidecar or upstream Bring request failures produce a deterministic unavailable-state response distinct from invalid credentials.
6. The Bring settings UI renders its widget-owned static texts through `frontend/src/widgets/bring/translations.ts` in English, German, French, and Spanish.
