import React from 'react';
import { Group, SessionUser, UserViewModel, ActiveTab } from '@/lib/types';
import { UserRow } from '../UserRow';
import { UserCardMobile } from '../UserCardMobile';

export interface UsersTableCardProps {
  displayedUsers: UserViewModel[];
  users: UserViewModel[];
  groups: Group[];
  currentUser: SessionUser | null;
  search: string;
  setSearch: (s: string) => void;
  selectedGroup: string;
  setSelectedGroup: (g: string) => void;
  onRefreshData: () => void;
  statusFilter: 'all' | 'applied' | 'added' | 'modified' | 'deleted';
  setStatusFilter: (s: 'all' | 'applied' | 'added' | 'modified' | 'deleted') => void;
  onExportCSV: () => void;
  onOpenImportModal: () => void;
  isSelectionMode: boolean;
  onToggleSelectionMode: () => void;
  selectedUserIds: Set<string>;
  selectableUsers: UserViewModel[];
  onToggleSelectAll: () => void;
  onToggleSelectUser: (id: string) => void;
  onOpenBulkGroupModal: () => void;
  onBulkDelete: () => void;
  onSortToggle: (field: 'status' | 'name' | 'mac_address') => void;
  renderSortArrow: (field: any) => React.ReactNode;
  copiedMac: string | null;
  onCopyMac: (mac: string) => void;
  onEditUser: (user: UserViewModel) => void;
  onDeleteUser: (user: UserViewModel) => void;
  onTabChange: (tab: ActiveTab) => void;
  loading: boolean;
}

