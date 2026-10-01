# frontend

Angular dashboard for the Industry Project Management Platform. Lets a user register/log in, manage projects, manage tasks within a project, and send/view notifications — all through the `api-gateway`.

## Stack

- Angular 18 (standalone components, functional guards/interceptors, `provideHttpClient`)
- Signals for component state, `OnPush` change detection, lazy-loaded routes
- `@angular/cdk` drag-and-drop for the Kanban board
- Plain CSS design system (`src/styles.css`) with design tokens and light/dark themes — no UI framework

## Running locally

```
npm install
npm start
```

Serves on `http://localhost:4200`. By default the app calls the API at `http://localhost:8080/api` (the `api-gateway`) — see `src/environments/environment.ts`. Make sure `auth-service`, `project-service`, `task-service`, `notification-service`, and `api-gateway` are all running (see the root `docker-compose.yml`).

## Tests

```
npm test
```

Runs unit tests (Jasmine/Karma, headless Chrome) covering `AuthService` token handling, the auth interceptor (bearer token attached, no token on login, session ended on 401), the relative-time pipe and the root `AppComponent`.

## Build

```
npm run build -- --configuration production
```

Outputs to `dist/frontend/browser`. In production the app calls a relative `/api` path (see `src/environments/environment.prod.ts`) — the Docker image serves the build via nginx, which proxies `/api/*` to the `api-gateway` container (see `nginx.conf`).

## Pages

| Route              | Description |
|--------------------|-------------|
| `/login`, `/register` | Split-screen auth with inline validation; registering signs you straight in |
| `/dashboard`       | Key figures, task status breakdown, project progress, tasks assigned to you, recent activity |
| `/projects`        | Project cards with live progress; search, status filter, sorting, quick actions (edit, complete, archive, delete) |
| `/projects/:id`    | Kanban board — drag tasks between To do / In progress / Done, filter, add/edit tasks in a dialog |
| `/my-tasks`        | Tasks assigned to you or created by you across all projects, with inline status change |
| `/notifications`   | Notifications with unread filter, mark all as read, and sending a message to a teammate |

All app routes require a valid token. A `401` from any service ends the session and returns you to the page you were on after signing in again.

## Structure

```
src/app/
  core/      services (auth, projects, tasks, notifications, toast, confirm, theme), guards, interceptor, models
  shared/    reusable UI: modal, icon, avatar, toasts, confirm dialog, project/task form dialogs, time-ago pipe
  layout/    authenticated app shell (sidebar, user menu, unread badge)
  pages/     one folder per route
```
