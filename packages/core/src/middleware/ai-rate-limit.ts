import type { Context, Next } from 'hono';
import type { DyrectedContext } from '../app.js';
import type { DyrectedConfig } from '../types/index.js';
import type { AIRateLimitStore, AIRateLimitResult } from '../types/ai.js';
import { DyrectedAIError } from '../types/ai-errors.js';

interface RateLimitRecord {
  timestamps: number[];
}

export class InMemoryRateLimitStore implements AIRateLimitStore {
  private windows = new Map<string, RateLimitRecord>();

  constructor() {
    if (typeof setInterval !== 'undefined') {
      const interval = setInterval(() => {
        const now = Date.now();
        const windowMs = 60 * 1000;
        for (const [key, record] of this.windows.entries()) {
          record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);
          if (record.timestamps.length === 0) this.windows.delete(key);
        }
      }, 5 * 60 * 1000);
      if (typeof (interval as any)?.unref === 'function') {
        (interval as any).unref();
      }
    }
  }

  async consume(key: string, limit: number, windowMs: number): Promise<AIRateLimitResult> {
    const now = Date.now();
    let record = this.windows.get(key);
    if (!record) {
      record = { timestamps: [] };
      this.windows.set(key, record);
    }
    record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

    const resetTimeSec = Math.ceil((now + windowMs) / 1000);

    if (record.timestamps.length >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTimeSec,
        retryAfter: Math.ceil((record.timestamps[0] + windowMs - now) / 1000),
      };
    }

    record.timestamps.push(now);
    return {
      allowed: true,
      remaining: Math.max(0, limit - record.timestamps.length),
      resetTimeSec,
    };
  }

  clear(): void {
    this.windows.clear();
  }
}

const defaultInMemoryStore = new InMemoryRateLimitStore();

export function aiRateLimit(config?: DyrectedConfig) {
  return async (c: Context<DyrectedContext>, next: Next) => {
    const aiConfig = (config ?? c.get('config'))?.ai;
    if (aiConfig?.enabled === false) {
      return next();
    }

    const store: AIRateLimitStore = aiConfig?.rateLimit?.store ?? defaultInMemoryStore;
    const userLimit = aiConfig?.rateLimit?.userMax ?? 30; // requests per minute
    const projectLimit = aiConfig?.rateLimit?.projectMax ?? 60; // requests per minute
    const windowMs = 60 * 1000;

    const user = c.get('user') as any;
    const tokenPayload = c.get('authTokenPayload') as any;
    const userId =
      user?.id ||
      user?.sub ||
      user?._id ||
      tokenPayload?.sub ||
      tokenPayload?.id ||
      c.get('clientIp') ||
      'anonymous';

    const projectId = c.req.header('X-Site-Id') || c.get('siteId') || 'default';

    // 1. Check user rate limit
    const userResult = await store.consume(`user:${userId}`, userLimit, windowMs);
    c.header('X-RateLimit-Limit', String(userLimit));
    c.header('X-RateLimit-Remaining', String(userResult.remaining));
    c.header('X-RateLimit-Reset', String(userResult.resetTimeSec));

    if (!userResult.allowed) {
      throw new DyrectedAIError(
        'AI_RATE_LIMITED',
        `Rate limit exceeded: maximum ${userLimit} requests per minute. Please wait before retrying.`,
        429,
        { retryAfter: userResult.retryAfter }
      );
    }

    // 2. Check project rate limit
    const projResult = await store.consume(`project:${projectId}`, projectLimit, windowMs);
    if (!projResult.allowed) {
      throw new DyrectedAIError(
        'AI_RATE_LIMITED',
        `Project burst limit reached: maximum ${projectLimit} requests per minute across all users.`,
        429,
        { retryAfter: projResult.retryAfter }
      );
    }

    return next();
  };
}
