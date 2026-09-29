import { getServiceSupabase } from './supabase';
import { getMockState } from './mock-store';
import { MacAuthSettings } from './types';
import { cacheDelPrefix } from './cache';
import { generateFirewallConfig, generateEthersConfig, computeConfigHash, UserConfigInput } from './config-generator';

let reenablePromise: Promise<MacAuthSettings> | null = null;

async function triggerAutoReEnable(isSupabase: boolean): Promise<MacAuthSettings> {
  const newMacAuth: MacAuthSettings = {
    enabled: true,
    disabled_until: null,
    disabled_by_role: undefined,
  };

  if (isSupabase) {
    const supabase = getServiceSupabase();
    try {
      // Check if MAC auth was already re-enabled manually
      const { data: currentSettings } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'mac_auth')
        .maybeSingle();

      if (currentSettings?.value) {
        if (currentSettings.value.enabled === true) {
          return currentSettings.value;
        }
        if (currentSettings.value.disabled_until) {
          const currentExpiry = new Date(currentSettings.value.disabled_until).getTime();
          if (!isNaN(currentExpiry) && Date.now() < currentExpiry) {
            // Expiration timestamp in database is still in the future — do not re-enable early
            return currentSettings.value;
          }
        }
      }

      // 1. Update app_settings
      await supabase.from('app_settings').upsert({
        key: 'mac_auth',
        value: newMacAuth,
        updated_at: new Date().toISOString(),
      });

      // 2. Fetch users and group data for config generation
      const { data: users } = await supabase
        .from('users')
        .select('name, mac_address, user_groups ( groups ( is_no_internet ) )')
        .order('name');

      const mapped: UserConfigInput[] = (users || []).map((u: any) => ({
        name: u.name,
        mac_address: u.mac_address,
        is_no_internet: Boolean(u.user_groups?.some((ug: any) => ug.groups?.is_no_internet)),
      }));

      // 3. Generate firewall & ethers configs with MAC auth enabled
      const firewall = generateFirewallConfig(mapped, true);
      const ethers = generateEthersConfig(mapped);
      const configHash = computeConfigHash(firewall, ethers);

      // 4. Fetch latest version
      const { data: lastConfig } = await supabase
        .from('configurations')
        .select('version')
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextVersion = (lastConfig?.version || 0) + 1;

      // 5. Publish new configuration
      await supabase.from('configurations').update({ is_current: false }).eq('is_current', true);
      const { error: insertError } = await supabase.from('configurations').insert({
        version: nextVersion,
        hash: configHash,
        user_count: mapped.length,
        firewall_content: firewall,
        ethers_content: ethers,
        is_current: true,
        metadata: {
          mac_auth_change: true,
          auto_re_enabled: true,
          applied_at: new Date().toISOString(),
        },
      });

      if (insertError) {
        console.error('Error inserting auto-re-enabled configuration:', insertError);
      }

      // Sync mock store in memory as well
      const state = getMockState();
      state.setMockMacAuth(newMacAuth);
      state.setMockVersion(nextVersion);
      state.setMockLastApplied(new Date().toISOString());
    } catch (err) {
      console.error('Failed to publish auto-re-enabled MAC auth config in Supabase:', err);
    }
  } else {
    // Mock store mode
    const state = getMockState();
    if (state.mockMacAuth.enabled === true) {
      return state.mockMacAuth;
    }
    if (state.mockMacAuth.disabled_until) {
      const currentExpiry = new Date(state.mockMacAuth.disabled_until).getTime();
      if (!isNaN(currentExpiry) && Date.now() < currentExpiry) {
        return state.mockMacAuth;
      }
    }
    const mapped: UserConfigInput[] = state.mockUsers.map((u) => {
      const uGroups = u.groups.map((ug) => state.mockGroups.find((mg) => mg.id === ug.id) || ug);
      return {
        name: u.name,
        mac_address: u.mac_address,
        is_no_internet: Boolean(uGroups.some((g) => g.is_no_internet)),
      };
    });
    const firewall = generateFirewallConfig(mapped, true);
    const ethers = generateEthersConfig(state.mockUsers);
    const hash = computeConfigHash(firewall, ethers);

    state.setMockMacAuth(newMacAuth);
    state.setMockVersion(state.mockVersion + 1);
    state.setMockLastApplied(new Date().toISOString());
  }

  // Purge all caches immediately so router (/api/config/version) and firewall download get new config
  await cacheDelPrefix('cache:');

  return newMacAuth;
}

