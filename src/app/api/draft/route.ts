import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServiceSupabase } from '@/lib/supabase';
import { DraftChange } from '@/lib/types';
import { getMockState } from '@/lib/mock-store';
import { requireAuth } from '@/lib/auth';
import { cacheDelPrefix } from '@/lib/cache';
import { logAudit, getClientIp } from '@/lib/audit';
import {
  buildDraftValidationContext,
  fastValidateAndPrepareChange,
  DraftOperationItem,
} from '@/lib/draft-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const draftItemSchema = z.object({
  operation: z.enum(['ADD', 'MODIFY', 'DELETE']),
  user_id: z.string().nullable().optional(),
  name: z.string().optional(),
  mac_address: z.string().optional(),
  group_ids: z.array(z.string()).optional(),
  schedule: z.any().optional(),
  temporary_access_until: z.string().nullable().optional(),
});

// GET /api/draft - List all pending draft changes
export async function GET(request: Request) {
  try {
    await requireAuth(request);

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
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unauthorized' }, { status: err.status || 401 });
  }
}

// POST /api/draft - Add single or batch draft changes
export async function POST(request: Request) {
  try {
    const session = await requireAuth(request);

    const body = await request.json();
    const isBatch = Array.isArray(body) || (body && Array.isArray(body.operations));
    const rawItems = isBatch
      ? Array.isArray(body)
        ? body
        : body.operations
      : [body];

    if (!rawItems || rawItems.length === 0) {
      return NextResponse.json({ error: 'No draft operations provided' }, { status: 400 });
    }

    // Zod validation on incoming items
    const validatedItems: DraftOperationItem[] = [];
    for (let i = 0; i < rawItems.length; i++) {
      const parsed = draftItemSchema.safeParse(rawItems[i]);
      if (!parsed.success) {
        return NextResponse.json(
          { error: `Item ${i + 1}: Invalid operation data`, details: parsed.error.format() },
          { status: 400 }
        );
      }
      validatedItems.push(parsed.data as DraftOperationItem);
    }

    const supabase = getServiceSupabase();
    const isSupabaseConfigured = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http')
    );

    const preparedChanges: any[] = [];
    const ctx = await buildDraftValidationContext(supabase, isSupabaseConfigured, session);

    // Validate all items in-memory using pre-fetched context
    for (let i = 0; i < validatedItems.length; i++) {
      const item = validatedItems[i];
      const result = fastValidateAndPrepareChange(item, session, ctx);
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

      // Audit log
      await logAudit({
        actor_id: session.id,
        actor_username: session.username,
        action: 'DRAFT_CHANGE_ADD',
        resource_type: 'draft_changes',
        resource_id: data.map((d: any) => d.id).join(','),
        details: { count: data.length, operations: validatedItems.map((v) => v.operation) },
        ip_address: getClientIp(request),
      });

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

      await logAudit({
        actor_id: session.id,
        actor_username: session.username,
        action: 'DRAFT_CHANGE_ADD',
        resource_type: 'draft_changes',
        resource_id: newMockChanges.map((d) => d.id).join(','),
        details: { count: newMockChanges.length, operations: validatedItems.map((v) => v.operation) },
        ip_address: getClientIp(request),
      });

      return NextResponse.json({
        success: true,
        count: newMockChanges.length,
        changes: newMockChanges,
        change: newMockChanges[0],
      });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: err.status || 500 });
  }
}

// DELETE /api/draft - Delete a specific draft (?id=), undo latest (?action=undo), or discard all
export async function DELETE(request: Request) {
  try {
    const session = await requireAuth(request);

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

        await logAudit({
          actor_id: session.id,
          actor_username: session.username,
          action: 'DRAFT_CHANGE_DELETE',
          resource_type: 'draft_changes',
          resource_id: targetId,
          ip_address: getClientIp(request),
        });

        return NextResponse.json({ success: true, removed_id: targetId });
      } else {
        const state = getMockState();
        const filtered = state.mockDraftChanges.filter((c) => c.id !== targetId);
        state.setMockDraftChanges(filtered);
        await cacheDelPrefix('cache:users:');

        await logAudit({
          actor_id: session.id,
          actor_username: session.username,
          action: 'DRAFT_CHANGE_DELETE',
          resource_type: 'draft_changes',
          resource_id: targetId,
          ip_address: getClientIp(request),
        });

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

        await logAudit({
          actor_id: session.id,
          actor_username: session.username,
          action: 'DRAFT_CHANGE_UNDO',
          resource_type: 'draft_changes',
          resource_id: latestChange.id,
          ip_address: getClientIp(request),
        });

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

        await logAudit({
          actor_id: session.id,
          actor_username: session.username,
          action: 'DRAFT_CHANGE_UNDO',
          resource_type: 'draft_changes',
          resource_id: removed?.id,
          ip_address: getClientIp(request),
        });

        return NextResponse.json({ success: true, undone_id: removed?.id });
      }
    }

    // 3. Discard all changes
    if (isSupabaseConfigured) {
      await supabase.from('draft_changes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await cacheDelPrefix('cache:users:');

      await logAudit({
        actor_id: session.id,
        actor_username: session.username,
        action: 'DRAFT_DISCARD_ALL',
        resource_type: 'draft_changes',
        resource_id: 'all',
        ip_address: getClientIp(request),
      });

      return NextResponse.json({ success: true, message: 'All draft changes discarded' });
    } else {
      const state = getMockState();
      state.setMockDraftChanges([]);
      await cacheDelPrefix('cache:users:');

      await logAudit({
        actor_id: session.id,
        actor_username: session.username,
        action: 'DRAFT_DISCARD_ALL',
        resource_type: 'draft_changes',
        resource_id: 'all',
        ip_address: getClientIp(request),
      });

      return NextResponse.json({ success: true, message: 'All draft changes discarded' });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: err.status || 500 });
  }
}
