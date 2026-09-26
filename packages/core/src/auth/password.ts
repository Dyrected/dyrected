import { promisify } from 'node:util';
import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';

const scryptAsync = promisify(scrypt);

const SALT_LEN = 16;
const KEY_LEN = 64;

/**
 * Hash a plain-text password using scrypt.
 * Returns a `salt:hash` string safe to store in the database.
 */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(SALT_LEN).toString('hex');
  const derivedKey = (await scryptAsync(plain, salt, KEY_LEN)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Check whether a stored password string represents a valid salt:hash format.
 */
export function hasUsablePassword(stored: unknown): boolean {
  if (typeof stored !== 'string' || !stored) return false;
  const parts = stored.split(':');
  return parts.length === 2 && Boolean(parts[0]) && Boolean(parts[1]);
}

/**
 * Verify a plain-text password against a stored `salt:hash` string.
 */
export async function verifyPassword(plain: string, stored: string | null | undefined): Promise<boolean> {
  if (typeof plain !== 'string' || !plain || typeof stored !== 'string' || !stored) {
    return false;
  }
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const [salt, storedHash] = parts;
  if (!salt || !storedHash) return false;

  try {
    const derivedKey = (await scryptAsync(plain, salt, KEY_LEN)) as Buffer;
    const storedBuffer = Buffer.from(storedHash, 'hex');

    if (derivedKey.length !== storedBuffer.length) return false;
    return timingSafeEqual(derivedKey, storedBuffer);
  } catch {
    return false;
  }
}
