'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { SessionUser } from '@/lib/types';
import { IconCheck, IconAlertTriangle, IconClose } from '../icons';

interface ApiIntegrationCardProps {
  showSecretToken: boolean;
  setShowSecretToken: (show: boolean) => void;
  tokenCopied: boolean;
  onCopyText: (text: string, type: 'token' | 'endpoint') => void;
  currentUser?: SessionUser | null;
  onShowToast?: (msg: string, type?: 'success' | 'error') => void;
}

interface TokenStatus {
  configured: boolean;
  revoked: boolean;
  created_at: string | null;
  token_prefix?: string | null;
  has_env_secret?: boolean;
}

export const ApiIntegrationCard: React.FC<ApiIntegrationCardProps> = ({
  showSecretToken,
  setShowSecretToken,
  tokenCopied,
  onCopyText,
  currentUser,
  onShowToast,
}) => {
  const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [newGeneratedToken, setNewGeneratedToken] = useState<string | null>(null);
  const [newCopied, setNewCopied] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<'rotate' | 'revoke' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTokenStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/config/token');
      if (res.ok) {
        const data = await res.json();
        setTokenStatus(data);
      }
    } catch (err) {
      console.error('Failed to query router token status:', err);
    }
  }, []);

  useEffect(() => {
    fetchTokenStatus();
  }, [fetchTokenStatus]);

  const handleRotateToken = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/config/token', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to rotate router token');
      }
      setNewGeneratedToken(data.token);
      setTokenStatus({
        configured: true,
        revoked: false,
        created_at: data.created_at,
        token_prefix: data.token_prefix,
      });
      setConfirmDialog(null);
      if (onShowToast) {
        onShowToast('New router token generated successfully! Please store it now.', 'success');
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast(err.message || 'Token rotation failed', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeToken = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/config/token', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to revoke router token');
      }
      setNewGeneratedToken(null);
      setTokenStatus((prev) => (prev ? { ...prev, revoked: true } : { configured: true, revoked: true, created_at: new Date().toISOString() }));
      setConfirmDialog(null);
      if (onShowToast) {
        onShowToast('Router token has been revoked.', 'success');
      }
    } catch (err: any) {
      if (onShowToast) {
        onShowToast(err.message || 'Token revocation failed', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyNewToken = () => {
    if (!newGeneratedToken) return;
    navigator.clipboard.writeText(newGeneratedToken);
    setNewCopied(true);
    setTimeout(() => setNewCopied(false), 2000);
    if (onShowToast) onShowToast('Token copied to clipboard', 'success');
  };

  const isAdmin = currentUser?.role === 'admin';

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
            Endpoints and cryptographic bearer credentials consumed by OpenWrt shell daemons.
          </p>
        </div>
      </div>

      {/* Token Management Card */}
      <div
        style={{
          background: 'var(--bg-app)',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle)',
          padding: '1.15rem',
          marginBottom: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                Router Daemon Bearer Token
              </span>
              {tokenStatus?.revoked ? (
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '9999px',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                  }}
                >
                  REVOKED
                </span>
              ) : tokenStatus?.configured ? (
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '9999px',
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                  }}
                >
                  ACTIVE {tokenStatus.token_prefix ? `(${tokenStatus.token_prefix}...)` : ''}
                </span>
              ) : (
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '9999px',
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    color: '#f59e0b',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                  }}
                >
                  ENVIRONMENT SECRET
                </span>
              )}
            </div>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
              {tokenStatus?.created_at
                ? `Generated on ${new Date(tokenStatus.created_at).toLocaleString()}`
                : 'Using fallback secret from ROUTER_SECRET environment variable'}
            </p>
          </div>

          {/* Action Buttons: Rotate & Revoke */}
          {isAdmin && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setConfirmDialog('rotate')}
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
                <span>Rotate Token</span>
              </button>

              {!tokenStatus?.revoked && tokenStatus?.configured && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setConfirmDialog('revoke')}
                  style={{
                    fontSize: '0.78rem',
                    padding: '0.35rem 0.75rem',
                    color: '#ef4444',
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                  </svg>
                  <span>Revoke</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Newly Rotated Token Alert Banner */}
        {newGeneratedToken && (
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: '6px',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#10b981', fontWeight: 600, fontSize: '0.82rem' }}>
                <IconCheck size={14} />
                <span>New Router Bearer Token Generated!</span>
              </div>
              <button
                type="button"
                onClick={() => setNewGeneratedToken(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                aria-label="Dismiss banner"
              >
                <IconClose size={12} />
              </button>
            </div>
            <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
              Copy this token now and update your router script (e.g. <code>/etc/openwrt-access-sync.sh</code>). For security, the full plaintext token will not be displayed again once you leave this page.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                readOnly
                value={newGeneratedToken}
                className="form-input-element"
                style={{ flex: 1, minWidth: '260px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', background: 'var(--bg-card)' }}
              />
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={copyNewToken}
                style={{ fontSize: '0.78rem', padding: '0.4rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                {newCopied ? (
                  <>
                    <IconCheck size={12} />
                    <span>Copied!</span>
                  </>
                ) : (
                  <span>Copy Token</span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Existing / Masked Token Display */}
        {!newGeneratedToken && (
          <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type={showSecretToken ? 'text' : 'password'}
              readOnly
              value={
                tokenStatus?.revoked
                  ? '[TOKEN REVOKED]'
                  : tokenStatus?.token_prefix
                  ? `${tokenStatus.token_prefix}${'*'.repeat(56)}`
                  : 'openwrt-secret-token-change-in-production'
              }
              className="form-input-element"
              style={{ maxWidth: '380px', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowSecretToken(!showSecretToken)}
              style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
            >
              {showSecretToken ? 'Hide' : 'Reveal'}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onCopyText(tokenStatus?.token_prefix || 'openwrt-secret-token-change-in-production', 'token')}
              style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
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
        )}

        <div className="form-help-caption">
          Header authentication required: <code>Authorization: Bearer &lt;token&gt;</code>. Authenticates requests to config and heartbeat endpoints.
        </div>
      </div>

      {/* Confirmation Modal for Rotate or Revoke */}
      {confirmDialog && (
        <div className="modal-backdrop" style={{ zIndex: 1250 }}>
          <div className="modal-card" style={{ maxWidth: '480px' }}>
            <div className="modal-header-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <IconAlertTriangle size={18} style={{ color: confirmDialog === 'revoke' ? '#ef4444' : '#f59e0b' }} />
                <h3 className="modal-headline" style={{ margin: 0, fontSize: '1rem' }}>
                  {confirmDialog === 'rotate' ? 'Rotate Router Token?' : 'Revoke Router Token?'}
                </h3>
              </div>
              <button onClick={() => setConfirmDialog(null)} className="modal-close-icon" aria-label="Close" disabled={isSubmitting}>
                <IconClose size={13} />
              </button>
            </div>

            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '1rem 0' }}>
              {confirmDialog === 'rotate' ? (
                <>
                  Rotating the router token will immediately generate a new 256-bit cryptographic secret and invalidate the current active token.
                  <strong style={{ color: 'var(--text-primary)', display: 'block', marginTop: '0.5rem' }}>
                    Connected OpenWrt routers will fail authorization until you update the client script with the new token.
                  </strong>
                </>
              ) : (
                <>
                  Revoking the token will block all router requests from synchronizing firewall rules or submitting heartbeats.
                  <strong style={{ color: '#ef4444', display: 'block', marginTop: '0.5rem' }}>
                    The router daemon will not be able to pull updates until a new token is generated.
                  </strong>
                </>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmDialog(null)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={confirmDialog === 'rotate' ? handleRotateToken : handleRevokeToken}
                disabled={isSubmitting}
                style={{
                  backgroundColor: confirmDialog === 'revoke' ? '#dc2626' : undefined,
                  borderColor: confirmDialog === 'revoke' ? '#dc2626' : undefined,
                }}
              >
                {isSubmitting
                  ? 'Processing...'
                  : confirmDialog === 'rotate'
                  ? 'Confirm & Rotate'
                  : 'Confirm Revocation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API Endpoints Table */}
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

        <div className="endpoint-list-row">
          <div className="endpoint-badge-col">
            <span className="endpoint-badge-method">POST</span>
            <div>
              <span className="endpoint-path-text">/api/config/heartbeat</span>
              <div className="endpoint-desc-text">Router client telemetry &amp; health heartbeat submission endpoint.</div>
            </div>
          </div>
          <button
            type="button"
            className="btn-text-action"
            onClick={() => onCopyText('/api/config/heartbeat', 'endpoint')}
          >
            Copy Path
          </button>
        </div>
      </div>
    </div>
  );
};
