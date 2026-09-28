import { getServiceSupabase } from '@/lib/supabase';
import { generateEthersConfig } from '@/lib/config-generator';
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
      .select('ethers_content')
      .eq('is_current', true)
      .maybeSingle();

    if (!config) {
      const { data: users } = await supabase.from('users').select('name, mac_address');
      content = generateEthersConfig(users || []);
    } else {
      content = config.ethers_content;
    }
  } else {
    const state = getMockState();
    content = generateEthersConfig(state.mockUsers);
  }

  return new Response(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'inline; filename="ethers"',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
