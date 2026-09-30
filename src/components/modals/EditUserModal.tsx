import React from 'react';
import { Group, SessionUser } from '@/lib/types';
import { IconClose, IconBan, IconLock } from '../icons';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  formName: string;
  setFormName: (s: string) => void;
  formMac: string;
  setFormMac: (s: string) => void;
  formGroupIds: string[];
  setFormGroupIds: (ids: string[]) => void;
  formError: string | null;
  groups: Group[];
  currentUser: SessionUser | null;
  onSaveUser: (e: React.FormEvent) => void;
  onGoToGroups: () => void;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  onClose,
  formName,
  setFormName,
  formMac,
  setFormMac,
  formGroupIds,
  setFormGroupIds,
  formError,
  groups,
  currentUser,
  onSaveUser,
  onGoToGroups,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header-row">
          <h3 className="modal-headline">Edit User</h3>
          <button onClick={onClose} className="modal-close-icon" aria-label="Close">
            <IconClose size={13} />
          </button>
        </div>

        <form onSubmit={onSaveUser}>
          {formError && <div className="form-alert-msg">{formError}</div>}

          <div className="form-group-block">
            <label className="form-label-title">User Name</label>
            <input
              type="text"
              className="form-input-element"
              placeholder="e.g. ratul ahmed or Rezwan-Ahmed"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
            />
            <div className="form-help-caption">Spaces convert to underscores; hyphens are preserved (e.g. Ratul_Ahmed).</div>
          </div>

          <div className="form-group-block">
            <label className="form-label-title">MAC Address</label>
            <input
              type="text"
              className="form-input-element"
              placeholder="e.g. 0cf346f3cca9 or 0C:F3:46:F3:CC:A9"
              value={formMac}
              onChange={(e) => setFormMac(e.target.value)}
              required
            />
            <div className="form-help-caption">Formats any 12-char hex string, colons, or dashes into canonical format.</div>
          </div>

          <div className="form-group-block">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label className="form-label-title" style={{ marginBottom: 0 }}>Assigned Groups</label>
              <button
                type="button"
                onClick={onGoToGroups}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Go to Groups Page →
              </button>
            </div>
            <div className="checkbox-tags-grid">
              {groups.map((group) => {
                const isChecked = formGroupIds.includes(group.id);
                const isRestrictedForSubadmin = currentUser?.role === 'subadmin' && group.is_protected;

                // Protected incompatibility: cannot assign to No Internet if currently in or selecting protected group
                const selectedHasProtected = formGroupIds.some((id) => groups.find((g) => g.id === id)?.is_protected);
                const isProtectedConflict = group.is_no_internet && selectedHasProtected;

                const isDisabled = isRestrictedForSubadmin || isProtectedConflict;

                return (
                  <label
                    key={group.id}
                    className="checkbox-tag-item"
                    style={{
                      opacity: isDisabled ? 0.45 : 1,
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      borderColor: group.is_no_internet ? 'rgba(220, 38, 38, 0.4)' : undefined,
                    }}
                    title={
                      isRestrictedForSubadmin
                        ? 'Protected group (Administrator only)'
                        : isProtectedConflict
                        ? 'Cannot assign to No Internet while assigned to protected group. Remove protected group first.'
                        : ''
                    }
                  >
                    <input
                      type="checkbox"
                      disabled={isDisabled}
                      checked={isChecked}
                      onChange={(e) => {
                        if (isDisabled) return;
                        if (e.target.checked) {
                          if (group.is_no_internet) {
                            // Rule: exclusive No Internet - replace all other regular groups
                            setFormGroupIds([group.id]);
                          } else {
                            // Rule: adding regular group removes any No Internet group
                            const filtered = formGroupIds.filter((id) => !groups.find((g) => g.id === id)?.is_no_internet);
                            setFormGroupIds([...filtered, group.id]);
                          }
                        } else {
                          const remaining = formGroupIds.filter((id) => id !== group.id);
                          const defaultGroup = groups.find((g) => g.name.toLowerCase() === 'default');
                          if (remaining.length === 0 && defaultGroup) {
                            setFormGroupIds([defaultGroup.id]);
                          } else {
                            setFormGroupIds(remaining);
                          }
                        }
                      }}
                    />
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      {group.is_no_internet && <IconBan size={12} />}
                      {group.name}
                      {group.is_protected && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: 'var(--text-secondary)' }}>
                          (<IconLock size={11} /> Protected)
                        </span>
                      )}
                      {group.is_no_internet && !group.is_protected && ' (No Internet)'}
                    </span>
                  </label>
                );
              })}
            </div>

            {formGroupIds.some((id) => groups.find((g) => g.id === id)?.is_no_internet) && (
              <div className="form-exclusive-notice">
                <IconBan size={15} />
                <span><strong>No Internet Policy:</strong> Devices in a No Internet group cannot be assigned to any group with internet access. Internet access will be blocked via firewall rule.</span>
              </div>
            )}

            {formGroupIds.some((id) => groups.find((g) => g.id === id)?.is_protected) && (
              <div className="form-exclusive-notice">
                <IconLock size={15} />
                <span><strong>Protected Group:</strong> Users in protected groups cannot be placed into No Internet groups unless removed from protected groups first.</span>
              </div>
            )}

            <div className="form-help-caption">No Internet groups block WAN access via dedicated firewall rule. Regular groups allow internet access.</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '1.75rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
