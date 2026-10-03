import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getMockState } from '@/lib/mock-store';
import { Group } from '@/lib/types';
import { getSessionFromRequest } from '@/lib/auth';
import { cacheGet, cacheSet, cacheDelPrefix } from '@/lib/cache';
import {
  reassignGroupOnDeleteSupabase,
  reassignGroupOnDeleteMock,
  checkAndResolveNoInternetSupabase,
  checkAndResolveNoInternetMock,
} from '@/lib/group-service';

const GROUPS_CACHE_KEY = 'cache:groups:list';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function invalidateGroupsAndUsersCache() {
  await Promise.all([
    cacheDelPrefix('cache:groups:'),
    cacheDelPrefix('cache:users:'),
  ]);
}

// GET all groups
export async function GET(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
  }

  const cached = await cacheGet<Group[]>(GROUPS_CACHE_KEY);
  if (cached) {
    return NextResponse.json(
      { groups: cached },
      { headers: { 'X-Cache': 'HIT', 'Cache-Control': 'private, no-cache' } }
    );
  }

  const supabase = getServiceSupabase();
  const isSupabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http')
  );

  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('groups').select('*').order('name');
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const groups = data || [];
    await cacheSet(GROUPS_CACHE_KEY, groups, 60);
    return NextResponse.json(
      { groups },
      { headers: { 'X-Cache': 'MISS', 'Cache-Control': 'private, no-cache' } }
    );
  } else {
    const state = getMockState();
    await cacheSet(GROUPS_CACHE_KEY, state.mockGroups, 60);
    return NextResponse.json(
      { groups: state.mockGroups },
      { headers: { 'X-Cache': 'MISS', 'Cache-Control': 'private, no-cache' } }
    );
  }
}

