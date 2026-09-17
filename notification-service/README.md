# notification-service

Notification service for the Industry Project Management Platform. Lets any
authenticated caller create a notification for a recipient and lets a
recipient list and mark their own notifications as read.

This service does **not** issue JWTs — it only validates tokens issued by
`auth-service`. There is no login/register endpoint and no `User` entity
here; every request must carry a Bearer token obtained from `auth-service`'s
`/api/auth/login`.

## Stack

- Java 21, Spring Boot 3.3 (Web, Security, Data JPA, Validation)
- PostgreSQL, schema managed by Flyway migrations
- JWT (HS256) via `io.jsonwebtoken`, verified with the same shared secret as `auth-service`

## Running locally

1. Start a local Postgres on port 5436 (matching the default `DB_URL` below), for example:
   ```
   docker run --name notification-service-postgres -p 5436:5432 \
     -e POSTGRES_DB=notification_service \
     -e POSTGRES_USER=notification_service \
     -e POSTGRES_PASSWORD=notification_service \
     -d postgres:16-alpine
   ```
2. Run the service:
   ```
   cd notification-service
   mvn spring-boot:run
   ```
   The service listens on `http://localhost:8084`.

Configuration is environment-driven (see `src/main/resources/application.yml`):

| Variable     | Default                                                     | Purpose                                                     |
|--------------|--------------------------------------------------------------|--------------------------------------------------------------|
| `DB_URL`     | `jdbc:postgresql://localhost:5436/notification_service`      | Postgres JDBC URL                                             |
| `DB_USERNAME`| `notification_service`                                        | Postgres user                                                 |
| `DB_PASSWORD`| `notification_service`                                        | Postgres password                                              |
| `JWT_SECRET` | dev-only default, **must match `auth-service`'s `JWT_SECRET`** | HMAC key used to verify tokens issued by `auth-service`        |

## Tests

```
mvn test
```

Runs unit tests (Mockito) and an integration test that boots a real Postgres
via Testcontainers (requires Docker). Since this service has no login
endpoint of its own, the integration test mints JWTs directly with the same
dev secret as `application.yml`'s default to simulate tokens issued by
`auth-service`.

## API

All endpoints require `Authorization: Bearer <token>`, where the token comes
from `auth-service`'s `POST /api/auth/login`. A request with no token (or an
invalid one) gets `403 Forbidden`. Note: in this MVP, any authenticated user
may create a notification for any recipient email — there's no per-service
auth-to-auth trust yet, so this is intentionally open to make it easy to
demo from the frontend or curl.

| Method | Path                          | Auth         | Description                                              |
|--------|-------------------------------|--------------|------------------------------------------------------------|
| POST   | `/api/notifications`          | Bearer token | Create a notification for a recipient email                |
| GET    | `/api/notifications/me`       | Bearer token | List the caller's own notifications, newest first           |
| PATCH  | `/api/notifications/{id}/read`| Bearer token | Mark one of the caller's own notifications as read (404 if it doesn't exist or isn't theirs) |

### Example

```
# Get a token from auth-service first
TOKEN=$(curl -s -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com","password":"password123"}' | jq -r .accessToken)

curl -X POST http://localhost:8084/api/notifications \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"recipientEmail":"bob@example.com","message":"You have a new task"}'

curl http://localhost:8084/api/notifications/me \
  -H "Authorization: Bearer $TOKEN"

curl -X PATCH http://localhost:8084/api/notifications/<id>/read \
  -H "Authorization: Bearer $TOKEN"
```
