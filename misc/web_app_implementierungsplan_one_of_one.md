# Implementation Plan: One-of-One Touch Web App on a VPS

## 1. Target Vision

The application is a **one-off, custom-built web app** for exactly one production use case. It is hosted centrally on a **VPS** and displayed in fullscreen mode in a browser. The web app itself contains the complete user interface, business-logic-adjacent interactions, form guidance, and a custom on-screen keyboard.

The focus is not on multi-tenant operation, device fleets, complex kiosk management, or app-store-style deployment. Instead, the solution should be stable, maintainable, and quick to implement.

## 2. Basic Assumptions

- There is exactly **one production installation**.
- The web app is served via a fixed domain, for example `https://app.example.com`.
- The display happens in a browser; therefore, the web app must be fully browser-compatible.
- Text input is handled via a **custom on-screen keyboard** inside the web app.
- The app should react in a controlled way to occasional connectivity problems.
- Updates should be deployed centrally via the VPS.
- The solution should remain simple enough to be maintained by one person or a small project team over the long term.

## 3. Non-Goals

The following items are intentionally not planned as core parts of the solution:

- Multi-tenant SaaS architecture
- Management of many kiosks or devices
- Electron app
- Native mobile app
- Complex role and permission system
- Offline-first synchronization with conflict resolution
- Custom client-side app updater
- Multi-tenant admin console

## 4. Recommended Tech Stack

### Option A: pragmatic and aligned with an existing stack

```text
Frontend:    Next.js or Vite + React
Backend:     Django + Django REST Framework
Database:    PostgreSQL
Deployment:  Docker Compose
Proxy/TLS:   Caddy
Hosting:     VPS
```

This option is especially useful if Django/Next.js experience or an existing codebase already exists.

### Option B: leaner, if the app is very frontend-heavy

```text
Frontend:    Vite + React
Backend:     FastAPI
Database:    PostgreSQL or SQLite for a very small amount of data
Deployment:  Docker Compose
Proxy/TLS:   Caddy
Hosting:     VPS
```

For a one-of-one solution, Option B is very convenient if the app requires little traditional backend administration.

### Recommendation

For this project, I would start with the following combination:

```text
Frontend:    Vite + React + TypeScript
Backend:     Django + Django REST Framework
Database:    PostgreSQL
Deployment:  Docker Compose
Proxy/TLS:   Caddy
```

Rationale:

- Vite + React is very lightweight for a pure touch interface.
- Django provides an admin interface, data models, authentication, and migrations out of the box.
- PostgreSQL is robust and remains unproblematic if the project grows later.
- Caddy greatly simplifies HTTPS.
- Docker Compose is fully sufficient for a one-of-one installation.

## 5. Web App System Architecture

```text
Browser
  │
  ▼
HTTPS Domain
  │
  ▼
Caddy Reverse Proxy
  ├── Frontend Container
  │     └── React App
  │
  ├── Backend Container
  │     └── Django REST API
  │
  └── PostgreSQL Container
        └── Persistent Data
```

### Responsibilities

| Component | Responsibility |
|---|---|
| React Frontend | Touch UI, navigation, forms, on-screen keyboard, API calls |
| Django Backend | Data models, persistence, authentication, validation, admin backend, API |
| PostgreSQL | Persistent storage |
| Caddy | HTTPS, reverse proxy, routing to frontend/API |
| Docker Compose | Starting, operating, and updating the containers |

## 6. Frontend Structure

### Basic Principle

The interface is not built like a normal desktop website, but like a **touch panel**:

- large controls
- no hover dependencies
- clear visual feedback on touch
- simple, unambiguous navigation
- large input fields
- custom on-screen keyboard
- clear error states
- few nested menus

### Proposed Project Structure

```text
frontend/
  src/
    app/
      App.tsx
      routes.tsx
    components/
      Button/
      Card/
      Dialog/
      FormField/
      StatusBanner/
      Keyboard/
      NumberPad/
      TouchLayout/
    features/
      dashboard/
      inputFlow/
      settings/
      status/
    hooks/
      useApi.ts
      useOnlineStatus.ts
      useKeyboard.ts
      useIdleReset.ts
    services/
      apiClient.ts
      healthService.ts
    styles/
      tokens.css
      global.css
    types/
      api.ts
      domain.ts
    main.tsx
```

