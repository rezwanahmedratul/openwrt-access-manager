import React from 'react';
import { Group } from '@/lib/types';
import { IconAlertTriangle, IconClose } from '../icons';

export interface ConflictModalData {
  targetGroup: Group;
  conflicts: { userId: string; userName: string; mac: string; otherGroups: string[] }[];
}

interface ConflictModalProps {
  conflictData: ConflictModalData | null;
  onClose: () => void;
  isResolvingConflict: boolean;
  onResolveConflict: (group: Group, action: 'remove_from_group' | 'force_add') => Promise<void>;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({
  conflictData,
  onClose,
  isResolvingConflict,
  onResolveConflict,
}) => {
  if (!conflictData) return null;

  return (
    <div className="conflict-modal-overlay">
      <div className="conflict-modal-card">
        <div className="modal-header-row">
          <h3 className="modal-headline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <IconAlertTriangle size={18} />
            <span>Warning: Multi-Group Conflict</span>
          </h3>
          <button
            onClick={onClose}
            className="modal-close-icon"
            disabled={isResolvingConflict}
            aria-label="Close"
          >
            <IconClose size={13} />
          </button>
        </div>

        <div className="conflict-warning-box">
          <div className="conflict-warning-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconAlertTriangle size={22} />
          </div>
          <div style={{ fontSize: '0.84rem', lineHeight: 1.5, color: 'var(--text-primary)' }}>
            <strong>Policy Violation:</strong> No user can be a member of a &quot;No Internet&quot; group and another group that has internet access.
            <div style={{ marginTop: '0.35rem', color: 'var(--text-secondary)' }}>
              The following user(s) in group <strong>&quot;{conflictData.targetGroup.name}&quot;</strong> are also members of other internet-enabled groups:
            </div>
          </div>
        </div>

        <div className="conflict-users-list">
          {conflictData.conflicts.map((c) => (
            <div key={c.userId} className="conflict-user-card">
              <div className="conflict-user-meta">
                <span className="conflict-user-name">{c.userName}</span>
                <span className="conflict-user-mac">{c.mac}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                  Also in:
                </div>
                <div className="conflict-other-groups">
                  {c.otherGroups.map((gName, idx) => (
                    <span key={idx} className="group-tag-pill">
                      {gName}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="conflict-actions-footer">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={isResolvingConflict}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-conflict-remove"
            disabled={isResolvingConflict}
            onClick={() => onResolveConflict(conflictData.targetGroup, 'remove_from_group')}
            title="Removes these users from this group only. They will keep their other groups."
          >
            {isResolvingConflict ? 'Resolving...' : 'Remove from this Group'}
          </button>
          <button
            type="button"
            className="btn-force-danger"
            disabled={isResolvingConflict}
            onClick={() => onResolveConflict(conflictData.targetGroup, 'force_add')}
            title="Removes these users from other groups and keeps them only in this No Internet group."
          >
            {isResolvingConflict ? 'Resolving...' : 'Force Add to No Internet'}
          </button>
        </div>
      </div>
    </div>
  );
};