// POST create group
export async function POST(request: Request) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
    }

    const body = await request.json();
    const { name, is_protected, is_no_internet } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
    }

    const trimmedName = name.trim();
    const shouldProtect = Boolean(is_protected);
    const shouldNoInternet = Boolean(is_no_internet);

    if (shouldProtect && shouldNoInternet) {
      return NextResponse.json({ error: 'A group cannot be both Protected and No Internet.' }, { status: 400 });
    }

    // Only admin can create protected or no internet groups
    if ((shouldProtect || shouldNoInternet) && session.role !== 'admin') {
      return NextResponse.json({ error: 'Only administrators can create protected or No Internet groups.' }, { status: 403 });
    }

    const supabase = getServiceSupabase();
    const isSupabaseConfigured = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http')
    );

    if (isSupabaseConfigured) {
      const { data: existing } = await supabase
        .from('groups')
        .select('id')
        .ilike('name', trimmedName)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ error: `Group "${trimmedName}" already exists` }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('groups')
        .insert({ name: trimmedName, is_protected: shouldProtect, is_no_internet: shouldNoInternet })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      await invalidateGroupsAndUsersCache();
      return NextResponse.json({ success: true, group: data });
    } else {
      const state = getMockState();
      const duplicate = state.mockGroups.some(
        (g) => g.name.toLowerCase() === trimmedName.toLowerCase()
      );
      if (duplicate) {
        return NextResponse.json({ error: `Group "${trimmedName}" already exists` }, { status: 400 });
      }

      const newGroup: Group = {
        id: 'group-' + Date.now(),
        name: trimmedName,
        is_protected: shouldProtect,
        is_no_internet: shouldNoInternet,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      state.setMockGroups([...state.mockGroups, newGroup]);
      await invalidateGroupsAndUsersCache();
      return NextResponse.json({ success: true, group: newGroup });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

// DELETE group: Reassign all users from this group to 'Default' group
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('id');

    if (!groupId) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
    }

    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
    }

    const supabase = getServiceSupabase();
    const isSupabaseConfigured = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http')
    );

    // Verify protection status
    if (isSupabaseConfigured) {
      const { data: targetGroup } = await supabase.from('groups').select('*').eq('id', groupId).maybeSingle();
      if (targetGroup?.is_protected && session.role !== 'admin') {
        return NextResponse.json({ error: 'Only administrators can delete protected groups.' }, { status: 403 });
      }

      const result = await reassignGroupOnDeleteSupabase(supabase, groupId);
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      await invalidateGroupsAndUsersCache();
      return NextResponse.json({
        success: true,
        message: `Group deleted. Users successfully reassigned to "${result.defaultGroupName}".`,
      });
    } else {
      const state = getMockState();
      const targetGroup = state.mockGroups.find((g) => g.id === groupId);
      if (targetGroup?.is_protected && session.role !== 'admin') {
        return NextResponse.json({ error: 'Only administrators can delete protected groups.' }, { status: 403 });
      }

      const result = reassignGroupOnDeleteMock(state, groupId);
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      await invalidateGroupsAndUsersCache();
      return NextResponse.json({
        success: true,
        message: `Group deleted. Users successfully reassigned to "${result.defaultGroupName}".`,
      });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

// PATCH toggle group protection, no internet status, or rename
export async function PATCH(request: Request) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
    }

    const body = await request.json();
    const { id, is_protected, is_no_internet, name, conflict_action } = body;

    if (!id) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
    }

    // Role check: Only admin can toggle protection or no_internet status
    if (
      (is_protected !== undefined || is_no_internet !== undefined) &&
      session.role !== 'admin'
    ) {
      return NextResponse.json(
        { error: 'Only administrators can change group protection or No Internet status.' },
        { status: 403 }
      );
    }

    const supabase = getServiceSupabase();
    const isSupabaseConfigured = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http')
    );

    if (isSupabaseConfigured) {
      const { data: currentGroup, error: fetchErr } = await supabase
        .from('groups')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
      if (!currentGroup) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

      // Default group validation
      if (currentGroup.name.toLowerCase() === 'default') {
        if (is_protected === true || is_no_internet === true || (name && name.trim().toLowerCase() !== 'default')) {
          return NextResponse.json(
            { error: 'The "Default" fallback group cannot be renamed, protected, or tagged as No Internet.' },
            { status: 400 }
          );
        }
      }

      // Incompatibility check
      if (is_protected === true && (currentGroup.is_no_internet || is_no_internet === true)) {
        return NextResponse.json({ error: 'A group cannot be both Protected and No Internet.' }, { status: 400 });
      }
      if (is_no_internet === true && (currentGroup.is_protected || is_protected === true)) {
        return NextResponse.json({ error: 'A group cannot be both Protected and No Internet.' }, { status: 400 });
      }

      // If enabling No Internet, check member conflicts
      if (is_no_internet === true) {
        const conflictRes = await checkAndResolveNoInternetSupabase(supabase, id, conflict_action);
        if ('protectedConflict' in conflictRes && conflictRes.protectedConflict) {
          return NextResponse.json({ error: conflictRes.error, protected_conflict: true }, { status: 400 });
        }
        if (conflictRes.conflict) {
          return NextResponse.json({
            conflict: true,
            message: conflictRes.message,
            conflicts: conflictRes.conflicts,
          });
        }
      }

      const updateData: any = { updated_at: new Date().toISOString() };
      if (is_protected !== undefined) updateData.is_protected = Boolean(is_protected);
      if (is_no_internet !== undefined) updateData.is_no_internet = Boolean(is_no_internet);
      if (name && typeof name === 'string') updateData.name = name.trim();

      const { data, error } = await supabase
        .from('groups')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      await invalidateGroupsAndUsersCache();
      return NextResponse.json({ success: true, group: data });
    } else {
      // Mock mode
      const state = getMockState();
      const currentGroup = state.mockGroups.find((g) => g.id === id);
      if (!currentGroup) {
        return NextResponse.json({ error: 'Group not found' }, { status: 404 });
      }

      if (currentGroup.name.toLowerCase() === 'default') {
        if (is_protected === true || is_no_internet === true || (name && name.trim().toLowerCase() !== 'default')) {
          return NextResponse.json(
            { error: 'The "Default" fallback group cannot be renamed, protected, or tagged as No Internet.' },
            { status: 400 }
          );
        }
      }

      if (is_protected === true && (currentGroup.is_no_internet || is_no_internet === true)) {
        return NextResponse.json({ error: 'A group cannot be both Protected and No Internet.' }, { status: 400 });
      }
      if (is_no_internet === true && (currentGroup.is_protected || is_protected === true)) {
        return NextResponse.json({ error: 'A group cannot be both Protected and No Internet.' }, { status: 400 });
      }

      if (is_no_internet === true) {
        const conflictRes = checkAndResolveNoInternetMock(state, id, conflict_action);
        if ('protectedConflict' in conflictRes && conflictRes.protectedConflict) {
          return NextResponse.json({ error: conflictRes.error, protected_conflict: true }, { status: 400 });
        }
        if (conflictRes.conflict) {
          return NextResponse.json({
            conflict: true,
            message: conflictRes.message,
            conflicts: conflictRes.conflicts,
          });
        }
      }

      const updatedGroup: Group = {
        ...currentGroup,
        is_protected: is_protected !== undefined ? Boolean(is_protected) : currentGroup.is_protected,
        is_no_internet: is_no_internet !== undefined ? Boolean(is_no_internet) : currentGroup.is_no_internet,
        name: name && typeof name === 'string' ? name.trim() : currentGroup.name,
        updated_at: new Date().toISOString(),
      };

      state.setMockGroups(state.mockGroups.map((g) => (g.id === id ? updatedGroup : g)));
      await invalidateGroupsAndUsersCache();
      return NextResponse.json({ success: true, group: updatedGroup });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