## 7. Pages and Routes

For a one-of-one app, a few clear routes are sufficient.

```text
/                 Start/main view
/form             Input process
/review           Summary/confirmation
/success          Success state
/error            Error state
/status           Simple status/diagnostics view
/admin            Optional: protected admin area
```

If the app has only one main process, an internal state-machine flow can also be used, with almost all screens rendered inside a single route.

## 8. UI State and Process Flow

For a stable touch flow, an explicit state machine is useful.

Example:

```text
idle
  ↓
start
  ↓
input
  ↓
review
  ↓
submitting
  ↓
success
```

Error branches:

```text
submitting
  ↓
error
  ↓
retry or cancel
```

### Recommendation

For the MVP, React state or Zustand is sufficient.

```text
MVP:       React useState/useReducer
Solid:     Zustand
Complex:   XState
```

For a one-of-one solution, I would initially use **Zustand** or `useReducer`. XState is only worth it once the process has many special cases.

## 9. On-Screen Keyboard

The web app contains a custom keyboard component. Input fields are controlled React components. The browser/system keyboard is not required.

### Keyboard Types

```text
text      regular text input
number    number pad
email     email-optimized keyboard
search    search input
pin       PIN/code input
```

### Behavior

- When the user taps into a field, the appropriate keyboard overlay opens.
- The keyboard writes directly into React state.
- There are clear keys for `Delete`, `Space`, `Cancel`, and `OK`.
- Input fields can be `readOnly` so that no system keyboard appears.
- Validation is visible and immediately understandable.

### Example API for the Keyboard Component

```ts
export type KeyboardMode = "text" | "number" | "email" | "search" | "pin";

export interface KeyboardProps {
  mode: KeyboardMode;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}
```

## 10. Backend Structure

### Django Apps

```text
backend/
  config/
    settings.py
    urls.py
  core/
    models.py
    views.py
    serializers.py
  appdata/
    models.py
    views.py
    serializers.py
  status/
    views.py
  manage.py
```

### Recommended Backend Modules

| Module | Responsibility |
|---|---|
| `core` | shared base classes, health check, utilities |
| `appdata` | actual domain objects of the application |
| `status` | health and diagnostics endpoints |
| `admin` | Django Admin for maintenance |

## 11. API Design

### Minimal API Set for the MVP

```text
GET  /api/health
GET  /api/config
GET  /api/state
POST /api/submit
POST /api/events
```

### Example: Health Check

```json
{
  "status": "ok",
  "version": "0.1.0",
  "database": "ok"
}
```

### Example: App Configuration

```json
{
  "appTitle": "Touch App",
  "theme": "default",
  "inputModes": ["text", "number"],
  "idleResetSeconds": 120,
  "maintenanceMode": false
}
```

### Example: Submit Payload

```json
{
  "formId": "main-flow",
  "values": {
    "name": "John Doe",
    "note": "Example text"
  },
  "clientTimestamp": "2026-06-07T12:00:00Z"
}
```

## 12. Data Model

The concrete data model depends on the business logic. To start, I would provide a generic event and submission model.

### Submission

```text
Submission
  id
  created_at
  updated_at
  status
  payload_json
  result_json
  error_message
```

### ClientEvent

```text
ClientEvent
  id
  created_at
  event_type
  payload_json
```

### AppConfig

```text
AppConfig
  id
  key
  value_json
  updated_at
```

This keeps the solution flexible without defining too many domain models at the beginning.

## 13. Authentication

Because this is a one-of-one solution, authentication can remain lean.

### Public Touch Interface

The main interface can either:

- be reachable without login, but only expose a very limited function, or
- be protected via a long secret/cookie, or
- be protected from external access via Basic Auth.

### Admin Area

The admin area should be protected:

```text
/admin
  Django Admin Login
  strong password
  optional additional HTTP Basic Auth protection
```

### Recommendation for the MVP

