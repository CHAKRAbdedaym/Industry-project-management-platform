# api-gateway

Single entry point for the Industry Project Management Platform's backend
microservices, built with Spring Cloud Gateway (reactive/WebFlux).

The gateway listens on port `8080` and routes incoming requests to the
appropriate backend service based on the request path:

| Path prefix              | Routed to             | Default upstream URL     |
|---------------------------|------------------------|---------------------------|
| `/api/auth/**`             | `auth-service`         | `http://localhost:8081`  |
| `/api/projects/**`         | `project-service`      | `http://localhost:8082`  |
| `/api/tasks/**`             | `task-service`         | `http://localhost:8083`  |
| `/api/notifications/**`    | `notification-service` | `http://localhost:8084`  |

The full path is forwarded as-is to the upstream service (no path
stripping). CORS is pre-configured to allow requests from
`http://localhost:4200`, the planned Angular frontend's dev server.

## Running locally

The gateway does not implement any business logic itself — it simply
proxies requests to the four backend services, so they must be reachable
for calls to succeed. By default the gateway looks for them on
`localhost` at their standard ports (8081-8084).

Start the gateway with Maven:

```bash
cd api-gateway
mvn spring-boot:run
```

If the backend services are running elsewhere (e.g. as Docker
containers), override their base URLs with environment variables:

```bash
AUTH_SERVICE_URL=http://auth-service:8081 \
PROJECT_SERVICE_URL=http://project-service:8082 \
TASK_SERVICE_URL=http://task-service:8083 \
NOTIFICATION_SERVICE_URL=http://notification-service:8084 \
mvn spring-boot:run
```

Or build and run the container image directly:

```bash
docker build -t api-gateway .
docker run -p 8080:8080 \
  -e AUTH_SERVICE_URL=http://auth-service:8081 \
  -e PROJECT_SERVICE_URL=http://project-service:8082 \
  -e TASK_SERVICE_URL=http://task-service:8083 \
  -e NOTIFICATION_SERVICE_URL=http://notification-service:8084 \
  api-gateway
```

## Health check

```bash
curl http://localhost:8080/actuator/health
```

## Example usage

With `auth-service`, `project-service`, `task-service`, and
`notification-service` all running, every request goes through the
gateway on `localhost:8080` instead of hitting each service's own port
directly:

```bash
# Register a new user (would otherwise be localhost:8081/api/auth/register)
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "changeme123"}'

# Log in and obtain a token (would otherwise be localhost:8081/api/auth/login)
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "changeme123"}'

# Create a project using the returned token
# (would otherwise be localhost:8082/api/projects)
curl -X POST http://localhost:8080/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name": "New Project", "description": "Example project"}'
```

## Tests

```bash
mvn test
```

The test suite verifies the gateway's own behavior (application
startup, the `/actuator/health` endpoint, and that the four expected
routes are configured) without requiring any of the backend services
to be running.
