# DoctaRx Nursing UI Rebuild Validation

Date: 2026-07-08

## Scope

The nursing education workspace was rebuilt around a production app shell with a fixed dark sidebar, white main workspace, sticky topbar, module navigation, role-aware dashboards, premium glass morph cards, and generated clinical education imagery.

## Generated Image Assets

- `public/images/nursing/nursing-command-center-hero.png`
- `public/images/nursing/nursing-lms-telehealth-course.png`
- `public/images/nursing/nursing-simulation-lab.png`
- `public/images/nursing/nursing-logbook-profile-cover.png`
- `public/images/nursing/nursing-telehealth-skills-lab.png`

## Primary Routes

- `/ng/nursing`
- `/ng/nursing/login`
- `/ng/nursing/student`
- `/ng/nursing/lecturer`
- `/ng/nursing/hod`
- `/ng/nursing/coordinator`
- `/ng/nursing/supervisor`
- `/ng/nursing/admin`

## Module Routes

- `/ng/nursing/profile`
- `/ng/nursing/settings`
- `/ng/nursing/courses`
- `/ng/nursing/courses/[courseId]`
- `/ng/nursing/courses/[courseId]/stream`
- `/ng/nursing/courses/[courseId]/learn/[lessonId]`
- `/ng/nursing/courses/[courseId]/builder`
- `/ng/nursing/timeline`
- `/ng/nursing/cohorts/[cohortId]/stream`
- `/ng/nursing/assignments`
- `/ng/nursing/assignments/[assignmentId]`
- `/ng/nursing/gradebook`
- `/ng/nursing/logbook`
- `/ng/nursing/logbook/[entryId]`
- `/ng/nursing/simulation`
- `/ng/nursing/simulation/[caseId]`
- `/ng/nursing/telehealth-lab`
- `/ng/nursing/telehealth-lab/[sessionId]`
- `/ng/nursing/reports`
- `/ng/nursing/payments`
- `/ng/nursing/messages`
- `/ng/nursing/notifications`
- `/ng/nursing/students/[studentId]`

## Functional Coverage

- Role-aware dashboard shell for student, lecturer, HOD, clinical coordinator, supervisor, institution admin, support admin, and super admin roles.
- Profile editing with academic identity, activity, skills, logbook, grade, and certificate context.
- Timeline composer, comments, reactions, and moderation actions.
- LMS course cards, lesson player, course builder, resources, progress, and enrollment context.
- Assignment submission, grading queue, gradebook comments, and quiz attempt workflow.
- Discussion/Q&A board and messages/notifications workspace.
- Simulation case bank, vitals panel, assessment checklist, and care-plan scoring.
- Telehealth skills lab with role switching, checklist, documentation, and submission state.
- Digital logbook with entry submission, supervisor review, approval, and return flow.
- Certificates, reports CSV export, payments/access verification, and settings preferences.

## Copy Review

Product-facing nursing UI avoids provisional labels such as "Development Login", "seeded workspace", "Demo Login", and "Demo Accounts". Internal fixture keys may still use development-oriented names where they are not rendered to users.

## Preview Account

- Student preview email: `nursing.student.preview@uniabuja.edu.ng`
- Password: `DemoPass!2026`
- Expected route after sign in: `/ng/nursing/student`

## Verification

- `npm run test`: passed, 12/12 integration tests.
- `npm run lint`: passed with no errors.
- `npm run build`: passed. Next.js generated 31 nursing application routes.
- `npm run test:bundle`: passed with no QA password or server secret marker in browser chunks.
- Local preview: passed on `/ng/nursing/login`; the preview student account signs in to `/ng/nursing/student`.
- Contrast check: passed on login and signed-in dashboard; no black-on-black text was detected in the audited visible text.
- Landing page image/contrast check: passed on `/ng/nursing`; the hero stat cards now use dark glass with explicit light text, and the Institution Operations, Clinical Training, Academic Evidence, and role workspace sections use nursing image assets instead of text-only cards.

## Route Behavior

Dynamic module routes currently open the correct workspace tab inside the unified dashboard shell. They do not yet deep-select a specific course, lesson, assignment, logbook entry, simulation case, telehealth session, or student from the URL parameter.

Support chat, general messages, office hours, and queue workflows now persist through the API. See `nursing-platform-production-audit.md` for deployment prerequisites and controlled-pilot boundaries.
