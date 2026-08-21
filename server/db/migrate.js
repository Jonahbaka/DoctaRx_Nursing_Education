require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { pool } = require('./index');

function checksum(sql) {
  return crypto.createHash('sha256').update(sql, 'utf8').digest('hex');
}

async function migrate() {
  if (!pool) throw new Error('DATABASE_URL is required for migrations');
  await pool.query(`CREATE TABLE IF NOT EXISTS nursing_migrations (
    filename TEXT PRIMARY KEY,
    checksum CHAR(64),
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query('ALTER TABLE nursing_migrations ADD COLUMN IF NOT EXISTS checksum CHAR(64)');
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter((name) => name.endsWith('.sql')).sort();
  let ran = 0;
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const digest = checksum(sql);
    const recorded = await pool.query('SELECT checksum FROM nursing_migrations WHERE filename=$1', [file]);
    if (recorded.rows[0]) {
      const previous = recorded.rows[0].checksum?.trim();
      if (previous && previous !== digest) throw new Error(`Migration checksum mismatch: ${file}`);
      if (!previous) await pool.query('UPDATE nursing_migrations SET checksum=$2 WHERE filename=$1', [file, digest]);
      process.stdout.write(`Skipped ${file} (already applied)\n`);
      continue;
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO nursing_migrations (filename,checksum) VALUES ($1,$2)', [file, digest]);
      await client.query('COMMIT');
      ran += 1;
      process.stdout.write(`Applied ${file}\n`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }
  return { ran, total: files.length };
}

if (require.main === module) {
  migrate()
    .then(() => pool?.end())
    .catch(async (error) => {
      console.error(error.message);
      await pool?.end();
      process.exitCode = 1;
    });
}

module.exports = migrate;
