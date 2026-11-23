import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAuditLogs, AuditLogQueryFilter } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/audit - Query audit logs with pagination and filters
export async function GET(request: Request) {
  try {
    const session = await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '25', 10);
    const action = searchParams.get('action') || undefined;
    const resource_type = searchParams.get('resource_type') || undefined;
    const actor_username = searchParams.get('actor_username') || undefined;
    const from_date = searchParams.get('from_date') || undefined;
    const to_date = searchParams.get('to_date') || undefined;

    const filter: AuditLogQueryFilter = {
      page: isNaN(page) ? 1 : page,
      limit: isNaN(limit) ? 25 : limit,
      action,
      resource_type,
      actor_username,
      from_date,
      to_date,
    };

    const paginated = await getAuditLogs(filter);

    return NextResponse.json({
      success: true,
      ...paginated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Unauthorized: Authentication required' },
      { status: err.status || 401 }
    );
  }
}
