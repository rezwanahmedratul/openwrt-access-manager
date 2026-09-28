import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { generateFirewallConfig, generateEthersConfig, computeConfigHash, UserConfigInput } from '@/lib/config-generator';
import { getMockState } from '@/lib/mock-store';

export async function POST() {
  const supabase = getServiceSupabase();
  const isSupabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http'));

  if (isSupabaseConfigured) {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select(`
          id, name, mac_address, created_at, updated_at,
          user_groups ( group_id )
        `);

      const { data: changes } = await supabase
        .from('draft_changes')
        .select('*')
        .order('sequence', { ascending: true });

      if (!changes || changes.length === 0) {
        return NextResponse.json({ error: 'No pending changes to apply' }, { status: 400 });
      }

      for (const change of changes) {
        if (change.operation === 'ADD' && change.user_data) {
          const { data: newUser, error: userError } = await supabase
            .from('users')
            .insert({
              name: change.user_data.name,
              mac_address: change.user_data.mac_address,
            })
            .select()
            .single();

          if (userError) throw userError;

          let groupIdsToInsert = change.user_data.group_ids || [];
          if (groupIdsToInsert.length === 0) {
            const { data: defGroup } = await supabase.from('groups').select('id').ilike('name', 'Default').maybeSingle();
            if (defGroup?.id) {
              groupIdsToInsert = [defGroup.id];
            }
          }

          if (groupIdsToInsert.length > 0) {
            const junctionRows = groupIdsToInsert.map((gid: string) => ({
              user_id: newUser.id,
              group_id: gid,
            }));
            await supabase.from('user_groups').insert(junctionRows);
          }
        } else if (change.operation === 'MODIFY' && change.user_id && change.user_data) {
          await supabase
            .from('users')
            .update({
              name: change.user_data.name,
              mac_address: change.user_data.mac_address,
              updated_at: new Date().toISOString(),
            })
            .eq('id', change.user_id);

          await supabase.from('user_groups').delete().eq('user_id', change.user_id);

          let groupIdsToInsert = change.user_data.group_ids || [];
          if (groupIdsToInsert.length === 0) {
            const { data: defGroup } = await supabase.from('groups').select('id').ilike('name', 'Default').maybeSingle();
            if (defGroup?.id) {
              groupIdsToInsert = [defGroup.id];
            }
          }

          if (groupIdsToInsert.length > 0) {
            const junctionRows = groupIdsToInsert.map((gid: string) => ({
              user_id: change.user_id,
              group_id: gid,
            }));
            await supabase.from('user_groups').insert(junctionRows);
          }
        } else if (change.operation === 'DELETE' && change.user_id) {
          await supabase.from('users').delete().eq('id', change.user_id);
        }
      }

      const { data: finalUserData, error: finalError } = await supabase
        .from('users')
        .select(`
          name,
          mac_address,
          user_groups (
            groups (
              is_no_internet
            )
          )
        `)
        .order('name');

      if (finalError) throw finalError;

      const finalUsers: UserConfigInput[] = (finalUserData || []).map((u: any) => ({
        name: u.name,
        mac_address: u.mac_address,
        is_no_internet: Boolean(u.user_groups?.some((ug: any) => ug.groups?.is_no_internet)),
      }));

      const firewallContent = generateFirewallConfig(finalUsers);
      const ethersContent = generateEthersConfig(finalUsers);
      const hash = computeConfigHash(firewallContent, ethersContent);

      const { data: lastConfig } = await supabase
        .from('configurations')
        .select('version')
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextVersion = (lastConfig?.version || 0) + 1;

      await supabase.from('configurations').update({ is_current: false }).eq('is_current', true);

      const { error: configError } = await supabase
        .from('configurations')
        .insert({
          version: nextVersion,
          hash,
          user_count: finalUsers.length,
          firewall_content: firewallContent,
          ethers_content: ethersContent,
          is_current: true,
          metadata: {
            applied_at: new Date().toISOString(),
            applied_changes_count: changes.length,
          },
        });

      if (configError) throw configError;

      await supabase.from('draft_changes').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      return NextResponse.json({
        success: true,
        version: nextVersion,
        hash,
        user_count: finalUsers.length,
        message: `Version ${nextVersion} published successfully`,
      });
    } catch (err: any) {
      console.error('Apply error:', err);
      return NextResponse.json({ error: err.message || 'Failed to apply configuration' }, { status: 500 });
    }
  } else {
    const state = getMockState();
    if (state.mockDraftChanges.length === 0) {
      return NextResponse.json({ error: 'No pending changes to apply' }, { status: 400 });
    }

    let defaultGroup = state.mockGroups.find((g) => g.name.toLowerCase() === 'default');
    if (!defaultGroup) {
      defaultGroup = { id: 'g-default', name: 'Default', created_at: '', updated_at: '' };
      state.setMockGroups([defaultGroup, ...state.mockGroups]);
    }

    let updatedUsers = [...state.mockUsers];

    for (const change of state.mockDraftChanges) {
      if (change.operation === 'ADD' && change.user_data) {
        let assignedGroups = state.mockGroups.filter((g) => change.user_data?.group_ids?.includes(g.id));
        if (assignedGroups.length === 0 && defaultGroup) {
          assignedGroups = [defaultGroup];
        }
        updatedUsers.push({
          id: 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
          name: change.user_data.name,
          mac_address: change.user_data.mac_address,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          groups: assignedGroups,
        });
      } else if (change.operation === 'MODIFY' && change.user_id && change.user_data) {
        let assignedGroups = state.mockGroups.filter((g) => change.user_data?.group_ids?.includes(g.id));
        if (assignedGroups.length === 0 && defaultGroup) {
          assignedGroups = [defaultGroup];
        }
        updatedUsers = updatedUsers.map((u) => {
          if (u.id === change.user_id) {
            return {
              ...u,
              name: change.user_data?.name || u.name,
              mac_address: change.user_data?.mac_address || u.mac_address,
              groups: assignedGroups,
              updated_at: new Date().toISOString(),
            };
          }
          return u;
        });
      } else if (change.operation === 'DELETE' && change.user_id) {
        updatedUsers = updatedUsers.filter((u) => u.id !== change.user_id);
      }
    }

    const nextVer = state.mockVersion + 1;
    const finalUsersForConfig: UserConfigInput[] = updatedUsers.map((u) => {
      const uGroups = u.groups.map((ug) => state.mockGroups.find((mg) => mg.id === ug.id) || ug);
      return {
        name: u.name,
        mac_address: u.mac_address,
        is_no_internet: Boolean(uGroups.some((g) => g.is_no_internet)),
      };
    });
    const firewall = generateFirewallConfig(finalUsersForConfig, state.mockMacAuth.enabled);
    const ethers = generateEthersConfig(updatedUsers);
    const hash = computeConfigHash(firewall, ethers);

    state.setMockUsers(updatedUsers);
    state.setMockDraftChanges([]);
    state.setMockVersion(nextVer);
    state.setMockLastApplied(new Date().toISOString());

    return NextResponse.json({
      success: true,
      version: nextVer,
      hash,
      user_count: updatedUsers.length,
      message: `Version ${nextVer} published successfully`,
    });
  }
}
