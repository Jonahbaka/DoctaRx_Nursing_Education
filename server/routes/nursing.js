const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const express = require('express');
const { pool } = require('../db');
const {
  DEFAULT_TENANT_KEY,
  mutateState,
  readState,
  tenantKeyForUser,
} = require('../services/nursingPlatformStore');
const {
  NURSING_ROLES,
  NURSING_ROLE_LABELS,
  NURSING_ROLE_ROUTES,
  canNursingRole,
  getNursingMetrics,
  getNursingUserProfile,
  getRoleDashboard,
} = require('../../lib/nursingEducationData');
const { authenticateNursingTestAccount } = require('../services/nursingTestAuth');
const { dailyMedClient } = require('../services/dailyMedService');
const {
  DIFFICULTIES,
  buildMedicationFlashcards,
  buildMedicationQuiz,
  gradeMedicationQuiz,
  publicMedicationQuiz,
} = require('../services/medicationLearningEngine');
const {
  createMedicationNote,
  deleteMedicationNote,
  listMedicationFlashcardProgress,
  listMedicationNotes,
  listMedicationQuizAttempts,
  saveMedicationFlashcardProgress,
  saveMedicationQuizAttempt,
  updateMedicationNote,
} = require('../services/medicationEducationStore');

const router = express.Router();
const SESSION_COOKIE = 'doctarx_nursing_session';
const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;
const SESSION_MAX_AGE_SECONDS = SESSION_MAX_AGE_MS / 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[1-9]\d{7,14}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const FLASHCARD_KEY_PATTERN = /^medcard-[0-9a-f]{20}$/;

const adminRoles = new Set([
  NURSING_ROLES.SUPER_ADMIN,
  NURSING_ROLES.INSTITUTION_ADMIN,
  NURSING_ROLES.HOD,
  NURSING_ROLES.SUPPORT_ADMIN,
]);

const supportRoles = new Set([
  ...adminRoles,
  NURSING_ROLES.LECTURER,
  NURSING_ROLES.CLINICAL_COORDINATOR,
  NURSING_ROLES.SUPERVISOR,
]);

const waitingReasons = new Set([
  'course_question',
  'assignment_help',
  'clinical_logbook_issue',
  'simulation_help',
  'telehealth_lab_help',
  'payment_access_issue',
  'technical_support',
  'general_academic_support',
  'office_hour_request',
]);

const queueStatuses = new Set([
  'waiting',
  'in_progress',
  'resolved',
  'escalated',
  'follow_up_needed',
  'no_show',
  'left',
]);

const officeHourTypes = new Set([
  'course_office_hour',
  'assignment_clinic',
  'clinical_logbook_support',
  'simulation_review',
  'telehealth_skills_support',
  'department_qa',
  'technical_support',
]);

const resourceMap = {
  institutions: 'institution',
  departments: 'departments',
  sessions: 'academicSessions',
  cohorts: 'cohorts',
  users: 'users',
  profiles: 'userProfiles',
  courses: 'courses',
  sections: 'courseSections',
  lessons: 'lessons',
  enrollments: 'courseEnrollments',
  progress: 'lessonProgress',
  quizzes: 'quizzes',
  assignments: 'assignments',
  grades: 'grades',
  discussions: 'courseDiscussions',
  timeline: 'timelinePosts',
  notifications: 'notifications',
  simulations: 'simulationCases',
  'telehealth-lab': 'telehealthLabSessions',
  logbook: 'logbookEntries',
  certificates: 'certificates',
  payments: 'paymentRecords',
  reports: 'reports',
  'access-requests': 'accessRequests',
};

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function sessionSecret() {
  const configured = process.env.NURSING_SESSION_SECRET || process.env.SESSION_SECRET;
  if (configured) return configured;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('NURSING_SESSION_SECRET is required in production');
  }
  return 'local-only-nursing-session-secret-change-before-production';
}

function base64Url(input) {
  return Buffer.from(input).toString('base64url');
}

function signPayload(payload) {
  const body = base64Url(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', sessionSecret()).update(body).digest('base64url');
  return `${body}.${signature}`;
}

function verifyToken(token) {
  if (!token || token.split('.').length !== 2) return null;
  const [body, signature] = token.split('.');
  const expected = crypto.createHmac('sha256', sessionSecret()).update(body).digest('base64url');
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload?.id || !payload?.role || !payload?.exp || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function createToken(user) {
  const now = Math.floor(Date.now() / 1000);
  return signPayload({
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    institutionId: user.institutionId,
    departmentId: user.departmentId,
    route: user.route || NURSING_ROLE_ROUTES[user.role],
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS,
  });
}

function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_MS,
    path: '/',
  });
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

function normalizePhone(value) {
  return String(value || '').trim().replace(/[\s()-]/g, '');
}

function mapDatabaseUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    title: row.title,
    matricNumber: row.matric_number,
    role: row.primary_role,
    roleLabel: NURSING_ROLE_LABELS[row.primary_role],
    institutionId: row.institution_external_key || DEFAULT_TENANT_KEY,
    departmentId: row.department_external_key || null,
    academicSessionId: row.academic_session_external_key || null,
    cohortId: row.cohort_external_key || null,
    status: row.status,
    accessStatus: row.access_status,
    route: NURSING_ROLE_ROUTES[row.primary_role],
  };
}

async function findDatabaseUser({ email, id }) {
  if (!pool) return null;
  const condition = email ? 'LOWER(u.email) = LOWER($1)' : 'u.id::text = $1';
  const value = email || id;
  const result = await pool.query(
    `SELECT u.*, i.external_key AS institution_external_key,
            d.external_key AS department_external_key,
            s.external_key AS academic_session_external_key,
            c.external_key AS cohort_external_key
       FROM nursing_users u
       LEFT JOIN nursing_institutions i ON i.id = u.institution_id
       LEFT JOIN nursing_departments d ON d.id = u.department_id
       LEFT JOIN nursing_academic_sessions s ON s.id = u.academic_session_id
       LEFT JOIN nursing_cohorts c ON c.id = u.cohort_id
      WHERE ${condition}
      LIMIT 1`,
    [value]
  );
  return result.rows[0] || null;
}

async function authenticateUser(email, password) {
  if (pool) {
    const row = await findDatabaseUser({ email });
    if (!row?.password_hash || !(await bcrypt.compare(password, row.password_hash))) return null;
    if (row.status !== 'active' || row.access_status === 'disabled') return null;
    await pool.query('UPDATE nursing_users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1', [row.id]);
    return mapDatabaseUser(row);
  }
  if (process.env.NODE_ENV === 'production') return null;
  return authenticateNursingTestAccount(email, password);
}

async function resolveSessionUser(payload) {
  if (pool) {
    const row = await findDatabaseUser({ id: payload.id });
    return mapDatabaseUser(row);
  }
  const state = await readState(payload.institutionId || DEFAULT_TENANT_KEY);
  const user = state.users.find((item) => item.id === payload.id);
  return user ? { ...user, roleLabel: NURSING_ROLE_LABELS[user.role], route: NURSING_ROLE_ROUTES[user.role] } : null;
}

const requireNursingSession = asyncHandler(async (req, res, next) => {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice(7)
    : req.cookies?.[SESSION_COOKIE];
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ success: false, error: 'Authentication required', code: 'NURSING_AUTH_REQUIRED' });
  }
  const user = await resolveSessionUser(payload);
  const accountIsActive = user?.status === 'active' && user?.accessStatus !== 'disabled';
  if (!accountIsActive || !user.institutionId) {
    clearSessionCookie(res);
    return res.status(403).json({ success: false, error: 'Account access is inactive', code: 'NURSING_ACCOUNT_INACTIVE' });
  }
  const canOperateWithoutDepartment = [NURSING_ROLES.SUPER_ADMIN, NURSING_ROLES.SUPPORT_ADMIN, NURSING_ROLES.INSTITUTION_ADMIN].includes(user.role);
  if (!canOperateWithoutDepartment && !user.departmentId) {
    return res.status(403).json({ success: false, error: 'Department scope is required', code: 'NURSING_SCOPE_REQUIRED' });
  }
  req.nursingUser = user;
  return next();
});

