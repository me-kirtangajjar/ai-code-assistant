# Authentication Sprint: Definition of Done

> Historical planning artifact: this checklist predates the approved Sprint 3 implementation. Items
> such as CORS, configurable bcrypt cost, frontend Zod, and JWT `sub`/`iss`/`aud` claims were not part
> of the final contract. The implemented JWT payload is `{ userId, email }`, bcrypt uses 12 rounds,
> Next.js uses a same-origin server rewrite, and frontend validation uses focused TypeScript helpers.
> Use [Testing Checklist](Testing%20Checklist.md) for final acceptance status.

## 1. Scope

The authentication sprint delivers the complete Version 1 registration, login, bearer-token,
authenticated-user, and logout lifecycle described in [Authentication Design](Authentication.md).
No refresh tokens, password reset, roles, social login, or unrelated profile features are included.

## 2. Backend Foundation

- [ ] MongoDB connection lifecycle is implemented with startup failure handling and graceful shutdown.
- [ ] Backend environment configuration is validated, including MongoDB, JWT, bcrypt, port, and CORS
      values.
- [ ] Mongoose user persistence matches the `users` collection contract and creates the unique email
      index.
- [ ] Password hashes are excluded from normal queries and every API representation.
- [ ] Shared success/failure response helpers match the standard envelope.
- [ ] Central not-found and error middleware returns safe predictable responses.

## 3. Authentication API

- [ ] `POST /api/v1/auth/register` validates input, normalizes email, hashes the password, stores the
      user, handles duplicate races, and returns `201` without issuing a token.
- [ ] `POST /api/v1/auth/login` validates input, verifies bcrypt credentials, and returns the documented
      JWT response.
- [ ] `GET /api/v1/auth/me` validates the bearer token and returns the current public user.
- [ ] JWT signing includes `sub`, `iss`, `aud`, `iat`, and `exp` with HS256 and the configured lifetime.
- [ ] Authentication middleware distinguishes missing, invalid, expired, and orphaned-user tokens.
- [ ] Protected request context derives user identity only from the verified JWT subject.
- [ ] CORS accepts only the configured frontend origin.

## 4. Validation and Security

- [ ] Zod schemas enforce the documented name, email, password, body strictness, and UTF-8 bcrypt limit.
- [ ] bcrypt uses the validated configured work factor, defaulting to 12.
- [ ] Login returns the same `INVALID_CREDENTIALS` response for unknown email and wrong password.
- [ ] Tokens, passwords, hashes, and secrets are absent from logs and error responses.
- [ ] Production configuration rejects an insufficient JWT secret.
- [ ] Authentication responses use safe cache headers and production documentation requires HTTPS.

## 5. Frontend Authentication Flow

- [ ] Registration and login forms apply matching Zod validation and show field-specific API errors.
- [ ] The frontend API service handles the standard response envelope and bearer header.
- [ ] Successful login stores the token and public user using the agreed client-side strategy.
- [ ] Application startup uses `/auth/me` to restore or reject the stored session.
- [ ] Protected pages redirect unauthenticated users to login.
- [ ] Logout removes the local token/user state and redirects without calling a logout endpoint.
- [ ] Invalid or expired token responses clear local authentication state.

Frontend verification remains manual in Version 1; this checklist does not require Jest or Cypress.

## 6. Automated Backend Verification

API tests use the agreed non-Jest backend test approach and an isolated test database. They cover:

- [ ] successful registration and normalized email storage;
- [ ] invalid registration fields;
- [ ] duplicate email, including case normalization;
- [ ] successful login and documented JWT claims;
- [ ] unknown email and incorrect password with identical client responses;
- [ ] successful `/auth/me` request;
- [ ] missing, malformed, invalid, expired, and nonexistent-user tokens;
- [ ] password hash never appearing in API output;
- [ ] database-unavailable and unexpected-error envelope behavior.

## 7. Documentation and Quality Gates

- [ ] Environment examples contain all required authentication variables without real secrets.
- [ ] API, database, authentication, and deployment documentation reflect the implemented behavior.
- [ ] Installation and run commands work on the supported development environment.
- [ ] Linting, formatting, type-checking, backend tests, and production builds pass.
- [ ] Dependencies have no unresolved peer conflicts or known unaddressed critical vulnerabilities.
- [ ] A manual review confirms no authentication data leaks and no out-of-scope features.

## 8. Acceptance Scenarios

Authentication is done only when a new student can register, log in, reload into a verified session,
access a protected endpoint, log out locally, and be rejected after token removal or expiry. Duplicate
accounts, invalid credentials, invalid tokens, and database failures must all produce the documented
status and response format.
