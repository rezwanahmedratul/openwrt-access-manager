import { NextResponse } from 'next/server';
import { authenticateRouter } from '@/lib/auth';
import { getServiceSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { getMockState } from '@/lib/mock-store';
import { DeploymentStatus } from '@/lib/types';
import { logAudit, getClientIp } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VALID_STATUSES: DeploymentStatus[] = ['pending', 'in_progress', 'applied', 'successful', 'failed', 'rolled_back'];

export async function POST(request: Request) {
  const isAuth = await authenticateRouter(request);
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized: Invalid router credentials or session required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { version, status, error_message } = body;

    if (typeof version !== 'number' || version <= 0) {
      return NextResponse.json({ error: 'Invalid or missing configuration version' }, { status: 400 });
    }

    if (!status || !VALID_STATUSES.includes(status as DeploymentStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured()) {
      const supabase = getServiceSupabase();
      const { data: existingConfig, error: fetchErr } = await supabase
        .from('configurations')
        .select('id, version, metadata, deployment_status')
        .eq('version', version)
        .maybeSingle();

      if (fetchErr) {
        return NextResponse.json({ error: fetchErr.message }, { status: 500 });
      }

      if (!existingConfig) {
        return NextResponse.json({ error: `Configuration version ${version} not found` }, { status: 404 });
      }

      const updatedMetadata = {
        ...(existingConfig.metadata || {}),
        last_status_update: new Date().toISOString(),
        ...(error_message ? { error_message } : {}),
      };

      const { data: updated, error: updateErr } = await supabase
        .from('configurations')
        .update({
          deployment_status: status,
          metadata: updatedMetadata,
        })
        .eq('version', version)
        .select()
        .single();

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      // Log audit event if status changed to applied, successful, or failed
      if (['applied', 'successful', 'failed'].includes(status)) {
        await logAudit({
          actor_username: 'router',
          action: `ROUTER_STATUS_${status.toUpperCase()}`,
          resource_type: 'configuration',
          resource_id: `v${version}`,
          details: { version, status, error_message },
          ip_address: getClientIp(request),
        });
      }

      return NextResponse.json({
        success: true,
        version,
        status: updated.deployment_status,
        metadata: updated.metadata,
      });
    } else {
      const state = getMockState();
      const config = state.mockConfigurations.find((c) => c.version === version);
      if (!config) {
        return NextResponse.json({ error: `Configuration version ${version} not found` }, { status: 404 });
      }

      config.deployment_status = status as DeploymentStatus;
      config.metadata = {
        ...(config.metadata || {}),
        last_status_update: new Date().toISOString(),
        ...(error_message ? { error_message } : {}),
      };

      return NextResponse.json({
        success: true,
        version,
        status: config.deployment_status,
        metadata: config.metadata,
      });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update deployment status' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const isAuth = await authenticateRouter(request);
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const versionParam = searchParams.get('version');

  if (isSupabaseConfigured()) {
    try {
      const supabase = getServiceSupabase();
      let query = supabase.from('configurations').select('version, deployment_status, metadata, created_at');

      if (versionParam) {
        query = query.eq('version', parseInt(versionParam, 10));
        const { data, error } = await query.maybeSingle();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        if (!data) return NextResponse.json({ error: 'Version not found' }, { status: 404 });
        return NextResponse.json({ success: true, configuration: data });
      } else {
        query = query.order('version', { ascending: false }).limit(10);
        const { data, error } = await query;
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true, configurations: data });
      }
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  const state = getMockState();
  if (versionParam) {
    const ver = parseInt(versionParam, 10);
    const found = state.mockConfigurations.find((c) => c.version === ver);
    if (!found) return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    return NextResponse.json({ success: true, configuration: found });
  }

  return NextResponse.json({ success: true, configurations: state.mockConfigurations });
}
