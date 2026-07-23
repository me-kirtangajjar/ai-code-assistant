# REST API Specification

## 1. General Contract

- Base path: `/api/v1`
- Content type: `application/json`
- Authentication: `Authorization: Bearer <access-token>` on protected endpoints
- Response format: [Standard API Response Format](API-Response-Standard.md)
- Timestamps: ISO 8601 UTC strings, for example `2026-07-21T12:30:00.000Z`
- Identifiers: MongoDB identifiers serialized as strings
- Unknown request-body properties: rejected with `400 VALIDATION_ERROR`

Endpoint paths below are relative to `/api/v1`.

## 2. Shared Representations

### 2.1 Public user

```json
{
  "id": "67f000000000000000000001",
  "name": "Asha Patel",
  "email": "asha@example.com",
  "createdAt": "2026-07-21T12:30:00.000Z"
}
```

`passwordHash` is never serialized.

### 2.2 Submission detail

```json
{
  "id": "67f000000000000000000101",
  "code": "print('Hello')",
  "language": "python",
  "status": "success",
  "stdout": "Hello\n",
  "stderr": "",
  "exitCode": 0,
  "executionTime": 84,
  "errorType": null,
  "traceback": null,
  "aiExplanation": null,
  "createdAt": "2026-07-21T12:45:00.000Z"
}
```

## 3. Authentication Endpoints

### 3.1 `POST /auth/register`

**Purpose:** Create a student account. Registration does not log the user in; the client proceeds to
the login endpoint.

**Authentication required:** No.

**Request body:**

```json
{
  "name": "Asha Patel",
  "email": "asha@example.com",
  "password": "student-password"
}
```

**Validation:**

- `name`: required string, trimmed, 2–100 characters.
- `email`: required string, trimmed, lowercased before lookup/storage, valid email, maximum 254
  characters.
- `password`: required string, 8–64 characters and no more than 72 UTF-8 bytes because bcrypt must
  not silently truncate multibyte input.
- Unknown fields are rejected.

**Success — `201 Created`:**

```json
{
  "success": true,
  "message": "Account registered successfully.",
  "data": {
    "user": {
      "id": "67f000000000000000000001",
      "name": "Asha Patel",
      "email": "asha@example.com",
      "createdAt": "2026-07-21T12:30:00.000Z"
    }
  }
}
```

**Failures:**

| Status | Code                   | When                                                        |
| ------ | ---------------------- | ----------------------------------------------------------- |
| `400`  | `VALIDATION_ERROR`     | Body or one of its fields is invalid.                       |
| `409`  | `EMAIL_ALREADY_EXISTS` | Normalized email is already registered.                     |
| `413`  | `PAYLOAD_TOO_LARGE`    | Request exceeds the configured JSON body limit.             |
| `503`  | `DATABASE_UNAVAILABLE` | Account cannot be persisted because MongoDB is unavailable. |
| `500`  | `INTERNAL_ERROR`       | Unexpected server failure.                                  |

### 3.2 `POST /auth/login`

**Purpose:** Verify credentials and issue a bearer access token.

**Authentication required:** No.

**Request body:**

```json
{
  "email": "asha@example.com",
  "password": "student-password"
}
```

**Validation:**

- `email`: required valid email, trimmed, lowercased for lookup, maximum 254 characters.
- `password`: required string, 8–64 characters and no more than 72 UTF-8 bytes.
- Unknown fields are rejected.

**Success — `200 OK`:**

```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "accessToken": "<jwt-access-token>",
    "user": {
      "id": "67f000000000000000000001",
      "name": "Asha Patel",
      "email": "asha@example.com",
      "createdAt": "2026-07-21T12:30:00.000Z"
    }
  }
}
```

The token expires seven days after it is issued. The client sends it as
`Authorization: Bearer <accessToken>` on protected requests.

**Failures:**

