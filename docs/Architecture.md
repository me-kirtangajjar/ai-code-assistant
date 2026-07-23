# System Architecture and Module Interaction

## 1. Purpose

This document defines component boundaries and the implemented MongoDB, JWT authentication, Python
execution, AI explanation, student workflow, quality safeguards, deployment boundary, and Sprint 10
final consistency review.

## 2. Architectural Principles

- One Next.js frontend, one Express backend, one MongoDB database, and isolated Python containers.
- No microservices, message broker, cache, GraphQL layer, or additional programming language.
- Python alone detects syntax and runtime errors.
- AI only explains an error already reported by Python.
- HTTP, execution, AI, and persistence concerns remain behind focused boundaries.
- Controllers handle HTTP translation, services coordinate use cases, and repositories own database
  access.
- Modules communicate through explicit contracts rather than importing another module's internal
  controller or repository implementation.

## 3. System Context

```text
Student browser
      │
      ▼
Next.js frontend
      │ same-origin /api rewrite + JSON + bearer JWT
      ▼
Express backend
      ├──► MongoDB
      ├──► Python runner boundary ──► Docker container ──► Python interpreter
      └──► Configured AI provider (only after Python reports an error)
```

The displayed sequence `Frontend → Backend → Python Runner → Docker → Python → AI Provider →
MongoDB` is an orchestration flow controlled by the backend. Python does not call the AI provider,
and the AI provider does not write to MongoDB.

## 4. Component Responsibilities

### 4.1 Next.js frontend

- Implements registration, login, logout, session bootstrap, protected dashboard access, Python
  execution, paginated history/detail views, and the read-only profile view.
- Performs matching client validation for usability while treating backend validation as authoritative.
- Stores the bearer token in browser local storage, verifies it through `/auth/me`, and attaches it only
  through the service layer.
- Uses `AuthContext` and focused hooks for authentication, execution, history, submission detail, and
  profile orchestration.
- Uses a Next.js rewrite so browser API calls remain same-origin while Express stays unchanged.
- Displays stdout, stderr, execution status/time, error type, and AI feedback without reclassifying
  Python errors or rendering AI content as HTML.
- Contains no password hashing, JWT signing, Docker control, AI credentials, or database access.

### 4.2 Express backend

- Initializes validated environment configuration and MongoDB during startup.
- Exposes unauthenticated health/register/login endpoints and protected current-user, analysis,
  history, submission-detail, and profile endpoints.
- Owns the centralized MongoDB connection and Mongoose models.
- Performs JWT authentication and consistent validation/error translation for implemented endpoints.
- Applies centralized security headers, request correlation, safe completion logging, and consistent
  failure-envelope translation before feature routes.
- Performs authenticated analysis orchestration, isolated Python execution, optional explanation, and
  submission persistence.
- Depends on the vendor-neutral `AIProvider` interface and invokes it only for `python_error`.
- Maps startup and connection failures to meaningful structured logs without exposing secrets.

The backend is the only component allowed to communicate with MongoDB, Docker, or an AI provider.

### 4.3 Python runner boundary

- Accepts validated Python source from the analysis service through an internal backend adapter.
- Creates and monitors one isolated Docker execution per analysis request.
- Applies the configured timeout, memory, CPU, network, filesystem, user, and output limits.
- Captures stdout, stderr, exit code, duration, and termination reason.
- Always attempts container/process cleanup.
- Returns structured execution facts; it does not explain or rewrite Python errors.

The runner is a boundary within the backend deployment, not a separately deployed microservice.

### 4.4 Docker

- Provides process and filesystem isolation for untrusted student code.
- Uses the approved Python-only runner image.
- Runs without network access, as a non-root user, with a read-only root filesystem.
- Enforces five seconds, 256 MB memory, one CPU, and 1 MiB (1,048,576 bytes) combined output.
- Must not mount the host workspace, Docker socket, secrets, or writable host directories into the
  student-code container.

Docker failures are infrastructure errors, not Python errors.

### 4.5 Python interpreter

- Parses and executes the submitted source.
- Produces stdout, stderr, and an exit code.
- Is the sole authority for syntax and runtime-error detection.
- Receives no user-supplied stdin in Version 1.

### 4.6 AI provider abstraction

