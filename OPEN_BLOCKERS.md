# Open Blockers

Classification: **No unresolved repository P0 or P1 blockers.**

Merge remains conditional on all three CI jobs being green on the release commit. Deployment remains conditional on the established Zuma auxiliary-platform workflow finishing successfully for the exact merged Nursing SHA and live health checks confirming the database-backed service.

## Production operator controls

- Provision and rotate the database, session, S3/object-scan, LiveKit, billing, and monitoring secrets in the existing deployment secret manager.
- Keep automatic seed data fictional and disable or rotate QA accounts before real institutional onboarding.
- Confirm production TLS, secure cookies, database health, backup retention, monitoring delivery, and rollback readiness during deployment.
- Record nursing-school approvals for privacy, retention, incident response, clinical placement evidence, certificate authority, and offboarding before processing real student or patient-related records.

These controls are intentionally not represented as application-code blockers. Any failed CI, deployment, migration, restore, or live-health gate reopens the release blocker automatically.
