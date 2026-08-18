# Test Evidence

Evidence date: 2026-08-18. Runtime: Node.js 22.12.0, npm 10.9.0. The package requires Node 20.19+; CI should use a currently supported patched Node release.

| Command | Result |
|---|---|
| `npm ci` | Clean dependency installation completed during remediation. |
| `npm audit` | Exit 0; 0 vulnerabilities. |
| `npm audit --omit=dev` | Exit 0; 0 vulnerabilities. |
| `npm run lint` | Exit 0; no output/errors. |
| `npm test` | Final exit 0; 28 tests passed, 0 failed. |
| `npm run build` | Exit 0; Next.js 15.5.23 compiled and generated 37 static pages. |
| `npm run test:bundle` | Exit 0; `Client bundle credential scan passed.` |
| Local HTTP `/ng/nursing/login` | 200, 25,175-byte HTML response containing nursing content. |
| Local development `/api/health` | `healthy` development service status while explicitly reporting database `healthy:false`, `configured:false`; production startup requires a database and was not claimed. |

The suite covers signed-cookie tamper rejection, all eight roles, student answer/record redaction, role authorization, persistence/readback in the test store, messages, waiting rooms, office hours, assignments, lessons, progress, simulations, logbook, payments, timeline, medication education and source sanitization.

## Unproven gates

No PostgreSQL server was supplied, so migrations, database-backed concurrent writes, restart persistence, backup/restore and cross-institution SQL/object attacks were not run. No authenticated browser, mobile/WCAG, object-storage, payment, video, certificate-PDF, monitoring or production startup soak evidence exists. These are blockers.

The in-app browser runtime could not initialize because its local assets were unavailable, so no screenshots or interactive browser passes are claimed.
