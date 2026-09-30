import React from 'react';
import { SessionUser } from '@/lib/types';
import { IconUnlock, IconClose, IconInfinity, IconClock, IconCalendar } from '../icons';

interface MacAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: SessionUser | null;
  isUpdatingMacAuth: boolean;
  macAuthModalError: string | null;
  macAuthDisableMode: string;
  setMacAuthDisableMode: (mode: any) => void;
  customMacAuthDate: string;
  setCustomMacAuthDate: (date: string) => void;
  onConfirmDisable: () => void;
}

export const MacAuthModal: React.FC<MacAuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  isUpdatingMacAuth,
  macAuthModalError,
  macAuthDisableMode,
  setMacAuthDisableMode,
  customMacAuthDate,
  setCustomMacAuthDate,
  onConfirmDisable,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="mac-auth-modal-card">
        <div className="modal-header-row">
          <h3 className="modal-headline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <IconUnlock size={17} />
            <span>Turn OFF MAC Authentication</span>
          </h3>
          <button
            onClick={onClose}
            className="modal-close-icon"
            disabled={isUpdatingMacAuth}
            aria-label="Close"
          >
            <IconClose size={13} />
          </button>
        </div>

        <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Turning off MAC authentication sets firewall forwarding to <code>lan ➔ wan</code>, allowing <strong>everyone on the local network</strong> to access the internet freely without MAC registration.
        </div>

        {macAuthModalError && (
          <div className="form-alert-msg">{macAuthModalError}</div>
        )}

        <div>
          <label className="form-label-title">Select Disable Duration / Schedule</label>
          <div className="mac-auth-duration-grid">
            <button
              type="button"
              className={`mac-auth-duration-btn ${macAuthDisableMode === 'infinite' ? 'active' : ''}`}
              disabled={currentUser?.role !== 'admin'}
              onClick={() => setMacAuthDisableMode('infinite')}
              title={currentUser?.role !== 'admin' ? 'Only Administrators can permanently disable MAC authentication' : 'Disable permanently until manually re-enabled'}
            >
              <IconInfinity size={18} />
              <span>Permanently</span>
              <span className="duration-caption">
                {currentUser?.role === 'admin' ? 'Admin only' : 'Locked for subadmin'}
              </span>
            </button>

            <button
              type="button"
              className={`mac-auth-duration-btn ${macAuthDisableMode === '1hour' ? 'active' : ''}`}
              onClick={() => setMacAuthDisableMode('1hour')}
            >
              <IconClock size={18} />
              <span>1 Hour</span>
              <span className="duration-caption">Quick bypass</span>
            </button>

            <button
              type="button"
              className={`mac-auth-duration-btn ${macAuthDisableMode === '1day' ? 'active' : ''}`}
              onClick={() => setMacAuthDisableMode('1day')}
            >
              <IconCalendar size={18} />
              <span>24 Hours</span>
              <span className="duration-caption">1 day</span>
            </button>

            <button
              type="button"
              className={`mac-auth-duration-btn ${macAuthDisableMode === '7days' ? 'active' : ''}`}
              onClick={() => setMacAuthDisableMode('7days')}
            >
              <IconCalendar size={18} />
              <span>7 Days</span>
              <span className="duration-caption">1 week</span>
            </button>

            <button
              type="button"
              className={`mac-auth-duration-btn ${macAuthDisableMode === '30days' ? 'active' : ''}`}
              onClick={() => setMacAuthDisableMode('30days')}
            >
              <IconCalendar size={18} />
              <span>30 Days</span>
              <span className="duration-caption">Max subadmin limit</span>
            </button>

            <button
              type="button"
              className={`mac-auth-duration-btn ${macAuthDisableMode === 'custom' ? 'active' : ''}`}
              onClick={() => setMacAuthDisableMode('custom')}
            >
              <IconCalendar size={18} />
              <span>Pick Date</span>
              <span className="duration-caption">Calendar</span>
            </button>
          </div>
        </div>

        {macAuthDisableMode === 'custom' && (
          <div className="mac-auth-custom-calendar-box">
            <label className="form-label-title" style={{ fontSize: '0.78rem' }}>
              Specify End Date &amp; Time:
            </label>
            <input
              type="datetime-local"
              className="form-input-element"
              value={customMacAuthDate}
              onChange={(e) => setCustomMacAuthDate(e.target.value)}
              min={(() => {
                const now = new Date(Date.now() + 60000);
                return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
              })()}
              max={
                currentUser?.role === 'subadmin'
                  ? (() => {
                    const maxDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                    return new Date(maxDate.getTime() - maxDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                  })()
                  : undefined
              }
              style={{ fontSize: '0.84rem' }}
            />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              {currentUser?.role === 'subadmin'
                ? 'Subadmins may schedule up to a maximum of 30 days into the future.'
                : 'Select any future timestamp when MAC filtering should automatically resume.'}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={isUpdatingMacAuth}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={isUpdatingMacAuth}
            onClick={onConfirmDisable}
          >
            {isUpdatingMacAuth ? 'Applying...' : 'Confirm & Turn OFF'}
          </button>
        </div>
      </div>
    </div>
  );
};
