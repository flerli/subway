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

## 006 KEYBOARD

Description:
Introduce a global kiosk software keyboard that opens automatically whenever users focus supported text fields, renders as a semi-transparent lower-half board overlay, and adapts key layout to the currently selected system language without widget-specific implementations.

Issues:

| Issue | Description | Status |
| --- | --- | --- |
| 006_KEYBOARD__ISSUE_DEFINITION__001_GLOBAL_SOFTWARE_KEYBOARD_FOUNDATION.md | Define the global software keyboard contract and automatic activation on focused text inputs and textareas across the board. | implemented |
| 006_KEYBOARD__ISSUE_DEFINITION__002_LOWER_OVERLAY_AND_KIOSK_INTERACTION_MODEL.md | Implement the lower-half semi-transparent overlay presentation, close interactions, and kiosk touch behavior. | implemented |
| 006_KEYBOARD__ISSUE_DEFINITION__003_LANGUAGE_DRIVEN_LAYOUTS_AND_SYSTEM_ROLLOUT.md | Bind keyboard layout to the existing global language setting and complete shared rollout across board text-entry flows. | planned |

## 007 AUDIO VISUAL INPUT

Description:
Introduce a family-wide audio-visual widget for capturing, recording, and replaying audio and video content. The widget provides live camera feed with on/off control, snapshot and video/audio recording with manual start/stop triggers, real-time audio level visualization, and a shared family history with playback and deletion capabilities.

Issues:

| Issue | Description | Status |
| --- | --- | --- |
| 007_AUDIO_VISUAL_INPUT__ISSUE_DEFINITION__001_WIDGET_FOUNDATION_AND_LIVE_CAMERA_STREAMING.md | Establish widget foundation with live camera feed, permission handling, camera on/off toggle, and four-language UI. | planned |
| 007_AUDIO_VISUAL_INPUT__ISSUE_DEFINITION__002_RECORDING_STILL_VIDEO_AND_AUDIO_CAPTURE.md | Implement snapshot, video recording, audio recording, and real-time audio level visualization with manual start/stop controls. | planned |
| 007_AUDIO_VISUAL_INPUT__ISSUE_DEFINITION__003_TEMPORARY_SERVER_STORAGE_AND_UPLOAD.md | Add multipart upload API, persistent recording metadata, backend storage with soft-delete lifecycle, and family-wide retrieval. | planned |
| 007_AUDIO_VISUAL_INPUT__ISSUE_DEFINITION__004_HISTORY_AND_REPLAY.md | Build recording history list, media playback (video/audio/photo), deletion workflow, and four-language history UI. | planned |

## 008 BRING INTEGRATION

Description:
Integrate Bring! shopping lists into Subway through the upstream `bring-api` Python package behind the existing authenticated Node backend, with per-user encrypted Bring credentials, selected-list settings, stale-cache fallback, a compact shopping widget, and an extended detail view for list management.

Issues:

| Issue | Description | Status |
| --- | --- | --- |
| 008_BRING_INTEGRATION__ISSUE_DEFINITION__001_PYTHON_SIDECAR_AND_CONNECTION_SETTINGS_FOUNDATION.md | Establish the internal Python Bring bridge, per-user encrypted Bring credential storage, selected-list configuration, and widget settings UI. | implemented |
| 008_BRING_INTEGRATION__ISSUE_DEFINITION__002_SELECTED_LIST_CACHE_AND_ITEM_CRUD_API.md | Add selected-list snapshot caching, stale-read fallback, and authenticated item CRUD endpoints while following the upstream Bring API constraints. | implemented |
| 008_BRING_INTEGRATION__ISSUE_DEFINITION__003_MINI_SHOPPING_LIST_WIDGET.md | Implement the compact Bring widget with open-item preview, remaining-count meta, stale-state visibility, and entry into the extended view. | implemented |
| 008_BRING_INTEGRATION__ISSUE_DEFINITION__004_EXTENDED_SHOPPING_LIST_VIEW_AND_COMPLETION_WORKFLOWS.md | Build the extended Bring list experience with add, spec update, complete, delete, reconnect guidance, and reopen-through-readd workflow. | implemented |
