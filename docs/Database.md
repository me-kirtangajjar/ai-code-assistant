# Database Design and MongoDB Implementation

## 1. Purpose and Ownership

MongoDB stores student identities and every submitted Python execution attempt. Mongoose owns schema
mapping and connection lifecycle in `backend/src/database`. Only the backend accesses MongoDB; the
frontend, runner containers, and AI providers have no database credentials.

No refresh-token, session, provider, or audit collection exists because Version 1 does not require
one.

## 2. Collections

| Collection    | Model             | Purpose                                             |
| ------------- | ----------------- | --------------------------------------------------- |
| `users`       | `UserModel`       | Student identity and bcrypt password hash.          |
| `submissions` | `SubmissionModel` | Python execution facts and optional AI explanation. |

## 3. `users`

| Field          | BSON type  | Required | Default             | Behavior                                     |
| -------------- | ---------- | -------- | ------------------- | -------------------------------------------- |
| `_id`          | `ObjectId` | Yes      | MongoDB-generated   | Primary identifier.                          |
| `name`         | `String`   | Yes      | None                | Trimmed; 2–100 characters.                   |
| `email`        | `String`   | Yes      | None                | Trimmed, lowercased; maximum 254 characters. |
| `passwordHash` | `String`   | Yes      | None                | Excluded from normal query selection.        |
| `createdAt`    | `Date`     | Yes      | Current server time | Created by Mongoose timestamps.              |
| `updatedAt`    | `Date`     | Yes      | Current server time | Maintained by Mongoose timestamps.           |

Indexes:

- MongoDB primary `{ _id: 1 }` unique index.
- Mongoose unique `{ email: 1 }` index for normalized-email uniqueness.

Registration checks for an existing email for a clear response and also translates duplicate-key code
`11000`, so concurrent requests remain protected by the database constraint.

## 4. `submissions`

| Field           | BSON type          | Required | Default             | Behavior                                             |
| --------------- | ------------------ | -------- | ------------------- | ---------------------------------------------------- |
| `_id`           | `ObjectId`         | Yes      | MongoDB-generated   | Primary identifier.                                  |
| `userId`        | `ObjectId`         | Yes      | None                | References Mongoose model `User`.                    |
| `code`          | `String`           | Yes      | None                | Exact submitted source; maximum 100,000 characters.  |
| `language`      | `String`           | Yes      | `python`            | Enum restricted to `python`.                         |
| `status`        | `String`           | Yes      | None                | `success`, `python_error`, or `runner_error`.        |
| `stdout`        | `String`           | No       | Empty string        | Bounded captured standard output.                    |
| `stderr`        | `String`           | No       | Empty string        | Bounded captured standard error.                     |
| `exitCode`      | `Number` or `Null` | No       | `null`              | Observed Python/container exit code when meaningful. |
| `executionTime` | `Number` or `Null` | No       | `null`              | Non-negative elapsed milliseconds.                   |
| `errorType`     | `String` or `Null` | No       | `null`              | Python exception or controlled runner category.      |
| `traceback`     | `String` or `Null` | No       | `null`              | Python-generated diagnostic for Python errors.       |
| `aiExplanation` | `String` or `Null` | No       | `null`              | Explanation only; maximum 20,000 characters.         |
| `createdAt`     | `Date`             | Yes      | Current server time | Created by Mongoose timestamps.                      |
| `updatedAt`     | `Date`             | Yes      | Current server time | Maintained by Mongoose timestamps.                   |

Implemented indexes:

- MongoDB primary `{ _id: 1 }` unique index.
- `{ userId: 1 }` for ownership-scoped reads and statistics.
- `{ createdAt: -1 }` for newest-first ordering support.

History list and detail predicates always include the authenticated `userId`. MongoDB does not enforce
foreign keys, so ownership is enforced in repository queries rather than through client-supplied data.

## 5. Persistence Rules

- Every successful Python run, Python error, and runner error is saved when MongoDB is available.
- `aiExplanation` is non-null only when a `python_error` explanation succeeds.
- A persistence failure makes `/analysis/run` fail rather than claiming the attempt was saved.
- API mappers omit `userId`, `updatedAt`, Mongoose internals, and password data.
- Profile statistics count `success` separately and treat `python_error` plus `runner_error` as failed
  runs.

## 6. Connection Lifecycle

1. Startup validates environment configuration.
2. Mongoose command buffering is disabled and strict query mode is enabled.
3. The backend connects with a pool limit of 10 and a 10-second server-selection timeout.
4. `UserModel.init()` ensures the unique email index is initialized before HTTP traffic.
5. Express listens only after MongoDB connects.
6. Health reports the current Mongoose connection state.
7. `SIGINT` and `SIGTERM` stop HTTP acceptance before disconnecting Mongoose.
8. Startup and connection failures are logged without exposing the URI.

Production Compose persists MongoDB data in the `mongodb-data` named volume. That volume requires a
separate, tested backup process; persistence alone is not a backup.

## 7. Current Scale Note

The current separate `userId` and `createdAt` indexes satisfy the approved schema. A compound
`{ userId: 1, createdAt: -1, _id: -1 }` index may improve large per-user histories, but adding it should
follow measured query analysis because Version 1 has no migration framework or large-volume target.
