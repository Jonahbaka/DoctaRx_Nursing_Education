const compression = require('compression');
const cookieParser = require('cookie-parser');
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { healthCheck } = require('./db');
const nursingRouter = require('./routes/nursing');

function createApiApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use('/api/nursing/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false }));
  app.use('/api/nursing/access-requests', rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false }));
  app.use('/api/nursing', nursingRouter);
  app.get('/api/health', async (_req, res) => {
    const database = await healthCheck();
    const productionReady = process.env.NODE_ENV !== 'production' || database.healthy;
    res.status(productionReady ? 200 : 503).json({
      status: productionReady ? 'healthy' : 'degraded',
      service: 'doctarx-nursing-education',
      database,
    });
  });
  return app;
}

module.exports = { createApiApp };
