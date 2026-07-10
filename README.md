# DoctaRx Nursing Education

DoctaRx Nursing Education is a standalone nursing learning, clinical training, academic evidence, and student support platform. It combines a Next.js interface with a same-origin Express API and PostgreSQL-backed tenant state.

## Product Coverage

- Eight nursing roles with server-enforced permissions and role routing
- Institution, department, session, cohort, course, lesson, and progress management
- Assignments, submissions, grading, quizzes, discussions, and academic timeline
- Simulation cases, telehealth documentation practice, and clinical logbook reviews
- Certificates, payment-access verification, reporting, and audit events
- Persisted messages, academic support waiting rooms, escalations, and office hours
- Responsive public, student, academic staff, and administration interfaces

## Local Setup

Requirements: Node.js 20.19 or newer. PostgreSQL is optional for local interface testing and required in production.

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Open `http://localhost:3000/ng/nursing`. Outside production, the app uses an isolated local state file when `DATABASE_URL` is not configured. That adapter is blocked in production.

## Database Setup

Configure `DATABASE_URL`, then apply the schema:

```powershell
npm run migrate
```

The optional seed command loads fictional pilot training data and QA accounts. Set a unique password before running it:

```powershell
$env:NURSING_TEST_ACCOUNT_PASSWORD = '<unique-temporary-password>'
npm run seed
```

Do not reuse the documented local QA password in a shared or public environment.

## Production Requirements

Production startup fails closed unless both `DATABASE_URL` and a `NURSING_SESSION_SECRET` of at least 32 characters are present. Use TLS at the reverse proxy, rotate QA credentials, run migrations before application startup, and keep `NEXT_PUBLIC_ENABLE_NURSING_ROLE_SWITCHER=false`.

```bash
npm ci
npm run migrate
npm run build
npm start
```

The included multi-stage `Dockerfile` provides the same production startup path.

## Verification

```bash
npm run lint
npm test
npm run build
npm run test:bundle
```

`test:bundle` checks generated browser bundles for the local QA password and server-only secret names.

## Release Documents

- [Production audit](docs/nursing-platform-production-audit.md)
- [Feature test report](docs/nursing-platform-feature-test-report.md)
- [Final feature check](docs/nursing-platform-final-feature-check.md)
- [Architecture](docs/nursing-platform-architecture.md)
- [QA account credentials](docs/nursing-platform-demo-credentials.md)
