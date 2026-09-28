import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { getMockState } from '@/lib/mock-store';
import { getServiceSupabase } from '@/lib/supabase';
import { Account } from '@/lib/types';

export async function GET(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized: Only administrators can view accounts' }, { status: 403 });
  }

  const isSupabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http')
  );

  if (isSupabaseConfigured) {
    try {
      const supabase = getServiceSupabase();
      const { data, error } = await supabase
        .from('accounts')
        .select('id, username, role, created_at, updated_at')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return NextResponse.json({ accounts: data || [] });
    } catch (e) {
      console.error('Supabase query accounts error, falling back to mock:', e);
    }
  }

  const state = getMockState();
  const accounts = state.mockAccounts.map((a) => ({
    id: a.id,
    username: a.username,
    role: a.role,
    created_at: a.created_at,
    updated_at: a.updated_at,
  }));

  return NextResponse.json({ accounts });
}

export async function POST(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized: Only administrators can create subadmin accounts' }, { status: 403 });
  }

  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const cleanPassword = String(password).trim();

    if (cleanUsername.length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 });
    }

    if (cleanPassword.length < 4) {
      return NextResponse.json({ error: 'Password must be at least 4 characters' }, { status: 400 });
    }

    const isSupabaseConfigured = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http')
    );

    if (isSupabaseConfigured) {
      try {
        const supabase = getServiceSupabase();
        const { data: existing } = await supabase
          .from('accounts')
          .select('id')
          .ilike('username', cleanUsername)
          .maybeSingle();

        if (existing) {
          return NextResponse.json({ error: `Account with username "${cleanUsername}" already exists` }, { status: 400 });
        }

        const { data: newAccount, error } = await supabase
          .from('accounts')
          .insert({
            username: cleanUsername,
            password_hash: cleanPassword,
            role: 'subadmin',
          })
          .select('id, username, role, created_at, updated_at')
          .single();

        if (error) throw error;
        return NextResponse.json({ success: true, account: newAccount });
      } catch (e) {
        console.error('Supabase create account error, falling back to mock:', e);
      }
    }

    const state = getMockState();
    const existing = state.mockAccounts.find((a) => a.username.toLowerCase() === cleanUsername);
    if (existing) {
      return NextResponse.json({ error: `Account with username "${cleanUsername}" already exists` }, { status: 400 });
    }

    const newAccount: Account = {
      id: 'acc-' + Date.now(),
      username: cleanUsername,
      password_hash: cleanPassword,
      role: 'subadmin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    state.setMockAccounts([...state.mockAccounts, newAccount]);

    return NextResponse.json({
      success: true,
      account: {
        id: newAccount.id,
        username: newAccount.username,
        role: newAccount.role,
        created_at: newAccount.created_at,
        updated_at: newAccount.updated_at,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create subadmin account' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized: Only administrators can delete subadmin accounts' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('id');

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    const state = getMockState();
    const targetAccount = state.mockAccounts.find((a) => a.id === accountId);

    if (targetAccount && targetAccount.role === 'admin') {
      return NextResponse.json({ error: 'Cannot delete administrator account' }, { status: 400 });
    }

    const isSupabaseConfigured = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http')
    );

    if (isSupabaseConfigured) {
      try {
        const supabase = getServiceSupabase();
        const { data: acc } = await supabase.from('accounts').select('role').eq('id', accountId).maybeSingle();
        if (acc && acc.role === 'admin') {
          return NextResponse.json({ error: 'Cannot delete administrator account' }, { status: 400 });
        }
        await supabase.from('accounts').delete().eq('id', accountId);
        return NextResponse.json({ success: true, message: 'Subadmin account deleted successfully' });
      } catch (e) {
        console.error('Supabase delete account error, falling back to mock:', e);
      }
    }

    state.setMockAccounts(state.mockAccounts.filter((a) => a.id !== accountId));
    return NextResponse.json({ success: true, message: 'Subadmin account deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete account' }, { status: 500 });
  }
}
