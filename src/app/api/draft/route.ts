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

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/draft - List all pending draft changes
export async function GET(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
  }

  const isSupabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http')
  );

  if (isSupabaseConfigured) {
    try {
      const supabase = getServiceSupabase();
      const { data, error } = await supabase
        .from('draft_changes')
        .select('*')
        .order('sequence', { ascending: true });

      if (error) throw error;
      const changes = data || [];
      return NextResponse.json({
        draft_changes: changes,
        count: changes.length,
      });
    } catch (e: any) {
      console.error('Supabase query draft changes error, falling back to mock:', e);
    }
  }

  const state = getMockState();
  return NextResponse.json({
    draft_changes: state.mockDraftChanges,
    count: state.mockDraftChanges.length,
  });
}

interface DraftOperationItem {
  operation: 'ADD' | 'MODIFY' | 'DELETE';
  user_id?: string | null;
  name?: string;
  mac_address?: string;
  group_ids?: string[];
}

async function validateAndPrepareChange(
  item: DraftOperationItem,
  session: any,
  supabase: any,
  isSupabaseConfigured: boolean
): Promise<{ error?: string; status?: number; changeData?: any }> {
  const { operation, user_id, name, mac_address, group_ids } = item;

  if (!operation || !['ADD', 'MODIFY', 'DELETE'].includes(operation)) {
    return { error: 'Invalid draft operation', status: 400 };
  }

  let normalizedMacStr = '';
  let normalizedNameStr = '';

  if (operation === 'ADD' || operation === 'MODIFY') {
    const macResult = normalizeMac(mac_address || '');
    if (!macResult.valid) {
      return { error: macResult.error, status: 400 };
    }
    normalizedMacStr = macResult.normalized;

    const nameResult = normalizeName(name || '');
    if (!nameResult.valid) {
      return { error: nameResult.error, status: 400 };
    }
    normalizedNameStr = nameResult.normalized;
  }

  let resolvedGroupIds = group_ids && Array.isArray(group_ids) && group_ids.length > 0 ? group_ids : [];
  if (operation !== 'DELETE') {
    resolvedGroupIds = await resolveDefaultGroup(resolvedGroupIds, supabase, isSupabaseConfigured);
  }

  if (operation !== 'DELETE' && resolvedGroupIds.length > 0) {
    const compat = await validateGroupCompatibility(resolvedGroupIds, supabase, isSupabaseConfigured);
    if (!compat.valid) {
      return { error: compat.error, status: 400 };
    }
  }

  const subadminCheck = await checkSubadminProtection(
    operation,
    resolvedGroupIds,
    user_id || undefined,
    session,
    supabase,
    isSupabaseConfigured
  );
  if (!subadminCheck.allowed) {
    return { error: subadminCheck.error, status: 403 };
  }

  const macCheck = await checkMacConflict(
    operation,
    normalizedMacStr,
    user_id || undefined,
    supabase,
    isSupabaseConfigured
  );
  if (macCheck.conflict) {
    return { error: macCheck.error, status: 400 };
  }

  const nameCheck = await checkNameConflict(
    operation,
    normalizedNameStr,
    user_id || undefined,
    supabase,
    isSupabaseConfigured
  );
  if (nameCheck.conflict) {
    return { error: nameCheck.error, status: 400 };
  }

  const changeData = {
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

  return { changeData };
}

// POST /api/draft - Add single or batch draft changes
export async function POST(request: Request) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
    }

    const body = await request.json();
    const isBatch = Array.isArray(body) || (body && Array.isArray(body.operations));
    const items: DraftOperationItem[] = isBatch
      ? Array.isArray(body)
        ? body
        : body.operations
      : [body];

    if (items.length === 0) {
      return NextResponse.json({ error: 'No draft operations provided' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const isSupabaseConfigured = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http')
    );

    const preparedChanges: any[] = [];

    // Validate all items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const result = await validateAndPrepareChange(item, session, supabase, isSupabaseConfigured);
      if (result.error) {
        return NextResponse.json(
          { error: `Item ${i + 1}: ${result.error}`, item_index: i },
          { status: result.status || 400 }
        );
      }
      preparedChanges.push(result.changeData);
    }

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('draft_changes')
        .insert(preparedChanges)
        .select();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      await cacheDelPrefix('cache:users:');
      return NextResponse.json({
        success: true,
        count: data.length,
        changes: data,
        change: data[0],
      });
    } else {
      const state = getMockState();
      const currentList = [...state.mockDraftChanges];
      const newMockChanges: DraftChange[] = [];

      for (let i = 0; i < preparedChanges.length; i++) {
        const prep = preparedChanges[i];
        const newChange: DraftChange = {
          id: 'mock-change-' + (Date.now() + i),
          operation: prep.operation,
          user_id: prep.user_id,
          user_data: prep.user_data,
          created_at: new Date().toISOString(),
          sequence: currentList.length + i + 1,
        };
        newMockChanges.push(newChange);
      }

      state.setMockDraftChanges([...currentList, ...newMockChanges]);
      await cacheDelPrefix('cache:users:');
      return NextResponse.json({
        success: true,
        count: newMockChanges.length,
        changes: newMockChanges,
        change: newMockChanges[0],
      });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

// DELETE /api/draft - Delete a specific draft (?id=), undo latest (?action=undo), or discard all
export async function DELETE(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const targetId = searchParams.get('id');

  const supabase = getServiceSupabase();
  const isSupabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http')
  );

  // 1. Delete a specific draft change by id
  if (targetId) {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('draft_changes').delete().eq('id', targetId);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      await cacheDelPrefix('cache:users:');
      return NextResponse.json({ success: true, removed_id: targetId });
    } else {
      const state = getMockState();
      const filtered = state.mockDraftChanges.filter((c) => c.id !== targetId);
      state.setMockDraftChanges(filtered);
      await cacheDelPrefix('cache:users:');
      return NextResponse.json({ success: true, removed_id: targetId });
    }
  }

  // 2. Undo latest change
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

  // 3. Discard all changes
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
