import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getMockState } from '@/lib/mock-store';
import { generateFirewallConfig, generateEthersConfig, computeConfigHash, UserConfigInput } from '@/lib/config-generator';
import { cacheGet, cacheSet } from '@/lib/cache';

const CONFIG_VERSION_CACHE_KEY = 'cache:config:version';

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

  const supabase = getServiceSupabase();
  const isSupabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http')
  );

  if (isSupabaseConfigured) {
    const { data: config, error } = await supabase
      .from('configurations')
      .select('version, hash, created_at')
      .eq('is_current', true)
      .maybeSingle();

    if (error || !config) {
      return NextResponse.json({ error: 'No published configuration found' }, { status: 404 });
    }

    const payload = {
      version: config.version,
      hash: config.hash,
      created_at: config.created_at,
    };

    await cacheSet(CONFIG_VERSION_CACHE_KEY, payload, 300);

    return NextResponse.json(payload, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'no-cache',
      },
    });
  } else {
    const state = getMockState();
    const mapped: UserConfigInput[] = state.mockUsers.map((u) => {
      const uGroups = u.groups.map((ug) => state.mockGroups.find((mg) => mg.id === ug.id) || ug);
      return {
        name: u.name,
        mac_address: u.mac_address,
        is_no_internet: Boolean(uGroups.some((g) => g.is_no_internet)),
      };
    });
    const firewall = generateFirewallConfig(mapped, state.mockMacAuth.enabled);
    const ethers = generateEthersConfig(state.mockUsers);
    const hash = computeConfigHash(firewall, ethers);

    const payload = {
      version: state.mockVersion,
      hash,
      created_at: state.mockLastApplied,
    };

    await cacheSet(CONFIG_VERSION_CACHE_KEY, payload, 300);

    return NextResponse.json(payload, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'no-cache',
      },
    });
  }
}
