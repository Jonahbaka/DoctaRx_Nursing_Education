# Nursing Platform Production Audit

Date: 2026-07-10

## Release Decision

The application is ready for a controlled pre-production pilot after its target PostgreSQL database is migrated, deployment secrets are provisioned, and QA account passwords are rotated. It has not been deployed as part of this release, by request.

Real student onboarding should remain closed until the deployment checklist below is complete and the institution has approved privacy, support, retention, and incident-response procedures.

## Verified Controls

- Production startup requires PostgreSQL and a session secret of at least 32 characters.
- Authentication is server-side. Passwords are bcrypt hashes in PostgreSQL.
- Sessions use signed, expiring, `HttpOnly`, `SameSite=Lax`, production `Secure` cookies.
- API requests re-resolve the account and reject inactive, disabled, or incomplete scopes.
- Middleware verifies the signed session before protected page access and enforces role dashboard routing.
- Institution and department scope is applied to persisted application state.
- Course, grade, timeline, logbook, payment, support, messaging, and office-hour mutations are permission checked.
- Auth and public access-request endpoints are rate limited.
- API responses disable `X-Powered-By`; Helmet, compression, and a 1 MB JSON limit are enabled.
- Audit events are retained for protected state changes.
- The browser bundle scan rejects local QA credentials and server-secret identifiers.
- The production dependency audit reports zero known vulnerabilities.
- Public pages do not expose internal role dashboard links or a role workspace selector.
- Generated clinical imagery and explicit contrast styling were checked on desktop and mobile.

## Deployment Gate

1. Provision a backed-up PostgreSQL database and a least-privilege application user.
2. Set `DATABASE_URL`, `NURSING_SESSION_SECRET`, `NODE_ENV=production`, and the public application URL through the deployment secret manager.
3. Run `npm run migrate` against the target database.
4. Seed fictional pilot content only when required; set a unique temporary `NURSING_TEST_ACCOUNT_PASSWORD` first.
5. Disable or remove QA accounts before real institutional onboarding.
6. Build with `npm ci && npm run lint && npm test && npm run build && npm run test:bundle`.
7. Terminate TLS at the load balancer or reverse proxy and confirm secure-cookie behavior.
8. Verify `/api/health` returns HTTP 200 with `database.healthy=true`.
9. Run role-by-role sign-in, wrong-role access, write/readback, sign-out, and backup-restore smoke tests.
10. Enable centralized logs, uptime alerts, database monitoring, and an incident contact.

## Known Pilot Boundaries

- Support chat refreshes every five seconds; it does not use WebSockets.
- The telehealth skills lab is a documentation and role-play simulator, not a live clinical video service.
- Payment records support controlled manual verification; no payment gateway is connected.
- Certificates are printable from the browser; a dedicated signed PDF issuance service is not included.
- File and media upload storage is not wired to object storage.
- Runtime workflows are persisted transactionally as tenant JSONB state while normalized schema tables support identity and future workflow decomposition.
- The repository has no production hosting workflow yet. Deployment is intentionally deferred.

These boundaries are acceptable for supervised pilot testing but must be reviewed before wider institutional or regulated use.
