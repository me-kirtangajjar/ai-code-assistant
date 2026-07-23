# Execution Error Classification

## 1. Purpose

Classification converts authoritative Python/Docker/runner facts into the three existing statuses and
a useful `errorType`. It does not ask AI whether an error exists. Python detects Python errors; Docker
and the runner report infrastructure and policy failures.

## 2. Status Categories

| Status         | Meaning                                                                                 |
| -------------- | --------------------------------------------------------------------------------------- |
| `success`      | Python started, completed normally, and returned exit code `0`.                         |
| `python_error` | Python started and returned a non-zero result without a higher-priority runner failure. |
| `runner_error` | Execution could not complete because of policy, resource, Docker, or runner failure.    |

## 3. Classification Precedence

The runner evaluates facts in this order:

1. **Output limit reached** → `runner_error / OutputLimitExceeded`.
2. **Backend deadline reached** → `runner_error / Timeout`.
3. **Docker confirms OOM kill** → `runner_error / MemoryLimitExceeded`.
4. **Docker lifecycle/daemon/image failure** → `runner_error / DockerFailure`.
5. **Workspace, adapter, stream, inspection, or invalid-contract failure** →
   `runner_error / RunnerFailure`.
6. **Interpreter started and exit code is zero** → `success / null`.
7. **Interpreter started and exit code is non-zero** → `python_error` with a best-effort Python class.

Policy facts take precedence because killed containers may also expose generic non-zero exit codes.
The classifier must not label exit code `137` as memory exhaustion without Docker's OOM confirmation.

## 4. Python Error Types

For `python_error`, the runner extracts the final unhandled exception class from Python-generated
stderr/diagnostic text when possible. In chained exceptions, the final exception that terminated the
program is used.

| Python error                          | Status         | `errorType`           | Classification evidence                                       |
| ------------------------------------- | -------------- | --------------------- | ------------------------------------------------------------- |
| Invalid Python grammar                | `python_error` | `SyntaxError`         | Python diagnostic ends with `SyntaxError`.                    |
| Invalid indentation                   | `python_error` | `IndentationError`    | Python reports the more specific indentation class.           |
| Inconsistent tabs/spaces              | `python_error` | `TabError`            | Python reports `TabError`; do not collapse it to indentation. |
| Unknown name                          | `python_error` | `NameError`           | Final Python exception class is `NameError`.                  |
| Invalid type operation                | `python_error` | `TypeError`           | Final Python exception class is `TypeError`.                  |
| Invalid value                         | `python_error` | `ValueError`          | Final Python exception class is `ValueError`.                 |
| Division by zero                      | `python_error` | `ZeroDivisionError`   | Final Python exception class is `ZeroDivisionError`.          |
| Import failure                        | `python_error` | `ImportError`         | Python reports `ImportError`.                                 |
| Missing module                        | `python_error` | `ModuleNotFoundError` | Preserve this `ImportError` subclass when Python reports it.  |
| Failed assertion                      | `python_error` | `AssertionError`      | Final Python exception class is `AssertionError`.             |
| Excessive recursion                   | `python_error` | `RecursionError`      | Python reports its own recursion guard.                       |
| Python-managed allocation failure     | `python_error` | `MemoryError`         | Python reports `MemoryError` and Docker did not OOM-kill it.  |
| Explicit/non-diagnostic non-zero exit | `python_error` | `null`                | Python exited non-zero but no reliable class is extractable.  |

The list is not an allowlist of executable behavior. Other standard or user-defined exception class
names may be preserved if they are extracted from the final Python diagnostic and satisfy a safe,
bounded class-name format. `errorType` is display/explanation metadata, not a security decision.

## 5. Syntax Diagnostics and Tracebacks

Runtime exceptions normally include a traceback header, frames, and final exception line. Syntax and
indentation errors may instead contain the filename, source line, caret, and final exception line
without a traceback header.

For both forms:

