import React from 'react';
import { Group, SessionUser } from '@/lib/types';
import { IconClose } from '../icons';

interface BulkGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUserCount: number;
  bulkTargetGroupId: string;
  setBulkTargetGroupId: (id: string) => void;
  groups: Group[];
  currentUser: SessionUser | null;
  isBulkAssigning: boolean;
  onExecuteBulkGroupAssign: () => void;
}

export const BulkGroupModal: React.FC<BulkGroupModalProps> = ({
  isOpen,
  onClose,
  selectedUserCount,
  bulkTargetGroupId,
  setBulkTargetGroupId,
  groups,
  currentUser,
  isBulkAssigning,
  onExecuteBulkGroupAssign,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: '440px' }}>
        <div className="modal-header-row">
          <h3 className="modal-headline">Assign Group</h3>
          <button
            type="button"
            onClick={onClose}
            className="modal-close-icon"
            aria-label="Close"
          >
            <IconClose size={13} />
          </button>
        </div>

        <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Assign <strong>{selectedUserCount} selected device(s)</strong> to a group. Changes will remain in pending draft status until applied.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '1.25rem' }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Select Target Group
          </label>
          <select
            className="form-input-element"
            value={bulkTargetGroupId}
            onChange={(e) => setBulkTargetGroupId(e.target.value)}
          >
            <option value="">-- Choose Group --</option>
            {groups.map((g) => {
              const isRestricted = currentUser?.role === 'subadmin' && g.is_protected;
              return (
                <option key={g.id} value={g.id} disabled={isRestricted}>
                  {g.name} {g.is_no_internet ? '(No Internet)' : ''} {g.is_protected ? '(Protected)' : ''}
                </option>
              );
            })}
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isBulkAssigning}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onExecuteBulkGroupAssign}
            disabled={!bulkTargetGroupId || isBulkAssigning}
          >
            {isBulkAssigning ? 'Updating...' : `Assign to ${selectedUserCount} Device(s)`}
          </button>
        </div>
      </div>
    </div>
  );
};
