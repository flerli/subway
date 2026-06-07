# subway

Portrait-first family smart home kiosk UI with a dark transit-inspired visual language.

## Overview

The app in `frontend/` is a fullscreen home information board designed for a 27 inch 4K display in portrait mode. It combines a family arrival board, weather, calendar, todo list, bulletins, a calibration panel, and a settings page where family members can be added and customized.

Current highlights:

- Family members can be added from settings
- Every member can choose an individual color
- The first letter of the forename becomes the circular member badge
- Widgets use numbered badges so people and modules stay visually distinct
- The board keeps a 5 x 5 cm calibration square for the target panel

## Screenshots

### Home board

![Home board screenshot](frontend/public/screenshots/home-board.png)

### Member-focused board

![Member-focused board screenshot](frontend/public/screenshots/member-focus.png)

### Family settings

![Family settings screenshot](frontend/public/screenshots/settings-page.png)

## Run it

```bash
cd frontend
npm install
npm run dev
```

## Production check

```bash
cd frontend
npm run build
npm run preview
```

## Display notes

- Target resolution: `2160 x 3840 px`
- Target orientation: portrait
- Target panel size: 27 inch, 16:9
- Reference square: `5 x 5 cm`, rendered from the panel geometry for on-device calibration
