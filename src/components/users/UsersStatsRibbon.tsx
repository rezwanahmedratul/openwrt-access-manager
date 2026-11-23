'use client';

import React from 'react';
import { UserViewModel } from '@/lib/types';

interface UsersStatsRibbonProps {
  users: UserViewModel[];
}

export const UsersStatsRibbon: React.FC<UsersStatsRibbonProps> = ({ users }) => {
  return (
    <div className="stats-cards-row stats-grid-row" style={{ marginBottom: '1.25rem' }}>
      <div className="stat-card-box">
        <div className="stat-top-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.7 }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
            <span className="stat-title-label">TOTAL</span>
          </div>
        </div>
        <div className="stat-big-value">{users.length}</div>
      </div>

      <div className="stat-card-box">
        <div className="stat-top-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.7 }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span className="stat-title-label">APPLIED</span>
          </div>
        </div>
        <div className="stat-big-value">
          {users.filter((u) => u.status === 'applied').length}
        </div>
      </div>

      <div className="stat-card-box">
        <div className="stat-top-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.7 }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span className="stat-title-label">PENDING</span>
          </div>
        </div>
        <div className="stat-big-value">
          {users.filter((u) => u.status !== 'applied').length}
        </div>
      </div>

      <div className="stat-card-box">
        <div className="stat-top-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.7 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
            <span className="stat-title-label">NO INTERNET</span>
          </div>
        </div>
        <div className="stat-big-value">
          {users.filter((u) => u.groups?.some((g) => g.is_no_internet)).length}
        </div>
      </div>
    </div>
  );
};
