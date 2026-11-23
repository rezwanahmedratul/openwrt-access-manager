import { NextResponse } from 'next/server';
import { authenticateRouter } from '@/lib/auth';
import { heartbeatPayloadSchema } from '@/lib/validation';
import { getServiceSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { getMockState } from '@/lib/mock-store';
import { cacheSet } from '@/lib/cache';
import { RouterTelemetry } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  const isAuth = await authenticateRouter(request);
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized: Invalid router credentials' }, { status: 401 });
  }

  try {
    const rawBody = await request.json();
    const parseResult = heartbeatPayloadSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid heartbeat payload', details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const payload = parseResult.data;
    const nowIso = new Date().toISOString();

    // Cache latest telemetry timestamp
    await cacheSet('telemetry:router:last_seen', nowIso, 86400 * 30);

    let recordedTelemetry: RouterTelemetry;

    if (isSupabaseConfigured()) {
      const supabase = getServiceSupabase();
      const { data, error } = await supabase
        .from('router_telemetry')
        .insert({
          uptime: payload.uptime ?? null,
          openwrt_version: payload.openwrt_version ?? null,
          config_version: payload.config_version ?? null,
          last_sync: payload.last_sync ?? nowIso,
          cpu_usage: payload.cpu_usage ?? null,
          memory_usage: payload.memory_usage ?? null,
          disk_free: payload.disk_free ?? null,
          wan_status: payload.wan_status ?? 'connected',
          connected_clients: payload.connected_clients ?? null,
          last_sync_error: payload.last_sync_error ?? null,
          created_at: nowIso,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to insert router telemetry into Supabase:', error);
        // Fall back to mock store
        const state = getMockState();
        recordedTelemetry = {
          id: `telem-${Date.now()}`,
          uptime: payload.uptime ?? null,
          openwrt_version: payload.openwrt_version ?? null,
          config_version: payload.config_version ?? null,
          last_sync: payload.last_sync ?? nowIso,
          cpu_usage: payload.cpu_usage ?? null,
          memory_usage: payload.memory_usage ?? null,
          disk_free: payload.disk_free ?? null,
          wan_status: payload.wan_status ?? 'connected',
          connected_clients: payload.connected_clients ?? null,
          last_sync_error: payload.last_sync_error ?? null,
          created_at: nowIso,
        };
        state.setMockRouterTelemetry([recordedTelemetry, ...state.mockRouterTelemetry]);
      } else {
        recordedTelemetry = data as RouterTelemetry;
      }
    } else {
      const state = getMockState();
      recordedTelemetry = {
        id: `telem-${Date.now()}`,
        uptime: payload.uptime ?? null,
        openwrt_version: payload.openwrt_version ?? null,
        config_version: payload.config_version ?? null,
        last_sync: payload.last_sync ?? nowIso,
        cpu_usage: payload.cpu_usage ?? null,
        memory_usage: payload.memory_usage ?? null,
        disk_free: payload.disk_free ?? null,
        wan_status: payload.wan_status ?? 'connected',
        connected_clients: payload.connected_clients ?? null,
        last_sync_error: payload.last_sync_error ?? null,
        created_at: nowIso,
      };
      state.setMockRouterTelemetry([recordedTelemetry, ...state.mockRouterTelemetry]);
    }

    return NextResponse.json({
      success: true,
      telemetry: recordedTelemetry,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to process heartbeat' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const isAuth = await authenticateRouter(request);
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = getServiceSupabase();
      const { data, error } = await supabase
        .from('router_telemetry')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return NextResponse.json({ success: true, telemetry: data });
      }
    } catch (e) {
      console.error('Error fetching latest telemetry from Supabase:', e);
    }
  }

  const state = getMockState();
  const latest = state.mockRouterTelemetry.length > 0 ? state.mockRouterTelemetry[0] : null;
  return NextResponse.json({ success: true, telemetry: latest });
}
