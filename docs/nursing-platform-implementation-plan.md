# DoctaRx Nursing Platform Implementation Plan

## Existing Stack Found

- Framework: Next.js 15 App Router under `app/`, with React 18 client components where interactive workflows are needed.
- Server: Express API in `server/index.js`, with route modules under `server/routes/`.
- Database: PostgreSQL through `pg`; core migrations are in `server/db/migrate.js`, with additional SQL files under `server/db/migrations/`.
- Auth/RBAC: JWT-based Express middleware in `server/middleware/auth.js`; current core user roles are patient, provider, pharmacy, admin, and super_admin. Nursing education roles will use a module-specific role layer so the core enum is not destabilized.
- Styling/UI: Tailwind CSS, shared UI primitives in `components/ui/`, shared portal layout in `components/layouts/DashboardLayout.jsx`, Nigeria portal shell patterns in `components/ng/`.
- Branding/assets: Existing DoctaRx logo component, Nigeria market shell, clean health-tech dashboard conventions, lucide-react icons.
- API conventions: Express JSON routers mounted under `/api/*`, with authentication and audit middleware for high-risk routes.
- Deployment/scripts: `npm run lint`, `npm run build`, `npm run migrate`, `npm run ng:migrate`, and several seed/verification scripts.

## Routes To Create

- `/ng/nursing`
- `/ng/nursing/login`
- `/ng/nursing/student`
- `/ng/nursing/lecturer`
- `/ng/nursing/hod`
- `/ng/nursing/coordinator`
- `/ng/nursing/supervisor`
- `/ng/nursing/admin`

The module will also expose role-filtered working sections through query/tab state inside those dashboards rather than adding unrelated routes to existing patient, provider, pharmacy, or admin portals.

## API Routes To Add

- `/api/nursing/auth/login`
- `/api/nursing/session`
- `/api/nursing/dashboard/:role`
- `/api/nursing/institutions`
- `/api/nursing/departments`
- `/api/nursing/sessions`
- `/api/nursing/cohorts`
- `/api/nursing/courses`
- `/api/nursing/lessons`
- `/api/nursing/quizzes`
- `/api/nursing/simulations`
- `/api/nursing/telehealth-lab`
- `/api/nursing/logbook`
- `/api/nursing/certificates`
- `/api/nursing/payments`
- `/api/nursing/reports`
- `/api/nursing/admin`

## Database Tables Needed

- `nursing_institutions`
- `nursing_departments`
- `nursing_academic_sessions`
- `nursing_cohorts`
- `nursing_users`
- `nursing_user_roles`
- `nursing_courses`
- `nursing_course_modules`
- `nursing_lessons`
- `nursing_quizzes`
- `nursing_quiz_questions`
- `nursing_quiz_attempts`
- `nursing_quiz_answers`
- `nursing_simulation_cases`
- `nursing_simulation_steps`
- `nursing_simulation_attempts`
- `nursing_simulation_responses`
- `nursing_telehealth_lab_sessions`
- `nursing_telehealth_lab_notes`
- `nursing_clinical_logbook_entries`
- `nursing_clinical_skills`
- `nursing_logbook_skill_entries`
- `nursing_supervisor_reviews`
- `nursing_certificates`
- `nursing_payment_records`
- `nursing_announcements`
- `nursing_reports`
- `nursing_audit_logs`
- `nursing_files_or_uploads`

Every tenant-owned table will include institution and department references where appropriate, timestamps, and indexes on institution, department, user, role, cohort, course, academic session, and status fields.

## User Roles

- Super Admin
- Institution Admin
- HOD / Department Admin
- Lecturer
- Clinical Coordinator
- Clinical Supervisor / Preceptor
- Student Nurse
- DoctaRx Support Admin

## Modules To Build

- Institution and academic session management
- Nursing LMS
- Virtual clinical simulation
- Telehealth skills lab
- Digital clinical logbook
- Assessment and quiz module
- Certificate module
- HOD reports and analytics
- Payment and access tracking
- Demo authentication and seeded user journeys

## Existing Code To Reuse

- App Router route structure under `app/ng`.
- `DashboardLayout` and DoctaRx logo styling patterns.
- Tailwind utility approach and lucide icons.
- Express route module convention under `server/routes`.
- PostgreSQL migration/seed conventions under `server/db/migrations` and `server/scripts`.
- Existing audit/security posture: avoid touching PHI, visit, appointment, video, payment, patient, provider, pharmacy, and admin control paths except adding the new namespaced router.

## Risks

- Nursing roles do not fit the existing `user_role` enum without risky cross-platform schema changes.
- The brief is broad enough to touch sensitive academic/clinical records, so accidental coupling to real patient data must be avoided.
- Existing worktree is dirty; unrelated changes must not be reverted or normalized.
- Adding API routes under `/api` requires Express registration because Express owns `/api/*` before Next route handlers.
- Full DB persistence depends on applying the new SQL migration and seed script in the target environment.

## Breakage Avoidance

- Namespace all UI under `/ng/nursing` and all API routes under `/api/nursing`.
- Use fictional seed data only; no real patient or student records.
- Keep module-specific roles in nursing tables and helper functions instead of changing the core `users.role` enum.
- Add a standalone SQL migration file and seed script rather than rewriting the large hardcoded migration runner.
- Patch `server/index.js` only to mount the new `/api/nursing` router.
- Run lint/build after implementation and document results in validation notes.
