const fs = require('node:fs');
const path = require('node:path');

const root = path.join(process.cwd(), '.next', 'static', 'chunks');
const forbidden = [
  'DemoPass!2026',
  'NURSING_TEST_ACCOUNT_PASSWORD',
  'NURSING_SESSION_SECRET',
  'local-only-nursing-session-secret-change-before-production',
];

function filesUnder(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(target) : [target];
  });
}

if (!fs.existsSync(root)) {
  throw new Error('Build output not found. Run npm run build first.');
}

const findings = [];
for (const file of filesUnder(root).filter((name) => name.endsWith('.js'))) {
  const source = fs.readFileSync(file, 'utf8');
  for (const value of forbidden) {
    if (source.includes(value)) findings.push(`${path.relative(process.cwd(), file)} contains ${value}`);
  }
}

if (findings.length) {
  console.error(findings.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Client bundle credential scan passed.');
}
