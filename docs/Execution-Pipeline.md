# Python Execution Pipeline

## 1. Purpose and Scope

This document defines the lifecycle for one authenticated Python analysis request. Sprint 4B
implements the endpoint, runner, Docker execution, cleanup, classification, and persistence portions
of the Sprint 4A design. Sprint 5 adds the conditional, best-effort AI explanation step.

Version 1 remains Python-only. Python is the sole authority for syntax and runtime errors. The runner
reports execution facts, the analysis module coordinates the use case, and AI may only explain an
error that Python already produced.

## 2. Contract Boundaries

Three related but distinct contracts are used:

1. **Public HTTP request:** the frontend sends only `{ "code": "..." }` to
   `POST /api/v1/analysis/run`. It cannot select a runtime or provide stdin.
2. **Internal runner request:** the analysis module supplies `{ "language": "python", "code": "..." }`
   to the runner boundary. The fixed language discriminator makes the boundary explicit without
   exposing multi-language behavior in Version 1.
3. **Analysis result:** the runner's execution facts are enriched with `language` and a server-owned
   `createdAt`, then optionally with `aiExplanation` and persistence identity outside the runner.

The runner boundary is part of the backend deployment. It is not a REST service or microservice, and
no additional network hop is introduced.

## 3. Complete Request Lifecycle

### 3.1 Receive the request

The frontend sends an HTTPS request containing:

- `Authorization: Bearer <accessToken>`;
- `Content-Type: application/json`;
- one `code` string containing the submitted Python source.

The existing JSON body-size limit applies before feature logic. Source code is never accepted through
a query string, URL, environment variable, or command-line argument.

### 3.2 Authenticate the student

The existing JWT middleware validates the bearer token and resolves the current user. Ownership comes
only from the authenticated request context. A missing, invalid, or expired token stops the request
before validation, temporary-file creation, Docker access, AI access, or persistence.

### 3.3 Validate and normalize the request boundary

Backend Zod validation requires `code` to be a string containing at least one non-whitespace character
and at most 100,000 characters. Unknown fields, including `language` and `stdin`, are rejected.

The code itself is preserved exactly. Trimming may be used only to test whether it is blank; it must
not change indentation, line endings, spaces, or characters before execution or storage.

### 3.4 Establish execution identity and timing

The runner creates a cryptographically unpredictable execution identifier used only for
correlation, temporary-resource names, container labels, and safe logs. It is not derived from the
user ID, email, source code, or a client-supplied filename.

Execution duration is measured with a monotonic clock around the Docker create/start/termination
operation. A failure before Docker receives a request uses the runner's outer monotonic timer. It
excludes authentication, HTTP validation, AI latency, and MongoDB latency.

### 3.5 Create the temporary workspace

The runner creates a unique private directory under the operating system's configured temporary root.
The directory must not be inside the repository, upload directory, or a user-selected path. It writes
the validated source to the fixed filename `main.py`, closes the file, and exposes it to the container
through a read-only bind mount.

Detailed permissions, path-safety rules, and cleanup behavior are defined in
[Sandbox Architecture](Sandbox-Architecture.md).

### 3.6 Start one isolated container

The runner creates exactly one container from the configured, prebuilt, approved Python runner image.
The image name and interpreter command are server configuration—not request data. Docker receives
arguments as an argument list rather than a shell command, so submitted source can never alter Docker
options or the interpreter command.

The container applies every required control before Python starts:

- five-second backend deadline;
- 256 MB memory and no additional swap allowance;
- one CPU;
- disabled networking;
- read-only root filesystem and read-only source mount;
- non-root user;
- bounded process count;
- no stdin or pseudo-terminal;
- no host workspace, Docker socket, secrets, or devices.

### 3.7 Execute Python

The fixed container command invokes the Python interpreter on `/workspace/main.py`. Python bytecode
writing is disabled so the read-only source directory remains sufficient. The interpreter parses and
executes the source and is the only component that detects Python syntax/runtime errors.

The backend and AI do not pre-parse source to decide whether an error exists. No user-provided stdin
is attached in Version 1.

### 3.8 Capture bounded output

The runner consumes stdout and stderr concurrently to prevent either stream from blocking the child
process. It counts raw bytes across both streams and retains at most 1,048,576 bytes in total.

If the combined limit is crossed, the runner terminates the container, preserves only the bounded
partial output, and classifies the result as `runner_error` with
`errorType=OutputLimitExceeded`. The limit is measured in bytes, not Unicode characters.

Captured bytes are decoded as UTF-8 using replacement characters for invalid sequences. Output is
never written to application logs.

### 3.9 Enforce the deadline and inspect termination

The backend watchdog races container completion against the five-second deadline. On timeout, it stops
and, if necessary, kills the exact container ID. After termination, the runner inspects Docker state
before removal so it can distinguish a confirmed out-of-memory kill from a timeout or ordinary
non-zero Python exit.

Exit code `137` alone is not sufficient evidence of memory exhaustion because other termination paths
can produce the same value. Docker's recorded OOM state is required for
`MemoryLimitExceeded` classification.

### 3.10 Classify the execution facts

Classification follows this precedence:

