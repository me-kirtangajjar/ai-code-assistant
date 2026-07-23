# Docker Sandbox Architecture

## 1. Purpose

The sandbox executes untrusted student Python while limiting its access to the host, network, files,
processes, memory, CPU, and output. Sprint 4B implements this contract in the backend runner and
`docker/Dockerfile.python`.

Docker isolation is one layer, not a claim that containers are virtual machines. Safe operation also
depends on an updated Docker Engine, a minimal trusted image, correct host permissions, bounded overall
concurrency, and strict cleanup.

## 2. Threat Model

Submitted code may intentionally or accidentally:

- loop forever or sleep indefinitely;
- allocate memory until exhaustion;
- create many processes;
- emit unlimited stdout/stderr;
- read or overwrite files;
- inspect environment variables;
- access local or external networks;
- invoke operating-system commands available in the image;
- leave child processes running;
- exploit unsafe container privileges or mounts.

The design protects the host and other submissions from these behaviors. It does not attempt to prove
student code safe before running it; isolation and enforcement are mandatory for every submission.

## 3. Required Sandbox Controls

| Control                   | Design value                                 | Why it is required                                                          |
| ------------------------- | -------------------------------------------- | --------------------------------------------------------------------------- |
| Wall-clock deadline       | 5 seconds                                    | Stops infinite loops, sleeps, and indefinitely blocked execution.           |
| Memory                    | 256 MB hard limit                            | Prevents one program exhausting host memory.                                |
| Memory plus swap          | 256 MB total                                 | Prevents bypassing the memory budget through host swap.                     |
| CPU                       | At most 1 CPU                                | Bounds compute consumption and improves fairness.                           |
| Process count             | 64 PIDs                                      | Limits fork bombs and uncontrolled child-process creation.                  |
| Combined output           | 1,048,576 bytes                              | Prevents memory/storage exhaustion from unlimited output.                   |
| Network                   | None                                         | Blocks data exfiltration, downloads, scanning, and access to host services. |
| Root filesystem           | Read-only                                    | Prevents modification of the image and installed runtime.                   |
| Submitted source mount    | Read-only at `/workspace`                    | Prevents self-modification and host-directory writes.                       |
| Container user            | Fixed non-root numeric UID/GID               | Reduces impact if code compromises the Python process.                      |
| Linux capabilities        | Drop all                                     | Removes privileged kernel operations not needed by Python execution.        |
| Privilege escalation      | Disabled                                     | Prevents setuid/file-capability paths from gaining privileges.              |
| Seccomp/LSM confinement   | Docker default or stricter; never unconfined | Blocks dangerous system calls and preserves host security policy.           |
| Devices                   | None added                                   | Prevents access to host devices, GPUs, and special hardware.                |
| Stdin and pseudo-terminal | Disabled                                     | Matches Version 1 and avoids interactive processes.                         |
| Restart policy            | Never                                        | Prevents completed or failed student code from restarting.                  |

The 64-PID ceiling is a defense-in-depth design value because CPU and memory limits alone do not stop
a program from rapidly creating processes.

## 4. Container Filesystem

The container root filesystem is read-only. The host-side private execution directory is mounted into
the fixed container path `/workspace` as read-only, and the interpreter runs only
`/workspace/main.py`.

Python bytecode generation is disabled so importing standard-library modules does not require writing
`__pycache__` beside the source. Version 1 does not provide a writable project volume, home directory,
package cache, or general-purpose `/tmp`. A student attempt to write a file should receive a
Python-generated permission/read-only-filesystem error, which is a `python_error` if the interpreter
reports it normally.

The container must never receive these mounts:

- repository or backend source directories;
- backend `.env` files or secrets;
- MongoDB storage;
- Docker or container-runtime sockets;
- user home directories;
- arbitrary host paths supplied by a request;
- writable shared volumes from another execution.

## 5. Network Isolation

The container uses Docker's `none` network mode. No ports are published or exposed, no custom DNS is
provided, and the container is not connected to the application/MongoDB network.

This prevents student code from reaching MongoDB, the backend, Docker metadata, other containers,
local-network devices, package registries, or the public internet. The Python standard library remains
available, but network operations fail because there is no external network interface.

## 6. User and Privilege Isolation

The approved image defines a dedicated non-root user, and runtime configuration also supplies the
expected numeric UID/GID. Using a numeric identity avoids dependence on attacker-controlled name
resolution inside the container.

The execution is never privileged. All Linux capabilities are dropped, privilege escalation is
disabled, host PID/IPC/network namespaces are not shared, and Docker's seccomp/AppArmor/SELinux
confinement is not disabled. No device is added.

Student code may still start ordinary subprocesses that exist in the minimal image. Those subprocesses
remain inside the same container limits, namespace, deadline, read-only filesystem, and PID ceiling.

## 7. Image and Command Integrity

- Use one prebuilt, reviewed Python-only image configured by the backend.
- Pin an immutable image digest for production; never accept an image or tag from the request.
- Do not pull/build an image during an analysis request.
- Keep the image minimal and exclude compilers, package managers, shells, network tools, Docker clients,
  credentials, and application source unless the fixed runtime strictly requires them.
- Use a fixed interpreter command and argument vector; never construct a shell command containing code,
  filenames, IDs, or request data.
- Do not pass source through environment variables or Docker labels.
- Do not add untrusted environment variables; supply only fixed runtime-safe values such as bytecode
  suppression and deterministic encoding settings.

## 8. Resource Enforcement

### 8.1 Time

