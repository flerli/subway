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
| 002_WEATHER_WIDGET__ISSUE_DEFINITION__001_MULTI_LOCATION_WEATHER_FOUNDATION.md | Add persistent support for up to five weather locations with one focus location and stable ordering for later extended-view use. | implemented |
| 002_WEATHER_WIDGET__ISSUE_DEFINITION__002_WEATHER_ICONOGRAPHY_AND_MOTION_SYSTEM.md | Create an original weather icon and slow-motion system for sun, cloudy, rain, thunderstorm, and wind states. | implemented |
| 002_WEATHER_WIDGET__ISSUE_DEFINITION__003_GENERIC_EXTENDED_VIEW_DETAIL_FRAMEWORK.md | Define a reusable widget framework so expanded view can host second, more detailed widget presentations. | implemented |
| 002_WEATHER_WIDGET__ISSUE_DEFINITION__004_WEATHER_EXTENDED_VIEW_AND_REFRESH_COUNTDOWN.md | Implement the weather widget's all-locations extended view and configurable refresh countdown behavior. | implemented |

## 003 USER MANAGEMENT

Description:
Introduce account ownership and persistent authentication so every application dataset becomes user-specific, only the owning user can access it, the system boots with a seeded `flerlage` account, and unauthenticated visitors see a minimal hero page instead of the kiosk UI.

Issues:

| Issue | Description | Status |
| --- | --- | --- |
| 003_USER_MANAGEMENT__ISSUE_DEFINITION__001_USER_ACCOUNT_AND_OWNERSHIP_FOUNDATION.md | Define the persistent user entity, ownership schema, and no-self-registration account model for user-specific data. | implemented |
| 003_USER_MANAGEMENT__ISSUE_DEFINITION__002_PASSWORD_AUTH_AND_PERSISTENT_SESSIONS.md | Add password login, the seeded `flerlage` account, and concurrent persistent sessions across multiple machines. | implemented |
| 003_USER_MANAGEMENT__ISSUE_DEFINITION__003_USER_SCOPED_API_ENFORCEMENT_AND_DATA_MIGRATION.md | Protect the backend routes, scope all reads and writes by authenticated user, and assign the existing dataset to `flerlage`. | implemented |
| 003_USER_MANAGEMENT__ISSUE_DEFINITION__004_HERO_PAGE_AND_AUTHENTICATED_APP_SHELL.md | Add the unauthenticated hero page, login flow, auth bootstrap, and logout-aware frontend shell. | implemented |
