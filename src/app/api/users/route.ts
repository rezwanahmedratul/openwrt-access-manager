import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { UserWithGroups, Group, DraftChange, UserViewModel } from '@/lib/types';
import { normalizeMac } from '@/lib/normalize-mac';
import { getMockState } from '@/lib/mock-store';
import { cacheGet, cacheSet } from '@/lib/cache';
import { getMacAuthSettings } from '@/lib/mac-auth';
import { getSessionFromRequest } from '@/lib/auth';
import { getMacVendor } from '@/lib/mac-vendors';

export const dynamic = 'force-dynamic';

const USERS_CACHE_KEY = 'cache:users:raw';
const USERS_CACHE_TTL = 30; // 30 seconds TTL, invalidated on mutations

interface RawUsersData {
  appliedUsers: UserWithGroups[];
  groups: Group[];
  draftChanges: DraftChange[];
  currentVersion: number | null;
  lastApplied: string | null;
}

export async function GET(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const groupFilter = searchParams.get('group') || '';

  // Check and sync MAC auth expiration before querying database/cache
  const macAuth = await getMacAuthSettings();

  const mock = getMockState();
  let rawData: RawUsersData | null = null;
  let cacheHit = false;

  // Try Redis / Memory Cache first
  rawData = await cacheGet<RawUsersData>(USERS_CACHE_KEY);
  if (rawData) {
    cacheHit = true;
  } else {
    const isSupabaseConfigured = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http')
    );

    let appliedUsers: UserWithGroups[] = [];
    let groups: Group[] = [];
    let draftChanges: DraftChange[] = [];
    let currentVersion: number | null = null;
    let lastApplied: string | null = null;
    let querySucceeded = false;

    if (isSupabaseConfigured) {
      try {
        const supabase = getServiceSupabase();
        const [
          groupRes,
          userRes,
          changesRes,
          configRes,
        ] = await Promise.all([
          supabase.from('groups').select('*').order('name'),
          supabase
            .from('users')
            .select(`
              id, name, mac_address, created_at, updated_at,
              user_groups (
                group_id,
                groups ( id, name, is_protected, is_no_internet, created_at, updated_at )
              )
            `)
            .order('name'),
          supabase
            .from('draft_changes')
            .select('*')
            .order('sequence', { ascending: true }),
          supabase
            .from('configurations')
            .select('version, created_at')
            .eq('is_current', true)
            .maybeSingle(),
        ]);

        if (groupRes.error) throw groupRes.error;
        if (userRes.error) throw userRes.error;
        if (changesRes.error) throw changesRes.error;
        if (configRes.error && configRes.error.code !== 'PGRST116') throw configRes.error;

        groups = groupRes.data || [];

        if (userRes.data) {
          appliedUsers = userRes.data.map((u: any) => ({
            id: u.id,
            name: u.name,
            mac_address: u.mac_address,
            created_at: u.created_at,
            updated_at: u.updated_at,
            groups: u.user_groups?.map((ug: any) => ug.groups).filter(Boolean) || [],
          }));
        }

        draftChanges = changesRes.data || [];

        if (configRes.data) {
          currentVersion = configRes.data.version;
          lastApplied = configRes.data.created_at;
        }

        querySucceeded = true;
      } catch (e) {
        console.error('Supabase query error, falling back to mock:', e);
        appliedUsers = mock.mockUsers;
        groups = mock.mockGroups;
        draftChanges = mock.mockDraftChanges;
        currentVersion = mock.mockVersion;
        lastApplied = mock.mockLastApplied;
      }
    } else {
      appliedUsers = mock.mockUsers.map((u) => ({
        ...u,
        groups: u.groups.map((ug) => mock.mockGroups.find((mg) => mg.id === ug.id) || ug),
      }));
      groups = mock.mockGroups;
      draftChanges = mock.mockDraftChanges;
      currentVersion = mock.mockVersion;
      lastApplied = mock.mockLastApplied;
      querySucceeded = true;
    }

    rawData = {
      appliedUsers,
      groups,
      draftChanges,
      currentVersion,
      lastApplied,
    };

    // Only cache if the query actually succeeded
    if (querySucceeded) {
      await cacheSet(USERS_CACHE_KEY, rawData, USERS_CACHE_TTL);
    }
  }

  const { appliedUsers, groups, draftChanges, currentVersion, lastApplied } = rawData;

  // Ensure Default group always exists
  let defaultGroup = groups.find((g) => g.name.toLowerCase() === 'default');
  let finalGroups = groups;
  if (!defaultGroup) {
    defaultGroup = { id: 'g-default', name: 'Default', is_protected: false, created_at: '', updated_at: '' };
    finalGroups = [defaultGroup, ...groups];
  }

  const routerLastSeen = await cacheGet<string>('telemetry:router:last_seen');

  const viewMap = new Map<string, UserViewModel>();

  for (const u of appliedUsers) {
    const userGroups = u.groups && u.groups.length > 0 ? u.groups : [defaultGroup];
    viewMap.set(u.id, {
      id: u.id,
      name: u.name,
      mac_address: u.mac_address,
      vendor: getMacVendor(u.mac_address),
      groups: userGroups,
      status: 'applied',
    });
  }

  for (const change of draftChanges) {
    if (change.operation === 'ADD') {
      const tempId = `draft-add-${change.id}`;
      const changeGroups = finalGroups.filter((g) => change.user_data?.group_ids?.includes(g.id));
      const finalChangeGroups = changeGroups.length > 0 ? changeGroups : [defaultGroup];
      const changeMac = change.user_data?.mac_address || '';
      viewMap.set(tempId, {
        id: tempId,
        name: change.user_data?.name || '',
        mac_address: changeMac,
        vendor: changeMac ? getMacVendor(changeMac) : null,
        groups: finalChangeGroups,
        status: 'added',
        draft_change_id: change.id,
      });
    } else if (change.operation === 'MODIFY' && change.user_id) {
      const existing = viewMap.get(change.user_id);
      if (existing) {
        const changeGroups = finalGroups.filter((g) => change.user_data?.group_ids?.includes(g.id));
        const finalChangeGroups = changeGroups.length > 0 ? changeGroups : [defaultGroup];
        const updatedMac = change.user_data?.mac_address || existing.mac_address;
        viewMap.set(change.user_id, {
          ...existing,
          name: change.user_data?.name || existing.name,
          mac_address: updatedMac,
          vendor: getMacVendor(updatedMac),
          groups: finalChangeGroups,
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
    finalUsers = finalUsers.filter((u) => u.groups.some((g) => g.id === groupFilter || g.name.toLowerCase() === groupFilter.toLowerCase()));
  }

  return NextResponse.json(
    {
      users: finalUsers,
      groups: finalGroups,
      stats: {
        total_users: appliedUsers.length,
        total_groups: finalGroups.length,
        pending_changes: draftChanges.length,
        current_version: currentVersion,
        last_applied: lastApplied,
        mac_auth: macAuth,
        router_last_seen: routerLastSeen || null,
      },
      draft_changes: draftChanges,
    },
    {
      headers: {
        'X-Cache': cacheHit ? 'HIT' : 'MISS',
        'Cache-Control': 'private, no-cache, no-transform',
      },
    }
  );
}
