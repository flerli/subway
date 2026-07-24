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

009 MULTI INSTANCE WIDGETS AND INSTANCE SCOPED SETTINGS

## Issue Description

Add a widget-instance architecture so the board can host multiple copies of the same widget module with independent placement, metadata, and settings.

The current implementation overloads `widget.entity.id` as all of the following at once:

- widget type identity
- persisted widget row identity
- widget settings key
- expanded-card selection key
- widget health key
- widget MCP tool-log key

That single-key design makes widgets effectively singleton per user. It prevents the board from showing two mini weather widgets for two locations because a second weather card would collide with the first card's metadata, settings, and UI state.

This issue introduces a durable split between widget type and widget instance. A widget type describes the reusable module such as `weather`, while a widget instance is one user-owned card on the board such as `weather-berlin` or a generated UUID-backed record.

Weather is the first intended adopter, but the architecture shall remain generic so any future widget can opt into multiple instances when the product needs it.

## Previous Issue Within The Epic

008 WIDGET METADATA ADMINISTRATION

## Functional Requirements

1. The system shall distinguish between widget type identity and widget instance identity.
2. A user shall be able to own multiple widget instances that reference the same widget module or source location.
3. Each widget instance shall persist its own:
   - title
   - subway letter
   - subway color
   - user scope
   - placement zones
   - widget settings
   - widget MCP configuration
   - widget tool-call log association
4. Board expansion, settings expansion, debug health, and any other frontend selection state shall be keyed by widget instance identity rather than widget type identity.
5. Module discovery shall remain type-based through the existing source-location contract, so multiple instances of the same source location resolve to the same frontend widget module.
6. The architecture shall allow a widget module to declare whether multiple instances are supported. Widgets that do not opt in shall remain single-instance.
7. The administration flow shall support creating, duplicating, and deleting widget instances without manual database edits.
8. The weather widget shall be able to render multiple mini cards on the board, each backed by its own instance settings and its own selected location.
9. Existing users shall migrate safely from the current singleton widget records without losing widget metadata or settings.
10. Existing singleton widgets shall keep working without behavioral regression when only one instance exists.
11. Any new shared administration or shell copy introduced by this issue shall live in the shared application translation files.
12. If a widget later adds new widget-owned instance-specific copy as part of adopting this architecture, that copy shall continue to live in that widget's existing `translations.ts` file in English, German, French, and Spanish.
13. The widget MCP interface shall resolve and persist tool execution against the concrete widget instance the assistant targeted, not only the shared widget type.

## Involved Modules

- Model:
  widget instance schema, widget settings ownership, instance migration, instance capability flags, instance-scoped MCP associations
- View:
  board rendering keyed by widget instance id, settings expansion keyed by widget instance id, metadata administration create/duplicate/delete flows, weather multi-card presentation
- Controller:
  widget instance CRUD API, instance-scoped settings API, widget registry hydration, instance-aware MCP tool discovery and tool-log retrieval

## Implementation Plan

1. Introduce explicit widget-instance terminology into the shared types.
   - Add an instance identifier such as `instanceId` to persisted widget records.
   - Preserve a stable widget type identifier such as `widgetTypeId` for module-level behavior and presentation mapping.
   - Keep `sourceLocation` as the module discovery key.
2. Refactor backend persistence so widget rows and widget settings are instance-scoped instead of singleton-scoped.
   - Change the `widgets` ownership model to store one row per widget instance.
   - Change `widget_settings` from `(owner_user_id, widget_id)` to an instance-scoped key such as `(owner_user_id, widget_instance_id)`.
   - Move any widget-scoped MCP tool-log or approval associations to the same instance identity.
3. Add a safe migration path.
   - Existing widget rows become the initial widget instances for each user.
   - Existing widget settings rows map to the migrated instance ids.
   - Existing singleton assumptions remain valid for users who do not create duplicate instances.
4. Refactor the frontend registry and shared widget contracts.
   - `RegisteredWidget` shall carry both widget instance metadata and the resolved widget module.
   - Shared maps such as `widgetSettingsMap`, `widgetHealthMap`, expanded-widget state, and tool-log lookups shall be keyed by instance id.
   - Type-level presentation such as the numbered line badge shall continue to derive from the widget type, not from the instance row.
5. Add an explicit multi-instance capability flag to widget modules.
   - Example: `supportsMultipleInstances: true | false` in the widget module contract.
   - The metadata/admin flow shall only allow create/duplicate actions for modules that opt in.
6. Add widget-instance CRUD operations to the administration flow.
   - Create a new instance from a selected widget type or source location.
   - Duplicate an existing instance including business settings and MCP configuration where that behavior is desired.
   - Delete an instance and prune its instance-scoped settings and MCP records safely.
7. Replace singleton widget data loading in the app shell with instance-aware loading.
   - The current weather flow in `App.tsx` uses one global `weatherWidgetData` state and finds the widget by `entity.id === 'weather'`.
   - Replace that singleton path with instance-keyed data state so two weather cards can load independently.
   - Keep widget modules opaque: each instance receives only its own normalized settings when `loadData` runs.
8. Roll out weather as the first concrete adopter.
   - Mark the weather module as multi-instance capable.
   - Store one location selection per weather widget instance so each mini card represents one location clearly.
   - Preserve backward compatibility by normalizing the existing weather settings schema during migration or first save.
9. Update the widget MCP runtime to be instance-aware.
   - Tool discovery shall expose the targeted widget instance id together with the type-level tool name.
   - Tool execution, approval, and log retrieval shall resolve against the selected widget instance.
10. Validate translation ownership.
   - Add any new shared admin copy to the shared app translation files.
   - Do not duplicate shared administration labels inside widget-local `translations.ts` files.

## Test Cases

1. A user can create a second weather widget instance, assign it a different board zone, and both cards render simultaneously on the board.
2. Two weather widget instances can save different locations and refresh independently without overwriting each other's settings.
3. Board expansion and settings expansion target the selected widget instance even when two instances share the same widget type.
4. Widget health and debug output show separate entries for separate instances of the same widget type.
5. Widget metadata administration can create, duplicate, update, and delete a widget instance successfully.
6. A widget module that does not opt into multi-instance support cannot be duplicated through the administration flow.
7. Existing pre-migration widget metadata and settings remain available after the schema migration.
8. A user with no duplicate widgets still sees unchanged behavior for singleton widgets after the rollout.
9. Assistant MCP tool discovery and tool-log retrieval resolve against the correct widget instance when multiple weather widgets exist.
10. Any new shared instance-management copy renders correctly through the global language setting in English, German, French, and Spanish.
