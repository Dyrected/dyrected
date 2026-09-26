import { SignJWT, jwtVerify, decodeJwt, type JWTPayload } from 'jose';
import type { CollectionConfig } from '../types/index.js';

export interface CollectionTokenPayload extends JWTPayload {
  sub: string;       // document id (or invited email for invite tokens)
  email: string;
  collection: string; // which auth collection this token is for
  sid?: string;
  purpose?: 'invite' | 'reset';
  providerId?: string;
  authSource?: 'local' | 'external';
  siteId?: string;
}

function getSecret(): Uint8Array {
  const secret = process.env.DYRECTED_JWT_SECRET;
  if (!secret) {
    throw new Error(
      '[dyrected/core] DYRECTED_JWT_SECRET is not set. ' +
      'Add it to your environment variables to enable auth collections.'
    );
  }
  return new TextEncoder().encode(secret);
}

const DEFAULT_EXPIRY = '7d';

export const DEFAULT_SESSION_EXPIRY = DEFAULT_EXPIRY;
export const DEFAULT_INVITE_EXPIRY = '48h';
export const DEFAULT_RESET_PASSWORD_EXPIRY = '2h';

/**
 * Resolve the session JWT lifetime for an auth collection.
 *
 * Reads `auth.tokenExpiration` when the collection configures auth as an
 * object, and falls back to `'7d'` for `auth: true` (or any missing/empty
 * value) so existing behavior is unchanged.
 */
export function resolveSessionTokenExpiry(collection: CollectionConfig): string {
  const auth = collection.auth;
  if (auth && typeof auth === 'object' && typeof auth.tokenExpiration === 'string' && auth.tokenExpiration.length > 0) {
    return auth.tokenExpiration;
  }
  return DEFAULT_SESSION_EXPIRY;
}

/**
 * Resolve the invite JWT lifetime for an auth collection.
 *
 * Reads `auth.inviteExpiration` when configured, and falls back to `'48h'`.
 */
export function resolveInviteTokenExpiry(collection: CollectionConfig): string {
  const auth = collection.auth;
  if (auth && typeof auth === 'object' && typeof auth.inviteExpiration === 'string' && auth.inviteExpiration.length > 0) {
    return auth.inviteExpiration;
  }
  return DEFAULT_INVITE_EXPIRY;
}

/**
 * Resolve the reset password JWT lifetime for an auth collection.
 *
 * Reads `auth.resetPasswordExpiration` when configured, and falls back to `'2h'`.
 */
export function resolveResetPasswordTokenExpiry(collection: CollectionConfig): string {
  const auth = collection.auth;
  if (auth && typeof auth === 'object' && typeof auth.resetPasswordExpiration === 'string' && auth.resetPasswordExpiration.length > 0) {
    return auth.resetPasswordExpiration;
  }
  return DEFAULT_RESET_PASSWORD_EXPIRY;
}

/**
 * Issue a signed JWT for a user document in an auth collection.
 */
export async function signCollectionToken(
  payload: Omit<CollectionTokenPayload, 'iat' | 'exp'>,
  expiresIn: string = DEFAULT_EXPIRY,
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecret());
}

/**
 * Verify and decode a collection JWT. Throws if invalid or expired.
 */
export async function verifyCollectionToken(token: string): Promise<CollectionTokenPayload> {
  const { payload } = await jwtVerify(token, getSecret());
  return payload as CollectionTokenPayload;
}

/**
 * Decode a token without verification (read-only, for middleware that wants to be non-blocking).
 */
export function decodeCollectionToken(token: string): CollectionTokenPayload | null {
  try {
    return decodeJwt(token) as CollectionTokenPayload;
  } catch {
    return null;
  }
}
