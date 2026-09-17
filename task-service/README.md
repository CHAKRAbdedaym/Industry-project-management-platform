# task-service

Task management service for the Industry Project Management Platform. Handles creating, listing, updating, and deleting tasks. It does **not** issue JWTs itself — it only validates tokens issued by `auth-service`'s `/api/auth/login`, and it has no `User` entity or table of its own.

## Stack

- Java 21, Spring Boot 3.3 (Web, Security, Data JPA, Validation)
- PostgreSQL, schema managed by Flyway migrations
- JWT (HS256) via `io.jsonwebtoken`, validated with the same signing secret as `auth-service`

## Running locally

1. Start Postgres (add a `task-service` Postgres service to your local Postgres setup, mapped to host port `5435`, or run one directly):
   ```
   docker run -d --name task-service-db -p 5435:5432 \
     -e POSTGRES_DB=task_service -e POSTGRES_USER=task_service -e POSTGRES_PASSWORD=task_service \
     postgres:16-alpine
   ```
2. Run the service:
   ```
   cd task-service
   mvn spring-boot:run
   ```
   The service listens on `http://localhost:8083`.

Configuration is environment-driven (see `src/main/resources/application.yml`):

| Variable      | Default                                            | Purpose                                                                                   |
|---------------|-----------------------------------------------------|--------------------------------------------------------------------------------------------|
| `DB_URL`      | `jdbc:postgresql://localhost:5435/task_service`      | Postgres JDBC URL (5435 avoids clashing with auth-service's Postgres on 5433 and a local install on 5432) |
| `DB_USERNAME` | `task_service`                                       | Postgres user                                                                               |
| `DB_PASSWORD` | `task_service`                                       | Postgres password                                                                           |
| `JWT_SECRET`  | dev-only default, **must match auth-service's**, override together in real deployments | HMAC key used to verify JWTs issued by auth-service |

## Tests

```
mvn test
```

Runs unit tests (Mockito) and an integration test that boots a real Postgres via Testcontainers (requires Docker) and exercises the full task CRUD flow through MockMvc, minting its own JWTs with the same dev secret since there is no login endpoint here.

## API

All endpoints require a valid `Authorization: Bearer <token>` header — get a token from `auth-service`'s `POST /api/auth/login`. Requests without one receive `403 Forbidden`.

| Method | Path              | Auth         | Description                                              |
|--------|-------------------|--------------|------------------------------------------------------------|
| POST   | `/api/tasks`      | Bearer token | Create a task; the caller becomes its creator               |
| GET    | `/api/tasks`      | Bearer token | List tasks visible to the caller (creator or assignee), optional `?projectId=` filter |
| GET    | `/api/tasks/{id}` | Bearer token | Get one task, if visible to the caller                      |
| PUT    | `/api/tasks/{id}` | Bearer token | Update a task (creator only)                                 |
| DELETE | `/api/tasks/{id}` | Bearer token | Delete a task (creator only)                                  |

A task not found, or found but not visible/owned by the caller, returns `404` in both cases (never `403`) so existence is not leaked.

`projectId` is just a UUID handed to this service by whoever calls it — it is expected to be a real project ID from `project-service`, but this MVP does not validate it against that service (each service owns its own database, so there is no cross-service foreign key).

### Example

```
curl -X POST http://localhost:8083/api/tasks \
  -H "Authorization: Bearer <accessToken from auth-service login>" \
  -H "Content-Type: application/json" \
  -d '{"projectId":"11111111-1111-1111-1111-111111111111","title":"Write tests","description":"Cover the service","assigneeEmail":"bob@example.com"}'

curl http://localhost:8083/api/tasks \
  -H "Authorization: Bearer <accessToken from auth-service login>"

curl "http://localhost:8083/api/tasks?projectId=11111111-1111-1111-1111-111111111111" \
  -H "Authorization: Bearer <accessToken from auth-service login>"

curl http://localhost:8083/api/tasks/<taskId> \
  -H "Authorization: Bearer <accessToken from auth-service login>"

curl -X PUT http://localhost:8083/api/tasks/<taskId> \
  -H "Authorization: Bearer <accessToken from auth-service login>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Write more tests","description":"Cover the controller too","status":"IN_PROGRESS","assigneeEmail":"bob@example.com"}'

curl -X DELETE http://localhost:8083/api/tasks/<taskId> \
  -H "Authorization: Bearer <accessToken from auth-service login>"
```
