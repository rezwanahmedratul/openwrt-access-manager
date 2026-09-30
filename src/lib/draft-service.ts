import { getMockState } from './mock-store';
import { DraftChange } from './types';

export interface GroupCompatibilityCheck {
  valid: boolean;
  error?: string;
}

export async function resolveDefaultGroup(
  resolvedGroupIds: string[],
  supabase: any,
  isSupabaseConfigured: boolean
): Promise<string[]> {
  if (resolvedGroupIds.length > 0) return resolvedGroupIds;

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
      return [defaultGroup.id];
    }
    return [];
  } else {
    const state = getMockState();
    let defaultGroup = state.mockGroups.find((g) => g.name.toLowerCase() === 'default');
    if (!defaultGroup) {
      defaultGroup = { id: 'g-default', name: 'Default', created_at: '', updated_at: '' };
      state.setMockGroups([defaultGroup, ...state.mockGroups]);
    }
    return [defaultGroup.id];
  }
}

export async function validateGroupCompatibility(
  resolvedGroupIds: string[],
  supabase: any,
  isSupabaseConfigured: boolean
): Promise<GroupCompatibilityCheck> {
  if (resolvedGroupIds.length === 0) return { valid: true };

  if (isSupabaseConfigured) {
    const { data: targetGroups } = await supabase
      .from('groups')
      .select('id, name, is_protected, is_no_internet')
      .in('id', resolvedGroupIds);

    const hasNoInternet = (targetGroups || []).some((g: any) => g.is_no_internet);
    const hasInternet = (targetGroups || []).some((g: any) => !g.is_no_internet);
    const hasProtected = (targetGroups || []).some((g: any) => g.is_protected);

    if (hasNoInternet && hasInternet) {
      return {
        valid: false,
        error: 'A user cannot belong to a "No Internet" group and another group with internet access at the same time.',
      };
    }

    if (hasNoInternet && hasProtected) {
      return {
        valid: false,
        error: 'Users in protected groups cannot be assigned to a No Internet group. The user must be removed from protected groups first.',
      };
    }
  } else {
    const state = getMockState();
    const targetGroups = state.mockGroups.filter((g) => resolvedGroupIds.includes(g.id));
    const hasNoInternet = targetGroups.some((g) => g.is_no_internet);
    const hasInternet = targetGroups.some((g) => !g.is_no_internet);
    const hasProtected = targetGroups.some((g) => g.is_protected);

    if (hasNoInternet && hasInternet) {
      return {
        valid: false,
        error: 'A user cannot belong to a "No Internet" group and another group with internet access at the same time.',
      };
    }

    if (hasNoInternet && hasProtected) {
      return {
        valid: false,
        error: 'Users in protected groups cannot be assigned to a No Internet group. The user must be removed from protected groups first.',
      };
    }
  }

  return { valid: true };
}

export async function checkSubadminProtection(
  operation: string,
  resolvedGroupIds: string[],
  userId: string | undefined,
  session: any,
  supabase: any,
  isSupabaseConfigured: boolean
): Promise<{ allowed: boolean; error?: string }> {
  if (!session || session.role !== 'subadmin') return { allowed: true };

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
      return {
        allowed: false,
        error: 'Subadmins cannot assign users to protected groups. Administrator access required.',
      };
    }
  }

  // 2. Check if existing user being modified or deleted has any protected group
  if ((operation === 'MODIFY' || operation === 'DELETE') && userId) {
    let userHasProtected = false;
    if (isSupabaseConfigured) {
      const { data: userG } = await supabase
        .from('user_groups')
        .select('groups ( is_protected )')
        .eq('user_id', userId);
      userHasProtected = (userG || []).some((ug: any) => ug.groups?.is_protected);
    } else {
      const existingUser = state.mockUsers.find((u) => u.id === userId);
      userHasProtected = Boolean(existingUser?.groups?.some((g) => g.is_protected));
    }

    if (userHasProtected) {
      return {
        allowed: false,
        error: 'Subadmins cannot edit or delete users in protected groups. Administrator access required.',
      };
    }
  }

  return { allowed: true };
}

