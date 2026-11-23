import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { heartbeatPayloadSchema } from '../src/lib/validation';
import { POST as postHeartbeat, GET as getHeartbeat } from '../src/app/api/config/heartbeat/route';
import { getMockState } from '../src/lib/mock-store';
import { cacheGet } from '../src/lib/cache';

/**
 * Online/Offline status evaluator logic matching RouterHealthCard
 * Stale threshold: 10 minutes (600,000 ms)
 */
export function calculateRouterOnlineStatus(
  lastSeenIso?: string | null,
  staleThresholdMs = 10 * 60 * 1000,
  now = Date.now()
): boolean {
  if (!lastSeenIso) return false;
  try {
    const time = new Date(lastSeenIso).getTime();
    if (isNaN(time)) return false;
    const diff = now - time;
    return diff >= 0 && diff <= staleThresholdMs;
  } catch {
    return false;
  }
}

describe('Heartbeat & Telemetry Validation', () => {
  const testSecret = 'heartbeat-test-router-secret';
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.ROUTER_SECRET = testSecret;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL; // force mock store
    const state = getMockState();
    state.setMockRouterTelemetry([]);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('heartbeatPayloadSchema Validation', () => {
    it('validates a complete and correct telemetry payload', () => {
      const validPayload = {
        uptime: 360000,
        openwrt_version: 'OpenWrt 23.05.5 r24106-10cc5fcd00',
        config_version: 5,
        last_sync: new Date().toISOString(),
        cpu_usage: 12.5,
        memory_usage: 45.2,
        disk_free: 10240,
        wan_status: 'connected',
        connected_clients: 8,
        last_sync_error: null,
      };

      const result = heartbeatPayloadSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.uptime).toBe(360000);
        expect(result.data.cpu_usage).toBe(12.5);
      }
    });

    it('accepts partial telemetry payloads with optional fields', () => {
      const partialPayload = {
        uptime: 120,
        config_version: 2,
      };

      const result = heartbeatPayloadSchema.safeParse(partialPayload);
      expect(result.success).toBe(true);
    });

    it('rejects invalid CPU or memory percentages (< 0 or > 100)', () => {
      expect(heartbeatPayloadSchema.safeParse({ cpu_usage: 150 }).success).toBe(false);
      expect(heartbeatPayloadSchema.safeParse({ cpu_usage: -5 }).success).toBe(false);
      expect(heartbeatPayloadSchema.safeParse({ memory_usage: 100.1 }).success).toBe(false);
    });

    it('rejects negative uptime or negative disk_free values', () => {
      expect(heartbeatPayloadSchema.safeParse({ uptime: -1 }).success).toBe(false);
      expect(heartbeatPayloadSchema.safeParse({ disk_free: -100 }).success).toBe(false);
    });

    it('rejects malformed timestamps for last_sync', () => {
      expect(heartbeatPayloadSchema.safeParse({ last_sync: 'not-a-valid-date' }).success).toBe(false);
    });
  });

  describe('Online / Offline Status Calculation', () => {
    const STALE_THRESHOLD = 10 * 60 * 1000; // 10 minutes

    it('reports ONLINE when last heartbeat is recent (under 10 minutes ago)', () => {
      const now = Date.now();
      const recentTimestamp = new Date(now - 2 * 60 * 1000).toISOString(); // 2 minutes ago
      expect(calculateRouterOnlineStatus(recentTimestamp, STALE_THRESHOLD, now)).toBe(true);

      const justNow = new Date(now - 5000).toISOString(); // 5 seconds ago
      expect(calculateRouterOnlineStatus(justNow, STALE_THRESHOLD, now)).toBe(true);
    });

    it('reports OFFLINE when heartbeat timestamp exceeds 10 minutes threshold', () => {
      const now = Date.now();
      const staleTimestamp = new Date(now - 11 * 60 * 1000).toISOString(); // 11 minutes ago
      expect(calculateRouterOnlineStatus(staleTimestamp, STALE_THRESHOLD, now)).toBe(false);

      const veryOldTimestamp = new Date(now - 24 * 60 * 60 * 1000).toISOString(); // 1 day ago
      expect(calculateRouterOnlineStatus(veryOldTimestamp, STALE_THRESHOLD, now)).toBe(false);
    });

    it('reports OFFLINE when timestamp is null, undefined, empty, or invalid', () => {
      expect(calculateRouterOnlineStatus(null)).toBe(false);
      expect(calculateRouterOnlineStatus(undefined)).toBe(false);
      expect(calculateRouterOnlineStatus('')).toBe(false);
      expect(calculateRouterOnlineStatus('garbage_timestamp')).toBe(false);
    });
  });

  describe('POST & GET /api/config/heartbeat Route', () => {
    it('rejects unauthenticated heartbeat submission with 401', async () => {
      const req = new Request('http://localhost/api/config/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uptime: 500 }),
      });

      const res = await postHeartbeat(req);
      expect(res.status).toBe(401);
    });

    it('rejects invalid payload with 400', async () => {
      const req = new Request('http://localhost/api/config/heartbeat', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testSecret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cpu_usage: 999 }),
      });

      const res = await postHeartbeat(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Invalid heartbeat payload');
    });

    it('records valid telemetry and updates telemetry:router:last_seen cache', async () => {
      const payload = {
        uptime: 12345,
        openwrt_version: 'OpenWrt 23.05.5',
        config_version: 7,
        cpu_usage: 5.2,
        memory_usage: 33.1,
        wan_status: 'connected',
        connected_clients: 4,
      };

      const req = new Request('http://localhost/api/config/heartbeat', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testSecret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const res = await postHeartbeat(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.telemetry).toBeDefined();
      expect(data.telemetry.uptime).toBe(12345);
      expect(data.telemetry.config_version).toBe(7);

      // Verify cache was updated
      const cachedLastSeen = await cacheGet<string>('telemetry:router:last_seen');
      expect(cachedLastSeen).toBeDefined();
      expect(typeof cachedLastSeen).toBe('string');

      // GET should retrieve this recorded telemetry
      const getReq = new Request('http://localhost/api/config/heartbeat', {
        headers: {
          Authorization: `Bearer ${testSecret}`,
        },
      });
      const getRes = await getHeartbeat(getReq);
      expect(getRes.status).toBe(200);
      const retrieved = await getRes.json();
      expect(retrieved.success).toBe(true);
      expect(retrieved.telemetry.uptime).toBe(12345);
    });
  });
});
