'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AuditLog, ActiveTab, SessionUser } from '@/lib/types';
import { AuditDetailsModal, getActionBadgeStyle } from '../modals/AuditDetailsModal';

interface AuditLogsViewProps {
  currentUser: SessionUser | null;
  onTabChange: (tab: ActiveTab) => void;
  onShowToast: (msg: string) => void;
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({
  currentUser,
  onTabChange,
  onShowToast,
}) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [actorFilter, setActorFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Selected Log for Details Modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (actionFilter) params.set('action', actionFilter);
      if (resourceFilter) params.set('resource_type', resourceFilter);
      if (actorFilter.trim()) params.set('actor_username', actorFilter.trim());
      if (fromDate) params.set('from_date', fromDate);
      if (toDate) params.set('to_date', toDate);

      const res = await fetch(`/api/audit?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load audit logs: HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.logs) {
        setLogs(data.logs);
        setTotal(data.total ?? data.logs.length);
        setTotalPages(data.totalPages ?? Math.max(1, Math.ceil((data.total || data.logs.length) / limit)));
      }
    } catch (err: any) {
      console.error('Audit logs fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, actionFilter, resourceFilter, actorFilter, fromDate, toDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset page when filters change
  const handleFilterChange = (setter: (v: string) => void, val: string) => {
    setter(val);
    setPage(1);
  };

  const setDatePreset = (days: number | null) => {
    setPage(1);
    if (days === null) {
      setFromDate('');
      setToDate('');
      return;
    }
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setFromDate(start.toISOString().slice(0, 10));
    setToDate(end.toISOString().slice(0, 10));
  };

  return (
    <div className="tab-pane-container page-content-animated" key="audit">
      {/* Headline */}
      <div className="header-row">
        <div className="title-col">
          <h1 className="page-headline">System Audit Logs</h1>
          <p className="page-description">
            Tamper-evident chronological activity trail tracking user registrations, firewall changes, authentication events, and token operations.
          </p>
        </div>
        <div className="actions-col">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={fetchLogs}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            <span>Refresh</span>
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => onTabChange('dashboard')}>
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {/* Filter Card */}
      <div className="history-filter-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
          {/* Action Filter */}
          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
              Action Type
            </label>
            <select
              className="group-dropdown-select"
              value={actionFilter}
              onChange={(e) => handleFilterChange(setActionFilter, e.target.value)}
              style={{ width: '100%', fontSize: '0.78rem' }}
            >
              <option value="">All Actions</option>
              <option value="CONFIG_APPLY">Configuration Publish</option>
              <option value="CONFIG_ROLLBACK">Configuration Rollback</option>
              <option value="USER_CREATE">User Create / Register</option>
              <option value="USER_UPDATE">User Update / Edit</option>
              <option value="USER_DELETE">User Delete</option>
              <option value="GROUP_CREATE">Group Create</option>
              <option value="GROUP_DELETE">Group Delete</option>
              <option value="MAC_AUTH_TOGGLE">MAC Auth Toggle</option>
              <option value="TOKEN_ROTATE">Router Token Rotate</option>
              <option value="TOKEN_REVOKE">Router Token Revoke</option>
              <option value="AUTH_LOGIN">User Login</option>
              <option value="AUTH_LOGOUT">User Logout</option>
              <option value="PASSWORD_CHANGE">Password Change</option>
            </select>
          </div>

          {/* Resource Type Filter */}
          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
              Resource Type
            </label>
            <select
              className="group-dropdown-select"
              value={resourceFilter}
              onChange={(e) => handleFilterChange(setResourceFilter, e.target.value)}
              style={{ width: '100%', fontSize: '0.78rem' }}
            >
              <option value="">All Resources</option>
              <option value="configuration">Configuration</option>
              <option value="user">User / Device</option>
              <option value="group">Group</option>
              <option value="mac_auth">MAC Auth Policy</option>
              <option value="router_token">Router Token</option>
              <option value="account">Account</option>
            </select>
          </div>

          {/* Actor Username */}
          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
              Actor / Username
            </label>
            <input
              type="text"
              className="form-input-element"
              placeholder="e.g. admin or router"
              value={actorFilter}
              onChange={(e) => handleFilterChange(setActorFilter, e.target.value)}
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.6rem' }}
            />
          </div>

          {/* Date Range: From / To */}
          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
              From Date
            </label>
            <input
              type="date"
              className="form-input-element"
              value={fromDate}
              onChange={(e) => handleFilterChange(setFromDate, e.target.value)}
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.6rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
              To Date
            </label>
            <input
              type="date"
              className="form-input-element"
              value={toDate}
              onChange={(e) => handleFilterChange(setToDate, e.target.value)}
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.6rem' }}
            />
          </div>
        </div>

        {/* Quick Date Range Chips & Active Results Count */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', paddingTop: '0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Date Presets:</span>
            <button
              type="button"
              className={`history-filter-chip ${!fromDate && !toDate ? 'is-active' : ''}`}
              onClick={() => setDatePreset(null)}
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
            >
              All Time
            </button>
            <button
              type="button"
              className="history-filter-chip"
              onClick={() => setDatePreset(0)}
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
            >
              Today
            </button>
            <button
              type="button"
              className="history-filter-chip"
              onClick={() => setDatePreset(7)}
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              className="history-filter-chip"
              onClick={() => setDatePreset(30)}
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
            >
              Last 30 Days
            </button>
          </div>

          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
            Total Records: <strong>{total}</strong>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="desktop-table-container" style={{ background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-card)', overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '170px' }}>TIMESTAMP</th>
              <th style={{ width: '150px' }}>ACTION</th>
              <th style={{ width: '140px' }}>ACTOR</th>
              <th style={{ width: '150px' }}>RESOURCE</th>
              <th>DETAILS SUMMARY</th>
              <th style={{ width: '110px' }}>IP ADDRESS</th>
              <th style={{ width: '90px', textAlign: 'right' }}>VIEW</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="loading-spinner"></div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading audit records...</span>
                  </div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3.5rem' }}>
                  <div className="empty-state">
                    <span className="empty-state-text">No audit log records found</span>
                    <span className="empty-state-hint">Try adjusting your action or date filters</span>
                  </div>
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const badge = getActionBadgeStyle(log.action);
                return (
                  <tr
                    key={log.id}
                    className="user-row-card"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedLog(log)}
                  >
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {new Date(log.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '9999px',
                          backgroundColor: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                        }}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {log.actor_username || 'System'}
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.resource_type}</span>
                      {log.resource_id && (
                        <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {log.resource_id.length > 18 ? log.resource_id.slice(0, 18) + '...' : log.resource_id}
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.details ? (
                        typeof log.details === 'object' ? (
                          (log.details as any).description ||
                          (log.details as any).name ||
                          (log.details as any).mac_address ||
                          JSON.stringify(log.details)
                        ) : (
                          String(log.details)
                        )
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={{ fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {log.ip_address || 'Internal'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn-text-action"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                        }}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.85rem 1.15rem',
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--bg-card)',
          borderRadius: '0 0 8px 8px',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginTop: '-1px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Page {page} of {Math.max(1, totalPages)} ({total} total records)
          </span>
          <select
            className="group-dropdown-select"
            value={limit}
            onChange={(e) => {
              setLimit(parseInt(e.target.value, 10));
              setPage(1);
            }}
            style={{ fontSize: '0.74rem', padding: '0.2rem 0.5rem' }}
          >
            <option value="10">10 per page</option>
            <option value="15">15 per page</option>
            <option value="25">25 per page</option>
            <option value="50">50 per page</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{ fontSize: '0.76rem' }}
          >
            ← Previous
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
            style={{ fontSize: '0.76rem' }}
          >
            Next →
          </button>
        </div>
      </div>

      {/* Expandable Details Modal */}
      <AuditDetailsModal
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        log={selectedLog}
      />
    </div>
  );
};
