'use client';

import React from 'react';
import { IconClose } from '@/components/icons';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { FloatingPendingBar } from '@/components/FloatingPendingBar';
import { LoginScreen } from '@/components/LoginScreen';
import { DashboardView } from '@/components/views/DashboardView';
import { UsersView } from '@/components/views/UsersView';
import { GroupsView } from '@/components/views/GroupsView';
import { AccountView } from '@/components/views/AccountView';
import { HistoryView } from '@/components/views/HistoryView';
import { SettingsView } from '@/components/views/SettingsView';
import { EditUserModal } from '@/components/modals/EditUserModal';
import { HistoryQuickModal } from '@/components/modals/HistoryQuickModal';
import { MacAuthModal } from '@/components/modals/MacAuthModal';
import { ConflictModal } from '@/components/modals/ConflictModal';
import { ChangePasswordModal } from '@/components/modals/ChangePasswordModal';
import { ImportModal } from '@/components/modals/ImportModal';
import { BulkGroupModal } from '@/components/modals/BulkGroupModal';

import { useAuthSession } from '@/hooks/useAuthSession';
import { useAccessManagerData } from '@/hooks/useAccessManagerData';
import { useQuickAdd } from '@/hooks/useQuickAdd';
import { useBulkActions } from '@/hooks/useBulkActions';
import { useDraftOperations } from '@/hooks/useDraftOperations';
import { useMacAuth } from '@/hooks/useMacAuth';
import { useGroupManagement } from '@/hooks/useGroupManagement';
import { useAccountManagement } from '@/hooks/useAccountManagement';
import { useSettingsConfig } from '@/hooks/useSettingsConfig';
import { useHistoryData } from '@/hooks/useHistoryData';
import { useBatchImport } from '@/hooks/useBatchImport';

