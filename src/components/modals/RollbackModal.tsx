'use client';

import React, { useState } from 'react';
import { ConfigVersionHistory } from '@/lib/types';
import { IconClose, IconAlertTriangle } from '../icons';
import { ConfigDiffViewer } from '../history/ConfigDiffViewer';

interface RollbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetVersion: ConfigVersionHistory | any;
  liveVersion: ConfigVersionHistory | any;
  onConfirmRollback: (version: number, reason: string) => Promise<void>;
  isRollingBack?: boolean;
}

export const RollbackModal: React.FC<RollbackModalProps> = ({
  isOpen,
  onClose,
  targetVersion,
  liveVersion,
  onConfirmRollback,
  isRollingBack = false,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !targetVersion) return null;

  const handleRollback = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await onConfirmRollback(
        targetVersion.version,
        reason.trim() || `Rollback to version ${targetVersion.version}`
      );
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to trigger rollback');
    }
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 1100 }}>
      <div className="modal-card" style={{ maxWidth: '680px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Modal Header */}
        <div className="modal-header-row" style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
            </div>
            <div>
              <h3 className="modal-headline" style={{ margin: 0, fontSize: '1.05rem' }}>
                Rollback Configuration
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Restore gateway rules to Release v{targetVersion.version}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-icon" aria-label="Close" disabled={isRollingBack}>
            <IconClose size={13} />
          </button>
        </div>

        <form onSubmit={handleRollback} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div style={{ overflowY: 'auto', padding: '0.5rem 0.25rem 1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {error && <div className="form-alert-msg">{error}</div>}

            {/* Warning Banner */}
            <div
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '6px',
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-start',
              }}
            >
              <IconAlertTriangle size={18} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.82rem', lineHeight: 1.45 }}>
                <strong style={{ color: 'var(--text-primary)' }}>Important Rollback Notice:</strong>
                <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)' }}>
                  This action will restore the configuration from <strong>Release v{targetVersion.version}</strong> and publish it as a new configuration version. The router client will synchronize this restored state on its next sync heartbeat.
                </p>
              </div>
            </div>

            {/* Version Comparison Card */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
                background: 'var(--bg-app)',
                padding: '0.85rem',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Target Version (To Restore)
                </span>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                  Release v{targetVersion.version}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  {targetVersion.user_count} rules • {new Date(targetVersion.created_at).toLocaleDateString()}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Current Live Version
                </span>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--status-applied-text)', marginTop: '0.2rem' }}>
                  Release v{liveVersion?.version || 1} (Live)
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  {liveVersion?.user_count || 0} rules • Currently active
                </div>
              </div>
            </div>

            {/* Change Preview Diff */}
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                Configuration Diff Preview (Live → Restored v{targetVersion.version})
              </div>
              <div
                style={{
                  maxHeight: '200px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  background: 'var(--bg-card-subtle)',
                }}
              >
                <ConfigDiffViewer
                  oldText={liveVersion?.firewall_content || ''}
                  newText={targetVersion.firewall_content || ''}
                />
              </div>
            </div>

            {/* Rollback Reason */}
            <div className="form-group-block" style={{ marginBottom: 0 }}>
              <label className="form-label-title">Reason for Rollback / Change Description</label>
              <input
                type="text"
                className="form-input-element"
                placeholder="e.g. Revert unauthorized device changes, restore working state"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
              <div className="form-help-caption">This description will be recorded in the audit logs and configuration release metadata.</div>
            </div>
          </div>

          {/* Modal Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.65rem',
              marginTop: '1rem',
              paddingTop: '0.85rem',
              borderTop: '1px solid var(--border-subtle)',
              flexShrink: 0,
            }}
          >
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isRollingBack}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isRollingBack}
              style={{
                backgroundColor: '#dc2626',
                borderColor: '#dc2626',
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              {isRollingBack ? (
                <>
                  <div className="loading-spinner" style={{ width: '12px', height: '12px' }}></div>
                  <span>Rolling Back...</span>
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                  <span>Confirm Rollback to v{targetVersion.version}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
