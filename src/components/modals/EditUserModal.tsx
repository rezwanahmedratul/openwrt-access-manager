import React, { useState } from 'react';
import { Group, SessionUser, UserViewModel, DeviceSchedule } from '@/lib/types';
import { IconClose, IconBan, IconLock, IconClock, IconCalendar } from '../icons';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  formName: string;
  setFormName: (s: string) => void;
  formMac: string;
  setFormMac: (s: string) => void;
  formGroupIds: string[];
  setFormGroupIds: (ids: string[]) => void;
  formSchedule?: DeviceSchedule | null;
  setFormSchedule?: (s: DeviceSchedule | null) => void;
  formTemporaryAccessUntil?: string | null;
  setFormTemporaryAccessUntil?: (until: string | null) => void;
  formError: string | null;
  groups: Group[];
  currentUser: SessionUser | null;
  onSaveUser: (e: React.FormEvent) => void;
  onGoToGroups: () => void;
  duplicateMacUser?: UserViewModel | null;
  duplicateNameUser?: UserViewModel | null;
}

const ALL_DAYS = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

const TIMEZONES = [
  { value: 'Asia/Dhaka', label: 'Asia/Dhaka (GMT+6)' },
  { value: 'UTC', label: 'UTC (GMT+0)' },
  { value: 'America/New_York', label: 'America/New York (EST/EDT)' },
  { value: 'America/Los_Angeles', label: 'America/Los Angeles (PST/PDT)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST)' },
];

