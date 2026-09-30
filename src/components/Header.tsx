import React, { useState, useRef, useEffect } from 'react';
import { SessionUser, ActiveTab } from '@/lib/types';

interface HeaderProps {
  currentUser: SessionUser | null;
  theme: string;
  onSwitchTheme: (theme: 'light' | 'dark') => void;
  onOpenHistoryModal: () => void;
  onTabChange: (tab: ActiveTab) => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  theme,
  onSwitchTheme,
  onOpenHistoryModal,
  onTabChange,
  onLogout,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="top-header">
      {/* Mobile Brand Title (shown on mobile devices where sidebar is at bottom) */}
      <div className="mobile-header-brand">
        <div
          className="brand-icon-box"
          style={{ width: '28px', height: '28px', fontSize: '0.88rem', borderRadius: 'var(--radius-sm)' }}
        >
          W
        </div>
        <div className="brand-text-col">
          <span className="brand-title" style={{ fontSize: '0.88rem', lineHeight: 1.1 }}>OpenWrt</span>
          <span className="brand-subtitle" style={{ fontSize: '0.55rem' }}>GATEWAY</span>
        </div>
      </div>

      <div className="top-header-actions">
        {/* Direct Configuration Downloads & History (Desktop Only) */}
        <button
          className="btn btn-ghost btn-sm desktop-only-action"
          onClick={onOpenHistoryModal}
          style={{ fontSize: '0.8rem' }}
        >
          History
        </button>
        <a
          href="/api/config/firewall?download=true"
          className="btn btn-ghost btn-sm desktop-only-action"
          download="firewall"
          style={{ fontSize: '0.8rem' }}
        >
          firewall
        </a>
        <a
          href="/api/config/ethers?download=true"
          className="btn btn-ghost btn-sm desktop-only-action"
          download="ethers"
          style={{ fontSize: '0.8rem' }}
        >
          ethers
        </a>

        {/* Theme Toggle Capsule */}
        <div className="theme-toggle-capsule">
          <button
            type="button"
            className={`theme-btn-option ${theme === 'light' ? 'active' : ''}`}
            onClick={() => onSwitchTheme('light')}
            title="Light Mode"
            aria-label="Light Mode"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          </button>
          <button
            type="button"
            className={`theme-btn-option ${theme === 'dark' ? 'active' : ''}`}
            onClick={() => onSwitchTheme('dark')}
            title="Dark Mode"
            aria-label="Dark Mode"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </button>
        </div>

        {/* Compact Account Avatar & Dropdown Popover */}
        <div className="user-menu-wrapper" ref={userDropdownRef}>
          <button
            type="button"
            className={`user-avatar-btn ${showUserDropdown ? 'active' : ''}`}
            onClick={() => setShowUserDropdown((prev) => !prev)}
            title={currentUser ? `Account: ${currentUser.username} (${currentUser.role})` : 'Account'}
            aria-label="User Account Menu"
            aria-expanded={showUserDropdown}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>

          {showUserDropdown && currentUser && (
            <div className="user-dropdown-popover">
              {/* User Profile Header */}
              <div className="user-dropdown-header">
                <div className="user-dropdown-avatar">
                  {currentUser.username.charAt(0).toUpperCase()}
                </div>
                <div className="user-dropdown-details">
                  <div className="user-dropdown-name">{currentUser.username}</div>
                  <div className="user-dropdown-role-row">
                    <span className={`badge-role badge-role-${currentUser.role}`}>
                      {currentUser.role}
                    </span>
                  </div>
                </div>
              </div>

              <div className="user-dropdown-divider" />

              {/* Dropdown Options */}
              <div className="user-dropdown-items">
                <button
                  type="button"
                  className="user-dropdown-item"
                  onClick={() => {
                    setShowUserDropdown(false);
                    onTabChange('account');
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>Account Management</span>
                </button>

                <button
                  type="button"
                  className="user-dropdown-item"
                  onClick={() => {
                    setShowUserDropdown(false);
                    onTabChange('settings');
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                  <span>Gateway Settings</span>
                </button>

                <a
                  href="/api/config/firewall?download=true"
                  download="firewall"
                  className="user-dropdown-item"
                  onClick={() => setShowUserDropdown(false)}
                  style={{ textDecoration: 'none' }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Download Firewall Config</span>
                </a>

                <a
                  href="/api/config/ethers?download=true"
                  download="ethers"
                  className="user-dropdown-item"
                  onClick={() => setShowUserDropdown(false)}
                  style={{ textDecoration: 'none' }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Download Ethers Config</span>
                </a>

                <div className="user-dropdown-divider" />

                <button
                  type="button"
                  className="user-dropdown-item item-danger"
                  onClick={() => {
                    setShowUserDropdown(false);
                    onLogout();
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
