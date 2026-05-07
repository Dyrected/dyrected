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
 * Verify a plain-text password against a stored `salt:hash` string.
 */
export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const [salt, storedHash] = stored.split(':');
  if (!salt || !storedHash) return false;

  const derivedKey = (await scryptAsync(plain, salt, KEY_LEN)) as Buffer;
  const storedBuffer = Buffer.from(storedHash, 'hex');

  if (derivedKey.length !== storedBuffer.length) return false;
  return timingSafeEqual(derivedKey, storedBuffer);
}
