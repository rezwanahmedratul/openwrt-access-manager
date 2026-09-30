import React from 'react';
import { Group } from '@/lib/types';
import { IconClose } from '../icons';

export interface ParsedImportItem {
  id: string;
  raw: string;
  rawMac: string;
  rawName: string;
  mac: string;
  name: string;
  vendor: string | null;
  group: Group | undefined;
  isValid: boolean;
  error?: string | null;
  isDuplicate: boolean;
  duplicateReason?: string | null;
}

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  importText: string;
  setImportText: (v: string) => void;
  importError: string | null;
  setImportError: (v: string | null) => void;
  importTargetGroup: string;
  setImportTargetGroup: (v: string) => void;
  groups: Group[];
  parsedImportItems: ParsedImportItem[];
  isImporting: boolean;
  onExecuteImport: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  importText,
  setImportText,
  importError,
  setImportError,
  importTargetGroup,
  setImportTargetGroup,
  groups,
  parsedImportItems,
  isImporting,
  onExecuteImport,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="import-modal-card">
        <div className="modal-header-row" style={{ marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <h3 className="modal-headline" style={{ margin: 0, fontSize: '1.15rem' }}>Batch Import Devices</h3>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              setImportError(null);
            }}
            className="modal-close-icon"
            aria-label="Close"
          >
            <IconClose size={14} />
          </button>
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
          Paste devices below (one per line). Supported format: <code>MAC, Name [, Group]</code> or <code>MAC Name</code>.
          Delimiters (comma, semicolon, tab, space) are automatically parsed.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Device List
          </label>
          <textarea
            className="import-textarea"
            placeholder={`00:11:22:33:44:55, Office Laptop, Staff\n0C-F3-46-F3-CC-A9 Guest Tablet\nB8:27:EB:12:34:56, Sensor Node, Default`}
            value={importText}
            onChange={(e) => {
              setImportText(e.target.value);
              setImportError(null);
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
              Fallback Group
            </label>
            <select
              className="form-input-element"
              value={importTargetGroup}
              onChange={(e) => setImportTargetGroup(e.target.value)}
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
            >
              <option value="">Default Group</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', alignSelf: 'flex-end' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {parsedImportItems.length} parsed ({parsedImportItems.filter((i) => i.isValid).length} valid)
            </span>
          </div>
        </div>

        {/* Preview Section */}
        {parsedImportItems.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Import Preview:
            </span>
            <div className="import-preview-wrap">
              {parsedImportItems.map((item) => (
                <div key={item.id} className="import-preview-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono, monospace)' }}>
                      {item.mac}
                    </span>
                    <span>{item.name}</span>
                    {item.vendor && (
                      <span className="mac-vendor-pill" style={{ fontSize: '0.65rem' }}>
                        {item.vendor}
                      </span>
                    )}
                    {item.group && (
                      <span className="group-tag-pill" style={{ fontSize: '0.65rem' }}>
                        {item.group.name}
                      </span>
                    )}
                    {item.isDuplicate && (
                      <span style={{ fontSize: '0.68rem', color: '#f59e0b', fontWeight: 600 }}>
                        ⚠️ {item.duplicateReason || 'Duplicate'}
                      </span>
                    )}
                  </div>
                  {!item.isValid && (
                    <span style={{ color: '#ef4444', fontSize: '0.7rem' }}>
                      {item.error || 'Invalid format'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {importError && (
          <div style={{ fontSize: '0.75rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
            {importError}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              onClose();
              setImportError(null);
            }}
            disabled={isImporting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onExecuteImport}
            disabled={isImporting || parsedImportItems.filter((i) => i.isValid).length === 0}
          >
            {isImporting
              ? 'Importing...'
              : `Import ${parsedImportItems.filter((i) => i.isValid).length} Devices`}
          </button>
        </div>
      </div>
    </div>
  );
};
