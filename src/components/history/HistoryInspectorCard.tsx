'use client';

import React from 'react';
import { DashboardStats } from '@/lib/types';
import { ConfigDiffViewer } from './ConfigDiffViewer';

interface HistoryInspectorCardProps {
  selectedHistoryItem: any;
  liveHistoryItem: any;
  stats: DashboardStats;
  historyViewerTab: 'firewall' | 'ethers' | 'diff' | 'metadata';
  setHistoryViewerTab: (tab: 'firewall' | 'ethers' | 'diff' | 'metadata') => void;
  copiedHashId: string | null;
  copiedContentTab: string | null;
  onCopyToClipboard: (text: string, id: string, isContentTab?: boolean) => void;
  onDownloadFile: (content: string, filename: string) => void;
}

export const HistoryInspectorCard: React.FC<HistoryInspectorCardProps> = ({
  selectedHistoryItem,
  liveHistoryItem,
  stats,
  historyViewerTab,
  setHistoryViewerTab,
  copiedHashId,
  copiedContentTab,
  onCopyToClipboard,
  onDownloadFile,
}) => {
  return (
    <div className="history-inspector-card">
      {selectedHistoryItem ? (
        <>
          {/* Inspector Header */}
          <div className="history-inspector-header">
            <div className="history-inspector-header-top">
              <div className="history-inspector-title">
                <span>Release v{selectedHistoryItem.version}</span>
                {selectedHistoryItem.is_current ? (
                  <span className="history-live-pill">Live Active</span>
                ) : (
                  <span className="history-archived-pill">Archived Version</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => onCopyToClipboard(selectedHistoryItem.hash, 'hash')}
                  title="Copy full SHA-256 hash"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  <span>{copiedHashId === 'hash' ? 'Copied Hash!' : 'Copy Hash'}</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => onDownloadFile(selectedHistoryItem.firewall_content, `firewall-v${selectedHistoryItem.version}`)}
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                  title="Download firewall configuration file"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>firewall</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => onDownloadFile(selectedHistoryItem.ethers_content, `ethers-v${selectedHistoryItem.version}`)}
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                  title="Download ethers static IP file"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>ethers</span>
                </button>
              </div>
            </div>

            {/* Inspector Meta Subline */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.76rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
              <div>
                <strong>Published:</strong> {new Date(selectedHistoryItem.created_at).toLocaleString()}
              </div>
              <div>
                <strong>Devices:</strong> {selectedHistoryItem.user_count} rules compiled
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <strong>SHA-256:</strong>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-primary)' }}>
                  {selectedHistoryItem.hash}
                </span>
              </div>
            </div>
          </div>

          {/* Inspector Sub-Tabs */}
          <div className="history-inspector-tabs">
            <button
              type="button"
              className={`history-tab-btn ${historyViewerTab === 'firewall' ? 'is-active' : ''}`}
              onClick={() => setHistoryViewerTab('firewall')}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span>Firewall Rules (/etc/config/firewall)</span>
            </button>
            <button
              type="button"
              className={`history-tab-btn ${historyViewerTab === 'ethers' ? 'is-active' : ''}`}
              onClick={() => setHistoryViewerTab('ethers')}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              <span>Ethers Map (/etc/ethers)</span>
            </button>
            <button
              type="button"
              className={`history-tab-btn ${historyViewerTab === 'diff' ? 'is-active' : ''}`}
              onClick={() => setHistoryViewerTab('diff')}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="18" cy="18" r="3" />
                <circle cx="6" cy="6" r="3" />
                <path d="M13 6h3a2 2 0 0 1 2 2v7" />
                <line x1="6" y1="9" x2="6" y2="21" />
              </svg>
              <span>Compare vs Live</span>
            </button>
            <button
              type="button"
              className={`history-tab-btn ${historyViewerTab === 'metadata' ? 'is-active' : ''}`}
              onClick={() => setHistoryViewerTab('metadata')}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span>Audit Properties</span>
            </button>
          </div>

          {/* Inspector Content Panes */}
          {historyViewerTab === 'firewall' && (
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 2 }}>
                <button
                  type="button"
                  className="history-copy-btn"
                  onClick={() => onCopyToClipboard(selectedHistoryItem.firewall_content || '', 'firewall-content', true)}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  <span>{copiedContentTab === 'firewall-content' ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
              <div className="history-code-container">
                <pre className="history-code-pre">
                  {selectedHistoryItem.firewall_content || '# No firewall rules stored for this release'}
                </pre>
              </div>
            </div>
          )}

          {historyViewerTab === 'ethers' && (
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 2 }}>
                <button
                  type="button"
                  className="history-copy-btn"
                  onClick={() => onCopyToClipboard(selectedHistoryItem.ethers_content || '', 'ethers-content', true)}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  <span>{copiedContentTab === 'ethers-content' ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
              <div className="history-code-container">
                <pre className="history-code-pre">
                  {selectedHistoryItem.ethers_content || '# No static ethers entries in this release'}
                </pre>
              </div>
            </div>
          )}

          {historyViewerTab === 'diff' && (
            <div style={{ padding: '1rem' }}>
              {selectedHistoryItem.is_current ? (
                <div className="horizontal-add-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                    This is the currently active Live Release (v{selectedHistoryItem.version})
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    To inspect diffs, select an archived historical release from the list on the left to see what changed compared to this live release.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Summary Banner */}
                  <div className="history-metadata-item" style={{ background: 'var(--bg-app)' }}>
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Comparing:</span>{' '}
                      <span>v{selectedHistoryItem.version} (Archive)</span> →{' '}
                      <span style={{ fontWeight: 600, color: 'var(--status-applied-text)' }}>v{liveHistoryItem?.version || stats.current_version || 1} (Live)</span>
                    </div>
                    <div style={{ fontSize: '0.78rem' }}>
                      <strong>Device Delta:</strong>{' '}
                      {(liveHistoryItem ? liveHistoryItem.user_count : stats.total_users || 0) - selectedHistoryItem.user_count >= 0
                        ? `+${(liveHistoryItem ? liveHistoryItem.user_count : stats.total_users || 0) - selectedHistoryItem.user_count} devices`
                        : `${(liveHistoryItem ? liveHistoryItem.user_count : stats.total_users || 0) - selectedHistoryItem.user_count} devices`}
                    </div>
                  </div>

                  {/* Diff Code View */}
                  <div className="history-code-container" style={{ margin: 0, maxHeight: '420px' }}>
                    <ConfigDiffViewer
                      oldText={selectedHistoryItem.firewall_content || ''}
                      newText={liveHistoryItem?.firewall_content || ''}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {historyViewerTab === 'metadata' && (
            <div className="history-metadata-box">
              <div className="history-metadata-item">
                <span style={{ color: 'var(--text-secondary)' }}>Release Identifier</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{selectedHistoryItem.id}</span>
              </div>
              <div className="history-metadata-item">
                <span style={{ color: 'var(--text-secondary)' }}>Version Number</span>
                <span style={{ fontWeight: 700 }}>v{selectedHistoryItem.version}</span>
              </div>
              <div className="history-metadata-item">
                <span style={{ color: 'var(--text-secondary)' }}>Deployment Status</span>
                {selectedHistoryItem.is_current ? (
                  <span className="history-live-pill">Active on Gateway</span>
                ) : (
                  <span className="history-archived-pill">Archived / Superseded</span>
                )}
              </div>
              <div className="history-metadata-item">
                <span style={{ color: 'var(--text-secondary)' }}>Timestamp Generated</span>
                <span>{new Date(selectedHistoryItem.created_at).toISOString()}</span>
              </div>
              <div className="history-metadata-item">
                <span style={{ color: 'var(--text-secondary)' }}>Full Checksum (SHA-256)</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', wordBreak: 'break-all' }}>
                  {selectedHistoryItem.hash}
                </span>
              </div>
              {selectedHistoryItem.metadata && (
                <div className="history-metadata-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Extended Metadata JSON</span>
                  <pre style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: '0.75rem', background: 'var(--bg-app)', padding: '0.5rem', borderRadius: '4px', width: '100%', overflowX: 'auto' }}>
                    {JSON.stringify(selectedHistoryItem.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.5, marginBottom: '0.75rem' }}>
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
          <div style={{ fontWeight: 600 }}>Select a release to inspect</div>
          <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>View firewall rules, MAC assignments, and checksums</div>
        </div>
      )}
    </div>
  );
};
