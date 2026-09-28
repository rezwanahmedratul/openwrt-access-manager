import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getMockState } from '@/lib/mock-store';
import { Group } from '@/lib/types';
import { getSessionFromRequest } from '@/lib/auth';

// GET all groups
export async function GET() {
  const supabase = getServiceSupabase();
  const isSupabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http')
  );

  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('groups').select('*').order('name');
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ groups: data || [] });
  } else {
    const state = getMockState();
    return NextResponse.json({ groups: state.mockGroups });
  }
}

// POST create group
export async function POST(request: Request) {
  try {
    const session = getSessionFromRequest(request);
    const body = await request.json();
    const { name, is_protected } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
    }

    const trimmedName = name.trim();
    const shouldProtect = Boolean(is_protected);

    // Only admin can create protected groups
    if (shouldProtect && session && session.role !== 'admin') {
      return NextResponse.json({ error: 'Only administrators can create protected groups.' }, { status: 403 });
    }

    const supabase = getServiceSupabase();
    const isSupabaseConfigured = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http')
    );

    if (isSupabaseConfigured) {
      // Check duplicate
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
        .insert({ name: trimmedName, is_protected: shouldProtect })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      state.setMockGroups([...state.mockGroups, newGroup]);
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

    const supabase = getServiceSupabase();
    const isSupabaseConfigured = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http')
    );

    if (isSupabaseConfigured) {
      // Find or create 'Default' group
      let { data: defaultGroup } = await supabase
        .from('groups')
        .select('id, name')
        .ilike('name', 'Default')
        .maybeSingle();

      if (!defaultGroup) {
        const { data: newDef, error: createDefErr } = await supabase
          .from('groups')
          .insert({ name: 'Default' })
          .select('id, name')
          .single();
        if (createDefErr) throw createDefErr;
        defaultGroup = newDef;
      }

      if (groupId === defaultGroup.id) {
        return NextResponse.json({ error: 'Cannot delete the "Default" fallback group.' }, { status: 400 });
      }

      // Find all user_ids belonging to the group being deleted
      const { data: userLinks } = await supabase
        .from('user_groups')
        .select('user_id')
        .eq('group_id', groupId);

      const affectedUserIds = (userLinks || []).map((ul: any) => ul.user_id);

      // Reassign users to 'Default' group if they are not already in it
      for (const uid of affectedUserIds) {
        await supabase
          .from('user_groups')
          .insert({ user_id: uid, group_id: defaultGroup.id })
          .select()
          .maybeSingle(); // ON CONFLICT DO NOTHING handled by primary key (user_id, group_id)
      }

      // Delete group (cascade deletes user_groups for this group)
      const { error: delError } = await supabase.from('groups').delete().eq('id', groupId);
      if (delError) {
        return NextResponse.json({ error: delError.message }, { status: 500 });
      }

      // Also update pending draft changes that referenced this group
      const { data: changes } = await supabase.from('draft_changes').select('*');
      if (changes) {
        for (const ch of changes) {
          if (ch.user_data && Array.isArray(ch.user_data.group_ids) && ch.user_data.group_ids.includes(groupId)) {
            const updatedIds = ch.user_data.group_ids.filter((gid: string) => gid !== groupId);
            if (!updatedIds.includes(defaultGroup.id)) {
              updatedIds.push(defaultGroup.id);
            }
            await supabase
              .from('draft_changes')
              .update({
                user_data: {
                  ...ch.user_data,
                  group_ids: updatedIds,
                },
              })
              .eq('id', ch.id);
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: `Group deleted. Users successfully reassigned to "${defaultGroup.name}".`,
      });
    } else {
      // Mock mode
      const state = getMockState();

      let defaultGroup = state.mockGroups.find((g) => g.name.toLowerCase() === 'default');
      if (!defaultGroup) {
        defaultGroup = {
          id: 'g-default',
          name: 'Default',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        state.setMockGroups([...state.mockGroups, defaultGroup]);
      }

      if (groupId === defaultGroup.id) {
        return NextResponse.json({ error: 'Cannot delete the "Default" fallback group.' }, { status: 400 });
      }

      // Reassign users in mock state
      const updatedUsers = state.mockUsers.map((u) => {
        const hasDeletedGroup = u.groups.some((g) => g.id === groupId);
        if (!hasDeletedGroup) return u;

        // Filter out deleted group
        let newGroups = u.groups.filter((g) => g.id !== groupId);
        // Add default group if not already present
        if (!newGroups.some((g) => g.id === defaultGroup!.id)) {
          newGroups.push(defaultGroup!);
        }
        return {
          ...u,
          groups: newGroups,
        };
      });

      state.setMockUsers(updatedUsers);

      // Reassign any pending draft changes
      const updatedDrafts = state.mockDraftChanges.map((ch) => {
        if (ch.user_data && Array.isArray(ch.user_data.group_ids) && ch.user_data.group_ids.includes(groupId)) {
          let updatedIds = ch.user_data.group_ids.filter((id) => id !== groupId);
          if (!updatedIds.includes(defaultGroup!.id)) {
            updatedIds.push(defaultGroup!.id);
          }
          return {
            ...ch,
            user_data: {
              ...ch.user_data,
              group_ids: updatedIds,
            },
          };
        }
        return ch;
      });
      state.setMockDraftChanges(updatedDrafts);

      // Remove group from groups list
      state.setMockGroups(state.mockGroups.filter((g) => g.id !== groupId));

      return NextResponse.json({
        success: true,
        message: `Group deleted. Users successfully reassigned to "${defaultGroup.name}".`,
      });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

// PATCH toggle group protection or rename (Admin only for protected groups)
export async function PATCH(request: Request) {
  try {
    const session = getSessionFromRequest(request);
    const body = await request.json();
    const { id, is_protected, name } = body;

    if (!id) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
    }

    if (is_protected !== undefined && session && session.role !== 'admin') {
      return NextResponse.json({ error: 'Only administrators can change group protection status.' }, { status: 403 });
    }

    const supabase = getServiceSupabase();
    const isSupabaseConfigured = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http')
    );

    if (isSupabaseConfigured) {
      const updateData: any = { updated_at: new Date().toISOString() };
      if (is_protected !== undefined) updateData.is_protected = Boolean(is_protected);
      if (name && typeof name === 'string') updateData.name = name.trim();

      const { data, error } = await supabase
        .from('groups')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, group: data });
    } else {
      const state = getMockState();
      let updatedGroup: Group | null = null;

      const newGroups = state.mockGroups.map((g) => {
        if (g.id === id) {
          updatedGroup = {
            ...g,
            is_protected: is_protected !== undefined ? Boolean(is_protected) : g.is_protected,
            name: name && typeof name === 'string' ? name.trim() : g.name,
            updated_at: new Date().toISOString(),
          };
          return updatedGroup;
        }
        return g;
      });

      if (!updatedGroup) {
        return NextResponse.json({ error: 'Group not found' }, { status: 404 });
      }

      state.setMockGroups(newGroups);
      return NextResponse.json({ success: true, group: updatedGroup });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
