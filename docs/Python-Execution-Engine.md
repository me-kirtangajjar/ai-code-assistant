# Python Execution Engine

This document consolidates the complete architecture of the Python runner, execution pipeline, sandbox environment, error classification, and sequence flows for the MCA Major Project.

## 1. Pipeline Lifecycle & Sequence

The Python Runner is an internal backend boundary responsible for executing untrusted student Python code safely.

### Complete Sequence
1. **Request:** Frontend sends `POST /api/v1/analysis/run` with Python `code` and Bearer token.
2. **Validation:** Backend authenticates, resolves user, and validates source length and type.
3. **Orchestration:** The analysis module sends `{ language: "python", code }` to the runner.
4. **Workspace & Sandbox:** The runner generates a unique ID, creates a private temporary directory, and writes `main.py`. It starts a Docker container with strict constraints.
5. **Execution:** Python executes `/workspace/main.py` while the runner concurrently captures `stdout` and `stderr` up to a 1 MiB limit.
6. **Termination & Cleanup:** 
   - A 5-second monotonic watchdog enforces the deadline.
   - The runner classifies the result, removes the container, and deletes the temporary directory.
   - Cleanup happens on every path (success, failure, timeout).
7. **AI Routing:** If the execution result is `python_error`, an AI provider is invoked to explain the Python diagnostic. AI is skipped for `success` and `runner_error`.
8. **Persistence:** The result and optional AI explanation are saved to MongoDB.
9. **Response:** A standard HTTP envelope (`201` for completion, `422`/`503`/`504` for runner failures) is returned.

## 2. Sandbox Architecture

The sandbox uses Docker to isolate untrusted code. It protects the host via the following mandatory controls:

- **Time:** 5-second wall-clock deadline.
- **Memory:** 256 MB hard limit (including swap).
- **CPU & Process:** At most 1 CPU, 64-PID ceiling.
- **Output:** 1,048,576 bytes combined stdout/stderr budget.
- **Network & Privileges:** `none` network driver, read-only root filesystem, non-root user (UID 1000), drop all Linux capabilities, no privilege escalation.
- **Mounts:** The private workspace is mounted read-only at `/workspace`. No host, database, or socket mounts are provided.

Docker access is restricted solely to the backend runner adapter.

## 3. Runner Contract

The runner boundary communicates via a strictly typed object, abstracting infrastructure from the analysis module.

**Input:**
```json
{
  "language": "python",
  "code": "print('Hello')"
}
```

**Output:**
```json
{
  "status": "success | python_error | runner_error",
  "stdout": "Bounded string",
  "stderr": "Bounded string",
  "exitCode": 0,
  "executionTime": 45,
  "errorType": "NameError | Timeout | null",
  "traceback": "Extracted traceback or null"
}
```

## 4. Error Classification

Classification relies on authoritative Docker and Python facts. AI is never used to determine the status.

**Classification Precedence:**
1. **Output limit reached** → `runner_error / OutputLimitExceeded`
2. **Backend deadline reached** → `runner_error / Timeout`
3. **Docker confirms OOM kill** → `runner_error / MemoryLimitExceeded`
4. **Docker lifecycle/daemon failure** → `runner_error / DockerFailure`
5. **Internal runner/workspace failure** → `runner_error / RunnerFailure`
6. **Python exits 0** → `success / null`
7. **Python exits non-zero** → `python_error`

For `python_error`, the runner extracts the final Python exception class (e.g., `SyntaxError`, `NameError`, `IndentationError`) and assigns it to `errorType`, capturing the diagnostic block in `traceback`.

## 5. Persistence and API Mapping

The public endpoint translates internal runner outcomes to standard HTTP responses:
- `Exit 0` → `success` → `201 Created`
- `Python error` → `python_error` → `201 Created` (with explanation)
- `Output limit` → `runner_error` → `422 OUTPUT_LIMIT_EXCEEDED`
- `Timeout` → `runner_error` → `504 EXECUTION_TIMEOUT`
- `Memory/Docker/Runner failure` → `runner_error` → `503 RUNNER_UNAVAILABLE`

Persistence to MongoDB is best-effort for runner errors and mandatory for success/python_error. If MongoDB is down, the API returns `503 DATABASE_UNAVAILABLE`.
