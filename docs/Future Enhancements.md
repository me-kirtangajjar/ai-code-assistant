# Future Enhancements

The MCA Version 1 submission is complete within its approved scope. The following items are possible
post-submission improvements and are not part of the delivered feature set.

## Recommended Operational Improvements

1. Add CI for install, formatting, type-check, lint, backend tests, and clean container builds.
2. Pin production base images by digest and add dependency/image vulnerability scanning.
3. Add TLS reverse-proxy/load-balancer configuration, managed secrets, automated MongoDB backups, and
   tested restore automation.
4. Add deployment-aware rate limiting for registration, login, and execution endpoints.
5. Add metrics and alerts for request latency, MongoDB health, execution outcomes, cleanup failures,
   and AI availability without logging student code.
6. Evaluate a more restricted Docker-control proxy or dedicated execution host to reduce direct socket
   exposure while preserving the approved backend-runner contract.

## Recommended Quality Improvements

1. Add isolated MongoDB integration tests for authentication, persistence, ownership, pagination, and
   profile statistics.
2. Add automated browser smoke tests for critical frontend flows and keyboard accessibility.
3. Add repeatable live sandbox tests for timeout, memory, output, network, filesystem, user, and cleanup
   controls on both Docker Desktop and Linux.
4. Add contract fixtures shared at test time so frontend response parsers are checked against backend
   serialization examples without coupling runtime deployments.
5. Measure history queries before considering the documented compound index.

## Optional Product Enhancements Requiring New Approval

- Password reset/change, email verification, short-lived access plus refresh-token rotation, and token
  revocation.
- History search/filter/export or user-controlled deletion with an explicit retention policy.
- Instructor workflows, LMS integration, quizzes, collaboration, or AI chat.
- Additional programming languages, each with a separate approved image, classifier, validation rules,
  and sandbox test suite.

Any enhancement must preserve MongoDB-only persistence, predictable REST envelopes, strict ownership,
and the rule that the language runtime—not AI—detects programming errors. Larger architectural changes
require a new design decision rather than silent expansion.
