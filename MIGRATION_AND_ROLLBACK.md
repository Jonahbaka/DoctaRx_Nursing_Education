# Migration and Rollback

## Current schema

- `1100_nursing_education_platform.sql` creates the normalized LMS schema and `nursing_platform_state`.
- `1110_dailymed_medication_education.sql` creates medication note/attempt/progress persistence.
- The migration runner applies sorted SQL files. DDL uses idempotent creation, but no migration ledger/checksum is maintained.
- Active general workflows still read/write one locked JSONB state row per institution; normalized tables are not the primary write path for most features.

## Staging proof required

1. Back up a disposable PostgreSQL database and verify restore.
2. Run `npm run migrate` twice; the second run must be safe.
3. Seed only fictional accounts with an explicitly supplied test password.
4. Run all API workflows, restart the server and verify readback.
5. Run concurrent same-tenant and cross-tenant mutations; measure lock latency and prove isolation.
6. Reconcile state versions, course/enrollment/progress/grade/logbook/message counts.
7. Restore the backup to a separate database and repeat smoke tests.

## Rollback

Prefer application rollback for backward-compatible schema changes. Because there are no down migrations, destructive schema reversal is prohibited during an incident. Restore the verified pre-change backup if schema rollback is required. Preserve audit and student evidence according to approved institutional policy.

No PostgreSQL target was available in this run, so these steps remain blocked.
