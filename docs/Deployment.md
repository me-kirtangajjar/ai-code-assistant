# Production Deployment Guide

## 1. Deployment Model

Version 1 deploys one Next.js container, one Express container, and one MongoDB container with Docker
Compose. The Express container uses the host Docker daemon to create short-lived, locked-down Python
containers. This preserves the existing runner boundary; it is not a microservice.

```text
Internet/TLS reverse proxy
          │
          ▼
Next.js :3000 ── private Compose network ──► Express :4000 ──► MongoDB :27017
                                                    │
                                                    └── Docker socket ──► isolated Python container
```

Only the frontend port is intended for public exposure. The backend port is bound to host loopback
for diagnostics, and MongoDB has no published host port. Production TLS should terminate at a
DigitalOcean load balancer or a separately managed reverse proxy.

## 2. Host Requirements

- A Linux host or DigitalOcean Droplet with Docker Engine and Docker Compose v2.
- At least 2 CPU cores, 4 GB RAM, and sufficient persistent storage for MongoDB.
- A non-root deployment account that can run Docker.
- Git for source checkout.
- A DNS name and TLS termination before serving real users.

The backend container controls the Docker daemon through `/var/run/docker.sock`. Anyone who can alter
that container or its configuration effectively has Docker-host privileges. Restrict SSH and
deployment access, do not expose the Docker API over TCP, and never mount the socket into student-code
containers.

## 3. One-Time Host Preparation

Clone the repository, then create the dedicated workspace used only for ephemeral source files:

```bash
sudo install -d -o 10001 -g 10001 -m 700 /opt/ai-code-error-feedback/runner-workspaces
cp docker/.env.production.example docker/.env.production
```

Set `RUNNER_WORKSPACE_DIR` to that same absolute path. Docker must be able to mount the path. On Docker
Desktop, add it to file sharing. Set `DOCKER_GID` to the numeric group owning the daemon socket:

```bash
stat -c '%g' /var/run/docker.sock
```

Replace every `change-me` value in `docker/.env.production`. Use a URL-safe random MongoDB password
because Compose constructs a MongoDB URI from it. Generate the JWT secret independently, with at
least 32 random bytes. Keep this untracked file readable only by the deployment account:

```bash
chmod 600 docker/.env.production
```

`AI_PROVIDER=mock` is safe for deployment verification and requires no AI credential. If Gemini is
selected later, set `AI_PROVIDER=gemini` and provide `GEMINI_API_KEY` only in the untracked production
environment file.

## 4. Configuration Validation

Validate interpolation and Compose structure before building:

```bash
docker compose \
  --env-file docker/.env.production \
  --file docker/docker-compose.yml \
  config --quiet
```

The deployment has three startup gates:

1. Compose waits for authenticated MongoDB health.
2. The backend entrypoint requires a writable runner workspace, a reachable Docker daemon, and the
   configured Python runner image.
3. The backend validates all environment variables and connects to MongoDB before Express listens.

The frontend starts only after the backend health check confirms both HTTP availability and a
connected database.

## 5. Build and Start

Build all three application images, including the image used for isolated code execution:

```bash
docker compose \
  --env-file docker/.env.production \
  --file docker/docker-compose.yml \
  --profile build \
  build python-runner-image backend frontend
```

Start the long-running services:

```bash
docker compose \
  --env-file docker/.env.production \
  --file docker/docker-compose.yml \
  up --detach mongodb backend frontend
```

The `python-runner-image` service is build-only and is not started. The backend creates a new
short-lived container from that image for each execution.

## 6. Health and Release Verification

Check service state and recent logs:

```bash
docker compose --env-file docker/.env.production --file docker/docker-compose.yml ps
docker compose --env-file docker/.env.production --file docker/docker-compose.yml logs --tail 100
curl --fail http://127.0.0.1:4000/api/v1/health
curl --fail http://127.0.0.1:3000/api/v1/health
```

A healthy backend response has HTTP `200`, `success: true`, and
`data.database.status: "connected"`. Compose also checks that field rather than treating any HTTP
response as healthy. Complete a register, login, protected profile request, successful Python run,
and Python-error run before directing production traffic to the release.

## 7. Updating a Release

1. Back up MongoDB.
2. Pull or check out the approved source revision.
3. Set a new immutable `APP_IMAGE_TAG` in `docker/.env.production`.
4. Run configuration validation and the build command.
5. Start the services with `up --detach` and repeat release verification.

Do not use the floating `latest` tag for traceable releases. For a stricter production supply chain,
pin base images by digest after testing them in a staging environment.

## 8. Backup and Restore

MongoDB data is stored in the named volume `mongodb-data`. Take application-consistent backups with
`mongodump` and test restoration with `mongorestore` before relying on them. Store backups encrypted
outside the Docker host. A Compose volume is persistence, not a backup.

Never run `docker compose down --volumes` during a normal update; it deletes MongoDB storage.

## 9. Rollback

Set `APP_IMAGE_TAG` back to the last verified image tag and start the services again. Restore the
database only when a release included an incompatible data change; Sprint 9 includes no schema or
data migration. Retain the previous images until post-deployment checks pass.

## 10. Shutdown

```bash
docker compose \
  --env-file docker/.env.production \
  --file docker/docker-compose.yml \
  down
```

This stops containers and the private network while preserving `mongodb-data`. The backend handles
`SIGTERM`, stops accepting requests, and disconnects from MongoDB before exiting.

## 11. Troubleshooting

- **Backend remains unhealthy:** inspect backend logs, confirm the MongoDB credentials, and ensure the
  JWT secret is not a sample value.
- **Docker daemon unavailable:** verify the socket mount and that `DOCKER_GID` matches the host socket
  group.
- **Runner image unavailable:** rerun the profile-enabled build and confirm
  `PYTHON_RUNNER_IMAGE` exactly matches the built tag.
- **Runner workspace is not writable:** confirm the directory exists at the same absolute path on the
  host and in Compose, is owned by UID/GID `10001`, and is shared with Docker Desktop when applicable.
- **Frontend cannot reach the API:** confirm both containers share the `application` network and the
  frontend was built with `BACKEND_API_URL=http://backend:4000`.
