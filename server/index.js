require('dotenv').config();

const next = require('next');
const { createApiApp } = require('./app');

const dev = process.env.NODE_ENV !== 'production';
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';

function validateProductionConfig() {
  if (!dev) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required in production');
    if (!process.env.NURSING_SESSION_SECRET || process.env.NURSING_SESSION_SECRET.length < 32) {
      throw new Error('NURSING_SESSION_SECRET must contain at least 32 characters in production');
    }
  }
}

async function start() {
  validateProductionConfig();
  const nextApp = next({ dev });
  await nextApp.prepare();
  const app = createApiApp();
  const handle = nextApp.getRequestHandler();
  app.all('*', (req, res) => handle(req, res));
  app.listen(port, host, () => {
    console.log(`DoctaRx Nursing Education listening on http://${host}:${port}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
