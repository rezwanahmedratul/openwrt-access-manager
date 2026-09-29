import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { getMockState } from '@/lib/mock-store';
import { getServiceSupabase } from '@/lib/supabase';
import { generateFirewallConfig, generateEthersConfig, computeConfigHash, UserConfigInput } from '@/lib/config-generator';
import { MacAuthSettings } from '@/lib/types';
import { getMacAuthSettings, scheduleServerExpiryTimer } from '@/lib/mac-auth';
import { cacheDelPrefix } from '@/lib/cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const macAuth = await getMacAuthSettings();

  return NextResponse.json({
    mac_auth: macAuth,
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

    // Always update in-memory mock store
    state.setMockMacAuth(newMacAuth);

    // Schedule proactive server-side timer for automatic re-enable
    scheduleServerExpiryTimer(newMacAuth.disabled_until);

    const isSupabaseConfigured = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http')
    );

    let nextVersion = state.mockVersion + 1;
    let configHash = '';

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
          .select('name, mac_address, user_groups ( groups ( is_no_internet ) )')
          .order('name');

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

        nextVersion = (lastConfig?.version || 0) + 1;
        const firewall = generateFirewallConfig(mapped, newMacAuth.enabled);
        const ethers = generateEthersConfig(mapped);
        configHash = computeConfigHash(firewall, ethers);

        await supabase.from('configurations').update({ is_current: false }).eq('is_current', true);
        await supabase.from('configurations').insert({
          version: nextVersion,
          hash: configHash,
          user_count: mapped.length,
          firewall_content: firewall,
          ethers_content: ethers,
          is_current: true,
          metadata: {
            mac_auth_change: true,
            applied_at: new Date().toISOString(),
          },
        });
      } catch (e) {
        console.error('Supabase update mac-auth error, falling back to mock:', e);
      }
    }

    // Always keep mock store version & hash in sync as well
    const updatedUsers = state.mockUsers;
    const finalUsersForConfig: UserConfigInput[] = updatedUsers.map((u) => {
      const uGroups = u.groups.map((ug) => state.mockGroups.find((mg) => mg.id === ug.id) || ug);
      return {
        name: u.name,
        mac_address: u.mac_address,
        is_no_internet: Boolean(uGroups.some((g) => g.is_no_internet)),
      };
    });

    const mockFirewall = generateFirewallConfig(finalUsersForConfig, newMacAuth.enabled);
    const mockEthers = generateEthersConfig(updatedUsers);
    if (!configHash) {
      configHash = computeConfigHash(mockFirewall, mockEthers);
    }
    state.setMockVersion(nextVersion);
    state.setMockLastApplied(new Date().toISOString());

    // CRITICAL: Purge all caches immediately so router gets the new version and new hash instantly!
    await cacheDelPrefix('cache:');

    return NextResponse.json({
      success: true,
      mac_auth: newMacAuth,
      version: nextVersion,
      hash: configHash,
      message: newMacAuth.enabled
        ? 'MAC Authentication turned ON (Access restricted to registered MACs)'
        : `MAC Authentication turned OFF (Open to all devices${newMacAuth.disabled_until ? ` until ${new Date(newMacAuth.disabled_until).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ' permanently'})`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
