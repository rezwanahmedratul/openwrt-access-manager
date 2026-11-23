import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, getSessionCookieOptions, revokeSession, verifyCsrf } from '@/lib/auth';

export async function POST(request: Request) {
  if (!verifyCsrf(request)) {
    return NextResponse.json({ error: 'Forbidden: CSRF check failed' }, { status: 403 });
  }

  // Extract session token from cookie or Authorization header to invalidate it server-side
  let token = '';
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${AUTH_COOKIE_NAME}=([^;]+)`));
  if (match && match[1]) {
    token = decodeURIComponent(match[1]);
  } else {
    const authHeader = request.headers.get('authorization') || '';
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    }
  }

  if (token) {
    await revokeSession(token);
  }

  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  response.cookies.set(AUTH_COOKIE_NAME, '', getSessionCookieOptions(0));

  return response;
}
