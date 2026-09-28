import { UserWithGroups, Group, DraftChange, Account, MacAuthSettings } from './types';

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
    mac_address: '64:DD:E9:D3:C6:AB',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    groups: [
      { id: 'g1', name: 'Family', is_protected: false, created_at: '', updated_at: '' },
      { id: 'g3', name: 'Students', is_protected: false, created_at: '', updated_at: '' },
    ],
  },
  {
    id: '2',
    name: 'Sabbir',
    mac_address: '48:2C:A0:9C:D6:87',
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    groups: [{ id: 'g2', name: 'Friends', is_protected: false, created_at: '', updated_at: '' }],
  },
  {
    id: '3',
    name: 'TP-Link-Anik',
    mac_address: '3C:84:6A:48:01:DC',
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
  enabled: true, // true = MAC auth ON (forwarding dest 'unspecified')
  disabled_until: null,
};

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
    setMockAccounts: (a: Account[]) => { mockAccounts = a; },
    setMockUsers: (u: UserWithGroups[]) => { mockUsers = u; },
    setMockGroups: (g: Group[]) => { mockGroups = g; },
    setMockDraftChanges: (d: DraftChange[]) => { mockDraftChanges = d; },
    setMockVersion: (v: number) => { mockVersion = v; },
    setMockLastApplied: (l: string) => { mockLastApplied = l; },
    setMockMacAuth: (m: MacAuthSettings) => { mockMacAuth = m; },
  };
}

