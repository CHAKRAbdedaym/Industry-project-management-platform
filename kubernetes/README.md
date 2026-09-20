# Kubernetes deployment — Industry Project Management Platform

Manifests to run the whole platform on AWS EKS (cluster `virtualtechbox-cluster`, region `ap-south-1`, 3 worker nodes). Everything here mirrors the existing `docker-compose.yml` architecture 1:1 — same ports, same env var names, same service topology — just translated from Docker networking to Kubernetes networking.

## Architecture

```
Internet
   │
   ├── frontend Service (LoadBalancer, :80) ──► frontend Pod (nginx :80)
   │                                                  │
   │                                    proxy_pass /api/* to
   │                                    http://api-gateway:8080/api/
   │                                                  ▼
   └── api-gateway Service (LoadBalancer, :8080) ──► api-gateway Pod (:8080)
                                                          │
                              ┌───────────────┬───────────┼───────────────┐
                              ▼               ▼           ▼               ▼
                     auth-service:8081  project-service:8082  task-service:8083  notification-service:8084
                     (ClusterIP)        (ClusterIP)           (ClusterIP)         (ClusterIP)
                              │               │           │               │
                              └───────────────┴───────────┴───────────────┘
                                                  ▼
                                        postgres Service :5432 (ClusterIP)
                                                  ▼
                                        postgres Pod + PVC (2Gi)
```

The frontend never calls `api-gateway` directly from the browser — its own nginx (running server-side, inside the frontend pod) proxies `/api/*` to the `api-gateway` Service. That's exactly what `frontend/nginx.conf` already does for docker-compose, so it needed **zero changes** for Kubernetes (see "Application code changes" below).

## Namespace

Every resource lives in `industry-platform` (`00-namespace.yaml`). `kubectl apply -f .` creates it automatically.

**Naming note:** this file is `00-namespace.yaml`, not `namespace.yaml` as in the requested layout. `kubectl apply -f <directory>` applies files in strict alphabetical order with no special handling for `Namespace` objects — on a completely empty cluster, plain `namespace.yaml` would sort *after* `api-gateway.yaml`, `auth-service.yaml`, `configmap.yaml`, and `frontend.yaml`, and those would fail with "namespace not found" on the very first apply. The `00-` prefix is the standard fix and guarantees the namespace is always created first in a single `kubectl apply -f .` run. Every other file keeps its requested name — a Deployment referencing a ConfigMap/Secret key that doesn't exist yet is accepted by the API server regardless of file order (that's only resolved when the kubelet actually starts the container), so those pods just retry for a few seconds until `01`-tier objects created later in the same command land; that's self-healing and doesn't need a rename.

## Files

| File | Contents |
|---|---|
| `00-namespace.yaml` | `industry-platform` Namespace (see naming note above) |
| `configmap.yaml` | Non-sensitive config: DB URLs, gateway routing URLs, JWT expiry |
| `secret.yaml` | JWT signing key, Postgres superuser creds, per-service DB creds (dev defaults — see warnings in the file) |
| `postgres.yaml` | Postgres PVC, init-script ConfigMap, Deployment, ClusterIP Service |
| `auth-service.yaml` | Deployment + ClusterIP Service |
| `project-service.yaml` | Deployment + ClusterIP Service |
| `task-service.yaml` | Deployment + ClusterIP Service |
| `notification-service.yaml` | Deployment + ClusterIP Service |
| `api-gateway.yaml` | Deployment + **LoadBalancer** Service |
| `frontend.yaml` | Deployment + **LoadBalancer** Service |

## Ports (read from the actual source, not invented)

| Service | Container port | Source |
|---|---|---|
| auth-service | 8081 | `auth-service/src/main/resources/application.yml` (`server.port`), `Dockerfile` `EXPOSE` |
| project-service | 8082 | same |
| task-service | 8083 | same |
| notification-service | 8084 | same |
| api-gateway | 8080 | same |
| frontend (nginx) | 80 | `frontend/Dockerfile` `EXPOSE 80`, `frontend/nginx.conf` `listen 80` |
| postgres | 5432 | `docker-compose.yml` |

## Internal service DNS (Kubernetes-native, replacing Docker Compose networking)

Same short names as `docker-compose.yml` used — this is what let almost everything carry over unchanged:

- `postgres:5432` — used by all 4 Java services' `DB_URL`
- `auth-service:8081`, `project-service:8082`, `task-service:8083`, `notification-service:8084` — used by `api-gateway`'s routing env vars
- `api-gateway:8080` — used by `frontend`'s nginx `proxy_pass` (baked into the image, see below)

