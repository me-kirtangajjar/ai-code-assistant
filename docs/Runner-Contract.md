# Python Runner Contract

## 1. Purpose

This document defines the internal boundary between the analysis module and the Python runner. Sprint
4B implements this contract while keeping it internal to the backend deployment.

The runner accepts validated source, performs one isolated execution, and returns facts. It does not
authenticate users, access MongoDB, call AI, explain errors, or construct HTTP responses.

## 2. Input Contract

```json
{
  "language": "python",
  "code": "print('Hello')"
}
```

| Field      | Type   | Required | Rules                                                         |
| ---------- | ------ | -------- | ------------------------------------------------------------- |
| `language` | String | Yes      | Literal `python`; no other value is supported in Version 1.   |
| `code`     | String | Yes      | Exact validated source, nonblank, maximum 100,000 characters. |

The analysis module constructs this object after HTTP validation. `language` is not accepted from the
public Version 1 request, and there is no filename, stdin, command, package list, environment map, or
runtime-options field.

The runner accepts this typed internal object after authoritative HTTP validation. It rejects a
non-Python discriminator defensively; source nonblank/length validation remains at the HTTP boundary
because the runner is an in-process module, not an independently reachable service.

## 3. Output Contract

### 3.1 Successful execution

```json
{
  "status": "success",
  "stdout": "Hello\n",
  "stderr": "",
  "exitCode": 0,
  "executionTime": 38,
  "errorType": null,
  "traceback": null
}
```

### 3.2 Python error

```json
{
  "status": "python_error",
  "stdout": "",
  "stderr": "Traceback (most recent call last):\n  File \"/workspace/main.py\", line 1, in <module>\n    print(value)\n          ^^^^^\nNameError: name 'value' is not defined\n",
  "exitCode": 1,
  "executionTime": 45,
  "errorType": "NameError",
  "traceback": "Traceback (most recent call last):\n  File \"/workspace/main.py\", line 1, in <module>\n    print(value)\n          ^^^^^\nNameError: name 'value' is not defined\n"
}
```

For a syntax/indentation diagnostic, `traceback` contains Python's diagnostic block even when Python
does not include the literal `Traceback (most recent call last)` heading.

### 3.3 Runner error

```json
{
  "status": "runner_error",
  "stdout": "partial bounded output\n",
  "stderr": "",
  "exitCode": null,
  "executionTime": 5000,
  "errorType": "Timeout",
  "traceback": null
}
```

## 4. Field Definitions

| Field           | Type                | Required | Definition                                                    |
| --------------- | ------------------- | -------- | ------------------------------------------------------------- |
| `status`        | String enum         | Yes      | `success`, `python_error`, or `runner_error`.                 |
| `stdout`        | String              | Yes      | Captured Python stdout within the combined 1 MiB byte budget. |
| `stderr`        | String              | Yes      | Captured Python stderr within the combined 1 MiB byte budget. |
| `exitCode`      | Integer or `null`   | Yes      | Observed process/container exit code when one exists.         |
| `executionTime` | Non-negative number | Yes      | Elapsed runner/container time in integer milliseconds.        |
| `errorType`     | String or `null`    | Yes      | Python exception class or controlled runner category.         |
| `traceback`     | String or `null`    | Yes      | Python-generated error diagnostic for `python_error` only.    |

All fields are always present. This prevents consumers from confusing an omitted field with a failed
runner response.

## 5. Cross-Field Invariants

### 5.1 `success`

- `exitCode` is `0`.
- `errorType` and `traceback` are `null`.
- `stderr` may be non-empty because a successful Python program can intentionally write to stderr.
- AI must not be invoked.

### 5.2 `python_error`

- Python was confirmed to have started and returned a non-zero exit code without a runner policy or
  infrastructure failure taking precedence.
- `exitCode` is normally a non-zero integer.
- `stderr` contains Python's bounded diagnostic when Python produced one.
- `traceback` contains the extracted Python diagnostic or is `null` when none is available.
- `errorType` contains the final extractable Python exception class or is `null`.
- AI may explain this result but cannot modify it.

### 5.3 `runner_error`

- The failure belongs to sandbox policy, resource enforcement, temporary workspace, Docker, or runner
  orchestration—not to Python syntax/runtime behavior.
- `errorType` is one of the controlled runner categories documented in
  [Error Classification](Error-Classification.md).
- `exitCode` is `null` when no meaningful process exit exists; it may contain Docker's observed value
  when a process was terminated.
- `traceback` is always `null` because infrastructure failures do not have a Python traceback.
- AI must not be invoked.

## 6. Output and Encoding Rules

- Stdout and stderr are read concurrently as bytes.
- Their combined retained size never exceeds 1,048,576 bytes.
- The first bytes observed before the limit are retained; later bytes are discarded after termination.
- Each stream preserves its own byte order. No total ordering between stdout and stderr is promised.
- Bytes are decoded as UTF-8 with replacement for invalid sequences.
- No truncation marker is appended if doing so would exceed the byte budget.
- Source, stdout, stderr, and traceback are never included in logs or thrown host exceptions.

## 7. Timing and Exit Semantics

`executionTime` measures elapsed monotonic time from the runner's Docker create/start attempt until
normal exit or confirmed termination. It includes container startup overhead because Version 1 does
not add instrumentation inside student code. It excludes request validation, workspace creation, AI,
MongoDB, and HTTP serialization.

For a timeout, the value is at least the configured five-second deadline subject to scheduling and
termination overhead. Consumers must not interpret it as CPU time.

## 8. Safe Failure Information

`stderr` is reserved for bytes written by the Python process. Raw Docker daemon messages, host paths,
commands, image registry details, and stack traces must not be copied into it. Infrastructure detail is
recorded only in restricted server logs using a safe category and execution identifier.

The contract must return a controlled `runner_error` object even when Docker cannot start, provided
the runner boundary itself can still construct a response. A completely malformed/unparseable runner
response is treated by the analysis module as `RunnerFailure`.

## 9. Contract Construction

The runner is an in-process TypeScript boundary. Controlled classification functions construct every
`RunnerResult`; the analysis service does not parse an untrusted network response. Docker container
identifiers and inspected state are checked at runtime, while TypeScript, focused classification tests,
bounded capture, and the classifier branches preserve the result shape and cross-field invariants.

Unexpected runner exceptions are caught and converted to `runner_error/RunnerFailure`, which never
reaches AI.

## 10. Extensibility Boundary

Multiple languages remain explicitly outside Version 1. The `language` discriminator exists so a
future, separately approved scope could preserve the backend orchestration contract while adding a
language-specific runner adapter and sandbox image.

Hypothetically:

| Language   | Future isolated operation                    | Error source of truth               |
| ---------- | -------------------------------------------- | ----------------------------------- |
| Java       | Compile, then run bytecode in a Java image.  | `javac` and JVM output/exit status. |
| C++        | Compile, then run the binary in a C++ image. | Compiler and process output/status. |
| JavaScript | Run source in a Node.js image.               | Node.js output and exit status.     |

The stable fields—status, streams, exit code, duration, error type, and diagnostic—could remain. Each
new language would require its own validation, image, resource testing, compilation/runtime phases,
and error parser. It must not be implemented by adding user-controlled commands or a generic shell.

This extensibility note is not approval to add another language. The current public API, database
enum, Docker image, project requirements, and implementation must stay Python-only unless a future
architecture decision explicitly changes them.
