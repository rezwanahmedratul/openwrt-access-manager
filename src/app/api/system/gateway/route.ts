import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { cacheGet } from '@/lib/cache';
import { getMockState } from '@/lib/mock-store';
import { getServiceSupabase } from '@/lib/supabase';
import { generateFirewallConfig, generateEthersConfig, computeConfigHash, UserConfigInput } from '@/lib/config-generator';
import { getMacAuthSettings } from '@/lib/mac-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/system/gateway - Get router integration info (Admin only for secret, Subadmin for endpoints)
export async function GET(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
  }

  const routerSecret = process.env.ROUTER_SECRET || 'openwrt-secret-token-change-in-production';
  const routerLastSeen = await cacheGet<string>('telemetry:router:last_seen');
  const url = new URL(request.url);

  return NextResponse.json({
    success: true,
    server_origin: url.origin,
    router_secret: session.role === 'admin' ? routerSecret : undefined,
    sync_script_url: `${url.origin}/scripts/sync-config.sh`,
    endpoints: {
      version: '/api/config/version',
      firewall: '/api/config/firewall',
      ethers: '/api/config/ethers',
    },
    router_last_seen: routerLastSeen || null,
  });
}

// POST /api/system/gateway - Test gateway / config generation latency safely from mobile
export async function POST(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
  }

  const start = performance.now();
  try {
    const macAuth = await getMacAuthSettings();
    const isSupabaseConfigured = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http')
    );

    let version = 1;
    let hash = '';

    if (isSupabaseConfigured) {
      const supabase = getServiceSupabase();
      const { data: config } = await supabase
        .from('configurations')
        .select('version, hash')
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (config) {
        version = config.version;
        hash = config.hash;
      }
    } else {
      const state = getMockState();
      version = state.mockVersion;
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
      hash = computeConfigHash(firewall, ethers);
    }

    const latencyMs = Math.round(performance.now() - start);
    const routerLastSeen = await cacheGet<string>('telemetry:router:last_seen');

    return NextResponse.json({
      healthy: true,
      version,
      hash,
      latency_ms: latencyMs,
      mac_auth_enabled: macAuth.enabled,
      router_last_seen: routerLastSeen || null,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gateway diagnostic check failed' }, { status: 500 });
  }
}
