'use client';

import React from 'react';
import { DashboardStats } from '@/lib/types';
import { IconClock, IconInfinity } from '../icons';

interface MacAuthBannerCardProps {
  stats: DashboardStats;
  macAuthCountdown: string;
  formatDateTime: (iso: string) => string;
  isUpdatingMacAuth: boolean;
  onToggleMacAuthClick: () => void;
}

export const MacAuthBannerCard: React.FC<MacAuthBannerCardProps> = ({
  stats,
  macAuthCountdown,
  formatDateTime,
  isUpdatingMacAuth,
  onToggleMacAuthClick,
}) => {
  return (
    <div className="mac-auth-banner-card">
      <div className="mac-auth-banner-left">
        <div className="mac-auth-banner-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
              Global MAC Address Authentication
            </h3>
            {stats.mac_auth && !stats.mac_auth.enabled ? (
              <span className="mac-auth-badge-status mac-auth-badge-off">
                ● Disabled (Open to All)
              </span>
            ) : (
              <span className="mac-auth-badge-status mac-auth-badge-on">
                ● Enabled (Enforced)
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.35rem 0 0 0', lineHeight: 1.4 }}>
            {stats.mac_auth && !stats.mac_auth.enabled ? (
              <>
                Forwarding set to <code>lan ➔ wan</code>. Internet access is allowed for <strong>all connected devices</strong> regardless of MAC address.
              </>
            ) : (
              <>
                Forwarding set to <code>lan ➔ unspecified</code>. Internet is strictly <strong>restricted to authorized MAC addresses</strong>.
              </>
            )}
          </p>
          {stats.mac_auth && !stats.mac_auth.enabled && stats.mac_auth.disabled_until && (
            <div className="mac-auth-timer-chip">
              <IconClock size={13} />
              <span>
                Re-enables automatically {macAuthCountdown ? `in ${macAuthCountdown} ` : ''}({formatDateTime(stats.mac_auth.disabled_until)})
              </span>
            </div>
          )}
          {stats.mac_auth && !stats.mac_auth.enabled && !stats.mac_auth.disabled_until && (
            <div className="mac-auth-timer-chip">
              <IconInfinity size={14} />
              <span>Disabled permanently by Administrator</span>
            </div>
          )}
        </div>
      </div>

      <div className="mac-auth-banner-right" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          type="button"
          className={`btn ${stats.mac_auth && !stats.mac_auth.enabled ? 'btn-primary' : 'btn-secondary'}`}
          disabled={isUpdatingMacAuth}
          onClick={onToggleMacAuthClick}
          style={{ fontSize: '0.82rem', padding: '0.55rem 1.1rem', fontWeight: 700 }}
        >
          {isUpdatingMacAuth ? 'Updating...' : stats.mac_auth && !stats.mac_auth.enabled ? 'Turn ON MAC Auth' : 'Turn OFF MAC Auth'}
        </button>
      </div>
    </div>
  );
};
