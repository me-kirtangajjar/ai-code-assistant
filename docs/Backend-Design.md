# Backend Design

This document consolidates the backend design patterns, authentication lifecycle, validation strategy, error handling, and API response standards for the MCA Major Project.

## 1. API Response Standard

Every REST endpoint returns one predictable JSON envelope. Clients can determine the broad result from `success`, show the top-level `message`, and use stable error codes for conditional behavior.

### Success Envelope

```json
{
  "success": true,
  "message": "Human-readable outcome",
  "data": {}
}
```

The success envelope never contains `errors`.

### Failure Envelope

```json
{
  "success": false,
  "message": "Request could not be completed",
  "errors": [
    {
      "code": "STABLE_ERROR_CODE",
      "field": "optional.field.path",
      "message": "Safe explanation"
    }
  ]
}
```

The failure envelope never contains `data`, raw exceptions, stack traces, MongoDB errors, Docker commands, AI prompts, secrets, or password information.

### HTTP and Envelope Consistency
The HTTP status remains authoritative. A `2xx` response must use the success envelope; a `4xx` or `5xx` response must use the failure envelope.

## 2. Authentication Lifecycle

The system uses email/password registration, login, and authenticated-user lookup. It uses bcrypt for password hashing and one JWT access token sent as a bearer token. 

### Registration Lifecycle
Client request → Zod validation/normalization → Duplicate email check → bcrypt hash (12 rounds) → Store User in MongoDB → Return 201 with public user.
*Registration does not issue a token. Duplicate paths return `409 EMAIL_ALREADY_EXISTS`.*

### Login Lifecycle
Client request → Zod validation/normalization → Load user + passwordHash → bcrypt verification → Sign 7-day JWT → Return accessToken and public user.
*Unknown emails and incorrect passwords both return `401 INVALID_CREDENTIALS`.*

### JWT Design
- **Algorithm:** HS256, explicitly allowlisted.
- **Secret:** backend-only `JWT_SECRET` (minimum 32 characters).
- **Lifetime:** 7 days (`JWT_EXPIRES_IN=7d`).
- **Storage:** No token is stored in MongoDB.

### Protected Request Lifecycle
1. The client sends `Authorization: Bearer <accessToken>`.
2. Middleware requires exactly the Bearer scheme and a non-empty token.
3. JWT verification checks signature, expiry, and payload shape.
4. The verified `userId` is resolved against MongoDB and checked for a matching normalized email.
5. A safe authenticated-user object is attached to the Express request.

## 3. Validation Strategy

Validation exists at every trust boundary. 
- **Frontend:** Focused TypeScript validation helpers for forms and editor (e.g. source length limits).
- **Backend HTTP boundary:** Strict Zod schemas in validation middleware. Unknown properties return `400 VALIDATION_ERROR`.
- **Environment boundary:** Validates environment variables at startup.
- **Internal adapters:** Docker identifiers and AI output (trimmed, 20,000 char max) receive runtime checks.
- **Database boundary:** Mongoose schemas enforce required fields, enums, string lengths, and unique indexes.

### Canonical Rules
- `name`: Trimmed, 2–100 characters.
- `email`: Trimmed, lowercased, max 254 characters.
- `password`: Exact value preserved, 8–64 characters, max 72 UTF-8 bytes.
- `code`: Preserved exact source, non-whitespace, max 100,000 characters.

## 4. Error Handling Strategy

### Validation & Client Errors
Zod failures are caught at the HTTP boundary and converted to `400 VALIDATION_ERROR`. Malformed JSON returns `400 INVALID_JSON`; oversized requests return `413 PAYLOAD_TOO_LARGE`.

### Authentication Errors
- Missing/malformed header → `401 AUTHENTICATION_REQUIRED`
- Bad signature, payload, or identity mismatch → `401 INVALID_TOKEN`
- Expired token → `401 TOKEN_EXPIRED`

### Docker and Runner Failures
Runner execution issues map as follows:
- Image/daemon unavailable → `503 RUNNER_UNAVAILABLE` (Saved as runner_error)
- Five-second limit exceeded → `504 EXECUTION_TIMEOUT` (Saved with bounded output)
- Container exceeds 256 MB memory → `503 RUNNER_UNAVAILABLE`
- Combined output exceeds 1 MiB → `422 OUTPUT_LIMIT_EXCEEDED`

### Python Syntax/Runtime Errors
A Python non-zero result is an expected domain outcome. The API returns `201` success, preserving stdout/stderr and exit code. The status is saved as `python_error` and the AI provider attempts to explain it.

### AI Failures
If AI explanation fails (e.g., timeout, mock failure):
1. Preserve the Python result.
2. Store `aiExplanation=null`.
3. Return the normal `201` Python-error result.
4. Log a safe provider-error category.

### Central Error Translation
One final Express error-handling boundary maps unknown thrown values to `500 INTERNAL_ERROR`. Each request generates a safe `X-Request-Id` for structured logging correlation. Logs exclude sensitive tokens, passwords, and source code.
