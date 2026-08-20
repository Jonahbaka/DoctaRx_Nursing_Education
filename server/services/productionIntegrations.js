'use strict';

const crypto = require('node:crypto');
const PDFDocument = require('pdfkit');
const { pool, transaction } = require('../db');

const ALLOWED_MEDIA_TYPES = new Set([
  'video/mp4', 'video/webm', 'audio/mpeg', 'audio/mp4', 'application/pdf',
  'image/jpeg', 'image/png', 'text/vtt', 'text/plain',
]);
const ALLOWED_OBJECT_KINDS = new Set(['course_media', 'lesson_pdf', 'assignment', 'clinical_evidence', 'certificate']);
const MAX_UPLOAD_BYTES = Number(process.env.NURSING_MAX_UPLOAD_BYTES || 250 * 1024 * 1024);
let cachedCredentials = null;

class IntegrationError extends Error {
  constructor(statusCode, message, code) { super(message); this.statusCode = statusCode; this.code = code; }
}

function sha256(value, encoding = 'hex') { return crypto.createHash('sha256').update(value).digest(encoding); }
function hmac(key, value, encoding) { return crypto.createHmac('sha256', key).update(value).digest(encoding); }
function encodePath(key) { return `/${String(key).split('/').map(encodeURIComponent).join('/')}`; }
function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

async function ec2Credentials() {
  const tokenResponse = await fetch('http://169.254.169.254/latest/api/token', {
    method: 'PUT', headers: { 'X-aws-ec2-metadata-token-ttl-seconds': '21600' }, signal: AbortSignal.timeout(1500),
  });
  if (!tokenResponse.ok) throw new Error('EC2 metadata token unavailable');
  const token = await tokenResponse.text();
  const headers = { 'X-aws-ec2-metadata-token': token };
  const roleResponse = await fetch('http://169.254.169.254/latest/meta-data/iam/security-credentials/', { headers, signal: AbortSignal.timeout(1500) });
  if (!roleResponse.ok) throw new Error('EC2 instance role unavailable');
  const role = (await roleResponse.text()).trim();
  const credentialResponse = await fetch(`http://169.254.169.254/latest/meta-data/iam/security-credentials/${encodeURIComponent(role)}`, { headers, signal: AbortSignal.timeout(1500) });
  if (!credentialResponse.ok) throw new Error('EC2 role credentials unavailable');
  const value = await credentialResponse.json();
  return { accessKeyId: value.AccessKeyId, secretAccessKey: value.SecretAccessKey, sessionToken: value.Token, expiration: new Date(value.Expiration).getTime() };
}

async function awsCredentials() {
  if (cachedCredentials && cachedCredentials.expiration - Date.now() > 5 * 60_000) return cachedCredentials;
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    cachedCredentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN || null,
      expiration: Date.now() + 60 * 60_000,
    };
  } else {
    cachedCredentials = await ec2Credentials();
  }
  return cachedCredentials;
}

