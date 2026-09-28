import { UserWithGroups, Group, DraftChange } from './types';

let mockUsers: UserWithGroups[] = [
  {
    id: '1',
    name: 'Ratul',
    mac_address: '64:DD:E9:D3:C6:AB',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    groups: [
      { id: 'g1', name: 'Family', created_at: '', updated_at: '' },
      { id: 'g3', name: 'Students', created_at: '', updated_at: '' },
    ],
  },
  {
    id: '2',
    name: 'Sabbir',
    mac_address: '48:2C:A0:9C:D6:87',
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    groups: [{ id: 'g2', name: 'Friends', created_at: '', updated_at: '' }],
  },
  {
    id: '3',
    name: 'TP-Link-Anik',
    mac_address: '3C:84:6A:48:01:DC',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    groups: [{ id: 'g5', name: 'Devices', created_at: '', updated_at: '' }],
  },
];

let mockGroups: Group[] = [
  { id: 'g-default', name: 'Default', created_at: '', updated_at: '' },
  { id: 'g1', name: 'Family', created_at: '', updated_at: '' },
  { id: 'g2', name: 'Friends', created_at: '', updated_at: '' },
  { id: 'g3', name: 'Students', created_at: '', updated_at: '' },
  { id: 'g4', name: 'Guests', created_at: '', updated_at: '' },
  { id: 'g5', name: 'Devices', created_at: '', updated_at: '' },
  { id: 'g6', name: 'Others', created_at: '', updated_at: '' },
];

let mockDraftChanges: DraftChange[] = [];
let mockVersion = 1;
let mockLastApplied: string | null = new Date(Date.now() - 86400000).toISOString();

export function getMockState() {
  return {
    mockUsers,
    mockGroups,
    mockDraftChanges,
    mockVersion,
    mockLastApplied,
    setMockUsers: (u: UserWithGroups[]) => { mockUsers = u; },
    setMockGroups: (g: Group[]) => { mockGroups = g; },
    setMockDraftChanges: (d: DraftChange[]) => { mockDraftChanges = d; },
    setMockVersion: (v: number) => { mockVersion = v; },
    setMockLastApplied: (l: string) => { mockLastApplied = l; },
  };
}
