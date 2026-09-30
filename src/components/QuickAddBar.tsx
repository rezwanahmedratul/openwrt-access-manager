import React, { useState } from 'react';
import { Group, SessionUser, UserViewModel } from '@/lib/types';
import { IconBan } from './icons';

interface QuickAddBarProps {
  groups: Group[];
  currentUser: SessionUser | null;
  macOctets: string[];
  onMacChange: (idx: number, val: string) => void;
  onMacKeyDown: (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
  onMacPaste: (idx: number, e: React.ClipboardEvent<HTMLInputElement>) => void;
  onPasteClipboard: () => void;
  addName: string;
  setAddName: (val: string) => void;
  addSelectedGroup: string;
  setAddSelectedGroup: (val: string) => void;
  addError: string | null;
  setAddError: (err: string | null) => void;
  isAdding: boolean;
  onAddUser: (e: React.FormEvent) => void;
  quickAddVendor: string | null;
  quickAddDuplicate: UserViewModel | null;
  quickAddDuplicateName?: UserViewModel | null;
  macInputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  nameInputRef: React.MutableRefObject<HTMLInputElement | null>;
}

export const QuickAddBar: React.FC<QuickAddBarProps> = ({
  groups,
  currentUser,
  macOctets,
  onMacChange,
  onMacKeyDown,
  onMacPaste,
  onPasteClipboard,
  addName,
  setAddName,
  addSelectedGroup,
  setAddSelectedGroup,
  addError,
  setAddError,
  isAdding,
  onAddUser,
  quickAddVendor,
  quickAddDuplicate,
  quickAddDuplicateName,
  macInputRefs,
  nameInputRef,
}) => {
  const [isAddFormCollapsed, setIsAddFormCollapsed] = useState(false);

  return (
    <div className="horizontal-add-card">
      <div className="horizontal-add-header">
        <div className="horizontal-add-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Quick Register Device</span>
        </div>
        <button
          type="button"
          className="btn-text-action"
          onClick={() => setIsAddFormCollapsed((v) => !v)}
          style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{
              transform: isAddFormCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          <span>{isAddFormCollapsed ? 'Expand' : 'Collapse'}</span>
        </button>
      </div>

      {!isAddFormCollapsed && (
        <>
          <form className="horizontal-add-form" onSubmit={onAddUser}>
            {/* Field 1: MAC Address (6 separate 2-character boxes) */}
            <div className="add-bar-field field-mac">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <label className="add-bar-label" style={{ margin: 0 }}>MAC Address</label>
                  {quickAddVendor && (
                    <span className="quick-add-vendor-chip" title="Hardware Manufacturer">
                      {quickAddVendor}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onPasteClipboard}
                  className="btn-text-action"
                  style={{
                    fontSize: '0.72rem',
                    color: 'var(--brand-primary, #6366f1)',
                    padding: '0 4px',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                  title="Paste MAC from clipboard"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  <span>Paste</span>
                </button>
              </div>
              <div className="mac-segmented-box">
                {macOctets.map((octet, idx) => (
                  <React.Fragment key={idx}>
                    <input
                      ref={(el) => { macInputRefs.current[idx] = el; }}
                      type="text"
                      maxLength={17}
                      inputMode="text"
                      className="mac-octet-input"
                      placeholder="00"
                      value={octet}
                      onChange={(e) => onMacChange(idx, e.target.value)}
                      onKeyDown={(e) => onMacKeyDown(idx, e)}
                      onPaste={(e) => onMacPaste(idx, e)}
                      autoCapitalize="characters"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    {idx < 5 && <span className="mac-octet-sep">:</span>}
                  </React.Fragment>
                ))}
              </div>
              {quickAddDuplicate && (
                <div className="quick-add-dup-warning">
                  <span>⚠️</span>
                  <span>Notice: MAC already registered to &quot;{quickAddDuplicate.name}&quot;</span>
                </div>
              )}
            </div>

            {/* Field 2: Name */}
            <div className="add-bar-field field-name">
              <label className="add-bar-label">User / Device Name</label>
              <input
                ref={nameInputRef}
                type="text"
                className="add-bar-name-input"
                placeholder="e.g. ratul ahmed or Rezwan-Ahmed"
                value={addName}
                onChange={(e) => {
                  setAddName(e.target.value);
                  setAddError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && !addName) {
                    macInputRefs.current[5]?.focus();
                  }
                }}
              />
              {quickAddDuplicateName && (
                <div className="quick-add-dup-warning">
                  <span>⚠️</span>
                  <span>Notice: Name already registered to &quot;{quickAddDuplicateName.name}&quot; ({quickAddDuplicateName.mac_address})</span>
                </div>
              )}
            </div>

            {/* Field 3: Group */}
            <div className="add-bar-field field-group">
              <label className="add-bar-label">Group</label>
              <select
                className="add-bar-group-select"
                value={addSelectedGroup}
                onChange={(e) => setAddSelectedGroup(e.target.value)}
              >
                {groups.map((g) => {
                  const isRestricted = currentUser?.role === 'subadmin' && g.is_protected;
                  let suffix = '';
                  if (g.is_protected) suffix = ' (Protected)';
                  if (g.is_no_internet) suffix = ' (No Internet)';
                  return (
                    <option key={g.id} value={g.id} disabled={isRestricted}>
                      {g.name}{suffix}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Field 4: Add User Action */}
            <div className="add-bar-field field-action">
              <button
                type="submit"
                className="btn btn-primary add-bar-submit-btn"
                disabled={isAdding}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>{isAdding ? 'Adding...' : 'Add User'}</span>
              </button>
            </div>
          </form>

          {groups.find((g) => g.id === addSelectedGroup)?.is_no_internet && (
            <div className="form-exclusive-notice" style={{ marginTop: '0.65rem' }}>
              <IconBan size={15} />
              <span>
                <strong>No Internet Policy:</strong> WAN access will be blocked for this MAC address via dedicated firewall rule.
              </span>
            </div>
          )}

          {addError && (
            <div className="add-bar-alert-error">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{addError}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};
