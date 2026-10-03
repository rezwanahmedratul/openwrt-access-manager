'use client';

import { useState, useEffect, useCallback } from 'react';
import { SessionUser, ActiveTab } from '@/lib/types';

export function useAuthSession() {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Theme Management (Light / Dark Mode)
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Navigation state: 'dashboard' | 'users' | 'groups' | 'history' | 'account' | 'settings' (hydrated cleanly via useEffect)
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Notification Toast
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  const handleTabChange = useCallback((tab: ActiveTab) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('openwrt-active-tab', tab);
        const url = new URL(window.location.href);
        if (tab === 'dashboard') {
          url.searchParams.delete('tab');
        } else {
          url.searchParams.set('tab', tab);
        }
        window.history.replaceState(null, '', url.pathname + url.search + url.hash);
      } catch {
        // ignore
      }
    }
  }, []);

  // Theme Initialization (localStorage & system preference)
  useEffect(() => {
    const savedTheme = localStorage.getItem('openwrt-theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initial = prefersDark ? 'dark' : 'light';
      setTheme(initial);
      document.documentElement.setAttribute('data-theme', initial);
    }
  }, []);

  // Synchronize Tab with URL query param / hash / localStorage and handle browser back/forward
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncTabFromUrlOrStorage = () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const tabParam = urlParams.get('tab') as ActiveTab | null;
        const hash = window.location.hash.replace('#', '') as ActiveTab;
        const savedTab = localStorage.getItem('openwrt-active-tab') as ActiveTab | null;
        const pathname = window.location.pathname.replace(/^\//, '') as ActiveTab;
        const validTabs: ActiveTab[] = ['dashboard', 'users', 'groups', 'history', 'account', 'settings'];

        const candidate = (tabParam && validTabs.includes(tabParam) ? tabParam : null)
          || (pathname && validTabs.includes(pathname) ? pathname : null)
          || (hash && validTabs.includes(hash) ? hash : null)
          || (savedTab && validTabs.includes(savedTab) ? savedTab : null);

        if (candidate && validTabs.includes(candidate)) {
          setActiveTab(candidate);
          const url = new URL(window.location.href);
          if (candidate === 'dashboard') {
            url.searchParams.delete('tab');
          } else {
            url.searchParams.set('tab', candidate);
          }
          window.history.replaceState(null, '', url.pathname + url.search + url.hash);
        }
      } catch {
        // ignore
      }
    };

    syncTabFromUrlOrStorage();

    const onPopState = () => {
      syncTabFromUrlOrStorage();
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const switchTheme = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('openwrt-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // Auth Session Verification on Load with failsafe timeout
  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    // Failsafe timeout: under no circumstance should the UI remain on the gateway loading spinner for > 2000ms
    const timeoutId = setTimeout(() => {
      if (active) {
        setAuthChecking(false);
      }
      controller.abort();
    }, 2000);

    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
          cache: 'no-store',
        });
        const data = await res.json();
        if (active) {
          if (data && data.authenticated && data.user) {
            setCurrentUser(data.user);
          } else {
            setCurrentUser(null);
          }
        }
      } catch {
        if (active) {
          setCurrentUser(null);
        }
      } finally {
        if (active) {
          clearTimeout(timeoutId);
          setAuthChecking(false);
        }
      }
    };

    checkAuth();

    return () => {
      active = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  // Login Form Submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Failed to sign in');
        return;
      }
      setCurrentUser(data.user);
      showToast(`Welcome back, ${data.user.username} (${data.user.role})`);
    } catch (err: any) {
      setLoginError(err.message || 'Network error');
    } finally {
      setLoginLoading(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setCurrentUser(null);
      handleTabChange('dashboard');
      showToast('Signed out of gateway session');
    } catch {
      setCurrentUser(null);
    }
  };

  return {
    currentUser,
    setCurrentUser,
    authChecking,
    setAuthChecking,
    loginUsername,
    setLoginUsername,
    loginPassword,
    setLoginPassword,
    loginError,
    loginLoading,
    handleLogin,
    handleLogout,
    theme,
    switchTheme,
    activeTab,
    handleTabChange,
    notification,
    showToast,
  };
}
