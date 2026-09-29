import { NextResponse } from 'next/server';
import { getCacheStatus, cacheFlush } from '@/lib/cache';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const status = await getCacheStatus();
  return NextResponse.json({
    cache: status,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized: Admin privileges required' }, { status: 403 });
  }

  await cacheFlush();
  const status = await getCacheStatus();

  return NextResponse.json({
    message: 'Cache successfully purged',
    cache: status,
  });
}
