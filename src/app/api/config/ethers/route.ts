import { getServiceSupabase } from '@/lib/supabase';
import { generateEthersConfig } from '@/lib/config-generator';
import { getMockState } from '@/lib/mock-store';
import { cacheGet, cacheSet } from '@/lib/cache';

const ETHERS_CACHE_KEY = 'cache:config:ethers';

import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function authenticateRouter(request: Request): boolean {
  // Allow authenticated session users (Admin & Subadmin) to preview/download configs
  const session = getSessionFromRequest(request);
  if (session) return true;

  const authHeader = request.headers.get('authorization') || '';
  const routerSecret = process.env.ROUTER_SECRET || 'openwrt-secret-token-change-in-production';
  return authHeader === `Bearer ${routerSecret}`;
}

export async function GET(request: Request) {
  if (!authenticateRouter(request)) {
    return NextResponse.json({ error: 'Unauthorized: Invalid router credentials or session required' }, { status: 401 });
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
    try {
      const { data: config } = await supabase
        .from('configurations')
        .select('ethers_content')
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (config && config.ethers_content) {
        content = config.ethers_content;
      }
    } catch (e) {
      console.error('Error fetching ethers_content from Supabase:', e);
    }
  }

  if (!content) {
    if (isSupabaseConfigured) {
      try {
        const { data: users } = await supabase.from('users').select('name, mac_address').order('name');
        content = generateEthersConfig(users || []);
      } catch (e) {
        console.error('Error generating fallback ethers config from Supabase:', e);
      }
    }
    if (!content) {
      const state = getMockState();
      content = generateEthersConfig(state.mockUsers);
    }
  }

  // Cache in Redis/memory (60 seconds)
  await cacheSet(ETHERS_CACHE_KEY, content, 60);

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
