# Sprint 3: JWT Authentication

## Objective

Implement secure email/password authentication using the existing Express and MongoDB foundation,
without introducing unrelated application features.

## Delivered Scope

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- bcrypt password hashing with 12 rounds
- HS256 JWT signing and verification with a seven-day expiry
- bearer-token authentication middleware
- Zod validation for both request bodies
- duplicate-email and credential failure handling
- centralized standard error responses
- safe public-user serialization

## Explicit Exclusions

- automatic login after registration
- refresh tokens and server-side sessions
- logout endpoint or token revocation
- password reset/change and profile editing
- OAuth or role-based access control
- Python or Docker execution
- AI providers and explanations
- submission history and frontend authentication UI

## Configuration

The backend requires the existing `PORT`, `NODE_ENV`, and `MONGODB_URI` values plus:

```dotenv
JWT_SECRET=replace-with-at-least-32-random-characters
JWT_EXPIRES_IN=7d
```

The configuration module validates these values during startup. Secrets must remain in the untracked
`backend/.env` file and must not be committed.

## Response Contract

Successful requests use:

```json
{
  "success": true,
  "message": "Human-readable message.",
  "data": {}
}
```

Failures use:

```json
{
  "success": false,
  "message": "Human-readable message.",
  "errors": [
    {
      "code": "STABLE_ERROR_CODE",
      "field": "optional.field",
      "message": "Safe explanation."
    }
  ]
}
```

## Manual Acceptance Checklist

- [ ] A valid student can register and receives `201` without a token.
- [ ] The stored password is a bcrypt hash and never appears in API output.
- [ ] A duplicate normalized email receives `409 EMAIL_ALREADY_EXISTS`.
- [ ] Valid credentials return `200`, `accessToken`, and the public user.
- [ ] A wrong password receives `401 INVALID_CREDENTIALS`.
- [ ] A valid bearer token can access `/auth/me`.
- [ ] `/auth/me` returns only name, email, and createdAt.
- [ ] A missing or malformed bearer header receives `401 AUTHENTICATION_REQUIRED`.
- [ ] An invalid token receives `401 INVALID_TOKEN`.
- [ ] Lint, type-check, build, and formatting checks pass.

## Verification Commands

From the repository root:

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm format:check
```

See [API.md](API.md) for endpoint payloads and [Authentication.md](Authentication.md) for lifecycle and
security decisions.
