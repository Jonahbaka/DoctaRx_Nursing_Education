const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { pool, transaction } = require('../db');
const { getNursingSeedData } = require('../../lib/nursingEducationData');

const DEFAULT_TENANT_KEY = 'inst-uniabuja';
const localStateFile = process.env.NURSING_LOCAL_STATE_FILE || path.join(process.cwd(), '.data', 'nursing-platform-state.json');
const memoryStates = new Map();
let localFileLoaded = false;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function defaultState(tenantKey = DEFAULT_TENANT_KEY) {
  const seed = clone(getNursingSeedData());
  const tenantSeed = tenantKey === DEFAULT_TENANT_KEY
    ? seed
    : Object.fromEntries(Object.entries(seed).map(([key, value]) => {
        if (Array.isArray(value)) return [key, []];
        if (key === 'institution') return [key, { id: tenantKey, externalKey: tenantKey, name: 'Institution workspace', status: 'active' }];
        return [key, value];
      }));
  return {
    ...tenantSeed,
    accessRequests: [],
    waitingRooms: tenantKey === DEFAULT_TENANT_KEY ? [
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
    ] : [],
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

function normalizeState(value, tenantKey = DEFAULT_TENANT_KEY) {
  const baseline = defaultState(tenantKey);
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
      memoryStates.set(tenantKey, normalizeState(state, tenantKey));
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

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function entityKey(entity, index) {
  const explicit = entity?.id || entity?.userId || entity?.externalKey;
  if (explicit) return String(explicit);
  return `anonymous-${crypto.createHash('sha256').update(canonicalJson(entity)).digest('hex').slice(0, 24)}-${index}`;
}

function stateToParts(state) {
  const collections = new Map();
  const metadata = new Map();
  for (const [key, value] of Object.entries(state)) {
    if (Array.isArray(value)) {
      const entities = new Map();
      value.forEach((item, index) => {
        let keyForEntity = entityKey(item, index);
        while (entities.has(keyForEntity)) keyForEntity = `${keyForEntity}-${index}`;
        entities.set(keyForEntity, { payload: clone(item), position: index });
      });
      collections.set(key, entities);
    } else {
      metadata.set(key, clone(value));
    }
  }
  return { collections, metadata };
}

async function initializeDatabaseTenant(tenantKey) {
  await transaction(async (client) => {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`nursing-platform:${tenantKey}`]);
    const exists = await client.query('SELECT 1 FROM nursing_platform_collections WHERE tenant_key=$1 LIMIT 1', [tenantKey]);
    if (exists.rows.length) return;
    const parts = stateToParts(defaultState(tenantKey));
    for (const [collectionKey, entities] of parts.collections) {
      await client.query(
        'INSERT INTO nursing_platform_collections (tenant_key,collection_key) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [tenantKey, collectionKey]
      );
      for (const [key, entity] of entities) {
        await client.query(
          `INSERT INTO nursing_platform_entities (tenant_key,collection_key,entity_key,payload,position)
           VALUES ($1,$2,$3,$4::jsonb,$5) ON CONFLICT DO NOTHING`,
          [tenantKey, collectionKey, key, JSON.stringify(entity.payload), entity.position]
        );
      }
    }
    for (const [key, value] of parts.metadata) {
      await client.query(
        `INSERT INTO nursing_platform_metadata (tenant_key,metadata_key,value)
         VALUES ($1,$2,$3::jsonb) ON CONFLICT DO NOTHING`, [tenantKey, key, JSON.stringify(value)]
      );
    }
  });
}

async function loadDatabaseSnapshot(client, tenantKey) {
  const [collectionRows, entityRows, metadataRows] = await Promise.all([
    client.query('SELECT collection_key FROM nursing_platform_collections WHERE tenant_key=$1', [tenantKey]),
    client.query(
      `SELECT collection_key,entity_key,payload,position,version
         FROM nursing_platform_entities WHERE tenant_key=$1
        ORDER BY collection_key,position,created_at DESC,entity_key`, [tenantKey]
    ),
    client.query('SELECT metadata_key,value,version FROM nursing_platform_metadata WHERE tenant_key=$1', [tenantKey]),
  ]);
  const state = {};
  const collections = new Map();
  for (const row of collectionRows.rows) {
    state[row.collection_key] = [];
    collections.set(row.collection_key, new Map());
  }
  for (const row of entityRows.rows) {
    if (!state[row.collection_key]) state[row.collection_key] = [];
    state[row.collection_key].push(clone(row.payload));
    if (!collections.has(row.collection_key)) collections.set(row.collection_key, new Map());
    collections.get(row.collection_key).set(row.entity_key, {
      payload: clone(row.payload), position: row.position, version: Number(row.version),
    });
  }
  const metadata = new Map();
  for (const row of metadataRows.rows) {
    state[row.metadata_key] = clone(row.value);
    metadata.set(row.metadata_key, { value: clone(row.value), version: Number(row.version) });
  }
  return { state: normalizeState(state, tenantKey), collections, metadata };
}

function conflictError() {
  const error = new Error('Concurrent nursing platform update conflicted; retrying safely.');
  error.code = 'NURSING_WRITE_CONFLICT';
  return error;
}

async function persistDatabaseDiff(client, tenantKey, before, nextState) {
  const after = stateToParts(nextState);
  const changedCollections = new Set();
  let changedEntities = 0;
  for (const [collectionKey, nextEntities] of after.collections) {
    await client.query(
      'INSERT INTO nursing_platform_collections (tenant_key,collection_key) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [tenantKey, collectionKey]
    );
    const priorEntities = before.collections.get(collectionKey) || new Map();
    for (const [key, prior] of priorEntities) {
      if (nextEntities.has(key)) continue;
      const deleted = await client.query(
        `DELETE FROM nursing_platform_entities
          WHERE tenant_key=$1 AND collection_key=$2 AND entity_key=$3 AND version=$4 RETURNING entity_key`,
        [tenantKey, collectionKey, key, prior.version]
      );
      if (!deleted.rowCount) throw conflictError();
      changedCollections.add(collectionKey); changedEntities += 1;
    }
    for (const [key, next] of nextEntities) {
      const prior = priorEntities.get(key);
      if (!prior) {
        const inserted = await client.query(
          `INSERT INTO nursing_platform_entities (tenant_key,collection_key,entity_key,payload,position)
           VALUES ($1,$2,$3,$4::jsonb,$5) ON CONFLICT DO NOTHING RETURNING entity_key`,
          [tenantKey, collectionKey, key, JSON.stringify(next.payload), next.position]
        );
        if (!inserted.rowCount) throw conflictError();
        changedCollections.add(collectionKey); changedEntities += 1;
      } else if (canonicalJson(prior.payload) !== canonicalJson(next.payload)) {
        const updated = await client.query(
          `UPDATE nursing_platform_entities
              SET payload=$5::jsonb,position=$6,version=version+1,updated_at=NOW()
            WHERE tenant_key=$1 AND collection_key=$2 AND entity_key=$3 AND version=$4
            RETURNING entity_key`,
          [tenantKey, collectionKey, key, prior.version, JSON.stringify(next.payload), next.position]
        );
        if (!updated.rowCount) throw conflictError();
        changedCollections.add(collectionKey); changedEntities += 1;
      }
    }
  }
  for (const [key, value] of after.metadata) {
    const prior = before.metadata.get(key);
    if (!prior) {
      const inserted = await client.query(
        `INSERT INTO nursing_platform_metadata (tenant_key,metadata_key,value)
         VALUES ($1,$2,$3::jsonb) ON CONFLICT DO NOTHING RETURNING metadata_key`, [tenantKey, key, JSON.stringify(value)]
      );
      if (!inserted.rowCount) throw conflictError();
      changedCollections.add(`metadata:${key}`); changedEntities += 1;
    } else if (canonicalJson(prior.value) !== canonicalJson(value)) {
      const updated = await client.query(
        `UPDATE nursing_platform_metadata SET value=$4::jsonb,version=version+1,updated_at=NOW()
          WHERE tenant_key=$1 AND metadata_key=$2 AND version=$3 RETURNING metadata_key`,
        [tenantKey, key, prior.version, JSON.stringify(value)]
      );
      if (!updated.rowCount) throw conflictError();
      changedCollections.add(`metadata:${key}`); changedEntities += 1;
    }
  }
  return { changedCollections: changedCollections.size, changedEntities };
}

async function readState(tenantKey = DEFAULT_TENANT_KEY) {
  if (pool) {
    await initializeDatabaseTenant(tenantKey);
    return (await loadDatabaseSnapshot(pool, tenantKey)).state;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Database-backed nursing platform state is required in production');
  }

  await loadLocalFile();
  if (!memoryStates.has(tenantKey)) memoryStates.set(tenantKey, defaultState(tenantKey));
  return clone(memoryStates.get(tenantKey));
}

async function mutateState(tenantKey = DEFAULT_TENANT_KEY, mutator) {
  if (pool) {
    await initializeDatabaseTenant(tenantKey);
    const startedAt = Date.now();
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        return await transaction(async (client) => {
          const before = await loadDatabaseSnapshot(client, tenantKey);
          const state = clone(before.state);
          const result = await mutator(state);
          const changes = await persistDatabaseDiff(client, tenantKey, before, state);
          await client.query(
            `INSERT INTO nursing_store_operation_metrics
               (tenant_key,changed_collections,changed_entities,conflict_retries,duration_ms)
             VALUES ($1,$2,$3,$4,$5)`,
            [tenantKey, changes.changedCollections, changes.changedEntities, attempt, Date.now() - startedAt]
          );
          return clone(result);
        });
      } catch (error) {
        if (error.code !== 'NURSING_WRITE_CONFLICT' || attempt === 3) throw error;
      }
    }
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Database-backed nursing platform state is required in production');
  }

  await loadLocalFile();
  const state = normalizeState(clone(memoryStates.get(tenantKey) || defaultState(tenantKey)), tenantKey);
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
  stateToParts,
  entityKey,
};
