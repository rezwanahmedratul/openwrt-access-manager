'use client';

import React from 'react';
import { DashboardStats } from '@/lib/types';
import { IconLock, IconUnlock, IconClock, IconInfinity } from '../icons';

interface DashboardMacAuthCardProps {
  stats: DashboardStats;
  macAuthCountdown: string;
  formatDateTime: (iso: string) => string;
  isUpdatingMacAuth: boolean;
  onToggleMacAuthClick: () => void;
}

export const DashboardMacAuthCard: React.FC<DashboardMacAuthCardProps> = ({
  stats,
  macAuthCountdown,
  formatDateTime,
  isUpdatingMacAuth,
  onToggleMacAuthClick,
}) => {
  const isMacAuthDisabled = Boolean(stats.mac_auth && !stats.mac_auth.enabled);
  const disabledUntil = stats.mac_auth?.disabled_until;

  return (
    <div className={`dashboard-mac-auth-banner ${isMacAuthDisabled ? 'is-disabled' : 'is-enabled'}`}>
      <div className="mac-auth-banner-main">
        {/* State Icon with Pulse Indicator */}
        <div className={`mac-auth-icon-wrapper ${isMacAuthDisabled ? 'icon-disabled' : 'icon-enabled'}`}>
          {isMacAuthDisabled ? (
            <IconUnlock size={20} />
          ) : (
            <IconLock size={19} />
          )}
          <span className={`mac-auth-status-dot ${isMacAuthDisabled ? 'dot-disabled' : 'dot-enabled'}`} />
        </div>

        {/* Text & Metadata */}
        <div className="mac-auth-text-content">
          <div className="mac-auth-header-line">
            <h3 className="mac-auth-title">
              {isMacAuthDisabled ? 'MAC Authentication Bypassed' : 'MAC Authentication Active'}
            </h3>
            {isMacAuthDisabled ? (
              <span className="mac-auth-status-badge badge-bypassed">
                ● Open to All Devices
              </span>
            ) : (
              <span className="mac-auth-status-badge badge-enforced">
                ● Strict Enforcement
              </span>
            )}
          </div>

          <p className="mac-auth-subtext">
            {isMacAuthDisabled ? (
              <>
                Firewall forwarding set to <code>lan ➔ wan</code>. Any local device can access the internet without MAC registration.
              </>
            ) : (
              <>
                Firewall forwarding removed. Only registered MAC devices are granted WAN access.
              </>
            )}
          </p>

          {/* Timing / Countdown Banner when Disabled */}
          {isMacAuthDisabled && disabledUntil && (
            <div className="mac-auth-schedule-row">
              <span className="mac-auth-timer-pill">
                <IconClock size={13} />
                <span>
                  Resumes {macAuthCountdown ? `in ${macAuthCountdown} ` : ''}(at {formatDateTime(disabledUntil)})
                </span>
              </span>
            </div>
          )}

          {isMacAuthDisabled && !disabledUntil && (
            <div className="mac-auth-schedule-row">
              <span className="mac-auth-timer-pill pill-permanent">
                <IconInfinity size={14} />
                <span>Permanently disabled until manually re-enabled</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action Toggle Button */}
      <div className="mac-auth-action-col">
        <button
          type="button"
          className={`btn ${isMacAuthDisabled ? 'btn-primary' : 'btn-secondary'} mac-auth-toggle-btn`}
          disabled={isUpdatingMacAuth}
          onClick={onToggleMacAuthClick}
        >
          {isUpdatingMacAuth ? (
            <>
              <span className="loading-spinner" style={{ width: '13px', height: '13px', borderTopColor: 'currentColor' }}></span>
              <span>Updating Gateway...</span>
            </>
          ) : isMacAuthDisabled ? (
            <>
              <IconLock size={14} />
              <span>Turn ON MAC Auth</span>
            </>
          ) : (
            <>
              <IconUnlock size={14} />
              <span>Turn OFF MAC Auth</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
