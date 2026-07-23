# Sprint 7 — Submission History and Profile

## 1. Objective

Sprint 7 adds authenticated submission history and a read-only student profile to the existing
application. It does not change authentication, the MongoDB schema, Python execution, AI explanation,
or deployment.

## 2. Backend Scope

The following protected endpoints are implemented:

| Method | Endpoint       | Responsibility                                        |
| ------ | -------------- | ----------------------------------------------------- |
| `GET`  | `/history`     | Newest-first, paginated submissions for one user.     |
| `GET`  | `/history/:id` | One complete submission owned by the current user.    |
| `GET`  | `/profile`     | Read-only identity and per-user execution statistics. |

All paths are relative to `/api/v1` and require the existing bearer JWT middleware.

### 2.1 History pagination

- `page` defaults to `1` and must be a positive integer.
- `limit` defaults to `10` and must be an integer from `1` through `50`.
- Unknown query properties are rejected.
- Results sort by `createdAt` descending and then `_id` descending for stable newest-first ordering.
- List code previews are generated at read time and limited to 160 characters; stored code is not
  changed.

### 2.2 Ownership security

Both repository queries include the authenticated user's ObjectId. Detail lookup never performs an
ID-only read. A record owned by another user and an absent record both return
`404 SUBMISSION_NOT_FOUND`, preventing cross-account resource discovery.

### 2.3 Profile statistics

One MongoDB aggregation calculates:

- total runs;
- successful runs (`success`);
- failed runs (`python_error` plus `runner_error`).

The profile identity comes from the user already verified by authentication middleware. No profile
fields are editable.

## 3. Frontend Scope

### 3.1 `/history`

Displays status, language, execution time, error type, created date, and a code preview. Previous and
Next controls use backend pagination. Loading, empty, error, and populated states are explicit.

### 3.2 `/history/[id]`

Displays submitted code, stdout, stderr, execution time, exit code, status, error type, timestamp, and
the existing parsed AI explanation, suggested fix, and corrected code presentation.

### 3.3 `/profile`

Displays name, email, account creation time, total runs, successful runs, and failed runs. The page has
no editing or password-management controls.

Frontend components never call `fetch` directly. Typed History/Profile services use the shared API
client, and focused hooks handle request lifecycle, expired sessions, and view state.

## 4. Response and Failure Behavior

- Successful reads use the standard `{ success, message, data }` envelope.
- Authentication failures use the existing JWT error behavior.
- Invalid pagination returns `400 VALIDATION_ERROR`.
- Invalid detail identifiers return `400 INVALID_SUBMISSION_ID`.
- Missing or foreign submissions return `404 SUBMISSION_NOT_FOUND`.
- MongoDB read failures return `503 DATABASE_UNAVAILABLE`.
- Private read responses set `Cache-Control: no-store`.

## 5. Verification Checklist

- [x] Backend and frontend TypeScript checks pass.
- [x] Backend and frontend lint checks pass.
- [x] History is authenticated and paginated.
- [x] History sorts newest first.
- [x] Detail lookup enforces ownership in the query.
- [x] Profile statistics are scoped to the authenticated user.
- [x] History, detail, and profile pages have responsive loading and error states.
- [x] Empty history and zero-statistics profile states are supported.
- [x] Authentication, Python runner, AI service, and database schema remain unchanged.

## 6. Out of Scope

- History search, filtering, deletion, or sorting controls.
- Profile editing, password changes, or profile pictures.
- Deployment changes.
- Any authentication, runner, AI-provider, or database-schema redesign.
