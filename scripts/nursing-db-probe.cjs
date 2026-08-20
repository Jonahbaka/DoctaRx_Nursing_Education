'use strict';

const { close } = require('../server/db');
const { readState } = require('../server/services/nursingPlatformStore');

async function main() {
  const [tenantKey, collection, entityId] = process.argv.slice(2);
  if (!tenantKey || !collection || !entityId) throw new Error('tenant, collection, and entity ID are required');
  const state = await readState(tenantKey);
  const found = Array.isArray(state[collection]) && state[collection].some((item) => item.id === entityId);
  process.stdout.write(JSON.stringify({ found, tenantKey, collection }));
  if (!found) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(close);
