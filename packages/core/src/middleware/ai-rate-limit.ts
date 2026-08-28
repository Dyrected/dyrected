import type { Context, Next } from 'hono';
import type { DyrectedContext } from '../app.js';
import type { DyrectedConfig } from '../types/index.js';
import { DyrectedAIError } from '../types/ai-errors.js';

interface RateLimitRecord {
  timestamps: number[];
}

const userWindows = new Map<string, RateLimitRecord>();
const projectWindows = new Map<string, RateLimitRecord>();

// Cleanup stale records periodically (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    const windowMs = 60 * 1000;
    for (const [key, record] of userWindows.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);
      if (record.timestamps.length === 0) userWindows.delete(key);
    }
    for (const [key, record] of projectWindows.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);
      if (record.timestamps.length === 0) projectWindows.delete(key);
    }
  }, 5 * 60 * 1000);
}

export function aiRateLimit(config?: DyrectedConfig) {
  return async (c: Context<DyrectedContext>, next: Next) => {
    const aiConfig = (config ?? c.get('config'))?.ai;
    if (aiConfig?.enabled === false) {
      return next();
    }

    const userLimit = (aiConfig as any)?.rateLimit?.userMax ?? 30; // requests per minute
    const projectLimit = (aiConfig as any)?.rateLimit?.projectMax ?? 60; // requests per minute
    const windowMs = 60 * 1000;
    const now = Date.now();

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
    let userRec = userWindows.get(userId);
    if (!userRec) {
      userRec = { timestamps: [] };
      userWindows.set(userId, userRec);
    }
    userRec.timestamps = userRec.timestamps.filter((ts) => now - ts < windowMs);

    // 2. Check project rate limit
    let projRec = projectWindows.get(projectId);
    if (!projRec) {
      projRec = { timestamps: [] };
      projectWindows.set(projectId, projRec);
    }
    projRec.timestamps = projRec.timestamps.filter((ts) => now - ts < windowMs);

    const remainingUser = Math.max(0, userLimit - userRec.timestamps.length);
    const resetTimeSec = Math.ceil((now + windowMs) / 1000);

    c.header('X-RateLimit-Limit', String(userLimit));
    c.header('X-RateLimit-Remaining', String(remainingUser));
    c.header('X-RateLimit-Reset', String(resetTimeSec));

    if (userRec.timestamps.length >= userLimit) {
      throw new DyrectedAIError(
        'AI_RATE_LIMITED',
        `Rate limit exceeded: maximum ${userLimit} requests per minute. Please wait before retrying.`,
        429,
        { retryAfter: Math.ceil((userRec.timestamps[0] + windowMs - now) / 1000) }
      );
    }

    if (projRec.timestamps.length >= projectLimit) {
      throw new DyrectedAIError(
        'AI_RATE_LIMITED',
        `Project burst limit reached: maximum ${projectLimit} requests per minute across all users.`,
        429,
        { retryAfter: Math.ceil((projRec.timestamps[0] + windowMs - now) / 1000) }
      );
    }

    userRec.timestamps.push(now);
    projRec.timestamps.push(now);

    return next();
  };
}
