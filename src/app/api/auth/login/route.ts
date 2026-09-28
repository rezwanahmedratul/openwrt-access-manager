import { NextResponse } from 'next/server';
import { getMockState } from '@/lib/mock-store';
import { getServiceSupabase } from '@/lib/supabase';
import { createSessionToken, AUTH_COOKIE_NAME } from '@/lib/auth';
import { SessionUser } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const cleanPassword = String(password).trim();

    const isSupabaseConfigured = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http')
    );

    let authenticatedUser: SessionUser | null = null;

    if (isSupabaseConfigured) {
      try {
        const supabase = getServiceSupabase();
        const { data: account } = await supabase
          .from('accounts')
          .select('id, username, password_hash, role')
          .ilike('username', cleanUsername)
          .maybeSingle();

        if (account && account.password_hash === cleanPassword) {
          authenticatedUser = {
            id: account.id,
            username: account.username,
            role: account.role,
          };
        }
      } catch (e) {
        console.error('Supabase auth error, falling back to mock:', e);
      }
    }

    if (!authenticatedUser) {
      const state = getMockState();
      const account = state.mockAccounts.find(
        (a) => a.username.toLowerCase() === cleanUsername && a.password_hash === cleanPassword
      );

      if (account) {
        authenticatedUser = {
          id: account.id,
          username: account.username,
          role: account.role,
        };
      }
    }

    if (!authenticatedUser) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const token = createSessionToken(authenticatedUser);
    const response = NextResponse.json({
      success: true,
      user: authenticatedUser,
      message: `Signed in as ${authenticatedUser.username} (${authenticatedUser.role})`,
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Authentication error' }, { status: 500 });
  }
}
