# Testing Checklist

## 1. Automated Quality Gates

Final audit status on 2026-07-22:

- [x] `pnpm typecheck`
- [x] `pnpm lint`
- [x] `pnpm --filter @ai-code-error-feedback/backend test`
- [x] `pnpm build`
- [x] `pnpm format:check`
- [x] `pnpm audit --prod`
- [x] Compose interpolation/configuration validation
- [x] Backend entrypoint shell syntax validation
- [x] Next.js standalone server path validation
- [x] Built backend startup, MongoDB health, validation/auth failure envelopes, and graceful shutdown
- [ ] Production image build on a Docker-authorized host

Automated backend tests cover AI gating/provider degradation, prompt safety, HTTP security and response
boundaries, request correlation, and runner classification. Frontend verification remains manual by
the approved Version 1 testing strategy.

## 2. Prerequisites for Final Live Test

- Docker daemon running and current account authorized to access its socket.
- MongoDB running, or the production Compose stack configured.
- Python runner image built with the exact configured tag.
- Untracked backend/frontend environments contain valid local values.
- Production tests use non-sample JWT and MongoDB secrets.

## 3. Authentication

- [ ] Register a valid user; verify `201`, normalized email, and no access token.
- [ ] Reject invalid name, email, short/long password, oversized UTF-8 password, and unknown fields.
- [ ] Reject a duplicate normalized email with `409 EMAIL_ALREADY_EXISTS`.
- [ ] Login with valid credentials; verify `200`, user shape, and access token.
- [ ] Return the same `401 INVALID_CREDENTIALS` contract for unknown email and wrong password.
- [ ] Access `/auth/me` with a valid bearer token.
- [ ] Reject missing, malformed, invalid, and expired tokens.
- [ ] Confirm responses and logs never expose password/passwordHash or JWT contents.
- [ ] Confirm browser refresh restores a valid session and logout removes it locally.

## 4. Python Execution

- [ ] `print("Hello World")` returns `success`, stdout, exit code `0`, and no AI explanation.
- [ ] `print(1 / 0)` returns `python_error/ZeroDivisionError` and an explanation.
- [ ] Invalid Python syntax returns `python_error/SyntaxError` and an explanation.
- [ ] A program exceeding five seconds returns `504 EXECUTION_TIMEOUT` and is saved as runner error.
- [ ] Output above 1 MiB returns `422 OUTPUT_LIMIT_EXCEEDED` with bounded saved output.
- [ ] A memory-intensive program returns a controlled runner failure.
- [ ] Docker unavailable returns `503 RUNNER_UNAVAILABLE` without Docker diagnostics.
- [ ] Confirm execution containers and temporary workspaces are removed after every path.
- [ ] Confirm execution has no network, stdin, writable root filesystem, or root user.

## 5. AI Explanation

- [ ] Mock provider output is deterministic for ZeroDivisionError and SyntaxError.
- [ ] Success and runner errors never invoke AI and store `null`.
- [ ] Gemini timeout/network/auth/rate-limit failure preserves the Python result and stores `null`.
- [ ] Prompt contains only code plus Python error context and no JWT, identity, IDs, or Docker errors.
- [ ] Frontend safely displays explanation, suggested fix, corrected code, and null fallback.

## 6. History, Profile, and Ownership

- [ ] Every successful, Python-error, and runner-error attempt appears in history.
- [ ] History is newest first and pagination metadata/buttons remain consistent.
- [ ] Empty history displays the intended empty state.
- [ ] Detail displays code, streams, status, time, error, explanation, and timestamp.
- [ ] A user cannot list or retrieve another user's submission.
- [ ] Missing and foreign-owned IDs return the same `404 SUBMISSION_NOT_FOUND`.
- [ ] Profile identity is correct and statistics equal the owned submission records.

## 7. UI and Accessibility

- [ ] Test login, register, dashboard, history, detail, and profile at mobile and desktop widths.
- [ ] Navigate forms, editor controls, navigation, pagination, and logout with the keyboard.
- [ ] Confirm visible focus, labels, field errors, loading announcements, and disabled states.
- [ ] Confirm loading, empty, network error, 404, and application error states.
- [ ] Confirm no raw HTML rendering of backend, Python, or AI content.

## 8. Production and Operations

- [ ] Build runner, backend, and frontend images from a clean checkout.
- [ ] Confirm all long-running Compose services become healthy.
- [ ] Verify health directly and through the frontend proxy.
- [ ] Confirm MongoDB has no public host port and backend is host-loopback only.
- [ ] Confirm application containers run non-root and with read-only root filesystems.
- [ ] Test graceful `SIGTERM`, restart policy, persistent MongoDB volume, backup, and restore.
- [ ] Terminate TLS upstream before accepting real bearer tokens.

Record tester, date, environment, commit/archive identifier, and evidence for every live acceptance run.
