import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const user = getSessionFromRequest(request);

  if (!user) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true, user });
}