function requirePermission(permission) {
  return (req, res, next) => {
    if (!canNursingRole(req.nursingUser?.role, permission)) {
      return res.status(403).json({ success: false, error: 'Access denied', requiredPermission: permission });
    }
    return next();
  };
}

function requireSupportRole(req, res, next) {
  if (!supportRoles.has(req.nursingUser?.role)) {
    return res.status(403).json({ success: false, error: 'Academic support role required' });
  }
  return next();
}

function requireMedicationStudent(req, res, next) {
  if (req.nursingUser?.role !== NURSING_ROLES.STUDENT) {
    return res.status(403).json({
      success: false,
      error: 'Medication learning records are available to authenticated nursing students',
      code: 'MEDICATION_STUDENT_ACCESS_REQUIRED',
    });
  }
  return next();
}

function requestError(message, code = 'INVALID_REQUEST', statusCode = 400) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

function validatedText(value, label, maximum, { required = false } = {}) {
  if (value !== undefined && value !== null && typeof value !== 'string') {
    throw requestError(`${label} must be text`);
  }
  const text = String(value || '').replace(/\u0000/g, '').trim();
  if (required && !text) throw requestError(`${label} is required`);
  if (text.length > maximum) throw requestError(`${label} cannot exceed ${maximum.toLocaleString()} characters`);
  return text;
}

function medicationNoteFields(body) {
  if (body.confirmNoPatientInfo !== true) {
    throw requestError(
      'Confirm that the educational note contains no identifiable patient information',
      'MEDICATION_NOTE_PRIVACY_CONFIRMATION_REQUIRED'
    );
  }
  return {
    title: validatedText(body.title, 'Note title', 160, { required: true }),
    content: validatedText(body.content, 'Note content', 12000),
    nursingConsiderations: validatedText(body.nursingConsiderations, 'Nursing considerations', 12000),
    warnings: validatedText(body.warnings, 'Important warnings', 12000),
    administrationReminders: validatedText(body.administrationReminders, 'Administration reminders', 12000),
    patientEducation: validatedText(body.patientEducation, 'Patient education points', 12000),
  };
}

function validateBodyObject(req, res, next) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ success: false, error: 'Request body must be an object' });
  }
  return next();
}

function auditEvent(req, action, resourceType, resourceId, status = 'success') {
  return {
    id: `audit-${crypto.randomUUID()}`,
    userId: req.nursingUser?.id || null,
    role: req.nursingUser?.role || null,
    institutionId: req.nursingUser?.institutionId || DEFAULT_TENANT_KEY,
    action,
    resourceType,
    resourceId: resourceId || null,
    status,
    createdAt: new Date().toISOString(),
  };
}

async function appendEntity(req, collection, entity, action, resourceType) {
  const tenantKey = tenantKeyForUser(req.nursingUser);
  return mutateState(tenantKey, (state) => {
    if (!Array.isArray(state[collection])) state[collection] = [];
    state[collection].unshift(entity);
    state.auditEvents.unshift(auditEvent(req, action, resourceType, entity.id));
    state.auditEvents = state.auditEvents.slice(0, 5000);
    return entity;
  });
}

function createNotification(userId, title, body, type = 'support') {
  return {
    id: `notification-${crypto.randomUUID()}`,
    userId,
    title,
    body,
    type,
    isRead: false,
    createdAt: new Date().toISOString(),
  };
}

function publicUser(user) {
  if (!user) return null;
  const { password, passwordHash, ...safeUser } = user;
  return safeUser;
}

router.post('/auth/login', validateBodyObject, asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!EMAIL_PATTERN.test(email) || password.length < 8) {
    return res.status(400).json({ success: false, error: 'A valid email and password are required' });
  }
  const user = await authenticateUser(email, password);
  if (!user) return res.status(401).json({ success: false, error: 'Credentials were not recognized' });
  const token = createToken(user);
  setSessionCookie(res, token);
  return res.json({ success: true, user: publicUser(user) });
}));

router.post('/auth/logout', (_req, res) => {
  clearSessionCookie(res);
  return res.json({ success: true });
});

