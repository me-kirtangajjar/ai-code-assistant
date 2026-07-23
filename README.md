# AI-Powered Intelligent Code Error Analysis and Automated Feedback System

An MCA major project that helps programming students run Python code and understand syntax and runtime
errors. Python remains the source of truth for error detection; a configurable AI provider only explains
errors Python has already reported.

## Current Status

Sprint 10 completes the final-submission audit of the Version 1 workflow:

- responsive registration, login, dashboard, history, submission-detail, and profile pages;
- bearer JWT persistence, session bootstrap, logout, and protected-route redirects;
- Monaco-based Python execution with output and AI explanation rendering;
- authenticated, ownership-scoped submission history with newest-first pagination;
- complete saved-submission details without exposing another user's records;
- read-only profile information with total, successful, and failed run statistics;
- typed service and hook boundaries with loading, empty, error, and pagination states;
- application-level loading, not-found, and recoverable error pages;
- improved keyboard focus, skip navigation, form feedback, and active-page semantics;
- stricter API-envelope parsing and centralized protected-request error handling;
- security headers, request correlation, structured completion logs, and log redaction;
- stronger production environment checks and HTTP-boundary regression tests;
- non-root multi-stage frontend and backend container images;
- authenticated MongoDB persistence, service health checks, and ordered Compose startup;
- production startup validation for MongoDB, Docker, runner image, and runner workspace;
- documented installation, deployment, verification, backup, update, and rollback procedures;
- synchronized API, validation, database, runner, deployment, and frontend contracts;
- final architecture, testing, known-limitations, and future-enhancement records.

Sprint 10 does not change endpoints, response data, authentication behavior, the MongoDB schema,
Python execution, AI behavior, or frontend design.

## Architecture

```text
Next.js frontend (authentication, dashboard, history, profile)
       ↓ bearer token
Express REST API → authentication modules → MongoDB through Mongoose
       ↓ validated Python source
Docker-isolated Python runner
       ↓ only when status is python_error
AIProvider (mock or Gemini) → MongoDB submission → frontend result
```

The backend validates configuration and connects to MongoDB before accepting traffic. It closes its
database connection after the HTTP server stops during `SIGINT` or `SIGTERM` shutdown.
Every API response receives defensive security headers and an `X-Request-Id`. Structured request logs
contain safe route/status/timing metadata and exclude credentials, tokens, code, and execution output.
Production Compose runs these same boundaries on a private network; the trusted backend alone receives
access to the Docker daemon used to create isolated execution containers.

## Technology Stack

- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS, Monaco Editor
- Backend: Node.js, Express, TypeScript
- Database: MongoDB with Mongoose
- Authentication: bcrypt, JWT bearer tokens
- Validation: Zod
- Package management: pnpm workspaces
- Execution environment: Docker and Python 3.13
- Code quality: ESLint, Prettier, EditorConfig

## Folder Structure

```text
ai-code-error-feedback-system/
├── frontend/
│   └── src/
│       ├── app/                   # Auth, dashboard, history/detail, profile, and redirects
│       ├── components/            # Layout, forms, editor, history, result, and UI primitives
│       ├── context/               # Bearer-token authentication state
│       ├── hooks/                 # Auth, execution, history, detail, and profile orchestration
│       ├── lib/                   # API client, storage, validation, and AI parsing
│       ├── services/              # Authentication, analysis, history, and profile API calls
│       └── types/                 # Typed frontend/API contracts
├── backend/
│   └── src/
│       ├── common/              # Shared API errors and response helpers
│       ├── config/              # Validated environment configuration
│       ├── database/            # MongoDB lifecycle and Mongoose models
│       ├── middleware/          # Validation, authentication, and error handling
│       ├── modules/auth/        # Register, login, JWT, and current-user flow
│       ├── modules/analysis/    # Execution, optional explanation, and persistence
│       ├── modules/ai/          # Vendor-neutral explanation providers
│       ├── modules/health/      # Public health endpoint
│       ├── python-runner/       # Docker lifecycle, limits, capture, and cleanup
│       ├── app.ts               # Express application composition
│       └── server.ts            # Startup and graceful shutdown
├── python-runner/               # Historical note directing maintainers to the backend runner
├── docker/                      # Production images, startup gate, Compose, and env template
├── docs/                        # Architecture and sprint documentation
└── .github/workflows/           # Future continuous integration
```

## Development Prerequisites

- Node.js 22 or newer
- pnpm 11 or newer
- A reachable MongoDB instance
- Docker Desktop or Docker Engine with access granted to the backend process account
- Git

## Installation

### Local development

From the repository root:

```bash
corepack enable
pnpm install
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
```

Set a reachable `MONGODB_URI`, replace the example `JWT_SECRET` with at least 32 random characters,
set `BACKEND_API_URL` in `frontend/.env.local`, and review the runner and AI settings in
`backend/.env`. `AI_PROVIDER=mock` requires no API key. For Gemini, provide `GEMINI_API_KEY` only in
the untracked backend environment.