| Status | Code                   | When                                                          |
| ------ | ---------------------- | ------------------------------------------------------------- |
| `400`  | `VALIDATION_ERROR`     | Request body is invalid.                                      |
| `401`  | `INVALID_CREDENTIALS`  | Email is unknown or password verification fails.              |
| `413`  | `PAYLOAD_TOO_LARGE`    | Request exceeds the JSON body limit.                          |
| `503`  | `DATABASE_UNAVAILABLE` | Credentials cannot be checked because MongoDB is unavailable. |
| `500`  | `INTERNAL_ERROR`       | Unexpected server failure.                                    |

The response and meaningful processing time should not disclose whether an email exists.

### 3.3 `GET /auth/me`

**Purpose:** Validate the current bearer token and return the authenticated identity for frontend
session bootstrap.

**Authentication required:** Yes.

**Request body:** None.

**Validation:** A syntactically valid bearer header and valid, unexpired JWT are required. The
`userId` claim must identify an existing user, and its email must match that user's current email.

**Success — `200 OK`:**

```json
{
  "success": true,
  "message": "Authenticated user retrieved successfully.",
  "data": {
    "user": {
      "name": "Asha Patel",
      "email": "asha@example.com",
      "createdAt": "2026-07-21T12:30:00.000Z"
    }
  }
}
```

**Failures:**

| Status | Code                      | When                                                       |
| ------ | ------------------------- | ---------------------------------------------------------- |
| `401`  | `AUTHENTICATION_REQUIRED` | Bearer token is missing or malformed.                      |
| `401`  | `INVALID_TOKEN`           | Signature or payload is invalid, or user no longer exists. |
| `401`  | `TOKEN_EXPIRED`           | Token is valid but expired.                                |
| `503`  | `DATABASE_UNAVAILABLE`    | User lookup cannot be completed.                           |
| `500`  | `INTERNAL_ERROR`          | Unexpected server failure.                                 |

## 4. Profile Endpoint

### 4.1 `GET /profile`

**Purpose:** Return the authenticated student's read-only Version 1 profile and submission statistics.
Unlike `/auth/me`, this endpoint represents the profile view rather than token/session bootstrap.

**Authentication required:** Yes.

**Request body:** None.

**Validation:** Valid authenticated user context established by JWT middleware.

**Success — `200 OK`:**

```json
{
  "success": true,
  "message": "Profile retrieved successfully.",
  "data": {
    "profile": {
      "name": "Asha Patel",
      "email": "asha@example.com",
      "createdAt": "2026-07-21T12:30:00.000Z",
      "statistics": {
        "totalRuns": 3,
        "successfulRuns": 2,
        "failedRuns": 1
      }
    }
  }
}
```

`failedRuns` is the sum of `python_error` and `runner_error` submissions. All statistics are scoped
to the authenticated user.

**Failures:**

| Status | Code                      | When                                               |
| ------ | ------------------------- | -------------------------------------------------- |
| `401`  | `AUTHENTICATION_REQUIRED` | Bearer token is missing or malformed.              |
| `401`  | `INVALID_TOKEN`           | Token verification fails or user no longer exists. |
| `401`  | `TOKEN_EXPIRED`           | Token has expired.                                 |
| `503`  | `DATABASE_UNAVAILABLE`    | Profile lookup cannot be completed.                |
| `500`  | `INTERNAL_ERROR`          | Unexpected server failure.                         |

## 5. History Endpoints

### 5.1 `GET /history`

**Purpose:** Return the authenticated user's submissions in newest-first order.

**Authentication required:** Yes.

**Request body:** None.

**Query parameters:**

| Parameter | Required | Default | Validation                 |
| --------- | -------- | ------- | -------------------------- |
| `page`    | No       | `1`     | Positive integer.          |
| `limit`   | No       | `10`    | Integer from 1 through 50. |

No search, filters, sort selection, or deletion parameters are supported.

**Success — `200 OK`:**

