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
