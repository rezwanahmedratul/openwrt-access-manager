import crypto from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(crypto.scrypt);

const SALT_LENGTH = 16; // 16 bytes = 32 hex chars
const KEY_LENGTH = 64;  // 64 bytes = 128 hex chars
const DEFAULT_PREFIX = 'scrypt';

/**
 * Constant-time string equality comparison using SHA-256 digests
 * to avoid timing side-channels and length leakage.
 */
export function timingSafeStringEqual(a?: string | null, b?: string | null): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

/**
 * Checks whether a password string is already securely hashed.
 */
export function isPasswordHashed(stored: string): boolean {
  if (!stored || typeof stored !== 'string') return false;
  return stored.startsWith('scrypt:') || stored.startsWith('pbkdf2:');
}

/**
 * Hash a password using scrypt with a unique random salt.
 * Format: scrypt:<saltHex>:<derivedKeyHex>
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `${DEFAULT_PREFIX}:${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Synchronous version of password hashing with scrypt.
 */
export function hashPasswordSync(password: string): string {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, KEY_LENGTH);
  return `${DEFAULT_PREFIX}:${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verify a candidate password against a stored hash or legacy plain text.
 * Returns { valid: boolean, needsUpgrade: boolean }.
 * If the stored password matches a legacy plaintext, valid will be true and needsUpgrade will be true.
 */
export async function verifyPassword(
  password: string,
  stored: string
): Promise<{ valid: boolean; needsUpgrade: boolean }> {
  return verifyPasswordSync(password, stored);
}

/**
 * Synchronous verification of password against stored hash or plaintext.
 */
export function verifyPasswordSync(
  password: string,
  stored: string
): { valid: boolean; needsUpgrade: boolean } {
  if (!password || !stored || typeof password !== 'string' || typeof stored !== 'string') {
    return { valid: false, needsUpgrade: false };
  }

  // Handle scrypt hash
  if (stored.startsWith('scrypt:')) {
    const parts = stored.split(':');
    if (parts.length !== 3) {
      return { valid: false, needsUpgrade: false };
    }
    const [, salt, expectedHex] = parts;
    const expectedBuf = Buffer.from(expectedHex, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, KEY_LENGTH);

    if (derivedKey.length !== expectedBuf.length) {
      return { valid: false, needsUpgrade: false };
    }

    const valid = crypto.timingSafeEqual(derivedKey, expectedBuf);
    return { valid, needsUpgrade: false };
  }

  // Handle pbkdf2 hash (if present)
  if (stored.startsWith('pbkdf2:')) {
    const parts = stored.split(':');
    if (parts.length !== 4) {
      return { valid: false, needsUpgrade: false };
    }
    const [, iterStr, salt, expectedHex] = parts;
    const iterations = parseInt(iterStr, 10);
    if (isNaN(iterations) || iterations < 1000) {
      return { valid: false, needsUpgrade: false };
    }
    const expectedBuf = Buffer.from(expectedHex, 'hex');
    const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, expectedBuf.length, 'sha256');

    if (derivedKey.length !== expectedBuf.length) {
      return { valid: false, needsUpgrade: false };
    }

    const valid = crypto.timingSafeEqual(derivedKey, expectedBuf);
    return { valid, needsUpgrade: false };
  }

  // Legacy plain-text password fallback:
  // Compare in constant time using timingSafeStringEqual
  const matchesPlain = timingSafeStringEqual(password, stored);
  return {
    valid: matchesPlain,
    needsUpgrade: matchesPlain,
  };
}
