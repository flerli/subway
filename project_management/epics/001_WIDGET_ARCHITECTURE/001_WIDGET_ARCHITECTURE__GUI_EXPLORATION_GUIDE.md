# EPIC 001 GUI EXPLORATION GUIDE

## Purpose

This guide helps a user or tester explore the GUI features delivered by EPIC 001 WIDGET ARCHITECTURE.

The focus is not implementation detail. The focus is how to interact with the kiosk UI and observe the new behavior directly in the browser.

## Before You Start

Run the backend:

```bash
cd backend
npm start
```

Run the frontend in a second terminal:

```bash
cd frontend
npm run dev
```

Or for the production-style preview:

```bash
cd frontend
npm run build
npm run preview
```

Open the kiosk UI in the browser and keep two views in mind:

- `Board`: the live kiosk surface
- `Settings`: family, widget settings, and widget metadata administration

## Quick Orientation

### Board

Use the `Board` button in the top bar to see the live widget layout.

The board now includes:

- arrival board
- weather widget
- calendar widget
- todo widget
- bulletins widget
- calibration widget

### Settings

Use the `Settings` button in the top bar.

The settings surface now has three major areas:

1. Family member management
2. Per-widget settings panels
3. Widget metadata administration

## Suggested Exploration Tasks

### Task 1: Change a Family Member Name

Goal:
Confirm that family members are persisted on the backend and reflected in filter badges.

Steps:

1. Open `Settings`.
2. In the family member list, change one forename.
3. Return to `Board`.
4. Check the member filter chips.

What to observe:

- The visible member label updates.
- The circular symbol uses the first letter of the updated forename.
- The change survives page reload because it is backend-persisted.

### Task 2: Change the Symbol Color of the Todo Widget

Goal:
Confirm that widget metadata changes are centrally stored and applied immediately.

Steps:

1. Open `Settings`.
2. Scroll to the widget metadata administration cards.
3. Find the `Todo` widget metadata card.
4. Change `Subway color`.
5. Save widget metadata.
6. Return to `Board`.

What to observe:

- The numbered Todo widget badge changes color.
- The change applies without manual database editing.
- The change survives reload because the metadata is stored on the backend.

### Task 3: Move the Calendar Widget to Another Zone

Goal:
Explore configurable widget placement zones.

Steps:

1. Open `Settings`.
2. Find the `Calendar` widget metadata card.
3. In `Placement zones`, disable the current zone and enable another one.
4. Set the target zone order.
5. Save widget metadata.
6. Return to `Board`.

What to observe:

- The calendar widget moves to the selected board region.
- The board layout updates from backend metadata, not from hard-coded placement.

Suggested experiments:

- Move `Calendar` from `triad` to `bottom-wide`.
- Move it back afterward.

### Task 4: Change Widget Scope

Goal:
Confirm that widget visibility reacts to member focus filters.

Steps:

1. Open `Settings`.
2. Find the metadata card for a widget such as `Bulletins` or `Todo`.
3. Change `Scope mode`.
4. Adjust scope members.
5. Save widget metadata.
6. Return to `Board`.
7. Switch between the member focus chips.

What to observe:

- Widgets appear or disappear depending on the focused member.
- `All` view still acts as the broad household overview.

Suggested experiment:

- Set `Bulletins` to only two members.
- Switch through the family filters and confirm only those two see it.

### Task 5: Limit Calendar Items

Goal:
Explore the per-widget settings panel instead of the metadata admin panel.

Steps:

1. Open `Settings`.
2. Find `Calendar widget settings`.
3. Lower `Max visible items`.
4. Save widget settings.
5. Return to `Board`.

What to observe:

- The calendar widget shows fewer events.
- This is a widget behavior setting, not a metadata setting.

### Task 6: Hide Completed Tasks

Goal:
Explore a widget-specific behavior setting for the Todo widget.

Steps:

1. Open `Settings`.
2. Find `Todo widget settings`.
3. Turn off `Show completed tasks`.
4. Save widget settings.
5. Return to `Board`.
6. Mark a task as `Done`.

What to observe:

- The task disappears from the visible list after completion.
- Re-enable the option later to show completed tasks again.

### Task 7: Change the Weather Location

Goal:
Confirm that the weather widget can be configured independently and still loads live backend-fetched data.

Steps:

1. Open `Settings`.
2. Find `Weather widget settings`.
3. Change `Location label`, `Latitude`, or `Longitude`.
4. Save widget settings.
5. Return to `Board`.

What to observe:

- The weather card updates its location label.
- The live weather route uses the configured coordinates.
- The widget still shows source, state, and updated time.

## Advanced Exploration

### Hidden Diagnostics Overlay

Goal:
Inspect scope, source, refresh state, and failure information.

How to open it:

1. Go to `Board`.
2. Tap the `HM` badge five times quickly.

Alternative:

- Press `Ctrl+Shift+D`.

How to close it:

- Press `Escape`, or
- Use the overlay close button.

What to inspect:

- source and source location
- scope label
- placement zone and order
- visible now
- refresh status
- last refresh time
- item count
- failure state

Suggested checks:

- Open the overlay in `All` view.
- Switch to a member-specific view.
- Reopen the overlay and compare which widgets are visible.

## Recommended Demo Flow

If you want to demonstrate the full Epic 001 result quickly, use this order:

1. Change a family member name.
2. Change a widget badge color.
3. Move the calendar widget to another zone.
4. Restrict a widget to selected members only.
5. Limit calendar items through widget settings.
6. Change the weather widget location.
7. Open the diagnostics overlay.

## Important Distinction

When exploring, keep this distinction clear:

- `Widget settings panels` change widget behavior.
  Examples: max items, show completed tasks, weather coordinates.

- `Widget metadata administration` changes widget identity and board behavior.
  Examples: title, badge letter/color, scope, placement zone, source location.

## Troubleshooting

If a change does not appear:

1. Confirm the backend is running.
2. Confirm the frontend is running.
3. Reload the browser after saving.
4. Open the hidden diagnostics overlay and inspect the widget state.
5. Check whether the widget is out of scope for the active member filter.

If a widget disappears unexpectedly:

1. Check its scope mode and selected members.
2. Check its placement zones.
3. Check whether the source location still matches a valid widget module.