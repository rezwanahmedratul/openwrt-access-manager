'use client';

import React from 'react';

interface ThemeAppearanceCardProps {
  theme: 'light' | 'dark';
  onSwitchTheme: (theme: 'light' | 'dark') => void;
}

export const ThemeAppearanceCard: React.FC<ThemeAppearanceCardProps> = ({
  theme,
  onSwitchTheme,
}) => {
  return (
    <div className="settings-section-card">
      <div className="settings-section-header">
        <div className="settings-section-title-wrap">
          <h2 className="settings-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
            Appearance &amp; Theme
          </h2>
          <p className="settings-section-desc">
            Customize interface themes with instant application and zero flash.
          </p>
        </div>
      </div>

      <div className="theme-picker-cards">
        <button
          type="button"
          className={`theme-card-btn ${theme === 'light' ? 'active' : ''}`}
          onClick={() => onSwitchTheme('light')}
        >
          <div className="theme-card-preview-bar" style={{ background: '#fafafa', border: '1px solid #e5e7eb' }}>
            <div style={{ width: '30%', background: '#ffffff', borderRight: '1px solid #e5e7eb' }}></div>
            <div style={{ flex: 1, padding: '4px' }}>
              <div style={{ height: '6px', width: '60%', background: '#111111', borderRadius: '2px', marginBottom: '3px' }}></div>
              <div style={{ height: '4px', width: '40%', background: '#d1d5db', borderRadius: '2px' }}></div>
            </div>
          </div>
          <div>
            <div className="theme-card-title">Light Mode</div>
            <div className="theme-card-desc">Clean monochrome SaaS aesthetic</div>
          </div>
        </button>

        <button
          type="button"
          className={`theme-card-btn ${theme === 'dark' ? 'active' : ''}`}
          onClick={() => onSwitchTheme('dark')}
        >
          <div className="theme-card-preview-bar" style={{ background: '#050505', border: '1px solid #242424' }}>
            <div style={{ width: '30%', background: '#09090b', borderRight: '1px solid #242424' }}></div>
            <div style={{ flex: 1, padding: '4px' }}>
              <div style={{ height: '6px', width: '60%', background: '#ffffff', borderRadius: '2px', marginBottom: '3px' }}></div>
              <div style={{ height: '4px', width: '40%', background: '#333333', borderRadius: '2px' }}></div>
            </div>
          </div>
          <div>
            <div className="theme-card-title">Dark Mode</div>
            <div className="theme-card-desc">High-contrast midnight theme</div>
          </div>
        </button>
      </div>
    </div>
  );
};
