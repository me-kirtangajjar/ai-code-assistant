# Project Roadmap

## Completed Delivery

| Sprint | Outcome                                                                                       |
| ------ | --------------------------------------------------------------------------------------------- |
| 1      | pnpm monorepo, TypeScript applications, quality configuration, and documentation foundation.  |
| 2A     | Database, API, authentication, validation, error, and convention design.                      |
| 2B     | Mongoose models, MongoDB lifecycle, startup/shutdown handling, and health endpoint.           |
| 3      | Registration, login, seven-day JWT bearer authentication, and `/auth/me`.                     |
| 4A     | Python runner, sandbox, classification, cleanup, and contract design.                         |
| 4B     | Authenticated Docker execution, resource limits, classification, and persistence.             |
| 5      | Vendor-neutral AI explanation service with mock and Gemini providers.                         |
| 6      | Login, registration, protected dashboard, Monaco editor, execution, and AI feedback UI.       |
| 7      | Ownership-scoped paginated history, detail view, and read-only profile statistics.            |
| 8      | Accessibility, validation, logging, error consistency, and security hardening.                |
| 9      | Production Dockerfiles, Compose topology, health/startup gates, and deployment guide.         |
| 10     | Final consistency audit, dead-code cleanup, verification checklist, and submission documents. |

Detailed records remain in `docs/Sprint-1.md` through `docs/Sprint-10.md`.

## Version 1 Scope Status

The MCA Version 1 feature scope is complete. Students can register, log in, execute Python safely,
receive Python-authoritative results with optional AI explanations, and review their own history and
profile statistics.

Live production acceptance remains environment-dependent: a Docker-authorized account must build the
images and execute the end-to-end checklist in [Testing Checklist](Testing%20Checklist.md).

## Scope Guardrails

Multiple languages, refresh tokens, instructor/LMS workflows, quizzes, collaboration, AI chat,
microservices, and non-MongoDB databases remain outside Version 1. Potential post-submission work is
listed separately in [Future Enhancements](Future%20Enhancements.md); that list is not approval to
expand the submitted project.
