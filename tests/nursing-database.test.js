'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { test } = require('node:test');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const { createApiApp } = require('../server/app');
const { close, pool } = require('../server/db');
const { mutateState, readState } = require('../server/services/nursingPlatformStore');
const {
  canonicalJson,
  createUploadIntent,
  initializeInstitutionBilling,
  integrationReadiness,
  issueCertificatePdf,
  liveKitToken,
  messageEvents,
  recordMessageEvent,
  renderCertificatePdf,
  verifyCertificate,
} = require('../server/services/productionIntegrations');

const PASSWORD = process.env.NURSING_TEST_ACCOUNT_PASSWORD || 'Demo12345678!';
const DEFAULT_TENANT = 'inst-uniabuja';
const BETA_TENANT = 'inst-fictional-beta';

async function signIn(app, email) {
  const agent = request.agent(app);
  const response = await agent.post('/api/nursing/auth/login').send({ email, password: PASSWORD });
  assert.equal(response.status, 200, response.text);
  return { agent, user: response.body.user };
}

async function createBetaAccount() {
  const passwordHash = await bcrypt.hash(PASSWORD, 4);
  const institution = await pool.query(
    `INSERT INTO nursing_institutions (external_key,name,short_name,institution_type,status,metadata)
     VALUES ($1,'Fictional Beta Nursing School','Beta','Test institution','active','{"fictional":true}'::jsonb)
     ON CONFLICT (external_key) DO UPDATE SET name=EXCLUDED.name RETURNING id`
    , [BETA_TENANT]
  );
  const department = await pool.query(
    `INSERT INTO nursing_departments (external_key,institution_id,name,status,metadata)
     VALUES ('dept-fictional-beta',$1,'Fictional Nursing Department','active','{"fictional":true}'::jsonb)
     ON CONFLICT (external_key) DO UPDATE SET name=EXCLUDED.name RETURNING id`, [institution.rows[0].id]
  );
  const user = await pool.query(
    `INSERT INTO nursing_users (institution_id,department_id,email,password_hash,first_name,last_name,primary_role,status,access_status,metadata)
     VALUES ($1,$2,'student@fictional-beta.invalid',$3,'Fictional','Beta Student','student','active','active','{"fictional":true}'::jsonb)
     ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash,status='active',access_status='active'
     RETURNING id`, [institution.rows[0].id, department.rows[0].id, passwordHash]
  );
  return { userId: String(user.rows[0].id), departmentId: 'dept-fictional-beta' };
}