router.post('/access-requests', validateBodyObject, asyncHandler(async (req, res) => {
  const fullName = String(req.body.fullName || '').trim();
  const institution = String(req.body.institution || '').trim();
  const department = String(req.body.department || '').trim();
  const roleRequested = String(req.body.roleRequested || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const phone = normalizePhone(req.body.phone);
  const validRoles = new Set(Object.values(NURSING_ROLES));
  if (!fullName || !institution || !department || !EMAIL_PATTERN.test(email) || !PHONE_PATTERN.test(phone)) {
    return res.status(400).json({ success: false, error: 'Complete the required contact and institution fields with valid details' });
  }
  if (!validRoles.has(roleRequested)) return res.status(400).json({ success: false, error: 'Requested role is not recognized' });
  const accessRequest = {
    id: `access-${crypto.randomUUID()}`,
    fullName: fullName.slice(0, 160),
    institution: institution.slice(0, 200),
    department: department.slice(0, 200),
    roleRequested,
    email,
    phone,
    message: String(req.body.message || '').trim().slice(0, 2000),
    status: 'received',
    submittedAt: new Date().toISOString(),
  };
  await mutateState(DEFAULT_TENANT_KEY, (state) => {
    state.accessRequests.unshift(accessRequest);
    return accessRequest;
  });
  return res.status(201).json({ success: true, accessRequest });
}));

router.get('/session', requireNursingSession, (req, res) => {
  return res.json({ success: true, user: publicUser(req.nursingUser) });
});

router.get('/dashboard/:role', requireNursingSession, (req, res) => {
  const requestedRole = String(req.params.role || '');
  const allowed = requestedRole === req.nursingUser.role ||
    (requestedRole === NURSING_ROLES.INSTITUTION_ADMIN && [NURSING_ROLES.SUPER_ADMIN, NURSING_ROLES.SUPPORT_ADMIN].includes(req.nursingUser.role));
  if (!allowed) return res.status(403).json({ success: false, error: 'Role dashboard is not available to this account' });
  return res.json({ success: true, dashboard: getRoleDashboard(requestedRole) });
});

router.get('/metrics', requireNursingSession, requirePermission('viewReports'), (_req, res) => {
  return res.json({ success: true, metrics: getNursingMetrics() });
});

router.get('/bootstrap', requireNursingSession, asyncHandler(async (req, res) => {
  const state = await readState(tenantKeyForUser(req.nursingUser));
  delete state.auditEvents;
  return res.json({ success: true, state });
}));

router.get('/messages', requireNursingSession, asyncHandler(async (req, res) => {
  const state = await readState(tenantKeyForUser(req.nursingUser));
  const messages = state.messages.filter((message) => (
    message.scope === 'department' ||
    message.senderId === req.nursingUser.id ||
    message.recipientId === req.nursingUser.id ||
    (Array.isArray(message.participantIds) && message.participantIds.includes(req.nursingUser.id))
  ));
  return res.json({ success: true, threads: state.messageThreads, messages });
}));

router.post('/messages', requireNursingSession, validateBodyObject, asyncHandler(async (req, res) => {
  const body = String(req.body.body || '').trim();
  const threadId = String(req.body.threadId || '').trim();
  if (!body || !threadId) return res.status(400).json({ success: false, error: 'Message and thread are required' });
  const message = {
    id: `message-${crypto.randomUUID()}`,
    threadId: threadId.slice(0, 160),
    senderId: req.nursingUser.id,
    senderName: `${req.nursingUser.firstName} ${req.nursingUser.lastName}`,
    recipientId: req.body.recipientId || null,
    participantIds: Array.isArray(req.body.participantIds) ? req.body.participantIds.slice(0, 50) : [],
    scope: req.body.scope === 'user' ? 'user' : 'department',
    body: body.slice(0, 5000),
    status: 'sent',
    readBy: [req.nursingUser.id],
    createdAt: new Date().toISOString(),
  };
  return res.status(201).json({ success: true, message: await appendEntity(req, 'messages', message, 'send', 'nursing_message') });
}));

router.get('/profiles/:userId', requireNursingSession, asyncHandler(async (req, res) => {
  const requestedUserId = req.params.userId;
  const mayViewOthers = supportRoles.has(req.nursingUser.role);
  if (requestedUserId !== req.nursingUser.id && !mayViewOthers) {
    return res.status(403).json({ success: false, error: 'Profile access denied' });
  }
  const state = await readState(tenantKeyForUser(req.nursingUser));
  const user = state.users.find((item) => item.id === requestedUserId);
  const profile = state.userProfiles.find((item) => item.userId === requestedUserId) || getNursingUserProfile(requestedUserId)?.profile;
  if (!user || !profile) return res.status(404).json({ success: false, error: 'Profile not found' });
  return res.json({ success: true, profile: { user: publicUser(user), profile } });
}));

router.patch('/profiles/:userId', requireNursingSession, validateBodyObject, asyncHandler(async (req, res) => {
  const userId = req.params.userId;
  const canEdit = userId === req.nursingUser.id || adminRoles.has(req.nursingUser.role);
  if (!canEdit) return res.status(403).json({ success: false, error: 'Profile update denied' });
  const profile = await mutateState(tenantKeyForUser(req.nursingUser), (state) => {
    const index = state.userProfiles.findIndex((item) => item.userId === userId);
    const current = index >= 0 ? state.userProfiles[index] : { id: `profile-${crypto.randomUUID()}`, userId };
    const next = {
      ...current,
      bio: String(req.body.bio || '').trim().slice(0, 2000),
      phone: normalizePhone(req.body.phone).slice(0, 20),
      skills: Array.isArray(req.body.skills) ? req.body.skills.map(String).slice(0, 20) : current.skills || [],
      interests: Array.isArray(req.body.interests) ? req.body.interests.map(String).slice(0, 20) : current.interests || [],
      updatedAt: new Date().toISOString(),
    };
    if (index >= 0) state.userProfiles[index] = next;
    else state.userProfiles.push(next);
    state.auditEvents.unshift(auditEvent(req, 'update', 'nursing_profile', userId));
    return next;
  });
  return res.json({ success: true, profile });
}));

router.get('/waiting-rooms', requireNursingSession, asyncHandler(async (req, res) => {
  const state = await readState(tenantKeyForUser(req.nursingUser));
  return res.json({
    success: true,
    waitingRooms: state.waitingRooms,
    queue: supportRoles.has(req.nursingUser.role)
      ? state.waitingRoomQueue
      : state.waitingRoomQueue.filter((item) => item.studentId === req.nursingUser.id),
    officeHours: state.officeHourSessions,
    supportProfiles: state.adminSupportProfiles.filter((item) => item.whatsappAvailable),
  });
}));

router.post('/waiting-rooms/:roomId/join', requireNursingSession, validateBodyObject, asyncHandler(async (req, res) => {
  if (req.nursingUser.role !== NURSING_ROLES.STUDENT) {
    return res.status(403).json({ success: false, error: 'Only student accounts join the waiting queue' });
  }
  const reason = String(req.body.reason || '');
  const description = String(req.body.description || '').trim();
  if (!waitingReasons.has(reason) || description.length < 5) {
    return res.status(400).json({ success: false, error: 'Select a support reason and provide a short issue description' });
  }
  const entry = await mutateState(tenantKeyForUser(req.nursingUser), (state) => {
    const room = state.waitingRooms.find((item) => item.id === req.params.roomId && item.status === 'open');
    if (!room) {
      const error = new Error('Waiting room is not open');
      error.statusCode = 404;
      throw error;
    }
    const existing = state.waitingRoomQueue.find((item) => item.roomId === room.id && item.studentId === req.nursingUser.id && ['waiting', 'in_progress', 'escalated', 'follow_up_needed'].includes(item.status));
    if (existing) {
      const error = new Error('You already have an active queue entry');
      error.statusCode = 409;
      throw error;
    }
    const queueEntry = {
      id: `queue-${crypto.randomUUID()}`,
      roomId: room.id,
      institutionId: req.nursingUser.institutionId,
      departmentId: req.nursingUser.departmentId,
      studentId: req.nursingUser.id,
      reason,
      description: description.slice(0, 1200),
      status: 'waiting',
      assignedAdminId: null,
      estimatedWaitMinutes: room.estimatedWaitMinutes || 10,
      joinedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    state.waitingRoomQueue.unshift(queueEntry);
    state.waitingRoomParticipants.unshift({
      id: `participant-${crypto.randomUUID()}`,
      roomId: room.id,
      userId: req.nursingUser.id,
      role: req.nursingUser.role,
      status: 'waiting',
      joinedAt: queueEntry.joinedAt,
    });
    for (const user of state.users.filter((item) => supportRoles.has(item.role))) {
      state.notifications.unshift(createNotification(user.id, 'Student joined the support queue', description.slice(0, 180), 'waiting_room'));
    }
    state.auditEvents.unshift(auditEvent(req, 'join', 'waiting_room_queue', queueEntry.id));
    return queueEntry;
  });
  return res.status(201).json({ success: true, entry });
}));

router.patch('/waiting-rooms/queue/:entryId', requireNursingSession, validateBodyObject, asyncHandler(async (req, res) => {
  const requestedStatus = String(req.body.status || '');
  if (!queueStatuses.has(requestedStatus)) return res.status(400).json({ success: false, error: 'Queue status is not recognized' });
  const entry = await mutateState(tenantKeyForUser(req.nursingUser), (state) => {
    const index = state.waitingRoomQueue.findIndex((item) => item.id === req.params.entryId);
    if (index < 0) {
      const error = new Error('Queue entry not found');
      error.statusCode = 404;
      throw error;
    }
    const current = state.waitingRoomQueue[index];
    const isOwnerLeaving = current.studentId === req.nursingUser.id && requestedStatus === 'left';
    if (!isOwnerLeaving && !supportRoles.has(req.nursingUser.role)) {
      const error = new Error('Queue moderation access denied');
      error.statusCode = 403;
      throw error;
    }
    const next = {
      ...current,
      status: requestedStatus,
      assignedAdminId: supportRoles.has(req.nursingUser.role) ? (req.body.assignedAdminId || current.assignedAdminId || req.nursingUser.id) : current.assignedAdminId,
      resolutionNote: String(req.body.resolutionNote || current.resolutionNote || '').slice(0, 1200),
      updatedAt: new Date().toISOString(),
      resolvedAt: ['resolved', 'no_show', 'left'].includes(requestedStatus) ? new Date().toISOString() : null,
    };
    state.waitingRoomQueue[index] = next;
    state.notifications.unshift(createNotification(current.studentId, `Support request ${requestedStatus.replaceAll('_', ' ')}`, next.resolutionNote || 'Your support request status changed.', 'waiting_room'));
    if (requestedStatus === 'escalated') {
      state.supportEscalations.unshift({
        id: `escalation-${crypto.randomUUID()}`,
        queueEntryId: current.id,
        studentId: current.studentId,
        createdBy: req.nursingUser.id,
        status: 'open',
        reason: next.resolutionNote || current.description,
        createdAt: new Date().toISOString(),
      });
    }
    state.auditEvents.unshift(auditEvent(req, 'update_status', 'waiting_room_queue', current.id));
    return next;
  });
  return res.json({ success: true, entry });
}));

router.get('/waiting-rooms/:roomId/messages', requireNursingSession, asyncHandler(async (req, res) => {
  const state = await readState(tenantKeyForUser(req.nursingUser));
  const participates = state.waitingRoomQueue.some((item) => item.roomId === req.params.roomId && item.studentId === req.nursingUser.id);
  if (!participates && !supportRoles.has(req.nursingUser.role)) return res.status(403).json({ success: false, error: 'Room message access denied' });
  const messages = state.waitingRoomMessages.filter((item) => item.roomId === req.params.roomId && (item.visibility !== 'internal' || supportRoles.has(req.nursingUser.role)));
  return res.json({ success: true, messages });
}));

router.post('/waiting-rooms/:roomId/messages', requireNursingSession, validateBodyObject, asyncHandler(async (req, res) => {
  const body = String(req.body.message || '').trim();
  const visibility = req.body.visibility === 'internal' ? 'internal' : 'room';
  if (!body) return res.status(400).json({ success: false, error: 'Message text is required' });
  if (visibility === 'internal' && !supportRoles.has(req.nursingUser.role)) return res.status(403).json({ success: false, error: 'Internal notes require an academic support role' });
  const message = await mutateState(tenantKeyForUser(req.nursingUser), (state) => {
    const room = state.waitingRooms.find((item) => item.id === req.params.roomId);
    if (!room) {
      const error = new Error('Waiting room not found');
      error.statusCode = 404;
      throw error;
    }
    const participates = state.waitingRoomQueue.some((item) => item.roomId === room.id && item.studentId === req.nursingUser.id);
    if (!participates && !supportRoles.has(req.nursingUser.role)) {
      const error = new Error('Room message access denied');
      error.statusCode = 403;
      throw error;
    }
    const item = {
      id: `message-${crypto.randomUUID()}`,
      roomId: room.id,
      senderId: req.nursingUser.id,
      senderRole: req.nursingUser.role,
      message: body.slice(0, 4000),
      visibility,
      status: 'sent',
      readBy: [req.nursingUser.id],
      createdAt: new Date().toISOString(),
    };
    state.waitingRoomMessages.push(item);
    const queue = state.waitingRoomQueue.find((entry) => entry.roomId === room.id && ['waiting', 'in_progress', 'escalated', 'follow_up_needed'].includes(entry.status));
    if (queue && visibility !== 'internal') {
      const recipientId = queue.studentId === req.nursingUser.id ? queue.assignedAdminId : queue.studentId;
      if (recipientId) state.notifications.unshift(createNotification(recipientId, 'New waiting-room message', body.slice(0, 180), 'waiting_room_message'));
    }
    state.auditEvents.unshift(auditEvent(req, 'send_message', 'waiting_room', room.id));
    return item;
  });
  return res.status(201).json({ success: true, message });
}));

router.put('/support-profile', requireNursingSession, requireSupportRole, validateBodyObject, asyncHandler(async (req, res) => {
  const phone = normalizePhone(req.body.whatsappNumber);
  const available = Boolean(req.body.whatsappAvailable);
  if (available && !PHONE_PATTERN.test(phone)) {
    return res.status(400).json({ success: false, error: 'Enter a valid international WhatsApp number' });
  }
  const profile = await mutateState(tenantKeyForUser(req.nursingUser), (state) => {
    const index = state.adminSupportProfiles.findIndex((item) => item.userId === req.nursingUser.id);
    const next = {
      id: index >= 0 ? state.adminSupportProfiles[index].id : `support-profile-${crypto.randomUUID()}`,
      userId: req.nursingUser.id,
      institutionId: req.nursingUser.institutionId,
      departmentId: req.nursingUser.departmentId,
      whatsappNumber: phone,
      whatsappDisplayName: String(req.body.whatsappDisplayName || `${req.nursingUser.firstName} ${req.nursingUser.lastName}`).slice(0, 160),
      whatsappAvailable: available,
      whatsappSupportRole: String(req.body.whatsappSupportRole || NURSING_ROLE_LABELS[req.nursingUser.role]).slice(0, 120),
      whatsappSupportHours: String(req.body.whatsappSupportHours || '').slice(0, 200),
      updatedAt: new Date().toISOString(),
    };
    if (index >= 0) state.adminSupportProfiles[index] = next;
    else state.adminSupportProfiles.unshift(next);
    state.auditEvents.unshift(auditEvent(req, 'update', 'admin_support_profile', next.id));
    return next;
  });
  return res.json({ success: true, profile });
}));

router.post('/office-hours', requireNursingSession, requireSupportRole, validateBodyObject, asyncHandler(async (req, res) => {
  const title = String(req.body.title || '').trim();
  const type = String(req.body.type || '');
  const startsAt = new Date(req.body.startsAt);
  const durationMinutes = Number(req.body.durationMinutes || 30);
  if (!title || !officeHourTypes.has(type) || Number.isNaN(startsAt.getTime()) || durationMinutes < 15 || durationMinutes > 240) {
    return res.status(400).json({ success: false, error: 'Provide a valid title, type, start time, and duration' });
  }
  const session = {
    id: `office-hour-${crypto.randomUUID()}`,
    institutionId: req.nursingUser.institutionId,
    departmentId: req.nursingUser.departmentId,
    courseId: req.body.courseId || null,
    cohortId: req.body.cohortId || null,
    hostId: req.nursingUser.id,
    title: title.slice(0, 240),
    description: String(req.body.description || '').slice(0, 2000),
    type,
    startsAt: startsAt.toISOString(),
    durationMinutes,
    capacity: Math.min(250, Math.max(1, Number(req.body.capacity || 30))),
    status: 'scheduled',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const created = await mutateState(tenantKeyForUser(req.nursingUser), (state) => {
    state.officeHourSessions.unshift(session);
    for (const user of state.users.filter((item) => item.role === NURSING_ROLES.STUDENT)) {
      state.notifications.unshift(createNotification(user.id, 'New office-hour session', session.title, 'office_hours'));
    }
    state.auditEvents.unshift(auditEvent(req, 'create', 'office_hour_session', session.id));
    return session;
  });
  return res.status(201).json({ success: true, session: created });
}));

router.post('/office-hours/:sessionId/join', requireNursingSession, asyncHandler(async (req, res) => {
  const attendance = await mutateState(tenantKeyForUser(req.nursingUser), (state) => {
    const session = state.officeHourSessions.find((item) => item.id === req.params.sessionId && !['closed', 'cancelled'].includes(item.status));
    if (!session) {
      const error = new Error('Office-hour session is not available');
      error.statusCode = 404;
      throw error;
    }
    const activeAttendance = state.officeHourAttendance.filter((item) => item.sessionId === session.id && item.status !== 'cancelled');
    if (activeAttendance.length >= session.capacity) {
      const error = new Error('Office-hour session has reached capacity');
      error.statusCode = 409;
      throw error;
    }
    const existing = activeAttendance.find((item) => item.userId === req.nursingUser.id);
    if (existing) return existing;
    const item = {
      id: `attendance-${crypto.randomUUID()}`,
      sessionId: session.id,
      userId: req.nursingUser.id,
      status: 'registered',
      joinedAt: new Date().toISOString(),
    };
    state.officeHourAttendance.unshift(item);
    state.notifications.unshift(createNotification(session.hostId, 'Office-hour registration', `${req.nursingUser.firstName} ${req.nursingUser.lastName} joined ${session.title}.`, 'office_hours'));
    state.auditEvents.unshift(auditEvent(req, 'join', 'office_hour_session', session.id));
    return item;
  });
  return res.status(201).json({ success: true, attendance });
}));

router.post('/office-hours/:sessionId/questions', requireNursingSession, validateBodyObject, asyncHandler(async (req, res) => {
  const questionText = String(req.body.question || '').trim();
  if (questionText.length < 5) return res.status(400).json({ success: false, error: 'Question must contain at least five characters' });
  const question = {
    id: `office-question-${crypto.randomUUID()}`,
    sessionId: req.params.sessionId,
    studentId: req.nursingUser.id,
    question: questionText.slice(0, 2000),
    status: 'submitted',
    createdAt: new Date().toISOString(),
  };
  const created = await appendEntity(req, 'officeHourQuestions', question, 'submit_question', 'office_hour_session');
  return res.status(201).json({ success: true, question: created });
}));

router.patch('/office-hours/:sessionId', requireNursingSession, requireSupportRole, validateBodyObject, asyncHandler(async (req, res) => {
  const allowedStatuses = new Set(['scheduled', 'open', 'closed', 'cancelled']);
  const session = await mutateState(tenantKeyForUser(req.nursingUser), (state) => {
    const index = state.officeHourSessions.findIndex((item) => item.id === req.params.sessionId);
    if (index < 0) {
      const error = new Error('Office-hour session not found');
      error.statusCode = 404;
      throw error;
    }
    const current = state.officeHourSessions[index];
    const mayManage = current.hostId === req.nursingUser.id || adminRoles.has(req.nursingUser.role);
    if (!mayManage) {
      const error = new Error('Office-hour management access denied');
      error.statusCode = 403;
      throw error;
    }
    const next = {
      ...current,
      status: allowedStatuses.has(req.body.status) ? req.body.status : current.status,
      sessionNotes: String(req.body.sessionNotes || current.sessionNotes || '').slice(0, 4000),
      updatedAt: new Date().toISOString(),
    };
    state.officeHourSessions[index] = next;
    state.auditEvents.unshift(auditEvent(req, 'update', 'office_hour_session', current.id));
    return next;
  });
  return res.json({ success: true, session });
}));

router.get('/medications/search', requireNursingSession, asyncHandler(async (req, res) => {
  const searchBy = String(req.query.searchBy || 'generic');
  if (!['generic', 'brand', 'ingredient'].includes(searchBy)) {
    return res.status(400).json({ success: false, error: 'Search type must be generic, brand, or ingredient' });
  }
  const result = await dailyMedClient.searchMedications({
    query: req.query.q,
    searchBy,
    page: req.query.page,
    pageSize: req.query.pageSize,
  });
  res.set('Cache-Control', 'private, max-age=300');
  res.set('X-Content-Source', 'NIH DailyMed v2');
  return res.json({ success: true, ...result });
}));

router.get('/medications/suggestions', requireNursingSession, asyncHandler(async (req, res) => {
  const searchBy = String(req.query.searchBy || 'generic');
  if (!['generic', 'brand', 'ingredient'].includes(searchBy)) {
    return res.status(400).json({ success: false, error: 'Search type must be generic, brand, or ingredient' });
  }
  const suggestions = await dailyMedClient.suggestMedicationNames({
    query: req.query.q,
    searchBy,
    limit: req.query.limit,
  });
  res.set('Cache-Control', 'private, max-age=300');
  res.set('X-Content-Source', 'NIH DailyMed v2');
  return res.json({ success: true, suggestions });
}));

router.get('/medications/:setId/flashcards', requireNursingSession, requireMedicationStudent, asyncHandler(async (req, res) => {
  const setId = dailyMedClient.validateSetId(req.params.setId);
  const label = await dailyMedClient.getMedicationLabel(setId);
  const cards = buildMedicationFlashcards(label);
  return res.json({
    success: true,
    medication: { setId: label.setId, medicationName: label.drugName },
    cards,
    disclaimer: 'For education only. Verify medication information against current approved guidance and clinical policy.',
  });
}));

router.post('/medications/:setId/quizzes', requireNursingSession, requireMedicationStudent, validateBodyObject, asyncHandler(async (req, res) => {
  const setId = dailyMedClient.validateSetId(req.params.setId);
  const difficulty = String(req.body.difficulty || 'beginner').toLowerCase();
  if (!DIFFICULTIES.has(difficulty)) {
    return res.status(400).json({ success: false, error: 'Difficulty must be beginner, intermediate, or advanced' });
  }
  const label = await dailyMedClient.getMedicationLabel(setId);
  const quiz = buildMedicationQuiz(label, difficulty, crypto.randomUUID());
  return res.status(201).json({ success: true, quiz: publicMedicationQuiz(quiz) });
}));

router.get('/medications/:setId', requireNursingSession, asyncHandler(async (req, res) => {
  const setId = dailyMedClient.validateSetId(req.params.setId);
  const label = await dailyMedClient.getMedicationLabel(setId);
  res.set('Cache-Control', 'private, max-age=1800');
  res.set('X-Content-Source', 'NIH DailyMed v2');
  return res.json({
    success: true,
    medication: label,
    disclaimer: 'DailyMed content is provided for education and does not replace clinical judgment, local prescribing guidance, or institutional policy.',
  });
}));

router.get('/medication-notes', requireNursingSession, requireMedicationStudent, asyncHandler(async (req, res) => {
  const query = validatedText(req.query.q, 'Medication filter', 100);
  const dateFrom = req.query.dateFrom ? String(req.query.dateFrom) : null;
  const dateTo = req.query.dateTo ? String(req.query.dateTo) : null;
  if ((dateFrom && !DATE_PATTERN.test(dateFrom)) || (dateTo && !DATE_PATTERN.test(dateTo))) {
    return res.status(400).json({ success: false, error: 'Note dates must use YYYY-MM-DD format' });
  }
  const notes = await listMedicationNotes(req.nursingUser, { query, dateFrom, dateTo });
  return res.json({ success: true, notes });
}));

router.post('/medication-notes', requireNursingSession, requireMedicationStudent, validateBodyObject, asyncHandler(async (req, res) => {
  const dailyMedSetId = dailyMedClient.validateSetId(req.body.dailyMedSetId);
  const fields = medicationNoteFields(req.body);
  const label = await dailyMedClient.getMedicationLabel(dailyMedSetId);
  const note = await createMedicationNote(req.nursingUser, {
    ...fields,
    dailyMedSetId,
    medicationName: label.drugName,
  });
  return res.status(201).json({ success: true, note });
}));

router.patch('/medication-notes/:noteId', requireNursingSession, requireMedicationStudent, validateBodyObject, asyncHandler(async (req, res) => {
  if (!UUID_PATTERN.test(req.params.noteId)) {
    return res.status(400).json({ success: false, error: 'A valid medication note ID is required' });
  }
  const note = await updateMedicationNote(req.nursingUser, req.params.noteId, medicationNoteFields(req.body));
  if (!note) return res.status(404).json({ success: false, error: 'Medication note not found' });
  return res.json({ success: true, note });
}));

router.delete('/medication-notes/:noteId', requireNursingSession, requireMedicationStudent, asyncHandler(async (req, res) => {
  if (!UUID_PATTERN.test(req.params.noteId)) {
    return res.status(400).json({ success: false, error: 'A valid medication note ID is required' });
  }
  const deleted = await deleteMedicationNote(req.nursingUser, req.params.noteId);
  if (!deleted) return res.status(404).json({ success: false, error: 'Medication note not found' });
  return res.json({ success: true });
}));

router.get('/medication-quizzes/attempts', requireNursingSession, requireMedicationStudent, asyncHandler(async (req, res) => {
  const setId = req.query.setId ? dailyMedClient.validateSetId(req.query.setId) : null;
  const attempts = await listMedicationQuizAttempts(req.nursingUser, setId);
  return res.json({ success: true, attempts });
}));

router.post('/medication-quizzes/attempts', requireNursingSession, requireMedicationStudent, validateBodyObject, asyncHandler(async (req, res) => {
  const setId = dailyMedClient.validateSetId(req.body.dailyMedSetId);
  const difficulty = String(req.body.difficulty || '').toLowerCase();
  const attemptKey = String(req.body.attemptKey || '');
  if (!DIFFICULTIES.has(difficulty) || !UUID_PATTERN.test(attemptKey)) {
    return res.status(400).json({ success: false, error: 'A valid quiz attempt and difficulty are required' });
  }
  if (!req.body.answers || typeof req.body.answers !== 'object' || Array.isArray(req.body.answers)) {
    return res.status(400).json({ success: false, error: 'Quiz answers must be submitted as an object' });
  }
  const label = await dailyMedClient.getMedicationLabel(setId);
  const quiz = buildMedicationQuiz(label, difficulty, attemptKey);
  const grade = gradeMedicationQuiz(quiz, req.body.answers);
  const attempt = await saveMedicationQuizAttempt(req.nursingUser, {
    dailyMedSetId: setId,
    medicationName: label.drugName,
    difficulty,
    score: grade.score,
    totalQuestions: grade.totalQuestions,
    answers: grade.results.map((result) => ({
      questionId: result.questionId,
      type: result.type,
      prompt: result.prompt,
      studentAnswer: result.studentAnswer,
      correctAnswer: result.correctAnswer,
      correct: result.correct,
    })),
    questionSources: grade.results.map((result) => ({ questionId: result.questionId, source: result.source })),
  });
  return res.status(201).json({ success: true, attempt, results: grade.results });
}));

router.get('/medication-flashcards/progress', requireNursingSession, requireMedicationStudent, asyncHandler(async (req, res) => {
  const setId = req.query.setId ? dailyMedClient.validateSetId(req.query.setId) : null;
  const progress = await listMedicationFlashcardProgress(req.nursingUser, setId);
  return res.json({ success: true, progress });
}));

router.put('/medication-flashcards/progress', requireNursingSession, requireMedicationStudent, validateBodyObject, asyncHandler(async (req, res) => {
  const dailyMedSetId = dailyMedClient.validateSetId(req.body.dailyMedSetId);
  const cardKey = String(req.body.cardKey || '');
  const status = String(req.body.status || '');
  if (!FLASHCARD_KEY_PATTERN.test(cardKey) || !['know_it', 'review_again'].includes(status)) {
    return res.status(400).json({ success: false, error: 'A valid flashcard and review status are required' });
  }
  const label = await dailyMedClient.getMedicationLabel(dailyMedSetId);
  const validCard = buildMedicationFlashcards(label).some((card) => card.cardKey === cardKey);
  if (!validCard) {
    return res.status(400).json({ success: false, error: 'The flashcard does not belong to the selected medication label' });
  }
  const progress = await saveMedicationFlashcardProgress(req.nursingUser, {
    dailyMedSetId,
    medicationName: label.drugName,
    cardKey,
    status,
  });
  return res.json({ success: true, progress });
}));

router.get('/:resource', requireNursingSession, asyncHandler(async (req, res) => {
  const resource = String(req.params.resource || '');
  const key = resourceMap[resource];
  if (!key) return res.status(404).json({ success: false, error: 'Unknown nursing resource' });
  if (resource === 'access-requests' && !adminRoles.has(req.nursingUser.role)) {
    return res.status(403).json({ success: false, error: 'Access request administration requires an admin role' });
  }
  const state = await readState(tenantKeyForUser(req.nursingUser));
  const data = key === 'institution' ? state.institution : state[key];
  const responseKey = resource.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  return res.json({ success: true, [responseKey]: data });
}));

router.post('/cohorts', requireNursingSession, requirePermission('manageInstitution'), validateBodyObject, asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ success: false, error: 'Cohort name is required' });
  const cohort = {
    id: `cohort-${crypto.randomUUID()}`,
    institutionId: req.nursingUser.institutionId,
    departmentId: req.nursingUser.departmentId,
    academicSessionId: req.body.academicSessionId || null,
    name: name.slice(0, 120),
    level: String(req.body.level || name).slice(0, 80),
    studentCount: 0,
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  return res.status(201).json({ success: true, cohort: await appendEntity(req, 'cohorts', cohort, 'create', 'nursing_cohort') });
}));