let activeServerTimer: NodeJS.Timeout | null = null;

export function scheduleServerExpiryTimer(disabledUntil: string | null) {
  if (activeServerTimer) {
    clearTimeout(activeServerTimer);
    activeServerTimer = null;
  }

  if (!disabledUntil) return;

  const expiry = new Date(disabledUntil).getTime();
  const delay = expiry - Date.now();

  if (delay <= 0) {
    const isSupabaseConfigured = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http')
    );
    if (!reenablePromise) {
      reenablePromise = triggerAutoReEnable(isSupabaseConfigured).finally(() => {
        reenablePromise = null;
      });
    }
    return;
  }

  // Node.js setTimeout limit is 2^31 - 1 (~24.8 days)
  if (delay < 2147483647) {
    activeServerTimer = setTimeout(async () => {
      activeServerTimer = null;
      const isSupabaseConfigured = Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http')
      );
      try {
        if (!reenablePromise) {
          reenablePromise = triggerAutoReEnable(isSupabaseConfigured).finally(() => {
            reenablePromise = null;
          });
        }
        await reenablePromise;
      } catch (err) {
        console.error('[MacAuth] Background auto re-enable timer failed:', err);
      }
    }, delay);

    activeServerTimer.unref?.();
  }
}

/**
 * Gets the current MAC authentication settings.
 * Checks Supabase `app_settings` if configured, otherwise falls back to mock store.
 * Automatically checks and handles expiration of temporary disabled_until durations,
 * regenerating and publishing the firewall configuration to the router.
 */
export async function getMacAuthSettings(): Promise<MacAuthSettings> {
  const isSupabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http')
  );

  if (isSupabaseConfigured) {
    try {
      const supabase = getServiceSupabase();
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'mac_auth')
        .maybeSingle();

      if (!error && data && data.value) {
        let macAuth: MacAuthSettings = data.value;
        if (!macAuth.enabled && macAuth.disabled_until) {
          const expiry = new Date(macAuth.disabled_until).getTime();
          if (!isNaN(expiry) && Date.now() >= expiry) {
            if (!reenablePromise) {
              reenablePromise = triggerAutoReEnable(true).finally(() => {
                reenablePromise = null;
              });
            }
            macAuth = await reenablePromise;
          } else if (!isNaN(expiry) && Date.now() < expiry) {
            // Ensure server-side proactive background timer is active
            if (!activeServerTimer) {
              scheduleServerExpiryTimer(macAuth.disabled_until);
            }
          }
        }
        // Keep in-memory store in sync
        getMockState().setMockMacAuth(macAuth);
        return macAuth;
      }
    } catch (e) {
      console.error('Error fetching mac_auth from Supabase, falling back to mock:', e);
    }
  }

  const state = getMockState();
  if (!state.mockMacAuth.enabled && state.mockMacAuth.disabled_until) {
    const expiry = new Date(state.mockMacAuth.disabled_until).getTime();
    if (!isNaN(expiry) && Date.now() >= expiry) {
      if (!reenablePromise) {
        reenablePromise = triggerAutoReEnable(false).finally(() => {
          reenablePromise = null;
        });
      }
      return await reenablePromise;
    } else if (!isNaN(expiry) && Date.now() < expiry) {
      if (!activeServerTimer) {
        scheduleServerExpiryTimer(state.mockMacAuth.disabled_until);
      }
    }
  }

  return state.mockMacAuth;
}

