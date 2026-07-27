import { SignJWT, jwtVerify, decodeJwt, type JWTPayload } from 'jose';

export interface CollectionTokenPayload extends JWTPayload {
  sub: string;       // document id (or invited email for invite tokens)
  email: string;
  collection: string; // which auth collection this token is for
  sid?: string;
  purpose?: 'invite' | 'reset';
  providerId?: string;
  authSource?: 'local' | 'external';
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
