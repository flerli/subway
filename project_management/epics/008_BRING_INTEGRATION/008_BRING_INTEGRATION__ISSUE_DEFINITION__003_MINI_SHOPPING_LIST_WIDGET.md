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

003 MINI SHOPPING LIST WIDGET

## Issue Description

Implement the compact Bring widget surface on the Subway board. The mini widget shall present a quick preview of open items from the user's selected Bring list together with remaining-count metadata, surface stale-cache visibility when fresh Bring data is unavailable, and provide the entry point into the extended Bring detail experience.

## Previous Issue Within The Epic

002 SELECTED LIST CACHE AND ITEM CRUD API

## Functional Requirements

1. The compact Bring widget shall render open items from the signed-in user's selected Bring shopping list.
2. The compact widget shall show a remaining-count summary for open items in addition to a short item preview.
3. The compact widget shall preserve stable row identity for rendered items so later detail-view actions can target the same Bring entries reliably.
4. The compact widget shall expose a clear empty state when the selected Bring list has no open items.
5. The compact widget shall expose a clear not-configured state when the user has not yet saved Bring credentials or selected a list.
6. When Subway serves stale cached Bring data, the compact widget shall visibly indicate that the snapshot is stale rather than pretending it is fresh.
7. The compact widget shall offer an affordance to open the Bring extended detail view when the widget host supports expanded presentation.
8. The compact widget shall respect authenticated user ownership and shall not mix data between different Subway users.
9. Any new widget-owned static UI copy introduced by this issue shall live in `frontend/src/widgets/bring/translations.ts` with English, German, French, and Spanish entries before the issue is complete.
10. Shared application texts and shared widget-host texts shall remain outside the Bring widget-local translation file.

## Involved Modules

- Model:
  compact Bring item preview shape, open-item count meta, widget stale-state flag, widget-local translation keys
- View:
  compact Bring widget layout, empty and unconfigured states, stale indicator treatment, extended-view entry affordance
- Controller:
  selected-list fetch wiring, freshness-state consumption, widget-to-detail-view activation, settings-state gating

## Implementation Plan

1. Register a new Bring widget in the existing widget registry and backend widget seed metadata.
2. Fetch the normalized selected-list snapshot through Subway's own Bring API and derive a compact preview payload for board rendering.
3. Render a concise open-items preview together with remaining-count metadata optimized for quick kiosk scanning.
4. Add explicit visual treatment for unconfigured, empty, loading, error, and stale cached states.
5. Add or update `frontend/src/widgets/bring/translations.ts` with every widget-owned static text introduced by the compact Bring surface in English, German, French, and Spanish.
6. Wire the compact widget to the existing extended-detail framework instead of embedding full CRUD controls directly in the board tile.

## Test Cases

1. A configured user with open Bring items sees a compact preview plus the correct remaining-count summary.
2. A configured user with no open Bring items sees the compact empty state.
3. A user without Bring configuration sees the not-configured state instead of a generic backend error.
4. A stale cached Bring snapshot renders with a visible stale indicator in the compact widget.
5. Different signed-in Subway users see only their own Bring data and selected list.
6. The compact Bring widget renders its widget-owned static texts through `frontend/src/widgets/bring/translations.ts` in English, German, French, and Spanish.