async function presignS3({ method = 'GET', key, expiresSeconds = 300, extraQuery = {} }) {
  const bucket = process.env.NURSING_S3_BUCKET;
  const region = process.env.NURSING_S3_REGION || process.env.AWS_REGION || 'us-east-1';
  if (!bucket) throw new IntegrationError(503, 'Secure object storage is not configured.', 'STORAGE_UNAVAILABLE');
  const credentials = await awsCredentials();
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const date = amzDate.slice(0, 8);
  const scope = `${date}/${region}/s3/aws4_request`;
  const host = `${bucket}.s3.${region}.amazonaws.com`;
  const query = {
    ...extraQuery,
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${credentials.accessKeyId}/${scope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(Math.min(Math.max(expiresSeconds, 30), 900)),
    'X-Amz-SignedHeaders': 'host',
  };
  if (credentials.sessionToken) query['X-Amz-Security-Token'] = credentials.sessionToken;
  const canonicalQuery = Object.entries(query).sort(([a], [b]) => a.localeCompare(b)).map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`).join('&');
  const canonicalRequest = [method, encodePath(key), canonicalQuery, `host:${host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonicalRequest)].join('\n');
  const dateKey = hmac(`AWS4${credentials.secretAccessKey}`, date);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, 's3');
  const signingKey = hmac(serviceKey, 'aws4_request');
  const signature = hmac(signingKey, stringToSign, 'hex');
  return `https://${host}${encodePath(key)}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

function safeFilename(value) {
  return String(value || 'file').normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || 'file';
}

async function createUploadIntent(user, input) {
  if (!pool) throw new IntegrationError(503, 'Database-backed storage authorization is unavailable.');
  const mediaType = String(input.mediaType || '').toLowerCase();
  const byteSize = Number(input.byteSize);
  const kind = String(input.objectKind || 'course_media');
  if (!ALLOWED_MEDIA_TYPES.has(mediaType) || !ALLOWED_OBJECT_KINDS.has(kind) || !Number.isInteger(byteSize) || byteSize < 1 || byteSize > MAX_UPLOAD_BYTES) {
    throw new IntegrationError(422, 'File type, purpose, or size is not allowed.', 'UPLOAD_POLICY_REJECTED');
  }
  const tenantKey = user.institutionId;
  const filename = safeFilename(input.filename);
  const key = `nursing/${tenantKey}/${kind}/${crypto.randomUUID()}-${filename}`;
  const bucket = process.env.NURSING_S3_BUCKET;
  const result = await pool.query(
    `INSERT INTO nursing_storage_objects
       (tenant_key,owner_user_key,object_kind,bucket,object_key,original_filename,media_type,byte_size,retention_until)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW()+($9::text||' days')::interval) RETURNING *`,
    [tenantKey, user.id, kind, bucket, key, filename, mediaType, byteSize, Number(process.env.NURSING_OBJECT_RETENTION_DAYS || 365)]
  );
  return { object: result.rows[0], uploadUrl: await presignS3({ method: 'PUT', key }), expiresInSeconds: 300 };
}

async function objectScanStatus(key) {
  const mode = process.env.NURSING_OBJECT_SCAN_MODE || 's3-tag';
  if (mode === 'trusted-test' && process.env.NODE_ENV === 'test') return 'clean';
  if (mode !== 's3-tag') return 'pending';
  const tagUrl = await presignS3({ method: 'GET', key, extraQuery: { tagging: '' } });
  const response = await fetch(tagUrl, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) return 'pending';
  const xml = await response.text();
  if (/<Key>GuardDutyMalwareScanStatus<\/Key>\s*<Value>NO_THREATS_FOUND<\/Value>/i.test(xml)) return 'clean';
  if (/<Key>GuardDutyMalwareScanStatus<\/Key>\s*<Value>(THREATS_FOUND|UNSUPPORTED|ACCESS_DENIED|FAILED)<\/Value>/i.test(xml)) return 'quarantined';
  return 'pending';
}

async function completeUpload(user, objectId) {
  const found = await pool.query('SELECT * FROM nursing_storage_objects WHERE id=$1 AND tenant_key=$2 AND owner_user_key=$3 FOR UPDATE', [objectId, user.institutionId, user.id]);
  const object = found.rows[0];
  if (!object) throw new IntegrationError(404, 'Upload record not found.');
  const headUrl = await presignS3({ method: 'HEAD', key: object.object_key });
  const head = await fetch(headUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
  if (!head.ok) throw new IntegrationError(409, 'The uploaded object is not available in protected storage.');
  if (Number(head.headers.get('content-length')) !== Number(object.byte_size)) throw new IntegrationError(409, 'Uploaded file size does not match the authorized intent.');
  const scanStatus = await objectScanStatus(object.object_key);
  const status = scanStatus === 'clean' ? 'available' : scanStatus === 'quarantined' ? 'revoked' : 'pending';
  const updated = await pool.query(
    `UPDATE nursing_storage_objects SET scan_status=$2,status=$3,sha256_checksum=COALESCE($4,sha256_checksum),updated_at=NOW()
      WHERE id=$1 RETURNING *`, [object.id, scanStatus, status, head.headers.get('x-amz-checksum-sha256') || null]
  );
  return updated.rows[0];
}

async function authorizeStoredObject(user, objectId) {
  const result = await pool.query('SELECT * FROM nursing_storage_objects WHERE id=$1 AND tenant_key=$2 AND status=$3 AND scan_status=$4', [objectId, user.institutionId, 'available', 'clean']);
  const object = result.rows[0];
  if (!object) throw new IntegrationError(404, 'A clean authorized object was not found.');
  const privileged = ['super_admin', 'institution_admin', 'hod', 'lecturer', 'clinical_coordinator', 'supervisor'].includes(user.role);
  if (!privileged && object.owner_user_key !== user.id && object.object_kind !== 'course_media' && object.object_kind !== 'lesson_pdf') {
    throw new IntegrationError(403, 'Object access denied.');
  }
  return { object, downloadUrl: await presignS3({ method: 'GET', key: object.object_key }), expiresInSeconds: 300 };
}

function renderCertificatePdf(claims, verificationCode) {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 50, info: { Title: claims.certificateType, Author: 'DoctaRx Nursing Education' } });
    const chunks = [];
    document.on('data', (chunk) => chunks.push(chunk)); document.on('error', reject); document.on('end', () => resolve(Buffer.concat(chunks)));
    document.rect(24, 24, 794, 547).lineWidth(4).stroke('#0f766e');
    document.fontSize(13).fillColor('#0f766e').text('DOCTARX NURSING EDUCATION', { align: 'center' });
    document.moveDown(1.5).fontSize(30).fillColor('#0f172a').text(claims.certificateType, { align: 'center' });
    document.moveDown().fontSize(15).text('This verifiable certificate is issued to', { align: 'center' });
    document.moveDown(0.5).fontSize(26).fillColor('#0f766e').text(claims.studentName, { align: 'center' });
    document.moveDown(0.6).fontSize(14).fillColor('#0f172a').text(`for ${claims.programName}`, { align: 'center' });
    document.moveDown().text(`${claims.institutionName} · Issued ${claims.issueDate}`, { align: 'center' });
    document.moveDown(2).fontSize(10).fillColor('#475569').text(`Verification code: ${verificationCode}`, { align: 'center' });
    document.text(`Verify: ${(process.env.PUBLIC_APP_URL || 'https://doctarx.com/nursing-education')}/certificates/verify/${verificationCode}`, { align: 'center' });
    document.end();
  });
}

async function issueCertificatePdf(user, certificate, student) {
  if (!certificate || !student || String(student.institutionId) !== String(user.institutionId)) throw new IntegrationError(404, 'Certificate or student not found in this institution.');
  const verificationCode = `DRX-NUR-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
  const claims = {
    certificateKey: certificate.id, certificateType: certificate.certificateType,
    programName: certificate.programName, studentKey: student.id,
    studentName: `${student.firstName} ${student.lastName}`, institutionId: user.institutionId,
    institutionName: certificate.institutionName || 'Authorized nursing institution',
    issueDate: certificate.issueDate || new Date().toISOString().slice(0, 10), issuedBy: user.id,
  };
  const pdf = await renderCertificatePdf(claims, verificationCode);
  const claimsHash = sha256(canonicalJson(claims)); const pdfHash = sha256(pdf);
  let storageObjectId = null;
  if (process.env.NURSING_S3_BUCKET) {
    const key = `nursing/${user.institutionId}/certificate/${crypto.randomUUID()}-${verificationCode}.pdf`;
    const uploadUrl = await presignS3({ method: 'PUT', key });
    const uploaded = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: pdf, signal: AbortSignal.timeout(15_000) });
    if (!uploaded.ok) throw new IntegrationError(503, 'Certificate storage failed.');
    const stored = await pool.query(
      `INSERT INTO nursing_storage_objects
         (tenant_key,owner_user_key,object_kind,bucket,object_key,original_filename,media_type,byte_size,sha256_checksum,scan_status,status,retention_until)
       VALUES ($1,$2,'certificate',$3,$4,$5,'application/pdf',$6,$7,'clean','available',NOW()+INTERVAL '10 years') RETURNING id`,
      [user.institutionId, student.id, process.env.NURSING_S3_BUCKET, key, `${verificationCode}.pdf`, pdf.length, pdfHash]
    );
    storageObjectId = stored.rows[0].id;
  } else if (process.env.NODE_ENV === 'production') throw new IntegrationError(503, 'Certificate object storage is required in production.');
  const saved = await pool.query(
    `INSERT INTO nursing_verifiable_certificates
       (tenant_key,certificate_key,student_key,course_key,verification_code,claims_json,claims_sha256,pdf_sha256,storage_object_id,issued_by_key)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10) RETURNING *`,
    [user.institutionId, certificate.id, student.id, certificate.courseId || null, verificationCode,
      JSON.stringify(claims), claimsHash, pdfHash, storageObjectId, user.id]
  );
  return { certificate: saved.rows[0], pdf: storageObjectId ? null : pdf };
}

