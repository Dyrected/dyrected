import type { Context } from 'hono';
import type { DyrectedContext } from '../app.js';
import { SignJWT, jwtVerify } from 'jose';
import { TextEncoder } from 'node:util';

export class PreviewController {
  private getSecret(): Uint8Array {
    const secret = process.env.DYRECTED_JWT_SECRET || 'dyrected-preview-secret-change-me';
    return new TextEncoder().encode(secret);
  }

  /**
   * POST /api/preview-token
   * Generates a short-lived token for previewing unsaved data.
   */
  async createToken(c: Context<DyrectedContext>) {
    const body = await c.req.json().catch(() => null);
    if (!body?.collectionSlug || !body?.data) {
      return c.json({ error: true, message: 'collectionSlug and data are required.' }, 400);
    }

    // Sign a token valid for 15 minutes
    const token = await new SignJWT({
      collectionSlug: body.collectionSlug,
      documentId: body.documentId,
      data: body.data,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(this.getSecret());

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    return c.json({ token, expiresAt });
  }

  /**
   * GET /api/preview-data?token=<jwt>
   * Returns the data stored in the preview token.
   */
  async getData(c: Context<DyrectedContext>) {
    const token = c.req.query('token');
    if (!token) {
      return c.json({ error: true, message: 'token query parameter is required.' }, 400);
    }

    try {
      const { payload } = await jwtVerify(token, this.getSecret());
      return c.json(payload);
    } catch (err) {
      return c.json({ error: true, message: 'Invalid or expired preview token.' }, 401);
    }
  }
}