test('PostgreSQL production workflow proves migration, isolation, concurrency, restart, and integrations', { timeout: 120000 }, async (t) => {
  assert.ok(pool, 'DATABASE_URL must be configured for this proof');
  t.after(close);

  const migrations = await pool.query('SELECT filename,checksum FROM nursing_migrations ORDER BY filename');
  assert.ok(migrations.rows.length >= 3);
  assert.ok(migrations.rows.every((row) => /^[a-f0-9]{64}$/.test(row.checksum.trim())));
  const required = await pool.query(`SELECT
    to_regclass('public.nursing_platform_entities') IS NOT NULL AS entities,
    to_regclass('public.nursing_storage_objects') IS NOT NULL AS storage,
    to_regclass('public.nursing_verifiable_certificates') IS NOT NULL AS certificates,
    to_regclass('public.nursing_message_delivery_events') IS NOT NULL AS messaging`);
  assert.deepEqual(required.rows[0], { entities: true, storage: true, certificates: true, messaging: true });

  const beta = await createBetaAccount();
  await Promise.all([
    mutateState(DEFAULT_TENANT, (state) => {
      state.courses.push({ id: 'course-alpha-proof', institutionId: DEFAULT_TENANT, lecturerId: 'user-lecturer-ifeoma', title: 'Alpha proof course', status: 'published' });
    }),
    mutateState(BETA_TENANT, (state) => {
      state.users.push({ id: beta.userId, institutionId: BETA_TENANT, departmentId: beta.departmentId, firstName: 'Fictional', lastName: 'Beta Student', role: 'student', status: 'active', accessStatus: 'active' });
      state.courses.push({ id: 'course-beta-secret', institutionId: BETA_TENANT, lecturerId: 'beta-lecturer', title: 'Beta private course', status: 'published' });
      state.lessons.push({ id: 'lesson-beta-secret', courseId: 'course-beta-secret', title: 'Beta private lesson', contentBody: 'Fictional beta-only content.', status: 'published' });
      state.courseEnrollments.push({ id: 'enrollment-beta-proof', studentId: beta.userId, courseId: 'course-beta-secret', status: 'active' });
    }),
  ]);

  const app = createApiApp();
  const alphaUser = await signIn(app, 'student@demo.doctarx.com');
  assert.equal(alphaUser.user.id, 'user-student-01');
  const alphaBootstrap = await alphaUser.agent.get('/api/nursing/bootstrap');
  assert.equal(alphaBootstrap.status, 200, alphaBootstrap.text);
  assert.ok(alphaBootstrap.body.state.courseEnrollments.some((item) => item.studentId === alphaUser.user.id));
  assert.ok(alphaBootstrap.body.state.lessons.some((item) => item.courseId === 'course-telehealth-foundations'));
  const betaUser = await signIn(app, 'student@fictional-beta.invalid');
  assert.equal((await alphaUser.agent.get('/api/nursing/courses/course-beta-secret/details')).status, 404);
  assert.equal((await betaUser.agent.get('/api/nursing/courses/course-alpha-proof/details')).status, 404);
  const betaDetails = await betaUser.agent.get('/api/nursing/courses/course-beta-secret/details');
  assert.equal(betaDetails.status, 200, betaDetails.text);
  assert.equal(betaDetails.body.lessons[0].contentBody, 'Fictional beta-only content.');

  const markerId = `restart-${crypto.randomUUID()}`;
  await mutateState(DEFAULT_TENANT, (state) => state.notifications.push({ id: markerId, userId: alphaUser.user.id, title: 'Restart proof', body: 'Fictional', createdAt: new Date().toISOString() }));
  const probe = execFileSync(process.execPath, ['scripts/nursing-db-probe.cjs', DEFAULT_TENANT, 'notifications', markerId], { cwd: process.cwd(), env: { ...process.env, DOTENV_CONFIG_QUIET: 'true' }, encoding: 'utf8', timeout: 30000 });
  assert.equal(JSON.parse(probe.trim().split(/\r?\n/).at(-1)).found, true);

  const concurrentIds = Array.from({ length: 16 }, () => `concurrent-${crypto.randomUUID()}`);
  const startedAt = Date.now();
  await Promise.all(concurrentIds.map((id) => mutateState(DEFAULT_TENANT, (state) => {
    state.notifications.push({ id, userId: alphaUser.user.id, title: 'Concurrent proof', body: 'Fictional', createdAt: new Date().toISOString() });
  })));
  const elapsedMs = Date.now() - startedAt;
  const afterConcurrency = await readState(DEFAULT_TENANT);
  assert.equal(concurrentIds.filter((id) => afterConcurrency.notifications.some((item) => item.id === id)).length, concurrentIds.length);
  const operationMetrics = await pool.query(
    `SELECT COUNT(*)::int AS writes, MAX(conflict_retries)::int AS max_retries,
            MAX(changed_entities)::int AS max_changed_entities, ROUND(AVG(duration_ms))::int AS average_ms
       FROM nursing_store_operation_metrics WHERE tenant_key=$1`, [DEFAULT_TENANT]
  );
  assert.ok(operationMetrics.rows[0].writes >= concurrentIds.length);
  assert.ok(operationMetrics.rows[0].max_changed_entities <= 4, 'normalized writes must not rewrite the tenant document');
  const legacyWrites = await pool.query(`SELECT n_tup_upd::int AS updates FROM pg_stat_user_tables WHERE relname='nursing_platform_state'`);
  assert.equal(legacyWrites.rows[0].updates, 0);
  process.stdout.write(`NURSING_CONCURRENCY_PROOF=${JSON.stringify({ elapsedMs, ...operationMetrics.rows[0] })}\n`);

  const createdEvent = await recordMessageEvent(DEFAULT_TENANT, 'message-db-proof', 'created', alphaUser.user.id, { fictional: true });
  const deliveredEvent = await recordMessageEvent(DEFAULT_TENANT, 'message-db-proof', 'delivered', alphaUser.user.id);
  assert.ok(Number(deliveredEvent.sequence_number) > Number(createdEvent.sequence_number));
  const replay = await messageEvents(DEFAULT_TENANT, createdEvent.sequence_number, 10);
  assert.equal(replay[0].event_type, 'delivered');

  const liveKit = liveKitToken(alphaUser.user, 'nursing-proof-room');
  assert.match(liveKit.token, /^[^.]+\.[^.]+\.[^.]+$/);
  assert.equal(liveKit.roomName, 'nursing-proof-room');
  const billing = await initializeInstitutionBilling({ ...alphaUser.user, role: 'institution_admin' }, { amountNaira: 1000, billingKey: `proof-${crypto.randomUUID()}`, billingEmail: 'billing@fictional.invalid', idempotencyKey: `proof-${crypto.randomUUID()}` });
  assert.equal(billing.billing.provider, 'invoice');

  const upload = await createUploadIntent(alphaUser.user, { filename: 'fictional-assignment.pdf', mediaType: 'application/pdf', byteSize: 2048, objectKind: 'assignment' });
  assert.match(upload.uploadUrl, /^https:\/\/[^?]+\?X-Amz-/);
  assert.equal(upload.object.tenant_key, DEFAULT_TENANT);

  const pdf = await renderCertificatePdf({ certificateType: 'Certificate of Test Completion', studentName: 'Fictional Student', programName: 'Fictional Nursing Course', institutionName: 'Fictional School', issueDate: '2026-08-20' }, 'DRX-NUR-ABCDEF1234567890');
  assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
  const certificateKey = `certificate-${crypto.randomUUID()}`;
  const configuredBucket = process.env.NURSING_S3_BUCKET;
  delete process.env.NURSING_S3_BUCKET;
  let issued;
  try {
    issued = await issueCertificatePdf(
      { ...alphaUser.user, role: 'institution_admin' },
      { id: certificateKey, certificateType: 'Certificate of Test Completion', programName: 'Fictional Nursing Course', institutionName: 'Fictional School', issueDate: '2026-08-20' },
      alphaUser.user
    );
  } finally {
    process.env.NURSING_S3_BUCKET = configuredBucket;
  }
  const verification = await verifyCertificate(issued.certificate.verification_code);
  assert.equal(verification.valid, true);
  assert.equal(verification.claimsValid, true);
  assert.equal(issued.certificate.claims_sha256.trim(), crypto.createHash('sha256').update(canonicalJson(issued.certificate.claims_json)).digest('hex'));

  const readiness = await integrationReadiness();
  assert.equal(readiness.ready, true, JSON.stringify(readiness));
});
