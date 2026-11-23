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

  if (norm === 'pending') {
    label = 'Pending';
  } else if (norm === 'in_progress') {
    label = 'In Progress';
  } else if (norm === 'failed') {
    label = 'Failed';
  } else if (norm === 'rolled_back') {
    label = 'Rolled Back';
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: '0.66rem',
        fontWeight: 600,
        padding: '0.12rem 0.45rem',
        borderRadius: 'var(--radius-pill)',
        backgroundColor: 'var(--bg-pill)',
        color: 'var(--text-secondary)',
        border: '1px solid var(--border-subtle)',
        textTransform: 'capitalize',
      }}
    >
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
