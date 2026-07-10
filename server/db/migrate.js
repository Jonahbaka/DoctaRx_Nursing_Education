require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const { query, pool } = require('./index');

async function migrate() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter((name) => name.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    await query(sql);
    process.stdout.write(`Applied ${file}\n`);
  }
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
