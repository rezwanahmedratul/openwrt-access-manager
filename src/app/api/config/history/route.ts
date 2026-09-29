import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { getMockState } from '@/lib/mock-store';
import { generateFirewallConfig, generateEthersConfig, computeConfigHash, UserConfigInput } from '@/lib/config-generator';
import { getMacAuthSettings } from '@/lib/mac-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  await getMacAuthSettings();
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
    const mapped: UserConfigInput[] = state.mockUsers.map((u) => {
      const uGroups = u.groups.map((ug) => state.mockGroups.find((mg) => mg.id === ug.id) || ug);
      return {
        name: u.name,
        mac_address: u.mac_address,
        is_no_internet: Boolean(uGroups.some((g) => g.is_no_internet)),
      };
    });
    const macAuth = await getMacAuthSettings();
    const firewallContent = generateFirewallConfig(mapped, macAuth.enabled);
    const ethersContent = generateEthersConfig(state.mockUsers);
    const hash = computeConfigHash(firewallContent, ethersContent);

    return NextResponse.json({
      history: [
        {
          id: 'mock-conf-1',
          version: state.mockVersion,
          hash,
          user_count: state.mockUsers.length,
          is_current: true,
          metadata: { applied_at: state.mockLastApplied },
          created_at: state.mockLastApplied || new Date().toISOString(),
          firewall_content: firewallContent,
          ethers_content: ethersContent,
        },
      ],
    });
  }
}
