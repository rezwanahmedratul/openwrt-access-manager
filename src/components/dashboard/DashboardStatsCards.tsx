'use client';

import React from 'react';
import { DashboardStats, ActiveTab } from '@/lib/types';

interface DashboardStatsCardsProps {
  stats: DashboardStats;
  onTabChange: (tab: ActiveTab) => void;
}

export const DashboardStatsCards: React.FC<DashboardStatsCardsProps> = ({
  stats,
  onTabChange,
}) => {
  return (
    <div className="stats-cards-row">
      {/* Card 1: Published Users */}
      <div className="stat-card-box">
        <div className="stat-top-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.7 }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
            <span className="stat-title-label">PUBLISHED USERS</span>
          </div>
          <span className="stat-index-badge">01</span>
        </div>
        <div className="stat-big-value">{stats.total_users}</div>
        <div className="stat-footer-text">Active client rules</div>
      </div>

      {/* Card 2: Groups */}
      <div
        className="stat-card-box"
        style={{ cursor: 'pointer' }}
        onClick={() => onTabChange('groups')}
      >
        <div className="stat-top-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.7 }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span className="stat-title-label">GROUPS</span>
          </div>
          <span className="stat-index-badge">02</span>
        </div>
        <div className="stat-big-value">{stats.total_groups}</div>
        <div className="stat-footer-text">Click to add/delete groups</div>
      </div>

      {/* Card 3: Pending Draft */}
      <div className="stat-card-box">
        <div className="stat-top-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.7 }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <span className="stat-title-label">PENDING DRAFT</span>
          </div>
          <span className="stat-index-badge">03</span>
        </div>
        <div className="stat-big-value">{stats.pending_changes}</div>
        <div className="stat-footer-text">
          {stats.pending_changes > 0 ? 'Draft unapplied modifications' : 'Synchronized with router'}
        </div>
      </div>

      {/* Card 4: Config Version */}
      <div className="stat-card-box">
        <div className="stat-top-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.7 }}>
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            <span className="stat-title-label">CONFIG VERSION</span>
          </div>
          <span className="stat-index-badge">04</span>
        </div>
        <div className="stat-big-value">v{stats.current_version ?? 1}</div>
        <div className="stat-footer-text">
          {stats.last_applied
            ? `Live since ${new Date(stats.last_applied).toLocaleDateString('en-US')}`
            : 'Live since 9/27/2026'}
        </div>
      </div>
    </div>
  );
};
