# Nursing Platform QA Account Credentials

These accounts contain fictional training data and are provided only for local or controlled acceptance testing. Outside production, they are available through the server-side QA authenticator. In production they exist only when an operator intentionally runs `npm run seed`.

Shared developer-demo password:

```text
Demo12345678!
```

| Role | Email | Route |
| --- | --- | --- |
| Student Nurse | student@demo.doctarx.com | `/ng/nursing/student` |
| Lecturer | teacher@demo.doctarx.com | `/ng/nursing/lecturer` |
| HOD / Department Admin | hod@demo.doctarx.com | `/ng/nursing/hod` |
| Clinical Coordinator | coordinator@demo.doctarx.com | `/ng/nursing/coordinator` |
| Clinical Supervisor / Preceptor | supervisor@demo.doctarx.com | `/ng/nursing/supervisor` |
| Institution Admin | school@demo.doctarx.com | `/ng/nursing/admin` |
| Super Admin | admin@demo.doctarx.com | `/ng/nursing/admin` |
| Support Admin | support@demo.doctarx.com | `/ng/nursing/admin` |

Additional seeded identities use the same password:

- Second lecturer: `teacher2@demo.doctarx.com`
- Second supervisor: `supervisor2@demo.doctarx.com`
- Additional students: `student02@demo.doctarx.com` through `student20@demo.doctarx.com`

These accounts are fictional and developer-only. They are available online only when the operator explicitly enables the controlled demo seed. Disable or remove them before admitting real institutional data. The bundle verification script ensures the password is not shipped in browser JavaScript.
