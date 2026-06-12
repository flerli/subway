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

## Run it with Docker

```bash
docker compose up --build -d
```

Local access:

- App: `http://localhost:8081`
- API: `http://localhost:8081/api/family-members`

Useful commands:

```bash
docker compose logs -f
docker compose down
```

The Dockerized backend uses the same SQLite file as local non-Docker development:

- `backend/data/subway.sqlite`

On the VPS, the same compose file stores the database at:

- `/home/swaibian/apps/subway/backend/data/subway.sqlite`

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

## GitHub Actions deployment

The repository includes `.github/workflows/docker-build-deploy.yml`.

What it does:

- Builds and pushes backend and frontend images to GHCR
- Uploads `compose.yml`, `compose.vps.yml`, and a generated `deploy.env` file to the VPS
- Copies `backend/data/subway.sqlite` to the VPS on the first deploy only
- Verifies the configured public app port is free unless an existing subway deployment already owns it
- Pulls the tagged images on `client.scaico.com` as user `swaibian`
- Restarts the stack with `docker compose up -d --no-build --remove-orphans`

Required GitHub secret:

- `VPS_SSH_KEY`: private SSH key for `swaibian@client.scaico.com`

The VPS must already have Docker Engine with the Docker Compose v2 plugin installed.

The workflow currently binds subway to host port `8081` on the VPS because ports `80` and `443` are already occupied by the existing shared Nginx stack on `client.scaico.com`.

`compose.vps.yml` also joins the subway frontend to the existing Docker network `scaico-client_default` with the alias `subway-frontend`, so the shared Nginx stack can reverse-proxy it.

The workflow smoke-tests the app from inside the VPS with `curl http://127.0.0.1:8081/api/auth/session`, so deployment is not blocked by the server's current public ingress rules.

The intended public route is `https://client.scaico.com/subway/`, which requires a matching reverse-proxy route in the existing Nginx stack.

The backend readiness checks use `/api/auth/session`, which remains publicly readable even after the authenticated data endpoints are locked down.

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
