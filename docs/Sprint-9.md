# Sprint 9 — Production Deployment Preparation

## Objective

Prepare the completed Version 1 application for a repeatable production deployment without adding
business features or changing the interface.

## Delivered

- Multi-stage, non-root production images for the Express and Next.js applications.
- A Compose deployment for frontend, backend, authenticated MongoDB, persistent data, and build-only
  Python runner image creation.
- Container health checks and dependency-aware startup ordering.
- Backend entrypoint validation for the Docker daemon, runner image, and shared workspace.
- A standalone Next.js production output and server-only backend rewrite configuration.
- A production environment template with no credentials or usable secrets.
- Read-only application filesystems, restricted internal networking, and explicit restart/shutdown
  behavior.
- Complete deployment, installation, API operations, backup, update, and rollback documentation.
- Removal of unreferenced placeholder modules and obsolete environment compatibility code.

## Scope Boundaries

No route, response schema, database schema, authentication rule, execution classification, AI behavior,
frontend screen, or visual style changed. Kubernetes, a reverse proxy, managed secrets, CI/CD, metrics,
and centralized log aggregation remain outside Version 1.

## Verification Checklist

- [x] `pnpm typecheck`
- [x] `pnpm lint`
- [x] backend automated tests
- [x] `pnpm build`
- [x] `pnpm format:check`
- [x] Compose configuration resolves with the example environment
- [ ] backend, frontend, and runner images build
- [ ] MongoDB, backend, and frontend become healthy
- [ ] health works directly and through the frontend proxy
- [ ] register/login/profile smoke flow succeeds
- [ ] successful and failing Python submissions remain correctly classified and saved

The remaining live-container checks require a Docker-authorized host account. On the final audit host,
the current user was not a member of the Docker socket's group; this is an environment prerequisite,
not an application-code failure.

## Operational Notes

The Docker socket is mounted only into the trusted backend container. Student execution containers
retain the existing network, filesystem, capability, resource, process, and non-root restrictions.
MongoDB storage uses a named volume and must also be backed up externally.
