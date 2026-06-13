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

## 004 MULTI LANGUAGE SUPPORT

Description:
Introduce a shared multilingual foundation so the kiosk can switch between English, German, French, and Spanish through one per-user global language setting, all shared application copy and existing widgets are translated through standardized translation files, and future widgets are required to ship with the same contract.

Issues:

| Issue | Description | Status |
| --- | --- | --- |
| 004_MULTI_LANGUAGE_SUPPORT__ISSUE_DEFINITION__001_SHARED_LOCALIZATION_FOUNDATION_AND_LANGUAGE_SETTING.md | Define the shared localization contract, supported languages, fallback behavior, and per-user global language persistence. | implemented |
| 004_MULTI_LANGUAGE_SUPPORT__ISSUE_DEFINITION__002_APPLICATION_SHELL_AND_SHARED_TEXT_LOCALIZATION.md | Complete localization coverage for the remaining shared application shell, auth flow, settings page, and shared host copy. | implemented |
| 004_MULTI_LANGUAGE_SUPPORT__ISSUE_DEFINITION__003_WIDGET_TRANSLATION_STANDARD_AND_EXISTING_WIDGET_MIGRATION.md | Standardize widget-local translation files and translate the existing arrival-board, weather, calendar, and todo widgets. | implemented |
| 004_MULTI_LANGUAGE_SUPPORT__ISSUE_DEFINITION__004_WIDGET_LOCALIZATION_GUIDELINES_AND_ISSUE_GUIDE_EXTENSION.md | Extend the development workflow so every new widget issue requires a standardized four-language translation file. | implemented |

## 005 CALENDAR

Description:
Expand the sample calendar widget into a family scheduling system with recurring event support, structured location data, a per-user home-country setting in the shared settings panel, authenticated event CRUD operations, foreign-event nation flag indicators, a compact next-seven-days widget surface, and an extended calendar experience with week, month, and year views.

Issues:

| Issue | Description | Status |
| --- | --- | --- |
| 005_CALENDAR__ISSUE_DEFINITION__001_EVENT_DOMAIN_AND_RECURRING_FOUNDATION.md | Define the persistent calendar event contract, normalized country fields, per-user home-country setting, family-member scope semantics, and recurring event foundations. | planned |
| 005_CALENDAR__ISSUE_DEFINITION__002_EVENT_CRUD_OPERATIONS.md | Add authenticated create, read, update, and delete workflows for one-off and recurring calendar events with normalized country input. | planned |
| 005_CALENDAR__ISSUE_DEFINITION__003_MINI_WEEK_WIDGET.md | Implement the compact calendar widget that shows the next seven days of upcoming events and flags events outside the user's country. | planned |
| 005_CALENDAR__ISSUE_DEFINITION__004_EXTENDED_WEEK_MONTH_YEAR_VIEWS_AND_CRUD.md | Build the extended calendar experience with week, month, and year views, event management actions, and foreign-event flag indicators. | planned |
