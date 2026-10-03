import React, { useRef } from 'react';
import { Group } from '@/lib/types';
import { ParsedImportItem } from '@/lib/csv-import';
import { IconClose } from '../icons';

export type { ParsedImportItem };

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
  uploadedFileName?: string | null;
  uploadedFileSize?: number | null;
  isDragging?: boolean;
  onFileUpload?: (file: File) => void;
  onClear?: () => void;
  onPasteFromClipboard?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
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
  uploadedFileName,
  uploadedFileSize,
  isDragging,
  onFileUpload,
  onClear,
  onPasteFromClipboard,
  onDragOver,
  onDragLeave,
  onDrop,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const validCount = parsedImportItems.filter((i) => i.isValid).length;
  const duplicateCount = parsedImportItems.filter((i) => i.isDuplicate).length;
  const invalidCount = parsedImportItems.filter((i) => !i.isValid).length;

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (onFileUpload) {
        onFileUpload(file);
      }
      // Reset input so same file can be re-selected if needed
      e.target.value = '';
    }
  };

  const handleInsertSampleTemplate = () => {
    const defaultGroup = groups[0]?.name || 'Default';
    const sample = [
      'Name,MAC Address,Status,Groups',
      `"Office Laptop","00:11:22:33:44:55","applied","${defaultGroup}"`,
      `"Guest Tablet","0C:F3:46:F3:CC:A9","applied","${defaultGroup}"`,
      `"Smart Display","B8:27:EB:12:34:56","applied","${defaultGroup}"`,
    ].join('\n');
    setImportText(sample);
    setImportError(null);
  };

  return (
    <div className="modal-backdrop">
      <div
        className="import-modal-card"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {/* Modal Header */}
        <div className="modal-header-row" style={{ marginBottom: '0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <h3 className="modal-headline" style={{ margin: 0, fontSize: '1.2rem' }}>
              Import Devices (CSV / Text)
            </h3>
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

        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
          Import devices via exported CSV format (<code>Name,MAC Address,Status,Groups</code>) or legacy format (<code>MAC, Name [, Group]</code>).
          Upload a file, drag & drop, or paste from clipboard.
        </p>

        {/* Drag and Drop Zone */}
        <div
          className={`import-dropzone ${isDragging ? 'dragging' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              fileInputRef.current?.click();
            }
          }}
          style={{ cursor: 'pointer' }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,.text,text/csv,text/plain"
            style={{ display: 'none' }}
            onChange={handleFileInputChange}
          />
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
            <path d="M12 12v9" />
            <path d="m16 16-4-4-4 4" />
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {isDragging ? 'Release to upload CSV / TXT file' : 'Drag & drop CSV / TXT file here, or click to browse'}
            </span>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Fully compatible with exported CSV format &middot; Max 5MB
            </span>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="import-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.74rem', padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              onClick={() => fileInputRef.current?.click()}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Browse File
            </button>

            {onPasteFromClipboard && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.74rem', padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                onClick={onPasteFromClipboard}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                </svg>
                Paste from Clipboard
              </button>
            )}

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.74rem', padding: '0.35rem 0.65rem' }}
              onClick={handleInsertSampleTemplate}
              title="Fill in sample data matching the export CSV format"
            >
              Use Sample Template
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            {uploadedFileName && (
              <div className="import-file-badge">
                <span>📄 {uploadedFileName}</span>
                {uploadedFileSize && (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                    ({(uploadedFileSize / 1024).toFixed(1)} KB)
                  </span>
                )}
                {onClear && (
                  <button type="button" onClick={onClear} aria-label="Remove file" title="Remove file">
                    &times;
                  </button>
                )}
              </div>
            )}

            {importText && onClear && !uploadedFileName && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.72rem', padding: '0.3rem 0.55rem' }}
                onClick={onClear}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Textarea Editor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              CSV / Text Content
            </label>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Direct edit or paste below
            </span>
          </div>
          <textarea
            className="import-textarea"
            placeholder={`Name,MAC Address,Status,Groups\n"Office Laptop","00:11:22:33:44:55","applied","Staff; Dev"\n"Guest Tablet","0C:F3:46:F3:CC:A9","applied","Guests"\n"Smart Sensor","B8:27:EB:12:34:56","applied","Default"`}
            value={importText}
            onChange={(e) => {
              setImportText(e.target.value);
              setImportError(null);
            }}
          />
        </div>

        {/* Configuration Row: Fallback Group & Stats */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
              Fallback Group (if unspecified in row)
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

          {/* Stats Pills */}
          <div className="import-stats-pills" style={{ alignSelf: 'flex-end', paddingBottom: '0.2rem' }}>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              {parsedImportItems.length} parsed:
            </span>
            <span className="import-stat-pill valid">
              ✓ {validCount} Valid
            </span>
            {duplicateCount > 0 && (
              <span className="import-stat-pill warning">
                ⚠️ {duplicateCount} Duplicate
              </span>
            )}
            {invalidCount > 0 && (
              <span className="import-stat-pill error">
                ✕ {invalidCount} Invalid
              </span>
            )}
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
                    <span style={{ fontWeight: 500 }}>{item.name}</span>
                    {item.vendor && (
                      <span className="mac-vendor-pill" style={{ fontSize: '0.65rem' }}>
                        {item.vendor}
                      </span>
                    )}
                    {item.groups && item.groups.length > 0 ? (
                      item.groups.map((g) => (
                        <span key={g.id} className="group-tag-pill" style={{ fontSize: '0.65rem' }}>
                          {g.name}
                        </span>
                      ))
                    ) : item.group ? (
                      <span className="group-tag-pill" style={{ fontSize: '0.65rem' }}>
                        {item.group.name}
                      </span>
                    ) : null}
                    {item.isDuplicate && (
                      <span style={{ fontSize: '0.68rem', color: '#f59e0b', fontWeight: 600 }}>
                        ⚠️ {item.duplicateReason || 'Duplicate'}
                      </span>
                    )}
                  </div>
                  {!item.isValid && (
                    <span style={{ color: '#ef4444', fontSize: '0.7rem', fontWeight: 500 }}>
                      {item.error || 'Invalid format'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Alert Message */}
        {importError && (
          <div style={{ fontSize: '0.75rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            {importError}
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.25rem' }}>
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
            disabled={isImporting || validCount === 0}
          >
            {isImporting
              ? 'Importing...'
              : `Import ${validCount} Device${validCount === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </div>
  );
};
