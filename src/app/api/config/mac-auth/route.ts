import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { getMockState } from '@/lib/mock-store';
import { getServiceSupabase } from '@/lib/supabase';
import { generateFirewallConfig, generateEthersConfig, computeConfigHash, UserConfigInput } from '@/lib/config-generator';
import { MacAuthSettings } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isSupabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http')
  );

  if (isSupabaseConfigured) {
    try {
      const supabase = getServiceSupabase();
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'mac_auth')
        .maybeSingle();

      if (data && data.value) {
        let macAuth: MacAuthSettings = data.value;
        if (!macAuth.enabled && macAuth.disabled_until) {
          const expiry = new Date(macAuth.disabled_until).getTime();
          if (!isNaN(expiry) && Date.now() >= expiry) {
            macAuth = { enabled: true, disabled_until: null, disabled_by_role: undefined };
            await supabase.from('app_settings').upsert({
              key: 'mac_auth',
              value: macAuth,
              updated_at: new Date().toISOString(),
            });
          }
        }
        return NextResponse.json({
          mac_auth: macAuth,
          current_role: session.role,
        });
      }
    } catch (e) {
      console.error('Supabase get mac-auth error, falling back to mock:', e);
    }
  }

  const state = getMockState();
  return NextResponse.json({
    mac_auth: state.mockMacAuth,
    current_role: session.role,
  });
}

export async function POST(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { enabled, disabled_until } = body;
    const state = getMockState();

    let newMacAuth: MacAuthSettings;

    if (enabled === true) {
      newMacAuth = {
        enabled: true,
        disabled_until: null,
      };
    } else {
      if (session.role === 'subadmin') {
        if (!disabled_until) {
          return NextResponse.json(
            { error: 'Subadmins cannot disable MAC authentication permanently. You must select an end date/duration.' },
            { status: 403 }
          );
        }

        const expiryDate = new Date(disabled_until);
        const maxExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days max
        if (isNaN(expiryDate.getTime()) || expiryDate.getTime() <= Date.now()) {
          return NextResponse.json(
            { error: 'Invalid expiration date. Please select a valid future date.' },
            { status: 400 }
          );
        }

        if (expiryDate.getTime() > maxExpiry.getTime() + 60000) {
          return NextResponse.json(
            { error: 'Subadmins cannot disable MAC authentication for more than 30 days.' },
            { status: 403 }
          );
        }

        newMacAuth = {
          enabled: false,
          disabled_until: expiryDate.toISOString(),
          disabled_by_role: 'subadmin',
        };
      } else {
        newMacAuth = {
          enabled: false,
          disabled_until: disabled_until ? new Date(disabled_until).toISOString() : null,
          disabled_by_role: 'admin',
        };
      }
    }

    state.setMockMacAuth(newMacAuth);

    const isSupabaseConfigured = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http')
    );

    if (isSupabaseConfigured) {
      try {
        const supabase = getServiceSupabase();
        await supabase.from('app_settings').upsert({
          key: 'mac_auth',
          value: newMacAuth,
          updated_at: new Date().toISOString(),
        });

        const { data: users } = await supabase
          .from('users')
          .select('name, mac_address, user_groups ( groups ( is_no_internet ) )');

        const mapped: UserConfigInput[] = (users || []).map((u: any) => ({
          name: u.name,
          mac_address: u.mac_address,
          is_no_internet: Boolean(u.user_groups?.some((ug: any) => ug.groups?.is_no_internet)),
        }));

        const { data: lastConfig } = await supabase
          .from('configurations')
          .select('version')
          .order('version', { ascending: false })
          .limit(1)
          .maybeSingle();

        const nextVersion = (lastConfig?.version || 0) + 1;
        const firewall = generateFirewallConfig(mapped, newMacAuth.enabled);
        const ethers = generateEthersConfig(mapped);
        const hash = computeConfigHash(firewall, ethers);

        await supabase.from('configurations').update({ is_current: false }).eq('is_current', true);
        await supabase.from('configurations').insert({
          version: nextVersion,
          hash,
          user_count: mapped.length,
          firewall_content: firewall,
          ethers_content: ethers,
          is_current: true,
          metadata: {
            mac_auth_change: true,
            applied_at: new Date().toISOString(),
          },
        });

        return NextResponse.json({
          success: true,
          mac_auth: newMacAuth,
          version: nextVersion,
          hash,
          message: newMacAuth.enabled
            ? 'MAC Authentication turned ON (Access restricted to registered MACs)'
            : `MAC Authentication turned OFF (Open to all devices${newMacAuth.disabled_until ? ` until ${new Date(newMacAuth.disabled_until).toLocaleString()}` : ' permanently'})`,
        });
      } catch (e) {
        console.error('Supabase update mac-auth error, falling back to mock:', e);
      }
    }

    // Automatically update firewall config and version for mock store
    const updatedUsers = state.mockUsers;
    const finalUsersForConfig: UserConfigInput[] = updatedUsers.map((u) => {
      const uGroups = u.groups.map((ug) => state.mockGroups.find((mg) => mg.id === ug.id) || ug);
      return {
        name: u.name,
        mac_address: u.mac_address,
        is_no_internet: Boolean(uGroups.some((g) => g.is_no_internet)),
      };
    });

    const nextVer = state.mockVersion + 1;
    const currentState = getMockState();
    const firewall = generateFirewallConfig(finalUsersForConfig, currentState.mockMacAuth.enabled);
    const ethers = generateEthersConfig(updatedUsers);
    const hash = computeConfigHash(firewall, ethers);

    state.setMockVersion(nextVer);
    state.setMockLastApplied(new Date().toISOString());

    return NextResponse.json({
      success: true,
      mac_auth: currentState.mockMacAuth,
      version: nextVer,
      hash,
      message: currentState.mockMacAuth.enabled
        ? 'MAC Authentication turned ON (Access restricted to registered MACs)'
        : `MAC Authentication turned OFF (Open to all devices${currentState.mockMacAuth.disabled_until ? ` until ${new Date(currentState.mockMacAuth.disabled_until).toLocaleString()}` : ' permanently'})`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
