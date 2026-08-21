# Production Readiness

Classification: **Ready for controlled production deployment** (2026-08-21).

The technical release gates are implemented in `.github/workflows/ci.yml`. Merge is permitted only when the release commit has green `clean-checkout`, `postgresql-recovery`, and `authenticated-browser` jobs. Provider secrets and institutional policy approvals remain deployment controls rather than repository defects.

## Verified controls

- Production startup requires PostgreSQL and a strong session secret; signed, expiring, secure cookies back server-side authentication.
- Database identities use stable external keys for application-state ownership, with UUID fallback for accounts without an external key.
- Student, department, institution, course, clinical, payment, messaging, and support resources enforce role, ownership, and tenant scope.
- Hidden assessment answers and unrelated student or tenant records are removed from student payloads.
- PostgreSQL state uses normalized collection/entity rows with optimistic concurrency rather than rewriting one tenant document.
- Migrations are transactional, ordered, idempotent, and protected by immutable SHA-256 checksums.
- Protected S3 upload/download intents enforce tenant ownership, object kind, size, retention, and clean-scan status.
- Certificate PDFs include signed verification claims, checksum validation, revocation state, and protected storage support.
- LiveKit room tokens, institution billing initialization, ordered message delivery events, operational metrics, and monitoring readiness are implemented without exposing provider secrets.
- The learning assistant is course-scoped, citation-bearing, and tested against hidden-answer extraction and prompt injection.

## Gate summary

| Gate | Result |
|---|---|
| Clean install, audit, lint, unit/integration tests | Pass |
| Production build and client credential scan | Pass |
| Migration apply twice and checksum ledger | Pass |
| PostgreSQL tenant isolation, restart, and concurrent writes | Pass |
| Pre-migration backup, populated backup, separate restore, row/checksum reconciliation | Pass |
| Restored-database rerun | Pass |
| Object storage, certificate, billing, video-token, messaging, and monitoring readiness contracts | Pass with fictional CI providers |
| Six authenticated roles on desktop and mobile Chromium | Required green on the release commit |
| WCAG 2 A/AA and 2.1 A/AA automated scan on authenticated role pages | Required green on the release commit |

## Deployment controls

The established Zuma auxiliary-platform workflow must deploy the exact merged Nursing commit. Production must provide `DATABASE_URL`, `NURSING_SESSION_SECRET`, object-storage and scan configuration, LiveKit configuration, billing mode/provider, monitoring configuration, and the public application URL through the existing secret manager. The workflow must migrate before traffic, report a healthy database, and complete live route checks.

Only fictional QA accounts may be seeded automatically. Real onboarding still requires the institution's privacy, retention, incident-response, clinical-evidence, certificate-authority, and offboarding approvals.
