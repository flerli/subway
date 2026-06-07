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

001 WIDGET REGISTRY FOUNDATION

## Issue Description

Create the architectural base for widgets as micro apps. This issue defines the widget entity, metadata contract, folder convention, and frontend registry so the rest of the epic can build on a stable structure instead of a monolithic kiosk page.

Discovery decisions already fixed for this issue:

- Widgets live under `frontend/src/widgets/<widget-name>/`.
- Widget visibility supports `All`, one member, or multiple selected members.
- Widget badge identity is visual: letter plus color, with the first letter of the widget title used as the default badge letter.

## Previous Issue Within The Epic

None. This is the first issue in the epic.

## Functional Requirements

1. A widget shall be implemented as a micro app inside `frontend/src/widgets/<widget-name>/`.
2. A widget shall exist as its own database entity.
3. The widget entity shall include at minimum:
   - title
   - subway letter
   - subway color
   - user scope
4. The default subway letter shall be derived from the first letter of the widget title unless explicitly overridden.
5. User scope shall support:
   - all members
   - exactly one member
   - a selected subset of multiple members
6. The frontend shall provide a widget registry or manifest that maps widget metadata to widget implementations.
7. The widget registry shall support widgets with read-only and read/write behavior.
8. The widget foundation shall be sufficient for subsequent issues to add host rendering, placement, and sample widgets without redefining the widget contract.

## Involved Modules

- Model:
  widget entity, widget metadata persistence, multi-member scope representation
- View:
  widget folder convention, widget registration metadata, widget shell contract
- Controller:
  widget registry, widget lookup, widget metadata access orchestration

## Implementation Plan

1. Define the widget database model and persistence schema for title, badge letter, badge color, and user scope.
2. Define the frontend widget folder structure under `frontend/src/widgets/<widget-name>/`.
3. Introduce a widget registry or manifest that maps widget metadata to frontend widget implementations.
4. Define a minimal widget contract for reading data, rendering UI, and optionally exposing write capabilities.
5. Document how a new widget is added, named, scoped, and registered.

## Test Cases

1. A widget record can be created with title, subway letter, subway color, and user scope.
2. The default badge letter can be derived from the widget title.
3. A widget can be resolved from metadata to a registered frontend implementation.
4. A widget folder can be added using the documented convention without changing unrelated widget folders.
