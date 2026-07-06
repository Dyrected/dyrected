import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { requestId } from 'hono/request-id';
import type { DyrectedConfig } from './types/index.js';
import { registerRoutes } from './router.js';
import { normalizeConfig } from './utils/config.js';
import { optionalAuth } from './middleware/auth.js';

export interface DyrectedContext {
  Variables: {
    config: DyrectedConfig;
    siteId?: string;
    workspaceId?: string;
    /**
     * The authenticated user set by requireAuth() or optionalAuth() middleware.
     * Hydrated from the full user record (minus password) when a db adapter is
     * configured, so collection fields like `roles` are available; falls back to
     * the token's identity claims otherwise.
     */
    user?: {
      sub: string;
      email?: string;
      collection: string;
      [key: string]: any;
    };
  };
}

/**
 * Create the main Dyrected Hono application.
 */
export async function createDyrectedApp(rawConfig: DyrectedConfig) {
  const config = normalizeConfig(rawConfig);
  const app = new Hono<DyrectedContext>();

  // 0. Sync Database Schema if adapter supports it
  if (config.db?.sync) {
    await config.db.sync(config.collections, config.globals);
  }

  // 1. Standard Middleware
  app.use('*', requestId());
  // Resolve bearer token if present so the full user (incl. roles and other collection
  // fields) is available in access functions, CRUD hooks, and audit logging.
  app.use('*', optionalAuth(config));
  app.use('*', async (c, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    console.log(`[dyrected/api] ${c.req.method} ${c.req.path} ${c.res.status} - ${ms}ms`);
  });
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

  // 3. Health Check & Debug
  app.get('/health', (c) => c.json({ status: 'ok', version: '0.0.1' }));
  app.get('/routes', (c) => {
    const routes = app.routes.map(r => ({ method: r.method, path: r.path }));
    return c.json({ routes });
  });

  // 4. Global Error Handler
  app.onError((err, c) => {
    console.error(`[dyrected/core] Uncaught Error:`, err);
    return c.json({ 
      message: err.message || 'Internal Server Error',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
    }, 500);
  });

  // 5. Dynamic Routing
  registerRoutes(app, config);

  return app;
}
