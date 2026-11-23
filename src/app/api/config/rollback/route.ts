import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getServiceSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { getMockState } from '@/lib/mock-store';
import { cacheDelPrefix } from '@/lib/cache';
import { logAudit, getClientIp } from '@/lib/audit';
import { Configuration } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const session = await requireAuth(request);
    const body = await request.json();
    const { target_version, reason } = body;

    if (typeof target_version !== 'number' || target_version <= 0) {
      return NextResponse.json({ error: 'Valid target_version is required' }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      const supabase = getServiceSupabase();

      // Fetch the historical configuration to roll back to
      const { data: historical, error: fetchErr } = await supabase
        .from('configurations')
        .select('*')
        .eq('version', target_version)
        .maybeSingle();

      if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
      if (!historical) {
        return NextResponse.json({ error: `Historical configuration version ${target_version} not found` }, { status: 404 });
      }

      // Determine next version number
      const { data: latestConfig } = await supabase
        .from('configurations')
        .select('version')
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextVersion = (latestConfig?.version || target_version) + 1;

      // Mark current configurations as not current
      await supabase.from('configurations').update({ is_current: false }).eq('is_current', true);

      // Insert new restored version
      const changeDesc = reason
        ? `Rollback to v${target_version}: ${reason}`
        : `Rollback to version ${target_version}`;

      const { data: newConfig, error: insertErr } = await supabase
        .from('configurations')
        .insert({
          version: nextVersion,
          hash: historical.hash,
          user_count: historical.user_count,
          firewall_content: historical.firewall_content,
          ethers_content: historical.ethers_content,
          is_current: true,
          rollback_from_version: target_version,
          change_description: changeDesc,
          author_id: session.id,
          author_name: session.username,
          deployment_status: 'pending',
          metadata: {
            restored_from_version: target_version,
            restored_at: new Date().toISOString(),
            original_created_at: historical.created_at,
          },
        })
        .select()
        .single();

      if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

      // Invalidate all caches
      await cacheDelPrefix('cache:');

      // Record audit event
      await logAudit({
        actor_id: session.id,
        actor_username: session.username,
        action: 'CONFIG_ROLLBACK',
        resource_type: 'configuration',
        resource_id: `v${nextVersion}`,
        details: {
          new_version: nextVersion,
          rollback_from_version: target_version,
          reason: changeDesc,
        },
        ip_address: getClientIp(request),
      });

      return NextResponse.json({
        success: true,
        version: nextVersion,
        rollback_from_version: target_version,
        hash: newConfig.hash,
        user_count: newConfig.user_count,
        message: `Successfully rolled back to version ${target_version} as version ${nextVersion}`,
      });
    } else {
      const state = getMockState();
      const historical = state.mockConfigurations.find((c) => c.version === target_version);
      if (!historical) {
        return NextResponse.json({ error: `Historical configuration version ${target_version} not found` }, { status: 404 });
      }

      const nextVersion = state.mockVersion + 1;
      const changeDesc = reason
        ? `Rollback to v${target_version}: ${reason}`
        : `Rollback to version ${target_version}`;

      const newConfig: Configuration = {
        id: `config-v${nextVersion}`,
        version: nextVersion,
        hash: historical.hash,
        user_count: historical.user_count,
        firewall_content: historical.firewall_content,
        ethers_content: historical.ethers_content,
        is_current: true,
        rollback_from_version: target_version,
        change_description: changeDesc,
        author_id: session.id,
        author_name: session.username,
        deployment_status: 'pending',
        metadata: {
          restored_from_version: target_version,
          restored_at: new Date().toISOString(),
        },
        created_at: new Date().toISOString(),
      };

      state.setMockVersion(nextVersion);
      state.setMockLastApplied(new Date().toISOString());
      state.setMockConfigurations([newConfig, ...state.mockConfigurations.map((c) => ({ ...c, is_current: false }))]);

      await cacheDelPrefix('cache:');

      await logAudit({
        actor_id: session.id,
        actor_username: session.username,
        action: 'CONFIG_ROLLBACK',
        resource_type: 'configuration',
        resource_id: `v${nextVersion}`,
        details: {
          new_version: nextVersion,
          rollback_from_version: target_version,
          reason: changeDesc,
        },
        ip_address: getClientIp(request),
      });

      return NextResponse.json({
        success: true,
        version: nextVersion,
        rollback_from_version: target_version,
        hash: newConfig.hash,
        user_count: newConfig.user_count,
        message: `Successfully rolled back to version ${target_version} as version ${nextVersion}`,
      });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to perform rollback' }, { status: err.status || 500 });
  }
}
