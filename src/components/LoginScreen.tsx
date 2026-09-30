'use client';

import React from 'react';

interface LoginScreenProps {
  loginUsername: string;
  setLoginUsername: (value: string) => void;
  loginPassword: string;
  setLoginPassword: (value: string) => void;
  loginError: string | null;
  loginLoading: boolean;
  onLogin: (e: React.FormEvent) => void;
}

export function LoginScreen({
  loginUsername,
  setLoginUsername,
  loginPassword,
  setLoginPassword,
  loginError,
  loginLoading,
  onLogin,
}: LoginScreenProps) {
  return (
    <div className="auth-page-container">
      <div className="auth-card-box">
        <div className="auth-brand-center">
          <div className="auth-brand-logo">W</div>
          <h2 className="auth-card-title">OpenWrt Manager</h2>
          <p className="auth-card-subtitle">
            Sign in with your administrator or subadmin credentials to manage access control policies.
          </p>
        </div>

        <form className="auth-form" onSubmit={onLogin}>
          {loginError && <div className="form-alert-msg">{loginError}</div>}

          <div className="form-group-block">
            <label className="form-label-title">Username</label>
            <input
              type="text"
              className="form-input-element"
              placeholder="Enter username"
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group-block">
            <label className="form-label-title">Password</label>
            <input
              type="password"
              className="form-input-element"
              placeholder="Enter password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loginLoading}
            style={{ width: '100%', height: '42px', marginTop: '0.4rem', justifyContent: 'center' }}
          >
            {loginLoading ? 'Signing in...' : 'Sign In to Gateway'}
          </button>
        </form>
      </div>
    </div>
  );
}
