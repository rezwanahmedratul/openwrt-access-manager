import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { authenticateRouter, timingSafeCompare, createSessionTokenSync, clearRevokedSessions } from '../src/lib/auth';
import { GET as getVersion } from '../src/app/api/config/version/route';
import { GET as getFirewall } from '../src/app/api/config/firewall/route';
import { GET as getEthers } from '../src/app/api/config/ethers/route';
import { hashPasswordSync } from '../src/lib/password';

describe('Router Authentication & Bypass Prevention', () => {
  const originalEnv = { ...process.env };
  const validSecret = 'super-secret-router-sync-token-2026';

  beforeEach(() => {
    process.env.ROUTER_SECRET = validSecret;
    process.env.SESSION_SECRET = 'session-secret-for-testing-at-least-32-chars';
    delete process.env.NEXT_PUBLIC_SUPABASE_URL; // force mock store mode
    clearRevokedSessions();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    clearRevokedSessions();
  });

  describe('authenticateRouter Helper', () => {
    it('accepts correct router token in Authorization: Bearer header', async () => {
      const req = new Request('http://localhost/api/config/version', {
        headers: { Authorization: `Bearer ${validSecret}` },
      });
      const result = await authenticateRouter(req);
      expect(result).toBe(true);
    });

    it('accepts correct router token via x-router-token header', async () => {
      const req = new Request('http://localhost/api/config/version', {
        headers: { 'x-router-token': validSecret },
      });
      const result = await authenticateRouter(req);
      expect(result).toBe(true);
    });

    it('accepts direct token string', async () => {
      const result = await authenticateRouter(validSecret);
      expect(result).toBe(true);
    });

    it('rejects invalid or forged router tokens', async () => {
      const req = new Request('http://localhost/api/config/version', {
        headers: { Authorization: 'Bearer forged-fake-router-token' },
      });
      const result = await authenticateRouter(req);
      expect(result).toBe(false);
    });

    it('rejects requests missing credentials', async () => {
      const req = new Request('http://localhost/api/config/version');
      const result = await authenticateRouter(req);
      expect(result).toBe(false);
    });

    it('fails closed when ROUTER_SECRET is missing or empty', async () => {
      delete process.env.ROUTER_SECRET;
      const req = new Request('http://localhost/api/config/version', {
        headers: { Authorization: `Bearer ${validSecret}` },
      });
      const result = await authenticateRouter(req);
      expect(result).toBe(false);
    });

    it('prevents bypass via URL parameters (e.g. ?download=true or ?bypass=1)', async () => {
      const req1 = new Request('http://localhost/api/config/firewall?download=true');
      expect(await authenticateRouter(req1)).toBe(false);

      const req2 = new Request('http://localhost/api/config/ethers?bypass=1');
      expect(await authenticateRouter(req2)).toBe(false);
    });

    it('allows authenticated web dashboard sessions (admin/subadmin) to preview configs', async () => {
      const adminToken = createSessionTokenSync({ id: 'a1', username: 'admin', role: 'admin' });
      const req = new Request('http://localhost/api/config/firewall', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const result = await authenticateRouter(req);
      expect(result).toBe(true);
    });
  });

  describe('Constant-Time Comparison (timingSafeCompare)', () => {
    it('returns true only for identical strings', () => {
      expect(timingSafeCompare('correct-secret', 'correct-secret')).toBe(true);
      expect(timingSafeCompare('correct-secret', 'wrong-secret')).toBe(false);
      expect(timingSafeCompare('correct-secret', 'correct-secre')).toBe(false);
      expect(timingSafeCompare('correct-secret', 'correct-secret ')).toBe(false);
    });

    it('returns false safely for undefined, null, or empty values', () => {
      expect(timingSafeCompare(undefined, 'secret')).toBe(false);
      expect(timingSafeCompare('secret', null)).toBe(false);
      expect(timingSafeCompare(null, null)).toBe(false);
    });
  });

  describe('Router Endpoints Protection (/api/config/*)', () => {
    it('returns 401 on /api/config/version without valid token', async () => {
      const req = new Request('http://localhost/api/config/version');
      const res = await getVersion(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toContain('Unauthorized');
    });

    it('returns 200 on /api/config/version with valid router token', async () => {
      const req = new Request('http://localhost/api/config/version', {
        headers: { Authorization: `Bearer ${validSecret}` },
      });
      const res = await getVersion(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.version).toBeDefined();
      expect(data.hash).toBeDefined();
    });

    it('returns 401 on /api/config/firewall without valid token', async () => {
      const req = new Request('http://localhost/api/config/firewall');
      const res = await getFirewall(req);
      expect(res.status).toBe(401);
    });

    it('returns 200 on /api/config/firewall with valid token', async () => {
      const req = new Request('http://localhost/api/config/firewall', {
        headers: { Authorization: `Bearer ${validSecret}` },
      });
      const res = await getFirewall(req);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain('config defaults');
    });

    it('returns 401 on /api/config/ethers without valid token', async () => {
      const req = new Request('http://localhost/api/config/ethers');
      const res = await getEthers(req);
      expect(res.status).toBe(401);
    });

    it('returns 200 on /api/config/ethers with valid token', async () => {
      const req = new Request('http://localhost/api/config/ethers', {
        headers: { Authorization: `Bearer ${validSecret}` },
      });
      const res = await getEthers(req);
      expect(res.status).toBe(200);
    });
  });
});
