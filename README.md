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

## GUI Exploration Guide

See the Epic 001 exploration guide for hands-on GUI tasks:

`project_management/epics/001_WIDGET_ARCHITECTURE/001_WIDGET_ARCHITECTURE__GUI_EXPLORATION_GUIDE.md`

## Run it

```bash
cd backend
npm start
```

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

## Production check

```bash
cd backend
npm start
```

In a second terminal:

```bash
cd frontend
npm run build
npm run preview
```

## Backend persistence

- Family members are now stored in the backend persistence layer, not browser `localStorage`.
- Widget metadata is also stored in the backend persistence layer.
- The backend uses a local SQLite database at `backend/data/subway.sqlite`.
- The frontend talks to the backend through `/api/family-members`.
- The frontend also loads widget metadata through `/api/widgets`.
- For local development, Vite proxies `/api` to `http://127.0.0.1:8787`.

## Display notes

- Target resolution: `2160 x 3840 px`
- Target orientation: portrait
- Target panel size: 27 inch, 16:9
- Reference square: `5 x 5 cm`, rendered from the panel geometry for on-device calibration
