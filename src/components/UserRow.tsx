import React from 'react';
import { UserViewModel, SessionUser } from '@/lib/types';
import { getMacVendor } from '@/lib/mac-vendors';
import { IconBan, IconCheck, IconLock } from './icons';

interface UserRowProps {
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

export const UserRow: React.FC<UserRowProps> = ({
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

  return (
    <tr
      key={user.id}
      className={`user-row-card ${isSelectionMode ? 'has-selection-mode' : ''}`}
      style={{ opacity: isDeleted ? 0.4 : 1 }}
    >
      {isSelectionMode && (
        <td className="cell-checkbox">
          <input
            type="checkbox"
            disabled={!isSelectable}
            checked={isSelected}
            onChange={() => onToggleSelect(user.id)}
            style={{
              cursor: isSelectable ? 'pointer' : 'not-allowed',
              width: '15px',
              height: '15px',
              accentColor: 'var(--text-primary)',
              opacity: isSelectable ? 1 : 0.35,
            }}
            title={
              isProtectedFromSubadmin
                ? 'Protected user (Admin only)'
                : isDeleted
                ? 'Already marked for deletion'
                : undefined
            }
          />
        </td>
      )}
      <td className="cell-status">
        {isNoInternetUser ? (
          <span className="badge-no-internet" title="Internet access blocked by firewall rule">
            <IconBan size={12} style={{ marginRight: '0.35rem' }} />
            <span>No Internet</span>
          </span>
        ) : (
          <span className={`status-badge-capsule status-badge-${user.status}`}>
            <span className="status-green-dot"></span>
            <span>{user.status}</span>
          </span>
        )}
      </td>
      <td className="cell-name">
        <span className="user-name-cell">{user.name}</span>
      </td>
      <td className="cell-mac">
        <div style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem' }}>
          <span
            className="mac-address-pill"
            onClick={() => onCopyMac(user.mac_address)}
            style={{ cursor: 'pointer' }}
            title={copiedMac === user.mac_address ? 'Copied!' : 'Click to copy'}
          >
            {copiedMac === user.mac_address ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                <IconCheck size={11} style={{ color: 'var(--status-applied-dot)' }} />
                <span>Copied</span>
              </span>
            ) : (
              user.mac_address
            )}
          </span>
          {(() => {
            const vendor = getMacVendor(user.mac_address);
            return vendor ? (
              <span className="mac-vendor-pill" title={`Manufacturer: ${vendor}`}>
                {vendor}
              </span>
            ) : null;
          })()}
        </div>
      </td>
      <td className="cell-groups">
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
                title={`Click to filter by "${g.name}"`}
              >
                {g.is_no_internet && (
                  <IconBan size={11} style={{ marginRight: '0.25rem' }} />
                )}
                {g.name}
                {g.is_protected && (
                  <span style={{ marginLeft: '0.3rem', display: 'inline-flex', alignItems: 'center' }} title="Protected Group">
                    <IconLock size={11} style={{ color: 'var(--text-secondary)' }} />
                  </span>
                )}
              </span>
            ))
          ) : (
            <span className="group-tag-pill">Default</span>
          )}
        </div>
      </td>
      <td className="cell-actions">
        {user.status !== 'deleted' ? (
          <div className="table-actions-cell">
            {user.groups?.some((g) => g.is_protected) && currentUser?.role === 'subadmin' ? (
              <span
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
                title="User is assigned to a protected group. Only administrators can edit or delete this user."
              >
                <IconLock size={11} />
                <span>Protected (Admin Only)</span>
              </span>
            ) : (
              <>
                <button
                  className="btn-text-action"
                  onClick={() => onEdit(user)}
                >
                  Edit
                </button>
                <button
                  className="btn-text-action"
                  onClick={() => onDelete(user)}
                >
                  Delete
                </button>
              </>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Pending Delete
          </div>
        )}
      </td>
    </tr>
  );
};
