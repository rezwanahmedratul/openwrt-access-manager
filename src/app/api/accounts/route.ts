import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { getMockState } from '@/lib/mock-store';
import { getServiceSupabase } from '@/lib/supabase';
import { Account } from '@/lib/types';
import { cacheGet, cacheSet, cacheDelPrefix } from '@/lib/cache';

const ACCOUNTS_CACHE_KEY = 'cache:accounts:list';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized: Only administrators can view accounts' }, { status: 403 });
  }

  // Check cache first
  const cached = await cacheGet<Account[]>(ACCOUNTS_CACHE_KEY);
  if (cached) {
    return NextResponse.json(
      { accounts: cached },
      { headers: { 'X-Cache': 'HIT', 'Cache-Control': 'private, no-cache' } }
    );
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
      const accounts = data || [];
      await cacheSet(ACCOUNTS_CACHE_KEY, accounts, 60);
      return NextResponse.json(
        { accounts },
        { headers: { 'X-Cache': 'MISS', 'Cache-Control': 'private, no-cache' } }
      );
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

  await cacheSet(ACCOUNTS_CACHE_KEY, accounts, 60);
  return NextResponse.json(
    { accounts },
    { headers: { 'X-Cache': 'MISS', 'Cache-Control': 'private, no-cache' } }
  );
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
        await cacheDelPrefix('cache:accounts:');
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
    await cacheDelPrefix('cache:accounts:');

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
        await cacheDelPrefix('cache:accounts:');
        return NextResponse.json({ success: true, message: 'Subadmin account deleted successfully' });
      } catch (e) {
        console.error('Supabase delete account error, falling back to mock:', e);
      }
    }

    state.setMockAccounts(state.mockAccounts.filter((a) => a.id !== accountId));
    await cacheDelPrefix('cache:accounts:');
    return NextResponse.json({ success: true, message: 'Subadmin account deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete account' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 });
  }

  try {
    const { id, username, password } = await request.json();

    if ((!id && !username) || !password) {
      return NextResponse.json({ error: 'Account identifier and new password are required' }, { status: 400 });
    }

    // Role check: Admin can update any account; Subadmin can only update their own account
    const isSelfUpdate = Boolean(
      (id && session.id === id) ||
      (username && session.username.toLowerCase() === String(username).trim().toLowerCase())
    );

    if (session.role !== 'admin' && !isSelfUpdate) {
      return NextResponse.json({ error: 'Unauthorized: Subadmins can only change their own password' }, { status: 403 });
    }

    const cleanPassword = String(password).trim();
    if (cleanPassword.length < 4) {
      return NextResponse.json({ error: 'Password must be at least 4 characters' }, { status: 400 });
    }

    const isSupabaseConfigured = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http')
    );

    if (isSupabaseConfigured) {
      try {
        const supabase = getServiceSupabase();
        
        let query = supabase.from('accounts').select('id, username, role');
        if (id) {
          query = query.eq('id', id);
        } else if (username) {
          query = query.ilike('username', String(username).trim().toLowerCase());
        }

        const { data: existing, error: findError } = await query.maybeSingle();

        if (findError || !existing) {
          return NextResponse.json({ error: 'Account not found' }, { status: 404 });
        }

        if (session.role !== 'admin' && existing.id !== session.id && existing.username.toLowerCase() !== session.username.toLowerCase()) {
          return NextResponse.json({ error: 'Unauthorized: Cannot change another account password' }, { status: 403 });
        }

        const { error: updateError } = await supabase
          .from('accounts')
          .update({
            password_hash: cleanPassword,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (updateError) throw updateError;

        // Keep mock store in sync with database change
        const state = getMockState();
        const mockIdx = state.mockAccounts.findIndex(
          (a) => a.id === existing.id || a.username.toLowerCase() === existing.username.toLowerCase()
        );
        if (mockIdx !== -1) {
          const updated = [...state.mockAccounts];
          updated[mockIdx] = {
            ...updated[mockIdx],
            password_hash: cleanPassword,
            updated_at: new Date().toISOString(),
          };
          state.setMockAccounts(updated);
        }

        await cacheDelPrefix('cache:accounts:');
        return NextResponse.json({
          success: true,
          message: `Password updated successfully for ${existing.username}`,
        });
      } catch (e: any) {
        console.error('Supabase update password error, falling back to mock:', e);
      }
    }

    const state = getMockState();
    const accountIndex = state.mockAccounts.findIndex(
      (a) => (id && a.id === id) || (username && a.username.toLowerCase() === String(username).trim().toLowerCase())
    );

    if (accountIndex === -1) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const updatedAccounts = [...state.mockAccounts];
    const targetAccount = updatedAccounts[accountIndex];

    if (session.role !== 'admin' && targetAccount.id !== session.id && targetAccount.username.toLowerCase() !== session.username.toLowerCase()) {
      return NextResponse.json({ error: 'Unauthorized: Cannot change another account password' }, { status: 403 });
    }

    updatedAccounts[accountIndex] = {
      ...targetAccount,
      password_hash: cleanPassword,
      updated_at: new Date().toISOString(),
    };
    state.setMockAccounts(updatedAccounts);
    await cacheDelPrefix('cache:accounts:');

    return NextResponse.json({
      success: true,
      message: `Password updated successfully for ${targetAccount.username}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update password' }, { status: 500 });
  }
}

