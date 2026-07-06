import type { Context, Next } from 'hono';
import type { DyrectedContext } from '../app.js';
import type { DyrectedConfig } from '../types/index.js';
import type { AuthenticatedUser } from '../types/request.js';
import { verifyCollectionToken, type CollectionTokenPayload } from '../auth/token.js';

function getBearerToken(c: Context<DyrectedContext>): string | undefined {
  const authHeader = c.req.header('Authorization');
  return authHeader?.replace(/^Bearer\s+/i, '') || undefined;
}

/**
 * Verify a bearer token and resolve the authenticated user.
 *
 * The JWT only carries identity claims (`sub`, `email`, `collection`), so on its
 * own it can't answer role/ownership questions in access functions. When a database
 * adapter is available we re-hydrate the full user document (minus `password`) — the
 * same record `GET /me` returns — and merge the token's identity claims on top. This
 * is what makes `user.roles`, `user.id`, and any other collection field usable inside
 * server-side access control and hooks.
 *
 * @returns the resolved user, or `null` when the token is valid but the user no longer
 *   exists (deleted). Throws only when the token itself is invalid or expired.
 */
async function resolveUser(
  token: string,
  config: DyrectedConfig | undefined,
): Promise<AuthenticatedUser | null> {
  const payload: CollectionTokenPayload = await verifyCollectionToken(token);

  // Purpose tokens (invite/reset) are not full user sessions — their `sub` may be an
  // invited email rather than a document id, so never try to hydrate them.
  if (payload.purpose) {
    return payload as AuthenticatedUser;
  }

  const db = config?.db;
  if (!db) {
    // No database configured — fall back to the token's identity claims.
    return payload as AuthenticatedUser;
  }

  let doc: Record<string, unknown> | null;
  try {
    doc = (await db.findOne({
      collection: payload.collection,
      id: payload.sub,
    })) as Record<string, unknown> | null;
  } catch (err) {
    // A transient database error must not be mistaken for a logged-out user. The token
    // is cryptographically valid, so degrade gracefully to its identity claims.
    console.error('[dyrected/core] Failed to hydrate user from token:', err);
    return payload as AuthenticatedUser;
  }

  // The token is valid but the underlying record is gone — treat as unauthenticated.
  if (!doc) {
    return null;
  }

  const { password: _password, ...safe } = doc;

  // Token identity claims win over the stored document so `sub`/`collection` always
  // reflect the session, while everything else (roles, ownership, custom fields) comes
  // from the live record.
  return {
    ...safe,
    sub: payload.sub,
    email: payload.email ?? (safe.email as string | undefined),
    collection: payload.collection,
  } as AuthenticatedUser;
}

/**
 * Middleware that requires a valid Bearer JWT.
 * On success: sets `c.get('user')` to the resolved user (full record when a db is configured).
 * On failure: returns 401.
 */
export function requireAuth(config?: DyrectedConfig) {
  return async (c: Context<DyrectedContext>, next: Next) => {
    // The global optionalAuth middleware has already resolved the user for this request,
    // so reuse it instead of re-hitting the database.
    if (c.get('user')) {
      return next();
    }

    const token = getBearerToken(c);
    if (!token) {
      return c.json({ error: true, message: 'Authentication required.' }, 401);
    }

    let user: AuthenticatedUser | null;
    try {
      user = await resolveUser(token, config ?? c.get('config'));
    } catch {
      return c.json({ error: true, message: 'Invalid or expired token.' }, 401);
    }

    if (!user) {
      return c.json({ error: true, message: 'Invalid or expired token.' }, 401);
    }

    c.set('user', user);
    await next();
  };
}

/**
 * Middleware that optionally resolves a Bearer JWT.
 * Does NOT block the request if the token is missing or invalid — it just won't set `user`.
 * Use this for routes that behave differently when authenticated.
 */
export function optionalAuth(config?: DyrectedConfig) {
  return async (c: Context<DyrectedContext>, next: Next) => {
    // The global optionalAuth middleware may have already resolved the user; don't re-fetch.
    if (c.get('user')) {
      return next();
    }

    const token = getBearerToken(c);

    if (token) {
      try {
        const user = await resolveUser(token, config ?? c.get('config'));
        if (user) {
          c.set('user', user);
        }
      } catch {
        // Invalid token — proceed without user
      }
    }

    await next();
  };
}