All names resolve because every resource is in the same `industry-platform` namespace (short names resolve within a namespace; from another namespace you'd need `api-gateway.industry-platform.svc.cluster.local`).

## Docker images

```
abdedaym/auth-service:latest
abdedaym/project-service:latest
abdedaym/task-service:latest
abdedaym/notification-service:latest
abdedaym/api-gateway:latest
abdedaym/frontend:latest
```

All public, so no `imagePullSecrets`. `imagePullPolicy: Always` on every one of these (Jenkins re-pushes `latest` every run) — `postgres:16-alpine` uses the default policy since it's a pinned upstream tag, not something Jenkins rebuilds.

## Database

- Single Postgres 16 instance (`postgres.yaml`), one Deployment (not a StatefulSet — a single demo/portfolio instance doesn't need stable-identity scaling), `strategy: Recreate` so a rolling update never tries to double-mount the `ReadWriteOnce` PVC.
- `postgres-pvc`: 2Gi, `ReadWriteOnce`, no `storageClassName` set — uses the cluster's default StorageClass. EKS needs the `aws-ebs-csi-driver` add-on for a default StorageClass to exist; check with `kubectl get storageclass`.
- `postgres-init-scripts` ConfigMap mounted at `/docker-entrypoint-initdb.d/` reproduces `db/init-multi-db.sql` exactly — creates the `auth_service`, `project_service`, `task_service`, `notification_service` databases/users on first boot only (same semantics as the compose bind-mount).
- Each of the 4 Java services connects to its **own** database with its own user (never shares another service's DB), matching current local dev.

## Configuration: ConfigMap vs Secret

- **ConfigMap** (`industry-platform-config`): DB URLs (hostname/port/db name — not credentials), gateway routing URLs, JWT expiry minutes. None of this is sensitive.
- **Secret** (`industry-platform-secrets`): `JWT_SECRET` (shared by all 4 services — auth-service signs, the other 3 verify with the same key), Postgres superuser creds, and each service's DB username/password.
- Every value in `secret.yaml` is the exact dev/demo default already committed in this repo's `application.yml` files and `db/init-multi-db.sql` — no new exposure, just relocated into a Secret object. **Read the warning comment at the top of `secret.yaml` before using this anywhere real**: replace `JWT_SECRET` and every DB password, and prefer a real secrets manager (AWS Secrets Manager / External Secrets Operator) over a plain Secret manifest once these stop being dev defaults.

## Health checks

- `api-gateway` has `spring-boot-starter-actuator` with `management.endpoints.web.exposure.include: health` (confirmed in its `pom.xml`/`application.yml`) — it gets a real `httpGet /actuator/health` liveness+readiness probe.
- `auth-service`, `project-service`, `task-service`, `notification-service` have **no** Actuator dependency — inventing an HTTP health endpoint for them would be wrong, so they get a `tcpSocket` probe on their app port instead. Spring only binds that port once Flyway migrations and the full application context are up, so it's a reliable readiness signal.
- `postgres` reuses the same `pg_isready` check already used in `docker-compose.yml`'s healthcheck, as an `exec` probe.
- `frontend` (nginx) gets a simple `httpGet /` probe.

## Startup ordering (replacing `depends_on: condition: service_healthy`)

Each of the 4 Java services' Deployment has an `initContainers` entry that loops `pg_isready -h postgres -p 5432` until Postgres is actually accepting connections, before the main container starts. This avoids the Kubernetes equivalent of a Docker Compose race: without it, pods would still eventually succeed (Kubernetes restarts crashed pods automatically), but they'd crash-loop uselessly every ~45–60s while Postgres finishes starting. `api-gateway` has no such initContainer — it has no database, and Spring Cloud Gateway doesn't fail to start just because a routed-to backend isn't up yet.

## External access

- **`frontend` → LoadBalancer, port 80.** This is what you open in a browser. It's also the only thing that *has* to be public for a normal user.
- **`api-gateway` → LoadBalancer, port 8080.** Exposed as a secondary, optional public entry point for direct API testing (Postman/curl/mobile clients), per your request. The frontend does **not** use this externally — its nginx reaches the same backend internally via the ClusterIP-resolvable ` api-gateway` Service, not this LoadBalancer.
- `auth-service`, `project-service`, `task-service`, `notification-service`, `postgres` → **ClusterIP only**, never reachable from outside the cluster.

On EKS, a plain `type: LoadBalancer` Service provisions a Classic Elastic Load Balancer via the in-tree cloud provider — no extra annotations needed for this to work out of the box. If you've separately installed the AWS Load Balancer Controller and want an NLB instead, that's an optional annotation you can add later; nothing here requires it.

## Application code changes

**None.** Specifically checked and not required:

- `frontend`'s production build (`environment.prod.ts`) already calls a **relative** `/api` path, not `localhost` — the browser never needs to know the gateway's address.
- `frontend/nginx.conf` already reverse-proxies `/api/` to `http://api-gateway:8080/api/` server-side (inside the pod, not in browser JS). Naming the Kubernetes Service `api-gateway` on port `8080` (see the port-consistency note below) makes this resolve correctly via cluster DNS with the file completely unchanged.
- All inter-service URLs (`api-gateway`'s `AUTH_SERVICE_URL` etc., every service's `DB_URL`) were already environment-variable-driven with `localhost` only as a *local dev fallback default* — the real values are injected via ConfigMap/Secret here, exactly like docker-compose already did with its own environment values.

One thing worth flagging, not a code change: `api-gateway`'s CORS config (`application.yml`) only allows origin `http://localhost:4200`. This does **not** affect the deployed app, because the browser only ever talks to the `frontend` origin — the gateway call is a same-origin relative `/api` request that nginx proxies server-side (CORS is a browser-enforced restriction on cross-origin `fetch`/`XHR`, and this isn't one). It would only matter if you wanted a browser-based tool hosted on some *other* origin to call the `api-gateway` LoadBalancer directly — Postman/curl are unaffected by CORS either way.

## Resource requests/limits (conservative, for a 3-node demo cluster)

| Workload | requests | limits |
|---|---|---|
| auth/project/task/notification-service (each) | 150m CPU / 320Mi | 500m CPU / 512Mi |
| api-gateway | 150m CPU / 320Mi | 500m CPU / 512Mi |
| postgres | 100m CPU / 256Mi | 500m CPU / 512Mi |
| frontend | 50m CPU / 64Mi | 200m CPU / 128Mi |

Total at `requests`: ~900m CPU, ~1.9Gi memory — comfortably fits 3 small worker nodes alongside `kube-system` pods.

## How Jenkins deploys this

Add a stage (or reuse one you already have) that runs, after the images are built and pushed:

```groovy
stage('Deploy to Kubernetes') {
    steps {
        dir('kubernetes') {
            sh 'kubectl apply -f .'
        }
    }
}
```

No manual steps required first — the namespace, secrets, and config are all created by these same manifests. Because every Deployment uses `imagePullPolicy: Always` on the `latest` tag, re-running `kubectl apply -f .` after a new Jenkins build won't actually roll pods unless you also bump something in the manifest (`kubectl apply` sees an identical Deployment spec as a no-op). Add a rollout restart step if you want every pipeline run to force a redeploy of the new `latest` image:

```groovy
sh 'kubectl rollout restart deployment -n industry-platform auth-service project-service task-service notification-service api-gateway frontend'
```

## Deploy manually

```bash
# Point kubectl at your EKS cluster first:
aws eks update-kubeconfig --region ap-south-1 --name virtualtechbox-cluster

cd kubernetes
kubectl apply -f .

# Watch everything come up
kubectl get pods -n industry-platform -w
```

## Useful commands

```bash
kubectl get all -n industry-platform
kubectl get pods -n industry-platform
kubectl get svc -n industry-platform
kubectl get deployments -n industry-platform
kubectl get pvc -n industry-platform

# Logs / debugging a specific pod
kubectl logs -n industry-platform deployment/auth-service
kubectl logs -n industry-platform deployment/auth-service -c wait-for-postgres   # initContainer logs
kubectl describe pod -n industry-platform <pod-name>

# Shell into a pod
kubectl exec -it -n industry-platform deployment/auth-service -- sh

# Get the public URLs once LoadBalancers are provisioned (can take a couple of minutes on EKS)
kubectl get svc -n industry-platform frontend -o wide
kubectl get svc -n industry-platform api-gateway -o wide
# EXTERNAL-IP column is a hostname on AWS (ELB DNS name), not a bare IP.

# Force a fresh rollout after pushing a new `latest` image
kubectl rollout restart deployment -n industry-platform auth-service
kubectl rollout status deployment -n industry-platform auth-service
```

## Assumptions

- EKS cluster already has a default StorageClass (via the `aws-ebs-csi-driver` add-on) for the Postgres PVC to bind.
- No AWS Load Balancer Controller assumed — plain `type: LoadBalancer` Services, which work with EKS's in-tree provider out of the box.
- Single-instance Postgres is acceptable for this demo/portfolio deployment (no HA/replication) — matches the existing docker-compose setup exactly.
- `replicas: 1` everywhere, per your instructions, since this is a demo/portfolio environment, not a production HA setup.
# test1