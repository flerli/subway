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
