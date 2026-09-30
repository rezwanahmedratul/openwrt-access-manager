'use client';

import React from 'react';

interface FirewallRulesCardProps {
  blockPolicy: 'REJECT' | 'DROP';
  setBlockPolicy: (policy: 'REJECT' | 'DROP') => void;
  synFloodEnabled: boolean;
  setSynFloodEnabled: (val: boolean) => void;
  flowOffloadingEnabled: boolean;
  setFlowOffloadingEnabled: (val: boolean) => void;
  fullconeNatEnabled: boolean;
  setFullconeNatEnabled: (val: boolean) => void;
}

export const FirewallRulesCard: React.FC<FirewallRulesCardProps> = ({
  blockPolicy,
  setBlockPolicy,
  synFloodEnabled,
  setSynFloodEnabled,
  flowOffloadingEnabled,
  setFlowOffloadingEnabled,
  fullconeNatEnabled,
  setFullconeNatEnabled,
}) => {
  return (
    <div className="settings-section-card">
      <div className="settings-section-header">
        <div className="settings-section-title-wrap">
          <h2 className="settings-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Firewall &amp; Access Control Policies
          </h2>
          <p className="settings-section-desc">
            Low-level packet filter parameters applied to <code>/etc/config/firewall</code>.
          </p>
        </div>
      </div>

      <div className="settings-rows-list">
        <div className="settings-row-item">
          <div className="settings-row-info">
            <span className="settings-row-label">No-Internet Block Action</span>
            <span className="settings-row-caption">
              Action taken when a device in a &quot;No Internet&quot; group tries to access the WAN.
            </span>
          </div>
          <div className="settings-row-control">
            <select
              className="group-dropdown-select"
              value={blockPolicy}
              onChange={(e: any) => setBlockPolicy(e.target.value)}
              style={{ width: '180px', fontSize: '0.82rem' }}
            >
              <option value="REJECT">REJECT (Immediate TCP RST)</option>
              <option value="DROP">DROP (Silent timeout)</option>
            </select>
          </div>
        </div>

        <div className="settings-row-item">
          <div className="settings-row-info">
            <span className="settings-row-label">SYN Flood Protection</span>
            <span className="settings-row-caption">Enforce syn_flood protection against denial-of-service attempts.</span>
          </div>
          <div className="settings-row-control">
            <label className="switch-toggle-label">
              <input
                type="checkbox"
                className="switch-toggle-input"
                checked={synFloodEnabled}
                onChange={(e) => setSynFloodEnabled(e.target.checked)}
              />
              <span className="switch-toggle-slider"></span>
            </label>
          </div>
        </div>

        <div className="settings-row-item">
          <div className="settings-row-info">
            <span className="settings-row-label">Hardware &amp; Software Flow Offloading</span>
            <span className="settings-row-caption">Bypass CPU routing table for established high-bandwidth streams.</span>
          </div>
          <div className="settings-row-control">
            <label className="switch-toggle-label">
              <input
                type="checkbox"
                className="switch-toggle-input"
                checked={flowOffloadingEnabled}
                onChange={(e) => setFlowOffloadingEnabled(e.target.checked)}
              />
              <span className="switch-toggle-slider"></span>
            </label>
          </div>
        </div>

        <div className="settings-row-item">
          <div className="settings-row-info">
            <span className="settings-row-label">Fullcone NAT Acceleration</span>
            <span className="settings-row-caption">Improves peer-to-peer networking, gaming latency, and VoIP connections.</span>
          </div>
          <div className="settings-row-control">
            <label className="switch-toggle-label">
              <input
                type="checkbox"
                className="switch-toggle-input"
                checked={fullconeNatEnabled}
                onChange={(e) => setFullconeNatEnabled(e.target.checked)}
              />
              <span className="switch-toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
