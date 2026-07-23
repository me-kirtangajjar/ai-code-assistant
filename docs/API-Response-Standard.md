# Standard API Response Format

## 1. Purpose

Every REST endpoint returns one predictable JSON envelope. Clients can determine the broad result
from `success`, show the top-level `message`, and use stable error codes for conditional behavior.

## 2. Success Envelope

```json
{
  "success": true,
  "message": "Human-readable outcome",
  "data": {}
}
```

| Property  | Type                     | Required | Rules                                                                   |
| --------- | ------------------------ | -------- | ----------------------------------------------------------------------- |
| `success` | Boolean                  | Yes      | Always `true`.                                                          |
| `message` | String                   | Yes      | Concise user-safe summary; must not expose internal details.            |
| `data`    | Object, Array, or `null` | Yes      | Endpoint-specific result. Use `null` only when no resource data exists. |

The success envelope never contains `errors`.

## 3. Failure Envelope

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

| Property  | Type    | Required | Rules                                        |
| --------- | ------- | -------- | -------------------------------------------- |
| `success` | Boolean | Yes      | Always `false`.                              |
| `message` | String  | Yes      | General user-safe failure summary.           |
| `errors`  | Array   | Yes      | Contains at least one structured error item. |

Each error item contains:

| Property  | Type   | Required | Rules                                                                   |
| --------- | ------ | -------- | ----------------------------------------------------------------------- |
| `code`    | String | Yes      | Stable uppercase `UPPER_SNAKE_CASE` machine identifier.                 |
| `field`   | String | No       | Dot-notation request field path for field-specific validation failures. |
| `message` | String | Yes      | Safe description appropriate for display or form feedback.              |

The failure envelope never contains `data`, raw exceptions, stack traces, MongoDB errors, Docker
commands, AI prompts, secrets, or password information.

## 4. Validation Failure Example

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "field": "email",
      "message": "Enter a valid email address."
    },
    {
      "code": "VALIDATION_ERROR",
      "field": "password",
      "message": "Password must contain at least 8 characters."
    }
  ]
}
```

## 5. Error-Code Rules

- Codes are stable API contracts; wording may be refined without changing client behavior.
- Validation errors use `VALIDATION_ERROR`; the optional `field` and safe message identify the failed
  rule.
- Authentication responses use `INVALID_CREDENTIALS` for both unknown email and wrong password to
  prevent account discovery.
- Unexpected failures use a safe category such as `INTERNAL_ERROR` and are correlated with server
  logs through the `X-Request-Id` response header.
- Python syntax/runtime errors are analysis results inside a success envelope, not API error codes.

## 6. HTTP and Envelope Consistency

The HTTP status remains authoritative. A `2xx` response must use the success envelope; a `4xx` or
`5xx` response must use the failure envelope. The backend must never return HTTP `200` with
`success=false`.

JSON responses use `Content-Type: application/json; charset=utf-8`. Timestamps use ISO 8601 UTC
strings, and MongoDB identifiers are serialized as strings.
