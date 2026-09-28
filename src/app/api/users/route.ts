import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { UserWithGroups, Group, DraftChange, UserViewModel } from '@/lib/types';
import { normalizeMac } from '@/lib/normalize-mac';
import { getMockState } from '@/lib/mock-store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const groupFilter = searchParams.get('group') || '';

  const supabase = getServiceSupabase();
  const isSupabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http'));

  const mock = getMockState();
  let appliedUsers: UserWithGroups[] = [];
  let groups: Group[] = [];
  let draftChanges: DraftChange[] = [];
  let currentVersion: number | null = null;
  let lastApplied: string | null = null;

  if (isSupabaseConfigured) {
    try {
      const { data: groupData } = await supabase.from('groups').select('*').order('name');
      groups = groupData || [];

      const { data: userData } = await supabase
        .from('users')
        .select(`
          id, name, mac_address, created_at, updated_at,
          user_groups (
            group_id,
            groups ( id, name, created_at, updated_at )
          )
        `)
        .order('name');

      if (userData) {
        appliedUsers = userData.map((u: any) => ({
          id: u.id,
          name: u.name,
          mac_address: u.mac_address,
          created_at: u.created_at,
          updated_at: u.updated_at,
          groups: u.user_groups?.map((ug: any) => ug.groups).filter(Boolean) || [],
        }));
      }

      const { data: changesData } = await supabase
        .from('draft_changes')
        .select('*')
        .order('sequence', { ascending: true });

      draftChanges = changesData || [];

      const { data: configData } = await supabase
        .from('configurations')
        .select('version, created_at')
        .eq('is_current', true)
        .maybeSingle();

      if (configData) {
        currentVersion = configData.version;
        lastApplied = configData.created_at;
      }
    } catch (e) {
      console.error('Supabase query error, falling back to mock:', e);
      appliedUsers = mock.mockUsers;
      groups = mock.mockGroups;
      draftChanges = mock.mockDraftChanges;
      currentVersion = mock.mockVersion;
      lastApplied = mock.mockLastApplied;
    }
  } else {
    appliedUsers = mock.mockUsers;
    groups = mock.mockGroups;
    draftChanges = mock.mockDraftChanges;
    currentVersion = mock.mockVersion;
    lastApplied = mock.mockLastApplied;
  }

  const viewMap = new Map<string, UserViewModel>();

  for (const u of appliedUsers) {
    viewMap.set(u.id, {
      id: u.id,
      name: u.name,
      mac_address: u.mac_address,
      groups: u.groups,
      status: 'applied',
    });
  }

  for (const change of draftChanges) {
    if (change.operation === 'ADD') {
      const tempId = `draft-add-${change.id}`;
      const changeGroups = groups.filter((g) => change.user_data?.group_ids?.includes(g.id));
      viewMap.set(tempId, {
        id: tempId,
        name: change.user_data?.name || '',
        mac_address: change.user_data?.mac_address || '',
        groups: changeGroups,
        status: 'added',
        draft_change_id: change.id,
      });
    } else if (change.operation === 'MODIFY' && change.user_id) {
      const existing = viewMap.get(change.user_id);
      if (existing) {
        const changeGroups = groups.filter((g) => change.user_data?.group_ids?.includes(g.id));
        viewMap.set(change.user_id, {
          ...existing,
          name: change.user_data?.name || existing.name,
          mac_address: change.user_data?.mac_address || existing.mac_address,
          groups: changeGroups,
          status: 'modified',
          draft_change_id: change.id,
        });
      }
    } else if (change.operation === 'DELETE' && change.user_id) {
      const existing = viewMap.get(change.user_id);
      if (existing) {
        if (existing.status === 'added') {
          viewMap.delete(change.user_id);
        } else {
          viewMap.set(change.user_id, {
            ...existing,
            status: 'deleted',
            draft_change_id: change.id,
          });
        }
      }
    }
  }

  let finalUsers = Array.from(viewMap.values());

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    const normalizedSearchMac = normalizeMac(search).normalized.toLowerCase();

    finalUsers = finalUsers.filter((u) => {
      const nameMatch = u.name.toLowerCase().includes(q);
      const macCleanMatch = u.mac_address.toLowerCase().replace(/[:\-]/g, '').includes(q.replace(/[:\-]/g, ''));
      const normalizedMatch = normalizedSearchMac && u.mac_address.toLowerCase().includes(normalizedSearchMac);
      return nameMatch || macCleanMatch || Boolean(normalizedMatch);
    });
  }

  if (groupFilter && groupFilter !== 'ALL') {
    if (groupFilter === 'UNGROUPED') {
      finalUsers = finalUsers.filter((u) => u.groups.length === 0);
    } else {
      finalUsers = finalUsers.filter((u) => u.groups.some((g) => g.id === groupFilter || g.name.toLowerCase() === groupFilter.toLowerCase()));
    }
  }

  return NextResponse.json({
    users: finalUsers,
    groups,
    stats: {
      total_users: appliedUsers.length,
      total_groups: groups.length,
      pending_changes: draftChanges.length,
      current_version: currentVersion,
      last_applied: lastApplied,
    },
    draft_changes: draftChanges,
  });
}
