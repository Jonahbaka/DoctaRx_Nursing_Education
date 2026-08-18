# Open Blockers

Classification: **Not Ready**.

## P0

- PostgreSQL migrations, database-backed smoke tests, restart persistence, concurrency and two-fictional-institution attack tests have not run.
- Backup/restore, production startup/health soak, TLS, secret rotation, monitoring and actionable alerts are not demonstrated.
- Secure object storage, signed object authorization, upload size/type scanning and retention are missing.
- Complete object-level authorization review is still required for every mutation/read, especially supervisor/student, lecturer/course and support queue relationships.
- The active single-document-per-tenant JSONB store serializes writes and can become a performance/operational bottleneck; normalized production paths and a measured migration plan are required.

## P1

- Course catalogue/search/filter richness, captions/transcripts, bookmarks/notes/resume, reviews and comprehensive learning paths need browser/persistence proof.
- Telehealth lab is not integrated with the existing DoctaRx video system.
- Payment is a record workflow, not a verified institution billing model or gateway.
- Certificates lack secure PDF generation, tamper verification, revocation and protected storage.
- Nursing AI assistant, grounding/citation, hidden-answer protection, unsupported-claim rejection and prompt-injection tests are missing.
- Messaging/support reliability, delivery ordering, reconnect behavior, notifications and measured polling replacement are incomplete.
- Full responsive, WCAG AA, keyboard, reduced-motion, performance and authenticated browser evidence is absent.
- Production CI with PostgreSQL, migration and clean-checkout gates is not proven.

Institutional privacy, retention, incident response, clinical-placement evidence, certificate authority and offboarding policies require nursing-school approval; technical controls alone are not compliance.
