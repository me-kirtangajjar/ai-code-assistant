# Project Conventions

## 1. Purpose

These conventions keep the implementation consistent across the monorepo. A deviation should solve
a documented requirement and be reviewed before introduction.

## 2. Naming

| Item                                | Convention                               | Example               |
| ----------------------------------- | ---------------------------------------- | --------------------- |
| TypeScript variables/functions      | `camelCase`                              | `authenticatedUser`   |
| TypeScript classes/types/interfaces | `PascalCase`                             | `SubmissionResult`    |
| Constants                           | `UPPER_SNAKE_CASE`                       | `MAX_OUTPUT_BYTES`    |
| Source folders                      | lowercase kebab-case when multiple words | `python-runner`       |
| Feature files                       | `<feature>.<responsibility>.ts`          | `auth.service.ts`     |
| React component files               | `PascalCase.tsx`                         | `LoginForm.tsx`       |
| React hooks                         | `use` prefix                             | `useAuth`             |
| REST paths                          | lowercase nouns, plural for collections  | `/history/:id`        |
| JSON properties                     | `camelCase`                              | `executionTime`       |
| MongoDB collections                 | lowercase plural nouns                   | `submissions`         |
| MongoDB stored fields               | `camelCase`                              | `passwordHash`        |
| Environment variables               | `UPPER_SNAKE_CASE`                       | `MONGODB_URI`         |
| Error codes                         | `UPPER_SNAKE_CASE`                       | `INVALID_CREDENTIALS` |

Use descriptive names. Avoid abbreviations except established terms such as API, JWT, AI, URL, ID, and
HTTP. Boolean names should read as predicates, such as `hasNextPage` or `isConnected`.

## 3. Folder Organization

### 3.1 Frontend

- `src/app`: App Router layouts, pages, route loading/error states, and route-local composition.
- `src/components`: reusable visual components without backend or database access.
- `src/hooks`: reusable client-side React behavior.
- `src/lib`: framework-neutral helpers and configured client libraries.
- `src/services`: typed HTTP calls and response-envelope handling.
- `src/types`: frontend contracts shared across multiple features.
- Additional frontend folders are created only when they contain an implemented responsibility;
  global styling currently lives in `src/app/globals.css`.

Keep a component close to its route when it is used only there. Promote it to `components` only when
reuse is real.

### 3.2 Backend

- `src/config`: validated environment and application configuration.
- `src/common`: shared errors, response contracts, logging primitives, and cross-module types.
- `src/middleware`: cross-cutting Express middleware such as authentication and error handling.
- `src/modules/<feature>`: controller, service, repository, routes, validator, types, and persistence
  files owned by one feature when that responsibility exists.

Responsibilities:

- Routes declare method/path/middleware order only.
- Controllers translate HTTP input and service output.
- Services implement use-case orchestration and business decisions.
- Repositories encapsulate MongoDB queries and persistence mapping.
- Validators own Zod request schemas.
- Types describe module contracts without importing Express into service/repository layers.

Do not create generic abstractions until at least two concrete uses demonstrate the same behavior.

## 4. Persistence Conventions

Mongoose is the MongoDB mapping library because it provides schema constraints, indexes, projections,
and TypeScript support without changing the MongoDB architecture.
Models remain private to their owning repository/module and are not returned directly from services.
API response objects are explicitly mapped so internal fields and `passwordHash` cannot leak.

Collection and index definitions must match [Database Design](Database.md). Repository methods accept
domain inputs rather than Express request objects.

## 5. Environment Variables

### 5.1 General rules

- Commit `.env.example` files with safe placeholders; never commit `.env` files or real secrets.
- Validate all backend values at startup and fail fast on invalid configuration.
- Access environment variables through the configuration module, not throughout feature code.
- Do not use a public frontend prefix for secrets.
- Use explicit units in numeric names, such as `_MS` and `_BYTES`.

### 5.2 Frontend variables

| Variable          | Purpose                                                              |
| ----------------- | -------------------------------------------------------------------- |
| `BACKEND_API_URL` | Server-side target used by the Next.js same-origin `/api/*` rewrite. |

### 5.3 Backend variables

