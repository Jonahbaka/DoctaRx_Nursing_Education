# Test Evidence

Evidence date: 2026-08-21. Runtime: Node.js 20.19.0, npm 10.8.x, PostgreSQL 16, Next.js 15.5.23. The authoritative release run is linked from PR #1 and must be green for the exact merged head.

| Gate | Evidence |
|---|---|
| Clean checkout | `npm ci`, high-severity audit, lint, 32 unit/integration tests, production build, and client-bundle credential scan |
| PostgreSQL migration | Three ordered migrations including `1120_nursing_production_platform.sql`; second apply reports already-applied files; migration checksums are 64-character SHA-256 values |
| Database behavior | Database-backed API proof, two-fictional-institution isolation, stable external user identity, restart readback, 16 concurrent normalized writes, and integration-readiness assertions |
| Recovery | Pre-migration custom dump, populated custom dump, restore into a separate database, source/restored row and entity checksum diff, then complete database proof rerun against the restore |
| External contracts | Tenant-scoped S3 presigning, scan-state authorization, PDF certificate generation and claims verification, LiveKit JWT creation, institution invoice initialization, ordered message events, and monitoring readiness |
| Authenticated browser | Six professional roles on desktop Chromium and mobile Chromium; role route, session/bootstrap, persisted learner and lecturer writes, screenshots, and runtime-error collection |
| Accessibility | axe-core WCAG 2 A/AA and WCAG 2.1 A/AA rules on every authenticated role/device case |

The unit suite covers DailyMed normalization and sanitization, signed-cookie tamper rejection, eight professional accounts, student record and answer redaction, role authorization, tenant isolation, messaging integrity, waiting rooms, office hours, assignments, lessons, progress, simulations, logbooks, payments, certificates, course catalogue and learner engagement, and grounded-assistant safety.

CI retains PostgreSQL recovery logs/dumps/reconciliation JSON and Playwright reports, screenshots, videos, and traces as GitHub Actions artifacts for 14 days.
