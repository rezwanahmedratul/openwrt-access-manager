import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireAdmin } from '@/lib/auth';
import { getServiceSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { getMockState } from '@/lib/mock-store';
import { logAudit, getClientIp } from '@/lib/audit';
import { hashPasswordSync } from '@/lib/password';
import { RouterTokenSettings } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/config/token - Inspect current router token status (metadata only)
export async function GET(request: Request) {
  try {
    const session = await requireAdmin(request);

    if (isSupabaseConfigured()) {
      const supabase = getServiceSupabase();
      const { data, error } = await supabase
        .from('app_settings')
        .select('value, updated_at')
        .eq('key', 'router_token')
        .maybeSingle();

      if (error) throw error;

      if (!data || !data.value) {
        return NextResponse.json({
          configured: false,
          revoked: false,
          created_at: null,
          has_env_secret: Boolean(process.env.ROUTER_SECRET),
        });
      }

      const val = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      return NextResponse.json({
        configured: Boolean(val.token_hash),
        revoked: Boolean(val.revoked),
        created_at: val.created_at || data.updated_at,
        token_prefix: val.token_prefix || null,
        has_env_secret: Boolean(process.env.ROUTER_SECRET),
      });
    } else {
      const state = getMockState();
      return NextResponse.json({
        configured: Boolean(state.mockRouterToken.token_hash),
        revoked: Boolean(state.mockRouterToken.revoked),
        created_at: state.mockRouterToken.created_at,
        has_env_secret: Boolean(process.env.ROUTER_SECRET),
      });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unauthorized' }, { status: err.status || 401 });
  }
}

// POST /api/config/token - Generate or rotate router token (Admin only)
export async function POST(request: Request) {
  try {
    const session = await requireAdmin(request);

    // Generate high-entropy 256-bit cryptographic token (64 hex characters)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashPasswordSync(rawToken);
    const tokenPrefix = rawToken.slice(0, 8);
    const nowIso = new Date().toISOString();

    const tokenSettings: RouterTokenSettings & { token_prefix: string } = {
      token_hash: tokenHash,
      token_prefix: tokenPrefix,
      created_at: nowIso,
      revoked: false,
    };

    if (isSupabaseConfigured()) {
      const supabase = getServiceSupabase();
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          key: 'router_token',
          value: tokenSettings,
          updated_at: nowIso,
        });

      if (error) throw error;
    } else {
      const state = getMockState();
      state.setMockRouterToken(tokenSettings);
    }

    // Record security audit event
    await logAudit({
      actor_id: session.id,
      actor_username: session.username,
      action: 'ROUTER_TOKEN_ROTATE',
      resource_type: 'router_token',
      resource_id: tokenPrefix,
      details: {
        token_prefix: `${tokenPrefix}...`,
        algorithm: 'scrypt',
      },
      ip_address: getClientIp(request),
    });

    return NextResponse.json({
      success: true,
      token: rawToken,
      token_prefix: tokenPrefix,
      created_at: nowIso,
      message: 'New router token generated successfully. Store this token securely; it will not be displayed again.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to rotate router token' }, { status: err.status || 500 });
  }
}

// DELETE /api/config/token - Revoke current router token (Admin only)
export async function DELETE(request: Request) {
  try {
    const session = await requireAdmin(request);
    const nowIso = new Date().toISOString();

    if (isSupabaseConfigured()) {
      const supabase = getServiceSupabase();
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'router_token')
        .maybeSingle();

      const existing = data?.value ? (typeof data.value === 'string' ? JSON.parse(data.value) : data.value) : {};

      const updatedSettings = {
        ...existing,
        revoked: true,
        revoked_at: nowIso,
      };

      await supabase
        .from('app_settings')
        .upsert({
          key: 'router_token',
          value: updatedSettings,
          updated_at: nowIso,
        });
    } else {
      const state = getMockState();
      state.setMockRouterToken({
        ...state.mockRouterToken,
        revoked: true,
      });
    }

    // Record audit event
    await logAudit({
      actor_id: session.id,
      actor_username: session.username,
      action: 'ROUTER_TOKEN_REVOKE',
      resource_type: 'router_token',
      resource_id: 'current',
      details: { revoked_at: nowIso },
      ip_address: getClientIp(request),
    });

    return NextResponse.json({
      success: true,
      message: 'Router token revoked successfully.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to revoke router token' }, { status: err.status || 500 });
  }
}
