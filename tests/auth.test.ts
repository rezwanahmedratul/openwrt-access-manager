import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createSessionToken,
  createSessionTokenSync,
  verifySessionToken,
  parseSessionToken,
  revokeSession,
  isSessionRevoked,
  clearRevokedSessions,
  timingSafeCompare,
} from '../src/lib/auth';
import {
  hashPassword,
  hashPasswordSync,
  verifyPassword,
  verifyPasswordSync,
  isPasswordHashed,
  timingSafeStringEqual,
} from '../src/lib/password';
import { SessionUser } from '../src/lib/types';

describe('Auth & Session Management', () => {
  const originalSecret = process.env.SESSION_SECRET;
  const testSecret = 'test-secret-key-that-is-at-least-32-chars-long';

  const mockAdmin: SessionUser = {
    id: 'user-admin-1',
    username: 'admin',
    role: 'admin',
  };

  const mockSubadmin: SessionUser = {
    id: 'user-subadmin-1',
    username: 'operator',
    role: 'subadmin',
  };

  beforeEach(() => {
    process.env.SESSION_SECRET = testSecret;
    clearRevokedSessions();
  });

  afterEach(() => {
    process.env.SESSION_SECRET = originalSecret;
    clearRevokedSessions();
  });

  describe('JWT Session Signing & Verification with jose', () => {
    it('creates and verifies a valid JWT session for admin', async () => {
      const token = await createSessionToken(mockAdmin);
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);

      const parsedAsync = await verifySessionToken(token);
      expect(parsedAsync).not.toBeNull();
      expect(parsedAsync?.id).toBe(mockAdmin.id);
      expect(parsedAsync?.username).toBe(mockAdmin.username);
      expect(parsedAsync?.role).toBe('admin');

      // Sync verification should also parse jose HS256 tokens seamlessly
      const parsedSync = parseSessionToken(token);
      expect(parsedSync).not.toBeNull();
      expect(parsedSync?.id).toBe(mockAdmin.id);
      expect(parsedSync?.username).toBe(mockAdmin.username);
      expect(parsedSync?.role).toBe('admin');
    });

    it('creates and verifies a valid JWT session for subadmin', async () => {
      const token = await createSessionToken(mockSubadmin);
      const parsed = await verifySessionToken(token);
      expect(parsed).not.toBeNull();
      expect(parsed?.id).toBe(mockSubadmin.id);
      expect(parsed?.role).toBe('subadmin');
    });

    it('creates valid tokens synchronously using createSessionTokenSync', () => {
      const token = createSessionTokenSync(mockAdmin);
      const parsed = parseSessionToken(token);
      expect(parsed).not.toBeNull();
      expect(parsed?.username).toBe(mockAdmin.username);
    });

    it('rejects tampered tokens (modified payload)', async () => {
      const token = await createSessionToken(mockAdmin);
      const [header, payload, sig] = token.split('.');

      // Decode payload, modify role to admin if it wasn't, or alter username
      const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
      decodedPayload.username = 'hacked_user';
      const tamperedPayload = Buffer.from(JSON.stringify(decodedPayload)).toString('base64url');

      const tamperedToken = `${header}.${tamperedPayload}.${sig}`;

      expect(parseSessionToken(tamperedToken)).toBeNull();
      expect(await verifySessionToken(tamperedToken)).toBeNull();
    });

    it('rejects tampered tokens (corrupted signature)', async () => {
      const token = await createSessionToken(mockAdmin);
      const parts = token.split('.');
      const corruptedSig = parts[2].slice(0, -4) + 'abcd';
      const tamperedToken = `${parts[0]}.${parts[1]}.${corruptedSig}`;

      expect(parseSessionToken(tamperedToken)).toBeNull();
      expect(await verifySessionToken(tamperedToken)).toBeNull();
    });

    it('rejects expired tokens', () => {
      // Create a token expired 1 hour ago
      const expiredToken = createSessionTokenSync(mockAdmin, -3600);
      expect(parseSessionToken(expiredToken)).toBeNull();
    });

    it('handles session revocation server-side', async () => {
      const token = await createSessionToken(mockAdmin);
      expect(parseSessionToken(token)).not.toBeNull();

      // Revoke token
      await revokeSession(token);
      expect(isSessionRevoked(token)).toBe(true);
      expect(parseSessionToken(token)).toBeNull();
      expect(await verifySessionToken(token)).toBeNull();
    });

    it('fails closed when SESSION_SECRET is missing or empty', async () => {
      delete process.env.SESSION_SECRET;

      // Signing should throw or fail
      await expect(createSessionToken(mockAdmin)).rejects.toThrow();

      // Verification should return null
      process.env.SESSION_SECRET = testSecret;
      const validToken = await createSessionToken(mockAdmin);

      delete process.env.SESSION_SECRET;
      expect(parseSessionToken(validToken)).toBeNull();
      expect(await verifySessionToken(validToken)).toBeNull();
    });
  });

  describe('Password Hashing & Verification (scrypt)', () => {
    const rawPassword = 'super-secret-password-123';

    it('hashes passwords using scrypt with unique salt', async () => {
      const hash1 = await hashPassword(rawPassword);
      const hash2 = await hashPassword(rawPassword);

      expect(hash1).toMatch(/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/);
      expect(hash2).toMatch(/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/);
      // Salting ensures identical passwords have distinct hashes
      expect(hash1).not.toBe(hash2);
      expect(isPasswordHashed(hash1)).toBe(true);
    });

    it('hashes passwords synchronously', () => {
      const hash = hashPasswordSync(rawPassword);
      expect(hash).toMatch(/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/);
      expect(isPasswordHashed(hash)).toBe(true);
    });

    it('verifies correct passwords and rejects wrong ones', async () => {
      const hash = await hashPassword(rawPassword);

      const correctResult = await verifyPassword(rawPassword, hash);
      expect(correctResult.valid).toBe(true);
      expect(correctResult.needsUpgrade).toBe(false);

      const wrongResult = await verifyPassword('wrong-password', hash);
      expect(wrongResult.valid).toBe(false);
      expect(wrongResult.needsUpgrade).toBe(false);
    });

    it('supports legacy plain-text password verification and flags them for upgrade', async () => {
      const legacyPlain = 'legacy_unhashed_pass';

      const verifyRes = await verifyPassword(legacyPlain, legacyPlain);
      expect(verifyRes.valid).toBe(true);
      expect(verifyRes.needsUpgrade).toBe(true);

      const wrongRes = await verifyPassword('other_pass', legacyPlain);
      expect(wrongRes.valid).toBe(false);
    });

    it('performs timing-safe string comparisons', () => {
      expect(timingSafeStringEqual('secret123', 'secret123')).toBe(true);
      expect(timingSafeStringEqual('secret123', 'secret124')).toBe(false);
      expect(timingSafeStringEqual('short', 'much_longer_string')).toBe(false);
      expect(timingSafeStringEqual(null, 'test')).toBe(false);

      expect(timingSafeCompare('routertoken', 'routertoken')).toBe(true);
      expect(timingSafeCompare('routertoken', 'wrongtoken')).toBe(false);
    });
  });
});