async function verifyCertificate(code) {
  const result = await pool.query(
    `SELECT verification_code,claims_json,claims_sha256,pdf_sha256,issued_at,revoked_at,revocation_reason
       FROM nursing_verifiable_certificates WHERE verification_code=$1`, [String(code || '').toUpperCase()]
  );
  const certificate = result.rows[0];
  if (!certificate) throw new IntegrationError(404, 'Certificate not found.');
  const claimsValid = sha256(canonicalJson(certificate.claims_json)) === certificate.claims_sha256.trim();
  return { valid: claimsValid && !certificate.revoked_at, revoked: Boolean(certificate.revoked_at), claimsValid, ...certificate };
}

async function revokeCertificate(user, code, reason) {
  const explanation = String(reason || '').trim().slice(0, 1000);
  if (!explanation) throw new IntegrationError(422, 'A revocation reason is required.');
  const result = await pool.query(
    `UPDATE nursing_verifiable_certificates SET revoked_at=NOW(),revoked_by_key=$3,revocation_reason=$4
      WHERE verification_code=$1 AND tenant_key=$2 AND revoked_at IS NULL RETURNING verification_code`,
    [String(code).toUpperCase(), user.institutionId, user.id, explanation]
  );
  if (!result.rowCount) throw new IntegrationError(404, 'Active certificate not found.');
  return { revoked: true };
}

