# EPIC OVERVIEW

## 001 WIDGET ARCHITECTURE

Description:
Establish a requirement-based widget system for the kiosk application where each widget is a database-backed micro app with its own frontend folder, scoped visibility, and reusable lifecycle conventions.

Issues:

| Issue | Description | Status |
| --- | --- | --- |
| 001_WIDGET_ARCHITECTURE__ISSUE_DEFINITION__001_WIDGET_REGISTRY_FOUNDATION.md | Define the widget entity, folder convention, badge metadata, and registry contract. | implemented |
| 001_WIDGET_ARCHITECTURE__ISSUE_DEFINITION__002_WIDGET_HOST_SCOPE_AND_PLACEMENT_ZONES.md | Render widgets through a shared host with multi-member scope resolution and configurable placement zones. | implemented |
| 001_WIDGET_ARCHITECTURE__ISSUE_DEFINITION__003_CALENDAR_WIDGET_SAMPLE.md | Implement the sample calendar widget as a scoped database-backed micro app. | implemented |
| 001_WIDGET_ARCHITECTURE__ISSUE_DEFINITION__004_TODO_WIDGET_SAMPLE.md | Implement the sample todo widget as a scoped read/write micro app. | implemented |
| 001_WIDGET_ARCHITECTURE__ISSUE_DEFINITION__005_WEATHER_WIDGET_SAMPLE.md | Implement the sample weather widget with live external data integration. | implemented |
| 001_WIDGET_ARCHITECTURE__ISSUE_DEFINITION__006_WIDGET_SETTINGS_PANELS.md | Add per-widget settings panels after the sample widgets are working. | implemented |
| 001_WIDGET_ARCHITECTURE__ISSUE_DEFINITION__007_WIDGET_HEALTH_DEBUG_OVERLAY.md | Add a hidden widget health and debug overlay for maintenance and diagnostics. | implemented |
| 001_WIDGET_ARCHITECTURE__ISSUE_DEFINITION__008_WIDGET_METADATA_ADMINISTRATION.md | Add backend-backed administration for widget metadata such as title, badge, scope, placement, and source location. | implemented |

## 002 WEATHER WIDGET

Description:
Evolve the weather widget from a single-location sample into a richer weather experience with multi-location support, original Apple Weather-inspired iconography, reusable extended-detail view infrastructure, and a configurable time-until-next-update countdown.

Issues:

| Issue | Description | Status |
| --- | --- | --- |
| 002_WEATHER_WIDGET__ISSUE_DEFINITION__001_MULTI_LOCATION_WEATHER_FOUNDATION.md | Add persistent support for up to five weather locations with one focus location and stable ordering for later extended-view use. | planned |
| 002_WEATHER_WIDGET__ISSUE_DEFINITION__002_WEATHER_ICONOGRAPHY_AND_MOTION_SYSTEM.md | Create an original weather icon and slow-motion system for sun, cloudy, rain, thunderstorm, and wind states. | planned |
| 002_WEATHER_WIDGET__ISSUE_DEFINITION__003_GENERIC_EXTENDED_VIEW_DETAIL_FRAMEWORK.md | Define a reusable widget framework so expanded view can host second, more detailed widget presentations. | planned |
| 002_WEATHER_WIDGET__ISSUE_DEFINITION__004_WEATHER_EXTENDED_VIEW_AND_REFRESH_COUNTDOWN.md | Implement the weather widget's all-locations extended view and configurable refresh countdown behavior. | planned |

*** Add File: /Users/flerli/01_Swaibian/Swaibian-Main_Office/05_Products/subway/project_management/epics/002_WEATHER_WIDGET/002_WEATHER_WIDGET__ISSUE_DEFINITION__001_MULTI_LOCATION_WEATHER_FOUNDATION.md
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

002 WEATHER WIDGET

## Issue Title

001 MULTI LOCATION WEATHER FOUNDATION

## Issue Description

