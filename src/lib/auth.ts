import crypto from 'crypto';
import { SessionUser } from './types';

export const AUTH_COOKIE_NAME = 'openwrt_session';

const AUTH_SECRET =
  process.env.SESSION_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'openwrt-access-manager-secret-key-default-salt-32chars';

export function parseSessionToken(token: string | undefined | null): SessionUser | null {
  if (!token) return null;
  try {
    let payloadStr: string;

    if (token.includes('.')) {
      const [payloadB64, signature] = token.split('.');
      if (!payloadB64 || !signature) return null;

      const expectedSig = crypto
        .createHmac('sha256', AUTH_SECRET)
        .update(payloadB64)
        .digest('base64url');

      if (signature !== expectedSig) {
        return null;
      }
      payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf-8');
    } else {
      // Legacy backward-compatibility for unsigned base64 tokens
      payloadStr = Buffer.from(token, 'base64').toString('utf-8');
    }

    const parsed = JSON.parse(payloadStr);
    if (!parsed || !parsed.id || !parsed.username || (parsed.role !== 'admin' && parsed.role !== 'subadmin')) {
      return null;
    }

    // Check expiration if present
    if (parsed.exp && typeof parsed.exp === 'number' && Date.now() > parsed.exp) {
      return null;
    }

    return {
      id: parsed.id,
      username: parsed.username,
      role: parsed.role,
    };
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
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days expiration
  });

  const payloadB64 = Buffer.from(payload, 'utf-8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(payloadB64)
    .digest('base64url');

  return `${payloadB64}.${signature}`;
}

export function getSessionFromRequest(request?: Request): SessionUser | null {
  if (request) {
    // 1. Check Authorization: Bearer <token> header (standard for Android/mobile)
    const authHeader = request.headers.get('authorization') || '';
    if (authHeader.startsWith('Bearer ')) {
      const bearerToken = authHeader.slice(7).trim();
      // Skip if this token is the router secret used for router synchronization
      const routerSecret = process.env.ROUTER_SECRET || 'openwrt-secret-token-change-in-production';
      if (bearerToken && bearerToken !== routerSecret) {
        const userFromBearer = parseSessionToken(bearerToken);
        if (userFromBearer) {
          return userFromBearer;
        }
      }
    }

    // 2. Check Cookie header in the request
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${AUTH_COOKIE_NAME}=([^;]+)`));
    if (match && match[1]) {
      const userFromCookie = parseSessionToken(decodeURIComponent(match[1]));
      if (userFromCookie) {
        return userFromCookie;
      }
    }
  }

  return null;
}

export async function getSession(request?: Request): Promise<SessionUser | null> {
  const syncSession = getSessionFromRequest(request);
  if (syncSession) return syncSession;

  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    return parseSessionToken(sessionCookie);
  } catch {
    return null;
  }
}


