'use client';

import React from 'react';
import { SessionUser } from '@/lib/types';

interface CacheDiagnosticsCardProps {
  cacheInfo: { engine: string; connected: boolean; keysCount: number; pingMs: number } | null;
  currentUser: SessionUser | null;
  isPurgingCache: boolean;
  onPurgeCache: () => void;
}

export const CacheDiagnosticsCard: React.FC<CacheDiagnosticsCardProps> = ({
  cacheInfo,
  currentUser,
  isPurgingCache,
  onPurgeCache,
}) => {
  return (
    <div className="settings-section-card">
      <div className="settings-section-header">
        <div className="settings-section-title-wrap">
          <h2 className="settings-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            Redis Caching Engine &amp; Performance
          </h2>
          <p className="settings-section-desc">
            High-performance in-memory cache accelerating router cron polling and API queries to sub-millisecond speeds.
          </p>
        </div>
        {currentUser?.role === 'admin' && (
          <button
            type="button"
            className="btn btn-secondary"
            disabled={isPurgingCache}
            onClick={onPurgeCache}
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            <span>{isPurgingCache ? 'Purging...' : 'Purge Cache'}</span>
          </button>
        )}
      </div>

      <div className="settings-rows-list">
        <div className="settings-row-item">
          <div className="settings-row-info">
            <span className="settings-row-label">Cache Engine Status</span>
            <span className="settings-row-caption">State of the in-memory key-value caching daemon.</span>
          </div>
          <div className="settings-row-control">
            <div className="gateway-pill" style={{ margin: 0 }}>
              <span className="gateway-pill-dot" style={{ backgroundColor: cacheInfo?.connected ? '#22c55e' : '#eab308' }}></span>
              <span style={{ fontWeight: 600 }}>
                {cacheInfo?.engine === 'redis' ? 'Redis 7.0 (Active & Connected)' : 'In-Memory Cache (Active)'}
              </span>
            </div>
          </div>
        </div>

        <div className="settings-row-item">
          <div className="settings-row-info">
            <span className="settings-row-label">Memory Read Latency</span>
            <span className="settings-row-caption">Time required to retrieve cached configuration payloads.</span>
          </div>
          <div className="settings-row-control">
            <span style={{ fontSize: '0.85rem', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
              {cacheInfo?.pingMs !== undefined ? `${cacheInfo.pingMs} ms (Sub-millisecond)` : '< 1 ms'}
            </span>
          </div>
        </div>

        <div className="settings-row-item">
          <div className="settings-row-info">
            <span className="settings-row-label">Active Cached Objects</span>
            <span className="settings-row-caption">Cached keys for users, config versions, firewall, and ethers.</span>
          </div>
          <div className="settings-row-control">
            <span style={{ fontSize: '0.85rem', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
              {cacheInfo?.keysCount ?? 0} keys
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
