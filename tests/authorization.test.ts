import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { requireAuth, requireAdmin, createSessionTokenSync, clearRevokedSessions } from '../src/lib/auth';
import { GET as getAccounts, POST as createAccount, DELETE as deleteAccount, PATCH as updateAccount } from '../src/app/api/accounts/route';
import { POST as createGroup, DELETE as deleteGroup, PATCH as updateGroup } from '../src/app/api/groups/route';
import { getMockState } from '../src/lib/mock-store';
import { SessionUser } from '../src/lib/types';

describe('Authorization & Permissions (Admin vs Subadmin)', () => {
  const originalSecret = process.env.SESSION_SECRET;
  const testSecret = 'auth-test-secret-at-least-32-chars-long';

  const adminUser: SessionUser = { id: 'admin-id-1', username: 'admin', role: 'admin' };
  const subadminUser: SessionUser = { id: 'subadmin-id-2', username: 'operator', role: 'subadmin' };

  let adminToken: string;
  let subadminToken: string;

  beforeEach(() => {
    process.env.SESSION_SECRET = testSecret;
    clearRevokedSessions();
    adminToken = createSessionTokenSync(adminUser);
    subadminToken = createSessionTokenSync(subadminUser);

    // Reset mock store state
    const state = getMockState();
    state.setMockAccounts([
      {
        id: 'admin-id-1',
        username: 'admin',
        role: 'admin',
        password_hash: 'adminpass',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'subadmin-id-2',
        username: 'operator',
        role: 'subadmin',
        password_hash: 'operatorpass',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    state.setMockGroups([
      {
        id: 'g-default',
        name: 'Default',
        is_protected: false,
        is_no_internet: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'g-protected',
        name: 'VIP Executive',
        is_protected: true,
        is_no_internet: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'g-regular',
        name: 'Guest Devices',
        is_protected: false,
        is_no_internet: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    state.setMockUsers([
      {
        id: 'user-vip',
        name: 'VIP Laptop',
        mac_address: 'AA:BB:CC:DD:EE:01',
        groups: [{ id: 'g-protected', name: 'VIP Executive', is_protected: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'user-regular',
        name: 'Guest Phone',
        mac_address: 'AA:BB:CC:DD:EE:02',
        groups: [{ id: 'g-regular', name: 'Guest Devices', is_protected: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
  });

  afterEach(() => {
    process.env.SESSION_SECRET = originalSecret;
    clearRevokedSessions();
  });

  describe('Centralized requireAuth & requireAdmin helpers', () => {
    it('requireAuth rejects unauthenticated requests with 401', async () => {
      const req = new Request('http://localhost/api/users');
      await expect(requireAuth(req)).rejects.toMatchObject({ status: 401 });
    });

    it('requireAuth succeeds for both admin and subadmin', async () => {
      const adminReq = new Request('http://localhost/api/users', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const subReq = new Request('http://localhost/api/users', {
        headers: { Authorization: `Bearer ${subadminToken}` },
      });

      const user1 = await requireAuth(adminReq);
      const user2 = await requireAuth(subReq);

      expect(user1.username).toBe('admin');
      expect(user2.username).toBe('operator');
    });

    it('requireAdmin allows admin but rejects subadmin with 403', async () => {
      const adminReq = new Request('http://localhost/api/admin', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const subReq = new Request('http://localhost/api/admin', {
        headers: { Authorization: `Bearer ${subadminToken}` },
      });

      const admin = await requireAdmin(adminReq);
      expect(admin.role).toBe('admin');

      await expect(requireAdmin(subReq)).rejects.toMatchObject({ status: 403 });
    });
  });

  describe('Accounts API Role Enforcement', () => {
    it('blocks subadmin from viewing account list', async () => {
      const req = new Request('http://localhost/api/accounts', {
        headers: { Authorization: `Bearer ${subadminToken}` },
      });
      const res = await getAccounts(req);
      expect(res.status).toBe(403);
    });

    it('blocks subadmin from creating accounts', async () => {
      const req = new Request('http://localhost/api/accounts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${subadminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: 'newsubadmin', password: 'password123' }),
      });
      const res = await createAccount(req);
      expect(res.status).toBe(403);
    });

    it('blocks subadmin from deleting accounts', async () => {
      const req = new Request('http://localhost/api/accounts?id=subadmin-id-2', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${subadminToken}` },
      });
      const res = await deleteAccount(req);
      expect(res.status).toBe(403);
    });

    it('prevents deleting an admin account even by admin', async () => {
      const req = new Request('http://localhost/api/accounts?id=admin-id-1', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const res = await deleteAccount(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Cannot delete administrator account');
    });

    it('allows subadmin to change only their own password, blocking others', async () => {
      // Trying to change admin's password should fail with 403
      const hackReq = new Request('http://localhost/api/accounts', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${subadminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: 'admin-id-1', password: 'hackedpassword' }),
      });
      const hackRes = await updateAccount(hackReq);
      expect(hackRes.status).toBe(403);

      // Changing own password should succeed
      const selfReq = new Request('http://localhost/api/accounts', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${subadminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: 'subadmin-id-2', password: 'newoperatorpassword' }),
      });
      const selfRes = await updateAccount(selfReq);
      expect(selfRes.status).toBe(200);
    });
  });

  describe('Groups API Role & Protected Group Enforcement', () => {
    it('blocks subadmin from creating protected or No-Internet groups', async () => {
      const protReq = new Request('http://localhost/api/groups', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${subadminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Subadmin Protected', is_protected: true }),
      });
      const protRes = await createGroup(protReq);
      expect(protRes.status).toBe(403);

      const noNetReq = new Request('http://localhost/api/groups', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${subadminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Subadmin No Internet', is_no_internet: true }),
      });
      const noNetRes = await createGroup(noNetReq);
      expect(noNetRes.status).toBe(403);
    });

    it('allows subadmin to create a regular group', async () => {
      const regReq = new Request('http://localhost/api/groups', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${subadminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Office Printers' }),
      });
      const regRes = await createGroup(regReq);
      expect(regRes.status).toBe(200);
      const data = await regRes.json();
      expect(data.group.name).toBe('Office Printers');
    });

    it('blocks subadmin from deleting a protected group', async () => {
      const req = new Request('http://localhost/api/groups?id=g-protected', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${subadminToken}` },
      });
      const res = await deleteGroup(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('Only administrators can delete protected groups');
    });

    it('allows admin to delete a protected group, safely reassigning members to Default group', async () => {
      const req = new Request('http://localhost/api/groups?id=g-protected', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const res = await deleteGroup(req);
      expect(res.status).toBe(200);

      const state = getMockState();
      // VIP device should now be in the Default group
      const vipUser = state.mockUsers.find((u) => u.id === 'user-vip');
      expect(vipUser).toBeDefined();
      expect(vipUser?.groups.some((g) => g.name === 'Default')).toBe(true);
    });

    it('prevents deleting the Default fallback group', async () => {
      const req = new Request('http://localhost/api/groups?id=g-default', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const res = await deleteGroup(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Cannot delete the "Default" fallback group');
    });

    it('blocks subadmin from toggling protection or no_internet on existing groups', async () => {
      const req = new Request('http://localhost/api/groups', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${subadminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: 'g-regular', is_protected: true }),
      });
      const res = await updateGroup(req);
      expect(res.status).toBe(403);
    });
  });
});
