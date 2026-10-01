# Industry Project Management Platform

A microservices platform for planning industrial projects and tracking their tasks on a Kanban board, with notifications when work is assigned or moved. Built as a monorepo.

## Architecture

```
Browser ──► frontend (Angular, nginx) ──/api──► api-gateway (Spring Cloud Gateway)
                                                  ├─► auth-service          users, login, JWT issuing
                                                  ├─► project-service       projects
                                                  ├─► task-service ──────►  notification-service
                                                  └─► notification-service  notifications
                                     each service ──► its own PostgreSQL database
```

- Every backend service is an independent Spring Boot 3.3 / Java 21 app with its own database and Flyway migrations.
- Authentication is stateless: auth-service signs a JWT, the other services validate it with the shared secret. Missing or expired tokens get `401`.
- task-service notifies the assignee when a task is assigned and the creator when an assignee moves it. Delivery happens after the transaction commits and is best-effort, so a notification outage never fails a task change.

## Services

| Service | Port | Description |
|---------|------|-------------|
| [`frontend`](./frontend) | 4200 | Angular 18 app: dashboard, projects, Kanban board, my tasks, notifications |
| [`api-gateway`](./api-gateway) | 8080 | Single entry point routing `/api/*` to the services |
| [`auth-service`](./auth-service) | 8081 | Registration, login, JWT issuing, current user profile |
| [`project-service`](./project-service) | 8082 | Project CRUD, scoped to the owner |
| [`task-service`](./task-service) | 8083 | Tasks per project; creators edit, assignees move status |
| [`notification-service`](./notification-service) | 8084 | Per-user notifications, read/unread |

## Run the whole platform

```
docker compose up -d --build
```

Then open **http://localhost:4200**, create an account and you're in. Backend services take about a minute to start on first boot.

Deployment manifests live in [`kubernetes/`](./kubernetes) and infrastructure in [`Terraform/`](./Terraform).

## Tests

- Backend: `mvn test` in any service directory (integration tests use Testcontainers, so Docker must be running).
- Frontend: `npm test` in `frontend/`.
