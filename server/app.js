const compression = require('compression');
const cookieParser = require('cookie-parser');
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { healthCheck } = require('./db');
const nursingRouter = require('./routes/nursing');
const { integrationReadiness, operationalMetrics, reportOperationalAlert } = require('./services/productionIntegrations');

function createApiApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(compression());
  app.use(express.json({
    limit: '1mb',
    verify: (req, _res, buffer) => {
      if (req.originalUrl?.includes('/webhooks/')) req.rawBody = Buffer.from(buffer);
    },
  }));
  app.use(cookieParser());
  app.use('/api/nursing/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false }));
  app.use('/api/nursing/access-requests', rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false }));
  app.use('/api/nursing/medications', rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false }));
  app.use('/api/nursing', nursingRouter);
  app.get('/api/health', async (_req, res) => {
    try {
      const database = await healthCheck();
      const readiness = await integrationReadiness();
      const productionReady = process.env.NODE_ENV !== 'production' || (database.healthy && readiness.ready);
      res.status(productionReady ? 200 : 503).json({
        status: productionReady ? 'healthy' : 'degraded',
        service: 'doctarx-nursing-education',
        gitCommit: process.env.GIT_COMMIT || process.env.DEPLOYED_SHA || 'unknown',
        buildId: process.env.BUILD_ID || 'unknown',
        database,
        readiness,
      });
    } catch (error) {
      await reportOperationalAlert(error, { operation: 'health_check' });
      res.status(503).json({ status: 'degraded', service: 'doctarx-nursing-education', error: 'Readiness check failed' });
    }
  });
  app.get('/api/metrics', async (req, res) => {
    const configuredToken = process.env.NURSING_METRICS_TOKEN;
    const suppliedToken = String(req.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (process.env.NODE_ENV === 'production' && (!configuredToken || suppliedToken !== configuredToken)) {
      return res.status(configuredToken ? 401 : 503).json({ success: false, error: 'Metrics access is unavailable' });
    }
    try {
      return res.json({ success: true, metrics: await operationalMetrics() });
    } catch (error) {
      await reportOperationalAlert(error, { operation: 'metrics' });
      return res.status(503).json({ success: false, error: 'Metrics are temporarily unavailable' });
    }
  });
  return app;
}

module.exports = { createApiApp };
