import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { requestId } from 'hono/request-id';
import { DyrectedConfig } from './types/index.js';
import { registerRoutes } from './router.js';

export interface DyrectedContext {
  Variables: {
    config: DyrectedConfig;
    siteId?: string;
  };
}

/**
 * Create the main Dyrected Hono application.
 */
export function createDyrectedApp(config: DyrectedConfig) {
  const app = new Hono<DyrectedContext>();

  // 1. Standard Middleware
  app.use('*', requestId());
  app.use('*', logger());
  app.use('*', cors());

  // 2. Site Resolution Middleware
  app.use('*', async (c, next) => {
    c.set('config', config);
    // If an upstream middleware (e.g. cloud app) hasn't already set the siteId,
    // fallback to 'default' for self-hosted/singleton mode.
    if (!c.get('siteId')) {
      c.set('siteId', 'default');
    }
    await next();
  });

  // 3. Health Check
  app.get('/health', (c) => c.json({ status: 'ok', version: '0.0.1' }));

  // 4. Dynamic Routing
  registerRoutes(app, config);

  return app;
}
