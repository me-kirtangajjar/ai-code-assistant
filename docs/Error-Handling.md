# Error Handling Strategy

## 1. Objectives

- Return predictable responses using the [standard envelope](API-Response-Standard.md).
- Distinguish client mistakes, Python results, dependency failures, and programming defects.
- Preserve useful server diagnostics without exposing internal details.
- Ensure containers and other resources are cleaned up on every path.
- Allow AI explanation to fail without losing a valid Python result.

## 2. Error Categories

| Category            | Example                     | HTTP treatment                                   |
| ------------------- | --------------------------- | ------------------------------------------------ |
| Client input        | Invalid email or pagination | `400` failure                                    |
| Authentication      | Missing or expired token    | `401` failure                                    |
| Resource lookup     | Submission not owned/found  | `404` failure                                    |
| Conflict            | Duplicate normalized email  | `409` failure                                    |
| Python result       | `SyntaxError`, `NameError`  | `201` analysis success with `python_error`       |
| Runner policy       | Output limit exceeded       | `422` failure, attempt stored when possible      |
| Runner dependency   | Docker unavailable          | `503` failure, attempt stored when possible      |
| Runner timeout      | Five-second limit reached   | `504` failure, attempt stored when possible      |
| AI dependency       | Mock/provider call fails    | `201` analysis success with `aiExplanation=null` |
| Database dependency | MongoDB unavailable         | `503` failure                                    |
| Programming defect  | Unexpected exception        | `500` failure                                    |

## 3. Validation Errors

Zod failures are caught at the HTTP boundary and converted to `400 VALIDATION_ERROR`. Each useful issue
includes a stable field path and message. Validation responses never contain rejected password values,
source code, stack traces, or the raw Zod object.

Malformed JSON returns `400 INVALID_JSON`; an oversized request returns `413 PAYLOAD_TOO_LARGE` before
feature logic runs.

## 4. Authentication Errors

Authentication middleware produces all bearer-token failures consistently:

- missing/malformed header → `401 AUTHENTICATION_REQUIRED`;
- bad signature or payload claims → `401 INVALID_TOKEN`;
- expired token → `401 TOKEN_EXPIRED`;
- valid token for a nonexistent or identity-mismatched user → `401 INVALID_TOKEN`.

Login uses `INVALID_CREDENTIALS` for both unknown email and incorrect password. The frontend clears
local authentication state for invalid/expired token codes, but not for unrelated server failures.

## 5. Docker and Runner Failures

The runner returns controlled error categories rather than leaking command strings or host exceptions.
Detailed precedence and categories are defined in
[Execution Error Classification](Error-Classification.md).
The analysis service maps them as follows:

| Runner condition                                          | API result                  | Persistence state                                             |
| --------------------------------------------------------- | --------------------------- | ------------------------------------------------------------- |
| Image/daemon unavailable or container cannot start safely | `503 RUNNER_UNAVAILABLE`    | Save `runner_error` if MongoDB is available                   |
| Five-second limit exceeded                                | `504 EXECUTION_TIMEOUT`     | Save `runner_error` with duration and partial bounded output  |
| Container exceeds 256 MB memory                           | `503 RUNNER_UNAVAILABLE`    | Save `runner_error` as `MemoryLimitExceeded`                  |
| Combined output exceeds 1 MiB                             | `422 OUTPUT_LIMIT_EXCEEDED` | Terminate and save `runner_error` with bounded partial output |
| Unexpected runner adapter failure                         | `503 RUNNER_UNAVAILABLE`    | Save a safe runner error when possible                        |

Every path attempts to terminate and remove the execution container. Cleanup failures are logged with
the request/execution identifier but do not replace the primary response. AI is never invoked for a
runner error.

## 6. Python Syntax and Runtime Errors

A Python non-zero result containing a Python-generated syntax/runtime error is an expected domain
outcome. The API returns `201` because it successfully executed and stored the analysis attempt.

The response preserves stdout, stderr, exit code, and an optionally deterministic error type. AI may
explain the error but cannot create, remove, or reclassify it. The frontend displays this as an analysis
result rather than a network/server-error banner.

## 7. AI Failures

AI explanation uses graceful degradation:

1. Preserve the Python result.
2. Store `aiExplanation=null`.
3. Return the normal `201` Python-error result; `aiExplanation=null` is the explicit degradation
   signal.
4. Log a safe provider-error category without prompts, source code, stderr, credentials, or raw provider
   response bodies.

The backend does not retry indefinitely. Any limited retry policy introduced for a remote provider must
stay within the HTTP request budget and be documented separately.

## 8. Database Failures

- Duplicate email index violation → `409 EMAIL_ALREADY_EXISTS`.
- Connection loss, selection timeout, or unavailable database → `503 DATABASE_UNAVAILABLE`.
- Invalid persistence data caused by a server defect → `500 INTERNAL_ERROR` and an internal log.

If a submission cannot be stored, `/analysis/run` returns failure even if Python ran, because the API
must not claim a completed saved submission. The response never includes MongoDB collection names,
queries, hosts, or driver messages.

## 9. Central Error Translation

The implementation uses one final Express error-handling boundary. Expected application errors carry
an HTTP status, stable code, safe message, and optional field. Unknown thrown values become
`500 INTERNAL_ERROR`.

Controllers should pass failures to this boundary rather than constructing unrelated formats. Services
throw domain/application errors without depending on Express response objects. Repository and adapter
errors are translated before reaching the client.

## 10. Logging and Correlation

Each request receives or generates a safe request ID. The API returns it in `X-Request-Id`; structured
logs use the same ID. Logs contain category, status, method, route template, duration, and safe component
metadata. They exclude tokens, authorization headers, passwords, hashes, source code, stdout, stderr,
AI prompts, and secrets.

Completed requests are logged at `info`. Unexpected failures and selected dependency failures are
logged at `error`; controlled cleanup and AI degradation use `warn`. Stack traces are not currently
serialized by the shared logger.

## 11. Frontend Behavior

- Parse every response through the standard envelope contract.
- Map validation error fields to forms and show the top-level message for general failures.
- Clear authentication after any protected request returns `401`; retain the session for other status
  codes.
- Display Python errors as saved analysis results.
- Show a non-blocking explanation-unavailable state for AI failure.
- Allow a user to retry transient failures manually without automatically resubmitting code in a loop.
- Fall back to a generic safe message if a network failure prevents receipt of an API envelope.