```json
{
  "success": true,
  "message": "Submission history retrieved successfully.",
  "data": {
    "items": [
      {
        "id": "67f000000000000000000101",
        "codePreview": "print('Hello')",
        "language": "python",
        "status": "success",
        "executionTime": 84,
        "errorType": null,
        "createdAt": "2026-07-21T12:45:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalItems": 1,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  }
}
```

An empty history returns `items: []` and pagination totals of zero. `codePreview` contains at most 160
characters and does not alter stored code.

**Failures:**

| Status | Code                                                           | When                                                                    |
| ------ | -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `400`  | `VALIDATION_ERROR`                                             | Pagination values are invalid or unknown query parameters are supplied. |
| `401`  | `AUTHENTICATION_REQUIRED`, `INVALID_TOKEN`, or `TOKEN_EXPIRED` | Token cannot establish a valid current user.                            |
| `503`  | `DATABASE_UNAVAILABLE`                                         | History query cannot be completed.                                      |
| `500`  | `INTERNAL_ERROR`                                               | Unexpected server failure.                                              |

### 5.2 `GET /history/:id`

**Purpose:** Return one complete submission owned by the authenticated user.

**Authentication required:** Yes.

**Request body:** None.

**Path validation:** `id` must be a 24-character hexadecimal MongoDB ObjectId string.

**Success — `200 OK`:** `data.submission` contains the full shared submission-detail shape.

**Failures:**

| Status | Code                                                           | When                                                          |
| ------ | -------------------------------------------------------------- | ------------------------------------------------------------- |
| `400`  | `INVALID_SUBMISSION_ID`                                        | Path identifier is not a valid ObjectId string.               |
| `401`  | `AUTHENTICATION_REQUIRED`, `INVALID_TOKEN`, or `TOKEN_EXPIRED` | Token cannot establish a valid current user.                  |
| `404`  | `SUBMISSION_NOT_FOUND`                                         | No submission with this ID belongs to the authenticated user. |
| `503`  | `DATABASE_UNAVAILABLE`                                         | Lookup cannot be completed.                                   |
| `500`  | `INTERNAL_ERROR`                                               | Unexpected server failure.                                    |

The same `404` is used when the identifier is absent and when it belongs to another user, preventing
cross-user resource discovery.

## 6. Analysis Endpoint

### 6.1 `POST /analysis/run`

**Purpose:** Execute submitted Python in the controlled runner, optionally explain a Python-reported
error through the configured AI provider, and save the complete result. AI never detects or reclassifies
errors.

Its internal lifecycle and sandbox contract are defined in [Python Execution
Pipeline](Execution-Pipeline.md) and [Python Runner Contract](Runner-Contract.md).

**Authentication required:** Yes.

**Request body:**

```json
{
  "code": "print('Hello')"
}
```

**Validation:**

- `code`: required string, must contain at least one non-whitespace character, maximum 100,000
  characters.
- Only Python source is accepted; no language property exists.
- No standard-input field is accepted in Version 1.
- Unknown fields are rejected.

**Successful Python execution — `201 Created`:** `data.submission` contains the shared detail shape
with `status=success` and `aiExplanation=null`.

**Python syntax/runtime error — `201 Created`:** The request is still an API success because Python
ran and the submission was saved. `status=python_error`, `stderr`/`traceback` contain Python's error,
and `aiExplanation` contains the beginner-friendly explanation when the configured provider succeeds.

**AI provider failure — `201 Created`:** The authoritative Python result remains unchanged and is saved
with `aiExplanation=null`. Provider timeout, network failure, invalid credentials, rate limiting, or an
invalid provider response never becomes an analysis endpoint failure.

**Failures:**

