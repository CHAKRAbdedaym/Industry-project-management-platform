# project-service

Project management service for the Industry Project Management Platform. Handles creating, listing, updating, and deleting projects owned by the authenticated caller.

This service does not issue JWTs itself — it only validates tokens issued by `auth-service`. There is no login/register endpoint here and no `User` entity; the caller's identity is the `email` subject claim of the Bearer token.

## Stack

- Java 21, Spring Boot 3.3 (Web, Security, Data JPA, Validation)
- PostgreSQL, schema managed by Flyway migrations
- JWT (HS256) validation via `io.jsonwebtoken`

## Running locally

1. Start a local Postgres on port 5434 (matching the default `DB_URL` below), for example:
   ```
   docker run --name project-service-postgres -e POSTGRES_DB=project_service \
     -e POSTGRES_USER=project_service -e POSTGRES_PASSWORD=project_service \
     -p 5434:5432 -d postgres:16-alpine
   ```
2. Run the service:
   ```
   cd project-service
   mvn spring-boot:run
   ```
   The service listens on `http://localhost:8082`.

Configuration is environment-driven (see `src/main/resources/application.yml`):

| Variable    | Default                                                | Purpose                                                                                    |
|-------------|---------------------------------------------------------|---------------------------------------------------------------------------------------------|
| `DB_URL`    | `jdbc:postgresql://localhost:5434/project_service`       | Postgres JDBC URL (5434 is used locally to avoid clashing with auth-service's Postgres on 5433) |
| `DB_USERNAME` | `project_service`                                      | Postgres user                                                                                |
| `DB_PASSWORD` | `project_service`                                      | Postgres password                                                                            |
| `JWT_SECRET`  | dev-only default, **must match auth-service in real deployments** | HMAC key used to verify tokens issued by auth-service                                       |

## Tests

```
mvn test
```

Runs unit tests (Mockito) and an integration test that boots a real Postgres via Testcontainers (requires Docker) and exercises the full create → list → get → update → delete flow through MockMvc, including cross-user isolation and missing-auth checks.

## API

All endpoints require a valid Bearer token. Tokens must be obtained from `auth-service`'s `POST /api/auth/login` — this service only verifies them.

| Method | Path                | Auth         | Description                                    |
|--------|----------------------|--------------|-------------------------------------------------|
| POST   | `/api/projects`      | Bearer token | Create a new project owned by the caller        |
| GET    | `/api/projects`      | Bearer token | List projects owned by the caller               |
| GET    | `/api/projects/{id}` | Bearer token | Get one of the caller's projects                |
| PUT    | `/api/projects/{id}` | Bearer token | Update one of the caller's projects             |
| DELETE | `/api/projects/{id}` | Bearer token | Delete one of the caller's projects             |

A request for a project that doesn't exist, or that exists but is owned by someone else, returns `404` in both cases (so as not to leak whether a given project id exists to a non-owner). A request without an `Authorization` header returns `403`.

### Example

```
TOKEN=$(curl -s -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com","password":"password123"}' | jq -r .accessToken)

curl -X POST http://localhost:8082/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Apollo","description":"Launch project"}'

curl http://localhost:8082/api/projects \
  -H "Authorization: Bearer $TOKEN"

curl http://localhost:8082/api/projects/<id> \
  -H "Authorization: Bearer $TOKEN"

curl -X PUT http://localhost:8082/api/projects/<id> \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Apollo v2","description":"Updated description","status":"COMPLETED"}'

curl -X DELETE http://localhost:8082/api/projects/<id> \
  -H "Authorization: Bearer $TOKEN"
```