export async function checkMacConflict(
  operation: string,
  normalizedMacStr: string,
  userId: string | undefined,
  supabase: any,
  isSupabaseConfigured: boolean
): Promise<{ conflict: boolean; error?: string }> {
  if (operation === 'DELETE') return { conflict: false };

  if (isSupabaseConfigured) {
    if (operation === 'ADD') {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, name')
        .eq('mac_address', normalizedMacStr)
        .maybeSingle();

      if (existingUser) {
        return {
          conflict: true,
          error: `MAC address ${normalizedMacStr} already assigned to user ${existingUser.name}`,
        };
      }

      const { data: pendingDrafts } = await supabase
        .from('draft_changes')
        .select('id, user_data')
        .neq('operation', 'DELETE');

      const draftDup = (pendingDrafts || []).find(
        (d: any) => d.user_data?.mac_address === normalizedMacStr
      );
      if (draftDup) {
        return {
          conflict: true,
          error: `MAC address ${normalizedMacStr} is already queued in pending draft changes for "${draftDup.user_data?.name}".`,
        };
      }
    } else if (operation === 'MODIFY') {
      const { data: existingUsers } = await supabase
        .from('users')
        .select('id, name')
        .eq('mac_address', normalizedMacStr);

      const conflictUser = (existingUsers || []).find((u: any) => u.id !== userId);
      if (conflictUser) {
        return {
          conflict: true,
          error: `MAC address ${normalizedMacStr} already assigned to user ${conflictUser.name}`,
        };
      }

      const { data: pendingDrafts } = await supabase
        .from('draft_changes')
        .select('id, user_id, user_data')
        .neq('operation', 'DELETE');

      const draftDup = (pendingDrafts || []).find(
        (d: any) => d.user_id !== userId && d.user_data?.mac_address === normalizedMacStr
      );
      if (draftDup) {
        return {
          conflict: true,
          error: `MAC address ${normalizedMacStr} is already queued in pending draft changes for "${draftDup.user_data?.name}".`,
        };
      }
    }
  } else {
    const state = getMockState();

    if (operation === 'ADD') {
      const existingUser = state.mockUsers.find((u) => u.mac_address === normalizedMacStr);
      if (existingUser) {
        return {
          conflict: true,
          error: `MAC address ${normalizedMacStr} already assigned to user ${existingUser.name}`,
        };
      }

      const pendingDup = state.mockDraftChanges.find(
        (d) => d.operation !== 'DELETE' && d.user_data?.mac_address === normalizedMacStr
      );
      if (pendingDup) {
        return {
          conflict: true,
          error: `MAC address ${normalizedMacStr} is already queued in pending draft changes for "${pendingDup.user_data?.name}".`,
        };
      }
    } else if (operation === 'MODIFY') {
      const conflictUser = state.mockUsers.find(
        (u) => u.id !== userId && u.mac_address === normalizedMacStr
      );
      if (conflictUser) {
        return {
          conflict: true,
          error: `MAC address ${normalizedMacStr} already assigned to user ${conflictUser.name}`,
        };
      }

      const pendingDup = state.mockDraftChanges.find(
        (d) => d.user_id !== userId && d.operation !== 'DELETE' && d.user_data?.mac_address === normalizedMacStr
      );
      if (pendingDup) {
        return {
          conflict: true,
          error: `MAC address ${normalizedMacStr} is already queued in pending draft changes for "${pendingDup.user_data?.name}".`,
        };
      }
    }
  }

  return { conflict: false };
}

export async function checkNameConflict(
  operation: string,
  normalizedNameStr: string,
  userId: string | undefined,
  supabase: any,
  isSupabaseConfigured: boolean
): Promise<{ conflict: boolean; error?: string }> {
  if (operation === 'DELETE') return { conflict: false };

  const targetName = normalizedNameStr.trim().toLowerCase();

  if (isSupabaseConfigured) {
    if (operation === 'ADD') {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, name, mac_address')
        .ilike('name', normalizedNameStr)
        .maybeSingle();

      if (existingUser) {
        return {
          conflict: true,
          error: `User name "${existingUser.name}" already exists (assigned to MAC ${existingUser.mac_address}).`,
        };
      }

      const { data: pendingDrafts } = await supabase
        .from('draft_changes')
        .select('id, user_data')
        .neq('operation', 'DELETE');

      const draftDup = (pendingDrafts || []).find(
        (d: any) => d.user_data?.name?.toLowerCase() === targetName
      );
      if (draftDup) {
        return {
          conflict: true,
          error: `User name "${normalizedNameStr}" is already queued in pending draft changes for MAC ${draftDup.user_data?.mac_address}.`,
        };
      }
    } else if (operation === 'MODIFY') {
      const { data: existingUsers } = await supabase
        .from('users')
        .select('id, name, mac_address')
        .ilike('name', normalizedNameStr);

      const conflictUser = (existingUsers || []).find((u: any) => u.id !== userId);
      if (conflictUser) {
        return {
          conflict: true,
          error: `User name "${conflictUser.name}" already exists (assigned to MAC ${conflictUser.mac_address}).`,
        };
      }

      const { data: pendingDrafts } = await supabase
        .from('draft_changes')
        .select('id, user_id, user_data')
        .neq('operation', 'DELETE');

      const draftDup = (pendingDrafts || []).find(
        (d: any) => d.user_id !== userId && d.user_data?.name?.toLowerCase() === targetName
      );
      if (draftDup) {
        return {
          conflict: true,
          error: `User name "${normalizedNameStr}" is already queued in pending draft changes for MAC ${draftDup.user_data?.mac_address}.`,
        };
      }
    }
  } else {
    const state = getMockState();

    if (operation === 'ADD') {
      const existingUser = state.mockUsers.find(
        (u) => u.name.toLowerCase() === targetName
      );
      if (existingUser) {
        return {
          conflict: true,
          error: `User name "${existingUser.name}" already exists (assigned to MAC ${existingUser.mac_address}).`,
        };
      }

      const pendingDup = state.mockDraftChanges.find(
        (d) => d.operation !== 'DELETE' && d.user_data?.name?.toLowerCase() === targetName
      );
      if (pendingDup) {
        return {
          conflict: true,
          error: `User name "${normalizedNameStr}" is already queued in pending draft changes for MAC ${pendingDup.user_data?.mac_address}.`,
        };
      }
    } else if (operation === 'MODIFY') {
      const conflictUser = state.mockUsers.find(
        (u) => u.id !== userId && u.name.toLowerCase() === targetName
      );
      if (conflictUser) {
        return {
          conflict: true,
          error: `User name "${conflictUser.name}" already exists (assigned to MAC ${conflictUser.mac_address}).`,
        };
      }

      const pendingDup = state.mockDraftChanges.find(
        (d) =>
          d.user_id !== userId &&
          d.operation !== 'DELETE' &&
          d.user_data?.name?.toLowerCase() === targetName
      );
      if (pendingDup) {
        return {
          conflict: true,
          error: `User name "${normalizedNameStr}" is already queued in pending draft changes for MAC ${pendingDup.user_data?.mac_address}.`,
        };
      }
    }
  }

  return { conflict: false };
}

