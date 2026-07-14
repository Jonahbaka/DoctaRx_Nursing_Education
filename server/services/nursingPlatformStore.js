const fs = require('node:fs/promises');
const path = require('node:path');
const { pool, transaction } = require('../db');
const { getNursingSeedData } = require('../../lib/nursingEducationData');

const DEFAULT_TENANT_KEY = 'inst-uniabuja';
const localStateFile = process.env.NURSING_LOCAL_STATE_FILE || path.join(process.cwd(), '.data', 'nursing-platform-state.json');
const memoryStates = new Map();
let localFileLoaded = false;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function defaultState() {
  const seed = clone(getNursingSeedData());
  return {
    ...seed,
    accessRequests: [],
    waitingRooms: [
      {
        id: 'waiting-room-department-support',
        institutionId: DEFAULT_TENANT_KEY,
        departmentId: 'dept-nursing-science',
        title: 'Nursing Academic Support',
        description: 'Live academic, clinical logbook, simulation, and access support.',
        status: 'open',
        estimatedWaitMinutes: 8,
        announcement: 'Please keep questions focused and do not share identifiable patient information.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    waitingRoomQueue: [],
    waitingRoomMessages: [],
    waitingRoomParticipants: [],
    waitingRoomAssignments: [],
    officeHourSessions: [],
    officeHourQuestions: [],
    officeHourAttendance: [],
    officeHourNotes: [],
    supportEscalations: [],
    adminSupportProfiles: [],
    medicationNotes: [],
    medicationQuizAttempts: [],
    medicationFlashcardProgress: [],
    messageThreads: [
      { id: 'announcements', title: 'Department announcements', scope: 'department', status: 'open' },
      { id: 'course-discussions', title: 'Course Q&A', scope: 'department', status: 'open' },
      { id: 'notifications', title: 'Notifications', scope: 'user', status: 'open' },
    ],
    messages: [],
    auditEvents: [],
  };
}

function normalizeState(value) {
  const baseline = defaultState();
  const candidate = value && typeof value === 'object' ? value : {};
  for (const [key, defaultValue] of Object.entries(baseline)) {
    if (candidate[key] === undefined) candidate[key] = defaultValue;
  }
  return candidate;
}

async function loadLocalFile() {
  if (localFileLoaded || process.env.NODE_ENV === 'test') return;
  localFileLoaded = true;
  try {
    const parsed = JSON.parse(await fs.readFile(localStateFile, 'utf8'));
    for (const [tenantKey, state] of Object.entries(parsed)) {
      memoryStates.set(tenantKey, normalizeState(state));
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

async function writeLocalFile() {
  if (process.env.NODE_ENV === 'test') return;
  await fs.mkdir(path.dirname(localStateFile), { recursive: true });
  const temporaryFile = `${localStateFile}.${process.pid}.tmp`;
  await fs.writeFile(temporaryFile, JSON.stringify(Object.fromEntries(memoryStates), null, 2), { mode: 0o600 });
  await fs.rename(temporaryFile, localStateFile);
}

async function readState(tenantKey = DEFAULT_TENANT_KEY) {
  if (pool) {
    const result = await pool.query('SELECT state FROM nursing_platform_state WHERE tenant_key = $1', [tenantKey]);
    if (result.rows[0]?.state) return normalizeState(clone(result.rows[0].state));
    const state = defaultState();
    await pool.query(
      `INSERT INTO nursing_platform_state (tenant_key, state)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (tenant_key) DO NOTHING`,
      [tenantKey, JSON.stringify(state)]
    );
    return state;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Database-backed nursing platform state is required in production');
  }

  await loadLocalFile();
  if (!memoryStates.has(tenantKey)) memoryStates.set(tenantKey, defaultState());
  return clone(memoryStates.get(tenantKey));
}

async function mutateState(tenantKey = DEFAULT_TENANT_KEY, mutator) {
  if (pool) {
    return transaction(async (client) => {
      const current = await client.query(
        'SELECT state, version FROM nursing_platform_state WHERE tenant_key = $1 FOR UPDATE',
        [tenantKey]
      );
      const state = normalizeState(clone(current.rows[0]?.state || defaultState()));
      const result = await mutator(state);
      await client.query(
        `INSERT INTO nursing_platform_state (tenant_key, state, version, updated_at)
         VALUES ($1, $2::jsonb, 1, NOW())
         ON CONFLICT (tenant_key) DO UPDATE SET
           state = EXCLUDED.state,
           version = nursing_platform_state.version + 1,
           updated_at = NOW()`,
        [tenantKey, JSON.stringify(state)]
      );
      return clone(result);
    });
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Database-backed nursing platform state is required in production');
  }

  await loadLocalFile();
  const state = normalizeState(clone(memoryStates.get(tenantKey) || defaultState()));
  const result = await mutator(state);
  memoryStates.set(tenantKey, state);
  await writeLocalFile();
  return clone(result);
}

function tenantKeyForUser(user) {
  return user?.institutionId || DEFAULT_TENANT_KEY;
}

function resetForTests() {
  memoryStates.clear();
  localFileLoaded = true;
}

module.exports = {
  DEFAULT_TENANT_KEY,
  mutateState,
  readState,
  resetForTests,
  tenantKeyForUser,
};
