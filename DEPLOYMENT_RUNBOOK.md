# Deployment Runbook

This runbook is for a controlled staging deployment; it does not authorize production use.

## Preconditions

- Reviewed commit SHA and clean checkout on a patched Node 20/22 runtime.
- Dedicated PostgreSQL database and least-privilege application/migration roles.
- Verified backup/restore point and rollback owner.
- HTTPS reverse proxy, secret store, error/uptime/database monitoring and alert contacts.
- Secure object storage must exist before enabling file/media workflows.
- Do not run `npm run seed` in production. Test-account authentication is disabled by code in production, but seeded QA rows must also be absent/disabled.

## Build and staging activation

```text
npm ci
npm audit --omit=dev
npm run lint
npm test
npm run build
npm run test:bundle
npm run migrate
```

Start with `NODE_ENV=production`, `DATABASE_URL`, `NURSING_SESSION_SECRET` and the approved origin/asset prefix. Verify database health, `/health`, signed login/session/logout, one mutation/readback, restart persistence and a denied cross-institution request before routing users.

## Stability and rollback

Soak under representative concurrent institutional writes while watching row-lock latency, connection pool, memory and error rate. The active state store locks one tenant JSONB row per mutation; unacceptable contention is a stop condition.

Rollback the application to the prior SHA and re-run health/smoke. SQL migrations are currently idempotent DDL without a migration ledger or down scripts; therefore schema rollback requires a tested database restore, not ad hoc destructive SQL. Record deployed SHA, migration files, operator and times.
