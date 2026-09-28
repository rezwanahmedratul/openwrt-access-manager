import { cookies } from 'next/headers';
import { SessionUser } from './types';

export const AUTH_COOKIE_NAME = 'openwrt_session';

export function parseSessionToken(token: string | undefined | null): SessionUser | null {
  if (!token) return null;
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded);
    if (parsed && parsed.id && parsed.username && (parsed.role === 'admin' || parsed.role === 'subadmin')) {
      return {
        id: parsed.id,
        username: parsed.username,
        role: parsed.role,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function createSessionToken(user: SessionUser): string {
  const payload = JSON.stringify({
    id: user.id,
    username: user.username,
    role: user.role,
    issuedAt: Date.now(),
  });
  return Buffer.from(payload, 'utf-8').toString('base64');
}

export function getSessionFromRequest(request?: Request): SessionUser | null {
  if (request) {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${AUTH_COOKIE_NAME}=([^;]+)`));
    if (match && match[1]) {
      return parseSessionToken(decodeURIComponent(match[1]));
    }
  }

  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    return parseSessionToken(sessionCookie);
  } catch {
    return null;
  }
}
