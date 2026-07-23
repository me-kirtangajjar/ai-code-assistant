# Sprint 6: Frontend Phase 1

## Objective

Deliver the student-facing Next.js application for registration, login, authenticated Python execution,
and result presentation without changing any backend, runner, database, or AI-provider behavior.

## Delivered Pages

| Route        | Access        | Responsibility                                      |
| ------------ | ------------- | --------------------------------------------------- |
| `/`          | Public        | Redirects to login or dashboard after auth restore. |
| `/login`     | Public only   | Validates credentials and establishes the session.  |
| `/register`  | Public only   | Creates an account, then redirects to login.        |
| `/dashboard` | Authenticated | Hosts Monaco, execution controls, and results.      |

No history or profile pages are included.

## Frontend Architecture

```text
App Router pages
      │
      ├── reusable components
      ├── AuthContext + useAuth
      └── useExecution
              │
              ▼
       typed service layer
              │
              ▼
       shared API client
              │ same-origin /api rewrite
              ▼
       existing Express backend
```

Components never call `fetch`. `auth.service.ts` and `analysis.service.ts` own endpoint-specific
requests through the shared response-envelope client.

## Authentication Lifecycle

1. Login returns a bearer JWT, which is stored under one namespaced local-storage key.
2. `AuthProvider` restores the token and verifies it through `GET /auth/me`.
3. Missing or rejected tokens redirect protected pages to login.
4. Authenticated users visiting login/register redirect to the dashboard.
5. Logout removes local state and storage, then redirects to login.
6. A `401` or `403` during execution clears the session automatically.

If session verification fails because of a network/server problem rather than rejected authentication,
the token is retained and the dashboard shows a recoverable warning.

## Editor and Results

- Monaco uses Python mode and starts with `print("Hello World")`.
- The run button is disabled for blank code and while execution is pending.
- The editor is read-only during an active request.
- Results show status, execution time, exit code, error type, stdout, and stderr.
- AI text is separated into Explanation, Suggested Fix, and Corrected Code when available.
- A null explanation displays exactly `No AI explanation available.`.
- AI/backend strings are rendered as text, never as raw HTML.

## API Connectivity

Set the server-only frontend variable:

```env
BACKEND_API_URL=http://localhost:4000
```

Next.js rewrites `/api/:path*` to the backend origin. This keeps browser requests same-origin and avoids
requiring a Sprint 6 backend CORS change.

## Error Handling

| Condition       | Frontend behavior                                           |
| --------------- | ----------------------------------------------------------- |
| `401` / `403`   | Clears rejected session and redirects to login.             |
| `404`           | Shows a requested-service-not-found message.                |
| `409`           | Shows the backend duplicate-account message.                |
| `422`           | Shows the output-limit failure.                             |
| `500` / `503`   | Shows a safe server/service availability message.           |
| `504`           | Shows the execution-timeout message.                        |
| Network failure | Shows a connection message without exposing technical data. |

Backend failure-envelope messages remain authoritative when present.

## Commands

```bash
corepack pnpm install
cp frontend/.env.example frontend/.env.local
corepack pnpm dev:backend
corepack pnpm dev:frontend
```

Open `http://localhost:3000`.

## Verification

- Frontend ESLint passes with zero warnings.
- Frontend TypeScript checking passes.
- Next.js production build succeeds for all four routes.
- Monaco and the editor runtime are pinned in the frontend workspace.
- Authentication, execution, failure, and AI presentation paths have explicit manual test steps below.

## Manual Test Checklist

1. Register a new account and confirm redirect to login.
2. Try duplicate/invalid registration and confirm field or form errors.
3. Log in and confirm redirect to the protected dashboard.
4. Refresh the dashboard and confirm the JWT session is restored.
5. Log out and confirm the dashboard redirects to login.
6. Run `print("Hello World")` and verify stdout, success, and timing.
7. Run `1 / 0` and verify `ZeroDivisionError`, stderr, explanation, suggested fix, and corrected code.
8. Test a null AI explanation and verify the fallback message.
9. Stop the backend and confirm the network/service error is readable.
10. Test narrow and wide viewport layouts.

## Technical Decisions

- Bearer JWT persistence uses local storage because that is the approved project authentication design.
- A same-origin Next.js rewrite solves browser connectivity without modifying Express.
- Monaco is dynamically loaded as a client-only component so App Router prerendering remains valid.
- No state library, component framework, animation library, or Markdown/HTML renderer was introduced.
- Frontend validation improves usability but never replaces backend validation.

## Explicit Exclusions

- History and profile.
- Dark mode and animations.
- Frontend tests beyond the approved manual-first scope.
- Backend, database, Python runner, Docker, and AI-provider modifications.