The backend owns the authoritative five-second monotonic watchdog. At the deadline it requests a fast
graceful stop and then force-kills the exact container if necessary. Cleanup does not wait indefinitely.

The trusted image should also contain an independent fixed failsafe slightly longer than the backend
deadline. This protects the host if the backend process crashes after starting a container. The
backend's five-second result remains the public classification when it is operating normally.

### 8.2 Memory

Docker receives the same 256 MB value for memory and total memory-plus-swap. This creates a hard memory
budget without additional swap. The OOM killer remains enabled so the container, rather than the Docker
daemon or host, is terminated under pressure.

After termination, the runner inspects Docker's OOM state before removing the container. A confirmed
OOM kill becomes `runner_error` with `errorType=MemoryLimitExceeded`. A Python `MemoryError` that the
interpreter reports normally remains `python_error`.

### 8.3 CPU and processes

The container is limited to one CPU rather than only receiving a relative CPU weight. A 64-PID limit
bounds processes/threads accounted by the container cgroup. Neither limit replaces the wall-clock
deadline.

### 8.4 Output

The runner reads both output pipes concurrently and applies the 1 MiB combined byte ceiling while the
container is running. Docker logging is disabled or kept non-persistent for the execution container so
the same untrusted output is not duplicated into unbounded daemon log files.

## 9. Temporary Workspace Lifecycle

### 9.1 Create

1. Generate an unpredictable execution identifier.
2. Ask the operating system to atomically create a new private temporary directory.
3. Verify that the returned path is beneath the configured execution temporary root.
4. Restrict host access to the backend process account where the platform supports permissions.

The runner never concatenates an email, user ID, request filename, or source-derived string into the
path.

### 9.2 Write

1. Write the exact validated code to the fixed name `main.py` without following a client path.
2. Use create-new semantics so an existing file is not overwritten.
3. Close the file before Docker starts.
4. Make the file/directory read-only for the execution where supported.

The source file must not be logged, included in thrown errors, or retained for debugging.

### 9.3 Mount and execute

Mount only this private directory at `/workspace` in read-only mode. Store the returned container ID
separately from its human-readable label. All stop, inspect, and removal operations use the exact ID.

### 9.4 Collect

Capture bounded streams, exit state, elapsed duration, and termination facts in memory. Do not create
additional result or log files in the temporary directory.

### 9.5 Delete

After the container is stopped and removed, recursively delete only the verified unique directory.
Cleanup code rejects the configured temp root itself, empty paths, repository paths, and paths that do
not match the execution directory it created.

## 10. Cleanup on Every Failure Path

The runner tracks whether a workspace and container were successfully created. Its finalization order
is:

1. cancel output readers/watchdogs;
2. stop or kill a running container using its exact ID;
3. inspect any termination facts required for classification;
4. force-remove the container;
5. remove the private workspace;
6. release in-memory buffers and concurrency capacity.

| Failure point                  | Required cleanup                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Temporary directory creation   | No container exists; remove a partially created directory if present.                                   |
| Source write                   | Remove the workspace.                                                                                   |
| Docker create                  | Remove any returned container ID, then remove the workspace.                                            |
| Docker start                   | Stop/remove a partially started container, then remove the workspace.                                   |
| Python exit/error              | Inspect/remove the container, then remove the workspace.                                                |
| Timeout/output/OOM             | Kill, inspect, remove container, then remove workspace.                                                 |
| Response/persistence exception | Resources must already be finalized; never retain them for retry.                                       |
| Backend process crash          | No-restart policy and image failsafe bound execution; startup reconciliation removes labeled leftovers. |

Cleanup failures are logged as separate safe operational events. They do not overwrite the primary
result, but they must be visible to operators because leftover containers/directories are a security
and capacity risk.

## 11. Docker Access Boundary

Only the backend runner adapter may communicate with Docker. Controllers, repositories, AI providers,
and student containers cannot access the daemon. The Docker socket is never mounted into a student
container.

Access to the Docker daemon is effectively host-level privilege. The backend process account must be
restricted to the deployment host, and production should avoid exposing an unauthenticated Docker TCP
API. This project keeps the runner within the single backend deployment and does not introduce a
microservice.

## 12. Aggregate Host Protection

Per-container limits do not prevent many simultaneous requests from exhausting the host collectively.
The backend therefore enforces a small configurable maximum concurrent execution count. Requests above
the limit fail quickly with a controlled runner-unavailable response; Version 1 does not add Redis, a
broker, or a distributed queue.

Production should reserve memory/CPU for the operating system, Docker daemon, backend, and MongoDB
rather than setting concurrency from the theoretical full host capacity.

## 13. Development and Production Notes

- Windows 11 development uses Docker Desktop in Linux-container mode.
- Resource-limit support must be checked during runner startup; an unsupported critical limit makes the
  runner unavailable rather than silently weakening isolation.
- Production uses a dedicated, patched Linux host or execution node with Docker Engine and no unrelated
  sensitive workloads.
- The image and Docker Engine receive regular security updates and verification tests.
- Docker containers are not a substitute for authorization, validation, output bounding, or host
  monitoring.

## 14. Primary References

- [Docker resource constraints](https://docs.docker.com/engine/containers/resource_constraints/)
- [Docker none network driver](https://docs.docker.com/engine/network/drivers/none/)
- [Docker container run controls](https://docs.docker.com/reference/cli/docker/container/run)
- [Python command-line and environment behavior](https://docs.python.org/3/using/cmdline.html)
