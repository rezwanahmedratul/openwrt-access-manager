'use client';

import React from 'react';
import { AuditLog } from '@/lib/types';
import { IconClose } from '../icons';

interface AuditDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: AuditLog | null;
}

export const getActionBadgeStyle = (action: string) => {
  const act = action.toUpperCase();
  if (act.includes('DELETE') || act.includes('REVOKE') || act.includes('FAILED')) {
    return { bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.25)' };
  }
  if (act.includes('ROLLBACK') || act.includes('MODIFY') || act.includes('UPDATE') || act.includes('ROTATE')) {
    return { bg: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.25)' };
  }
  if (act.includes('CREATE') || act.includes('ADD') || act.includes('SUCCESS') || act.includes('APPLY')) {
    return { bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: 'rgba(16, 185, 129, 0.25)' };
  }
  if (act.includes('LOGIN') || act.includes('AUTH') || act.includes('SESSION')) {
    return { bg: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.25)' };
  }
  return { bg: 'rgba(168, 85, 247, 0.12)', color: '#a855f7', border: 'rgba(168, 85, 247, 0.25)' };
};

export const AuditDetailsModal: React.FC<AuditDetailsModalProps> = ({ isOpen, onClose, log }) => {
  if (!isOpen || !log) return null;

  const badgeStyle = getActionBadgeStyle(log.action);

  return (
    <div className="modal-backdrop" style={{ zIndex: 1200 }}>
      <div className="modal-card" style={{ maxWidth: '640px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header-row" style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: badgeStyle.bg,
                color: badgeStyle.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            <div>
              <h3 className="modal-headline" style={{ margin: 0, fontSize: '1.05rem' }}>
                Audit Event Record
              </h3>
              <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                Immutable event payload &amp; cryptographic identity metadata
              </p>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-icon" aria-label="Close">
            <IconClose size={13} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', padding: '0.5rem 0.25rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* Metadata Table */}
          <div className="history-metadata-box">
            <div className="history-metadata-item">
              <span style={{ color: 'var(--text-secondary)' }}>Event Action</span>
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.6rem',
                  borderRadius: '9999px',
                  backgroundColor: badgeStyle.bg,
                  color: badgeStyle.color,
                  border: `1px solid ${badgeStyle.border}`,
                }}
              >
                {log.action}
              </span>
            </div>

            <div className="history-metadata-item">
              <span style={{ color: 'var(--text-secondary)' }}>Timestamp (UTC)</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                {new Date(log.created_at).toISOString()} ({new Date(log.created_at).toLocaleString()})
              </span>
            </div>

            <div className="history-metadata-item">
              <span style={{ color: 'var(--text-secondary)' }}>Initiating Actor</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontWeight: 600 }}>{log.actor_username || 'System / Router'}</span>
                {log.actor_id && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    ({log.actor_id.slice(0, 8)})
                  </span>
                )}
              </div>
            </div>

            <div className="history-metadata-item">
              <span style={{ color: 'var(--text-secondary)' }}>Client IP Address</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                {log.ip_address || 'Internal / N/A'}
              </span>
            </div>

            <div className="history-metadata-item">
              <span style={{ color: 'var(--text-secondary)' }}>Resource Target</span>
              <span style={{ fontWeight: 600 }}>
                {log.resource_type} {log.resource_id ? `• ${log.resource_id}` : ''}
              </span>
            </div>

            <div className="history-metadata-item">
              <span style={{ color: 'var(--text-secondary)' }}>Audit Event UUID</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {log.id}
              </span>
            </div>
          </div>

          {/* Event Details JSON */}
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              Full Event Payload (Details JSON)
            </div>
            <pre
              style={{
                margin: 0,
                padding: '0.85rem',
                borderRadius: '6px',
                background: 'var(--bg-app)',
                border: '1px solid var(--border-subtle)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.76rem',
                color: 'var(--text-primary)',
                maxHeight: '260px',
                overflowX: 'auto',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {log.details ? JSON.stringify(log.details, null, 2) : 'No extra details recorded'}
            </pre>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            paddingTop: '0.85rem',
            borderTop: '1px solid var(--border-subtle)',
            flexShrink: 0,
          }}
        >
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