| Variable                       | Purpose                                             |
| ------------------------------ | --------------------------------------------------- |
| `NODE_ENV`                     | `development`, `test`, or `production`.             |
| `PORT`                         | HTTP listening port.                                |
| `MONGODB_URI`                  | MongoDB connection string.                          |
| `JWT_SECRET`                   | HS256 signing secret; minimum 32 random bytes.      |
| `JWT_EXPIRES_IN`               | Access-token lifetime; Sprint 3 requires `7d`.      |
| `PYTHON_RUNNER_IMAGE`          | Approved local runner image name/tag.               |
| `EXECUTION_TIMEOUT_MS`         | Python execution timeout; design value `5000`.      |
| `EXECUTION_MEMORY_MB`          | Container memory allowance; design value `256`.     |
| `EXECUTION_CPU_LIMIT`          | Container CPU allowance; design value `1`.          |
| `EXECUTION_OUTPUT_LIMIT_BYTES` | Combined output cap; `1048576` bytes (1 MiB).       |
| `EXECUTION_PID_LIMIT`          | Maximum processes/threads per execution; `64`.      |
| `EXECUTION_MAX_CONCURRENCY`    | Maximum simultaneous local executions; `2`.         |
| `AI_PROVIDER`                  | Explanation provider: `mock` or `gemini`.           |
| `GEMINI_API_KEY`               | Server-only Gemini credential; required for Gemini. |
| `GEMINI_MODEL`                 | Validated Gemini model identifier.                  |
| `GEMINI_TIMEOUT_MS`            | Gemini request deadline; default `10000`.           |

Provider credentials remain only in the backend environment and must never use a public frontend
prefix or appear in logs.

## 6. Logging

- Use structured logs in production and readable structured output in development.
- Implemented levels: `info`, `warn`, and `error`.
- Include UTC timestamp and level in every entry, plus request ID, method, route template, status,
  duration, and stable error code where applicable.
- Log startup configuration categories but redact values marked secret.
- Never log bearer tokens, authorization headers, passwords, hashes, source code, stdout, stderr, AI
  prompts/responses, database credentials, or environment secrets.
- Avoid scattered direct console logging in feature modules; use the shared logger boundary.

## 7. Error Classes

Expected backend failures use the shared `AppError`, which contains an HTTP status, stable code, safe
message, and optional field details.

Expected categories are:

- validation error;
- authentication error;
- not-found error;
- conflict error;
- runner/dependency error;
- database-availability error.

Do not create one class for every message. Unexpected programming errors remain ordinary errors and are
mapped to `500 INTERNAL_ERROR` at the final middleware boundary. Services must not construct Express
responses or throw raw strings.

## 8. HTTP Status Codes

| Status                      | Use                                                                                |
| --------------------------- | ---------------------------------------------------------------------------------- |
| `200 OK`                    | Successful read or login.                                                          |
| `201 Created`               | User registration or persisted analysis attempt, including Python errors.          |
| `400 Bad Request`           | Invalid JSON, body, params, or query values.                                       |
| `401 Unauthorized`          | Missing, invalid, expired, or rejected authentication.                             |
| `403 Forbidden`             | Reserved for a future authenticated action lacking permission; not currently used. |
| `404 Not Found`             | Unknown route or inaccessible/missing owned resource.                              |
| `409 Conflict`              | Duplicate normalized email.                                                        |
| `413 Content Too Large`     | Request-body limit exceeded.                                                       |
| `422 Unprocessable Content` | Valid request whose execution exceeds the output policy.                           |
| `500 Internal Server Error` | Unexpected server defect.                                                          |
| `503 Service Unavailable`   | MongoDB, Docker, or runner unavailable.                                            |
| `504 Gateway Timeout`       | Python runner exceeded the execution deadline.                                     |

Do not use `200` for failures or `500` for expected Python syntax/runtime errors.

## 9. Timestamp Handling

- Persist timestamps as MongoDB BSON `Date` values in UTC.
- Generate server-owned timestamps; do not accept `createdAt` or `updatedAt` from clients.
- Serialize timestamps as ISO 8601 UTC strings ending in `Z`.
- Use `createdAt` and `updatedAt` for mutable entities; immutable submissions require `createdAt` only.
- Use monotonic elapsed-time measurement for durations such as `executionTime`; do not calculate
  duration by subtracting client timestamps.
- Render local time only in the frontend presentation layer.

## 10. API and Pagination Conventions

- Prefix public endpoints with `/api/v1`.
- Use the standard success/failure envelope for every JSON response.
- Use `page` and `limit`; defaults are 1 and 10, with a maximum limit of 50.
- Sort history newest first by `createdAt`, then `_id`.
- Derive authenticated ownership only from JWT context.
- Reject unknown body/query properties instead of silently accepting unsupported features.

## 11. Documentation and Change Discipline

Any contract change updates the relevant design document, environment example, tests, and consumer in
the same sprint. Architecture changes require explicit approval; implementation must follow these
documents rather than silently introducing alternate technologies or features.