| Status | Code                                                           | When                                                              |
| ------ | -------------------------------------------------------------- | ----------------------------------------------------------------- |
| `400`  | `VALIDATION_ERROR`                                             | Body or code is invalid.                                          |
| `401`  | `AUTHENTICATION_REQUIRED`, `INVALID_TOKEN`, or `TOKEN_EXPIRED` | Token cannot establish a valid current user.                      |
| `413`  | `PAYLOAD_TOO_LARGE`                                            | Request exceeds the configured body limit.                        |
| `422`  | `OUTPUT_LIMIT_EXCEEDED`                                        | Combined stdout/stderr exceeds 1 MiB and execution is terminated. |
| `503`  | `RUNNER_UNAVAILABLE`                                           | Docker/runner fails or the container exceeds its memory limit.    |
| `503`  | `DATABASE_UNAVAILABLE`                                         | The result cannot be persisted.                                   |
| `504`  | `EXECUTION_TIMEOUT`                                            | Execution exceeds five seconds and is terminated.                 |
| `500`  | `INTERNAL_ERROR`                                               | Unexpected server failure.                                        |

A runner failure is saved as `status=runner_error` whenever MongoDB remains available. A
database failure means the persistence guarantee cannot be met, so the endpoint returns failure and
must not claim that the submission was saved.

The runner's internal result always contains exactly `status`, `stdout`, `stderr`, `exitCode`,
`executionTime`, `errorType`, and `traceback`. The public response adds only persistence/API fields;
it never exposes `userId`, container identifiers, host paths, Docker diagnostics, or commands.

## 7. Common Authentication Failure Example

```json
{
  "success": false,
  "message": "Authentication is required.",
  "errors": [
    {
      "code": "AUTHENTICATION_REQUIRED",
      "message": "Provide a valid bearer token."
    }
  ]
}
```

## 8. Health Endpoint

### 8.1 `GET /health`

**Purpose:** Report process and MongoDB connection health for local development and deployment checks.

**Authentication required:** No.

**Request body:** None.

**Success — `200 OK`:**

```json
{
  "success": true,
  "message": "Service health retrieved successfully.",
  "data": {
    "database": {
      "status": "connected"
    },
    "uptime": 12.345,
    "timestamp": "2026-07-21T12:45:00.000Z"
  }
}
```

The database status is one of `connected`, `connecting`, `disconnecting`, `disconnected`, or `unknown`.
Startup normally makes `connected` the only externally observable initial state.

## 9. Method and Route Handling

- Unknown routes return `404 ROUTE_NOT_FOUND` using the standard failure envelope.
- Unsupported methods and unknown routes return `404 ROUTE_NOT_FOUND`; Version 1 does not expose a
  separate method-discovery contract.
- JSON syntax errors return `400 INVALID_JSON`.
- Protected handlers never trust a `userId` supplied in request bodies, queries, or path parameters;
  ownership always comes from the verified JWT subject.

## 10. Operational HTTP Contract

All routes, including failures, return an `X-Request-Id`. A client may send its own request ID only
when it is 1–64 characters, starts with an ASCII letter or digit, and otherwise contains only ASCII
letters, digits, `.`, `_`, or `-`; the backend generates a UUID when that rule is not met. Include this
value when correlating a client failure with structured backend logs.

API responses include `Cache-Control: no-store`, content-sniffing and frame protections, a restrictive
API content policy, referrer protection, and a limited permissions policy. Production responses also
include HSTS. These headers do not change the JSON envelope.

The production frontend forwards same-origin `/api/*` requests to the private backend address. Public
clients should therefore use the deployed frontend origin, for example:

```text
https://code-feedback.example.edu/api/v1/health
https://code-feedback.example.edu/api/v1/auth/login
```

The backend's loopback-bound port is for host diagnostics and should not be exposed publicly. MongoDB
is never an HTTP API and has no published production port.

## 11. Deployment Health Interpretation

`GET /health` remains a stable `200` diagnostic response. Deployment health checks must verify both
the HTTP status and `data.database.status === "connected"`; an HTTP response alone does not prove
database readiness. The endpoint exposes no credentials, host paths, Docker state, or AI-provider
details.

The API has no separate readiness or metrics route in Version 1. This avoids adding a new application
feature during deployment preparation.
