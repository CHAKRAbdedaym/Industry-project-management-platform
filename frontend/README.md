# frontend

Angular dashboard for the Industry Project Management Platform. Lets a user register/log in, manage projects, manage tasks within a project, and send/view notifications — all through the `api-gateway`.

## Stack

- Angular 18 (standalone components, functional guards/interceptors, `provideHttpClient`)
- Plain CSS (no UI framework) for a small, consistent design system (`src/styles.css`)

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

Runs unit tests (Jasmine/Karma, headless Chrome) covering `AuthService`'s token handling (login stores a valid JWT, expired tokens are treated as logged-out, logout clears the token) and the root `AppComponent`.

## Build

```
npm run build -- --configuration production
```

Outputs to `dist/frontend/browser`. In production the app calls a relative `/api` path (see `src/environments/environment.prod.ts`) — the Docker image serves the build via nginx, which proxies `/api/*` to the `api-gateway` container (see `nginx.conf`).

## Pages

| Route              | Description                                             |
|---------------------|----------------------------------------------------------|
| `/login`            | Log in, stores the JWT in `localStorage`                 |
| `/register`         | Create an account                                        |
| `/projects`         | List/create/delete your projects (auth required)         |
| `/projects/:id`     | Project detail: view info, list/create/update/delete its tasks (auth required) |
| `/notifications`    | View your notifications, send a demo notification to any email, mark as read (auth required) |