router.post('/courses', requireNursingSession, requirePermission('manageCourses'), validateBodyObject, asyncHandler(async (req, res) => {
  const title = String(req.body.title || '').trim();
  if (!title) return res.status(400).json({ success: false, error: 'Course title is required' });
  const course = {
    id: `course-${crypto.randomUUID()}`,
    institutionId: req.nursingUser.institutionId,
    departmentId: req.nursingUser.departmentId,
    lecturerId: req.nursingUser.id,
    title: title.slice(0, 255),
    code: String(req.body.code || 'NUR-DRAFT').slice(0, 60),
    description: String(req.body.description || '').slice(0, 4000),
    status: req.body.status === 'published' ? 'published' : 'draft',
    modules: Array.isArray(req.body.modules) ? req.body.modules : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return res.status(201).json({ success: true, course: await appendEntity(req, 'courses', course, 'create', 'nursing_course') });
}));

router.post('/courses/:courseId/sections', requireNursingSession, requirePermission('manageLessons'), validateBodyObject, asyncHandler(async (req, res) => {
  const title = String(req.body.title || '').trim();
  if (!title) return res.status(400).json({ success: false, error: 'Section title is required' });
  const section = { id: `section-${crypto.randomUUID()}`, courseId: req.params.courseId, title: title.slice(0, 255), sequence: Number(req.body.sequence || 1), status: req.body.status || 'published', createdBy: req.nursingUser.id, createdAt: new Date().toISOString() };
  return res.status(201).json({ success: true, section: await appendEntity(req, 'courseSections', section, 'create', 'nursing_course_section') });
}));

router.post('/courses/:courseId/lessons', requireNursingSession, requirePermission('manageLessons'), validateBodyObject, asyncHandler(async (req, res) => {
  const title = String(req.body.title || '').trim();
  if (!title) return res.status(400).json({ success: false, error: 'Lesson title is required' });
  const lesson = {
    id: `lesson-${crypto.randomUUID()}`,
    courseId: req.params.courseId,
    sectionId: req.body.sectionId || null,
    title: title.slice(0, 255),
    contentType: req.body.contentType || 'text',
    contentBody: String(req.body.contentBody || '').slice(0, 30000),
    videoUrl: req.body.videoUrl || null,
    resourceUrl: req.body.resourceUrl || null,
    estimatedMinutes: Math.max(1, Number(req.body.estimatedMinutes || 15)),
    status: req.body.status || 'draft',
    createdBy: req.nursingUser.id,
    createdAt: new Date().toISOString(),
  };
  return res.status(201).json({ success: true, lesson: await appendEntity(req, 'lessons', lesson, 'create', 'nursing_lesson') });
}));

router.post('/lessons/:lessonId/progress', requireNursingSession, requirePermission('completeLesson'), validateBodyObject, asyncHandler(async (req, res) => {
  const progress = {
    id: `progress-${crypto.randomUUID()}`,
    studentId: req.nursingUser.id,
    lessonId: req.params.lessonId,
    courseId: req.body.courseId || null,
    status: req.body.status || 'completed',
    progressPercent: Math.min(100, Math.max(0, Number(req.body.progressPercent || 100))),
    completedAt: new Date().toISOString(),
  };
  return res.status(201).json({ success: true, progress: await appendEntity(req, 'lessonProgress', progress, 'complete', 'nursing_lesson') });
}));

router.post('/assignments', requireNursingSession, requirePermission('manageAssignments'), validateBodyObject, asyncHandler(async (req, res) => {
  const title = String(req.body.title || '').trim();
  if (!title || !req.body.courseId) return res.status(400).json({ success: false, error: 'Assignment title and course are required' });
  const assignment = { id: `assignment-${crypto.randomUUID()}`, courseId: req.body.courseId, title: title.slice(0, 255), instructions: String(req.body.instructions || '').slice(0, 10000), dueDate: req.body.dueDate || null, maxScore: Math.max(1, Number(req.body.maxScore || 100)), rubric: Array.isArray(req.body.rubric) ? req.body.rubric : [], status: req.body.status || 'published', createdBy: req.nursingUser.id, createdAt: new Date().toISOString() };
  return res.status(201).json({ success: true, assignment: await appendEntity(req, 'assignments', assignment, 'create', 'nursing_assignment') });
}));

router.post('/assignments/:assignmentId/submissions', requireNursingSession, requirePermission('submitAssignment'), validateBodyObject, asyncHandler(async (req, res) => {
  const submissionText = String(req.body.submissionText || '').trim();
  if (!submissionText) return res.status(400).json({ success: false, error: 'Submission text is required' });
  const submission = { id: `submission-${crypto.randomUUID()}`, assignmentId: req.params.assignmentId, studentId: req.nursingUser.id, courseId: req.body.courseId || null, submissionText: submissionText.slice(0, 30000), attachmentUrl: req.body.attachmentUrl || null, status: 'submitted', submittedAt: new Date().toISOString() };
  return res.status(201).json({ success: true, submission: await appendEntity(req, 'assignmentSubmissions', submission, 'submit', 'nursing_assignment') });
}));

router.patch('/submissions/:submissionId/grade', requireNursingSession, requirePermission('gradeAssignments'), validateBodyObject, asyncHandler(async (req, res) => {
  const score = Number(req.body.score);
  if (!Number.isFinite(score) || score < 0) return res.status(400).json({ success: false, error: 'A valid non-negative score is required' });
  const grade = { id: `grade-${crypto.randomUUID()}`, submissionId: req.params.submissionId, gradeType: 'assignment', score, maxScore: Math.max(1, Number(req.body.maxScore || 100)), comments: String(req.body.comments || '').slice(0, 4000), status: 'graded', gradedBy: req.nursingUser.id, gradedAt: new Date().toISOString() };
  return res.json({ success: true, grade: await appendEntity(req, 'grades', grade, 'grade', 'nursing_assignment_submission') });
}));

router.post('/discussions', requireNursingSession, validateBodyObject, asyncHandler(async (req, res) => {
  const title = String(req.body.title || '').trim();
  const body = String(req.body.body || '').trim();
  if (!title || !body || !req.body.courseId) return res.status(400).json({ success: false, error: 'Discussion title, body, and course are required' });
  const discussion = { id: `discussion-${crypto.randomUUID()}`, courseId: req.body.courseId, authorId: req.nursingUser.id, title: title.slice(0, 255), body: body.slice(0, 10000), status: 'open', createdAt: new Date().toISOString() };
  return res.status(201).json({ success: true, discussion: await appendEntity(req, 'courseDiscussions', discussion, 'create', 'nursing_course_discussion') });
}));

router.post('/discussions/:discussionId/replies', requireNursingSession, validateBodyObject, asyncHandler(async (req, res) => {
  const body = String(req.body.body || '').trim();
  if (!body) return res.status(400).json({ success: false, error: 'Reply body is required' });
  const reply = { id: `discussion-reply-${crypto.randomUUID()}`, discussionId: req.params.discussionId, authorId: req.nursingUser.id, body: body.slice(0, 10000), status: 'published', createdAt: new Date().toISOString() };
  return res.status(201).json({ success: true, reply: await appendEntity(req, 'courseDiscussionReplies', reply, 'create', 'nursing_course_discussion_reply') });
}));

router.post('/timeline/posts', requireNursingSession, requirePermission('createTimelinePost'), validateBodyObject, asyncHandler(async (req, res) => {
  const body = String(req.body.body || '').trim();
  if (!body) return res.status(400).json({ success: false, error: 'Timeline post body is required' });
  const post = { id: `post-${crypto.randomUUID()}`, authorId: req.nursingUser.id, institutionId: req.nursingUser.institutionId, departmentId: req.nursingUser.departmentId, cohortId: req.body.cohortId || null, courseId: req.body.courseId || null, scope: req.body.scope || 'department', type: req.body.type || 'post', title: String(req.body.title || 'Academic update').slice(0, 255), body: body.slice(0, 10000), pinned: false, status: 'published', createdAt: new Date().toISOString() };
  return res.status(201).json({ success: true, post: await appendEntity(req, 'timelinePosts', post, 'create', 'nursing_timeline_post') });
}));

router.post('/timeline/posts/:postId/comments', requireNursingSession, validateBodyObject, asyncHandler(async (req, res) => {
  const body = String(req.body.body || '').trim();
  if (!body) return res.status(400).json({ success: false, error: 'Comment body is required' });
  const comment = { id: `timeline-comment-${crypto.randomUUID()}`, postId: req.params.postId, authorId: req.nursingUser.id, body: body.slice(0, 5000), status: 'published', createdAt: new Date().toISOString() };
  return res.status(201).json({ success: true, comment: await appendEntity(req, 'timelineComments', comment, 'create', 'nursing_timeline_comment') });
}));

router.post('/timeline/posts/:postId/reactions', requireNursingSession, validateBodyObject, asyncHandler(async (req, res) => {
  const reaction = { id: `timeline-reaction-${crypto.randomUUID()}`, postId: req.params.postId, userId: req.nursingUser.id, reactionType: String(req.body.reactionType || 'helpful').slice(0, 40), createdAt: new Date().toISOString() };
  return res.status(201).json({ success: true, reaction: await appendEntity(req, 'timelineReactions', reaction, 'react', 'nursing_timeline_post') });
}));

router.patch('/timeline/posts/:postId/moderate', requireNursingSession, requirePermission('moderateTimeline'), validateBodyObject, asyncHandler(async (req, res) => {
  const post = await mutateState(tenantKeyForUser(req.nursingUser), (state) => {
    const index = state.timelinePosts.findIndex((item) => item.id === req.params.postId);
    if (index < 0) {
      const error = new Error('Timeline post not found');
      error.statusCode = 404;
      throw error;
    }
    const next = { ...state.timelinePosts[index], status: ['published', 'hidden', 'deleted'].includes(req.body.status) ? req.body.status : state.timelinePosts[index].status, pinned: Boolean(req.body.pinned), moderatedBy: req.nursingUser.id, moderatedAt: new Date().toISOString() };
    state.timelinePosts[index] = next;
    state.auditEvents.unshift(auditEvent(req, 'moderate', 'nursing_timeline_post', next.id));
    return next;
  });
  return res.json({ success: true, post });
}));

router.post('/quizzes/:quizId/attempts', requireNursingSession, requirePermission('takeCourse'), validateBodyObject, asyncHandler(async (req, res) => {
  const state = await readState(tenantKeyForUser(req.nursingUser));
  const quiz = state.quizzes.find((item) => item.id === req.params.quizId);
  if (!quiz) return res.status(404).json({ success: false, error: 'Quiz not found' });
  const answers = Array.isArray(req.body.answers) ? req.body.answers : Object.values(req.body.answers || {});
  const correct = quiz.questions.filter((question, index) => Number(answers[index]) === Number(question.correctIndex)).length;
  const score = quiz.questions.length ? Math.round((correct / quiz.questions.length) * 100) : 0;
  const attempt = { id: `quiz-attempt-${crypto.randomUUID()}`, quizId: quiz.id, studentId: req.nursingUser.id, score, correct, total: quiz.questions.length, submittedAt: new Date().toISOString() };
  return res.status(201).json({ success: true, attempt: await appendEntity(req, 'quizAttempts', attempt, 'submit', 'nursing_quiz_attempt') });
}));

router.post('/simulations/:caseId/attempts', requireNursingSession, requirePermission('attemptSimulation'), validateBodyObject, asyncHandler(async (req, res) => {
  const state = await readState(tenantKeyForUser(req.nursingUser));
  const simulationCase = state.simulationCases.find((item) => item.id === req.params.caseId);
  if (!simulationCase) return res.status(404).json({ success: false, error: 'Simulation case not found' });
  const selectedSteps = Array.isArray(req.body.selectedSteps) ? req.body.selectedSteps : [];
  const carePlan = String(req.body.carePlan || '').trim();
  if (!carePlan) return res.status(400).json({ success: false, error: 'Care plan is required' });
  const score = Math.min(100, 55 + selectedSteps.length * 6 + (carePlan.length >= 80 ? 15 : 5));
  const attempt = { id: `simulation-attempt-${crypto.randomUUID()}`, caseId: simulationCase.id, studentId: req.nursingUser.id, selectedSteps, carePlan: carePlan.slice(0, 10000), score, feedback: simulationCase.feedback, submittedAt: new Date().toISOString() };
  return res.status(201).json({ success: true, attempt: await appendEntity(req, 'simulationAttempts', attempt, 'submit', 'nursing_simulation_attempt') });
}));

router.post('/telehealth-lab/notes', requireNursingSession, validateBodyObject, asyncHandler(async (req, res) => {
  if (!canNursingRole(req.nursingUser.role, 'runTelehealthLab')) return res.status(403).json({ success: false, error: 'Telehealth lab access denied' });
  const noteText = String(req.body.noteText || '').trim();
  if (!noteText) return res.status(400).json({ success: false, error: 'Consultation note is required' });
  const note = { id: `telehealth-note-${crypto.randomUUID()}`, userId: req.nursingUser.id, sessionId: req.body.sessionId || null, role: req.body.role || 'nurse', checklist: Array.isArray(req.body.checklist) ? req.body.checklist : [], noteText: noteText.slice(0, 10000), status: 'submitted', submittedAt: new Date().toISOString() };
  return res.status(201).json({ success: true, note: await appendEntity(req, 'telehealthLabNotes', note, 'submit', 'nursing_telehealth_lab_note') });
}));

router.post('/logbook', requireNursingSession, requirePermission('submitLogbook'), validateBodyObject, asyncHandler(async (req, res) => {
  const reflection = String(req.body.reflection || '').trim();
  const hoursCompleted = Number(req.body.hoursCompleted || 0);
  if (!reflection || hoursCompleted <= 0 || hoursCompleted > 24) return res.status(400).json({ success: false, error: 'A reflection and valid clinical hours are required' });
  const entry = { id: `logbook-${crypto.randomUUID()}`, studentId: req.nursingUser.id, institutionId: req.nursingUser.institutionId, departmentId: req.nursingUser.departmentId, supervisorId: req.body.supervisorId || null, clinicalSite: String(req.body.clinicalSite || 'Clinical placement site').slice(0, 255), wardUnit: String(req.body.wardUnit || 'General ward').slice(0, 160), date: req.body.date || new Date().toISOString().slice(0, 10), hoursCompleted, encounterCategory: String(req.body.encounterCategory || 'General nursing').slice(0, 160), skillsPerformed: Array.isArray(req.body.skillsPerformed) ? req.body.skillsPerformed.slice(0, 30) : [], reflection: reflection.slice(0, 10000), status: 'pending', supervisorComments: '', submittedAt: new Date().toISOString() };
  return res.status(201).json({ success: true, entry: await appendEntity(req, 'logbookEntries', entry, 'submit', 'nursing_logbook_entry') });
}));

router.patch('/logbook/:entryId/review', requireNursingSession, requirePermission('reviewLogbook'), validateBodyObject, asyncHandler(async (req, res) => {
  const status = ['approved', 'returned', 'rejected'].includes(req.body.status) ? req.body.status : 'approved';
  const review = await mutateState(tenantKeyForUser(req.nursingUser), (state) => {
    const index = state.logbookEntries.findIndex((item) => item.id === req.params.entryId);
    if (index < 0) {
      const error = new Error('Logbook entry not found');
      error.statusCode = 404;
      throw error;
    }
    const entry = { ...state.logbookEntries[index], status, supervisorId: req.nursingUser.id, supervisorComments: String(req.body.comments || '').slice(0, 4000), reviewedAt: new Date().toISOString() };
    state.logbookEntries[index] = entry;
    state.notifications.unshift(createNotification(entry.studentId, `Logbook entry ${status}`, entry.supervisorComments || 'Your logbook status changed.', 'logbook'));
    state.auditEvents.unshift(auditEvent(req, 'review', 'nursing_logbook_entry', entry.id));
    return { id: `review-${crypto.randomUUID()}`, entryId: entry.id, supervisorId: req.nursingUser.id, status, comments: entry.supervisorComments, reviewedAt: entry.reviewedAt };
  });
  return res.json({ success: true, review });
}));

router.patch('/payments/:paymentId/verify', requireNursingSession, requirePermission('managePayments'), validateBodyObject, asyncHandler(async (req, res) => {
  const payment = await mutateState(tenantKeyForUser(req.nursingUser), (state) => {
    const index = state.paymentRecords.findIndex((item) => item.id === req.params.paymentId);
    if (index < 0) {
      const error = new Error('Payment record not found');
      error.statusCode = 404;
      throw error;
    }
    const next = {
      ...state.paymentRecords[index],
      paymentStatus: 'paid',
      accessStatus: 'active',
      amountPaid: state.paymentRecords[index].amountExpected,
      receiptStatus: 'issued',
      verifiedBy: req.nursingUser.id,
      verifiedAt: new Date().toISOString(),
      paymentReference: String(req.body.reference || state.paymentRecords[index].paymentReference || '').slice(0, 180),
    };
    state.paymentRecords[index] = next;
    state.auditEvents.unshift(auditEvent(req, 'verify', 'nursing_payment_record', next.id));
    return next;
  });
  return res.json({ success: true, payment });
}));

router.post('/certificates', requireNursingSession, requirePermission('issueCertificates'), validateBodyObject, asyncHandler(async (req, res) => {
  if (!req.body.studentId) return res.status(400).json({ success: false, error: 'Student is required' });
  const certificate = { id: `certificate-${crypto.randomUUID()}`, studentId: req.body.studentId, certificateType: req.body.certificateType || 'Certificate of Participation', programName: String(req.body.programName || 'DoctaRx Nursing Education & Clinical Training Platform').slice(0, 255), institutionId: req.nursingUser.institutionId, status: 'issued', verificationCode: `DRX-NUR-${crypto.randomInt(100000, 999999)}`, issueDate: new Date().toISOString().slice(0, 10), issuedBy: req.nursingUser.id };
  return res.status(201).json({ success: true, certificate: await appendEntity(req, 'certificates', certificate, 'issue', 'nursing_certificate') });
}));

router.use((error, _req, res, _next) => {
  if (process.env.NODE_ENV !== 'test') console.error('Nursing API error:', error.message);
  if (error.retryAfterSeconds) res.set('Retry-After', String(error.retryAfterSeconds));
  return res.status(error.statusCode || 500).json({
    success: false,
    error: error.statusCode ? error.message : 'The nursing platform could not complete this request',
    ...(error.code ? { code: error.code } : {}),
  });
});

module.exports = router;
