# Nursing Platform QA Account Credentials

These accounts contain fictional training data and are provided only for local or controlled acceptance testing. Outside production, they are available through the server-side QA authenticator. In production they exist only when an operator intentionally runs `npm run seed`.

Shared local QA password:

```text
DemoPass!2026
```

| Role | Email | Route |
| --- | --- | --- |
| Student Nurse | nursing.student.preview@uniabuja.edu.ng | `/ng/nursing/student` |
| Lecturer | ifeoma.lecturer@uniabuja.demo | `/ng/nursing/lecturer` |
| HOD / Department Admin | hod.nursing@uniabuja.demo | `/ng/nursing/hod` |
| Clinical Coordinator | clinical.coordinator@uniabuja.demo | `/ng/nursing/coordinator` |
| Clinical Supervisor / Preceptor | preceptor.one@uniabuja.demo | `/ng/nursing/supervisor` |
| Institution Admin | nursing.admin@uniabuja.demo | `/ng/nursing/admin` |
| Super Admin | nursing.superadmin@doctarx.demo | `/ng/nursing/admin` |
| Support Admin | nursing.support@doctarx.demo | `/ng/nursing/admin` |

Before seeding any shared environment, set `NURSING_TEST_ACCOUNT_PASSWORD` to a unique temporary value. Disable or remove QA accounts before admitting real users. The bundle verification script ensures the local password is not shipped in browser JavaScript.