- Accepts Python-generated error context only after a `python_error` result.
- Produces an educational explanation without changing detection or execution facts.
- Hides provider-specific request, authentication, and response details from the analysis service.
- Provides a deterministic mock implementation and a Gemini REST adapter behind the same interface.
- Maps provider timeout, network, authentication, rate-limit, availability, and malformed-response
  failures to controlled internal categories so the analysis result can still be saved.

Successful Python runs and runner errors must never invoke the AI provider.

### 4.7 MongoDB

- Stores users and submissions according to [Database Design](Database.md).
- Enforces unique normalized emails and supports ownership-scoped history queries.
- Stores execution and AI facts but does not perform authentication, error detection, or explanation.
- Connects before the Express server begins accepting traffic.
- Disconnects after the HTTP server stops during `SIGINT` or `SIGTERM` shutdown.

## 5. Backend Module Boundaries

| Module     | Responsibility                                                | Permitted collaboration                          |
| ---------- | ------------------------------------------------------------- | ------------------------------------------------ |
| `auth`     | Registration, login, JWT issuance, current identity           | User persistence and shared auth utilities       |
| `analysis` | Orchestrates execution, optional explanation, and persistence | Runner, `AIProvider`, and submission repository  |
| `history`  | Ownership-scoped paginated and detail reads                   | Submission repository                            |
| `profile`  | Read-only identity and submission statistics                  | Authenticated identity and submission repository |
| `ai`       | Vendor-neutral explanation boundary and configured provider   | Provider adapter only                            |
| `common`   | Shared response, error, logging, and primitive contracts      | May be used by all modules                       |

A feature controller calls its own service. Services may depend on explicit interfaces exposed by
another module, but controllers never call controllers, routes never contain business logic, and
repositories never call AI or Docker.

## 6. Implemented Startup, Authentication, Runner Reconciliation, and Shutdown Sequence

1. The process loads `.env` values and validates MongoDB, HTTP, and JWT configuration.
2. The centralized database module connects Mongoose to MongoDB.
3. The existing User model is initialized so its unique normalized-email index exists before traffic.
4. If connection/model initialization fails, startup logs safely, cleans up, and exits non-zero without
   starting Express.
5. After connection succeeds, startup attempts best-effort removal of only labeled runner containers
   and runner-owned temporary workspaces left by an interrupted process.
6. Reconciliation failure is logged safely and does not prevent non-runner endpoints from starting.
7. Express listens on the configured port.
8. Health, authentication, current-user, analysis, history, and profile endpoints are available.
9. On `SIGINT` or `SIGTERM`, the server stops accepting requests and then disconnects Mongoose.

## 7. Implemented Analysis and Explanation Sequence

The complete contract is defined in [Python Execution Pipeline](Execution-Pipeline.md),
[Python Runner Contract](Runner-Contract.md), and
[Docker Sandbox Architecture](Sandbox-Architecture.md).

1. The frontend submits `POST /api/v1/analysis/run` with Python source and a bearer token.
2. The backend assigns a request ID, validates the JWT, and establishes the authenticated user.
3. Zod validates the request body. Invalid input stops before Docker or AI work.
4. The analysis service sends the validated source to the runner boundary.
5. The runner starts an isolated Docker container and Python processes the source.
6. The runner returns stdout, stderr, exit code, duration, output-limit state, and any infrastructure
   termination reason.
7. The analysis service classifies the result from runner/Python facts:
   - exit success → `success`;
   - Python-reported syntax/runtime failure → `python_error`;
   - Docker/runner failure → `runner_error`.
8. Only for `python_error`, the analysis service sends language, submitted code, error type, stderr,
   and traceback to the configured `AIProvider`.
9. Provider success supplies `aiExplanation`; provider failure keeps it `null` without changing any
   runner field. Success and runner errors never invoke AI.
10. The complete attempt is stored in MongoDB, including runner failures when the database is available.
11. The backend returns the standard API envelope.

AI output cannot modify stdout, stderr, exit code, error type, or execution status.

## 8. Implemented Request Paths

- Registration/login: implemented frontend services → auth module → users repository → MongoDB.
- Session bootstrap: implemented frontend context → JWT middleware → `/auth/me` → MongoDB.
- Analysis: implemented execution hook → analysis endpoint → runner → optional AI → MongoDB.
- History list/detail: protected frontend hooks → history service → ownership-scoped submission
  repository → MongoDB.
- Profile: protected profile hook → profile service → authenticated identity plus one submission
  statistics aggregation → MongoDB.