```text
Touch UI:   Secret-protected route or server-side cookie
Admin:      Django Admin + strong password
HTTPS:      always enforce
```

## 14. Error and Offline Behavior

The web app should have visible states:

```text
online
connecting
offline
server_error
maintenance
submitting
submit_failed
```

### Frontend Behavior

- regularly check `/api/health`
- show a status banner when the connection is lost
- disable the submit button during connectivity problems or buffer locally
- offer a clear retry option on errors
- automatically return to the start state after extended inactivity

### Minimal Approach

```text
Every 10 seconds: GET /api/health
If error: show status banner
If OK again: remove banner
```

## 15. Styling and Design System

### Design Tokens

```css
:root {
  --font-size-base: 24px;
  --font-size-large: 36px;
  --space-sm: 12px;
  --space-md: 24px;
  --space-lg: 40px;
  --radius-md: 16px;
  --touch-target-min: 72px;
}
```

### Touch Rules

- Buttons at least 72 px high
- Primary actions clearly larger than secondary actions
- No small icon-only buttons without a label
- Error messages directly next to the field
- Dialogs with very clear choices
- sufficient spacing between dangerous actions

## 16. Deployment Structure

```text
project/
  docker-compose.yml
  Caddyfile
  .env.example
  frontend/
    Dockerfile
    package.json
    src/
  backend/
    Dockerfile
    requirements.txt
    manage.py
    config/
    core/
  scripts/
    deploy.sh
    backup.sh
    restore.sh
```

### Docker Compose

```yaml
services:
  caddy:
    image: caddy:2
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - frontend
      - backend

  frontend:
    build: ./frontend
    environment:
      - VITE_API_BASE_URL=/api

  backend:
    build: ./backend
    env_file:
      - .env
    depends_on:
      - db

  db:
    image: postgres:16
    environment:
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
  caddy_data:
  caddy_config:
```

### Caddyfile

```text
app.example.com {
  encode gzip

  handle_path /api/* {
    reverse_proxy backend:8000
  }

  handle {
    reverse_proxy frontend:3000
  }
}
```

## 17. Development Phases

## Phase 1: Project Foundation

Goal: repository, local setup, and deployment foundation are in place.

Tasks:

- Create repository
- Create frontend project
- Create backend project
- Make Docker Compose runnable locally
- Connect PostgreSQL
- Prepare Caddy locally or for staging
- Create `.env.example`
- Write a simple README

Definition of Done:

- `docker compose up` starts frontend, backend, and database.
- `/api/health` responds successfully.
- Frontend can reach backend.

## Phase 2: UI Skeleton

Goal: basic layout of the touch app is in place.

Tasks:

- Create main layout
- Build start screen
- Build status banner
- Build dialog component
- Define button system
- Create global styles and design tokens
- Implement first route `/`

Definition of Done:

- The app has a clear start view.
- Buttons and text are large enough for touch use.
- Layout works at the target resolution and aspect ratio.

## Phase 3: Input Flow

Goal: the central input process works in the frontend.

Tasks:

- Define form state
- Build input fields
- Add validation
- Build review screen
- Build success and error screens
- Implement idle reset

Definition of Done:

- User can complete the full input process.
- Invalid input is displayed in an understandable way.
- After success or inactivity, the app returns in a controlled way.

## Phase 4: Custom On-Screen Keyboard

Goal: text input works without a system keyboard.

Tasks:

- Build keyboard overlay
- Build text layout
- Build number pad
- Add email/special characters if needed
- Implement backspace, space, OK, and cancel
- Integrate with form fields
- Cleanly handle focus and blur behavior

Definition of Done:

- All required inputs can be fully entered through the web app.
- No external keyboard is required for normal operation.
- The keyboard does not cover critical content.

## Phase 5: Backend Domain Logic

Goal: data is processed and stored server-side.

Tasks:

- Create Submission model
- Build serializers and API endpoints
- Add server-side validation
- Define error cases
- Configure Django Admin
- Write API tests

Definition of Done:

- `POST /api/submit` stores valid input.
- Invalid input is rejected in a controlled way.
- Submissions are visible in the admin.

