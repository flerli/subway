# ISSUE REPORT

## Epic

009 ROBOROCK INTEGRATION

## Issue

002 DEVICE SELECTION DEFAULT ROUTINE AND STATUS API

## Implementation Summary

The Roborock device-domain issue was implemented across the Python sidecar, the authenticated Node backend, and the Roborock widget settings panel.

The sidecar extension lives in `backend/roborock_sidecar/server.py`.

The sidecar now exposes additional internal endpoints for:

- supported Roborock vacuum discovery
- routine loading for the selected device
- normalized status retrieval
- quick-start execution through either a saved routine or the standard `app_start` fallback

The sidecar normalizes device metadata around:

- device duid
- display name
- model and product name
- online state
- whether the device exposes routines
- whether the device supports the quick-start command path

The sidecar normalizes status around a stable contract with:

- state and state name
- battery percentage
- clean time in seconds when available
- cleaned area in square meters when available
- clean progress percentage when available
- current map id when available
- dock state and error-code name when available
- capability flags that explicitly mark unsupported optional telemetry such as location or remaining-time estimates

The backend extension lives in `backend/server.mjs`.

The server now extends `roborock_integrations` with:

- selected device duid, name, and model
- selected routine id and name

The backend now exposes authenticated Roborock endpoints for:

- `POST /api/roborock/settings/devices`
- `PATCH /api/roborock/settings/selection`
- `GET /api/roborock/status`
- `POST /api/roborock/start`

The backend validates that the selected device exists in the currently discoverable Roborock device set and that the selected routine exists in the currently discoverable routine set for that device.

When a selected device does not expose routines, the backend preserves an explicit standard quick-start fallback instead of failing. When a previously selected routine is no longer available, the sidecar now returns a deterministic `roborock_routine_not_found` error so the frontend can guide the user back to settings.

The frontend device-selection flow lives in:

- `frontend/src/api/roborock.ts`
- `frontend/src/widgets/roborock/RoborockSettingsPanel.tsx`
- `frontend/src/widgets/roborock/translations.ts`

The settings panel now supports:

- loading compatible Roborock vacuums for the stored session
- selecting one active robot
- loading and selecting one default routine when the chosen robot exposes routines
- showing an explicit fallback message when the robot does not expose routines or when no routine is selected

Implementation detail:

- the panel keeps the selection flow inside widget settings because the compact board tile belongs to issue 003
- location and remaining-time telemetry were left capability-flagged as unsupported in issue 002 because the first stable status contract should not guess at map-derived room position or ETA data that is not reliably exposed across models

## Notes For Next Issue

Issue 003 can build on this foundation by:

- using `POST /api/roborock/start` for the mini-widget action
- reading `GET /api/roborock/status` for compact state feedback
- surfacing saved routine versus standard-start fallback in the compact presentation

## Validation

Validated with:

- `node --check backend/server.mjs`
- `python3 -m py_compile backend/roborock_sidecar/server.py`
- `docker compose config >/dev/null`
- `npm --prefix frontend run build`