export const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  onClose,
  formName,
  setFormName,
  formMac,
  setFormMac,
  formGroupIds,
  setFormGroupIds,
  formSchedule,
  setFormSchedule,
  formTemporaryAccessUntil,
  setFormTemporaryAccessUntil,
  formError,
  groups,
  currentUser,
  onSaveUser,
  onGoToGroups,
  duplicateMacUser,
  duplicateNameUser,
}) => {
  const [showCustomExpiry, setShowCustomExpiry] = useState(false);

  if (!isOpen) return null;

  // Active schedule state
  const isScheduleActive = Boolean(formSchedule && formSchedule.enabled !== false);
  const activeDays = formSchedule?.days || ['mon', 'tue', 'wed', 'thu', 'fri'];
  const startTime = formSchedule?.start_time || '08:00';
  const stopTime = formSchedule?.stop_time || '22:00';
  const scheduleTimezone = formSchedule?.timezone || 'Asia/Dhaka';

  const toggleDay = (dayKey: string) => {
    if (!setFormSchedule) return;
    const currentDays = activeDays.map((d) => d.toLowerCase());
    const newDays = currentDays.includes(dayKey)
      ? currentDays.filter((d) => d !== dayKey)
      : [...currentDays, dayKey];
    setFormSchedule({
      enabled: true,
      days: newDays,
      start_time: startTime,
      stop_time: stopTime,
      timezone: scheduleTimezone,
    });
  };

  const setSchedulePreset = (type: 'weekdays' | 'weekends' | 'all') => {
    if (!setFormSchedule) return;
    let days: string[] = [];
    if (type === 'weekdays') days = ['mon', 'tue', 'wed', 'thu', 'fri'];
    if (type === 'weekends') days = ['sat', 'sun'];
    if (type === 'all') days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    setFormSchedule({
      enabled: true,
      days,
      start_time: startTime,
      stop_time: stopTime,
      timezone: scheduleTimezone,
    });
  };

  // Temporary access presets
  const applyExpiryPreset = (hours: number | null) => {
    if (!setFormTemporaryAccessUntil) return;
    if (hours === null) {
      setFormTemporaryAccessUntil(null);
      setShowCustomExpiry(false);
      return;
    }
    const d = new Date();
    d.setMinutes(d.getMinutes() + hours * 60);
    setFormTemporaryAccessUntil(d.toISOString());
    setShowCustomExpiry(false);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: '640px', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header-row" style={{ flexShrink: 0 }}>
          <h3 className="modal-headline">Edit User &amp; Access Controls</h3>
          <button onClick={onClose} className="modal-close-icon" aria-label="Close">
            <IconClose size={13} />
          </button>
        </div>

        <form onSubmit={onSaveUser} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div style={{ overflowY: 'auto', padding: '0.25rem 0.25rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            {formError && <div className="form-alert-msg">{formError}</div>}

            <div className="form-group-block">
              <label className="form-label-title">User Name</label>
              <input
                type="text"
                className="form-input-element"
                placeholder="e.g. ratul ahmed or Rezwan-Ahmed"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
              />
              {duplicateNameUser && (
                <div className="quick-add-dup-warning" style={{ marginTop: '0.4rem' }}>
                  <span>⚠️</span>
                  <span>Notice: User name &quot;{duplicateNameUser.name}&quot; already exists (assigned to MAC {duplicateNameUser.mac_address})</span>
                </div>
              )}
              <div className="form-help-caption">Spaces convert to underscores; hyphens are preserved (e.g. Ratul_Ahmed).</div>
            </div>

            <div className="form-group-block">
              <label className="form-label-title">MAC Address</label>
              <input
                type="text"
                className="form-input-element"
                placeholder="e.g. 0cf346f3cca9 or 0C:F3:46:F3:CC:A9"
                value={formMac}
                onChange={(e) => setFormMac(e.target.value)}
                required
              />
              {duplicateMacUser && (
                <div className="quick-add-dup-warning" style={{ marginTop: '0.4rem' }}>
                  <span>⚠️</span>
                  <span>Notice: MAC address already registered to &quot;{duplicateMacUser.name}&quot;</span>
                </div>
              )}
              <div className="form-help-caption">Formats any 12-char hex string, colons, or dashes into canonical format.</div>
            </div>

            {/* Assigned Groups Block */}
            <div className="form-group-block">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label className="form-label-title" style={{ marginBottom: 0 }}>Assigned Groups</label>
                <button
                  type="button"
                  onClick={onGoToGroups}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Go to Groups Page →
                </button>
              </div>
              <div className="checkbox-tags-grid">
                {groups.map((group) => {
                  const isChecked = formGroupIds.includes(group.id);
                  const isRestrictedForSubadmin = currentUser?.role === 'subadmin' && group.is_protected;
                  const selectedHasProtected = formGroupIds.some((id) => groups.find((g) => g.id === id)?.is_protected);
                  const isProtectedConflict = group.is_no_internet && selectedHasProtected;
                  const isDisabled = isRestrictedForSubadmin || isProtectedConflict;

                  return (
                    <label
                      key={group.id}
                      className="checkbox-tag-item"
                      style={{
                        opacity: isDisabled ? 0.45 : 1,
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        borderColor: group.is_no_internet ? 'rgba(220, 38, 38, 0.4)' : undefined,
                      }}
                      title={
                        isRestrictedForSubadmin
                          ? 'Protected group (Administrator only)'
                          : isProtectedConflict
                          ? 'Cannot assign to No Internet while assigned to protected group.'
                          : ''
                      }
                    >
                      <input
                        type="checkbox"
                        disabled={isDisabled}
                        checked={isChecked}
                        onChange={(e) => {
                          if (isDisabled) return;
                          if (e.target.checked) {
                            if (group.is_no_internet) {
                              setFormGroupIds([group.id]);
                            } else {
                              const filtered = formGroupIds.filter((id) => !groups.find((g) => g.id === id)?.is_no_internet);
                              setFormGroupIds([...filtered, group.id]);
                            }
                          } else {
                            const remaining = formGroupIds.filter((id) => id !== group.id);
                            const defaultGroup = groups.find((g) => g.name.toLowerCase() === 'default');
                            if (remaining.length === 0 && defaultGroup) {
                              setFormGroupIds([defaultGroup.id]);
                            } else {
                              setFormGroupIds(remaining);
                            }
                          }
                        }}
                      />
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        {group.is_no_internet && <IconBan size={12} />}
                        {group.name}
                        {group.is_protected && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: 'var(--text-secondary)' }}>
                            (<IconLock size={11} /> Protected)
                          </span>
                        )}
                        {group.is_no_internet && !group.is_protected && ' (No Internet)'}
                      </span>
                    </label>
                  );
                })}
              </div>

              {formGroupIds.some((id) => groups.find((g) => g.id === id)?.is_no_internet) && (
                <div className="form-exclusive-notice">
                  <IconBan size={15} />
                  <span><strong>No Internet Policy:</strong> Devices in a No Internet group cannot be assigned to any group with internet access.</span>
                </div>
              )}
            </div>

            {/* SECTION: Temporary Access Duration */}
            <div className="form-group-block" style={{ background: 'var(--bg-app)', padding: '0.85rem', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <IconClock size={14} style={{ color: 'var(--text-primary)' }} />
                  <label className="form-label-title" style={{ margin: 0 }}>Temporary Device Access</label>
                </div>
                {formTemporaryAccessUntil && (
                  <button
                    type="button"
                    onClick={() => applyExpiryPreset(null)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Clear Expiry (Permanent)
                  </button>
                )}
              </div>

              {formTemporaryAccessUntil ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '9999px',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      background: new Date(formTemporaryAccessUntil).getTime() <= Date.now() ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: new Date(formTemporaryAccessUntil).getTime() <= Date.now() ? '#ef4444' : '#f59e0b',
                    }}
                  >
                    <span>
                      {new Date(formTemporaryAccessUntil).getTime() <= Date.now() ? 'Expired at: ' : 'Expires at: '}
                      {new Date(formTemporaryAccessUntil).toLocaleString()}
                    </span>
                  </span>
                </div>
              ) : (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Device access is currently permanent. Select a preset below to grant temporary network access.
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => applyExpiryPreset(1)}
                  style={{ fontSize: '0.74rem', padding: '0.25rem 0.55rem' }}
                >
                  1 Hour
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => applyExpiryPreset(4)}
                  style={{ fontSize: '0.74rem', padding: '0.25rem 0.55rem' }}
                >
                  4 Hours
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => applyExpiryPreset(24)}
                  style={{ fontSize: '0.74rem', padding: '0.25rem 0.55rem' }}
                >
                  24 Hours
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => applyExpiryPreset(168)}
                  style={{ fontSize: '0.74rem', padding: '0.25rem 0.55rem' }}
                >
                  7 Days
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowCustomExpiry(!showCustomExpiry)}
                  style={{ fontSize: '0.74rem', padding: '0.25rem 0.55rem' }}
                >
                  Custom Date/Time
                </button>
              </div>

              {showCustomExpiry && (
                <div style={{ marginTop: '0.65rem' }}>
                  <input
                    type="datetime-local"
                    className="form-input-element"
                    style={{ fontSize: '0.78rem', maxWidth: '240px' }}
                    value={formTemporaryAccessUntil ? new Date(formTemporaryAccessUntil).toISOString().slice(0, 16) : ''}
                    onChange={(e) => {
                      if (e.target.value && setFormTemporaryAccessUntil) {
                        setFormTemporaryAccessUntil(new Date(e.target.value).toISOString());
                      }
                    }}
                  />
                </div>
              )}
            </div>

            {/* SECTION: Recurring Weekly Schedule */}
            <div className="form-group-block" style={{ background: 'var(--bg-app)', padding: '0.85rem', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <IconCalendar size={14} style={{ color: 'var(--text-primary)' }} />
                  <label className="form-label-title" style={{ margin: 0 }}>Recurring Weekly Schedule</label>
                </div>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={isScheduleActive}
                    onChange={(e) => {
                      if (!setFormSchedule) return;
                      if (e.target.checked) {
                        setFormSchedule({
                          enabled: true,
                          days: activeDays,
                          start_time: startTime,
                          stop_time: stopTime,
                          timezone: scheduleTimezone,
                        });
                      } else {
                        setFormSchedule(null);
                      }
                    }}
                  />
                  <span>Enable Schedule</span>
                </label>
              </div>

              {isScheduleActive && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                  {/* Days Selector */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Active Days of Week:</span>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button type="button" onClick={() => setSchedulePreset('weekdays')} style={{ background: 'none', border: 'none', fontSize: '0.7rem', color: 'var(--text-secondary)', cursor: 'pointer', textDecoration: 'underline' }}>
                          Weekdays
                        </button>
                        <button type="button" onClick={() => setSchedulePreset('weekends')} style={{ background: 'none', border: 'none', fontSize: '0.7rem', color: 'var(--text-secondary)', cursor: 'pointer', textDecoration: 'underline' }}>
                          Weekends
                        </button>
                        <button type="button" onClick={() => setSchedulePreset('all')} style={{ background: 'none', border: 'none', fontSize: '0.7rem', color: 'var(--text-secondary)', cursor: 'pointer', textDecoration: 'underline' }}>
                          All
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {ALL_DAYS.map((d) => {
                        const isSelected = activeDays.map((x) => x.toLowerCase()).includes(d.key);
                        return (
                          <button
                            key={d.key}
                            type="button"
                            onClick={() => toggleDay(d.key)}
                            style={{
                              padding: '0.25rem 0.55rem',
                              borderRadius: '4px',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              border: `1px solid ${isSelected ? 'var(--text-primary)' : 'var(--border-subtle)'}`,
                              background: isSelected ? 'var(--text-primary)' : 'var(--bg-card)',
                              color: isSelected ? 'var(--text-inverse)' : 'var(--text-primary)',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time Range */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>
                        Start Time (Access Opens)
                      </label>
                      <input
                        type="time"
                        className="form-input-element"
                        style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}
                        value={startTime}
                        onChange={(e) => {
                          if (setFormSchedule) {
                            setFormSchedule({
                              enabled: true,
                              days: activeDays,
                              start_time: e.target.value,
                              stop_time: stopTime,
                              timezone: scheduleTimezone,
                            });
                          }
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>
                        End Time (Access Closes)
                      </label>
                      <input
                        type="time"
                        className="form-input-element"
                        style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}
                        value={stopTime}
                        onChange={(e) => {
                          if (setFormSchedule) {
                            setFormSchedule({
                              enabled: true,
                              days: activeDays,
                              start_time: startTime,
                              stop_time: e.target.value,
                              timezone: scheduleTimezone,
                            });
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Timezone */}
                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>
                      Schedule Timezone
                    </label>
                    <select
                      className="group-dropdown-select"
                      style={{ width: '100%', fontSize: '0.78rem' }}
                      value={scheduleTimezone}
                      onChange={(e) => {
                        if (setFormSchedule) {
                          setFormSchedule({
                            enabled: true,
                            days: activeDays,
                            start_time: startTime,
                            stop_time: stopTime,
                            timezone: e.target.value,
                          });
                        }
                      }}
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.65rem',
              marginTop: '1rem',
              paddingTop: '0.85rem',
              borderTop: '1px solid var(--border-subtle)',
              flexShrink: 0,
            }}
          >
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
