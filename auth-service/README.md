# auth-service

Authentication and user management service for the Industry Project Management Platform. Handles user registration, login, and JWT issuance for the other services.

## Stack

- Java 21, Spring Boot 3.3 (Web, Security, Data JPA, Validation)
- PostgreSQL, schema managed by Flyway migrations
- JWT (HS256) via `io.jsonwebtoken`

## Running locally

1. Start Postgres:
   ```
   docker compose up -d postgres
   ```
2. Run the service:
   ```
   cd auth-service
   mvn spring-boot:run
   ```
   The service listens on `http://localhost:8081`.

Configuration is environment-driven (see `src/main/resources/application.yml`):

| Variable                | Default                                          | Purpose                         |
|--------------------------|---------------------------------------------------|----------------------------------|
| `DB_URL`                | `jdbc:postgresql://localhost:5433/auth_service`    | Postgres JDBC URL (5433 is the host port mapped in docker-compose.yml, to avoid clashing with a locally-installed Postgres on 5432) |
| `DB_USERNAME`            | `auth_service`                                     | Postgres user                    |
| `DB_PASSWORD`            | `auth_service`                                     | Postgres password                |
| `JWT_SECRET`             | dev-only default, **override in real deployments** | HMAC signing key for JWTs         |
| `JWT_EXPIRATION_MINUTES` | `60`                                                | Access token lifetime in minutes |

## Tests

```
mvn test
```

Runs unit tests (Mockito) and an integration test that boots a real Postgres via Testcontainers (requires Docker) and exercises the full register → login → `/me` flow through MockMvc.

## API

| Method | Path                | Auth           | Description                          |
|--------|----------------------|----------------|---------------------------------------|
| POST   | `/api/auth/register` | none           | Create a new user account             |
| POST   | `/api/auth/login`    | none           | Authenticate and receive a JWT        |
| GET    | `/api/auth/me`       | Bearer token   | Return the authenticated user's info  |

### Example

```
curl -X POST http://localhost:8081/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com","password":"password123","fullName":"Jane Doe"}'

curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com","password":"password123"}'

curl http://localhost:8081/api/auth/me \
  -H "Authorization: Bearer <accessToken from login>"
```