function liveKitToken(user, roomName) {
  const apiKey = process.env.NURSING_LIVEKIT_API_KEY || process.env.NG_LIVEKIT_API_KEY;
  const apiSecret = process.env.NURSING_LIVEKIT_API_SECRET || process.env.NG_LIVEKIT_API_SECRET;
  const url = process.env.NURSING_LIVEKIT_URL || process.env.NG_LIVEKIT_URL;
  if (!apiKey || !apiSecret || !url) throw new IntegrationError(503, 'Nursing live video is not configured.', 'VIDEO_UNAVAILABLE');
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({
    iss: apiKey, sub: `${user.institutionId}:${user.id}`, nbf: now - 5, exp: now + 3600,
    name: `${user.firstName} ${user.lastName}`, metadata: JSON.stringify({ role: user.role, institutionId: user.institutionId }),
    video: { roomJoin: true, room: roomName, canPublish: true, canSubscribe: true, canPublishData: true },
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', apiSecret).update(`${header}.${body}`).digest('base64url');
  return { url, roomName, token: `${header}.${body}.${signature}`, expiresInSeconds: 3600 };
}

async function initializeInstitutionBilling(user, input) {
  const amountKobo = Math.round(Number(input.amountNaira) * 100);
  if (!Number.isSafeInteger(amountKobo) || amountKobo < 10000) throw new IntegrationError(422, 'A valid institution billing amount is required.');
  const idempotencyKey = String(input.idempotencyKey || crypto.randomUUID()).slice(0, 200);
  const provider = process.env.PAYSTACK_SECRET_KEY ? 'paystack' : process.env.NURSING_INSTITUTION_BILLING_MODE === 'invoice' ? 'invoice' : null;
  if (!provider) throw new IntegrationError(503, 'Institution billing is not configured.');
  let providerReference = null; let authorizationUrl = null; let status = 'pending';
  if (provider === 'paystack') {
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: input.billingEmail, amount: amountKobo, currency: 'NGN', reference: input.reference,
        callback_url: input.callbackUrl, metadata: { tenantKey: user.institutionId, billingKey: input.billingKey } }),
      signal: AbortSignal.timeout(10_000),
    });
    const payload = await response.json();
    if (!response.ok || !payload.status) throw new IntegrationError(502, 'Payment gateway initialization failed.');
    providerReference = payload.data.reference; authorizationUrl = payload.data.authorization_url; status = 'authorized';
  }
  const result = await pool.query(
    `INSERT INTO nursing_institution_billing
       (tenant_key,billing_key,provider,provider_reference,amount_kobo,status,idempotency_key,metadata,created_by_key)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)
     ON CONFLICT (idempotency_key) DO UPDATE SET idempotency_key=EXCLUDED.idempotency_key RETURNING *`,
    [user.institutionId, input.billingKey, provider, providerReference, amountKobo, status, idempotencyKey,
      JSON.stringify({ billingEmail: input.billingEmail, authorizationUrl }), user.id]
  );
  return { billing: result.rows[0], authorizationUrl };
}

