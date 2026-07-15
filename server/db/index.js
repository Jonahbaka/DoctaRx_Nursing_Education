require('dotenv').config();

const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || null;
const pool = connectionString
  ? new Pool({
      connectionString,
      max: Number(process.env.DB_POOL_MAX || 10),
      connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 8000),
      idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' } : false,
    })
  : null;

async function query(text, params = []) {
  if (!pool) {
    throw new Error('DATABASE_URL is required for this operation');
  }
  return pool.query(text, params);
}

async function transaction(callback) {
  if (!pool) {
    throw new Error('DATABASE_URL is required for this operation');
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getClient() {
  if (!pool) {
    throw new Error('DATABASE_URL is required for this operation');
  }
  return pool.connect();
}

async function healthCheck() {
  if (!pool) return { healthy: false, configured: false };
  try {
    await pool.query('SELECT 1');
    return { healthy: true, configured: true };
  } catch (error) {
    return { healthy: false, configured: true, error: error.message };
  }
}

async function close() {
  if (pool) await pool.end();
}

module.exports = { pool, query, getClient, transaction, healthCheck, close };
