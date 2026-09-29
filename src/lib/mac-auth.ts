import { getServiceSupabase } from './supabase';
import { getMockState } from './mock-store';
import { MacAuthSettings } from './types';
import { cacheDelPrefix } from './cache';

/**
 * Gets the current MAC authentication settings.
 * Checks Supabase `app_settings` if configured, otherwise falls back to mock store.
 * Automatically checks and handles expiration of temporary disabled_until durations.
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
            macAuth = { enabled: true, disabled_until: null, disabled_by_role: undefined };
            await supabase.from('app_settings').upsert({
              key: 'mac_auth',
              value: macAuth,
              updated_at: new Date().toISOString(),
            });
            await cacheDelPrefix('cache:');
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
  return state.mockMacAuth;
}