Health, authentication, analysis, Docker execution, AI explanation, persistence, history, profile,
and the Version 1 student frontend are implemented.

## 9. History and Profile Read Sequence

1. The frontend sends the stored bearer token through its service layer.
2. Existing authentication middleware verifies the JWT and current user.
3. History query/path values are validated before repository access.
4. History list and detail predicates always include the authenticated `userId`; detail lookup uses
   the same `404` for a missing record and a record owned by someone else.
5. List results are sorted by `createdAt` and `_id` descending and returned with pagination metadata.
6. Profile data comes from the already verified identity, while one aggregation calculates that
   user's total, successful, and failed runs.
7. Responses use `Cache-Control: no-store` and never serialize `userId`, `passwordHash`, or database
   internals.

## 10. Trust Boundaries

- Browser input, JWTs, Python source, database records, runner responses, and AI responses are all
  treated as untrusted at their receiving boundary.
- Only the backend holds database, JWT, Docker, and AI-provider configuration.
- Source code and stderr may contain sensitive user text and are excluded from logs.
- External AI calls must send only the minimum error context required for explanation.
- Production traffic must use TLS because bearer tokens are replayable if intercepted.
- Local-storage bearer tokens require strict XSS prevention; the frontend does not use raw HTML
  rendering for backend or AI text.

## 11. Failure Boundaries

Validation and authentication failures stop immediately. Runner failures skip AI and are persisted
when possible. AI failures degrade only the explanation. Database failures prevent the persistence
guarantee and therefore fail the request. Detailed mappings are defined in
[Error Handling Strategy](Error-Handling.md).

## 12. Sprint 8 Quality Boundaries

Quality improvements remain cross-cutting and do not alter feature ownership:

- Express middleware assigns or validates a bounded request ID and returns it as `X-Request-Id`.
- Completion logs record only request ID, method, route template, status, and duration. Shared logging
  redacts sensitive keys, bearer values, and MongoDB URI credentials.
- API responses use `no-store`, content-sniffing prevention, frame denial, restrictive API content
  policy, referrer protection, and limited browser permissions. HSTS is production-only.
- Zod issue mapping is shared by body and history-query validation while feature schemas remain in
  their owning modules.
- The frontend validates successful API envelopes instead of trusting arbitrary successful JSON.
- Authentication failures are classified once; authorization failures no longer clear a valid login.
- App Router loading, not-found, and error boundaries provide predictable recovery UI.
- Skip navigation, visible focus, `aria-current`, `aria-busy`, connected field hints, and invalid-field
  focus improve keyboard and assistive-technology use.

Rate limiting is intentionally not included because it would change request behavior and requires a
deployment-aware policy. It may be introduced only through a separately approved operational change.

## 13. Sprint 9 Production Topology

Docker Compose packages the same application boundaries; it does not split the backend into services.

```text
Public port 3000
      │
      ▼
Next.js container ── private bridge ──► Express container ── private bridge ──► MongoDB
                                             │
                                             └── host Docker daemon
                                                    │
                                                    ▼
                                          per-request Python container
```

- Next.js uses standalone server output, runs as UID `10001`, and proxies `/api/*` to the private
  Compose backend name.
- Express runs as UID `10001`; production startup requires valid environment data, MongoDB, Docker,
  the configured runner image, and a writable runner-owned workspace.
- MongoDB uses an authenticated connection and a named persistent volume. It is not published to the
  host network.
- Compose health checks gate backend startup on MongoDB and frontend startup on backend plus database
  readiness.
- Application containers use read-only root filesystems and `no-new-privileges`. Only the trusted
  backend receives the Docker socket and shared runner-workspace mount.
- The build-only runner service creates the approved image but never runs as a long-lived service.
  Student containers still receive no network, socket, secret, or host-application mount.

TLS termination, DNS, backups, host hardening, monitoring, and image promotion are operational
responsibilities described in [Production Deployment Guide](Deployment.md). No endpoint, schema, or
business workflow changes at this boundary.

## 14. Final Canonical View

This document preserves implementation history and boundary detail. The concise submission-level
system view is [Final Architecture](Final%20Architecture.md); final acceptance coverage and outstanding
environment checks are recorded in [Testing Checklist](Testing%20Checklist.md) and
[Known Limitations](Known%20Limitations.md).
