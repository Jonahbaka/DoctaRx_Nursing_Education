# Nursing Platform Admin Guide

## Access

- Institution admin: `/ng/nursing/admin`
- HOD: `/ng/nursing/hod`
- Clinical coordinator: `/ng/nursing/coordinator`
- Supervisor: `/ng/nursing/supervisor`

Seeded credentials are listed in `docs/nursing-platform-demo-credentials.md`.

## Academic Administration

Institution and HOD users can manage cohorts, review course coverage, inspect assignments and gradebook status, moderate timeline content, and review reports.

Clinical coordinators focus on simulation, telehealth lab operations, clinical placement evidence, logbook coverage, and readiness reports.

Supervisors focus on telehealth practice review and logbook approvals.

## Sensitive Operations

The nursing routes preserve role checks for profile access, lesson management, assignment creation, grading, timeline moderation, logbook review, reports, and payments. Do not weaken these checks when integrating production identity or persistent write models.

The platform uses fictional clinical simulation patients in seeded data. Real PHI must not be added to seed data, repository fixtures, screenshots, or documentation.

## Operational Checklist

1. Apply `server/db/migrations/1100_nursing_education_platform.sql`.
2. Configure database and auth environment variables.
3. Run `npm run seed:nursing` for development data.
4. Validate with `npm run test`, `npm run lint`, and `npm run build`.
5. Review `/ng/nursing/login` and each role route.
