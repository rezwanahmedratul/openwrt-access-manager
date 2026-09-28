import { getServiceSupabase } from '@/lib/supabase';
import { generateFirewallConfig } from '@/lib/config-generator';
import { getMockState } from '@/lib/mock-store';

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

  const supabase = getServiceSupabase();
  const isSupabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http'));

  let content = '';

  if (isSupabaseConfigured) {
    const { data: config } = await supabase
      .from('configurations')
      .select('firewall_content')
      .eq('is_current', true)
      .maybeSingle();

    if (!config) {
      const { data: users } = await supabase
        .from('users')
        .select('name, mac_address, user_groups ( groups ( is_no_internet ) )');
      const mapped = (users || []).map((u: any) => ({
        name: u.name,
        mac_address: u.mac_address,
        is_no_internet: Boolean(u.user_groups?.some((ug: any) => ug.groups?.is_no_internet)),
      }));
      content = generateFirewallConfig(mapped);
    } else {
      content = config.firewall_content;
    }
  } else {
    const state = getMockState();
    const mapped = state.mockUsers.map((u) => {
      const uGroups = u.groups.map((ug) => state.mockGroups.find((mg) => mg.id === ug.id) || ug);
      return {
        name: u.name,
        mac_address: u.mac_address,
        is_no_internet: Boolean(uGroups.some((g) => g.is_no_internet)),
      };
    });
    content = generateFirewallConfig(mapped, state.mockMacAuth.enabled);
  }

  return new Response(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'inline; filename="firewall"',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
