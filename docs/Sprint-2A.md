# Sprint 2A: Technical Design Documentation

## Objective

Define implementation-ready contracts for persistence, REST APIs, authentication, module interaction,
validation, error handling, and project conventions without creating application code.

## Deliverables

- [Database Design](Database.md)
- [REST API Specification](API.md)
- [Standard API Response Format](API-Response-Standard.md)
- [Authentication Design](Authentication.md)
- [System Architecture and Module Interaction](Architecture.md)
- [Validation Strategy](Validation.md)
- [Error Handling Strategy](Error-Handling.md)
- [Project Conventions](Conventions.md)
- [Authentication Sprint Definition of Done](Sprint-2-Authentication-DoD.md)

## Key Decisions

- Use only `users` and `submissions` collections in Version 1.
- Use `/api/v1` as the API prefix and one standard JSON envelope.
- Registration does not issue a token; login issues a 24-hour bearer JWT.
- Store JWTs client-side and perform logout through client-side removal only.
- Use Zod for frontend usability and authoritative backend validation.
- Treat Python syntax/runtime errors as successful saved analysis outcomes.
- Call AI only for Python-reported errors; AI failure does not fail execution.
- Use Mongoose for future MongoDB mapping while retaining MongoDB as the only database.

## Explicit Exclusions

Sprint 2A adds no controllers, routes, React components, models, dependencies, environment values,
Docker behavior, AI provider, database connection, or business logic.

## Acceptance Criteria

- Every required endpoint has validation, success, failure, and status-code contracts.
- Every collection field and index has an explicit purpose.
- Authentication and error lifecycles are unambiguous.
- Future implementation can be reviewed directly against documented decisions.
- Markdown formatting passes the repository check.
