'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { SessionUser } from '@/lib/types';

interface UseHistoryDataProps {
  currentUser: SessionUser | null;
  activeTab: string;
  onShowToast?: (message: string, type?: 'success' | 'error') => void;
}

export function useHistoryData({
  currentUser,
  activeTab,
  onShowToast,
}: UseHistoryDataProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchHistory = useCallback(async () => {
    // Cancel any previous in-flight history request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setHistoryLoading(true);
    try {
      const res = await fetch('/api/config/history', {
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.history && Array.isArray(data.history)) {
        setHistoryList(data.history);
      }
    } catch (err: any) {
      // Ignore AbortError caused by component unmount or browser page refresh
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        return;
      }
      console.error('Failed to fetch history:', err);
    } finally {
      if (!controller.signal.aborted) {
        setHistoryLoading(false);
      }
    }
  }, []);

  // Fetch history when user is authenticated and History tab is active
  useEffect(() => {
    if (currentUser && activeTab === 'history') {
      fetchHistory();
    }
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [currentUser, activeTab, fetchHistory]);

  const liveHistoryItem = useMemo(() => {
    return historyList.find((h) => h.is_current) || historyList[0] || null;
  }, [historyList]);

  return {
    showHistory,
    setShowHistory,
    historyList,
    setHistoryList,
    historyLoading,
    liveHistoryItem,
    fetchHistory,
  };
}
