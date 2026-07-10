# Nursing Platform Architecture

## Frontend

The module lives under `/ng/nursing` in the Next.js App Router. Page wrappers are intentionally thin and render `components/nursing/NursingPlatformClient.jsx`, which contains the role dashboards and academic workflows.

Routes:

- `/ng/nursing`
- `/ng/nursing/login`
- `/ng/nursing/request-access`
- `/ng/nursing/student`
- `/ng/nursing/lecturer`
- `/ng/nursing/hod`
- `/ng/nursing/coordinator`
- `/ng/nursing/supervisor`
- `/ng/nursing/admin`
- `/ng/nursing/waiting-room`
- `/ng/nursing/office-hours`

## API

The Express router is mounted at `/api/nursing` from `server/routes/nursing.js`.

API groups:

- `/api/nursing/auth/login`
- `/api/nursing/auth/logout`
- `/api/nursing/session`
- `/api/nursing/bootstrap`
- `/api/nursing/messages`
- `/api/nursing/dashboard/:role`
- `/api/nursing/institutions`
- `/api/nursing/departments`
- `/api/nursing/sessions`
- `/api/nursing/cohorts`
- `/api/nursing/courses`
- `/api/nursing/courses/:courseId/sections`
- `/api/nursing/courses/:courseId/lessons`
- `/api/nursing/lessons`
- `/api/nursing/lessons/:lessonId/progress`
- `/api/nursing/profiles/:userId`
- `/api/nursing/assignments`
- `/api/nursing/assignments/:assignmentId/submissions`
- `/api/nursing/submissions/:submissionId/grade`
- `/api/nursing/discussions`
- `/api/nursing/discussions/:discussionId/replies`
- `/api/nursing/timeline/posts`
- `/api/nursing/timeline/posts/:postId/comments`
- `/api/nursing/timeline/posts/:postId/reactions`
- `/api/nursing/timeline/reports`
- `/api/nursing/timeline/posts/:postId/moderate`
- `/api/nursing/notifications`
- `/api/nursing/quizzes`
- `/api/nursing/simulations`
- `/api/nursing/telehealth-lab`
- `/api/nursing/logbook`
- `/api/nursing/certificates`
- `/api/nursing/payments`
- `/api/nursing/reports`
- `/api/nursing/admin`
- `/api/nursing/waiting-rooms`
- `/api/nursing/support-profile`
- `/api/nursing/office-hours`

## Data Model

The SQL migration is `server/db/migrations/1100_nursing_education_platform.sql`. Tables are prefixed with `nursing_` to avoid collisions with existing DoctaRx telehealth tables.

Core tables:

- `nursing_institutions`
- `nursing_departments`
- `nursing_academic_sessions`
- `nursing_cohorts`
- `nursing_users`
- `nursing_user_roles`
- `nursing_user_profiles`
- `nursing_courses`
- `nursing_course_modules`
- `nursing_course_sections`
- `nursing_lessons`
- `nursing_lesson_resources`
- `nursing_course_enrollments`
- `nursing_lesson_progress`
- `nursing_quizzes`
- `nursing_quiz_questions`
- `nursing_quiz_attempts`
- `nursing_quiz_answers`
- `nursing_assignments`
- `nursing_assignment_submissions`
- `nursing_grades`
- `nursing_grade_comments`
- `nursing_course_discussions`
- `nursing_course_discussion_replies`
- `nursing_timeline_posts`
- `nursing_timeline_comments`
- `nursing_timeline_reactions`
- `nursing_timeline_attachments`
- `nursing_timeline_reports`
- `nursing_notifications`
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
- `nursing_access_requests`
- `nursing_waiting_rooms`
- `nursing_waiting_room_queue`
- `nursing_waiting_room_messages`
- `nursing_waiting_room_participants`
- `nursing_waiting_room_assignments`
- `nursing_office_hour_sessions`
- `nursing_office_hour_questions`
- `nursing_office_hour_attendance`
- `nursing_office_hour_notes`
- `nursing_support_escalations`
- `nursing_admin_support_profiles`
- `nursing_message_threads`
- `nursing_messages`
- `nursing_platform_state`

The runtime workflow store keeps one transactionally locked JSONB document per institution in `nursing_platform_state`. PostgreSQL identity tables remain authoritative for production authentication. The normalized workflow tables provide a migration path for high-volume decomposition without coupling this release to the existing telehealth schema.

## RBAC

Nursing roles are module-specific and live in `lib/nursingEducationData.js`. They do not change the existing core `users.role` enum.

Permission groups cover institution management, profile access, course management, lesson management, course taking, assignment submission, assignment grading, timeline posting, timeline moderation, course discussions, simulation attempts, telehealth lab use, logbook submission, logbook review, certificate issuing, reports, and payments.

## Multi-Tenancy

Tenant-owned tables include `institution_id` and usually `department_id`. Academic and cohort-scoped records include `academic_session_id` and `cohort_id` where relevant. The first seeded institution is University of Abuja, Department of Nursing Science.

## Security Model

- The module is namespaced under `/ng/nursing` and `/api/nursing`.
- Seeded clinical data is fictional and marked as training data.
- Nursing education roles are separate from patient/provider/pharmacy/admin telehealth roles.
- API write operations enforce module permissions.
- Protected operations emit audit events.
- Server-issued HMAC sessions expire after eight hours and use secure cookie attributes.
- Production refuses to start without PostgreSQL and a strong session secret.
- The file-backed state adapter and QA authenticator are disabled in production.
- The implementation does not read or modify existing PHI, appointment, medical record, messaging, video, pharmacy, or patient payment records.