- `stderr` preserves the complete bounded Python stderr;
- `traceback` contains the extracted Python diagnostic block;
- `errorType` uses the final exception class;
- no backend-generated stack trace is inserted.

If bounded-output truncation prevents reliable extraction, output policy takes precedence and the
result is `runner_error / OutputLimitExceeded`, not a guessed Python class.

## 6. Runner Error Types

| Condition                             | Status         | `errorType`           | Evidence and treatment                                       |
| ------------------------------------- | -------------- | --------------------- | ------------------------------------------------------------ |
| Five-second deadline reached          | `runner_error` | `Timeout`             | Backend monotonic watchdog wins; terminate container.        |
| Docker OOM state confirmed            | `runner_error` | `MemoryLimitExceeded` | Inspect state confirms cgroup/container OOM termination.     |
| Combined output over 1 MiB            | `runner_error` | `OutputLimitExceeded` | Streaming byte counter crosses the limit; terminate.         |
| Daemon/image/create/start failure     | `runner_error` | `DockerFailure`       | Docker cannot safely create or start the approved container. |
| Workspace/read/stream/inspect failure | `runner_error` | `RunnerFailure`       | Internal runner operation or contract fails.                 |

`DockerFailure` is a more specific infrastructure category inside the public
`RUNNER_UNAVAILABLE` response. `RunnerFailure` covers unexpected runner-adapter failures that are not
caused by student Python.

## 7. Important Edge Cases

### 7.1 Successful program writes to stderr

Exit code `0` remains `success`. Non-empty stderr alone does not prove a Python error.

### 7.2 Program prints traceback-like text

Text that resembles a traceback does not determine status. Status still comes from interpreter exit
and runner policy facts. Extracted `errorType` is best-effort metadata and must never authorize an AI
call unless status is already `python_error`.

### 7.3 Program calls `sys.exit` with a non-zero code

This is `python_error` because Python started and returned a non-zero result. If Python emits no
diagnostic, `errorType` and `traceback` are `null`; the exit code and streams remain authoritative.

### 7.4 Program catches its own exception

If the program handles an exception and exits `0`, the result is `success`. The backend does not infer
an error from printed words or inspect source semantics.

### 7.5 Python `MemoryError` versus container OOM

A reported `MemoryError` is a Python error. A Docker-confirmed OOM kill is a runner resource failure.
Docker OOM evidence takes precedence if both signals appear.

### 7.6 Timeout during high output

Whichever policy limit is observed first determines `errorType`. The runner records only one primary
classification while cleanup logs may contain secondary facts.

### 7.7 Cleanup failure

Cleanup failure does not reclassify a completed Python result. It is a separate operational event that
must be logged and remediated.

## 8. AI Routing

| Classification | AI action                                                                  |
| -------------- | -------------------------------------------------------------------------- |
| `success`      | Skip AI.                                                                   |
| `python_error` | Request an educational explanation of the existing Python result.          |
| `runner_error` | Skip AI and return the appropriate controlled infrastructure/policy error. |

The AI provider receives an already classified result. It cannot return a different `status` or
`errorType`, and its failure only makes `aiExplanation` unavailable.

## 9. Persistence and HTTP Mapping

| Internal result                       | Stored status  | Public API treatment                                      |
| ------------------------------------- | -------------- | --------------------------------------------------------- |
| Exit `0`                              | `success`      | `201 Created` with submission.                            |
| Python syntax/runtime/non-zero result | `python_error` | `201 Created` with submission and optional explanation.   |
| Timeout                               | `runner_error` | `504 EXECUTION_TIMEOUT`; store attempt when possible.     |
| Output limit                          | `runner_error` | `422 OUTPUT_LIMIT_EXCEEDED`; store attempt when possible. |
| Memory, Docker, or runner failure     | `runner_error` | `503 RUNNER_UNAVAILABLE`; store attempt when possible.    |

MongoDB failure is independent of classification. If the result cannot be stored, the endpoint returns
`503 DATABASE_UNAVAILABLE` and must not claim persistence succeeded.
