'use client';

import { useState, useEffect } from 'react';
import { DashboardStats, SessionUser } from '@/lib/types';

interface UseMacAuthProps {
  stats: DashboardStats;
  currentUser: SessionUser | null;
  onRefresh: () => void;
  onShowToast: (message: string, type?: 'success' | 'error') => void;
}

export function useMacAuth({ stats, currentUser, onRefresh, onShowToast }: UseMacAuthProps) {
  const [showMacAuthModal, setShowMacAuthModal] = useState(false);
  const [macAuthDisableMode, setMacAuthDisableMode] = useState<'infinite' | '1hour' | '1day' | '7days' | '30days' | 'custom'>('1hour');
  const [customMacAuthDate, setCustomMacAuthDate] = useState('');
  const [isUpdatingMacAuth, setIsUpdatingMacAuth] = useState(false);
  const [macAuthModalError, setMacAuthModalError] = useState<string | null>(null);
  const [macAuthCountdown, setMacAuthCountdown] = useState<string>('');

  // Countdown timer effect for disabled_until
  useEffect(() => {
    if (!stats.mac_auth || stats.mac_auth.enabled || !stats.mac_auth.disabled_until) {
      setMacAuthCountdown('');
      return;
    }

    const targetTime = new Date(stats.mac_auth.disabled_until).getTime();

    const updateCountdown = () => {
      const remainingMs = targetTime - Date.now();
      if (remainingMs <= 0) {
        setMacAuthCountdown('Expired — re-enabling...');
        onRefresh();
        return false;
      }

      const totalSeconds = Math.floor(remainingMs / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      if (days > 0) {
        setMacAuthCountdown(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setMacAuthCountdown(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setMacAuthCountdown(`${minutes}m ${seconds}s`);
      } else {
        setMacAuthCountdown(`${seconds}s`);
      }
      return true;
    };

    updateCountdown();
    const interval = setInterval(() => {
      const active = updateCountdown();
      if (!active) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [stats.mac_auth?.enabled, stats.mac_auth?.disabled_until, onRefresh]);

  const handleToggleMacAuthClick = () => {
    const isCurrentlyOn = stats.mac_auth ? stats.mac_auth.enabled : true;
    if (isCurrentlyOn) {
      setMacAuthModalError(null);
      if (currentUser?.role === 'admin') {
        setMacAuthDisableMode('infinite');
      } else {
        setMacAuthDisableMode('1hour');
      }
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const isoLocal = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setCustomMacAuthDate(isoLocal);
      setShowMacAuthModal(true);
    } else {
      handleEnableMacAuth();
    }
  };

  const handleEnableMacAuth = async () => {
    setIsUpdatingMacAuth(true);
    try {
      const res = await fetch('/api/config/mac-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        onShowToast(data.error || 'Failed to enable MAC Authentication', 'error');
        return;
      }
      onShowToast(data.message || 'MAC Authentication enabled (Access restricted to registered MACs)');
      onRefresh();
    } catch (err: any) {
      onShowToast(err.message || 'Failed to update MAC Authentication', 'error');
    } finally {
      setIsUpdatingMacAuth(false);
    }
  };

  const handleConfirmDisableMacAuth = async () => {
    setMacAuthModalError(null);
    let targetExpiry: string | null = null;

    if (macAuthDisableMode === 'infinite') {
      if (currentUser?.role !== 'admin') {
        setMacAuthModalError('Only administrators can permanently disable MAC authentication.');
        return;
      }
      targetExpiry = null;
    } else if (macAuthDisableMode === '1hour') {
      targetExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    } else if (macAuthDisableMode === '1day') {
      targetExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    } else if (macAuthDisableMode === '7days') {
      targetExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (macAuthDisableMode === '30days') {
      targetExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    } else if (macAuthDisableMode === 'custom') {
      if (!customMacAuthDate) {
        setMacAuthModalError('Please pick an expiration date/time from the calendar.');
        return;
      }
      const parsed = new Date(customMacAuthDate);
      if (isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
        setMacAuthModalError('Expiration date must be in the future.');
        return;
      }
      if (currentUser?.role === 'subadmin') {
        const maxLimit = Date.now() + 30 * 24 * 60 * 60 * 1000;
        if (parsed.getTime() > maxLimit + 60000) {
          setMacAuthModalError('Subadmins can disable MAC authentication for at most 30 days.');
          return;
        }
      }
      targetExpiry = parsed.toISOString();
    }

    setIsUpdatingMacAuth(true);
    try {
      const res = await fetch('/api/config/mac-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: false,
          disabled_until: targetExpiry,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMacAuthModalError(data.error || 'Failed to update MAC Authentication');
        return;
      }
      onShowToast(data.message || 'MAC Authentication disabled');
      setShowMacAuthModal(false);
      onRefresh();
    } catch (err: any) {
      setMacAuthModalError(err.message || 'Network error occurred');
    } finally {
      setIsUpdatingMacAuth(false);
    }
  };

  return {
    showMacAuthModal,
    setShowMacAuthModal,
    macAuthDisableMode,
    setMacAuthDisableMode,
    customMacAuthDate,
    setCustomMacAuthDate,
    isUpdatingMacAuth,
    macAuthModalError,
    macAuthCountdown,
    handleToggleMacAuthClick,
    handleEnableMacAuth,
    handleConfirmDisableMacAuth,
  };
}
