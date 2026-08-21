# Nursing Platform Production Audit

Date: 2026-08-21

## Release decision

The application is ready for controlled production deployment after the exact release commit passes all three CI jobs. Live operation remains gated by the established Zuma auxiliary-platform deployment workflow, production provider configuration, healthy database verification, and institutional policy approval.

## Implemented architecture

- PostgreSQL is mandatory in production. Application state is decomposed into normalized collection, entity, and metadata rows with versioned optimistic concurrency and operation metrics.
- Ordered SQL migrations run transactionally and are pinned to immutable SHA-256 ledger entries.
- Database-backed identities map UUID records to stable application external keys so enrollments, ownership, and role-scoped state remain consistent after sign-in and restart.
- Authentication uses bcrypt hashes and signed, expiring, `HttpOnly`, `SameSite=Lax`, production `Secure` cookies. Protected requests re-resolve active account scope.
- Tenant and object authorization cover course, learner, grade, clinical, payment, messaging, support, storage, and certificate workflows.
- S3 presigning, clean-scan enforcement, retention metadata, certificate PDF verification/revocation, LiveKit token issuance, institution billing, delivery events, metrics, and alert-provider readiness are implemented behind environment-backed adapters.

## Automated release gates

1. Clean install, dependency audit, lint, 32 tests, production build, and client bundle credential scan.
2. Pre-migration backup, migrations applied twice, fictional seed, database API/isolation/restart/concurrency/integration proof.
3. Populated backup, restore into a separate database, row/checksum reconciliation, and proof rerun on the restored database.
4. Six authenticated professional roles across desktop and mobile Chromium, including persisted learner and lecturer actions, runtime-error capture, screenshots, and automated WCAG A/AA scans.

## Operational boundaries

- CI validates provider contracts with fictional credentials; production secrets and real provider endpoints are verified during deployment.
- Automatic seed content and accounts are fictional. Real institutional onboarding requires privacy, retention, incident-response, clinical-evidence, certificate-authority, and offboarding approvals.
- Successful repository CI does not replace live migration, health, TLS, monitoring, backup-retention, and rollback checks in the deployment workflow.
