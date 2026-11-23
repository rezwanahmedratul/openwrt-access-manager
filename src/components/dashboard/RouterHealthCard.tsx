'use client';

import React from 'react';
import { DashboardStats, RouterTelemetry } from '@/lib/types';

interface RouterHealthCardProps {
  stats: DashboardStats;
  telemetry?: RouterTelemetry | null;
  onRefresh?: () => void;
}

export const RouterHealthCard: React.FC<RouterHealthCardProps> = ({
  stats,
  telemetry: propTelemetry,
  onRefresh,
}) => {
  const telemetry = propTelemetry ?? stats.router_telemetry ?? null;
  const lastSeenIso = telemetry?.created_at || telemetry?.last_sync || stats.router_last_seen;

  // Stale threshold calculation (~10 minutes / 600 seconds)
  const isOnline = React.useMemo(() => {
    if (!lastSeenIso) return false;
    try {
      const diffMs = Date.now() - new Date(lastSeenIso).getTime();
      return diffMs >= 0 && diffMs <= 10 * 60 * 1000;
    } catch {
      return false;
    }
  }, [lastSeenIso]);

  // Format relative timestamp
  const formatTimeAgo = (iso?: string | null) => {
    if (!iso) return 'Never';
    try {
      const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
      if (diffSec < 10) return 'Just now';
      if (diffSec < 60) return `${diffSec}s ago`;
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      return `${Math.floor(diffHr / 24)}d ago`;
    } catch {
      return 'Unknown';
    }
  };

  // Format uptime in seconds to human readable
  const formatUptime = (seconds?: number | null) => {
    if (seconds == null || seconds <= 0) return 'N/A';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m ${seconds % 60}s`;
  };

  const cpuPercent = Math.min(100, Math.max(0, Math.round(telemetry?.cpu_usage ?? 0)));
  const memPercent = Math.min(100, Math.max(0, Math.round(telemetry?.memory_usage ?? 0)));
  const wanStatus = (telemetry?.wan_status || (isOnline ? 'online' : 'offline')).toLowerCase();
  const isWanOnline = wanStatus === 'online' || wanStatus === 'connected';

  return (
    <div className="settings-section-card router-health-card" style={{ marginBottom: '1.25rem', padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-card-subtle)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
              <line x1="6" y1="6" x2="6.01" y2="6" />
              <line x1="6" y1="18" x2="6.01" y2="18" />
            </svg>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Router Status
              </h3>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  padding: '0.2rem 0.55rem',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: 'var(--bg-pill)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              OpenWrt {telemetry?.openwrt_version?.replace(/^OpenWrt\s+/i, '') || '23.05.5'} • Heartbeat: {formatTimeAgo(lastSeenIso)}
            </p>
          </div>
        </div>

        {onRefresh && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onRefresh}
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            <span>Refresh</span>
          </button>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '0.85rem',
        }}
      >
        {/* Metric 1: Uptime */}
        <div style={{ background: 'var(--bg-card-subtle)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
            UPTIME
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
            {formatUptime(telemetry?.uptime)}
          </div>
        </div>

        {/* Metric 2: CPU Usage */}
        <div style={{ background: 'var(--bg-card-subtle)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              CPU
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {telemetry?.cpu_usage != null ? `${telemetry.cpu_usage.toFixed(1)}%` : '0%'}
            </span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'var(--border-subtle)', borderRadius: '3px', marginTop: '0.5rem', overflow: 'hidden' }}>
            <div
              style={{
                width: `${cpuPercent}%`,
                height: '100%',
                background: 'var(--text-primary)',
                borderRadius: '3px',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* Metric 3: Memory Usage */}
        <div style={{ background: 'var(--bg-card-subtle)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              MEMORY
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {telemetry?.memory_usage != null ? `${telemetry.memory_usage.toFixed(1)}%` : '0%'}
            </span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'var(--border-subtle)', borderRadius: '3px', marginTop: '0.5rem', overflow: 'hidden' }}>
            <div
              style={{
                width: `${memPercent}%`,
                height: '100%',
                background: 'var(--text-primary)',
                borderRadius: '3px',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* Metric 4: WAN Connectivity */}
        <div style={{ background: 'var(--bg-card-subtle)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
            WAN
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem' }}>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {isWanOnline ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Metric 5: Active Config Version */}
        <div style={{ background: 'var(--bg-card-subtle)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
            VERSION
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
            v{telemetry?.config_version ?? stats.current_version ?? 1}
          </div>
        </div>

        {/* Metric 6: Last Sync Result */}
        <div style={{ background: 'var(--bg-card-subtle)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
            LAST SYNC
          </div>
          <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
            {telemetry?.last_sync_error ? 'Failed' : formatTimeAgo(telemetry?.last_sync)}
          </div>
        </div>
      </div>
    </div>
  );
};
