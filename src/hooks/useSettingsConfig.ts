'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserViewModel, Group, DashboardStats, SessionUser } from '@/lib/types';

interface UseSettingsConfigProps {
  stats: DashboardStats;
  users: UserViewModel[];
  groups: Group[];
  currentUser: SessionUser | null;
  activeTab: string;
  onRefresh: () => void;
  onShowToast: (message: string, type?: 'success' | 'error') => void;
}

export function useSettingsConfig({
  stats,
  users,
  groups,
  currentUser,
  activeTab,
  onRefresh,
  onShowToast,
}: UseSettingsConfigProps) {
  const [gatewayIp, setGatewayIp] = useState('192.168.1.1');
  const [pollingInterval, setPollingInterval] = useState('10');
  const [blockPolicy, setBlockPolicy] = useState<'REJECT' | 'DROP'>('REJECT');
  const [showSecretToken, setShowSecretToken] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [synFloodEnabled, setSynFloodEnabled] = useState(true);
  const [flowOffloadingEnabled, setFlowOffloadingEnabled] = useState(true);
  const [flowOffloadingHwEnabled, setFlowOffloadingHwEnabled] = useState(true);
  const [fullconeNatEnabled, setFullconeNatEnabled] = useState(true);
  const [isTestingGateway, setIsTestingGateway] = useState(false);
  const [gatewayLatency, setGatewayLatency] = useState<number | null>(null);

  // Redis / In-memory Cache Diagnostics state
  const [cacheInfo, setCacheInfo] = useState<{ engine: string; connected: boolean; keysCount: number; pingMs: number } | null>(null);
  const [isPurgingCache, setIsPurgingCache] = useState(false);

  const fetchCacheStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/system/status');
      const data = await res.json();
      if (data.cache) setCacheInfo(data.cache);
    } catch {
      // ignore
    }
  }, []);

  // Fetch cache status when Settings tab is active
  useEffect(() => {
    if (currentUser && activeTab === 'settings') {
      fetchCacheStatus();
    }
  }, [currentUser, activeTab, fetchCacheStatus]);

  const handlePurgeCache = async () => {
    try {
      setIsPurgingCache(true);
      const res = await fetch('/api/system/status', { method: 'POST' });
      const data = await res.json();
      if (data.cache) setCacheInfo(data.cache);
      onShowToast('Redis in-memory cache successfully purged!');
      onRefresh();
    } catch {
      onShowToast('Failed to purge cache', 'error');
    } finally {
      setIsPurgingCache(false);
    }
  };

  const handleTestGateway = async () => {
    setIsTestingGateway(true);
    setGatewayLatency(null);
    const start = performance.now();
    try {
      const res = await fetch('/api/config/version', {
        headers: { Authorization: 'Bearer openwrt-secret-token-change-in-production' },
      });
      const end = performance.now();
      if (res.ok) {
        const ms = Math.round(end - start);
        setGatewayLatency(ms);
        onShowToast(`Gateway healthy (Response: ${ms}ms)`);
      } else {
        onShowToast('Gateway test returned an error', 'error');
      }
    } catch {
      onShowToast('Gateway connection failed', 'error');
    } finally {
      setIsTestingGateway(false);
    }
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCopyText = (text: string, type: 'token' | 'endpoint') => {
    navigator.clipboard.writeText(text);
    if (type === 'token') {
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2500);
    }
    onShowToast('Copied to clipboard');
  };

  const handleExportConfig = () => {
    const backup = {
      exported_at: new Date().toISOString(),
      version: stats.current_version,
      gateway: {
        ip: gatewayIp,
        polling_interval_seconds: pollingInterval,
        block_policy: blockPolicy,
      },
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        mac_address: u.mac_address,
        groups: u.groups.map((g) => g.name),
      })),
      groups: groups.map((g) => ({
        id: g.id,
        name: g.name,
        is_protected: Boolean(g.is_protected),
        is_no_internet: Boolean(g.is_no_internet),
      })),
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `openwrt-config-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast('System configuration backup downloaded');
  };

  return {
    gatewayIp,
    setGatewayIp,
    pollingInterval,
    setPollingInterval,
    blockPolicy,
    setBlockPolicy,
    showSecretToken,
    setShowSecretToken,
    tokenCopied,
    synFloodEnabled,
    setSynFloodEnabled,
    flowOffloadingEnabled,
    setFlowOffloadingEnabled,
    flowOffloadingHwEnabled,
    setFlowOffloadingHwEnabled,
    fullconeNatEnabled,
    setFullconeNatEnabled,
    isTestingGateway,
    gatewayLatency,
    cacheInfo,
    isPurgingCache,
    fetchCacheStatus,
    handlePurgeCache,
    handleTestGateway,
    formatDateTime,
    handleCopyText,
    handleExportConfig,
  };
}
