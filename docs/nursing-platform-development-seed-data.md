# Nursing Platform Development Seed Data

## Command

```bash
npm run seed:nursing
```

The command reads `lib/nursingEducationData.js` and writes deterministic development records into the nursing tables created by `server/db/migrations/1100_nursing_education_platform.sql`.

## Seed Coverage

- Institution, department, academic session, cohorts, users, and user roles
- User profiles with bio, skills, interests, and notification settings
- Courses, modules, course sections, lessons, lesson resources, enrollments, and lesson progress
- Quizzes, questions, attempts, and answers
- Assignments, submissions, grades, and grade comments
- Course discussions and replies
- Timeline posts, comments, reactions, attachments, reports, and notifications
- Simulation cases, simulation steps, telehealth lab sessions, lab notes, clinical skills, logbook entries, supervisor reviews, payment records, certificates, reports, files, and audit logs

## Development Credentials

Default password: `DemoPass!2026`

Override with:

```bash
NURSING_DEMO_PASSWORD='your-local-password' npm run seed:nursing
```

Credential examples are documented in `docs/nursing-platform-demo-credentials.md`.

## Data Safety

Seeded simulation patients and notes are fictional. Do not replace them with real patient information. Keep real PHI out of local seed files, docs, tests, and screenshots.