1. Runner policy conditions: timeout, output limit, or confirmed memory limit.
2. Docker/container lifecycle failure.
3. Runner/temporary-workspace failure.
4. Python exit code: zero is `success`; non-zero after a confirmed interpreter start is
   `python_error`.

The classifier may extract Python's final exception class from Python-generated stderr for the
`errorType` display field. This extraction does not detect the error and never overrides runner policy
facts. See [Error Classification](Error-Classification.md).

### 3.11 Clean up execution resources

Container and workspace cleanup runs in a guaranteed finalization path on success, Python error,
timeout, output overflow, Docker failure, cancellation, and unexpected exceptions. The runner first
stops/kills and removes any created container by exact ID, then recursively removes only the private
temporary directory it created.

Cleanup failure is safely logged with the execution identifier and does not replace the primary
execution result. Container labels, safe workspace prefixes, and a no-restart policy allow startup
reconciliation to remove resources left by an interrupted backend process.

### 3.12 Preserve the AI boundary

Sprint 5 implements this boundary. The analysis module applies the following rule:

| Status         | AI call | Reason                                                            |
| -------------- | ------- | ----------------------------------------------------------------- |
| `success`      | No      | There is no Python error to explain.                              |
| `python_error` | Yes     | Python already reported an error that can be explained.           |
| `runner_error` | No      | Infrastructure/policy failures are not Python programming errors. |

For `python_error`, the backend sends only the minimum useful context: language, submitted source,
Python `errorType`, bounded stderr, and bounded traceback. It excludes user identity, JWTs, stdout,
database IDs, infrastructure details, and secrets.

If the provider fails, the Python result remains unchanged and `aiExplanation` remains `null`. AI
output cannot change `status`, `stdout`, `stderr`, `exitCode`, `executionTime`, `errorType`, or
`traceback`.

### 3.13 Store the complete submission

The analysis module maps the authenticated user, original code, execution facts, language, and optional
AI explanation to the existing `submissions` schema. Successful runs, Python errors, and runner errors
are all persisted when MongoDB is available.

For Python errors, persistence occurs after the best-effort AI call so the available explanation is
stored in the same submission. Success and runner errors store `aiExplanation=null`. A MongoDB failure returns
`503 DATABASE_UNAVAILABLE`; the API must not claim the submission was saved.

### 3.14 Return the API response

The public endpoint uses the existing standard response envelope:

- stored `success` or `python_error` → `201 Created` with `data.submission`;
- output limit → `422 OUTPUT_LIMIT_EXCEEDED` after best-effort persistence;
- runner/Docker unavailable → `503 RUNNER_UNAVAILABLE` after best-effort persistence;
- timeout → `504 EXECUTION_TIMEOUT` after best-effort persistence;
- persistence unavailable → `503 DATABASE_UNAVAILABLE`.

Python syntax/runtime errors are analysis results, not HTTP/server errors.

## 4. Analysis Result Object

The execution facts are enriched into this internal analysis result before persistence:

```json
{
  "status": "python_error",
  "stdout": "",
  "stderr": "Traceback (most recent call last):\n...\nNameError: name 'value' is not defined\n",
  "exitCode": 1,
  "executionTime": 47,
  "errorType": "NameError",
  "traceback": "Traceback (most recent call last):\n...\nNameError: name 'value' is not defined\n",
  "language": "python",
  "createdAt": "2026-07-22T12:30:00.000Z"
}
```

| Field           | Meaning                                                                     |
| --------------- | --------------------------------------------------------------------------- |
| `status`        | `success`, `python_error`, or `runner_error`.                               |
| `stdout`        | Bounded text captured from Python standard output.                          |
| `stderr`        | Bounded text captured from Python standard error; never raw Docker errors.  |
| `exitCode`      | Python/container exit code when available, otherwise `null`.                |
| `executionTime` | Non-negative elapsed milliseconds measured with a monotonic clock.          |
| `errorType`     | Extracted Python class or controlled runner category; otherwise `null`.     |
| `traceback`     | Python-generated diagnostic/traceback for `python_error`; otherwise `null`. |
| `language`      | Fixed value `python` in Version 1.                                          |
| `createdAt`     | Server-owned UTC timestamp assigned when the analysis result is assembled.  |

`aiExplanation`, MongoDB `_id`, `userId`, and `updatedAt` are persistence/API concerns and are not
execution-engine output fields.

## 5. Failure and Cleanup Guarantees

- No invalid or unauthenticated request reaches Docker.
- Every accepted execution has one correlation ID, one private workspace, and at most one container.
- Output is bounded even when the program writes indefinitely.
- A primary result is classified before cleanup errors are considered.
- AI is skipped for all infrastructure and sandbox-policy failures.
- The original source and authoritative Python output are preserved only within configured bounds.
- Logs contain safe categories and identifiers, never code, stdout, stderr, traceback, or AI content.

## 6. Concurrency Model

Each HTTP request owns independent resources. Version 1 introduces no queue, worker service, shared
workspace, or long-running reusable execution container. Overall host concurrency must be bounded by a
deployment-level setting in the implementation sprint so many individually limited containers cannot
collectively exhaust the host. Requests beyond that bound should fail predictably rather than wait
indefinitely.
