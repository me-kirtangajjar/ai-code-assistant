# Sprint 4A: Python Execution and Sandbox Design

## 1. Objective

Define the complete secure Python execution pipeline, runner contract, sandbox architecture, error
classification, cleanup lifecycle, AI handoff, and component sequence without implementing executable
behavior.

## 2. Delivered Documentation

- [Python Execution Pipeline](Execution-Pipeline.md)
- [Python Runner Contract](Runner-Contract.md)
- [Docker Sandbox Architecture](Sandbox-Architecture.md)
- [Execution Error Classification](Error-Classification.md)
- [Python Execution Sequence Diagram](Sequence-Diagram.md)

The existing API, database, architecture, validation, error-handling, roadmap, and project overview
documents are cross-referenced and aligned with these contracts.

## 3. Fixed Version 1 Decisions

| Decision         | Sprint 4A contract                                                  |
| ---------------- | ------------------------------------------------------------------- |
| Language         | Python only.                                                        |
| Public request   | `{ "code": "..." }`; no language or stdin field.                    |
| Internal request | `{ "language": "python", "code": "..." }`.                          |
| Execution unit   | One new isolated container for each accepted request.               |
| Timeout          | Five seconds.                                                       |
| Memory           | 256 MB with no additional swap allowance.                           |
| CPU              | One CPU.                                                            |
| Output           | 1 MiB combined stdout/stderr byte limit.                            |
| Network          | Disabled.                                                           |
| Filesystem       | Read-only root and read-only submitted-source mount.                |
| User             | Fixed non-root numeric UID/GID.                                     |
| Process limit    | 64 PIDs as fork-bomb protection.                                    |
| Input            | No stdin or interactive terminal.                                   |
| Statuses         | `success`, `python_error`, `runner_error`.                          |
| AI               | Only for `python_error`; explanation never performs detection.      |
| Persistence      | Save all attempts when MongoDB is available.                        |
| Cleanup          | Stop/remove container, then delete private workspace on every path. |

## 4. Architecture Decisions

- The Python runner remains an internal backend boundary, not a microservice.
- Source code is written to a fixed `main.py` inside a private host temporary directory and mounted
  read-only into the container.
- Code is never inserted into a shell command, Docker option, environment variable, path, or label.
- Output is captured concurrently and bounded while the process is running.
- Classification uses policy and Docker facts before interpreting Python's exit code.
- A Docker-confirmed OOM kill is a runner error; a normally reported Python `MemoryError` is a Python
  error.
- AI receives only minimal Python error context and cannot change execution facts.
- MongoDB persistence occurs after the optional explanation attempt.
- Docker controls are combined with host concurrency limits and cleanup; containerization alone is not
  treated as complete security.

## 5. Explicit Non-Implementation

Sprint 4A does not add or modify:

- TypeScript source;
- Python source or dependencies;
- Dockerfiles or Docker Compose execution configuration;
- Express controllers, routes, services, repositories, or validators;
- environment-variable implementation;
- MongoDB models or records;
- AI providers;
- frontend components;
- executable tests.

The analysis endpoint described in the design remains unimplemented.

## 6. Scope Guardrail for Other Languages

The runner contract documents how a fixed language discriminator could avoid redesigning backend
orchestration if a future project version separately approved Java, C++, or JavaScript. This is a
design observation only.

Version 1 remains Python-only. No generic command runner, compiler pipeline, new language enum, image,
API field, database migration, or implementation is authorized by Sprint 4A.

## 7. Implementation Handoff Checklist

Before a later implementation sprint is complete, it must verify:

- [ ] unauthenticated or invalid requests never reach Docker;
- [ ] code is preserved exactly and written only to an unpredictable private workspace;
- [ ] all required container limits are present and cannot be overridden by a request;
- [ ] source/root filesystems are read-only and the process is non-root;
- [ ] network, stdin, TTY, capabilities, privilege escalation, devices, and restart are disabled;
- [ ] output is streamed concurrently and terminated at the combined byte cap;
- [ ] timeout, OOM, output, Docker, runner, and Python errors classify as documented;
- [ ] every result satisfies the runner contract and cross-field invariants;
- [ ] containers and temporary directories are removed on every tested path;
- [ ] AI is never called for success or runner errors;
- [ ] all attempts are persisted when MongoDB is available;
- [ ] logs exclude code, output, tracebacks, tokens, secrets, and raw Docker errors;
- [ ] concurrent execution is bounded without Redis, a queue, or a new service;
- [ ] Windows 11 Docker Desktop and the intended Linux production host pass execution-limit tests.

## 8. Sprint 4A Definition of Done

- [x] Complete request lifecycle documented.
- [x] Runner input/output contract and every field documented.
- [x] Python and runner error taxonomy documented.
- [x] Docker isolation controls and rationale documented.
- [x] Temporary workspace lifecycle and failure cleanup documented.
- [x] Analysis result object documented.
- [x] AI invocation boundary documented.
- [x] Security threat model documented.
- [x] Mermaid sequence diagram added.
- [x] Future language extensibility explained without changing Version 1 scope.
- [x] No executable application or infrastructure code added.
