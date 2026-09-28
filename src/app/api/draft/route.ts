import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { normalizeMac } from '@/lib/normalize-mac';
import { normalizeName } from '@/lib/normalize-name';
import { DraftChange } from '@/lib/types';
import { getMockState } from '@/lib/mock-store';

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
          group_ids: group_ids || [],
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
          group_ids: group_ids || [],
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
