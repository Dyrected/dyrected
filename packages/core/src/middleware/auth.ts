import { Context, Next } from 'hono';
import { DyrectedContext } from '../app.js';
import { verifyCollectionToken } from '../auth/token.js';

/**
 * Middleware that requires a valid Bearer JWT.
 * On success: sets `c.get('user')` to the decoded token payload.
 * On failure: returns 401.
 */
export function requireAuth() {
  return async (c: Context<DyrectedContext>, next: Next) => {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');

    if (!token) {
      return c.json({ error: true, message: 'Authentication required.' }, 401);
    }

    try {
      const user = await verifyCollectionToken(token);
      c.set('user', user);
      await next();
    } catch {
      return c.json({ error: true, message: 'Invalid or expired token.' }, 401);
    }
  };
}

/**
 * Middleware that optionally decodes a Bearer JWT.
 * Does NOT block the request if the token is missing or invalid — it just won't set `user`.
 * Use this for routes that behave differently when authenticated.
 */
export function optionalAuth() {
  return async (c: Context<DyrectedContext>, next: Next) => {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');

    if (token) {
      try {
        const user = await verifyCollectionToken(token);
        c.set('user', user);
      } catch {
        // Invalid token — proceed without user
      }
    }

    await next();
  };
}
