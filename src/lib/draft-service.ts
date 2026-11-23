import { getMockState } from './mock-store';
import { DraftChange } from './types';
import { normalizeMac } from './normalize-mac';
import { normalizeName } from './normalize-name';

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

export interface DraftOperationItem {
  operation: 'ADD' | 'MODIFY' | 'DELETE';
  user_id?: string | null;
  name?: string;
  mac_address?: string;
  group_ids?: string[];
  schedule?: any;
  temporary_access_until?: string | null;
}

export interface DraftValidationContext {
  groupsById: Map<string, any>;
  groupsByName: Map<string, any>;
  defaultGroupId: string | null;
  usersByMac: Map<string, { id: string; name: string; mac_address: string; is_protected?: boolean }>;
  usersByName: Map<string, { id: string; name: string; mac_address: string; is_protected?: boolean }>;
  usersById: Map<string, { id: string; name: string; mac_address: string; is_protected?: boolean }>;
  draftsByMac: Map<string, { name: string; mac_address: string; userId?: string | null }>;
  draftsByName: Map<string, { name: string; mac_address: string; userId?: string | null }>;
  isSubadmin: boolean;
}

export async function buildDraftValidationContext(
  supabase: any,
  isSupabaseConfigured: boolean,
  session: any
): Promise<DraftValidationContext> {
  const isSubadmin = session?.role === 'subadmin';

  if (isSupabaseConfigured) {
    const [groupsRes, usersRes, draftsRes, userGroupsRes] = await Promise.all([
      supabase.from('groups').select('id, name, is_protected, is_no_internet'),
      supabase.from('users').select('id, name, mac_address'),
      supabase.from('draft_changes').select('id, user_id, user_data, operation').neq('operation', 'DELETE'),
      isSubadmin
        ? supabase.from('user_groups').select('user_id, groups(is_protected)')
        : Promise.resolve({ data: [] }),
    ]);

    const groups = groupsRes.data || [];
    const users = usersRes.data || [];
    const drafts = draftsRes.data || [];
    const userGroups = userGroupsRes.data || [];

    const protectedUserIds = new Set<string>();
    for (const ug of userGroups) {
      if (ug.groups?.is_protected) {
        protectedUserIds.add(ug.user_id);
      }
    }

    const groupsById = new Map<string, any>();
    const groupsByName = new Map<string, any>();
    for (const g of groups) {
      groupsById.set(g.id, g);
      groupsByName.set(g.name.toLowerCase(), g);
    }

    let defaultGroup = groupsByName.get('default');
    if (!defaultGroup) {
      const { data: newDef } = await supabase
        .from('groups')
        .insert({ name: 'Default' })
        .select('id, name, is_protected, is_no_internet')
        .single();
      if (newDef) {
        defaultGroup = newDef;
        groups.push(newDef);
        groupsById.set(newDef.id, newDef);
        groupsByName.set(newDef.name.toLowerCase(), newDef);
      }
    }
    const defaultGroupId = defaultGroup?.id || null;

    const usersByMac = new Map<string, any>();
    const usersByName = new Map<string, any>();
    const usersById = new Map<string, any>();

    for (const u of users) {
      const item = {
        id: u.id,
        name: u.name,
        mac_address: u.mac_address,
        is_protected: protectedUserIds.has(u.id),
      };
      if (u.mac_address) usersByMac.set(u.mac_address.toUpperCase(), item);
      if (u.name) usersByName.set(u.name.toLowerCase(), item);
      if (u.id) usersById.set(u.id, item);
    }

    const draftsByMac = new Map<string, any>();
    const draftsByName = new Map<string, any>();

    for (const d of drafts) {
      if (d.user_data?.mac_address) {
        draftsByMac.set(d.user_data.mac_address.toUpperCase(), {
          name: d.user_data.name,
          mac_address: d.user_data.mac_address,
          userId: d.user_id || null,
        });
      }
      if (d.user_data?.name) {
        draftsByName.set(d.user_data.name.toLowerCase(), {
          name: d.user_data.name,
          mac_address: d.user_data.mac_address,
          userId: d.user_id || null,
        });
      }
    }

    return {
      groupsById,
      groupsByName,
      defaultGroupId,
      usersByMac,
      usersByName,
      usersById,
      draftsByMac,
      draftsByName,
      isSubadmin,
    };
  } else {
    const state = getMockState();
    const groupsById = new Map<string, any>();
    const groupsByName = new Map<string, any>();
    for (const g of state.mockGroups) {
      groupsById.set(g.id, g);
      groupsByName.set(g.name.toLowerCase(), g);
    }

    let defaultGroup = groupsByName.get('default');
    if (!defaultGroup) {
      defaultGroup = { id: 'g-default', name: 'Default', created_at: '', updated_at: '' };
      state.setMockGroups([defaultGroup, ...state.mockGroups]);
      groupsById.set(defaultGroup.id, defaultGroup);
      groupsByName.set(defaultGroup.name.toLowerCase(), defaultGroup);
    }
    const defaultGroupId = defaultGroup.id;

    const usersByMac = new Map<string, any>();
    const usersByName = new Map<string, any>();
    const usersById = new Map<string, any>();

    for (const u of state.mockUsers) {
      const isProt = Boolean(u.groups?.some((g: any) => g.is_protected));
      const item = {
        id: u.id,
        name: u.name,
        mac_address: u.mac_address,
        is_protected: isProt,
      };
      if (u.mac_address) usersByMac.set(u.mac_address.toUpperCase(), item);
      if (u.name) usersByName.set(u.name.toLowerCase(), item);
      if (u.id) usersById.set(u.id, item);
    }

    const draftsByMac = new Map<string, any>();
    const draftsByName = new Map<string, any>();

    for (const d of state.mockDraftChanges) {
      if (d.operation !== 'DELETE' && d.user_data?.mac_address) {
        draftsByMac.set(d.user_data.mac_address.toUpperCase(), {
          name: d.user_data.name,
          mac_address: d.user_data.mac_address,
          userId: d.user_id || null,
        });
      }
      if (d.operation !== 'DELETE' && d.user_data?.name) {
        draftsByName.set(d.user_data.name.toLowerCase(), {
          name: d.user_data.name,
          mac_address: d.user_data.mac_address,
          userId: d.user_id || null,
        });
      }
    }

    return {
      groupsById,
      groupsByName,
      defaultGroupId,
      usersByMac,
      usersByName,
      usersById,
      draftsByMac,
      draftsByName,
      isSubadmin,
    };
  }
}

