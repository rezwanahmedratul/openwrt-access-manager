import React from 'react';
import { SessionUser, ActiveTab } from '@/lib/types';

interface AccountViewProps {
  currentUser: SessionUser | null;
  accountsList: any[];
  newSubadminUsername: string;
  setNewSubadminUsername: (s: string) => void;
  newSubadminPassword: string;
  setNewSubadminPassword: (s: string) => void;
  subadminLoading: boolean;
  subadminError: string | null;
  onCreateSubadmin: (e: React.FormEvent) => void;
  onDeleteSubadmin: (id: string, username: string) => void;
  onOpenPasswordModal: (account: { id: string; username: string; role: string }) => void;
  onTabChange: (tab: ActiveTab) => void;
}

export const AccountView: React.FC<AccountViewProps> = ({
  currentUser,
  accountsList,
  newSubadminUsername,
  setNewSubadminUsername,
  newSubadminPassword,
  setNewSubadminPassword,
  subadminLoading,
  subadminError,
  onCreateSubadmin,
  onDeleteSubadmin,
  onOpenPasswordModal,
  onTabChange,
}) => {
  if (!currentUser) return null;

  return (
    <div className="page-content-animated" key="account">
      {/* Small Top Pill */}
      <div>
        <div className="gateway-pill">
          <span className="gateway-pill-dot"></span>
          <span>Identity & Role Privileges</span>
        </div>
      </div>

      {/* Account Headline */}
      <div className="header-row">
        <div className="title-col">
          <h1 className="page-headline">Account Management</h1>
          <p className="page-description">
            Manage administrative roles, subadmin credentials, and system privileges.
          </p>
        </div>
        <div className="actions-col">
          <button className="btn btn-secondary" onClick={() => onTabChange('dashboard')}>
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {/* My Account Card */}
      <div className="account-info-box">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.85rem', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="brand-icon-box" style={{ width: '36px', height: '36px', fontSize: '1rem' }}>
              {currentUser.username[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{currentUser.username}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Active authenticated session</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span className={`badge-role badge-role-${currentUser.role}`}>{currentUser.role}</span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onOpenPasswordModal({
                id: currentUser.id,
                username: currentUser.username,
                role: currentUser.role,
              })}
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Change Password</span>
            </button>
          </div>
        </div>

        <div className="account-details-grid">
          <div className="account-detail-item">
            <span className="account-detail-label">Account Role</span>
            <span className="account-detail-value">{currentUser.role === 'admin' ? 'Administrator (Full Access)' : 'Subadmin (Restricted)'}</span>
          </div>
          <div className="account-detail-item">
            <span className="account-detail-label">Protected Group Access</span>
            <span className="account-detail-value">{currentUser.role === 'admin' ? 'Authorized (Create, Edit, Delete)' : 'Restricted (Admin Only)'}</span>
          </div>
          <div className="account-detail-item">
            <span className="account-detail-label">Subadmin Creation</span>
            <span className="account-detail-value">{currentUser.role === 'admin' ? 'Authorized' : 'Restricted (Admin Only)'}</span>
          </div>
          <div className="account-detail-item">
            <span className="account-detail-label">Configuration Publish</span>
            <span className="account-detail-value">Authorized</span>
          </div>
        </div>
      </div>

      {/* Subadmin Management Section (Admin Only) */}
      {currentUser.role === 'admin' ? (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Subadmin Accounts</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Create credentials for subadmins. Subadmins can manage general users but cannot modify users assigned to protected groups.
            </p>
          </div>

          {/* Create Subadmin Form */}
          <div className="horizontal-add-card">
            <div className="horizontal-add-title" style={{ marginBottom: '0.75rem' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Add New Subadmin</span>
            </div>

            <form className="subadmin-create-form" onSubmit={onCreateSubadmin}>
              <div className="add-bar-field subadmin-form-field" style={{ flex: 1, minWidth: '180px' }}>
                <label className="add-bar-label">Username</label>
                <input
                  type="text"
                  className="add-bar-name-input"
                  placeholder="e.g. net_operator"
                  value={newSubadminUsername}
                  onChange={(e) => setNewSubadminUsername(e.target.value)}
                  required
                />
              </div>

              <div className="add-bar-field subadmin-form-field" style={{ flex: 1, minWidth: '180px' }}>
                <label className="add-bar-label">Password</label>
                <input
                  type="password"
                  className="add-bar-name-input"
                  placeholder="Assign password (min 4 chars)"
                  value={newSubadminPassword}
                  onChange={(e) => setNewSubadminPassword(e.target.value)}
                  required
                />
              </div>

              <div className="add-bar-field subadmin-submit-field">
                <button
                  type="submit"
                  className="btn btn-primary add-bar-submit-btn"
                  disabled={subadminLoading}
                >
                  <span>{subadminLoading ? 'Creating...' : '+ Create Subadmin'}</span>
                </button>
              </div>
            </form>

            {subadminError && (
              <div className="add-bar-alert-error">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{subadminError}</span>
              </div>
            )}
          </div>

          {/* Accounts Table */}
          <div className="table-card-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>USERNAME</th>
                  <th>ROLE</th>
                  <th>CREATED AT</th>
                  <th style={{ textAlign: 'right', minWidth: '180px' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {accountsList.map((acc) => (
                  <tr key={acc.id} className="account-row-card">
                    <td className="cell-account-username">
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{acc.username}</span>
                    </td>
                    <td className="cell-account-role">
                      <span className={`badge-role badge-role-${acc.role}`}>{acc.role}</span>
                    </td>
                    <td className="cell-account-created">
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {acc.created_at ? new Date(acc.created_at).toLocaleDateString() : 'System default'}
                      </span>
                    </td>
                    <td className="cell-account-actions" style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.85rem', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn-text-action"
                          onClick={() => onOpenPasswordModal(acc)}
                          style={{ color: 'var(--brand-primary, #6366f1)', fontWeight: 500 }}
                        >
                          Change Password
                        </button>
                        {acc.role !== 'admin' ? (
                          <button
                            type="button"
                            className="btn-text-action"
                            onClick={() => onDeleteSubadmin(acc.id, acc.username)}
                            style={{ color: '#ef4444' }}
                          >
                            Delete
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(Primary)</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="horizontal-add-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Subadmin Privileges Notice</h3>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            You are logged in as a <strong>Subadmin</strong>. You can add, edit, and delete regular devices, as well as stage network draft configurations. However, subadmins cannot manage accounts or modify users in groups tagged as <strong>Protected</strong>.
          </p>
        </div>
      )}
    </div>
  );
};
