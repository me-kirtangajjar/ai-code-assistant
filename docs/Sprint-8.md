# Sprint 8 — Quality, Accessibility, Reliability, and Security

## 1. Objective

Sprint 8 improves the completed application without adding business features. Existing API paths,
response data, authentication behavior, persistence, Python execution, and AI explanation remain
compatible.

## 2. Frontend Improvements

### 2.1 Accessibility and keyboard use

- Added a keyboard-visible skip link to the main content region.
- Added consistent visible focus treatment for links.
- Added `aria-current` and visible active state to authenticated navigation.
- Connected password guidance and field errors to their inputs.
- Focuses the first invalid field after client-side form validation.
- Added `aria-busy`, `aria-disabled`, `aria-atomic`, and improved status semantics where appropriate.
- Preserved reduced-motion preferences and introduced no decorative animation.

### 2.2 Loading and error states

- Added App Router `loading.tsx`, `error.tsx`, and `not-found.tsx` boundaries.
- Improved shared loading presentation and made protected-route loading text page-neutral.
- The error boundary offers explicit retry and dashboard recovery actions.
- Existing History, Profile, execution, and authentication empty/error states remain intact.

### 2.3 Forms and client reliability

- Login and registration clear stale field errors when a field changes.
- Submit buttons remain disabled and expose busy state during requests.
- The shared API client now rejects malformed success envelopes instead of trusting arbitrary `2xx`
  JSON.
- One protected-request error helper replaces repeated hook logic.
- Only `401` authentication failures clear local authentication; a future `403` authorization response
  will preserve the valid session.

## 3. Backend Improvements

### 3.1 Request correlation and logging

- Accepts a caller-supplied `X-Request-Id` only when it uses a safe 1–64 character format; otherwise a
  UUID is generated.
- Returns the request ID on every response.
- Logs method, route template, status, duration, and request ID after response completion.
- Redacts sensitive context keys, bearer values, and MongoDB credentials from shared logs.
- Does not log request bodies, tokens, passwords, Python code, stdout, stderr, or AI content.

### 3.2 Error and validation consistency

- Centralized standard failure-envelope emission in the final error middleware.
- Unknown routes no longer reflect attacker-controlled paths in response messages.
- Shared Zod issue mapping removes duplicated validation response construction.
- Invalid JSON, oversized input, expected application errors, and unexpected failures retain their
  existing status codes and stable error codes.

### 3.3 Security headers

Every API response includes:

- `Cache-Control: no-store`;
- restrictive `Content-Security-Policy` for the JSON API;
- `Cross-Origin-Resource-Policy: same-origin`;
- restrictive `Permissions-Policy`;
- `Referrer-Policy: no-referrer`;
- `X-Content-Type-Options: nosniff`;
- `X-Frame-Options: DENY`.

Production responses also include HTTP Strict Transport Security. Express technology disclosure stays
disabled.

### 3.4 Environment validation

- MongoDB URI and JWT secret reject outer whitespace.
- JWT secret validation confirms at least 32 UTF-8 bytes.
- Production rejects obvious example/development JWT secrets.
- Unused CORS configuration was removed from the example because browser requests already use the
  same-origin Next.js rewrite.

## 4. Security Review

- JWT verification remains restricted to HS256 and validates the `userId` and email payload.
- The existing middleware continues to verify the current user and email against MongoDB.
- Request bodies and pagination continue to use strict Zod schemas.
- API errors expose only controlled messages and codes.
- Rate limiting remains deferred because an appropriate limit depends on deployment topology and would
  intentionally change request acceptance behavior.

## 5. Verification

- Backend TypeScript, lint, build, and tests pass.
- Frontend TypeScript, lint, and production build pass.
- Formatting checks pass.
- HTTP tests verify security headers, safe request-ID preservation/replacement, non-reflective `404`
  responses, and consistent invalid-JSON responses.
- Existing AI-provider tests continue to pass, confirming no AI behavior regression.

## 6. Out of Scope

- New user-facing workflows or API endpoints.
- Database schema or index changes.
- Authentication lifecycle changes or refresh tokens.
- Python Runner or AI-provider behavior changes.
- Deployment and infrastructure changes.
- Rate-limiting policy.
