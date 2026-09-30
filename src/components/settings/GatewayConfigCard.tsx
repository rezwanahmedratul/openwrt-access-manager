'use client';

import React from 'react';
import { IconZap } from '../icons';

interface GatewayConfigCardProps {
  isTestingGateway: boolean;
  onTestGateway: () => void;
  gatewayLatency: number | null;
  gatewayIp: string;
  setGatewayIp: (ip: string) => void;
  pollingInterval: string;
  setPollingInterval: (interval: string) => void;
}

export const GatewayConfigCard: React.FC<GatewayConfigCardProps> = ({
  isTestingGateway,
  onTestGateway,
  gatewayLatency,
  gatewayIp,
  setGatewayIp,
  pollingInterval,
  setPollingInterval,
}) => {
  return (
    <div className="settings-section-card">
      <div className="settings-section-header">
        <div className="settings-section-title-wrap">
          <h2 className="settings-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
              <line x1="6" y1="6" x2="6.01" y2="6" />
              <line x1="6" y1="18" x2="6.01" y2="18" />
            </svg>
            Router Gateway &amp; Polling
          </h2>
          <p className="settings-section-desc">
            Connection status and parameters for the target OpenWrt router daemon.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={isTestingGateway}
          onClick={onTestGateway}
          style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <IconZap size={13} />
          <span>{isTestingGateway ? 'Pinging Gateway...' : 'Test Connection'}</span>
        </button>
      </div>

      <div className="settings-rows-list">
        <div className="settings-row-item">
          <div className="settings-row-info">
            <span className="settings-row-label">Connection Status</span>
            <span className="settings-row-caption">Live heartbeat signal from the OpenWrt router agent daemon.</span>
          </div>
          <div className="settings-row-control">
            <div className="gateway-pill" style={{ margin: 0 }}>
              <span className="gateway-pill-dot"></span>
              <span style={{ fontWeight: 600 }}>Active &amp; Polling</span>
            </div>
            {gatewayLatency !== null && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                {gatewayLatency}ms
              </span>
            )}
          </div>
        </div>

        <div className="settings-row-item">
          <div className="settings-row-info">
            <span className="settings-row-label">Router Firmware &amp; Model</span>
            <span className="settings-row-caption">Detected operating system version running on the hardware gateway.</span>
          </div>
          <div className="settings-row-control">
            <span style={{ fontSize: '0.85rem', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
              OpenWrt v23.05.5-r24106
            </span>
          </div>
        </div>

        <div className="settings-row-item">
          <div className="settings-row-info">
            <span className="settings-row-label">Gateway IP Address</span>
            <span className="settings-row-caption">Local IPv4 address of the OpenWrt management interface.</span>
          </div>
          <div className="settings-row-control">
            <input
              type="text"
              className="form-input-element"
              value={gatewayIp}
              onChange={(e) => setGatewayIp(e.target.value)}
              style={{ width: '160px', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', padding: '0.4rem 0.65rem' }}
            />
          </div>
        </div>

        <div className="settings-row-item">
          <div className="settings-row-info">
            <span className="settings-row-label">Sync Polling Interval</span>
            <span className="settings-row-caption">How often the router polls for new firewall and ethers updates.</span>
          </div>
          <div className="settings-row-control">
            <select
              className="group-dropdown-select"
              value={pollingInterval}
              onChange={(e) => setPollingInterval(e.target.value)}
              style={{ width: '170px', fontSize: '0.82rem' }}
            >
              <option value="5">Every 5 seconds</option>
              <option value="10">Every 10 seconds (Default)</option>
              <option value="30">Every 30 seconds</option>
              <option value="60">Every 1 minute</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
