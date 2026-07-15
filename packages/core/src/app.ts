import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { requestId } from 'hono/request-id';
import type { Level, Logger } from 'pino';
import type { DyrectedConfig } from './types/index.js';
import type { CollectionTokenPayload } from './auth/token.js';
import { registerRoutes } from './router.js';
import { normalizeConfig } from './utils/config.js';
import { optionalAuth } from './middleware/auth.js';
import { createRateLimitMiddleware } from './middleware/rate-limit.js';
import {
  attachRequestMetrics,
  bindObservabilityRuntime,
  buildRequestLogger,
  captureRequestBody,
  createObservabilityRuntime,
  createRequestSpan,
  endRequestSpan,
  getRequestLogger,
  redactHeaders,
  renderPrometheusMetrics,
  shouldSampleRequest,
  type DyrectedObservabilityRuntime,
  type RequestBodyCapture,
  type RequestTraceContext,
} from './observability.js';

export interface DyrectedContext {
  Variables: {
    config: DyrectedConfig;
    logger?: Logger;
    observability?: DyrectedObservabilityRuntime;
    siteId?: string;
    workspaceId?: string;
    requestBodyCapture?: RequestBodyCapture;
    requestTrace?: RequestTraceContext;
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
    clientIp?: string;
    authTokenPayload?: CollectionTokenPayload;
  };
}

/**
 * Create the main Dyrected Hono application.
 */
export async function createDyrectedApp(rawConfig: DyrectedConfig) {
  const config = normalizeConfig(rawConfig);
  const observability = createObservabilityRuntime(config);
  bindObservabilityRuntime(config, observability);
  config.logger = observability.logger;
  const app = new Hono<DyrectedContext>();

  // 0. Sync Database Schema if adapter supports it
  if (config.db?.sync) {
    await config.db.sync(config.collections, config.globals);
  }

  // 1. Standard Middleware
  app.use('*', requestId());
  app.use('*', async (c, next) => {
    c.set('config', config);
    c.set('observability', observability);
    // If an upstream middleware (e.g. cloud app) hasn't already set the siteId,
    // fallback to 'default' for self-hosted/singleton mode.
    if (!c.get('siteId')) {
      c.set('siteId', 'default');
    }
    c.set('logger', buildRequestLogger(observability, c.var, c.get('requestId')));
    await next();
  });
  app.use('*', async (c, next) => {
    const start = Date.now();
    const method = c.req.method;
    const path = c.req.path;
    const requestId = c.get('requestId');
    const observabilityConfig = observability.config;
    const traceSampled = shouldSampleRequest(
      requestId,
      200,
      observabilityConfig.sampling,
      'trace',
    );
    const requestTrace = traceSampled
      ? createRequestSpan(observability, `${method} ${path}`, {
          'http.method': method,
          'http.route': path,
          requestId,
          siteId: c.get('siteId'),
          workspaceId: c.get('workspaceId'),
        })
      : undefined;

    if (requestTrace) {
      c.set('requestTrace', requestTrace);
      c.set('logger', buildRequestLogger(observability, c.var, requestId));
    }

    let bodyCapturePromise: Promise<RequestBodyCapture | undefined> | undefined;
    if (observabilityConfig.requestLogging.logBodies) {
      const bodySampled = shouldSampleRequest(
        requestId,
        200,
        observabilityConfig.sampling,
        'body',
      );
      if (bodySampled) {
        bodyCapturePromise = captureRequestBody(c.req.raw, observabilityConfig);
      }
    }

    let caughtError: unknown;
    try {
      await next();
    } catch (error) {
      caughtError = error;
      throw error;
    } finally {
      const durationMs = Date.now() - start;
      const statusCode = c.res.status || (caughtError ? 500 : 200);
      const sampled = shouldSampleRequest(
        requestId,
        statusCode,
        observabilityConfig.sampling,
        'log',
      );
      const requestLogger = getRequestLogger(c, 'api');
      const requestHeaders = redactHeaders(
        Object.fromEntries(c.req.raw.headers.entries()),
        observabilityConfig,
      );
      const requestBodyCapture = bodyCapturePromise
        ? await bodyCapturePromise
        : undefined;
      if (requestBodyCapture) {
        c.set('requestBodyCapture', requestBodyCapture);
      }

      attachRequestMetrics(observability, {
        method,
        route: path,
        statusCode,
        durationMs,
      });

      if (observabilityConfig.requestLogging.enabled && sampled) {
        const level: Level =
          statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
        requestLogger[level]({
          msg: 'HTTP request completed',
          method,
          path,
          statusCode,
          durationMs,
          requestId,
          siteId: c.get('siteId'),
          workspaceId: c.get('workspaceId'),
          contentType: c.req.header('content-type') ?? undefined,
          contentLength: c.req.header('content-length')
            ? Number(c.req.header('content-length'))
            : undefined,
          sampled,
          headers:
            Object.keys(requestHeaders).length > 0 ? requestHeaders : undefined,
          body: requestBodyCapture?.body,
          bodyCapture:
            requestBodyCapture && requestBodyCapture.body === undefined
              ? {
                  attempted: requestBodyCapture.attempted,
                  contentType: requestBodyCapture.contentType,
                  contentLength: requestBodyCapture.contentLength,
                  truncated: requestBodyCapture.truncated,
                  parseFailed: requestBodyCapture.parseFailed,
                }
              : undefined,
        });
      }

      endRequestSpan(requestTrace, statusCode, caughtError);
    }
  });
  app.use('*', createRateLimitMiddleware(config));
  // Resolve bearer token if present so the full user (incl. roles and other collection
  // fields) is available in access functions, CRUD hooks, and audit logging.
  app.use('*', optionalAuth(config));
  app.use('*', cors(config.cors ? { origin: config.cors.origins } : {}));

  // 3. Health Check & Debug
  app.get('/health', (c) => c.json({ status: 'ok', version: '0.0.1' }));
  if (
    observability.config.metrics.enabled &&
    observability.config.metrics.exporter === 'prometheus' &&
    observability.prometheusExporter
  ) {
    app.get(observability.config.metrics.path, async (c) => {
      const metrics = await renderPrometheusMetrics(
        observability.prometheusExporter!,
      );
      return new Response(metrics.body, {
        status: metrics.statusCode,
        headers: metrics.headers,
      });
    });
  }
  app.get('/routes', (c) => {
    const routes = app.routes.map(r => ({ method: r.method, path: r.path }));
    return c.json({ routes });
  });

  // 4. Global Error Handler
  app.onError((err, c) => {
    const logger = getRequestLogger(c, 'core');
    logger.error({
      err,
      msg: 'Uncaught error',
      path: c.req.path,
      method: c.req.method,
    });
    observability.recordUncaughtError({
      path: c.req.path,
      method: c.req.method,
    });
    return c.json({ 
      message: err.message || 'Internal Server Error',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
    }, 500);
  });

  // 5. Dynamic Routing
  registerRoutes(app, config);

  return app;
}
