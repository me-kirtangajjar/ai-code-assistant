# Authentication Design

## 1. Scope

Sprint 3 implements email/password registration, login, and authenticated-user lookup. It uses bcrypt
for password hashing and one JWT access token sent as a bearer token. Refresh tokens, server sessions,
password reset, roles, social login, token revocation, and profile editing are outside this sprint.

## 2. Registration Lifecycle

```text
Client request
      ↓
Zod validation and normalization
      ↓
Duplicate email check
      ↓
bcrypt hash with 12 rounds
      ↓
Store User in MongoDB
      ↓
Return 201 with public user
```

Registration does not issue a token. Names are trimmed, emails are trimmed and lowercased, and
passwords are neither transformed nor logged. The service checks for an existing normalized email,
while the database unique index remains the final protection against concurrent duplicate requests.
Both duplicate paths return `409 EMAIL_ALREADY_EXISTS`.

## 3. Login Lifecycle

```text
Client request
      ↓
Zod validation and email normalization
      ↓
Load user including passwordHash
      ↓
bcrypt credential verification
      ↓
Sign seven-day JWT
      ↓
Return accessToken and public user
```

Unknown emails and incorrect passwords both return `401 INVALID_CREDENTIALS`. This avoids disclosing
whether a particular email address is registered.

## 4. JWT Design

- Algorithm: HS256, explicitly allowlisted during verification.
- Secret: backend-only `JWT_SECRET`, validated to contain at least 32 characters.
- Lifetime: exactly seven days, configured as `JWT_EXPIRES_IN=7d`.
- Storage: no token is stored in MongoDB; no refresh-token collection is required.

The application payload is:

```json
{
  "userId": "67f000000000000000000001",
  "email": "asha@example.com"
}
```

The JWT library also adds the standard `iat` and `exp` claims. Password hashes and other user data are
not included. JWT contents are signed, not encrypted, so clients must not treat the payload as secret.

## 5. Protected Request Lifecycle

1. The client sends `Authorization: Bearer <accessToken>`.
2. Middleware requires exactly the Bearer scheme and a non-empty token.
3. JWT verification checks the HS256 signature, expiry, and payload shape.
4. The verified `userId` is resolved against MongoDB.
5. The payload email must match the stored user's normalized email.
6. A safe authenticated-user object is attached to the Express request.
7. `/auth/me` returns only `name`, `email`, and `createdAt`.

Missing or malformed authorization returns `401 AUTHENTICATION_REQUIRED`. Invalid signatures,
malformed payloads, removed users, and identity mismatches return `401 INVALID_TOKEN`. Expired tokens
return `401 TOKEN_EXPIRED`.

## 6. Client Token Lifecycle and Logout

The agreed MCA Version 1 strategy uses a bearer token managed by the frontend. After a successful
login, the client stores the access token, includes it only in requests to the configured backend, and
uses `/auth/me` to verify a restored session. Logout consists only of removing the token and cached user
from client state; there is no logout endpoint.

Bearer tokens must never appear in URLs, logs, analytics, or error reports. Production traffic must
use HTTPS. Because client-side token storage is exposed to successful cross-site scripting, the
frontend avoids raw HTML rendering and the deployed application must retain its security headers.

## 7. Validation Rules

| Field      | Rules                                                              |
| ---------- | ------------------------------------------------------------------ |
| `name`     | Required string, trimmed, 2–100 characters.                        |
| `email`    | Required valid email, trimmed, lowercased, maximum 254 characters. |
| `password` | Required string, 8–64 characters and no more than 72 UTF-8 bytes.  |

Request bodies are strict: unknown properties return `400 VALIDATION_ERROR`. The UTF-8 byte guard
prevents bcrypt from silently ignoring bytes beyond its input limit when a password contains
multibyte characters.

## 8. Failure Mapping

| Condition                          | HTTP status | Error code                |
| ---------------------------------- | ----------- | ------------------------- |
| Invalid request fields             | `400`       | `VALIDATION_ERROR`        |
| Invalid JSON                       | `400`       | `INVALID_JSON`            |
| Duplicate normalized email         | `409`       | `EMAIL_ALREADY_EXISTS`    |
| Unknown email or wrong password    | `401`       | `INVALID_CREDENTIALS`     |
| Missing/malformed bearer header    | `401`       | `AUTHENTICATION_REQUIRED` |
| Invalid JWT or unresolved user     | `401`       | `INVALID_TOKEN`           |
| Expired JWT                        | `401`       | `TOKEN_EXPIRED`           |
| Request body over configured limit | `413`       | `PAYLOAD_TOO_LARGE`       |
| Unexpected failure                 | `500`       | `INTERNAL_ERROR`          |

Every failure uses the standard response envelope and excludes passwords, hashes, tokens, and internal
stack traces.

## 9. Security Decisions

- bcrypt uses a fixed cost factor of 12 for the Sprint 3 requirement.
- Password hashes remain excluded from normal Mongoose queries and all API responses.
- Authentication responses set `Cache-Control: no-store`.
- JWT verification never accepts an algorithm selected only by an untrusted token.
- Database identity is rechecked on each protected request so a removed user cannot retain access.
- Login performs comparable bcrypt work for unknown users to reduce obvious timing differences.
- Rate limiting is recommended before public deployment but is not added in this authentication-only
  sprint because it was not part of the requested dependency or feature scope.
