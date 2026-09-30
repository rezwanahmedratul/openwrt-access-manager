'use client';

import React from 'react';
import { IconCheck } from '../icons';

interface ApiIntegrationCardProps {
  showSecretToken: boolean;
  setShowSecretToken: (show: boolean) => void;
  tokenCopied: boolean;
  onCopyText: (text: string, type: 'token' | 'endpoint') => void;
}

export const ApiIntegrationCard: React.FC<ApiIntegrationCardProps> = ({
  showSecretToken,
  setShowSecretToken,
  tokenCopied,
  onCopyText,
}) => {
  return (
    <div className="settings-section-card">
      <div className="settings-section-header">
        <div className="settings-section-title-wrap">
          <h2 className="settings-section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            Router API Endpoints &amp; Authentication
          </h2>
          <p className="settings-section-desc">
            Endpoints consumed by OpenWrt shell scripts to pull configuration files.
          </p>
        </div>
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <label className="form-label-title">Router Secret Bearer Token</label>
        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', marginTop: '0.35rem', flexWrap: 'wrap' }}>
          <input
            type={showSecretToken ? 'text' : 'password'}
            readOnly
            value="openwrt-secret-token-change-in-production"
            className="form-input-element"
            style={{ maxWidth: '380px', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowSecretToken(!showSecretToken)}
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.8rem' }}
          >
            {showSecretToken ? 'Hide' : 'Reveal'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onCopyText('openwrt-secret-token-change-in-production', 'token')}
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            {tokenCopied ? (
              <>
                <IconCheck size={12} />
                <span>Copied</span>
              </>
            ) : (
              <span>Copy Token</span>
            )}
          </button>
        </div>
        <div className="form-help-caption">Pass this token in HTTP header <code>Authorization: Bearer &lt;token&gt;</code> for router requests.</div>
      </div>

      <div className="endpoints-table-container">
        <div className="endpoint-list-row">
          <div className="endpoint-badge-col">
            <span className="endpoint-badge-method">GET</span>
            <div>
              <span className="endpoint-path-text">/api/config/version</span>
              <div className="endpoint-desc-text">Returns current configuration version &amp; hash for router cron polling.</div>
            </div>
          </div>
          <button
            type="button"
            className="btn-text-action"
            onClick={() => onCopyText('/api/config/version', 'endpoint')}
          >
            Copy Path
          </button>
        </div>

        <div className="endpoint-list-row">
          <div className="endpoint-badge-col">
            <span className="endpoint-badge-method">GET</span>
            <div>
              <span className="endpoint-path-text">/api/config/firewall</span>
              <div className="endpoint-desc-text">Generates UCI firewall rules with Allowed and Blocked (No-Internet) sections.</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <a
              href="/api/config/firewall?download=true"
              download="firewall"
              className="btn-text-action"
              style={{ textDecoration: 'none' }}
            >
              Download
            </a>
            <button
              type="button"
              className="btn-text-action"
              onClick={() => onCopyText('/api/config/firewall', 'endpoint')}
            >
              Copy
            </button>
          </div>
        </div>

        <div className="endpoint-list-row">
          <div className="endpoint-badge-col">
            <span className="endpoint-badge-method">GET</span>
            <div>
              <span className="endpoint-path-text">/api/config/ethers</span>
              <div className="endpoint-desc-text">Generates static DHCP hostname and MAC mappings for <code>/etc/ethers</code>.</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <a
              href="/api/config/ethers?download=true"
              download="ethers"
              className="btn-text-action"
              style={{ textDecoration: 'none' }}
            >
              Download
            </a>
            <button
              type="button"
              className="btn-text-action"
              onClick={() => onCopyText('/api/config/ethers', 'endpoint')}
            >
              Copy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
