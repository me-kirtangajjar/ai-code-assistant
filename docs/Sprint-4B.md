# Sprint 4B: Python Execution Engine

## Objective

Implement the authenticated, Python-only execution engine defined in Sprint 4A without adding AI,
history, frontend features, or another service.

## Delivered Scope

- Protected `POST /api/v1/analysis/run` with strict Zod validation.
- Internal backend runner with a seven-field result contract.
- One prebuilt, approved Docker image and fixed interpreter command per execution.
- Five-second timeout, 256 MB memory, one CPU, 64 PIDs, disabled network, read-only filesystems,
  non-root execution, no stdin/TTY, and no restart.
- Concurrent stdout/stderr capture with a 1,048,576-byte combined limit.
- Classification into `success`, `python_error`, or `runner_error` from Python/Docker facts.
- Persistence of every accepted attempt with `language=python` and `aiExplanation=null`.
- Guaranteed container/workspace cleanup and best-effort startup reconciliation.

## Explicit Exclusions

Sprint 4B does not implement or invoke AI, history endpoints, profile features, frontend pages,
Monaco Editor, user-supplied stdin, package installation, multiple languages, or arbitrary commands.

## Configuration

The backend validates these runner settings at startup:

| Variable                       | Sprint 4B default                            |
| ------------------------------ | -------------------------------------------- |
| `PYTHON_RUNNER_IMAGE`          | `ai-code-error-feedback-python-runner:1.0.0` |
| `EXECUTION_TIMEOUT_MS`         | `5000`                                       |
| `EXECUTION_MEMORY_MB`          | `256`                                        |
| `EXECUTION_CPU_LIMIT`          | `1`                                          |
| `EXECUTION_OUTPUT_LIMIT_BYTES` | `1048576`                                    |
| `EXECUTION_PID_LIMIT`          | `64`                                         |
| `EXECUTION_MAX_CONCURRENCY`    | `2`                                          |

The configured image name is validated and cannot come from an HTTP request.

## Build and Run

From the repository root:

```bash
pnpm install
docker build --file docker/Dockerfile.python \
  --tag ai-code-error-feedback-python-runner:1.0.0 docker
cp backend/.env.example backend/.env
pnpm dev:backend
```

Set a reachable MongoDB URI and a development JWT secret before starting. The backend process account
must be able to use the Docker daemon.

## API Behavior

The request body is exactly:

```json
{
  "code": "print('Hello World')"
}
```

Unknown fields such as `language`, `stdin`, `filename`, and `command` are rejected. Authentication
and validation happen before any workspace or container is created.

| Outcome                  | Stored status  | Stored error type          | HTTP response |
| ------------------------ | -------------- | -------------------------- | ------------- |
| Normal exit              | `success`      | `null`                     | `201`         |
| Python exception/syntax  | `python_error` | Python exception class     | `201`         |
| Five-second timeout      | `runner_error` | `Timeout`                  | `504`         |
| Combined output overflow | `runner_error` | `OutputLimitExceeded`      | `422`         |
| Confirmed Docker OOM     | `runner_error` | `MemoryLimitExceeded`      | `503`         |
| Docker/runner failure    | `runner_error` | Controlled runner category | `503`         |

Runner failures are persisted before returning the failure envelope when MongoDB is available.

## Manual Verification

Register and log in using the Sprint 3 endpoints, then set the returned access token in `TOKEN`.
Submit each case to `POST /api/v1/analysis/run` with
`Authorization: Bearer <token>`:

1. Success: `print("Hello World")`.
2. Python error: `1 / 0`.
3. Timeout: `while True: pass`.
4. Output overflow: `print("A" * 2000000)`.
5. Memory pressure: `data = [0] * (10**9)`.

Example request:

```bash
curl --request POST http://localhost:4000/api/v1/analysis/run \
  --header "Authorization: Bearer $TOKEN" \
  --header "Content-Type: application/json" \
  --data '{"code":"print(\"Hello World\")"}'
```

After the checks, inspect MongoDB to confirm five submissions and
`docker ps --all --filter label=ai-code-error-feedback.managed=true` to confirm no managed execution
containers remain. Runner workspaces use the operating-system temporary directory and the safe
`ai-code-execution-` prefix.

## Verification Completed

- Backend formatting, TypeScript compilation, ESLint, and production build passed.
- Contract/classifier/workspace assertions passed.
- Controlled Docker-adapter tests covered success, Python error, timeout, output overflow, and
  confirmed out-of-memory classification while checking the fixed Docker argument vector and cleanup.
- Authenticated API integration covered validation, all five result mappings, persistence,
  `aiExplanation=null`, safe response fields, and cleanup.
- A real local Docker CLI permission failure produced a controlled `DockerFailure` and cleaned the
  workspace.

The current verification account cannot access the host Docker daemon, so a real image build and live
container run must be repeated by a developer account with Docker permission. The controlled tests do
not claim to replace that host-level verification.

## Definition of Done

- [x] Authenticated Python-only analysis endpoint.
- [x] Docker runner controls and fixed command.
- [x] Bounded output, timeout, memory, and concurrency handling.
- [x] Predictable classifications and API mappings.
- [x] Persistence of all accepted attempts with AI disabled.
- [x] Guaranteed cleanup and startup reconciliation.
- [x] Documentation and non-daemon verification.
- [ ] Live Docker image build and five-case run by a Docker-authorized account.