export function fastValidateAndPrepareChange(
  item: DraftOperationItem,
  session: any,
  ctx: DraftValidationContext
): { error?: string; status?: number; changeData?: any } {
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
    if (resolvedGroupIds.length === 0 && ctx.defaultGroupId) {
      resolvedGroupIds = [ctx.defaultGroupId];
    }
  }

  if (operation !== 'DELETE' && resolvedGroupIds.length > 0) {
    const targetGroups = resolvedGroupIds.map((id) => ctx.groupsById.get(id)).filter(Boolean);
    const hasNoInternet = targetGroups.some((g) => g.is_no_internet);
    const hasInternet = targetGroups.some((g) => !g.is_no_internet);
    const hasProtected = targetGroups.some((g) => g.is_protected);

    if (hasNoInternet && hasInternet) {
      return {
        error: 'A user cannot belong to a "No Internet" group and another group with internet access at the same time.',
        status: 400,
      };
    }

    if (hasNoInternet && hasProtected) {
      return {
        error: 'Users in protected groups cannot be assigned to a No Internet group. The user must be removed from protected groups first.',
        status: 400,
      };
    }
  }

  // Subadmin check
  if (ctx.isSubadmin) {
    if (operation !== 'DELETE' && resolvedGroupIds.length > 0) {
      const hasProtectedGroup = resolvedGroupIds.some((id) => ctx.groupsById.get(id)?.is_protected);
      if (hasProtectedGroup) {
        return {
          error: 'Subadmins cannot assign users to protected groups. Administrator access required.',
          status: 403,
        };
      }
    }

    if ((operation === 'MODIFY' || operation === 'DELETE') && user_id) {
      const existingUser = ctx.usersById.get(user_id);
      if (existingUser?.is_protected) {
        return {
          error: 'Subadmins cannot edit or delete users in protected groups. Administrator access required.',
          status: 403,
        };
      }
    }
  }

  // MAC conflict check
  if (operation !== 'DELETE') {
    const existingUser = ctx.usersByMac.get(normalizedMacStr);
    if (operation === 'ADD') {
      if (existingUser) {
        return {
          error: `MAC address ${normalizedMacStr} already assigned to user ${existingUser.name}`,
          status: 400,
        };
      }
      const draftDup = ctx.draftsByMac.get(normalizedMacStr);
      if (draftDup) {
        return {
          error: `MAC address ${normalizedMacStr} is already queued in pending draft changes for "${draftDup.name}".`,
          status: 400,
        };
      }
    } else if (operation === 'MODIFY') {
      if (existingUser && existingUser.id !== user_id) {
        return {
          error: `MAC address ${normalizedMacStr} already assigned to user ${existingUser.name}`,
          status: 400,
        };
      }
      const draftDup = ctx.draftsByMac.get(normalizedMacStr);
      if (draftDup && draftDup.userId !== user_id) {
        return {
          error: `MAC address ${normalizedMacStr} is already queued in pending draft changes for "${draftDup.name}".`,
          status: 400,
        };
      }
    }
  }

  // Name conflict check
  if (operation !== 'DELETE') {
    const targetName = normalizedNameStr.trim().toLowerCase();
    const existingUser = ctx.usersByName.get(targetName);
    if (operation === 'ADD') {
      if (existingUser) {
        return {
          error: `User name "${existingUser.name}" already exists (assigned to MAC ${existingUser.mac_address}).`,
          status: 400,
        };
      }
      const draftDup = ctx.draftsByName.get(targetName);
      if (draftDup) {
        return {
          error: `User name "${normalizedNameStr}" is already queued in pending draft changes for MAC ${draftDup.mac_address}.`,
          status: 400,
        };
      }
    } else if (operation === 'MODIFY') {
      if (existingUser && existingUser.id !== user_id) {
        return {
          error: `User name "${existingUser.name}" already exists (assigned to MAC ${existingUser.mac_address}).`,
          status: 400,
        };
      }
      const draftDup = ctx.draftsByName.get(targetName);
      if (draftDup && draftDup.userId !== user_id) {
        return {
          error: `User name "${normalizedNameStr}" is already queued in pending draft changes for MAC ${draftDup.mac_address}.`,
          status: 400,
        };
      }
    }
  }

  // Register into context for intra-batch duplicate detection!
  if (operation !== 'DELETE') {
    const targetName = normalizedNameStr.trim().toLowerCase();
    ctx.draftsByMac.set(normalizedMacStr, {
      name: normalizedNameStr,
      mac_address: normalizedMacStr,
      userId: user_id || null,
    });
    ctx.draftsByName.set(targetName, {
      name: normalizedNameStr,
      mac_address: normalizedMacStr,
      userId: user_id || null,
    });
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
            schedule: item.schedule || null,
            temporary_access_until: item.temporary_access_until || null,
          }
        : null,
  };

  return { changeData };
}

