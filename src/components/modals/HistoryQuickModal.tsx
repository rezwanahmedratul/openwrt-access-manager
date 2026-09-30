import React from 'react';
import { IconClose } from '../icons';

interface HistoryQuickModalProps {
  isOpen: boolean;
  onClose: () => void;
  historyList: any[];
}

export const HistoryQuickModal: React.FC<HistoryQuickModalProps> = ({
  isOpen,
  onClose,
  historyList,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: '750px' }}>
        <div className="modal-header-row">
          <h3 className="modal-headline">Configuration History</h3>
          <button onClick={onClose} className="modal-close-icon" aria-label="Close">
            <IconClose size={13} />
          </button>
        </div>

        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Version</th>
                <th>Users</th>
                <th>SHA-256 Hash</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {historyList.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2.5rem' }}>
                    <div className="empty-state">
                      <div className="empty-state-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                      </div>
                      <span className="empty-state-text">No published configurations found</span>
                      <span className="empty-state-hint">Apply changes to create your first version</span>
                    </div>
                  </td>
                </tr>
              ) : (
                historyList.map((h) => (
                  <tr key={h.id}>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        v{h.version} {h.is_current && ' (Live)'}
                      </span>
                    </td>
                    <td>{h.user_count}</td>
                    <td>
                      <span className="mac-address-pill" style={{ fontSize: '0.72rem' }}>
                        {h.hash ? h.hash.substring(0, 16) + '...' : 'N/A'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      {new Date(h.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
