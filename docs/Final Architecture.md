# Final Architecture

## 1. System Purpose

The application lets a student register, authenticate, submit Python source, execute it inside a
restricted Docker container, receive Python-generated output or errors, optionally receive an
AI-generated educational explanation, and review saved submissions and profile statistics.

Python is the sole error-detection authority. AI receives context only after the runner classifies a
result as `python_error`; it never executes code or changes execution facts.

## 2. Context and Deployment

```text
Student browser
      │ HTTPS, JSON, bearer JWT
      ▼
Next.js App Router frontend
      │ same-origin /api rewrite
      ▼
Express REST API
      ├── Mongoose ──► MongoDB
      ├── internal Python runner ──► Docker daemon ──► isolated Python container
      └── AIProvider ──► mock or Gemini (python_error only)
```

The project is a pnpm monorepo with one frontend and one backend. The runner is an internal backend
boundary, not a REST service. Production Docker Compose packages the frontend, backend, and MongoDB on
one private bridge network; a build-only service creates the approved Python runner image.

## 3. Component Responsibilities

### Frontend

- Next.js App Router, React, TypeScript, Tailwind CSS, and Monaco Editor.
- Public login/register pages and protected dashboard/history/profile pages.
- Browser-local bearer-token persistence and `/auth/me` session bootstrap.
- Typed services own all HTTP calls; hooks own page orchestration.
- Renders backend and AI text as text, never raw HTML.
- Performs usability validation while treating backend decisions as authoritative.

### Backend

- Express composition, security headers, request correlation, JSON parsing, routing, and final error
  translation.
- Feature modules for authentication, analysis, AI, health, history, and profile.
- Zod validates environment, JWT payloads, bodies, queries, and identifiers.
- Controllers translate HTTP; services coordinate use cases; repositories own MongoDB operations.
- Starts only after environment validation and MongoDB connection; shuts down gracefully.

### MongoDB

- `users`: normalized identity and bcrypt hash.
- `submissions`: exact code, execution facts, optional explanation, owner, and timestamps.
- Ownership-scoped predicates prevent cross-user history access.
- Every attempt is persisted when MongoDB is available, including Python and runner errors.

### Python runner and Docker

- The runner creates a private source workspace and starts one short-lived container.
- Docker enforces no network, no stdin/TTY, read-only filesystems, non-root execution, dropped
  capabilities, no privilege escalation, one CPU, 256 MB memory, bounded processes, five seconds, and
  1 MiB combined output.
- Classification is based on termination state, exit code, and Python stderr.
- Cleanup always attempts removal of both container and workspace.
- Student containers receive no Docker socket, application source, credentials, or database access.

### AI provider boundary

- `AIProvider.generateExplanation()` is the only analysis dependency.
- Mock output is deterministic; Gemini failures map to controlled internal categories.
- Only language, submitted code, Python error type, stderr, and sanitized traceback are sent.
- Provider failure stores `aiExplanation: null` without changing the runner result.

## 4. Main Request Sequences

### Authentication

```text
Register → validate → duplicate check → bcrypt(12) → save user → 201
Login → validate → bcrypt compare → HS256 JWT (7 days) → 200
Protected request → Bearer parse → JWT verify → user/email lookup → handler
Logout → remove browser token and user state
```

### Analysis

```text
POST /analysis/run
  → authenticate
  → validate exact Python source
  → isolated execution
  → classify success | python_error | runner_error
  → if python_error, request best-effort explanation
  → persist submission
  → return saved result or controlled runner failure
```

### History and profile

```text
Bearer identity → userId-scoped repository query → response mapper → no-store JSON
```

History sorts by `createdAt` and `_id` descending. Detail lookup combines submission ID and owner ID,
using the same `404` for absent and foreign-owned records. Profile statistics aggregate only the
authenticated user's submissions.

## 5. REST Surface

| Method | Path                    | Authentication | Result                                          |
| ------ | ----------------------- | -------------- | ----------------------------------------------- |
| GET    | `/api/v1/health`        | No             | Process uptime and database state.              |
| POST   | `/api/v1/auth/register` | No             | Create account without automatic login.         |
| POST   | `/api/v1/auth/login`    | No             | Return bearer token and public user.            |
| GET    | `/api/v1/auth/me`       | Yes            | Return current basic identity.                  |
| POST   | `/api/v1/analysis/run`  | Yes            | Execute, optionally explain, and save Python.   |
| GET    | `/api/v1/history`       | Yes            | Newest-first owned submissions with pagination. |
| GET    | `/api/v1/history/:id`   | Yes            | One complete owned submission.                  |
| GET    | `/api/v1/profile`       | Yes            | Identity and read-only execution statistics.    |

Every JSON response uses `{ success, message, data }` or `{ success, message, errors }` and includes
`X-Request-Id`. Protected and sensitive responses are non-cacheable.

## 6. Trust and Failure Boundaries

- Browser values, bearer tokens, database records, Docker state, Python output, and AI output are
  treated as untrusted at their receiving boundary.
- Validation/authentication failures stop before Docker and AI.
- Python errors are successful domain outcomes, not server failures.
- Runner errors skip AI and are saved before their controlled `422`, `503`, or `504` response.
- AI failures degrade only the explanation.
- Database failure prevents the API from claiming persistence.
- Logs exclude credentials, source code, output, traceback, prompts, and provider responses.

## 7. Architecture Decisions Preserved

- MongoDB only; no PostgreSQL.
- Python only; no multi-language execution.
- One backend; no microservices, queues, Redis, Kubernetes, or GraphQL.
- JWT bearer tokens without refresh-token storage.
- AI provider abstraction without vendor coupling in the analysis service.
- Docker sandbox controlled by the backend; Python remains the source of truth.

Operational setup and trust implications are detailed in [Deployment](Deployment.md). Exact endpoint
payloads are defined in [API](API.md).
