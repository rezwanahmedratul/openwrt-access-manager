import React from 'react';

interface FloatingPendingBarProps {
  pendingChanges: number;
  isApplying: boolean;
  onUndo: () => void;
  onDiscard: () => void;
  onApply: () => void;
}

export const FloatingPendingBar: React.FC<FloatingPendingBarProps> = ({
  pendingChanges,
  isApplying,
  onUndo,
  onDiscard,
  onApply,
}) => {
  if (pendingChanges <= 0) return null;

  return (
    <div className="floating-pending-bar-wrapper">
      <div className="floating-pending-bar">
        <div className="pending-left-info">
          <span className="pending-dot-pulse"></span>
          <span className="pending-count-badge">{pendingChanges}</span>
          <span className="pending-text-desktop">
            {pendingChanges} pending {pendingChanges === 1 ? 'change' : 'changes'} in draft
          </span>
          <span className="pending-text-mobile">draft</span>
        </div>
        <div className="pending-btn-actions">
          <button
            type="button"
            className="btn btn-secondary pending-btn-undo"
            onClick={onUndo}
          >
            Undo
          </button>
          <button
            type="button"
            className="btn btn-ghost pending-btn-discard"
            onClick={onDiscard}
          >
            Discard
          </button>
          <button
            type="button"
            className="btn btn-primary pending-btn-apply"
            onClick={onApply}
            disabled={isApplying}
          >
            {isApplying ? (
              'Applying...'
            ) : (
              <>
                <span className="btn-text-desktop">Apply Changes</span>
                <span className="btn-text-mobile">Apply</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