Build the approved local Python runner image before using the analysis endpoint:

```bash
docker build --file docker/Dockerfile.python \
  --tag ai-code-error-feedback-python-runner:1.0.0 docker
```

The backend invokes Docker directly. Its operating-system account must be allowed to use the Docker
daemon; the application must not be run with embedded `sudo`, and the Docker socket is never mounted
inside a student-code container.

### Production with Docker Compose

Install Docker Engine and Docker Compose v2, then from the repository root:

```bash
sudo install -d -o 10001 -g 10001 -m 700 /opt/ai-code-error-feedback/runner-workspaces
cp docker/.env.production.example docker/.env.production
```

Replace every `change-me` value, set `DOCKER_GID` from
`stat -c '%g' /var/run/docker.sock`, and validate the deployment:

```bash
docker compose --env-file docker/.env.production --file docker/docker-compose.yml config --quiet
docker compose --env-file docker/.env.production --file docker/docker-compose.yml \
  --profile build build python-runner-image backend frontend
docker compose --env-file docker/.env.production --file docker/docker-compose.yml \
  up --detach mongodb backend frontend
```

Verify both direct and proxied health:

```bash
curl --fail http://127.0.0.1:4000/api/v1/health
curl --fail http://127.0.0.1:3000/api/v1/health
```

See the [Production Deployment Guide](docs/Deployment.md) before exposing the application. It covers
TLS, host permissions, secrets, health interpretation, backup, upgrades, rollback, and the Docker
socket trust boundary.

## Run the Application

Start the backend and frontend in separate terminals:

```bash
pnpm dev:backend
pnpm dev:frontend
```

Open `http://localhost:3000`. The Next.js server proxies same-origin `/api/*` requests to
`BACKEND_API_URL`, avoiding a browser CORS dependency without changing Express.

### Backend endpoints

```bash
pnpm dev:backend
```

The example backend URL is `http://localhost:4000`. Public health is available at:

```bash
curl http://localhost:4000/api/v1/health
```

Sprint 3 authentication routes are:

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/auth/me
```

Among these authentication routes, only `/auth/me` requires `Authorization: Bearer <accessToken>`.

The analysis and AI explanation flow uses the existing protected endpoint:

```text
POST /api/v1/analysis/run
```

Its body is exactly `{ "code": "<Python source>" }`. Successful and Python-error executions return
`201`. A Python error includes an explanation when the configured provider succeeds. Provider failure
does not fail execution and stores `aiExplanation: null`.

Sprint 7 adds these protected read endpoints:

```text
GET /api/v1/history?page=1&limit=10
GET /api/v1/history/:id
GET /api/v1/profile
```

History is newest first and always scoped to the authenticated user. The profile is read-only and its
statistics are calculated from that user's saved submissions.

## Workspace Commands

```bash
pnpm dev:frontend   # Start the Next.js development server
pnpm dev:backend    # Start the backend in watch mode
pnpm build          # Build all workspaces
pnpm lint           # Lint all workspaces
pnpm typecheck      # Type-check all workspaces
pnpm --filter @ai-code-error-feedback/backend test
pnpm format         # Format supported project files
pnpm format:check   # Check formatting without changing files
```

The backend workspace also supports `pnpm --filter @ai-code-error-feedback/backend start` after a
successful build.

## Documentation

- [Architecture](docs/Architecture.md)
- [Final architecture](<docs/Final Architecture.md>)
- [Database design](docs/Database.md)
- [REST API specification](docs/API.md)
- [Authentication design](docs/Authentication.md)
- [Sprint 3](docs/Sprint-3.md)
- [Python execution pipeline](docs/Execution-Pipeline.md)
- [Python runner contract](docs/Runner-Contract.md)
- [Docker sandbox architecture](docs/Sandbox-Architecture.md)
- [Execution error classification](docs/Error-Classification.md)
- [Execution sequence diagram](docs/Sequence-Diagram.md)
- [Sprint 4A](docs/Sprint-4A.md)
- [Sprint 4B](docs/Sprint-4B.md)
- [Sprint 5](docs/Sprint-5.md)
- [Sprint 6](docs/Sprint-6.md)
- [Sprint 7](docs/Sprint-7.md)
- [Sprint 8](docs/Sprint-8.md)
- [Sprint 9](docs/Sprint-9.md)
- [Sprint 10](docs/Sprint-10.md)
- [Production deployment](docs/Deployment.md)
- [Testing checklist](<docs/Testing Checklist.md>)
- [Known limitations](<docs/Known Limitations.md>)
- [Future enhancements](<docs/Future Enhancements.md>)
- [Project roadmap](docs/Project-Roadmap.md)

## Future Roadmap

Version 1 is feature-complete and production-packaged for the MCA project scope. Any later work—such
as CI/CD, managed secrets, observability, rate limiting, or provider expansion—requires explicit scope
approval and must preserve Python as the sole error-detection authority.

## License

This project is available under the [MIT License](LICENSE).
# testing-repo-code
