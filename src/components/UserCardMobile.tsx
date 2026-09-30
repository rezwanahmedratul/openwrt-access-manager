import React from 'react';
import { UserViewModel, SessionUser } from '@/lib/types';
import { getMacVendor } from '@/lib/mac-vendors';
import { IconBan, IconCheck, IconLock } from './icons';

interface UserCardMobileProps {
  user: UserViewModel;
  isSelectionMode: boolean;
  isSelected: boolean;
  currentUser: SessionUser | null;
  copiedMac: string | null;
  onToggleSelect: (id: string) => void;
  onCopyMac: (mac: string) => void;
  onSelectGroup: (groupId: string) => void;
  onEdit: (user: UserViewModel) => void;
  onDelete: (user: UserViewModel) => void;
}

export const UserCardMobile: React.FC<UserCardMobileProps> = ({
  user,
  isSelectionMode,
  isSelected,
  currentUser,
  copiedMac,
  onToggleSelect,
  onCopyMac,
  onSelectGroup,
  onEdit,
  onDelete,
}) => {
  const isNoInternetUser = user.groups?.some((g) => g.is_no_internet);
  const isProtectedFromSubadmin = currentUser?.role === 'subadmin' && user.groups?.some((g) => g.is_protected);
  const isDeleted = user.status === 'deleted';
  const isSelectable = !isDeleted && !isProtectedFromSubadmin;
  const vendor = getMacVendor(user.mac_address);

  return (
    <div
      className={`mobile-user-card ${isSelected ? 'is-selected' : ''}`}
      style={{ opacity: isDeleted ? 0.45 : 1 }}
    >
      {/* Top Header: Selection Checkbox, Status Pill, Quick Actions */}
      <div className="mobile-user-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
          {isSelectionMode && (
            <input
              type="checkbox"
              disabled={!isSelectable}
              checked={isSelected}
              onChange={() => onToggleSelect(user.id)}
              style={{
                cursor: isSelectable ? 'pointer' : 'not-allowed',
                width: '18px',
                height: '18px',
                accentColor: 'var(--text-primary)',
                opacity: isSelectable ? 1 : 0.35,
                marginRight: '0.2rem',
                flexShrink: 0,
              }}
              title={
                isProtectedFromSubadmin
                  ? 'Protected user (Admin only)'
                  : isDeleted
                  ? 'Already marked for deletion'
                  : undefined
              }
            />
          )}

          {isNoInternetUser ? (
            <span className="badge-no-internet" title="Internet access blocked by firewall rule">
              <IconBan size={12} style={{ marginRight: '0.3rem' }} />
              <span>No Internet</span>
            </span>
          ) : (
            <span className={`status-badge-capsule status-badge-${user.status}`}>
              <span className="status-green-dot"></span>
              <span>{user.status}</span>
            </span>
          )}

          <span className="mobile-user-card-name" title={user.name}>
            {user.name}
          </span>
        </div>

        {/* Action Buttons */}
        {!isDeleted && (
          <div className="mobile-user-card-actions">
            {isProtectedFromSubadmin ? (
              <span className="protected-pill" title="Protected Group (Admin Only)">
                <IconLock size={12} style={{ marginRight: '0.25rem' }} />
                <span>Protected</span>
              </span>
            ) : (
              <>
                <button
                  type="button"
                  className="mobile-action-icon-btn"
                  onClick={() => onEdit(user)}
                  title={`Edit ${user.name}`}
                  aria-label="Edit device"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="mobile-action-icon-btn mobile-delete-btn"
                  onClick={() => onDelete(user)}
                  title={`Delete ${user.name}`}
                  aria-label="Delete device"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Middle Row: MAC Address Pill & Vendor Pill */}
      <div className="mobile-user-card-mac-row">
        <button
          type="button"
          className="mac-address-pill mobile-mac-tap-btn"
          onClick={() => onCopyMac(user.mac_address)}
          title={copiedMac === user.mac_address ? 'Copied!' : 'Tap to copy MAC'}
        >
          {copiedMac === user.mac_address ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--status-applied-dot)' }}>
              <IconCheck size={12} />
              <span>Copied MAC</span>
            </span>
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.6 }}>
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>{user.mac_address}</span>
            </span>
          )}
        </button>

        {vendor && (
          <span className="mac-vendor-pill" title={`Manufacturer: ${vendor}`}>
            {vendor}
          </span>
        )}
      </div>

      {/* Bottom Row: Group Tags */}
      <div className="mobile-user-card-groups">
        <span className="mobile-groups-label">Groups:</span>
        <div className="group-tags-wrap">
          {user.groups && user.groups.length > 0 ? (
            user.groups.map((g) => (
              <span
                key={g.id}
                className="group-tag-pill"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectGroup(g.id);
                }}
                style={{
                  cursor: 'pointer',
                  ...(g.is_no_internet
                    ? { borderColor: 'rgba(220, 38, 38, 0.4)', background: 'rgba(220, 38, 38, 0.08)' }
                    : undefined),
                }}
                title={`Filter by group: ${g.name}`}
              >
                {g.is_no_internet && (
                  <IconBan size={10} style={{ marginRight: '0.2rem' }} />
                )}
                {g.name}
                {g.is_protected && (
                  <span style={{ marginLeft: '0.25rem', display: 'inline-flex', alignItems: 'center' }}>
                    <IconLock size={10} style={{ color: 'var(--text-secondary)' }} />
                  </span>
                )}
              </span>
            ))
          ) : (
            <span className="group-tag-pill">Default</span>
          )}
        </div>
      </div>
    </div>
  );
};
