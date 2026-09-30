import { Group } from './types';

export interface ConflictUser {
  userId: string;
  userName: string;
  mac: string;
  otherGroups: string[];
}

export type ConflictResolutionResult =
  | { conflict: false; protectedConflict?: false }
  | { conflict: true; protectedConflict?: false; conflicts: ConflictUser[]; message: string }
  | { conflict?: false; protectedConflict: true; error: string };

/**
 * Handle user reassignment to Default group when a group is deleted in Supabase
 */
export async function reassignGroupOnDeleteSupabase(supabase: any, groupId: string) {
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
    return { error: 'Cannot delete the "Default" fallback group.', status: 400 };
  }

  // Find all user_ids belonging to the group being deleted
  const { data: userLinks } = await supabase
    .from('user_groups')
    .select('user_id')
    .eq('group_id', groupId);

  const affectedUserIds = (userLinks || []).map((ul: any) => ul.user_id);

  // Reassign users to 'Default' group
  for (const uid of affectedUserIds) {
    await supabase
      .from('user_groups')
      .insert({ user_id: uid, group_id: defaultGroup.id })
      .select()
      .maybeSingle();
  }

  // Delete group (cascade deletes user_groups for this group)
  const { error: delError } = await supabase.from('groups').delete().eq('id', groupId);
  if (delError) {
    return { error: delError.message, status: 500 };
  }

  // Update pending draft changes referencing this group
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

  return { success: true, defaultGroupName: defaultGroup.name };
}

/**
 * Handle user reassignment to Default group when a group is deleted in Mock Mode
 */
export function reassignGroupOnDeleteMock(state: any, groupId: string) {
  let defaultGroup = state.mockGroups.find((g: any) => g.name.toLowerCase() === 'default');
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
    return { error: 'Cannot delete the "Default" fallback group.', status: 400 };
  }

  const updatedUsers = state.mockUsers.map((u: any) => {
    const hasDeletedGroup = u.groups.some((g: any) => g.id === groupId);
    if (!hasDeletedGroup) return u;

    let newGroups = u.groups.filter((g: any) => g.id !== groupId);
    if (!newGroups.some((g: any) => g.id === defaultGroup!.id)) {
      newGroups.push(defaultGroup!);
    }
    return { ...u, groups: newGroups };
  });
  state.setMockUsers(updatedUsers);

  const updatedDrafts = state.mockDraftChanges.map((ch: any) => {
    if (ch.user_data && Array.isArray(ch.user_data.group_ids) && ch.user_data.group_ids.includes(groupId)) {
      let updatedIds = ch.user_data.group_ids.filter((id: string) => id !== groupId);
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

  state.setMockGroups(state.mockGroups.filter((g: any) => g.id !== groupId));
  return { success: true, defaultGroupName: defaultGroup.name };
}

/**
 * Check and resolve No Internet tagging conflicts in Supabase
 */
export async function checkAndResolveNoInternetSupabase(
  supabase: any,
  groupId: string,
  conflictAction?: 'force_add' | 'remove_from_group'
): Promise<ConflictResolutionResult> {
  const { data: memberLinks } = await supabase
    .from('user_groups')
    .select('user_id')
    .eq('group_id', groupId);

  const userIds = (memberLinks || []).map((ul: any) => ul.user_id);
  if (userIds.length === 0) {
    return { conflict: false };
  }

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
      return {
        protectedConflict: true,
        error: `Cannot tag group as No Internet: Member "${m.name}" is currently in protected group "${protG.name}". Administrator must remove the user from the protected group first.`,
      };
    }
  }

  // Check multi-group conflicts
  const conflicts: ConflictUser[] = [];
  for (const m of members || []) {
    const allGroups = (m.user_groups || []).map((ug: any) => ug.groups).filter(Boolean);
    const otherGs = allGroups.filter((g: any) => g.id !== groupId && !g.is_no_internet);
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
    if (conflictAction === 'force_add') {
      await supabase
        .from('user_groups')
        .delete()
        .in('user_id', conflictUserIds)
        .neq('group_id', groupId);
    } else if (conflictAction === 'remove_from_group') {
      await supabase
        .from('user_groups')
        .delete()
        .in('user_id', conflictUserIds)
        .eq('group_id', groupId);
    } else {
      return {
        conflict: true,
        conflicts,
        message: 'Some members belong to other groups with internet access.',
      };
    }
  }

  return { conflict: false };
}

/**
 * Check and resolve No Internet tagging conflicts in Mock Mode
 */
export function checkAndResolveNoInternetMock(
  state: any,
  groupId: string,
  conflictAction?: 'force_add' | 'remove_from_group'
): ConflictResolutionResult {
  const members = state.mockUsers.filter((u: any) => u.groups.some((g: any) => g.id === groupId));

  for (const m of members) {
    const protG = m.groups.find((g: any) => g.is_protected);
    if (protG) {
      return {
        protectedConflict: true,
        error: `Cannot tag group as No Internet: Member "${m.name}" is currently in protected group "${protG.name}". Administrator must remove the user from the protected group first.`,
      };
    }
  }

  const conflicts: ConflictUser[] = [];
  for (const m of members) {
    const otherGs = m.groups.filter((g: any) => g.id !== groupId && !g.is_no_internet);
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
    if (conflictAction === 'force_add') {
      const conflictSet = new Set(conflicts.map((c) => c.userId));
      const updatedUsers = state.mockUsers.map((u: any) => {
        if (conflictSet.has(u.id)) {
          const currentGroupObj = state.mockGroups.find((g: any) => g.id === groupId);
          return { ...u, groups: currentGroupObj ? [currentGroupObj] : [] };
        }
        return u;
      });
      state.setMockUsers(updatedUsers);
    } else if (conflictAction === 'remove_from_group') {
      const conflictSet = new Set(conflicts.map((c) => c.userId));
      const updatedUsers = state.mockUsers.map((u: any) => {
        if (conflictSet.has(u.id)) {
          return { ...u, groups: u.groups.filter((g: any) => g.id !== groupId) };
        }
        return u;
      });
      state.setMockUsers(updatedUsers);
    } else {
      return {
        conflict: true,
        conflicts,
        message: 'Some members belong to other groups with internet access.',
      };
    }
  }

  return { conflict: false };
}
