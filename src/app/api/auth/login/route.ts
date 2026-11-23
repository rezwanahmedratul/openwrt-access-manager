import { NextResponse } from 'next/server';
import { getMockState } from '@/lib/mock-store';
import { getServiceSupabase } from '@/lib/supabase';
import { createSessionToken, AUTH_COOKIE_NAME, getSessionCookieOptions, verifyCsrf } from '@/lib/auth';
import { verifyPassword, verifyPasswordSync, hashPassword, hashPasswordSync } from '@/lib/password';
import { loginSchema } from '@/lib/validation';
import { SessionUser } from '@/lib/types';

export async function POST(request: Request) {
  if (!verifyCsrf(request)) {
    return NextResponse.json({ error: 'Forbidden: CSRF check failed' }, { status: 403 });
  }

  try {
    const rawBody = await request.json().catch(() => null);
    const parsed = loginSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Username and password are required', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { username, password } = parsed.data;
    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password;

    const isSupabaseConfigured = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http')
    );

    let authenticatedUser: SessionUser | null = null;
    let checkedFromDatabase = false;

    if (isSupabaseConfigured) {
      try {
        const supabase = getServiceSupabase();
        const { data: account, error } = await supabase
          .from('accounts')
          .select('id, username, password_hash, role')
          .ilike('username', cleanUsername)
          .maybeSingle();

        if (!error && account) {
          checkedFromDatabase = true;
          const { valid, needsUpgrade } = await verifyPassword(cleanPassword, account.password_hash || '');
          if (valid) {
            authenticatedUser = {
              id: account.id,
              username: account.username,
              role: account.role,
            };

            // Transparently upgrade legacy plain text passwords
            if (needsUpgrade) {
              try {
                const newHash = await hashPassword(cleanPassword);
                await supabase
                  .from('accounts')
                  .update({ password_hash: newHash, updated_at: new Date().toISOString() })
                  .eq('id', account.id);
              } catch (upgradeErr) {
                console.error('Failed to upgrade password hash in Supabase:', upgradeErr);
              }
            }
          } else {
            return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
          }
        } else if (!error && !account) {
          return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
        }
      } catch (e) {
        console.error('Supabase auth error, falling back to mock:', e);
      }
    }

    // Fallback to mock accounts if database was not configured or threw an error
    if (!checkedFromDatabase && !authenticatedUser) {
      const state = getMockState();
      const accountIndex = state.mockAccounts.findIndex(
        (a) => a.username.toLowerCase() === cleanUsername
      );

      if (accountIndex !== -1) {
        const account = state.mockAccounts[accountIndex];
        const { valid, needsUpgrade } = verifyPasswordSync(cleanPassword, account.password_hash || '');
        if (valid) {
          authenticatedUser = {
            id: account.id,
            username: account.username,
            role: account.role,
          };

          // Transparently upgrade legacy plain text password in mock store
          if (needsUpgrade) {
            const updated = [...state.mockAccounts];
            updated[accountIndex] = {
              ...account,
              password_hash: hashPasswordSync(cleanPassword),
              updated_at: new Date().toISOString(),
            };
            state.setMockAccounts(updated);
          }
        }
      }
    }

    if (!authenticatedUser) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const token = await createSessionToken(authenticatedUser);
    const response = NextResponse.json({
      success: true,
      token,
      user: authenticatedUser,
      message: `Signed in as ${authenticatedUser.username} (${authenticatedUser.role})`,
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, getSessionCookieOptions());

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Authentication error' }, { status: 500 });
  }
}
