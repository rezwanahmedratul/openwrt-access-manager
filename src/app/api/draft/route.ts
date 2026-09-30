import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { normalizeMac } from '@/lib/normalize-mac';
import { normalizeName } from '@/lib/normalize-name';
import { DraftChange } from '@/lib/types';
import { getMockState } from '@/lib/mock-store';
import { getSessionFromRequest } from '@/lib/auth';
import { cacheDelPrefix } from '@/lib/cache';
import {
  resolveDefaultGroup,
  validateGroupCompatibility,
  checkSubadminProtection,
  checkMacConflict,
  checkNameConflict,
} from '@/lib/draft-service';

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
    const isSupabaseConfigured = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http')
    );

    // Ensure every user is assigned to at least the 'Default' group
    let resolvedGroupIds = group_ids && Array.isArray(group_ids) && group_ids.length > 0 ? group_ids : [];
    if (operation !== 'DELETE') {
      resolvedGroupIds = await resolveDefaultGroup(resolvedGroupIds, supabase, isSupabaseConfigured);
    }

    // Rule: Exclusive internet state and protected group compatibility
    if (operation !== 'DELETE' && resolvedGroupIds.length > 0) {
      const compat = await validateGroupCompatibility(resolvedGroupIds, supabase, isSupabaseConfigured);
      if (!compat.valid) {
        return NextResponse.json({ error: compat.error }, { status: 400 });
      }
    }

    // Session check for role authorization on protected groups
    const session = getSessionFromRequest(request);
    const subadminCheck = await checkSubadminProtection(
      operation,
      resolvedGroupIds,
      user_id,
      session,
      supabase,
      isSupabaseConfigured
    );
    if (!subadminCheck.allowed) {
      return NextResponse.json({ error: subadminCheck.error }, { status: 403 });
    }

    // Check duplicate or conflicting MAC addresses
    const macCheck = await checkMacConflict(
      operation,
      normalizedMacStr,
      user_id,
      supabase,
      isSupabaseConfigured
    );
    if (macCheck.conflict) {
      return NextResponse.json({ error: macCheck.error }, { status: 400 });
    }

    // Check duplicate or conflicting User names
    const nameCheck = await checkNameConflict(
      operation,
      normalizedNameStr,
      user_id,
      supabase,
      isSupabaseConfigured
    );
    if (nameCheck.conflict) {
      return NextResponse.json({ error: nameCheck.error }, { status: 400 });
    }

    if (isSupabaseConfigured) {
      const newChange = {
        draft_id: 'current',
        operation,
        user_id: user_id || null,
        user_data:
          operation !== 'DELETE'
            ? {
                name: normalizedNameStr,
                mac_address: normalizedMacStr,
                group_ids: resolvedGroupIds,
              }
            : null,
      };

      const { data, error } = await supabase
        .from('draft_changes')
        .insert(newChange)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      await cacheDelPrefix('cache:users:');
      return NextResponse.json({ success: true, change: data });
    } else {
      const state = getMockState();
      const changeId = 'mock-change-' + Date.now();
      const newChange: DraftChange = {
        id: changeId,
        operation,
        user_id: user_id || null,
        user_data:
          operation !== 'DELETE'
            ? {
                name: normalizedNameStr,
                mac_address: normalizedMacStr,
                group_ids: resolvedGroupIds,
              }
            : null,
        created_at: new Date().toISOString(),
        sequence: state.mockDraftChanges.length + 1,
      };

      state.setMockDraftChanges([...state.mockDraftChanges, newChange]);
      await cacheDelPrefix('cache:users:');
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
  const isSupabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http')
  );

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
      await cacheDelPrefix('cache:users:');
      return NextResponse.json({ success: true, undone_id: latestChange.id });
    } else {
      const state = getMockState();
      if (state.mockDraftChanges.length === 0) {
        return NextResponse.json({ message: 'No pending changes to undo' });
      }
      const updated = [...state.mockDraftChanges];
      const removed = updated.pop();
      state.setMockDraftChanges(updated);
      await cacheDelPrefix('cache:users:');
      return NextResponse.json({ success: true, undone_id: removed?.id });
    }
  }

  if (isSupabaseConfigured) {
    await supabase.from('draft_changes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await cacheDelPrefix('cache:users:');
    return NextResponse.json({ success: true, message: 'All draft changes discarded' });
  } else {
    const state = getMockState();
    state.setMockDraftChanges([]);
    await cacheDelPrefix('cache:users:');
    return NextResponse.json({ success: true, message: 'All draft changes discarded' });
  }
}
