import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getMockState } from '@/lib/mock-store';
import { generateFirewallConfig, generateEthersConfig, computeConfigHash, UserConfigInput } from '@/lib/config-generator';
import { cacheGet, cacheSet } from '@/lib/cache';
import { getMacAuthSettings } from '@/lib/mac-auth';

const CONFIG_VERSION_CACHE_KEY = 'cache:config:version';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function authenticateRouter(request: Request): boolean {
  const authHeader = request.headers.get('authorization') || '';
  const routerSecret = process.env.ROUTER_SECRET || 'openwrt-secret-token-change-in-production';
  const expected = `Bearer ${routerSecret}`;
  return authHeader === expected;
}

export async function GET(request: Request) {
  if (!authenticateRouter(request)) {
    return NextResponse.json({ error: 'Unauthorized: Invalid router credentials' }, { status: 401 });
  }

  // Check MAC auth status and handle auto-expiration first.
  // If MAC auth was temporarily disabled and has now expired, getMacAuthSettings()
  // will publish the new configuration (incrementing version and updating hash)
  // and invalidate the cache before we query the version.
  const macAuth = await getMacAuthSettings();

  // Check cache first for instant sub-millisecond response
  const cached = await cacheGet<{ version: number; hash: string; created_at: string }>(CONFIG_VERSION_CACHE_KEY);
  if (cached) {
    return NextResponse.json(cached, {
      headers: {
        'X-Cache': 'HIT',
        'Cache-Control': 'no-cache',
      },
    });
  }

  // Calculate safe TTL: never cache beyond the expiration of disabled_until
  let ttl = 60;
  if (!macAuth.enabled && macAuth.disabled_until) {
    const msUntilExpiry = new Date(macAuth.disabled_until).getTime() - Date.now();
    const secUntilExpiry = Math.max(1, Math.floor(msUntilExpiry / 1000));
    ttl = Math.min(60, secUntilExpiry);
  }

  const supabase = getServiceSupabase();
  const isSupabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http')
  );

  if (isSupabaseConfigured) {
    try {
      const { data: config } = await supabase
        .from('configurations')
        .select('version, hash, created_at')
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (config && config.version && config.hash) {
        const payload = {
          version: config.version,
          hash: config.hash,
          created_at: config.created_at,
        };

        await cacheSet(CONFIG_VERSION_CACHE_KEY, payload, ttl);

        return NextResponse.json(payload, {
          headers: {
            'X-Cache': 'MISS',
            'Cache-Control': 'no-cache',
          },
        });
      }
    } catch (e) {
      console.error('Error querying configuration from Supabase:', e);
    }
  }

  // Fallback to generating directly from active state
  const state = getMockState();
  const mapped: UserConfigInput[] = state.mockUsers.map((u) => {
    const uGroups = u.groups.map((ug) => state.mockGroups.find((mg) => mg.id === ug.id) || ug);
    return {
      name: u.name,
      mac_address: u.mac_address,
      is_no_internet: Boolean(uGroups.some((g) => g.is_no_internet)),
    };
  });
  const firewall = generateFirewallConfig(mapped, macAuth.enabled);
  const ethers = generateEthersConfig(state.mockUsers);
  const hash = computeConfigHash(firewall, ethers);

  const payload = {
    version: state.mockVersion,
    hash,
    created_at: state.mockLastApplied,
  };

  await cacheSet(CONFIG_VERSION_CACHE_KEY, payload, ttl);

  return NextResponse.json(payload, {
    headers: {
      'X-Cache': 'MISS',
      'Cache-Control': 'no-cache',
    },
  });
}
