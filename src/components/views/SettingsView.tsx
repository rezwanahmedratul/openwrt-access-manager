'use client';

import React from 'react';
import { DashboardStats, SessionUser, ActiveTab } from '@/lib/types';
import { MacAuthBannerCard } from '../settings/MacAuthBannerCard';
import { GatewayConfigCard } from '../settings/GatewayConfigCard';
import { FirewallRulesCard } from '../settings/FirewallRulesCard';
import { ApiIntegrationCard } from '../settings/ApiIntegrationCard';
import { CacheDiagnosticsCard } from '../settings/CacheDiagnosticsCard';
import { ThemeAppearanceCard } from '../settings/ThemeAppearanceCard';
import { SystemBackupCard } from '../settings/SystemBackupCard';

interface SettingsViewProps {
  stats: DashboardStats;
  currentUser: SessionUser | null;
  macAuthCountdown: string;
  formatDateTime: (iso: string) => string;
  isUpdatingMacAuth: boolean;
  onToggleMacAuthClick: () => void;
  isTestingGateway: boolean;
  onTestGateway: () => void;
  gatewayLatency: number | null;
  gatewayIp: string;
  setGatewayIp: (ip: string) => void;
  pollingInterval: string;
  setPollingInterval: (interval: string) => void;
  blockPolicy: 'REJECT' | 'DROP';
  setBlockPolicy: (policy: 'REJECT' | 'DROP') => void;
  synFloodEnabled: boolean;
  setSynFloodEnabled: (val: boolean) => void;
  flowOffloadingEnabled: boolean;
  setFlowOffloadingEnabled: (val: boolean) => void;
  fullconeNatEnabled: boolean;
  setFullconeNatEnabled: (val: boolean) => void;
  showSecretToken: boolean;
  setShowSecretToken: (show: boolean) => void;
  tokenCopied: boolean;
  onCopyText: (text: string, type: 'token' | 'endpoint') => void;
  cacheInfo: { engine: string; connected: boolean; keysCount: number; pingMs: number } | null;
  isPurgingCache: boolean;
  onPurgeCache: () => void;
  theme: 'light' | 'dark';
  onSwitchTheme: (theme: 'light' | 'dark') => void;
  onOpenHistoryModal: () => void;
  onExportConfig: () => void;
  onTabChange: (tab: ActiveTab) => void;
  onShowToast: (msg: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  stats,
  currentUser,
  macAuthCountdown,
  formatDateTime,
  isUpdatingMacAuth,
  onToggleMacAuthClick,
  isTestingGateway,
  onTestGateway,
  gatewayLatency,
  gatewayIp,
  setGatewayIp,
  pollingInterval,
  setPollingInterval,
  blockPolicy,
  setBlockPolicy,
  synFloodEnabled,
  setSynFloodEnabled,
  flowOffloadingEnabled,
  setFlowOffloadingEnabled,
  fullconeNatEnabled,
  setFullconeNatEnabled,
  showSecretToken,
  setShowSecretToken,
  tokenCopied,
  onCopyText,
  cacheInfo,
  isPurgingCache,
  onPurgeCache,
  theme,
  onSwitchTheme,
  onOpenHistoryModal,
  onExportConfig,
  onShowToast,
}) => {
  return (
    <div className="tab-pane-container">
      {/* Top Header & Save Button */}
      <div className="settings-page-header">
        <div>
          <h1 className="settings-main-title">Gateway Configuration &amp; Policies</h1>
          <p className="settings-main-subtitle">
            Manage firewall rules, router synchronization polling, MAC enforcement, and API credentials.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <button
            className="btn btn-primary"
            onClick={() => onShowToast('Settings preferences saved')}
          >
            Save Preferences
          </button>
        </div>
      </div>

      {/* SECTION 1: Master MAC Authentication Control */}
      <MacAuthBannerCard
        stats={stats}
        macAuthCountdown={macAuthCountdown}
        formatDateTime={formatDateTime}
        isUpdatingMacAuth={isUpdatingMacAuth}
        onToggleMacAuthClick={onToggleMacAuthClick}
      />

      {/* SECTION 2: Gateway Connection & Diagnostics */}
      <GatewayConfigCard
        isTestingGateway={isTestingGateway}
        onTestGateway={onTestGateway}
        gatewayLatency={gatewayLatency}
        gatewayIp={gatewayIp}
        setGatewayIp={setGatewayIp}
        pollingInterval={pollingInterval}
        setPollingInterval={setPollingInterval}
      />

      {/* SECTION 3: Firewall Security & Access Rules */}
      <FirewallRulesCard
        blockPolicy={blockPolicy}
        setBlockPolicy={setBlockPolicy}
        synFloodEnabled={synFloodEnabled}
        setSynFloodEnabled={setSynFloodEnabled}
        flowOffloadingEnabled={flowOffloadingEnabled}
        setFlowOffloadingEnabled={setFlowOffloadingEnabled}
        fullconeNatEnabled={fullconeNatEnabled}
        setFullconeNatEnabled={setFullconeNatEnabled}
      />

      {/* SECTION 4: API Endpoints & Secret Token */}
      <ApiIntegrationCard
        showSecretToken={showSecretToken}
        setShowSecretToken={setShowSecretToken}
        tokenCopied={tokenCopied}
        onCopyText={onCopyText}
      />

      {/* SECTION 5: Redis In-Memory Caching & Performance Engine */}
      <CacheDiagnosticsCard
        cacheInfo={cacheInfo}
        currentUser={currentUser}
        isPurgingCache={isPurgingCache}
        onPurgeCache={onPurgeCache}
      />

      {/* SECTION 6: Appearance & Theme Preferences */}
      <ThemeAppearanceCard
        theme={theme}
        onSwitchTheme={onSwitchTheme}
      />

      {/* SECTION 7: Backup & Maintenance */}
      <SystemBackupCard
        onOpenHistoryModal={onOpenHistoryModal}
        onExportConfig={onExportConfig}
      />
    </div>
  );
};
