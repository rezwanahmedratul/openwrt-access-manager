'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { SessionUser } from '@/lib/types';

interface UseHistoryDataProps {
  currentUser: SessionUser | null;
  activeTab: string;
  onShowToast: (message: string, type?: 'success' | 'error') => void;
}

export function useHistoryData({
  currentUser,
  activeTab,
  onShowToast,
}: UseHistoryDataProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/config/history');
      const data = await res.json();
      if (data.history && Array.isArray(data.history)) {
        setHistoryList(data.history);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
      onShowToast('Failed to load configuration history', 'error');
    } finally {
      setHistoryLoading(false);
    }
  }, [onShowToast]);

  // Fetch history when History tab is active
  useEffect(() => {
    if (currentUser && activeTab === 'history') {
      fetchHistory();
    }
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
