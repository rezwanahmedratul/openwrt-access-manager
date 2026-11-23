import { UserWithGroups, Group, DraftChange, Account, MacAuthSettings, AuditLog, RouterTelemetry, RouterTokenSettings, Configuration } from './types';

let mockAccounts: Account[] = [
  {
    id: 'acc-admin',
    username: 'admin',
    password_hash: 'admin123',
    role: 'admin',
    created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 15).toISOString(),
  },
  {
    id: 'acc-subadmin',
    username: 'subadmin',
    password_hash: 'subadmin123',
    role: 'subadmin',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
];

let mockUsers: UserWithGroups[] = [
  {
    id: '1',
    name: 'Ratul',
    mac_address: '6C:00:6B:25:5B:B3',
    schedule: {
      days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
      start_time: '07:00',
      stop_time: '23:00',
      timezone: 'Asia/Dhaka',
    },
    temporary_access_until: null,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    groups: [
      { id: 'g1', name: 'Family', is_protected: false, created_at: '', updated_at: '' },
      { id: 'g3', name: 'Students', is_protected: false, created_at: '', updated_at: '' },
    ],
  },
  {
    id: '2',
    name: 'Ratul_Laptop',
    mac_address: 'E4:C7:67:52:6A:7F',
    schedule: null,
    temporary_access_until: null,
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    groups: [{ id: 'g2', name: 'Friends', is_protected: false, created_at: '', updated_at: '' }],
  },
  {
    id: '3',
    name: 'Newt',
    mac_address: 'BC:24:11:41:F7:42',
    schedule: null,
    temporary_access_until: new Date(Date.now() + 86400000 * 2).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    groups: [{ id: 'g5', name: 'Devices', is_protected: true, created_at: '', updated_at: '' }],
  },
];

let mockGroups: Group[] = [
  { id: 'g-default', name: 'Default', is_protected: false, is_no_internet: false, created_at: '', updated_at: '' },
  { id: 'g1', name: 'Family', is_protected: false, is_no_internet: false, created_at: '', updated_at: '' },
  { id: 'g2', name: 'Friends', is_protected: false, is_no_internet: false, created_at: '', updated_at: '' },
  { id: 'g3', name: 'Students', is_protected: false, is_no_internet: false, created_at: '', updated_at: '' },
  { id: 'g4', name: 'Guests', is_protected: false, is_no_internet: false, created_at: '', updated_at: '' },
  { id: 'g5', name: 'Devices', is_protected: true, is_no_internet: false, created_at: '', updated_at: '' },
  { id: 'g6', name: 'Others', is_protected: false, is_no_internet: false, created_at: '', updated_at: '' },
];

let mockDraftChanges: DraftChange[] = [];
let mockVersion = 1;
let mockLastApplied: string | null = new Date(Date.now() - 86400000).toISOString();

let mockMacAuth: MacAuthSettings = {
  enabled: true, // true = MAC auth ON (forwarding removed), false = MAC auth OFF (forwarding lan ➔ wan)
  disabled_until: null,
};

let mockRouterToken: RouterTokenSettings = {
  token_hash: null,
  created_at: null,
  revoked: false,
};

let mockAuditLogs: AuditLog[] = [
  {
    id: 'audit-1',
    actor_id: 'acc-admin',
    actor_username: 'admin',
    action: 'SYSTEM_INIT',
    resource_type: 'system',
    resource_id: 'gateway',
    details: { initial_users: 3, default_policy: 'REJECT' },
    ip_address: '127.0.0.1',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'audit-2',
    actor_id: 'acc-admin',
    actor_username: 'admin',
    action: 'CONFIG_APPLY',
    resource_type: 'configuration',
    resource_id: 'v1',
    details: { version: 1, user_count: 3 },
    ip_address: '192.168.1.10',
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

let mockRouterTelemetry: RouterTelemetry[] = [
  {
    id: 'telem-1',
    uptime: 172800,
    openwrt_version: 'OpenWrt 23.05.2 r23630-9b3334e348',
    config_version: 1,
    last_sync: new Date(Date.now() - 60000 * 2).toISOString(),
    cpu_usage: 12.4,
    memory_usage: 45.2,
    disk_free: 84320,
    wan_status: 'connected',
    connected_clients: 8,
    last_sync_error: null,
    created_at: new Date(Date.now() - 60000 * 2).toISOString(),
  },
];

let mockConfigurations: Configuration[] = [
  {
    id: 'config-v1',
    version: 1,
    hash: 'mock-initial-hash-v1',
    user_count: 3,
    firewall_content: '# OpenWrt Firewall Initial',
    ethers_content: '# OpenWrt Ethers Initial',
    metadata: {},
    change_description: 'Initial gateway deployment',
    author_id: 'acc-admin',
    author_name: 'admin',
    deployment_status: 'applied',
    is_current: true,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

export function getMockState() {
  // Auto-check if temporary disable duration has passed
  if (!mockMacAuth.enabled && mockMacAuth.disabled_until) {
    const expiry = new Date(mockMacAuth.disabled_until).getTime();
    if (Date.now() >= expiry) {
      mockMacAuth = {
        enabled: true,
        disabled_until: null,
      };
      // Bump version so router polling (/api/config/version) immediately sees a change and updates /etc/config/firewall
      mockVersion += 1;
      mockLastApplied = new Date().toISOString();
    }
  }

  return {
    mockAccounts,
    mockUsers,
    mockGroups,
    mockDraftChanges,
    mockVersion,
    mockLastApplied,
    mockMacAuth,
    mockRouterToken,
    mockAuditLogs,
    mockRouterTelemetry,
    mockConfigurations,
    setMockAccounts: (a: Account[]) => { mockAccounts = a; },
    setMockUsers: (u: UserWithGroups[]) => { mockUsers = u; },
    setMockGroups: (g: Group[]) => { mockGroups = g; },
    setMockDraftChanges: (d: DraftChange[]) => { mockDraftChanges = d; },
    setMockVersion: (v: number) => { mockVersion = v; },
    setMockLastApplied: (l: string) => { mockLastApplied = l; },
    setMockMacAuth: (m: MacAuthSettings) => { mockMacAuth = m; },
    setMockRouterToken: (t: RouterTokenSettings) => { mockRouterToken = t; },
    setMockAuditLogs: (logs: AuditLog[]) => { mockAuditLogs = logs; },
    setMockRouterTelemetry: (telems: RouterTelemetry[]) => { mockRouterTelemetry = telems; },
    setMockConfigurations: (c: Configuration[]) => { mockConfigurations = c; },
  };
}
