import { getServiceSupabase, isSupabaseConfigured } from './supabase';
import { getMockState } from './mock-store';
import { AuditLog, AuditLogInput } from './types';
import { randomUUID } from 'crypto';

export interface AuditLogQueryFilter {
  page?: number;
  limit?: number;
  action?: string;
  resource_type?: string;
  actor_username?: string;
  from_date?: string;
  to_date?: string;
}

export interface PaginatedAuditLogs {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Extracts client IP address from Request or Headers.
 */
export function getClientIp(requestOrHeaders: Request | Headers | null | undefined): string | null {
  if (!requestOrHeaders) return null;

  const headers = requestOrHeaders instanceof Headers ? requestOrHeaders : requestOrHeaders.headers;
  const xForwardedFor = headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const ips = xForwardedFor.split(',').map((ip) => ip.trim());
    if (ips.length > 0 && ips[0]) return ips[0];
  }

  const xRealIp = headers.get('x-real-ip');
  if (xRealIp) return xRealIp.trim();

  const cfConnectingIp = headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp.trim();

  return null;
}

/**
 * Records an audit log entry in Supabase (if configured) or in the mock store fallback.
 * Never throws, ensuring audit logging failures do not break critical transactions.
 */
export async function logAudit(entry: AuditLogInput): Promise<AuditLog> {
  const timestamp = new Date().toISOString();
  const id = typeof randomUUID === 'function' ? randomUUID() : `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const auditEntry: AuditLog = {
    id,
    actor_id: entry.actor_id ?? null,
    actor_username: entry.actor_username ?? null,
    action: entry.action,
    resource_type: entry.resource_type,
    resource_id: entry.resource_id ?? null,
    details: entry.details ?? {},
    ip_address: entry.ip_address ?? null,
    created_at: timestamp,
  };

  if (isSupabaseConfigured()) {
    try {
      const supabase = getServiceSupabase();
      const { data, error } = await supabase
        .from('audit_logs')
        .insert({
          actor_id: auditEntry.actor_id,
          actor_username: auditEntry.actor_username,
          action: auditEntry.action,
          resource_type: auditEntry.resource_type,
          resource_id: auditEntry.resource_id,
          details: auditEntry.details,
          ip_address: auditEntry.ip_address,
          created_at: auditEntry.created_at,
        })
        .select()
        .single();

      if (error) {
        console.error('[AuditLog] Supabase insert failed, falling back to mock store:', error.message);
        // Fall back to storing in mock store
        const state = getMockState();
        state.setMockAuditLogs([auditEntry, ...state.mockAuditLogs]);
        return auditEntry;
      }

      if (data) {
        return {
          id: data.id,
          actor_id: data.actor_id,
          actor_username: data.actor_username,
          action: data.action,
          resource_type: data.resource_type,
          resource_id: data.resource_id,
          details: data.details,
          ip_address: data.ip_address,
          created_at: data.created_at,
        };
      }
    } catch (err) {
      console.error('[AuditLog] Unexpected error during Supabase audit logging:', err);
    }
  }

  // Fallback to mock store
  const state = getMockState();
  state.setMockAuditLogs([auditEntry, ...state.mockAuditLogs]);
  return auditEntry;
}

/**
 * Queries audit logs with pagination and optional filtering.
 */
export async function getAuditLogs(filter: AuditLogQueryFilter = {}): Promise<PaginatedAuditLogs> {
  const page = Math.max(1, filter.page ?? 1);
  const limit = Math.max(1, Math.min(100, filter.limit ?? 25));
  const offset = (page - 1) * limit;

  if (isSupabaseConfigured()) {
    try {
      const supabase = getServiceSupabase();
      let query = supabase.from('audit_logs').select('*', { count: 'exact' });

      if (filter.action) {
        query = query.ilike('action', `%${filter.action}%`);
      }
      if (filter.resource_type) {
        query = query.eq('resource_type', filter.resource_type);
      }
      if (filter.actor_username) {
        query = query.ilike('actor_username', `%${filter.actor_username}%`);
      }
      if (filter.from_date) {
        query = query.gte('created_at', filter.from_date);
      }
      if (filter.to_date) {
        query = query.lte('created_at', filter.to_date);
      }

      query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

      const { data, count, error } = await query;
      if (!error && data) {
        const total = count ?? data.length;
        return {
          logs: data as AuditLog[],
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        };
      }
    } catch (err) {
      console.error('[AuditLog] Error fetching from Supabase, falling back to mock:', err);
    }
  }

  // Fallback to in-memory mock store
  const state = getMockState();
  let filtered = [...state.mockAuditLogs];

  if (filter.action) {
    const act = filter.action.toLowerCase();
    filtered = filtered.filter((log) => log.action.toLowerCase().includes(act));
  }
  if (filter.resource_type) {
    filtered = filtered.filter((log) => log.resource_type === filter.resource_type);
  }
  if (filter.actor_username) {
    const actor = filter.actor_username.toLowerCase();
    filtered = filtered.filter((log) => log.actor_username?.toLowerCase().includes(actor));
  }
  if (filter.from_date) {
    const fromTime = new Date(filter.from_date).getTime();
    filtered = filtered.filter((log) => new Date(log.created_at).getTime() >= fromTime);
  }
  if (filter.to_date) {
    const toTime = new Date(filter.to_date).getTime();
    filtered = filtered.filter((log) => new Date(log.created_at).getTime() <= toTime);
  }

  // Sort descending by created_at
  filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const total = filtered.length;
  const logs = filtered.slice(offset, offset + limit);

  return {
    logs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