export const UsersTableCard: React.FC<UsersTableCardProps> = ({
  displayedUsers,
  users,
  groups,
  currentUser,
  search,
  setSearch,
  selectedGroup,
  setSelectedGroup,
  onRefreshData,
  statusFilter,
  setStatusFilter,
  onExportCSV,
  onOpenImportModal,
  isSelectionMode,
  onToggleSelectionMode,
  selectedUserIds,
  selectableUsers,
  onToggleSelectAll,
  onToggleSelectUser,
  onOpenBulkGroupModal,
  onBulkDelete,
  onSortToggle,
  renderSortArrow,
  copiedMac,
  onCopyMac,
  onEditUser,
  onDeleteUser,
  onTabChange,
  loading,
}) => {
  return (
    <div className="table-card-container">
      {/* Search & Filter Header */}
      <div className="table-header-tools">
        <div className="search-input-wrapper">
          <svg className="search-input-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="search-input-field"
            placeholder="Search by name, MAC address, vendor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearch('')}
              title="Clear search"
              aria-label="Clear search"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        <div className="table-header-filters-row">
          <select
            className="group-dropdown-select"
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
          >
            <option value="ALL">All Groups</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} {g.is_no_internet ? '(No Internet)' : ''}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="btn btn-ghost btn-sm refresh-btn-icon"
            onClick={onRefreshData}
            title="Refresh data"
            aria-label="Refresh data"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </button>
        </div>
      </div>

      {/* Subtoolbar: Status Filter Chips + Results Count + Actions */}
      <div className="table-subtoolbar">
        <div className="status-chips-scroll-container">
          {(['all', 'applied', 'added', 'modified', 'deleted'] as const).map((status) => {
            const counts: Record<string, number> = {
              all: users.length,
              applied: users.filter((u) => u.status === 'applied').length,
              added: users.filter((u) => u.status === 'added').length,
              modified: users.filter((u) => u.status === 'modified').length,
              deleted: users.filter((u) => u.status === 'deleted').length,
            };
            if (status !== 'all' && counts[status] === 0) return null;
            return (
              <button
                key={status}
                type="button"
                className={`status-filter-chip ${statusFilter === status ? 'active' : ''}`}
                onClick={() => setStatusFilter(status)}
              >
                <span style={{ textTransform: 'capitalize' }}>{status}</span>
                <span className="status-filter-count">{counts[status]}</span>
              </button>
            );
          })}
        </div>

        <div className="table-actions-toolbar">
          <span className="table-results-counter">
            {displayedUsers.length === users.length
              ? `Showing all ${users.length} users`
              : `${displayedUsers.length} of ${users.length} users`}
          </span>

          <div className="table-action-buttons-group">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onExportCSV}
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
              title="Export all users as CSV"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>CSV</span>
            </button>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onOpenImportModal}
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
              title="Batch import devices from CSV or text"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>Import</span>
            </button>

            <button
              type="button"
              className={`btn btn-sm ${isSelectionMode ? 'btn-primary' : 'btn-ghost'}`}
              onClick={onToggleSelectionMode}
              style={{
                fontSize: '0.75rem',
                padding: '0.35rem 0.65rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
              title={isSelectionMode ? 'Exit selection mode' : 'Select multiple devices'}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {isSelectionMode ? (
                  <polyline points="20 6 9 17 4 12" />
                ) : (
                  <>
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="m9 12 2 2 4-4" />
                  </>
                )}
              </svg>
              <span>{isSelectionMode ? 'Done' : 'Select'}</span>
            </button>

            {isSelectionMode && selectedUserIds.size > 0 && (
              <>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={onOpenBulkGroupModal}
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                  title="Assign selected users to group"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <span>Group ({selectedUserIds.size})</span>
                </button>

                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={onBulkDelete}
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                  title="Delete selected users"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  <span>Delete ({selectedUserIds.size})</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="desktop-table-container">
        <table className="data-table">
          <thead>
            <tr>
              {isSelectionMode && (
                <th className="cell-checkbox" style={{ width: '44px', padding: '0.75rem 0.5rem 0.75rem 1rem' }}>
                  <input
                    type="checkbox"
                    checked={selectableUsers.length > 0 && selectedUserIds.size === selectableUsers.length}
                    onChange={onToggleSelectAll}
                    disabled={selectableUsers.length === 0}
                    style={{ cursor: selectableUsers.length === 0 ? 'not-allowed' : 'pointer', width: '16px', height: '16px', accentColor: 'var(--text-primary)' }}
                    title={selectableUsers.length === 0 ? 'No selectable users' : 'Select all'}
                  />
                </th>
              )}
              <th
                style={{ width: '130px', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => onSortToggle('status')}
                title="Sort by status"
              >
                STATUS{renderSortArrow('status')}
              </th>
              <th
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => onSortToggle('name')}
                title="Sort by name"
              >
                NAME{renderSortArrow('name')}
              </th>
              <th
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => onSortToggle('mac_address')}
                title="Sort by MAC"
              >
                MAC ADDRESS{renderSortArrow('mac_address')}
              </th>
              <th>ASSIGNED GROUPS</th>
              <th style={{ textAlign: 'right', width: '140px' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {displayedUsers.length === 0 ? (
              <tr>
                <td colSpan={isSelectionMode ? 6 : 5} style={{ textAlign: 'center', padding: '3.5rem' }}>
                  {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                      <div className="loading-spinner"></div>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading users...</span>
                    </div>
                  ) : (
                    <div className="empty-state">
                      <div className="empty-state-icon">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                      </div>
                      <span className="empty-state-text">No users found</span>
                      <span className="empty-state-hint">{search ? 'Try a different search query' : 'Register a device or clear filters'}</span>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              displayedUsers.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  isSelectionMode={isSelectionMode}
                  isSelected={selectedUserIds.has(u.id)}
                  currentUser={currentUser}
                  copiedMac={copiedMac}
                  onToggleSelect={onToggleSelectUser}
                  onCopyMac={onCopyMac}
                  onSelectGroup={setSelectedGroup}
                  onEdit={onEditUser}
                  onDelete={onDeleteUser}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Device Cards View (< 768px) */}
      <div className="mobile-cards-container">
        {displayedUsers.length === 0 ? (
          <div style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                <div className="loading-spinner"></div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading users...</span>
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-state-text">No users found</span>
                <span className="empty-state-hint">{search ? 'Try a different search query' : 'Register a device or clear filters'}</span>
              </div>
            )}
          </div>
        ) : (
          displayedUsers.map((u) => (
            <UserCardMobile
              key={u.id}
              user={u}
              isSelectionMode={isSelectionMode}
              isSelected={selectedUserIds.has(u.id)}
              currentUser={currentUser}
              copiedMac={copiedMac}
              onToggleSelect={onToggleSelectUser}
              onCopyMac={onCopyMac}
              onSelectGroup={setSelectedGroup}
              onEdit={onEditUser}
              onDelete={onDeleteUser}
            />
          ))
        )}
      </div>

      {/* Bottom Footer Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.85rem 1.15rem',
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--bg-card)',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Showing all {displayedUsers.length} users • Unbounded directory view
        </span>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => onTabChange('dashboard')}
          style={{ fontSize: '0.76rem', padding: '0.35rem 0.75rem' }}
        >
          ← Back to Dashboard (10 per page)
        </button>
      </div>
    </div>
  );
};
