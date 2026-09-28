import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getMockState } from '@/lib/mock-store';

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

  const supabase = getServiceSupabase();
  const isSupabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http'));

  if (isSupabaseConfigured) {
    const { data: config, error } = await supabase
      .from('configurations')
      .select('version, hash, created_at')
      .eq('is_current', true)
      .maybeSingle();

    if (error || !config) {
      return NextResponse.json({ error: 'No published configuration found' }, { status: 404 });
    }

    return NextResponse.json({
      version: config.version,
      hash: config.hash,
      created_at: config.created_at,
    });
  } else {
    const state = getMockState();
    return NextResponse.json({
      version: state.mockVersion,
      hash: 'mock-hash-v' + state.mockVersion,
      created_at: state.mockLastApplied,
    });
  }
}
