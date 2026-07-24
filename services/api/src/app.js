import Fastify from 'fastify';
import { makeSubmitHandler } from './submit.js';

// Build the Fastify app. Dependencies (cfg, mailer, now) are injected so the
// app can be exercised in tests without SMTP or real config.
export function buildApp({ cfg, mailer, now, logger = true } = {}) {
  const app = Fastify({ logger, bodyLimit: 256 * 1024 });

  app.get('/api/health', async () => ({ ok: true }));
  app.post('/api/submit', makeSubmitHandler({ cfg, mailer, now }));

  return app;
}
