import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getMockState } from '@/lib/mock-store';
import { Group } from '@/lib/types';
import { getSessionFromRequest } from '@/lib/auth';
import { cacheGet, cacheSet, cacheDelPrefix } from '@/lib/cache';

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
export async function GET() {
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
    if ((shouldProtect || shouldNoInternet) && session && session.role !== 'admin') {
      return NextResponse.json({ error: 'Only administrators can create protected or No Internet groups.' }, { status: 403 });
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

      await invalidateGroupsAndUsersCache();
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

      await invalidateGroupsAndUsersCache();
      return NextResponse.json({
        success: true,
        message: `Group deleted. Users successfully reassigned to "${defaultGroup.name}".`,
      });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

// PATCH toggle group protection, no-internet, or rename
export async function PATCH(request: Request) {
  try {
    const session = getSessionFromRequest(request);
    const body = await request.json();
    const { id, is_protected, is_no_internet, name, conflict_action } = body;

    if (!id) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
    }

    // Role check: Only admin can toggle protection or no_internet status
    if (
      (is_protected !== undefined || is_no_internet !== undefined) &&
      session &&
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
      // 1. Fetch current group
      const { data: currentGroup, error: fetchErr } = await supabase
        .from('groups')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
      if (!currentGroup) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

      // Default group cannot be renamed, protected, or tagged as No Internet
      if (currentGroup.name.toLowerCase() === 'default') {
        if (is_protected === true || is_no_internet === true || (name && name.trim().toLowerCase() !== 'default')) {
          return NextResponse.json(
            { error: 'The "Default" fallback group cannot be renamed, protected, or tagged as No Internet.' },
            { status: 400 }
          );
        }
      }

      // Incompatibility: cannot be both Protected and No Internet
      if (is_protected === true && (currentGroup.is_no_internet || is_no_internet === true)) {
        return NextResponse.json(
          { error: 'A group cannot be both Protected and No Internet.' },
          { status: 400 }
        );
      }
      if (is_no_internet === true && (currentGroup.is_protected || is_protected === true)) {
        return NextResponse.json(
          { error: 'A group cannot be both Protected and No Internet.' },
          { status: 400 }
        );
      }

      // If enabling No Internet, check member conflicts
      if (is_no_internet === true) {
        const { data: memberLinks } = await supabase
          .from('user_groups')
          .select('user_id')
          .eq('group_id', id);

        const userIds = (memberLinks || []).map((ul: any) => ul.user_id);

        if (userIds.length > 0) {
          const { data: members } = await supabase
            .from('users')
            .select(`
              id, name, mac_address,
              user_groups (
                groups ( id, name, is_protected, is_no_internet )
              )
            `)
            .in('id', userIds);

          // Check if any member is in a protected group
          for (const m of members || []) {
            const allGroups = (m.user_groups || []).map((ug: any) => ug.groups).filter(Boolean);
            const protG = allGroups.find((g: any) => g.is_protected);
            if (protG) {
              return NextResponse.json(
                {
                  error: `Cannot tag group as No Internet: Member "${m.name}" is currently in protected group "${protG.name}". Administrator must remove the user from the protected group first.`,
                  protected_conflict: true,
                },
                { status: 400 }
              );
            }
          }

          // Check multi-group conflicts (member also belongs to other internet-enabled groups)
          const conflicts: { userId: string; userName: string; mac: string; otherGroups: string[] }[] = [];
          for (const m of members || []) {
            const allGroups = (m.user_groups || []).map((ug: any) => ug.groups).filter(Boolean);
            const otherGs = allGroups.filter((g: any) => g.id !== id && !g.is_no_internet);
            if (otherGs.length > 0) {
              conflicts.push({
                userId: m.id,
                userName: m.name,
                mac: m.mac_address,
                otherGroups: otherGs.map((g: any) => g.name),
              });
            }
          }

          if (conflicts.length > 0) {
            const conflictUserIds = conflicts.map((c) => c.userId);

            if (conflict_action === 'force_add') {
              // Remove conflicting users from all other groups
              await supabase
                .from('user_groups')
                .delete()
                .in('user_id', conflictUserIds)
                .neq('group_id', id);
            } else if (conflict_action === 'remove_from_group') {
              // Remove conflicting users from this group
              await supabase
                .from('user_groups')
                .delete()
                .in('user_id', conflictUserIds)
                .eq('group_id', id);
            } else {
              // Prompt user with warning modal
              return NextResponse.json({
                conflict: true,
                message: 'Some members belong to other groups with internet access.',
                conflicts,
              });
            }
          }
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
      const state = getMockState();
      const currentGroup = state.mockGroups.find((g) => g.id === id);

      if (!currentGroup) {
        return NextResponse.json({ error: 'Group not found' }, { status: 404 });
      }

      // Default group cannot be renamed, protected, or tagged as No Internet
      if (currentGroup.name.toLowerCase() === 'default') {
        if (is_protected === true || is_no_internet === true || (name && name.trim().toLowerCase() !== 'default')) {
          return NextResponse.json(
            { error: 'The "Default" fallback group cannot be renamed, protected, or tagged as No Internet.' },
            { status: 400 }
          );
        }
      }

      // Incompatibility: cannot be both Protected and No Internet
      if (is_protected === true && (currentGroup.is_no_internet || is_no_internet === true)) {
        return NextResponse.json(
          { error: 'A group cannot be both Protected and No Internet.' },
          { status: 400 }
        );
      }
      if (is_no_internet === true && (currentGroup.is_protected || is_protected === true)) {
        return NextResponse.json(
          { error: 'A group cannot be both Protected and No Internet.' },
          { status: 400 }
        );
      }

      // If enabling No Internet, check member conflicts
      if (is_no_internet === true) {
        const members = state.mockUsers.filter((u) => u.groups.some((g) => g.id === id));

        // Check if any member is in a protected group
        for (const m of members) {
          const protG = m.groups.find((g) => g.is_protected);
          if (protG) {
            return NextResponse.json(
              {
                error: `Cannot tag group as No Internet: Member "${m.name}" is currently in protected group "${protG.name}". Administrator must remove the user from the protected group first.`,
                protected_conflict: true,
              },
              { status: 400 }
            );
          }
        }

        // Check multi-group conflicts
        const conflicts: { userId: string; userName: string; mac: string; otherGroups: string[] }[] = [];
        for (const m of members) {
          const otherGs = m.groups.filter((g) => g.id !== id && !g.is_no_internet);
          if (otherGs.length > 0) {
            conflicts.push({
              userId: m.id,
              userName: m.name,
              mac: m.mac_address,
              otherGroups: otherGs.map((g) => g.name),
            });
          }
        }

        if (conflicts.length > 0) {
          const conflictIds = new Set(conflicts.map((c) => c.userId));

          if (conflict_action === 'force_add') {
            // Remove conflicting users from all other groups, leaving only this group
            state.setMockUsers(
              state.mockUsers.map((u) => {
                if (conflictIds.has(u.id)) {
                  return {
                    ...u,
                    groups: u.groups.filter((g) => g.id === id),
                    updated_at: new Date().toISOString(),
                  };
                }
                return u;
              })
            );
          } else if (conflict_action === 'remove_from_group') {
            // Remove conflicting users from this group, leaving them in their other groups
            state.setMockUsers(
              state.mockUsers.map((u) => {
                if (conflictIds.has(u.id)) {
                  return {
                    ...u,
                    groups: u.groups.filter((g) => g.id !== id),
                    updated_at: new Date().toISOString(),
                  };
                }
                return u;
              })
            );
          } else {
            // Prompt user with warning modal
            return NextResponse.json({
              conflict: true,
              message: 'Some members belong to other groups with internet access.',
              conflicts,
            });
          }
        }
      }

      let updatedGroup: Group | null = null;
      const newGroups = state.mockGroups.map((g) => {
        if (g.id === id) {
          updatedGroup = {
            ...g,
            is_protected: is_protected !== undefined ? Boolean(is_protected) : g.is_protected,
            is_no_internet: is_no_internet !== undefined ? Boolean(is_no_internet) : g.is_no_internet,
            name: name && typeof name === 'string' ? name.trim() : g.name,
            updated_at: new Date().toISOString(),
          };
          return updatedGroup;
        }
        return g;
      });

      state.setMockGroups(newGroups);
      if (updatedGroup) {
        state.setMockUsers(
          state.mockUsers.map((u) => ({
            ...u,
            groups: u.groups.map((ug) => (ug.id === id ? { ...ug, ...updatedGroup } : ug)),
          }))
        );
      }
      await invalidateGroupsAndUsersCache();
      return NextResponse.json({ success: true, group: updatedGroup });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
