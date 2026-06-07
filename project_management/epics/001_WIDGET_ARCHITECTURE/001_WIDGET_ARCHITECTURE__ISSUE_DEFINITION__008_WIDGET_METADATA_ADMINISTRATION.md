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

001 WIDGET ARCHITECTURE

## Issue Title

008 WIDGET METADATA ADMINISTRATION

## Issue Description

Add a dedicated administration/settings flow for centrally managed widget metadata. The goal is to let the system edit backend-backed widget records without changing seeded files or database rows manually.

This issue is separate from per-widget settings panels. Per-widget settings focus on widget-specific configuration, while this issue focuses on core widget identity and board behavior metadata.

## Previous Issue Within The Epic

007 WIDGET HEALTH DEBUG OVERLAY

## Functional Requirements

1. The application shall provide an administration UI or management flow for widget metadata.
2. Widget metadata administration shall read from and write to the backend persistence layer.
3. The metadata administration flow shall support at minimum:
   - title
   - subway letter
   - subway color
   - user scope
   - placement zones
   - source location
4. Source location shall remain compatible with automatic widget module discovery.
5. Metadata changes shall take effect in the widget host without manual database editing.
6. Invalid source locations or incompatible placement values shall be validated and rejected safely.

## Involved Modules

- Model:
  widget metadata persistence, widget metadata validation, source-location compatibility rules
- View:
  widget metadata admin UI, field validation states, placement/scope editing controls
- Controller:
  widget metadata CRUD API, validation orchestration, backend-to-frontend refresh flow

## Implementation Plan

1. Define the admin-facing widget metadata API contract.
2. Add backend endpoints for reading and updating widget metadata.
3. Add a frontend administration/settings screen for widget metadata editing.
4. Validate source locations against the available widget module discovery contract.
5. Validate placement zones and scope structures before persisting changes.
6. Refresh or rehydrate the widget registry after metadata changes.

## Test Cases

1. Widget metadata can be loaded from the backend into the admin flow.
2. Widget title, badge, scope, placement, and source location can be updated successfully.
3. Invalid source locations are rejected.
4. Invalid placement zones are rejected.
5. Metadata changes are reflected in the live widget host after a reload or refresh.
6. Valid metadata updates do not break widget module discovery.