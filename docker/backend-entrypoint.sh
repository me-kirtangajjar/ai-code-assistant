#!/bin/sh

set -eu

: "${PYTHON_RUNNER_IMAGE:?PYTHON_RUNNER_IMAGE is required.}"
: "${TMPDIR:?TMPDIR is required.}"

if [ ! -d "$TMPDIR" ] || [ ! -w "$TMPDIR" ]; then
  echo "Backend startup validation failed: runner workspace is not writable." >&2
  exit 1
fi

if ! docker version --format '{{.Server.Version}}' >/dev/null 2>&1; then
  echo "Backend startup validation failed: Docker daemon is unavailable." >&2
  exit 1
fi

if ! docker image inspect "$PYTHON_RUNNER_IMAGE" >/dev/null 2>&1; then
  echo "Backend startup validation failed: configured Python runner image is unavailable." >&2
  exit 1
fi

exec "$@"
