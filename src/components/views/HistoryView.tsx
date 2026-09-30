'use client';

import React, { useState, useMemo } from 'react';
import { DashboardStats, ActiveTab } from '@/lib/types';
import { HistoryTelemetryGrid } from '../history/HistoryTelemetryGrid';
import { HistoryLedgerList } from '../history/HistoryLedgerList';
import { HistoryInspectorCard } from '../history/HistoryInspectorCard';

interface HistoryViewProps {
  historyList: any[];
  historyLoading?: boolean;
  liveHistoryItem: any;
  stats: DashboardStats;
  onFetchHistory?: () => void;
  onTabChange: (tab: ActiveTab) => void;
  onShowToast: (msg: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  historyList,
  liveHistoryItem,
  stats,
  onTabChange,
  onShowToast,
}) => {
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>(() => {
    return liveHistoryItem || (historyList.length > 0 ? historyList[0] : null);
  });
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilterType, setHistoryFilterType] = useState<'all' | 'live' | 'archived'>('all');
  const [historyViewerTab, setHistoryViewerTab] = useState<'firewall' | 'ethers' | 'diff' | 'metadata'>('firewall');
  const [copiedHashId, setCopiedHashId] = useState<string | null>(null);
  const [copiedContentTab, setCopiedContentTab] = useState<string | null>(null);
  const [mobileActiveTab, setMobileActiveTab] = useState<'list' | 'inspector'>('list');

  // Sync selected item if history changes and no selection exists
  React.useEffect(() => {
    if (!selectedHistoryItem && historyList.length > 0) {
      setSelectedHistoryItem(liveHistoryItem || historyList[0]);
    }
  }, [historyList, liveHistoryItem, selectedHistoryItem]);

  const filteredHistory = useMemo(() => {
    let result = historyList;
    if (historyFilterType === 'live') {
      result = result.filter((h) => h.is_current);
    } else if (historyFilterType === 'archived') {
      result = result.filter((h) => !h.is_current);
    }
    if (historySearch.trim()) {
      const q = historySearch.trim().toLowerCase();
      result = result.filter((h) => {
        const vMatch = `v${h.version}`.includes(q) || String(h.version).includes(q);
        const hashMatch = h.hash && h.hash.toLowerCase().includes(q);
        return vMatch || hashMatch;
      });
    }
    return result;
  }, [historyList, historyFilterType, historySearch]);

  const copyToClipboard = (text: string, id: string, isContentTab = false) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (isContentTab) {
      setCopiedContentTab(id);
      setTimeout(() => setCopiedContentTab(null), 2000);
    } else {
      setCopiedHashId(id);
      setTimeout(() => setCopiedHashId(null), 2000);
    }
    onShowToast('Copied to clipboard');
  };

  const downloadHistoryFile = (content: string, filename: string) => {
    if (!content) {
      onShowToast('No content available to download');
      return;
    }
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onShowToast(`Downloading ${filename}`);
  };

  return (
    <div className="history-page-wrapper page-content-animated" key="history">
      {/* Small Top Pill */}
      <div>
        <div className="gateway-pill">
          <span className="gateway-pill-dot"></span>
          <span>Audit Trail &amp; Releases</span>
        </div>
      </div>

      {/* Header Row */}
      <div className="header-row">
        <div className="title-col">
          <h1 className="page-headline">Configuration History</h1>
          <p className="page-description">
            Immutable chronological audit log of published gateway releases, SHA-256 integrity checksums, and configuration snapshots.
          </p>
        </div>
        <div className="actions-col history-header-actions">
          <a
            href="/api/config/firewall?download=true"
            download="firewall"
            className="btn btn-secondary btn-sm"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <span>Live firewall</span>
          </a>
          <a
            href="/api/config/ethers?download=true"
            download="ethers"
            className="btn btn-secondary btn-sm"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <span>Live ethers</span>
          </a>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onTabChange('dashboard')}>
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {/* 4 Telemetry / Metric Summary Cards */}
      <HistoryTelemetryGrid
        historyCount={historyList.length}
        liveHistoryItem={liveHistoryItem}
        stats={stats}
      />

      {/* Search & Filter Toolbar */}
      <div className="history-filter-card">
        <div className="history-filter-controls">
          <div className="history-search-input-wrap">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="history-search-icon">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="history-search-input"
              placeholder="Search by version (v4) or checksum hash..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
            />
            {historySearch && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setHistorySearch('')}
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

          <div className="history-chip-group">
            <button
              type="button"
              className={`history-filter-chip ${historyFilterType === 'all' ? 'is-active' : ''}`}
              onClick={() => setHistoryFilterType('all')}
            >
              All Versions ({historyList.length})
            </button>
            <button
              type="button"
              className={`history-filter-chip ${historyFilterType === 'live' ? 'is-active' : ''}`}
              onClick={() => setHistoryFilterType('live')}
            >
              Active Live
            </button>
            <button
              type="button"
              className={`history-filter-chip ${historyFilterType === 'archived' ? 'is-active' : ''}`}
              onClick={() => setHistoryFilterType('archived')}
            >
              Archived
            </button>
          </div>
        </div>

        <div className="history-results-count">
          Showing <strong>{filteredHistory.length}</strong> of {historyList.length} releases
        </div>
      </div>

      {/* Mobile Master-Detail Segmented Tabs (Visible on mobile/tablet) */}
      <div className="history-mobile-tabs-bar">
        <button
          type="button"
          className={`history-mobile-tab-pill ${mobileActiveTab === 'list' ? 'is-active' : ''}`}
          onClick={() => setMobileActiveTab('list')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          <span>Releases List ({filteredHistory.length})</span>
        </button>

        <button
          type="button"
          className={`history-mobile-tab-pill ${mobileActiveTab === 'inspector' ? 'is-active' : ''}`}
          onClick={() => setMobileActiveTab('inspector')}
          disabled={!selectedHistoryItem}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span>Inspector {selectedHistoryItem ? `(v${selectedHistoryItem.version})` : ''}</span>
        </button>
      </div>

      {/* Master-Detail Split: Left Ledger Table & Right Inspector */}
      <div className={`history-split-layout mobile-show-${mobileActiveTab}`}>
        <div className="history-ledger-column">
          <HistoryLedgerList
            filteredHistory={filteredHistory}
            selectedHistoryItem={selectedHistoryItem}
            onSelectHistoryItem={(item) => {
              setSelectedHistoryItem(item);
              setMobileActiveTab('inspector');
            }}
          />
        </div>

        <div className="history-inspector-column">
          <HistoryInspectorCard
            selectedHistoryItem={selectedHistoryItem}
            liveHistoryItem={liveHistoryItem}
            stats={stats}
            historyViewerTab={historyViewerTab}
            setHistoryViewerTab={setHistoryViewerTab}
            copiedHashId={copiedHashId}
            copiedContentTab={copiedContentTab}
            onCopyToClipboard={copyToClipboard}
            onDownloadFile={downloadHistoryFile}
            onBackToList={() => setMobileActiveTab('list')}
          />
        </div>
      </div>
    </div>
  );
};
