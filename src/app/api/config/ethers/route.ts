import { getServiceSupabase } from '@/lib/supabase';
import { generateEthersConfig } from '@/lib/config-generator';
import { getMockState } from '@/lib/mock-store';
import { cacheGet, cacheSet } from '@/lib/cache';

const ETHERS_CACHE_KEY = 'cache:config:ethers';

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

  // Check cache first
  const cachedContent = await cacheGet<string>(ETHERS_CACHE_KEY);
  if (cachedContent !== null) {
    return new Response(cachedContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': 'inline; filename="ethers"',
        'X-Cache': 'HIT',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  }

  const supabase = getServiceSupabase();
  const isSupabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http')
  );

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

  // Cache in Redis/memory
  await cacheSet(ETHERS_CACHE_KEY, content, 300);

  return new Response(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'inline; filename="ethers"',
      'X-Cache': 'MISS',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
