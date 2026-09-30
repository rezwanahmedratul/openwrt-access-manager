import React from 'react';
import { ActiveTab } from '@/lib/types';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        {/* Logo & Header */}
        <div className="brand-header">
          <div className="brand-icon-box">W</div>
          <div className="brand-text-col">
            <span className="brand-title">OpenWrt Manager</span>
            <span className="brand-subtitle">GATEWAY ACCESS</span>
          </div>
        </div>

        {/* Navigation Menu */}
        <ul className="nav-menu">
          <li>
            <button
              className={`nav-item-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => onTabChange('dashboard')}
            >
              <span className="nav-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
                </svg>
              </span>
              <span className="nav-label-text">Dashboard</span>
            </button>
          </li>
          <li>
            <button
              className={`nav-item-btn ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => onTabChange('users')}
            >
              <span className="nav-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </span>
              <span className="nav-label-text">All Users</span>
            </button>
          </li>
          <li>
            <button
              className={`nav-item-btn ${activeTab === 'groups' ? 'active' : ''}`}
              onClick={() => onTabChange('groups')}
            >
              <span className="nav-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </span>
              <span className="nav-label-text">Groups</span>
            </button>
          </li>
          <li>
            <button
              className={`nav-item-btn ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => onTabChange('history')}
            >
              <span className="nav-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </span>
              <span className="nav-label-text">History</span>
            </button>
          </li>
          <li>
            <button
              className={`nav-item-btn ${activeTab === 'account' ? 'active' : ''}`}
              onClick={() => onTabChange('account')}
            >
              <span className="nav-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <span className="nav-label-text">Account</span>
            </button>
          </li>
          <li>
            <button
              className={`nav-item-btn ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => onTabChange('settings')}
            >
              <span className="nav-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </span>
              <span className="nav-label-text">Settings</span>
            </button>
          </li>
        </ul>
      </div>

      {/* Sidebar Footer Status */}
      <div className="sidebar-bottom">
        <div className="system-status-row">
          <span className="status-indicator-dot"></span>
          <span>System Online</span>
        </div>
        <span className="system-version-sub">OpenWrt v23.05.5</span>
      </div>
    </aside>
  );
};
