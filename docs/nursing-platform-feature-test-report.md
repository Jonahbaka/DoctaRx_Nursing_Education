# Nursing Platform Feature Test Report

Date: 2026-07-10

## Automated Results

| Check | Result |
| --- | --- |
| ESLint | Passed with no errors |
| Node integration suite | Passed, 12 of 12 tests |
| Next.js production build | Passed, 31 routes generated |
| Client bundle secret scan | Passed |
| Production dependency audit | Passed, 0 vulnerabilities |

The integration suite runs through the same Express router used by the application and resets an isolated test state between scenarios.

## Workflows Exercised

| Area | Verified behavior |
| --- | --- |
| Authentication | All eight roles sign in; signed cookie is `HttpOnly`; tampered and expired sessions fail; logout clears the cookie |
| RBAC | Students are denied lecturer and institution-admin mutations; role dashboards return role-specific data |
| Access requests | Required contact details validate and accepted requests persist |
| LMS | Course, section, lesson, and lesson-progress writes persist on readback |
| Cohorts | Institution administrators can create cohorts; students cannot |
| Academic work | Timeline posts, comments, reactions, assignments, submissions, grades, discussions, and messages persist |
| Assessments | Quiz attempts and simulation submissions are scored and retained |
| Clinical evidence | Telehealth notes, logbook entries, supervisor reviews, and certificate eligibility persist |
| Payments | Authorized manual verification changes access state; unauthorized roles are rejected |
| Support | Queue join, assignment, resolution, chat, escalation, follow-up, no-show, and history flows persist |
| Office hours | Authorized staff schedule sessions; students join and submit questions; hosts update status and notes |
| Privacy settings | WhatsApp support is hidden by default and appears only after an individual administrator opts in |

## Browser Checks

- Desktop landing, authorized-access section, login, role dashboard, and support console rendered without overlap.
- Mobile landing, login, dashboard navigation drawer, and support console fit a 390 by 844 viewport without horizontal overflow.
- Hero and support text contrast was inspected; no black-on-black text was found.
- Student login redirected to the student workspace.
- Student access to the admin route redirected to the student workspace.
- Unauthenticated protected access redirected to login with the requested destination.
- Student queue joining and chat were visible to an HOD, who accepted the request and enabled personal WhatsApp support through the interface.

## Environment Note

Automated workflows used the non-production isolated state adapter. The SQL migration was not executed because no release database was supplied. A database-backed smoke test remains a mandatory deployment gate.
