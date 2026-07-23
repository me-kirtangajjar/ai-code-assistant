# Known Limitations

## Functional Scope

- Python is the only supported language; there is no stdin, package installation, file upload, or
  multi-file execution.
- Authentication uses one seven-day bearer token. There is no refresh token, server-side logout,
  revocation list, password reset/change, email verification, roles, or social login.
- Profile data is read-only. History supports pagination only—no search, filters, export, or deletion.
- AI is explanatory only. Output is provider-generated Markdown-like text and may be incomplete or
  inaccurate; Python execution facts remain authoritative.

## Security and Operations

- Browser local storage is vulnerable if an attacker achieves script execution; strict XSS prevention
  and HTTPS are therefore mandatory.
- The trusted backend container mounts the Docker socket. This is effectively host-level Docker
  authority and requires a tightly controlled deployment account and host.
- Rate limiting is not implemented. Public internet deployment should add a deployment-aware policy
  without weakening the predictable API contract.
- Compose does not provide TLS termination, DNS, managed secrets, automated backups, monitoring,
  alerting, or centralized log retention.
- Base container images use stable tags rather than immutable digests.

## Scale and Reliability

- Execution concurrency is bounded in memory per backend process. Multiple backend replicas would not
  share that counter and require a separately designed global policy.
- Docker startup overhead is included in execution timing and can be significant on low-resource hosts.
- History uses separate `userId` and `createdAt` indexes. A measured compound-index migration may be
  useful for much larger data volumes.
- AI calls occur inside the analysis request with a timeout and no background retry queue.
- The health endpoint reports process/database state only; it does not probe Docker or the AI provider.

## Testing

- Automated coverage focuses on AI, HTTP quality boundaries, and runner classification. Authentication,
  MongoDB ownership, frontend behavior, and live sandbox controls require the documented manual/API
  checklist.
- A complete production image and end-to-end Docker run could not be executed on the final audit host
  because the current account lacked Docker socket group membership.

These limitations are explicit Version 1 boundaries, not hidden incomplete features.
