'use client';

import React from 'react';

interface HistoryLedgerListProps {
  filteredHistory: any[];
  selectedHistoryItem: any;
  onSelectHistoryItem: (item: any) => void;
}

export const renderDeploymentStatusBadge = (status?: string, isRollback?: boolean) => {
  const norm = (status || (isRollback ? 'rolled_back' : 'successful')).toLowerCase();
  let label = 'Successful';
  let bg = 'rgba(16, 185, 129, 0.12)';
  let color = '#10b981';
  let border = 'rgba(16, 185, 129, 0.25)';

  if (norm === 'pending') {
    label = 'Pending';
    bg = 'rgba(245, 158, 11, 0.12)';
    color = '#f59e0b';
    border = 'rgba(245, 158, 11, 0.25)';
  } else if (norm === 'in_progress') {
    label = 'In Progress';
    bg = 'rgba(59, 130, 246, 0.12)';
    color = '#3b82f6';
    border = 'rgba(59, 130, 246, 0.25)';
  } else if (norm === 'failed') {
    label = 'Failed';
    bg = 'rgba(239, 68, 68, 0.12)';
    color = '#ef4444';
    border = 'rgba(239, 68, 68, 0.25)';
  } else if (norm === 'rolled_back') {
    label = 'Rolled Back';
    bg = 'rgba(168, 85, 247, 0.12)';
    color = '#a855f7';
    border = 'rgba(168, 85, 247, 0.25)';
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        fontSize: '0.66rem',
        fontWeight: 600,
        padding: '0.12rem 0.45rem',
        borderRadius: '9999px',
        backgroundColor: bg,
        color: color,
        border: `1px solid ${border}`,
        textTransform: 'capitalize',
      }}
    >
      <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: color }} />
      {label}
    </span>
  );
};

export const HistoryLedgerList: React.FC<HistoryLedgerListProps> = ({
  filteredHistory,
  selectedHistoryItem,
  onSelectHistoryItem,
}) => {
  return (
    <div className="history-ledger-card">
      <div className="history-ledger-header">
        <span className="history-ledger-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>Release Chronology</span>
        </span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
          Click to inspect
        </span>
      </div>

      <div className="history-ledger-list">
        {filteredHistory.length === 0 ? (
          <div style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
            <div className="empty-state">
              <span className="empty-state-text">No releases matching query</span>
              <span className="empty-state-hint">Try clearing your search filters</span>
            </div>
          </div>
        ) : (
          filteredHistory.map((h) => {
            const isSelected = selectedHistoryItem?.id === h.id || selectedHistoryItem?.version === h.version;
            return (
              <div
                key={h.id || h.version}
                className={`history-item-row ${isSelected ? 'is-selected' : ''}`}
                onClick={() => onSelectHistoryItem(h)}
                role="button"
                tabIndex={0}
              >
                <div className="history-item-row-top">
                  <div className="history-version-badge">
                    <span>v{h.version}</span>
                    {h.is_current ? (
                      <span className="history-live-pill">Live</span>
                    ) : (
                      <span className="history-archived-pill">Archived</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {renderDeploymentStatusBadge(h.deployment_status, Boolean(h.rollback_from_version))}
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {h.user_count} {h.user_count === 1 ? 'device' : 'devices'}
                    </span>
                  </div>
                </div>

                {h.change_description && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '0.2rem 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {h.change_description}
                  </div>
                )}

                <div className="history-item-row-meta">
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    {new Date(h.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="history-hash-chip">
                    {h.hash ? h.hash.substring(0, 10) + '...' : 'No hash'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
