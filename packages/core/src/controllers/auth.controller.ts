import { Context } from 'hono';
import { DyrectedContext } from '../app.js';
import { CollectionConfig } from '../types/index.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { signCollectionToken } from '../auth/token.js';

/**
 * Handles auth endpoints for collections with `auth: true`.
 *
 * Routes registered (relative to `/api/collections/:slug`):
 *   POST   /login
 *   POST   /logout       (stateless — client drops the token)
 *   GET    /me
 *   POST   /refresh-token
 *   POST   /forgot-password
 *   POST   /reset-password
 */
export class AuthController {
  constructor(private collection: CollectionConfig) {}

  // ---------------------------------------------------------------------------
  // POST /login
  // ---------------------------------------------------------------------------
  async login(c: Context<DyrectedContext>) {
    const db = c.get('config').db;
    if (!db) return c.json({ message: 'Database not configured' }, 500);

    const body = await c.req.json().catch(() => null);
    if (!body?.email || !body?.password) {
      return c.json({ error: true, message: 'email and password are required.' }, 400);
    }

    const result = await db.find({
      collection: this.collection.slug,
      where: { email: body.email },
      limit: 1,
    });

    const user = result.docs[0];

    if (!user) {
      return c.json({ error: true, message: 'Invalid email or password.' }, 401);
    }

    const valid = await verifyPassword(body.password, user.password);
    if (!valid) {
      return c.json({ error: true, message: 'Invalid email or password.' }, 401);
    }

    const token = await signCollectionToken({
      sub: user.id,
      email: user.email,
      collection: this.collection.slug,
    });

    // Strip password before returning
    const { password: _, ...safeUser } = user;
    return c.json({ token, user: safeUser });
  }

  // ---------------------------------------------------------------------------
  // POST /logout
  // Auth collections use stateless JWTs — logout is handled client-side.
  // This endpoint exists so clients have a consistent API surface.
  // ---------------------------------------------------------------------------
  async logout(c: Context<DyrectedContext>) {
    return c.json({ success: true, message: 'Logged out. Discard your token.' });
  }

  // ---------------------------------------------------------------------------
  // GET /me
  // ---------------------------------------------------------------------------
  async me(c: Context<DyrectedContext>) {
    const db = c.get('config').db;
    if (!db) return c.json({ message: 'Database not configured' }, 500);

    const requestUser = c.get('user') as any;
    if (!requestUser) {
      return c.json({ error: true, message: 'Authentication required.' }, 401);
    }

    const user = await db.findOne({ collection: this.collection.slug, id: requestUser.sub });
    if (!user) {
      return c.json({ error: true, message: 'User not found.' }, 404);
    }

    const { password: _, ...safeUser } = user;
    return c.json(safeUser);
  }

  // ---------------------------------------------------------------------------
  // POST /refresh-token
  // ---------------------------------------------------------------------------
  async refreshToken(c: Context<DyrectedContext>) {
    const requestUser = c.get('user') as any;
    if (!requestUser) {
      return c.json({ error: true, message: 'Authentication required.' }, 401);
    }

    const token = await signCollectionToken({
      sub: requestUser.sub,
      email: requestUser.email,
      collection: this.collection.slug,
    });

    return c.json({ token });
  }

  // ---------------------------------------------------------------------------
  // POST /forgot-password
  // Requires config.email to be set. Silently succeeds if email not found
  // to prevent email enumeration.
  // ---------------------------------------------------------------------------
  async forgotPassword(c: Context<DyrectedContext>) {
    const config = c.get('config');
    const db = config.db;
    if (!db) return c.json({ message: 'Database not configured' }, 500);

    const body = await c.req.json().catch(() => null);
    if (!body?.email) {
      return c.json({ error: true, message: 'email is required.' }, 400);
    }

    const result = await db.find({
      collection: this.collection.slug,
      where: { email: body.email },
      limit: 1,
    });

    const user = result.docs[0];

    if (user && config.email) {
      // Issue a short-lived reset token (1-hour)
      const resetToken = await signCollectionToken(
        { sub: user.id, email: user.email, collection: this.collection.slug },
        '1h',
      );

      try {
        await fetch('https://api.seamailer.com/v1/transactional/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.email.apiKey}`,
          },
          body: JSON.stringify({
            from: { email: config.email.from, name: 'Dyrected' },
            to: [{ email: user.email }],
            subject: 'Reset your password',
            html: `<p>Use the token below to reset your password. It expires in 1 hour.</p>
                   <pre>${resetToken}</pre>`,
          }),
        });
      } catch (err) {
        console.error('[dyrected/core] Failed to send password reset email:', err);
      }
    }

    return c.json({
      success: true,
      message: 'If an account with that email exists, a reset link has been sent.',
    });
  }

  // ---------------------------------------------------------------------------
  // POST /reset-password
  // Expects { token: string, password: string } in body.
  // The token is the reset JWT issued by /forgot-password.
  // ---------------------------------------------------------------------------
  async resetPassword(c: Context<DyrectedContext>) {
    const db = c.get('config').db;
    if (!db) return c.json({ message: 'Database not configured' }, 500);

    const body = await c.req.json().catch(() => null);
    if (!body?.token || !body?.password) {
      return c.json({ error: true, message: 'token and password are required.' }, 400);
    }

    // Verify the reset token
    let payload: any;
    try {
      const { verifyCollectionToken } = await import('../auth/token.js');
      payload = await verifyCollectionToken(body.token);
    } catch {
      return c.json({ error: true, message: 'Reset token is invalid or has expired.' }, 400);
    }

    if (payload.collection !== this.collection.slug) {
      return c.json({ error: true, message: 'Reset token is invalid or has expired.' }, 400);
    }

    const hashedPassword = await hashPassword(body.password);
    await db.update({
      collection: this.collection.slug,
      id: payload.sub,
      data: { password: hashedPassword },
    });

    return c.json({ success: true, message: 'Password has been reset. You can now log in.' });
  }
}
