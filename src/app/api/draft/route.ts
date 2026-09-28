import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { normalizeMac } from '@/lib/normalize-mac';
import { normalizeName } from '@/lib/normalize-name';
import { DraftChange } from '@/lib/types';
import { getMockState } from '@/lib/mock-store';
import { getSessionFromRequest } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { operation, user_id, name, mac_address, group_ids } = body;

    if (!operation || !['ADD', 'MODIFY', 'DELETE'].includes(operation)) {
      return NextResponse.json({ error: 'Invalid draft operation' }, { status: 400 });
    }

    let normalizedMacStr = '';
    let normalizedNameStr = '';

    if (operation === 'ADD' || operation === 'MODIFY') {
      const macResult = normalizeMac(mac_address);
      if (!macResult.valid) {
        return NextResponse.json({ error: macResult.error }, { status: 400 });
      }
      normalizedMacStr = macResult.normalized;

      const nameResult = normalizeName(name);
      if (!nameResult.valid) {
        return NextResponse.json({ error: nameResult.error }, { status: 400 });
      }
      normalizedNameStr = nameResult.normalized;
    }

    const supabase = getServiceSupabase();
    const isSupabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http'));

    // Ensure every user is assigned to at least the 'Default' group
    let resolvedGroupIds = group_ids && Array.isArray(group_ids) && group_ids.length > 0 ? group_ids : [];

    if (operation !== 'DELETE' && resolvedGroupIds.length === 0) {
      if (isSupabaseConfigured) {
        let { data: defaultGroup } = await supabase
          .from('groups')
          .select('id')
          .ilike('name', 'Default')
          .maybeSingle();

        if (!defaultGroup) {
          const { data: newDef } = await supabase.from('groups').insert({ name: 'Default' }).select('id').single();
          defaultGroup = newDef;
        }

        if (defaultGroup?.id) {
          resolvedGroupIds = [defaultGroup.id];
        }
      } else {
        const state = getMockState();
        let defaultGroup = state.mockGroups.find((g) => g.name.toLowerCase() === 'default');
        if (!defaultGroup) {
          defaultGroup = { id: 'g-default', name: 'Default', created_at: '', updated_at: '' };
          state.setMockGroups([defaultGroup, ...state.mockGroups]);
        }
        resolvedGroupIds = [defaultGroup.id];
      }
    }

    // Session check for role authorization on protected groups
    const session = getSessionFromRequest(request);

    // If caller is subadmin, verify they are not modifying or assigning protected groups
    if (session && session.role === 'subadmin') {
      const state = getMockState();

      // 1. Check if user is being assigned to any protected group
      if (operation !== 'DELETE' && resolvedGroupIds.length > 0) {
        let hasProtectedGroup = false;
        if (isSupabaseConfigured) {
          const { data: protGroups } = await supabase
            .from('groups')
            .select('id, name')
            .in('id', resolvedGroupIds)
            .eq('is_protected', true);
          if (protGroups && protGroups.length > 0) hasProtectedGroup = true;
        } else {
          hasProtectedGroup = state.mockGroups.some(
            (g) => resolvedGroupIds.includes(g.id) && g.is_protected
          );
        }

        if (hasProtectedGroup) {
          return NextResponse.json(
            { error: 'Subadmins cannot assign users to protected groups. Administrator access required.' },
            { status: 403 }
          );
        }
      }

      // 2. Check if existing user being modified or deleted has any protected group
      if ((operation === 'MODIFY' || operation === 'DELETE') && user_id) {
        let userHasProtected = false;
        if (isSupabaseConfigured) {
          const { data: userG } = await supabase
            .from('user_groups')
            .select('groups ( is_protected )')
            .eq('user_id', user_id);
          userHasProtected = (userG || []).some((ug: any) => ug.groups?.is_protected);
        } else {
          const existingUser = state.mockUsers.find((u) => u.id === user_id);
          userHasProtected = Boolean(existingUser?.groups?.some((g) => g.is_protected));
        }

        if (userHasProtected) {
          return NextResponse.json(
            { error: 'Subadmins cannot edit or delete users in protected groups. Administrator access required.' },
            { status: 403 }
          );
        }
      }
    }

    if (isSupabaseConfigured) {
      if (operation === 'ADD') {
        const { data: existingUser } = await supabase
          .from('users')
          .select('id, name')
          .eq('mac_address', normalizedMacStr)
          .maybeSingle();

        if (existingUser) {
          return NextResponse.json({ error: `MAC address ${normalizedMacStr} already assigned to user ${existingUser.name}` }, { status: 400 });
        }
      }

      const newChange = {
        draft_id: 'current',
        operation,
        user_id: user_id || null,
        user_data: operation !== 'DELETE' ? {
          name: normalizedNameStr,
          mac_address: normalizedMacStr,
          group_ids: resolvedGroupIds,
        } : null,
      };

      const { data, error } = await supabase
        .from('draft_changes')
        .insert(newChange)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, change: data });
    } else {
      const state = getMockState();
      const changeId = 'mock-change-' + Date.now();
      const newChange: DraftChange = {
        id: changeId,
        operation,
        user_id: user_id || null,
        user_data: operation !== 'DELETE' ? {
          name: normalizedNameStr,
          mac_address: normalizedMacStr,
          group_ids: resolvedGroupIds,
        } : null,
        created_at: new Date().toISOString(),
        sequence: state.mockDraftChanges.length + 1,
      };

      state.setMockDraftChanges([...state.mockDraftChanges, newChange]);
      return NextResponse.json({ success: true, change: newChange });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  const supabase = getServiceSupabase();
  const isSupabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http'));

  if (action === 'undo') {
    if (isSupabaseConfigured) {
      const { data: latestChange } = await supabase
        .from('draft_changes')
        .select('id, sequence')
        .order('sequence', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!latestChange) {
        return NextResponse.json({ message: 'No pending changes to undo' });
      }

      await supabase.from('draft_changes').delete().eq('id', latestChange.id);
      return NextResponse.json({ success: true, undone_id: latestChange.id });
    } else {
      const state = getMockState();
      if (state.mockDraftChanges.length === 0) {
        return NextResponse.json({ message: 'No pending changes to undo' });
      }
      const updated = [...state.mockDraftChanges];
      const removed = updated.pop();
      state.setMockDraftChanges(updated);
      return NextResponse.json({ success: true, undone_id: removed?.id });
    }
  }

  if (isSupabaseConfigured) {
    await supabase.from('draft_changes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    return NextResponse.json({ success: true, message: 'All draft changes discarded' });
  } else {
    const state = getMockState();
    state.setMockDraftChanges([]);
    return NextResponse.json({ success: true, message: 'All draft changes discarded' });
  }
}