export default function DashboardPage() {
  // Authentication & Session
  const {
    currentUser,
    authChecking,
    setAuthChecking,
    loginUsername,
    setLoginUsername,
    loginPassword,
    setLoginPassword,
    loginError,
    loginLoading,
    handleLogin,
    handleLogout,
    theme,
    switchTheme,
    activeTab,
    handleTabChange,
    notification,
    showToast,
  } = useAuthSession();

  // Core Data & Telemetry
  const {
    users,
    groups,
    stats,
    loading,
    search,
    setSearch,
    selectedGroup,
    setSelectedGroup,
    statusFilter,
    setStatusFilter,
    handleSortToggle,
    sortArrow,
    displayedUsers,
    dashboardPage,
    setDashboardPage,
    dashboardTotalPages,
    DASHBOARD_PAGE_SIZE,
    paginatedDashboardUsers,
    copiedMac,
    handleCopyMac,
    handleExportCSV,
    fetchData,
    handleRefreshData,
  } = useAccessManagerData({ currentUser, onShowToast: showToast });

  // Quick Add Device
  const quickAdd = useQuickAdd({
    users,
    groups,
    onSuccess: fetchData,
    onShowToast: showToast,
  });

  // Bulk Operations
  const bulk = useBulkActions({
    users,
    displayedUsers,
    currentUser,
    onRefresh: fetchData,
    onShowToast: showToast,
  });

  // Draft Operations & User Editing
  const draft = useDraftOperations({
    users,
    groups,
    onRefresh: fetchData,
    onShowToast: showToast,
  });

  // Batch CSV/Text Import
  const batchImport = useBatchImport({
    users,
    groups,
    onRefresh: fetchData,
    onShowToast: showToast,
  });

  // MAC Authentication Policy
  const macAuth = useMacAuth({
    stats,
    currentUser,
    onRefresh: fetchData,
    onShowToast: showToast,
  });

  // Groups Management
  const groupMgmt = useGroupManagement({
    currentUser,
    onRefresh: fetchData,
    onShowToast: showToast,
  });

  // Accounts Management
  const accountMgmt = useAccountManagement({
    currentUser,
    activeTab,
    onShowToast: showToast,
  });

  // Settings & Diagnostics
  const settings = useSettingsConfig({
    stats,
    users,
    groups,
    currentUser,
    activeTab,
    onRefresh: fetchData,
    onShowToast: showToast,
  });

  // History & Releases
  const history = useHistoryData({
    currentUser,
    activeTab,
    onShowToast: showToast,
  });

  // Auth Loading Screen
  if (authChecking) {
    return (
      <div className="auth-page-container" style={{ background: 'var(--bg-app)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div className="loading-spinner" style={{ width: '24px', height: '24px' }}></div>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', fontWeight: 500 }}>Connecting to OpenWrt Gateway...</span>
          <button
            type="button"
            onClick={() => setAuthChecking(false)}
            style={{
              marginTop: '0.5rem',
              background: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
              fontSize: '0.76rem',
              padding: '0.3rem 0.75rem',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Skip to Sign In &rarr;
          </button>
        </div>
      </div>
    );
  }

  // Login Screen if Unauthenticated
  if (!currentUser) {
    return (
      <LoginScreen
        loginUsername={loginUsername}
        setLoginUsername={setLoginUsername}
        loginPassword={loginPassword}
        setLoginPassword={setLoginPassword}
        loginError={loginError}
        loginLoading={loginLoading}
        onLogin={handleLogin}
      />
    );
  }

  return (
    <div className="app-shell">
      <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="main-wrapper">
        <Header
          currentUser={currentUser}
          theme={theme}
          onSwitchTheme={switchTheme}
          onOpenHistoryModal={() => handleTabChange('history')}
          onTabChange={handleTabChange}
          onLogout={handleLogout}
        />

        <main className="dashboard-container">
          {/* Toast Notification */}
          {notification && (
            <div className={`toast-notice ${notification.type === 'error' ? 'toast-error' : 'toast-success'}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="toast-dot" />
                <span>{notification.message}</span>
              </div>
              <button
                className="toast-close"
                onClick={() => {}}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}
              >
                <IconClose />
              </button>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <DashboardView
              stats={stats}
              macAuthCountdown={macAuth.macAuthCountdown}
              formatDateTime={settings.formatDateTime}
              isUpdatingMacAuth={macAuth.isUpdatingMacAuth}
              onToggleMacAuthClick={macAuth.handleToggleMacAuthClick}
              onTabChange={handleTabChange}
              groups={groups}
              currentUser={currentUser}
              macOctets={quickAdd.macOctets}
              onMacChange={quickAdd.handleMacChange}
              onMacKeyDown={quickAdd.handleMacKeyDown}
              onMacPaste={quickAdd.handleMacPaste}
              onPasteClipboard={quickAdd.handlePasteClipboardDirect}
              addName={quickAdd.addName}
              setAddName={quickAdd.setAddName}
              addSelectedGroup={quickAdd.addSelectedGroup}
              setAddSelectedGroup={quickAdd.setAddSelectedGroup}
              addError={quickAdd.addError}
              setAddError={quickAdd.setAddError}
              isAdding={quickAdd.isAdding}
              onAddUser={quickAdd.handleAddUserDirect}
              quickAddVendor={quickAdd.quickAddVendor}
              quickAddDuplicate={quickAdd.quickAddDuplicate}
              quickAddDuplicateName={quickAdd.quickAddDuplicateName}
              macInputRefs={quickAdd.macInputRefs}
              nameInputRef={quickAdd.nameInputRef}
              users={users}
              displayedUsers={displayedUsers}
              paginatedDashboardUsers={paginatedDashboardUsers}
              dashboardPage={dashboardPage}
              setDashboardPage={setDashboardPage}
              dashboardTotalPages={dashboardTotalPages}
              dashboardPageSize={DASHBOARD_PAGE_SIZE}
              search={search}
              setSearch={setSearch}
              selectedGroup={selectedGroup}
              setSelectedGroup={setSelectedGroup}
              onRefreshData={handleRefreshData}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              onExportCSV={handleExportCSV}
              onOpenImportModal={() => batchImport.setShowImportModal(true)}
              isSelectionMode={bulk.isSelectionMode}
              onToggleSelectionMode={bulk.handleToggleSelectionMode}
              selectedUserIds={bulk.selectedUserIds}
              selectableUsers={bulk.selectableUsers}
              onToggleSelectAll={bulk.handleToggleSelectAll}
              onToggleSelectUser={bulk.handleToggleSelectUser}
              onOpenBulkGroupModal={() => bulk.setShowBulkGroupModal(true)}
              onBulkDelete={bulk.handleBulkDelete}
              onSortToggle={handleSortToggle}
              renderSortArrow={sortArrow}
              copiedMac={copiedMac}
              onCopyMac={handleCopyMac}
              onEditUser={draft.openEditModal}
              onDeleteUser={draft.handleDeleteUser}
              loading={loading}
            />
          )}

          {activeTab === 'users' && (
            <UsersView
              users={users}
              groups={groups}
              currentUser={currentUser}
              displayedUsers={displayedUsers}
              search={search}
              setSearch={setSearch}
              selectedGroup={selectedGroup}
              setSelectedGroup={setSelectedGroup}
              onRefreshData={handleRefreshData}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              onExportCSV={handleExportCSV}
              onOpenImportModal={() => batchImport.setShowImportModal(true)}
              isSelectionMode={bulk.isSelectionMode}
              onToggleSelectionMode={bulk.handleToggleSelectionMode}
              selectedUserIds={bulk.selectedUserIds}
              selectableUsers={bulk.selectableUsers}
              onToggleSelectAll={bulk.handleToggleSelectAll}
              onToggleSelectUser={bulk.handleToggleSelectUser}
              onOpenBulkGroupModal={() => bulk.setShowBulkGroupModal(true)}
              onBulkDelete={bulk.handleBulkDelete}
              onSortToggle={handleSortToggle}
              renderSortArrow={sortArrow}
              copiedMac={copiedMac}
              onCopyMac={handleCopyMac}
              onEditUser={draft.openEditModal}
              onDeleteUser={draft.handleDeleteUser}
              onTabChange={handleTabChange}
              loading={loading}
            />
          )}

          {activeTab === 'groups' && (
            <GroupsView
              groups={groups}
              users={users}
              currentUser={currentUser}
              newGroupName={groupMgmt.newGroupName}
              setNewGroupName={groupMgmt.setNewGroupName}
              newGroupIsProtected={groupMgmt.newGroupIsProtected}
              setNewGroupIsProtected={groupMgmt.setNewGroupIsProtected}
              newGroupIsNoInternet={groupMgmt.newGroupIsNoInternet}
              setNewGroupIsNoInternet={groupMgmt.setNewGroupIsNoInternet}
              groupLoading={groupMgmt.groupLoading}
              groupError={groupMgmt.groupError}
              onCreateGroup={groupMgmt.handleCreateGroup}
              onToggleProtection={groupMgmt.handleToggleProtection}
              onToggleNoInternet={groupMgmt.handleToggleNoInternet}
              onDeleteGroup={groupMgmt.handleDeleteGroup}
              onTabChange={handleTabChange}
            />
          )}

          {activeTab === 'account' && (
            <AccountView
              currentUser={currentUser}
              accountsList={accountMgmt.accountsList}
              newSubadminUsername={accountMgmt.newSubadminUsername}
              setNewSubadminUsername={accountMgmt.setNewSubadminUsername}
              newSubadminPassword={accountMgmt.newSubadminPassword}
              setNewSubadminPassword={accountMgmt.setNewSubadminPassword}
              subadminLoading={accountMgmt.subadminLoading}
              subadminError={accountMgmt.subadminError}
              onCreateSubadmin={accountMgmt.handleCreateSubadmin}
              onDeleteSubadmin={accountMgmt.handleDeleteSubadmin}
              onOpenPasswordModal={accountMgmt.openPasswordModal}
              onTabChange={handleTabChange}
            />
          )}

          {activeTab === 'history' && (
            <HistoryView
              historyList={history.historyList}
              historyLoading={history.historyLoading}
              liveHistoryItem={history.liveHistoryItem}
              stats={stats}
              onFetchHistory={history.fetchHistory}
              onTabChange={handleTabChange}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              stats={stats}
              currentUser={currentUser}
              macAuthCountdown={macAuth.macAuthCountdown}
              formatDateTime={settings.formatDateTime}
              isUpdatingMacAuth={macAuth.isUpdatingMacAuth}
              onToggleMacAuthClick={macAuth.handleToggleMacAuthClick}
              isTestingGateway={settings.isTestingGateway}
              onTestGateway={settings.handleTestGateway}
              gatewayLatency={settings.gatewayLatency}
              gatewayIp={settings.gatewayIp}
              setGatewayIp={settings.setGatewayIp}
              pollingInterval={settings.pollingInterval}
              setPollingInterval={settings.setPollingInterval}
              blockPolicy={settings.blockPolicy}
              setBlockPolicy={settings.setBlockPolicy}
              synFloodEnabled={settings.synFloodEnabled}
              setSynFloodEnabled={settings.setSynFloodEnabled}
              flowOffloadingEnabled={settings.flowOffloadingEnabled}
              setFlowOffloadingEnabled={settings.setFlowOffloadingEnabled}
              fullconeNatEnabled={settings.fullconeNatEnabled}
              setFullconeNatEnabled={settings.setFullconeNatEnabled}
              showSecretToken={settings.showSecretToken}
              setShowSecretToken={settings.setShowSecretToken}
              tokenCopied={settings.tokenCopied}
              onCopyText={settings.handleCopyText}
              cacheInfo={settings.cacheInfo}
              isPurgingCache={settings.isPurgingCache}
              onPurgeCache={settings.handlePurgeCache}
              theme={theme}
              onSwitchTheme={switchTheme}
              onOpenHistoryModal={() => handleTabChange('history')}
              onExportConfig={settings.handleExportConfig}
              onTabChange={handleTabChange}
              onShowToast={showToast}
            />
          )}
        </main>
      </div>

      <FloatingPendingBar
        pendingChanges={stats.pending_changes}
        isApplying={draft.isApplying}
        onUndo={draft.handleUndo}
        onDiscard={draft.handleDiscard}
        onApply={draft.handleApply}
      />

      <EditUserModal
        isOpen={draft.modalMode === 'EDIT'}
        onClose={() => draft.setModalMode(null)}
        formName={draft.formName}
        setFormName={draft.setFormName}
        formMac={draft.formMac}
        setFormMac={draft.setFormMac}
        formGroupIds={draft.formGroupIds}
        setFormGroupIds={draft.setFormGroupIds}
        formError={draft.formError}
        groups={groups}
        currentUser={currentUser}
        onSaveUser={draft.handleSaveUser}
        duplicateMacUser={draft.duplicateMacUser}
        duplicateNameUser={draft.duplicateNameUser}
        onGoToGroups={() => {
          draft.setModalMode(null);
          handleTabChange('groups');
        }}
      />

      <HistoryQuickModal
        isOpen={history.showHistory}
        onClose={() => history.setShowHistory(false)}
        historyList={history.historyList}
      />

      <MacAuthModal
        isOpen={macAuth.showMacAuthModal}
        onClose={() => macAuth.setShowMacAuthModal(false)}
        currentUser={currentUser}
        isUpdatingMacAuth={macAuth.isUpdatingMacAuth}
        macAuthModalError={macAuth.macAuthModalError}
        macAuthDisableMode={macAuth.macAuthDisableMode}
        setMacAuthDisableMode={macAuth.setMacAuthDisableMode}
        customMacAuthDate={macAuth.customMacAuthDate}
        setCustomMacAuthDate={macAuth.setCustomMacAuthDate}
        onConfirmDisable={macAuth.handleConfirmDisableMacAuth}
      />

      <ConflictModal
        conflictData={groupMgmt.conflictModalData}
        onClose={() => groupMgmt.setConflictModalData(null)}
        isResolvingConflict={groupMgmt.isResolvingConflict}
        onResolveConflict={async (targetGroup, action) => {
          groupMgmt.setIsResolvingConflict(true);
          await groupMgmt.handleToggleNoInternet(targetGroup, action);
          groupMgmt.setIsResolvingConflict(false);
        }}
      />

      <ChangePasswordModal
        account={accountMgmt.passwordModalAccount}
        onClose={accountMgmt.closePasswordModal}
        passwordModalError={accountMgmt.passwordModalError}
        newPasswordVal={accountMgmt.newPasswordVal}
        setNewPasswordVal={accountMgmt.setNewPasswordVal}
        confirmPasswordVal={accountMgmt.confirmPasswordVal}
        setConfirmPasswordVal={accountMgmt.setConfirmPasswordVal}
        showPasswordText={accountMgmt.showPasswordText}
        setShowPasswordText={accountMgmt.setShowPasswordText}
        passwordModalLoading={accountMgmt.passwordModalLoading}
        onChangePassword={accountMgmt.handleChangePassword}
      />

      <ImportModal
        isOpen={batchImport.showImportModal}
        onClose={() => {
          batchImport.setShowImportModal(false);
          batchImport.setImportError(null);
        }}
        importText={batchImport.importText}
        setImportText={batchImport.setImportText}
        importError={batchImport.importError}
        setImportError={batchImport.setImportError}
        importTargetGroup={batchImport.importTargetGroup}
        setImportTargetGroup={batchImport.setImportTargetGroup}
        groups={groups}
        parsedImportItems={batchImport.parsedImportItems}
        isImporting={batchImport.isImporting}
        onExecuteImport={batchImport.handleExecuteImport}
      />

      <BulkGroupModal
        isOpen={bulk.showBulkGroupModal}
        onClose={() => bulk.setShowBulkGroupModal(false)}
        selectedUserCount={bulk.selectedUserIds.size}
        bulkTargetGroupId={bulk.bulkTargetGroupId}
        setBulkTargetGroupId={bulk.setBulkTargetGroupId}
        groups={groups}
        currentUser={currentUser}
        isBulkAssigning={bulk.isBulkAssigning}
        onExecuteBulkGroupAssign={bulk.handleExecuteBulkGroupAssign}
      />
    </div>
  );
}
