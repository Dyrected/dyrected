import type { Context, Next } from 'hono';
import type { DyrectedContext } from '../app.js';
import { resolveClientIp, toHookRequestContext } from '../network.js';
import type { DyrectedConfig, RateLimitConfig } from '../types/index.js';

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_MAX_REQUESTS = 500;
const DEFAULT_PATHS = ['/api'];

export function createRateLimitMiddleware(config: DyrectedConfig) {
  const settings = normalizeRateLimitConfig(config.rateLimit);
  const buckets = new Map<string, RateLimitBucket>();

  return async (c: Context<DyrectedContext>, next: Next) => {
    const req = toHookRequestContext(c);
    const ip = resolveClientIp(req, settings.trustProxy);
    c.set('clientIp', ip);

    if (!settings.enabled) {
      return next();
    }

    const path = c.req.path;
    if (!matchesLimitedPath(path, settings.paths)) {
      return next();
    }

    if (
      settings.skip &&
      (await settings.skip({
        ip,
        path,
        method: c.req.method,
        req,
      }))
    ) {
      return next();
    }

    const now = Date.now();
    const key = ip;
    const existing = buckets.get(key);
    const bucket =
      existing && existing.resetAt > now
        ? existing
        : { count: 0, resetAt: now + settings.window };

    bucket.count += 1;
    buckets.set(key, bucket);
    pruneExpiredBuckets(buckets, now);

    const remaining = Math.max(0, settings.max - bucket.count);
    const resetSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

    c.res.headers.set('X-RateLimit-Limit', String(settings.max));
    c.res.headers.set('X-RateLimit-Remaining', String(remaining));
    c.res.headers.set('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > settings.max) {
      c.res.headers.set('Retry-After', String(resetSeconds));
      return c.json(
        {
          error: true,
          message: 'Too many requests. Try again later.',
          retryAfterSeconds: resetSeconds,
        },
        429,
      );
    }

    await next();
  };
}

function normalizeRateLimitConfig(
  config?: RateLimitConfig,
): Required<Pick<RateLimitConfig, 'enabled' | 'window' | 'max' | 'paths'>> &
  Pick<RateLimitConfig, 'skip' | 'trustProxy'> {
  return {
    enabled: config?.enabled ?? true,
    window: config?.window ?? DEFAULT_WINDOW_MS,
    max: config?.max ?? DEFAULT_MAX_REQUESTS,
    paths: config?.paths?.length ? config.paths : DEFAULT_PATHS,
    skip: config?.skip,
    trustProxy: config?.trustProxy ?? false,
  };
}

function matchesLimitedPath(path: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

function pruneExpiredBuckets(
  buckets: Map<string, RateLimitBucket>,
  now: number,
): void {
  if (buckets.size < 1_000) return;

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}
