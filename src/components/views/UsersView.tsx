import React from 'react';
import { Group, SessionUser, UserViewModel, ActiveTab } from '@/lib/types';
import { UsersStatsRibbon } from '../users/UsersStatsRibbon';
import { UsersTableCard } from '../users/UsersTableCard';

interface UsersViewProps {
  users: UserViewModel[];
  displayedUsers: UserViewModel[];
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

export const UsersView: React.FC<UsersViewProps> = (props) => {
  const { users, onTabChange, onExportCSV } = props;

  return (
    <div className="page-content-animated" key="users">
      {/* Small Top Pill */}
      <div>
        <div className="gateway-pill">
          <span className="gateway-pill-dot"></span>
          <span>Network Directory • Unbounded Client Inventory</span>
        </div>
      </div>

      {/* All Users Page Headline */}
      <div className="header-row">
        <div className="title-col">
          <h1 className="page-headline">All Users & Devices</h1>
          <p className="page-description">
            Complete inventory of all {users.length} registered hardware client devices. View full records without pagination, perform batch assignments, and export to CSV.
          </p>
        </div>
        <div className="actions-col" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={() => onTabChange('dashboard')}>
            ← Back to Dashboard
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onExportCSV}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Users Stats Summary Ribbon */}
      <UsersStatsRibbon users={users} />

      {/* Full User Table Card */}
      <UsersTableCard {...props} />
    </div>
  );
};