async function recordMessageEvent(tenantKey, messageKey, eventType, actorUserKey, payload = {}) {
  return transaction(async (client) => {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`nursing-message:${tenantKey}`]);
    const sequence = await client.query('SELECT COALESCE(MAX(sequence_number),0)+1 AS next FROM nursing_message_delivery_events WHERE tenant_key=$1', [tenantKey]);
    const result = await client.query(
      `INSERT INTO nursing_message_delivery_events
         (tenant_key,message_key,sequence_number,event_type,actor_user_key,payload)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb) RETURNING *`,
      [tenantKey, messageKey, sequence.rows[0].next, eventType, actorUserKey || null, JSON.stringify(payload)]
    );
    return result.rows[0];
  });
}

async function messageEvents(tenantKey, afterSequence = 0, limit = 100) {
  return (await pool.query(
    `SELECT sequence_number,message_key,event_type,actor_user_key,payload,created_at
       FROM nursing_message_delivery_events WHERE tenant_key=$1 AND sequence_number>$2
      ORDER BY sequence_number LIMIT $3`, [tenantKey, Number(afterSequence) || 0, Math.min(Number(limit) || 100, 500)]
  )).rows;
}

async function integrationReadiness() {
  const schema = pool ? (await pool.query(
    `SELECT to_regclass('public.nursing_platform_entities') IS NOT NULL AS entities,
            to_regclass('public.nursing_storage_objects') IS NOT NULL AS storage,
            to_regclass('public.nursing_verifiable_certificates') IS NOT NULL AS certificates,
            to_regclass('public.nursing_institution_billing') IS NOT NULL AS billing,
            to_regclass('public.nursing_message_delivery_events') IS NOT NULL AS messaging`
  )).rows[0] : {};
  const storageConfigured = Boolean(process.env.NURSING_S3_BUCKET && (process.env.NURSING_S3_REGION || process.env.AWS_REGION) && (process.env.NURSING_OBJECT_SCAN_MODE || 's3-tag') === 's3-tag');
  const videoConfigured = Boolean((process.env.NURSING_LIVEKIT_URL || process.env.NG_LIVEKIT_URL) && (process.env.NURSING_LIVEKIT_API_KEY || process.env.NG_LIVEKIT_API_KEY) && (process.env.NURSING_LIVEKIT_API_SECRET || process.env.NG_LIVEKIT_API_SECRET));
  const billingConfigured = Boolean(process.env.PAYSTACK_SECRET_KEY || process.env.NURSING_INSTITUTION_BILLING_MODE === 'invoice');
  const monitoringConfigured = Boolean(process.env.SENTRY_DSN || process.env.NURSING_ALERT_WEBHOOK_URL || process.env.NURSING_MONITORING_MODE === 'cloudwatch');
  const integrations = {
    storage: { schemaReady: schema.storage === true, configured: storageConfigured, scanMode: process.env.NURSING_OBJECT_SCAN_MODE || 's3-tag' },
    certificates: { schemaReady: schema.certificates === true, configured: storageConfigured },
    billing: { schemaReady: schema.billing === true, configured: billingConfigured, provider: process.env.PAYSTACK_SECRET_KEY ? 'paystack' : process.env.NURSING_INSTITUTION_BILLING_MODE || 'unconfigured' },
    video: { configured: videoConfigured },
    messaging: { schemaReady: schema.messaging === true, replay: schema.messaging === true, transport: 'sse' },
    monitoring: { configured: monitoringConfigured, mode: process.env.SENTRY_DSN ? 'sentry' : process.env.NURSING_ALERT_WEBHOOK_URL ? 'webhook' : process.env.NURSING_MONITORING_MODE || 'unconfigured' },
    normalizedStore: { schemaReady: schema.entities === true },
  };
  return { ready: Object.values(integrations).every((item) => item.configured !== false && item.schemaReady !== false), integrations };
}

