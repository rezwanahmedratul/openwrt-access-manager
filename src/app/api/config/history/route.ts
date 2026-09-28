import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getMockState } from '@/lib/mock-store';

export async function GET() {
  const supabase = getServiceSupabase();
  const isSupabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http'));

  if (isSupabaseConfigured) {
    const { data: configs, error } = await supabase
      .from('configurations')
      .select('id, version, hash, user_count, is_current, metadata, created_at, firewall_content, ethers_content')
      .order('version', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ history: configs || [] });
  } else {
    const state = getMockState();
    return NextResponse.json({
      history: [
        {
          id: 'mock-conf-1',
          version: state.mockVersion,
          hash: 'mock-hash-v' + state.mockVersion,
          user_count: state.mockUsers.length,
          is_current: true,
          metadata: { applied_at: state.mockLastApplied },
          created_at: state.mockLastApplied || new Date().toISOString(),
          firewall_content: '',
          ethers_content: '',
        },
      ],
    });
  }
}
