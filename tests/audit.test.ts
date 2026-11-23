import { describe, it, expect, beforeEach } from 'vitest';
import { logAudit, getAuditLogs, getClientIp } from '../src/lib/audit';
import { getMockState } from '../src/lib/mock-store';

describe('Audit Logging System', () => {
  beforeEach(() => {
    // Reset mock audit logs before each test
    const state = getMockState();
    state.setMockAuditLogs([]);
  });

  it('records an audit event with correct structure and defaults', async () => {
    const entry = await logAudit({
      actor_id: 'acc-admin',
      actor_username: 'admin',
      action: 'USER_CREATE',
      resource_type: 'user',
      resource_id: 'usr-123',
      details: { mac_address: '00:11:22:33:44:55', name: 'Test Device' },
      ip_address: '192.168.1.100',
    });

    expect(entry).toBeDefined();
    expect(entry.id).toBeDefined();
    expect(entry.actor_id).toBe('acc-admin');
    expect(entry.actor_username).toBe('admin');
    expect(entry.action).toBe('USER_CREATE');
    expect(entry.resource_type).toBe('user');
    expect(entry.resource_id).toBe('usr-123');
    expect(entry.details).toEqual({ mac_address: '00:11:22:33:44:55', name: 'Test Device' });
    expect(entry.ip_address).toBe('192.168.1.100');
    expect(entry.created_at).toBeDefined();

    // Verify it is present in query results
    const results = await getAuditLogs();
    expect(results.total).toBe(1);
    expect(results.logs[0].id).toBe(entry.id);
  });

  it('filters audit logs by action, resource_type, and actor_username', async () => {
    await logAudit({
      actor_username: 'admin',
      action: 'FIREWALL_UPDATE',
      resource_type: 'config',
      details: {},
    });

    await logAudit({
      actor_username: 'subadmin',
      action: 'USER_DELETE',
      resource_type: 'user',
      details: {},
    });

    const configLogs = await getAuditLogs({ resource_type: 'config' });
    expect(configLogs.total).toBe(1);
    expect(configLogs.logs[0].action).toBe('FIREWALL_UPDATE');

    const subadminLogs = await getAuditLogs({ actor_username: 'subadmin' });
    expect(subadminLogs.total).toBe(1);
    expect(subadminLogs.logs[0].actor_username).toBe('subadmin');
  });

  it('extracts client IP from various headers', () => {
    const reqWithForwarded = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18' },
    });
    expect(getClientIp(reqWithForwarded)).toBe('203.0.113.195');

    const reqWithRealIp = new Request('http://localhost', {
      headers: { 'x-real-ip': '198.51.100.1' },
    });
    expect(getClientIp(reqWithRealIp)).toBe('198.51.100.1');

    const reqEmpty = new Request('http://localhost');
    expect(getClientIp(reqEmpty)).toBeNull();
  });
});
