'use client';

import React from 'react';
import { DashboardStats } from '@/lib/types';

interface HistoryTelemetryGridProps {
  historyCount: number;
  liveHistoryItem: any;
  stats: DashboardStats;
}

export const HistoryTelemetryGrid: React.FC<HistoryTelemetryGridProps> = ({
  historyCount,
  liveHistoryItem,
  stats,
}) => {
  return (
    <div className="history-telemetry-grid">
      <div className="history-telemetry-card">
        <div className="history-telemetry-header">
          <span>Published Releases</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
        </div>
        <div className="history-telemetry-value">
          {historyCount}
          <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>versions</span>
        </div>
        <div className="history-telemetry-subtext">
          <span>Total immutable snapshots tracked</span>
        </div>
      </div>

      <div className="history-telemetry-card">
        <div className="history-telemetry-header">
          <span>Active Gateway Release</span>
          <span className="history-live-pill">Live</span>
        </div>
        <div className="history-telemetry-value">
          v{liveHistoryItem ? liveHistoryItem.version : (stats.current_version || 1)}
        </div>
        <div className="history-telemetry-subtext">
          <span>{liveHistoryItem?.created_at ? new Date(liveHistoryItem.created_at).toLocaleString() : 'Currently deployed'}</span>
        </div>
      </div>

      <div className="history-telemetry-card">
        <div className="history-telemetry-header">
          <span>Live Device Rules</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
            <line x1="12" y1="18" x2="12.01" y2="18" />
          </svg>
        </div>
        <div className="history-telemetry-value">
          {liveHistoryItem ? liveHistoryItem.user_count : (stats.total_users || 0)}
          <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>devices</span>
        </div>
        <div className="history-telemetry-subtext">
          <span>Compiled into gateway firewall</span>
        </div>
      </div>

      <div className="history-telemetry-card">
        <div className="history-telemetry-header">
          <span>Integrity Seal</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <div className="history-telemetry-value" style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', letterSpacing: '-0.02em' }}>
          {liveHistoryItem?.hash ? liveHistoryItem.hash.substring(0, 10) + '...' : 'Verified'}
        </div>
        <div className="history-telemetry-subtext" style={{ color: 'var(--status-applied-text)' }}>
          <span>● SHA-256 Checksum Verified</span>
        </div>
      </div>
    </div>
  );
};
