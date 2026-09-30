import React from 'react';
import { Account } from '@/lib/types';
import { IconClose } from '../icons';

interface ChangePasswordModalProps {
  account: { id: string; username: string; role: string } | null;
  onClose: () => void;
  passwordModalError: string | null;
  newPasswordVal: string;
  setNewPasswordVal: (v: string) => void;
  confirmPasswordVal: string;
  setConfirmPasswordVal: (v: string) => void;
  showPasswordText: boolean;
  setShowPasswordText: (v: boolean) => void;
  passwordModalLoading: boolean;
  onChangePassword: (e: React.FormEvent) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  account,
  onClose,
  passwordModalError,
  newPasswordVal,
  setNewPasswordVal,
  confirmPasswordVal,
  setConfirmPasswordVal,
  showPasswordText,
  setShowPasswordText,
  passwordModalLoading,
  onChangePassword,
}) => {
  if (!account) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: '440px' }}>
        <div className="modal-header-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(99, 102, 241, 0.12)',
                color: 'var(--brand-primary, #6366f1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div>
              <h3 className="modal-headline" style={{ margin: 0 }}>Change Password</h3>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Updating password for <strong style={{ color: 'var(--text-primary)' }}>{account.username}</strong> ({account.role})
              </div>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-icon" aria-label="Close">
            <IconClose size={13} />
          </button>
        </div>

        <form onSubmit={onChangePassword}>
          {passwordModalError && (
            <div className="form-alert-msg" style={{ marginBottom: '1rem' }}>
              {passwordModalError}
            </div>
          )}

          <div className="form-group-block">
            <label className="form-label-title">New Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPasswordText ? "text" : "password"}
                className="form-input-element"
                placeholder="Enter new password (min. 4 characters)"
                value={newPasswordVal}
                onChange={(e) => setNewPasswordVal(e.target.value)}
                required
                minLength={4}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPasswordText(!showPasswordText)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  padding: '4px',
                }}
              >
                {showPasswordText ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div className="form-group-block">
            <label className="form-label-title">Confirm New Password</label>
            <input
              type={showPasswordText ? "text" : "password"}
              className="form-input-element"
              placeholder="Re-enter new password"
              value={confirmPasswordVal}
              onChange={(e) => setConfirmPasswordVal(e.target.value)}
              required
              minLength={4}
            />
          </div>

          <div className="modal-actions-row modal-footer-row" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={passwordModalLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={passwordModalLoading}
            >
              {passwordModalLoading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