Expand the weather widget from a single configured location to a multi-location foundation. The kiosk shall support up to five configured weather locations, with one focus location for the compact widget and up to four additional secondary locations for later extended-view use.

## Previous Issue Within The Epic

none

## Functional Requirements

1. The weather widget shall support up to five configured locations.
2. Each configured location shall store at least a label, latitude, and longitude.
3. One configured location shall act as the focus location used by the compact weather widget.
4. The configured location order shall be stable so later extended views can render one focus location plus up to four secondary locations.
5. Existing single-location weather settings shall normalize safely into the new multi-location model.

## Involved Modules

- Model:
	weather widget settings schema, multi-location configuration, focus-location ordering
- View:
	weather settings UI for multiple locations, compact weather rendering from the focus location, validation and empty states
- Controller:
	settings normalization, multi-location weather loading orchestration, compatibility migration from the single-location configuration

## Implementation Plan

1. Replace the single-location weather settings schema with a normalized array-based location model capped at five entries.
2. Add persistence and normalization rules so existing weather settings migrate into the new shape without breaking the widget.
3. Load weather data for the configured locations and assemble a shared multi-location view model.
4. Keep the compact weather widget focused on one primary location while exposing the additional locations for later extended-view work.

## Test Cases

1. A pre-existing single-location weather configuration loads without crashing and normalizes into the new model.
2. Up to five weather locations can be saved and loaded in a stable order.
3. The configured focus location drives the compact weather widget output.
4. Invalid location entries are rejected or normalized without breaking widget rendering.

*** Add File: /Users/flerli/01_Swaibian/Swaibian-Main_Office/05_Products/subway/project_management/epics/002_WEATHER_WIDGET/002_WEATHER_WIDGET__ISSUE_DEFINITION__002_WEATHER_ICONOGRAPHY_AND_MOTION_SYSTEM.md
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

002 WEATHER WIDGET

## Issue Title

002 WEATHER ICONOGRAPHY AND MOTION SYSTEM

## Issue Description

Introduce an original visual weather language inspired by the clarity and softness of Apple Weather without copying it directly. The widget shall cover at least sun, cloudy, rain, thunderstorm, and wind states and use very slow ambient motion so the board remains calm and readable.

## Previous Issue Within The Epic

001 MULTI LOCATION WEATHER FOUNDATION

## Functional Requirements

1. The weather widget shall expose icons for sun, cloudy, rain, thunderstorm, and wind conditions.
2. The icon system shall be original work that uses Apple Weather only as visual inspiration, not as a direct copy target.
3. Weather icon animations shall be very slow and non-distracting.
4. The icon system shall support both compact and extended weather presentations.
5. The weather widget shall define a fallback visual state for unknown or unmapped conditions.

## Involved Modules

- Model:
	normalized condition categories, icon state mapping, motion-state metadata
- View:
	icon components, slow animation styling, reduced-motion handling, fallback presentation
- Controller:
	weather condition normalization from provider payloads into icon categories

## Implementation Plan

1. Define a finite set of semantic weather categories and map provider conditions into those categories.
2. Create original icon components or assets for the supported weather states.
3. Add slow animation behavior for supported states and pair it with reduced-motion safeguards.
4. Integrate the icon system into the compact weather widget and prepare it for later extended-view reuse.

## Test Cases

1. Each supported weather state renders the intended icon.
2. Unmapped weather conditions fall back to a safe default state.
3. Reduced-motion handling disables or minimizes non-essential icon animation.
4. The same icon system works in both compact and extended weather presentations.

*** Add File: /Users/flerli/01_Swaibian/Swaibian-Main_Office/05_Products/subway/project_management/epics/002_WEATHER_WIDGET/002_WEATHER_WIDGET__ISSUE_DEFINITION__003_GENERIC_EXTENDED_VIEW_DETAIL_FRAMEWORK.md
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

002 WEATHER WIDGET

## Issue Title