async function operationalMetrics() {
  if (!pool) return { databaseBacked: false };
  const [store, storage, messages, certificates, billing] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS operations,
                       COALESCE(ROUND(AVG(duration_ms)),0)::int AS average_duration_ms,
                       COALESCE(MAX(conflict_retries),0)::int AS max_conflict_retries,
                       COALESCE(SUM(changed_entities),0)::int AS changed_entities
                  FROM nursing_store_operation_metrics WHERE created_at > NOW()-INTERVAL '24 hours'`),
    pool.query(`SELECT COUNT(*) FILTER (WHERE scan_status='pending')::int AS pending,
                       COUNT(*) FILTER (WHERE scan_status IN ('quarantined','rejected'))::int AS quarantined
                  FROM nursing_storage_objects`),
    pool.query(`SELECT COUNT(*)::int AS events, COALESCE(MAX(sequence_number),0)::bigint AS latest_sequence
                  FROM nursing_message_delivery_events WHERE created_at > NOW()-INTERVAL '24 hours'`),
    pool.query(`SELECT COUNT(*) FILTER (WHERE revoked_at IS NULL)::int AS active,
                       COUNT(*) FILTER (WHERE revoked_at IS NOT NULL)::int AS revoked
                  FROM nursing_verifiable_certificates`),
    pool.query(`SELECT COUNT(*) FILTER (WHERE status='failed')::int AS failed,
                       COUNT(*) FILTER (WHERE status IN ('pending','authorized'))::int AS pending
                  FROM nursing_institution_billing`),
  ]);
  return {
    databaseBacked: true,
    store: store.rows[0],
    storage: storage.rows[0],
    messaging: messages.rows[0],
    certificates: certificates.rows[0],
    billing: billing.rows[0],
    observedAt: new Date().toISOString(),
  };
}

async function reportOperationalAlert(error, context = {}) {
  const event = {
    service: 'doctarx-nursing-education',
    severity: Number(error?.statusCode || 500) >= 500 ? 'error' : 'warning',
    code: error?.code || 'UNHANDLED_ERROR',
    message: String(error?.message || 'Unknown nursing platform error').slice(0, 500),
    context,
    occurredAt: new Date().toISOString(),
  };
  if (process.env.NODE_ENV !== 'test') console.error(JSON.stringify(event));
  if (process.env.NURSING_ALERT_WEBHOOK_URL) {
    try {
      await fetch(process.env.NURSING_ALERT_WEBHOOK_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(event), signal: AbortSignal.timeout(3000),
      });
    } catch (alertError) {
      if (process.env.NODE_ENV !== 'test') console.error(JSON.stringify({ ...event, code: 'ALERT_DELIVERY_FAILED', message: alertError.message }));
    }
  }
  return event;
}

module.exports = {
  IntegrationError, presignS3, createUploadIntent, completeUpload, authorizeStoredObject,
  renderCertificatePdf, issueCertificatePdf, verifyCertificate, revokeCertificate,
  liveKitToken, initializeInstitutionBilling, recordMessageEvent, messageEvents, integrationReadiness,
  operationalMetrics, reportOperationalAlert,
  canonicalJson,
};
