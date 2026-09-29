import { getServiceSupabase } from '@/lib/supabase';
import { generateFirewallConfig } from '@/lib/config-generator';
import { getMockState } from '@/lib/mock-store';
import { cacheGet, cacheSet } from '@/lib/cache';
import { getMacAuthSettings } from '@/lib/mac-auth';

const FIREWALL_CACHE_KEY = 'cache:config:firewall';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function authenticateRouter(request: Request): boolean {
  const authHeader = request.headers.get('authorization') || '';
  const routerSecret = process.env.ROUTER_SECRET || 'openwrt-secret-token-change-in-production';
  const { searchParams } = new URL(request.url);
  const isDownload = searchParams.get('download') === 'true';

  if (isDownload) return true;
  return authHeader === `Bearer ${routerSecret}`;
}

export async function GET(request: Request) {
  if (!authenticateRouter(request)) {
    return new Response('Unauthorized: Invalid router credentials', { status: 401 });
  }

  // Ensure expired MAC auth duration is auto re-enabled and published first
  const macAuth = await getMacAuthSettings();

  // Check cache first
  const cachedContent = await cacheGet<string>(FIREWALL_CACHE_KEY);
  if (cachedContent !== null) {
    return new Response(cachedContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': 'inline; filename="firewall"',
        'X-Cache': 'HIT',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
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

  let content = '';

  if (isSupabaseConfigured) {
    try {
      const { data: config } = await supabase
        .from('configurations')
        .select('firewall_content')
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (config && config.firewall_content) {
        content = config.firewall_content;
      }
    } catch (e) {
      console.error('Error fetching firewall_content from Supabase:', e);
    }
  }

  if (!content) {
    if (isSupabaseConfigured) {
      try {
        const { data: users } = await supabase
          .from('users')
          .select('name, mac_address, user_groups ( groups ( is_no_internet ) )')
          .order('name');
        const mapped = (users || []).map((u: any) => ({
          name: u.name,
          mac_address: u.mac_address,
          is_no_internet: Boolean(u.user_groups?.some((ug: any) => ug.groups?.is_no_internet)),
        }));
        content = generateFirewallConfig(mapped, macAuth.enabled);
      } catch (e) {
        console.error('Error generating fallback firewall config from Supabase:', e);
      }
    }

    if (!content) {
      const state = getMockState();
      const mapped = state.mockUsers.map((u) => {
        const uGroups = u.groups.map((ug) => state.mockGroups.find((mg) => mg.id === ug.id) || ug);
        return {
          name: u.name,
          mac_address: u.mac_address,
          is_no_internet: Boolean(uGroups.some((g) => g.is_no_internet)),
        };
      });
      content = generateFirewallConfig(mapped, macAuth.enabled);
    }
  }

  // Store in Redis / memory cache with safe TTL
  await cacheSet(FIREWALL_CACHE_KEY, content, ttl);

  return new Response(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'inline; filename="firewall"',
      'X-Cache': 'MISS',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