003 GENERIC EXTENDED VIEW DETAIL FRAMEWORK

## Issue Description

Generalize the expanded-view host so widgets can offer a second, more detailed presentation instead of simply reusing the compact widget. Weather shall be the first consumer, but the framework shall be reusable by later widgets.

## Previous Issue Within The Epic

002 WEATHER ICONOGRAPHY AND MOTION SYSTEM

## Functional Requirements

1. The widget host shall allow a widget to expose a dedicated extended-detail presentation.
2. Widgets without a dedicated detail view shall continue to work with a safe fallback behavior.
3. The extended-view framework shall preserve the existing expand and collapse interaction model.
4. The extended-view framework shall pass enough context and data for a widget to render a meaningfully richer view than its compact board card.
5. The weather widget shall be able to adopt the framework without the API being weather-specific.

## Involved Modules

- Model:
	widget detail-view contract, extended-view capability metadata, host-stage view models
- View:
	expanded host layout, fallback detail rendering, extended widget presentation conventions
- Controller:
	expand selection state, detail-view resolution, data handoff into expanded widgets

## Implementation Plan

1. Extend the widget contract or host conventions so widgets may optionally provide a detail-view variant.
2. Update the expanded-stage host to resolve and render that detail variant when available.
3. Define fallback behavior for widgets that do not yet implement a separate detail view.
4. Validate the framework with the weather widget as the first adopter.

## Test Cases

1. A widget without a detail view still expands safely.
2. A widget with a detail view can render a richer extended presentation.
3. Expand and collapse interactions still target only one widget at a time.
4. Weather can consume the framework without introducing weather-only assumptions into the host.

*** Add File: /Users/flerli/01_Swaibian/Swaibian-Main_Office/05_Products/subway/project_management/epics/002_WEATHER_WIDGET/002_WEATHER_WIDGET__ISSUE_DEFINITION__004_WEATHER_EXTENDED_VIEW_AND_REFRESH_COUNTDOWN.md
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

002 WEATHER WIDGET

## Issue Title

004 WEATHER EXTENDED VIEW AND REFRESH COUNTDOWN

## Issue Description

Use the generic extended-view framework to render all configured weather locations at a glance. The expanded weather view shall present one focus location and up to four smaller secondary locations, while also surfacing the configurable time until the next weather refresh.

## Previous Issue Within The Epic

003 GENERIC EXTENDED VIEW DETAIL FRAMEWORK

## Functional Requirements

1. The expanded weather view shall display all configured locations at a glance, with one focus location and up to four secondary locations.
2. The weather widget shall expose the time remaining until the next refresh based on a configurable refresh interval.
3. The refresh countdown shall update in the UI over time and reset after a successful refresh.
4. The expanded weather view shall reuse the multi-location data model and iconography system introduced by earlier issues in this epic.
5. The expanded weather view shall degrade gracefully when fewer than five locations are configured or when weather data is stale for one or more locations.

## Involved Modules

- Model:
	expanded weather dashboard view model, refresh interval configuration, countdown state
- View:
	all-locations weather dashboard, focus and secondary location cards, countdown and refresh-state presentation
- Controller:
	refresh scheduling, countdown recalculation, expanded weather data assembly, stale/error handling across multiple locations

## Implementation Plan

1. Add a configurable refresh interval setting that the weather widget can persist and use for countdown calculations.
2. Compute the next refresh timestamp and expose a countdown model to both compact and extended weather surfaces.
3. Render the expanded weather dashboard with one focus location and up to four secondary locations.
4. Handle stale, partial, and error states so the expanded dashboard remains stable when one location fails or when the next refresh is pending.

## Test Cases

1. The expanded weather view renders correctly with one, three, and five configured locations.
2. The time-until-next-update countdown decreases over time and resets after refresh.
3. Changing the refresh interval setting changes the countdown behavior after persistence.
4. Partial data or stale refresh states do not break the expanded weather dashboard.
