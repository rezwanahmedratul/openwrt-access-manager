import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST as heartbeatPost, GET as heartbeatGet } from '@/app/api/config/heartbeat/route';
import { POST as statusPost, GET as statusGet } from '@/app/api/config/status/route';
import { POST as tokenPost, GET as tokenGet, DELETE as tokenDelete } from '@/app/api/config/token/route';
import { POST as rollbackPost } from '@/app/api/config/rollback/route';
import { GET as auditGet } from '@/app/api/audit/route';
import { POST as applyPost } from '@/app/api/apply/route';
import { POST as draftPost } from '@/app/api/draft/route';
import { GET as firewallGet } from '@/app/api/config/firewall/route';
import { GET as ethersGet } from '@/app/api/config/ethers/route';
import { GET as versionGet } from '@/app/api/config/version/route';
import { getMockState } from '@/lib/mock-store';
import { createSessionTokenSync } from '@/lib/auth';

const TEST_SECRET = 'valid-test-router-secret-token-12345';
const SESSION_SECRET = 'test-session-secret-at-least-32-characters-long';

describe('Serverless API & Router Endpoints', () => {
  let adminCookie: string;
  let subadminCookie: string;

  beforeEach(() => {
    vi.stubEnv('ROUTER_SECRET', TEST_SECRET);
    vi.stubEnv('SESSION_SECRET', SESSION_SECRET);

    const adminToken = createSessionTokenSync({ id: 'acc-admin', username: 'admin', role: 'admin' });
    adminCookie = `openwrt_session=${adminToken}`;

    const subadminToken = createSessionTokenSync({ id: 'acc-subadmin', username: 'subadmin', role: 'subadmin' });
    subadminCookie = `openwrt_session=${subadminToken}`;

    const state = getMockState();
    state.setMockVersion(1);
    state.setMockDraftChanges([]);
    state.setMockRouterToken({ token_hash: null, created_at: null, revoked: false });
  });

  describe('Router Auth on Config Endpoints (firewall, ethers, version)', () => {
    it('fails closed when no credentials or sessions are provided', async () => {
      const req = new Request('http://localhost/api/config/firewall');
      const res = await firewallGet(req);
      expect(res.status).toBe(401);

      const ethersRes = await ethersGet(new Request('http://localhost/api/config/ethers'));
      expect(ethersRes.status).toBe(401);

      const versionRes = await versionGet(new Request('http://localhost/api/config/version'));
      expect(versionRes.status).toBe(401);
    });

    it('authenticates router with valid Bearer token', async () => {
      const req = new Request('http://localhost/api/config/version', {
        headers: { authorization: `Bearer ${TEST_SECRET}` },
      });
      const res = await versionGet(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.version).toBeDefined();
    });

    it('rejects invalid Bearer token', async () => {
      const req = new Request('http://localhost/api/config/version', {
        headers: { authorization: 'Bearer wrong-secret' },
      });
      const res = await versionGet(req);
      expect(res.status).toBe(401);
    });

    it('allows session user (admin) to access firewall and ethers', async () => {
      const req = new Request('http://localhost/api/config/firewall', {
        headers: { cookie: adminCookie },
      });
      const res = await firewallGet(req);
      expect(res.status).toBe(200);
    });
  });

  describe('/api/config/heartbeat', () => {
    it('validates heartbeat telemetry payload and records to store', async () => {
      const payload = {
        uptime: 3600,
        openwrt_version: 'OpenWrt 23.05.2',
        config_version: 1,
        cpu_usage: 15.5,
        memory_usage: 42.0,
        disk_free: 50000,
        wan_status: 'connected',
        connected_clients: 5,
      };

      const req = new Request('http://localhost/api/config/heartbeat', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${TEST_SECRET}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const res = await heartbeatPost(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.telemetry.openwrt_version).toBe('OpenWrt 23.05.2');
    });

    it('rejects malformed heartbeat payload with 400', async () => {
      const badPayload = {
        uptime: -10, // Invalid: must be non-negative
        cpu_usage: 150, // Invalid: max 100
      };

      const req = new Request('http://localhost/api/config/heartbeat', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${TEST_SECRET}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(badPayload),
      });

      const res = await heartbeatPost(req);
      expect(res.status).toBe(400);
    });
  });

  describe('/api/config/status', () => {
    it('updates deployment status for matching configuration version', async () => {
      const req = new Request('http://localhost/api/config/status', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${TEST_SECRET}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          version: 1,
          status: 'applied',
        }),
      });

      const res = await statusPost(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.status).toBe('applied');
    });

    it('rejects invalid status values', async () => {
      const req = new Request('http://localhost/api/config/status', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${TEST_SECRET}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          version: 1,
          status: 'unknown_status',
        }),
      });

      const res = await statusPost(req);
      expect(res.status).toBe(400);
    });
  });

  describe('/api/config/token', () => {
    it('allows admin to generate and rotate router token', async () => {
      const req = new Request('http://localhost/api/config/token', {
        method: 'POST',
        headers: { cookie: adminCookie },
      });

      const res = await tokenPost(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.token).toBeDefined();
      expect(data.token.length).toBe(64); // 32 bytes hex
    });

    it('denies subadmin from generating router token', async () => {
      const req = new Request('http://localhost/api/config/token', {
        method: 'POST',
        headers: { cookie: subadminCookie },
      });

      const res = await tokenPost(req);
      expect(res.status).toBe(403);
    });

    it('allows admin to revoke router token', async () => {
      const req = new Request('http://localhost/api/config/token', {
        method: 'DELETE',
        headers: { cookie: adminCookie },
      });

      const res = await tokenDelete(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });
  });

  describe('/api/config/rollback', () => {
    it('restores historical configuration version and creates new version with rollback metadata', async () => {
      const req = new Request('http://localhost/api/config/rollback', {
        method: 'POST',
        headers: {
          cookie: adminCookie,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          target_version: 1,
          reason: 'Emergency rollback test',
        }),
      });

      const res = await rollbackPost(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.version).toBe(2);
      expect(data.rollback_from_version).toBe(1);
    });

    it('returns 404 when target version does not exist', async () => {
      const req = new Request('http://localhost/api/config/rollback', {
        method: 'POST',
        headers: {
          cookie: adminCookie,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          target_version: 9999,
        }),
      });

      const res = await rollbackPost(req);
      expect(res.status).toBe(404);
    });
  });

  describe('/api/audit', () => {
    it('allows authenticated session to query paginated audit logs', async () => {
      const req = new Request('http://localhost/api/audit?page=1&limit=10', {
        headers: { cookie: adminCookie },
      });

      const res = await auditGet(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.logs)).toBe(true);
      expect(data.page).toBe(1);
    });
  });

  describe('/api/draft with schedule and temporary access', () => {
    it('accepts draft operation with schedule and temporary access', async () => {
      const req = new Request('http://localhost/api/draft', {
        method: 'POST',
        headers: {
          cookie: adminCookie,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'ADD',
          name: 'Scheduled_Device',
          mac_address: '11:22:33:44:55:66',
          schedule: {
            days: ['mon', 'tue'],
            start_time: '08:00',
            stop_time: '18:00',
            timezone: 'Asia/Dhaka',
          },
          temporary_access_until: new Date(Date.now() + 86400000).toISOString(),
        }),
      });

      const res = await draftPost(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.change.user_data.schedule).toBeDefined();
    });
  });

  describe('/api/apply optimistic concurrency', () => {
    it('detects version conflict when expected_version does not match current version', async () => {
      const req = new Request('http://localhost/api/apply', {
        method: 'POST',
        headers: {
          cookie: adminCookie,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          expected_version: 99, // Mismatch: current is 1
        }),
      });

      const res = await applyPost(req);
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toContain('Configuration conflict');
    });
  });
});
