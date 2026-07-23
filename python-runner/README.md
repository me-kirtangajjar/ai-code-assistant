# Python Runner Location

The implemented Python runner is an internal backend boundary at `backend/src/python-runner`; it is
not a separately deployed service or a second Python application. The trusted runtime image is defined
by `docker/Dockerfile.python`.

This directory preserves the architecture note from the initial project scaffold. Its obsolete empty
`runner.py` and `requirements.txt` placeholders were removed in Sprint 9 so there is only one visible
execution path.

See:

- [Python Execution Pipeline](../docs/Execution-Pipeline.md)
- [Python Runner Contract](../docs/Runner-Contract.md)
- [Docker Sandbox Architecture](../docs/Sandbox-Architecture.md)
- [Execution Error Classification](../docs/Error-Classification.md)
