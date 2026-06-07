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