## Phase 6: Status, Health, and Robustness

Goal: the app behaves in a controlled way when problems occur.

Tasks:

- Extend `/api/health`
- Build frontend health polling
- Display online/offline state
- Add retry logic for submit
- Prepare maintenance mode
- Add frontend error boundary

Definition of Done:

- Server errors are visible and understandable.
- The app remains usable or enters a controlled error state.
- Work can continue after the connection is restored.

## Phase 7: Deployment to VPS

Goal: the web app runs close to production on the VPS.

Tasks:

- Prepare VPS
- Install Docker and Docker Compose
- Point domain to VPS
- Configure Caddy with HTTPS
- Set production `.env`
- Run database migrations
- Create superuser
- Set up backup script

Definition of Done:

- The app is reachable via HTTPS.
- Admin area works.
- Data persists after a container restart.
- Backup can be triggered manually.

## Phase 8: Polishing and Acceptance

Goal: the app is production-ready for the concrete use case.

Tasks:

- Finalize text content
- Fine-tune UI spacing and sizes
- Improve error messages
- Add loading states
- Run through real test data
- Define end-to-end test
- Check logging
- Clarify privacy policy/imprint requirements if publicly accessible

Definition of Done:

- The complete main process works reliably.
- Error cases are tested.
- Operation is understandable without explanation.
- Deployment and backup are documented.

## 18. Backlog by Priority

### Must-have

- Basic frontend layout
- central main function
- custom on-screen keyboard
- API for storage/processing
- health check
- HTTPS deployment
- admin access
- backup

### Should-have

- Status banner for server/network problems
- maintenance mode
- idle reset
- error boundary
- logging of important events
- simple configuration values from backend

### Could-have

- PWA caching
- visual themes
- export function
- admin dashboard
- advanced statistics
- audit log
- automated deployment pipeline

### Won't-have for MVP

- Multi-kiosk management
- multi-tenant user management
- native app
- Electron
- offline sync with conflict resolution

## 19. Test Plan

### Frontend

- Form validation
- Keyboard interaction
- Touch target sizes
- Error states
- Loading states
- Idle reset
- Responsiveness in the target aspect ratio

### Backend

- Health check
- Submit endpoint
- Validation
- Data persistence
- Admin visibility
- Error responses

### Integration

- Frontend can reach backend
- Submit works end-to-end
- Server errors are visible
- Restarting containers does not lose data
- HTTPS works

## 20. Operations Plan

### Updates

A simple update can look like this:

```bash
git pull
docker compose build
docker compose up -d
python manage.py migrate
```

In practice, the migration should be executed inside the backend container, for example:

```bash
docker compose exec backend python manage.py migrate
```

### Backup

At least daily or before every larger update:

```bash
docker compose exec db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup.sql
```

Better:

- backup script with date
- regular cron job
- copy outside the VPS
- occasionally perform a restore test

### Logging

For the start, this is sufficient:

```bash
docker compose logs -f
```

Later, optionally:

- structured JSON logs
- Sentry for frontend/backend errors
- simple admin view for ClientEvents

## 21. First Concrete Implementation Steps

1. Create repository.
2. Create `frontend/` with Vite + React + TypeScript.
3. Create `backend/` with Django + DRF.
4. Create `docker-compose.yml` with Caddy, frontend, backend, and PostgreSQL.
5. Implement `/api/health`.
6. Build frontend start page with status display.
7. Create touch-optimized button/layout system.
8. Build main form as a controlled React flow.
9. Integrate custom on-screen keyboard.
10. Implement `POST /api/submit`.
11. Enable Django Admin for Submissions.
12. Prepare VPS deployment.
13. Set up domain and HTTPS.
14. Run end-to-end test.
15. Document backup and update process.

## 22. Recommended MVP Boundary

The MVP is complete when the following works:

```text
A person can open the web app,
complete the main process entirely via touch,
enter text through the integrated on-screen keyboard,
submit the data,
and the submission is stored in the backend and visible in the admin.
```

Everything beyond that should only be added after the MVP is stable.
