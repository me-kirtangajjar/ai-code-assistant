# Sprint 5: AI Explanation Service

## Objective

Add a pluggable, best-effort explanation step after Python reports a syntax or runtime error. Python
and the unchanged Sprint 4B runner remain the only authorities for error detection and classification.

## Delivered Scope

- Vendor-neutral `AIProvider.generateExplanation()` contract.
- Deterministic mock explanations for common Python errors.
- Gemini `generateContent` REST adapter using Node's built-in `fetch`.
- Prompt construction that requests an explanation, cause, focused fix, and corrected Python code.
- Conditional orchestration for `python_error` only.
- Controlled fallback to `aiExplanation=null` for every provider failure.
- Persistence and API serialization of available explanations.
- Focused Node test-runner coverage without Jest or another test framework.

## Provider Selection

| Variable            | Default            | Purpose                                  |
| ------------------- | ------------------ | ---------------------------------------- |
| `AI_PROVIDER`       | `mock`             | Selects `mock` or `gemini`.              |
| `GEMINI_API_KEY`    | None               | Required only when Gemini is selected.   |
| `GEMINI_MODEL`      | `gemini-3.5-flash` | Server-controlled model identifier.      |
| `GEMINI_TIMEOUT_MS` | `10000`            | Gemini request deadline in milliseconds. |

The backend fails startup configuration validation if Gemini is selected without an API key. The mock
provider requires no external service and is the safe local-development default.

## Execution Rule

```text
Python runner result
      │
      ├── success      ──► skip AI ──► save explanation=null
      ├── runner_error ──► skip AI ──► save explanation=null
      └── python_error ──► AIProvider
                               ├── success ──► save explanation
                               └── failure ──► save explanation=null
```

AI output cannot change `status`, `stdout`, `stderr`, `exitCode`, `executionTime`, `errorType`,
or `traceback`.

## Prompt and Data Boundary

The provider receives only:

- fixed language `python`;
- submitted source code;
- Python error type;
- bounded stderr;
- bounded Python traceback.

JWTs, authorization headers, user IDs, email addresses, MongoDB IDs, stdout, host paths, Docker errors,
commands, and environment secrets are excluded. Submitted execution text is labelled as untrusted data,
and the prompt explicitly tells the model not to execute code or follow instructions embedded in it.

## Gemini Failure Handling

The Gemini adapter maps request timeouts, network failures, invalid credentials, rate limiting,
provider unavailability, and invalid response structures to controlled internal error categories. The
AI service logs only the safe category, never the API key, prompt, source, stderr, traceback, or raw
provider response. Analysis then persists the unchanged Python result with `aiExplanation=null`.

## Testing

Run:

```bash
corepack pnpm --filter @ai-code-error-feedback/backend test
```

Coverage includes deterministic `ZeroDivisionError` and `SyntaxError` explanations, skip behavior for
success and runner errors, controlled Gemini network failure, invalid-key and rate-limit mappings,
prompt contents, and the null fallback.

## Manual Verification

Use `AI_PROVIDER=mock`, start MongoDB and the backend, authenticate through the Sprint 3 endpoints,
then submit:

```json
{ "code": "1 / 0" }
```

The response should be `201`, retain `status=python_error` and `errorType=ZeroDivisionError`, and
contain the deterministic explanation. Repeat with valid code and confirm `aiExplanation=null`.

For Gemini, set `AI_PROVIDER=gemini` and `GEMINI_API_KEY` in the untracked backend environment. An
invalid or unavailable key must still allow a Python-error execution to return `201` with the
authoritative runner facts and `aiExplanation=null`.

## Explicit Exclusions

- No AI chat or public AI endpoint.
- No frontend changes.
- No submission-history changes.
- No Python runner, Docker command, isolation, or classification changes.
- No AI-based error detection or execution.

## References

- [Gemini API reference](https://ai.google.dev/api)
- [Gemini troubleshooting and response codes](https://ai.google.dev/gemini-api/docs/troubleshooting)
- [Gemini model documentation](https://ai.google.dev/gemini-api/docs/models)
