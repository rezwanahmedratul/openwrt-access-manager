import React from 'react';
import { Group, SessionUser, UserViewModel, ActiveTab } from '@/lib/types';
import { IconLock, IconBan, IconGlobe } from '../icons';

interface GroupsViewProps {
  groups: Group[];
  users: UserViewModel[];
  currentUser: SessionUser | null;
  newGroupName: string;
  setNewGroupName: (s: string) => void;
  newGroupIsProtected: boolean;
  setNewGroupIsProtected: (b: boolean) => void;
  newGroupIsNoInternet: boolean;
  setNewGroupIsNoInternet: (b: boolean) => void;
  groupLoading: boolean;
  groupError: string | null;
  onCreateGroup: (e: React.FormEvent) => void;
  onToggleProtection: (id: string, isProtected: boolean) => void;
  onToggleNoInternet: (group: Group) => void;
  onDeleteGroup: (group: Group) => void;
  onTabChange: (tab: ActiveTab) => void;
}

export const GroupsView: React.FC<GroupsViewProps> = ({
  groups,
  users,
  currentUser,
  newGroupName,
  setNewGroupName,
  newGroupIsProtected,
  setNewGroupIsProtected,
  newGroupIsNoInternet,
  setNewGroupIsNoInternet,
  groupLoading,
  groupError,
  onCreateGroup,
  onToggleProtection,
  onToggleNoInternet,
  onDeleteGroup,
  onTabChange,
}) => {
  return (
    <div className="page-content-animated" key="groups">
      {/* Small Top Pill */}
      <div>
        <div className="gateway-pill">
          <span className="gateway-pill-dot"></span>
          <span>Organizational Taxonomies</span>
        </div>
      </div>

      {/* Groups Page Headline */}
      <div className="header-row">
        <div className="title-col">
          <h1 className="page-headline">Manage Groups</h1>
          <p className="page-description">
            Create and manage organizational groups for network devices. Deleting a group automatically reassigns all affected MAC addresses to the &quot;Default&quot; group.
          </p>
        </div>
        <div className="actions-col">
          <button className="btn btn-secondary" onClick={() => onTabChange('dashboard')}>
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {/* Create Group Form Card */}
      <div className="groups-create-card">
        <form onSubmit={onCreateGroup}>
          <label className="form-label-title">Add New Group</label>
          <div className="groups-create-form-row" style={{ display: 'flex', gap: '0.75rem', marginTop: '0.45rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="form-input-element"
              placeholder="e.g. Contractors, IoT Devices, Office..."
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              style={{ maxWidth: '420px' }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={groupLoading || !newGroupName.trim()}
            >
              + Add Group
            </button>
          </div>

          {currentUser?.role === 'admin' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem', cursor: newGroupIsNoInternet ? 'not-allowed' : 'pointer', color: 'var(--text-primary)', opacity: newGroupIsNoInternet ? 0.5 : 1 }}>
                <input
                  type="checkbox"
                  disabled={newGroupIsNoInternet}
                  checked={newGroupIsProtected}
                  onChange={(e) => {
                    setNewGroupIsProtected(e.target.checked);
                    if (e.target.checked) setNewGroupIsNoInternet(false);
                  }}
                />
                <span>Tag as <strong>Protected Group</strong> (Subadmins cannot assign, edit, or delete users under this group)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem', cursor: newGroupIsProtected ? 'not-allowed' : 'pointer', color: 'var(--text-primary)', opacity: newGroupIsProtected ? 0.5 : 1 }}>
                <input
                  type="checkbox"
                  disabled={newGroupIsProtected}
                  checked={newGroupIsNoInternet}
                  onChange={(e) => {
                    setNewGroupIsNoInternet(e.target.checked);
                    if (e.target.checked) setNewGroupIsProtected(false);
                  }}
                />
                <span>Tag as <strong>No Internet Group</strong> (WAN access blocked by dedicated OpenWrt firewall rule)</span>
              </label>
            </div>
          )}

          {groupError && <div className="form-alert-msg" style={{ marginTop: '0.75rem', maxWidth: '420px' }}>{groupError}</div>}
        </form>
      </div>

      {/* Groups Table Card */}
      <div className="table-card-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>GROUP NAME</th>
              <th>TOTAL USERS</th>
              <th>ACCESS &amp; PROTECTION TAGS</th>
              <th style={{ textAlign: 'right', width: '280px' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => {
              const isDefault = group.name.toLowerCase() === 'default';
              const userCount = users.filter((u) => u.groups.some((g) => g.id === group.id)).length;
              return (
                <tr key={group.id} className="group-row-card">
                  <td className="cell-group-name">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                        {group.name}
                      </span>
                      {isDefault && (
                        <span className="fallback-badge">
                          FALLBACK
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="cell-group-count">
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {userCount} {userCount === 1 ? 'client' : 'clients'}
                    </span>
                  </td>
                  <td className="cell-group-tags">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                      {group.is_protected && (
                        <span className="badge-protected">
                          <IconLock size={12} style={{ marginRight: '0.3rem' }} />
                          <span>Protected</span>
                        </span>
                      )}
                      {group.is_no_internet ? (
                        <span className="badge-no-internet">
                          <IconBan size={12} style={{ marginRight: '0.3rem' }} />
                          <span>No Internet</span>
                        </span>
                      ) : (
                        !group.is_protected && (
                          <span className="badge-internet">
                            <IconGlobe size={12} style={{ marginRight: '0.3rem' }} />
                            <span>Internet Allowed</span>
                          </span>
                        )
                      )}
                    </div>
                  </td>
                  <td className="cell-group-actions">
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', alignItems: 'center' }}>
                      {currentUser?.role === 'admin' && !isDefault && (
                        <>
                          {!group.is_no_internet && (
                            <button
                              type="button"
                              className="btn-text-action"
                              onClick={() => onToggleProtection(group.id, Boolean(group.is_protected))}
                            >
                              {group.is_protected ? 'Unprotect' : 'Make Protected'}
                            </button>
                          )}
                          {!group.is_protected && (
                            <button
                              type="button"
                              className="btn-text-action"
                              onClick={() => onToggleNoInternet(group)}
                            >
                              {group.is_no_internet ? 'Allow Internet' : 'Tag No Internet'}
                            </button>
                          )}
                        </>
                      )}
                      {!isDefault ? (
                        <button
                          type="button"
                          className="btn-text-action"
                          style={{ color: '#ef4444' }}
                          onClick={() => onDeleteGroup(group)}
                        >
                          Delete
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Permanent
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
