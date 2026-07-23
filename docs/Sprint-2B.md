# Sprint 2B: MongoDB Foundation

## Objective

Create the production-quality MongoDB and Mongoose foundation that future feature sprints can use,
without implementing authentication, analysis, Python execution, AI, or other business logic.

## Implemented Scope

- Centralized MongoDB connection and disconnection functions.
- Environment validation for `NODE_ENV`, `PORT`, and `MONGODB_URI`.
- User Mongoose schema with normalized uniquely indexed email and timestamps.
- Submission Mongoose schema with a User reference, Python language default, execution-result fields,
  timestamps, and requested indexes.
- Express startup after successful database connection.
- Graceful HTTP and Mongoose shutdown for `SIGINT` and `SIGTERM`.
- Structured safe logs for startup, database connection, failure, and shutdown.
- Public `GET /api/v1/health` endpoint.

## Environment Contract

| Variable         | Sprint 2B use                                               |
| ---------------- | ----------------------------------------------------------- |
| `NODE_ENV`       | Required and validated as development, test, or production. |
| `PORT`           | Required integer from 1 through 65535.                      |
| `MONGODB_URI`    | Required MongoDB or MongoDB SRV URI.                        |
| `JWT_SECRET`     | Example only; not loaded or used.                           |
| `JWT_EXPIRES_IN` | Example only; not loaded or used.                           |

No runtime fallback values are hardcoded. Invalid or missing active values cause controlled startup
failure.

## Startup Lifecycle

```text
Process starts
      ↓
Validate environment
      ↓
Connect Mongoose
      ├── failure → safe log → cleanup → non-zero exit
      ↓ success
Create Express application
      ↓
Listen on configured port
```

The backend never reports successful startup before MongoDB is connected.

## Shutdown Lifecycle

```text
SIGINT or SIGTERM
      ↓
Stop accepting HTTP requests
      ↓
Close active Mongoose connection
      ↓
Log completion and allow process exit
```

Repeated shutdown signals do not start duplicate cleanup operations.

## Health Contract

`GET /api/v1/health` requires no authentication and returns the standard success envelope with:

- Mongoose connection status;
- process uptime in seconds;
- server-generated UTC timestamp.

The endpoint contains no user, authentication, Python, AI, or business behavior.

## Explicit Exclusions

- Password hashing
- Registration or login
- JWT signing or verification
- Authentication middleware or auth routes
- User or submission repositories
- Python/Docker execution
- AI providers or explanations
- History, profile, or analysis behavior

`passwordHash` and `aiExplanation` are storage fields only. Sprint 2B does not produce their values.

## Acceptance Criteria

- Backend lint, type checking, and compilation pass.
- Mongoose connects with a valid URI and fails cleanly with an invalid URI.
- User and Submission schemas expose the documented fields, defaults, references, timestamps, and
  indexes.
- The health endpoint returns connected database status, uptime, and UTC timestamp.
- `SIGINT`/`SIGTERM` closes HTTP and MongoDB resources without an unhandled rejection.
- No out-of-scope feature code exists.
