'use client';

import React from 'react';
import { DashboardStats, Group, SessionUser, UserViewModel, ActiveTab } from '@/lib/types';
import { IconClock, IconInfinity } from '../icons';
import { QuickAddBar } from '../QuickAddBar';
import { DashboardStatsCards } from '../dashboard/DashboardStatsCards';
import { DashboardTableCard } from '../dashboard/DashboardTableCard';

interface DashboardViewProps {
  stats: DashboardStats;
  macAuthCountdown: string;
  formatDateTime: (iso: string) => string;
  isUpdatingMacAuth: boolean;
  onToggleMacAuthClick: () => void;
  onTabChange: (tab: ActiveTab) => void;
  // Quick Add Props
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
  macInputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  nameInputRef: React.MutableRefObject<HTMLInputElement | null>;
  // User Table & Pagination Props
  users: UserViewModel[];
  displayedUsers: UserViewModel[];
  paginatedDashboardUsers: UserViewModel[];
  dashboardPage: number;
  setDashboardPage: React.Dispatch<React.SetStateAction<number>>;
  dashboardTotalPages: number;
  dashboardPageSize: number;
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
  loading: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  macAuthCountdown,
  formatDateTime,
  isUpdatingMacAuth,
  onToggleMacAuthClick,
  onTabChange,
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
  macInputRefs,
  nameInputRef,
  users,
  displayedUsers,
  paginatedDashboardUsers,
  dashboardPage,
  setDashboardPage,
  dashboardTotalPages,
  dashboardPageSize,
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
  loading,
}) => {
  return (
    <div className="tab-pane-container">
      {/* Top Headline + Master MAC Auth Status Bar */}
      <div className="dashboard-hero-row">
        <div>
          <h1 className="page-headline">Network Access Control</h1>
          <p className="page-description">
            Assign devices to firewall groups, manage MAC authentication bypass, and stage changes.
          </p>
        </div>

        <div className="header-status-badge-wrap">
          <div className="gateway-pill">
            <span
              className="gateway-pill-dot"
              style={{
                backgroundColor:
                  stats.mac_auth && !stats.mac_auth.enabled ? '#eab308' : '#22c55e',
              }}
            ></span>
            <span>
              {stats.mac_auth && !stats.mac_auth.enabled ? (
                <>
                  MAC Auth: <strong>Disabled</strong>
                  {stats.mac_auth.disabled_until && (
                    <span style={{ marginLeft: '4px', opacity: 0.85 }}>
                      ({macAuthCountdown || 'Paused'})
                    </span>
                  )}
                </>
              ) : (
                'MAC Auth: Enforced'
              )}
            </span>
          </div>

          {stats.mac_auth && !stats.mac_auth.enabled && stats.mac_auth.disabled_until && (
            <div className="mac-auth-timer-chip" style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem' }}>
              <IconClock size={12} />
              <span>Expires {formatDateTime(stats.mac_auth.disabled_until)}</span>
            </div>
          )}

          {stats.mac_auth && !stats.mac_auth.enabled && !stats.mac_auth.disabled_until && (
            <div className="mac-auth-timer-chip" style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem' }}>
              <IconInfinity size={12} />
              <span>Permanently Off</span>
            </div>
          )}

          <button
            type="button"
            className={`btn header-mac-auth-btn ${stats.mac_auth && !stats.mac_auth.enabled ? 'btn-primary' : 'btn-secondary'}`}
            disabled={isUpdatingMacAuth}
            onClick={onToggleMacAuthClick}
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.95rem', fontWeight: 600 }}
          >
            {isUpdatingMacAuth ? 'Updating...' : stats.mac_auth && !stats.mac_auth.enabled ? 'Turn ON MAC Auth' : 'Turn OFF MAC Auth'}
          </button>
        </div>
      </div>

      {/* Statistics Cards Row */}
      <DashboardStatsCards
        stats={stats}
        onTabChange={onTabChange}
      />

      {/* Quick Add Form Bar */}
      <QuickAddBar
        groups={groups}
        currentUser={currentUser}
        macOctets={macOctets}
        onMacChange={onMacChange}
        onMacKeyDown={onMacKeyDown}
        onMacPaste={onMacPaste}
        onPasteClipboard={onPasteClipboard}
        addName={addName}
        setAddName={setAddName}
        addSelectedGroup={addSelectedGroup}
        setAddSelectedGroup={setAddSelectedGroup}
        addError={addError}
        setAddError={setAddError}
        isAdding={isAdding}
        onAddUser={onAddUser}
        quickAddVendor={quickAddVendor}
        quickAddDuplicate={quickAddDuplicate}
        macInputRefs={macInputRefs}
        nameInputRef={nameInputRef}
      />

      {/* Search / Filter & User Table Card */}
      <DashboardTableCard
        users={users}
        displayedUsers={displayedUsers}
        paginatedDashboardUsers={paginatedDashboardUsers}
        dashboardPage={dashboardPage}
        setDashboardPage={setDashboardPage}
        dashboardTotalPages={dashboardTotalPages}
        dashboardPageSize={dashboardPageSize}
        search={search}
        setSearch={setSearch}
        selectedGroup={selectedGroup}
        setSelectedGroup={setSelectedGroup}
        groups={groups}
        currentUser={currentUser}
        onRefreshData={onRefreshData}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        onExportCSV={onExportCSV}
        onOpenImportModal={onOpenImportModal}
        isSelectionMode={isSelectionMode}
        onToggleSelectionMode={onToggleSelectionMode}
        selectedUserIds={selectedUserIds}
        selectableUsers={selectableUsers}
        onToggleSelectAll={onToggleSelectAll}
        onToggleSelectUser={onToggleSelectUser}
        onOpenBulkGroupModal={onOpenBulkGroupModal}
        onBulkDelete={onBulkDelete}
        onSortToggle={onSortToggle}
        renderSortArrow={renderSortArrow}
        copiedMac={copiedMac}
        onCopyMac={onCopyMac}
        onEditUser={onEditUser}
        onDeleteUser={onDeleteUser}
        onTabChange={onTabChange}
        loading={loading}
      />
    </div>
  );
};
