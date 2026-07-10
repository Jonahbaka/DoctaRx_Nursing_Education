# Nursing RBAC and Access Control

Date: 2026-07-10

## Public Access

Only these nursing pages are public:

- `/ng/nursing`
- `/ng/nursing/login`
- `/ng/nursing/request-access`
- `/ng/nursing/unauthorized`

The public platform page contains one sign-in action and one institutional access-request action. It does not expose internal role workspaces or dashboard links.

## Session Model

`POST /api/nursing/auth/login` verifies a bcrypt password against PostgreSQL in production and returns a signed, eight-hour session cookie. The cookie is `HttpOnly`, `SameSite=Lax`, and `Secure` in production. The browser does not store a bearer token or write its own authentication cookie.

Both middleware and API routes verify the HMAC signature and expiry. API authorization additionally re-reads the user so disabled and inactive accounts are rejected after login.

## Role Routing

| Role | Dashboard |
| --- | --- |
| Student Nurse | `/ng/nursing/student` |
| Lecturer | `/ng/nursing/lecturer` |
| HOD / Department Admin | `/ng/nursing/hod` |
| Clinical Coordinator | `/ng/nursing/coordinator` |
| Clinical Supervisor / Preceptor | `/ng/nursing/supervisor` |
| Institution Admin | `/ng/nursing/admin` |
| Super Admin | `/ng/nursing/admin` |
| Support Admin | `/ng/nursing/admin` |

Wrong-role dashboard requests redirect to the signed-in account route. Missing institution scope, missing required department scope, inactive accounts, and disabled access are rejected.

## API Enforcement

Protected writes use named permission checks for institution administration, courses, lessons, progress, assignments, grading, timeline moderation, simulations, logbook review, payment verification, reporting, and certificate issuance. Academic support routes additionally require a staff or administration support role.

State reads and writes use the signed-in account's institution key. Support queue data is also department scoped. Protected mutations append audit events.

## Access Requests

The request form validates name, institution, department, role, email, and international-format phone values. Accepted requests persist in tenant state and return a server-generated identifier. Public submissions are rate limited.

## Internal Role Switcher

The optional role switcher is off by default and only renders when `NEXT_PUBLIC_ENABLE_NURSING_ROLE_SWITCHER=true`. Keep it disabled in every shared or production environment.

## Verification

- Signed sessions authenticate all eight QA roles.
- Tampered cookies return HTTP 401.
- Students cannot create cohorts, manage courses, grade submissions, or verify payments.
- Direct student access to `/ng/nursing/admin` redirects to `/ng/nursing/student`.
- Unauthenticated protected access redirects to login.
- Logout clears the session.
