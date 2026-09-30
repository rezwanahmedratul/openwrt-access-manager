'use client';

import React from 'react';

interface SystemBackupCardProps {
  onOpenHistoryModal: () => void;
  onExportConfig: () => void;
}

export const SystemBackupCard: React.FC<SystemBackupCardProps> = ({
  onOpenHistoryModal,
  onExportConfig,
}) => {
  return (
    <div className="settings-section-card">
      <div className="settings-section-header">
        <div className="settings-section-title-wrap">
          <h2 className="settings-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            System Maintenance &amp; Backup
          </h2>
          <p className="settings-section-desc">
            Archive configuration snapshots, download JSON backups, and view deployment audit logs.
          </p>
        </div>
      </div>

      <div className="settings-rows-list">
        <div className="settings-row-item">
          <div className="settings-row-info">
            <span className="settings-row-label">Configuration History</span>
            <span className="settings-row-caption">View the chronological audit log of all applied gateway versions.</span>
          </div>
          <div className="settings-row-control">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onOpenHistoryModal}
            >
              View Version History
            </button>
          </div>
        </div>

        <div className="settings-row-item">
          <div className="settings-row-info">
            <span className="settings-row-label">Export System Snapshot (JSON)</span>
            <span className="settings-row-caption">Download a full JSON backup of all registered devices, groups, and tags.</span>
          </div>
          <div className="settings-row-control">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onExportConfig}
            >
              Download Backup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
