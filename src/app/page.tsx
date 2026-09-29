'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { UserViewModel, Group, DashboardStats, SessionUser } from '@/lib/types';
import { normalizeMac } from '@/lib/normalize-mac';
import { normalizeName } from '@/lib/normalize-name';

// ============================================================
// Minimal Monochrome SVG Icons (Clean Linear / Vercel Style)
// ============================================================

const IconLock = ({ size = 13, style }: { size?: number; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const IconUnlock = ({ size = 15, style }: { size?: number; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
  </svg>
);

const IconBan = ({ size = 13, style }: { size?: number; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}>
    <circle cx="12" cy="12" r="10" />
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
  </svg>
);

const IconGlobe = ({ size = 13, style }: { size?: number; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}>
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const IconInfinity = ({ size = 16, style }: { size?: number; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}>
    <path d="M18.178 8c5.096 0 5.096 8 0 8-2.678 0-4.678-2.678-6.178-4-1.5-1.322-3.5-4-6.178-4-5.096 0-5.096 8 0 8 2.678 0 4.678-2.678 6.178-4 1.5-1.322 3.5-4 6.178-4z" />
  </svg>
);

const IconClock = ({ size = 14, style }: { size?: number; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconCalendar = ({ size = 15, style }: { size?: number; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const IconZap = ({ size = 13, style }: { size?: number; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const IconAlertTriangle = ({ size = 16, style }: { size?: number; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const IconClose = ({ size = 13, style }: { size?: number; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconCheck = ({ size = 12, style }: { size?: number; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export default function DashboardPage() {
  // Authentication & Session State
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Subadmin Management State (for Account tab)
  const [accountsList, setAccountsList] = useState<any[]>([]);
  const [newSubadminUsername, setNewSubadminUsername] = useState('');
  const [newSubadminPassword, setNewSubadminPassword] = useState('');
  const [subadminError, setSubadminError] = useState<string | null>(null);
  const [subadminLoading, setSubadminLoading] = useState(false);

  // Change Password Modal State (Admin only)
  const [passwordModalAccount, setPasswordModalAccount] = useState<{ id: string; username: string; role: string } | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [confirmPasswordVal, setConfirmPasswordVal] = useState('');
  const [passwordModalError, setPasswordModalError] = useState<string | null>(null);
  const [passwordModalLoading, setPasswordModalLoading] = useState(false);
  const [showPasswordText, setShowPasswordText] = useState(false);

  // Main Data State
  const [users, setUsers] = useState<UserViewModel[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total_users: 0,
    total_groups: 0,
    pending_changes: 0,
    current_version: null,
    last_applied: null,
  });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Debounce search by 200ms to reduce CPU and network overhead
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 200);
    return () => clearTimeout(handler);
  }, [search]);

  // Instant zero-latency client-side search filtering
  const displayedUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.trim().toLowerCase();
    const cleanQ = q.replace(/[:\-]/g, '');
    return users.filter((u) => {
      const nameMatch = u.name.toLowerCase().includes(q);
      const macMatch = u.mac_address.toLowerCase().replace(/[:\-]/g, '').includes(cleanQ);
      return nameMatch || macMatch;
    });
  }, [users, search]);

  // Redis / In-memory Cache Diagnostics state
  const [cacheInfo, setCacheInfo] = useState<{ engine: string; connected: boolean; keysCount: number; pingMs: number } | null>(null);
  const [isPurgingCache, setIsPurgingCache] = useState(false);

  // Theme Management (Light / Dark Mode)
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Navigation state: 'dashboard' | 'groups' | 'account' | 'settings' with URL & localStorage persistence
  const [activeTab, setActiveTab] = useState<'dashboard' | 'groups' | 'account' | 'settings'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const tabParam = urlParams.get('tab') as 'dashboard' | 'groups' | 'account' | 'settings' | null;
        const hash = window.location.hash.replace('#', '') as 'dashboard' | 'groups' | 'account' | 'settings';
        const savedTab = localStorage.getItem('openwrt-active-tab') as 'dashboard' | 'groups' | 'account' | 'settings' | null;
        const validTabs = ['dashboard', 'groups', 'account', 'settings'] as const;

        if (tabParam && validTabs.includes(tabParam)) return tabParam;
        if (hash && validTabs.includes(hash)) return hash;
        if (savedTab && validTabs.includes(savedTab)) return savedTab;
      } catch {
        // fallback to dashboard
      }
    }
    return 'dashboard';
  });

  const handleTabChange = (tab: 'dashboard' | 'groups' | 'account' | 'settings') => {
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
  };

  // User Edit Modal State (Used exclusively for editing existing records)
  const [modalMode, setModalMode] = useState<'EDIT' | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formMac, setFormMac] = useState('');
  const [formGroupIds, setFormGroupIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Horizontal Quick Add Bar State
  const [macOctets, setMacOctets] = useState<string[]>(['', '', '', '', '', '']);
  const [addName, setAddName] = useState('');
  const [addSelectedGroup, setAddSelectedGroup] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const macInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  // Group Page State (creating new group)
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupIsProtected, setNewGroupIsProtected] = useState(false);
  const [newGroupIsNoInternet, setNewGroupIsNoInternet] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [groupLoading, setGroupLoading] = useState(false);

  // Multi-Group Conflict Modal State (No Internet Tagging)
  const [conflictModalData, setConflictModalData] = useState<{
    targetGroup: Group;
    conflicts: { userId: string; userName: string; mac: string; otherGroups: string[] }[];
  } | null>(null);
  const [isResolvingConflict, setIsResolvingConflict] = useState(false);

  // History Modal State
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);

  // User Profile Dropdown Menu State
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement | null>(null);

  // Settings Page State
  const [gatewayIp, setGatewayIp] = useState('192.168.1.1');
  const [pollingInterval, setPollingInterval] = useState('10');
  const [blockPolicy, setBlockPolicy] = useState<'REJECT' | 'DROP'>('REJECT');
  const [showSecretToken, setShowSecretToken] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [synFloodEnabled, setSynFloodEnabled] = useState(true);
  const [flowOffloadingEnabled, setFlowOffloadingEnabled] = useState(true);
  const [flowOffloadingHwEnabled, setFlowOffloadingHwEnabled] = useState(true);
  const [fullconeNatEnabled, setFullconeNatEnabled] = useState(true);
  const [isTestingGateway, setIsTestingGateway] = useState(false);
  const [gatewayLatency, setGatewayLatency] = useState<number | null>(null);

  // MAC Authentication Switch Modal & Schedule State
  const [showMacAuthModal, setShowMacAuthModal] = useState(false);
  const [macAuthDisableMode, setMacAuthDisableMode] = useState<'infinite' | '1hour' | '1day' | '7days' | '30days' | 'custom'>('1hour');
  const [customMacAuthDate, setCustomMacAuthDate] = useState('');
  const [isUpdatingMacAuth, setIsUpdatingMacAuth] = useState(false);
  const [macAuthModalError, setMacAuthModalError] = useState<string | null>(null);

  // Feedback Notification
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleCopyText = (text: string, type: 'token' | 'endpoint') => {
    navigator.clipboard.writeText(text);
    if (type === 'token') {
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2500);
    }
    showToast('Copied to clipboard');
  };

  const handleTestGateway = async () => {
    setIsTestingGateway(true);
    setGatewayLatency(null);
    const start = performance.now();
    try {
      const res = await fetch('/api/config/version', {
        headers: { Authorization: 'Bearer openwrt-secret-token-change-in-production' },
      });
      const end = performance.now();
      if (res.ok) {
        const ms = Math.round(end - start);
        setGatewayLatency(ms);
        showToast(`Gateway healthy (Response: ${ms}ms)`);
      } else {
        showToast('Gateway test returned an error', 'error');
      }
    } catch {
      showToast('Gateway connection failed', 'error');
    } finally {
      setIsTestingGateway(false);
    }
  };

  const handleToggleMacAuthClick = () => {
    const isCurrentlyOn = stats.mac_auth ? stats.mac_auth.enabled : true;
    if (isCurrentlyOn) {
      // Opening modal to turn it OFF
      setMacAuthModalError(null);
      if (currentUser?.role === 'admin') {
        setMacAuthDisableMode('infinite');
      } else {
        setMacAuthDisableMode('1hour');
      }
      // Set default custom date to tomorrow
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const isoLocal = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setCustomMacAuthDate(isoLocal);
      setShowMacAuthModal(true);
    } else {
      // Turning it back ON directly
      handleEnableMacAuth();
    }
  };

  const handleEnableMacAuth = async () => {
    setIsUpdatingMacAuth(true);
    try {
      const res = await fetch('/api/config/mac-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to enable MAC Authentication', 'error');
        return;
      }
      showToast(data.message || 'MAC Authentication enabled (Access restricted to registered MACs)');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update MAC Authentication', 'error');
    } finally {
      setIsUpdatingMacAuth(false);
    }
  };

  const handleConfirmDisableMacAuth = async () => {
    setMacAuthModalError(null);
    let targetExpiry: string | null = null;

    if (macAuthDisableMode === 'infinite') {
      if (currentUser?.role !== 'admin') {
        setMacAuthModalError('Only administrators can permanently disable MAC authentication.');
        return;
      }
      targetExpiry = null;
    } else if (macAuthDisableMode === '1hour') {
      targetExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    } else if (macAuthDisableMode === '1day') {
      targetExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    } else if (macAuthDisableMode === '7days') {
      targetExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (macAuthDisableMode === '30days') {
      targetExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    } else if (macAuthDisableMode === 'custom') {
      if (!customMacAuthDate) {
        setMacAuthModalError('Please pick an expiration date/time from the calendar.');
        return;
      }
      const parsed = new Date(customMacAuthDate);
      if (isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
        setMacAuthModalError('Expiration date must be in the future.');
        return;
      }
      if (currentUser?.role === 'subadmin') {
        const maxLimit = Date.now() + 30 * 24 * 60 * 60 * 1000;
        if (parsed.getTime() > maxLimit + 60000) {
          setMacAuthModalError('Subadmins can disable MAC authentication for at most 30 days.');
          return;
        }
      }
      targetExpiry = parsed.toISOString();
    }

    setIsUpdatingMacAuth(true);
    try {
      const res = await fetch('/api/config/mac-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: false,
          disabled_until: targetExpiry,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMacAuthModalError(data.error || 'Failed to update MAC Authentication');
        return;
      }
      showToast(data.message || 'MAC Authentication disabled');
      setShowMacAuthModal(false);
      fetchData();
    } catch (err: any) {
      setMacAuthModalError(err.message || 'Network error occurred');
    } finally {
      setIsUpdatingMacAuth(false);
    }
  };

  const handleExportConfig = () => {
    const backup = {
      exported_at: new Date().toISOString(),
      version: stats.current_version,
      gateway: {
        ip: gatewayIp,
        polling_interval_seconds: pollingInterval,
        block_policy: blockPolicy,
      },
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        mac_address: u.mac_address,
        groups: u.groups.map((g) => g.name),
      })),
      groups: groups.map((g) => ({
        id: g.id,
        name: g.name,
        is_protected: Boolean(g.is_protected),
        is_no_internet: Boolean(g.is_no_internet),
      })),
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `openwrt-config-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('System configuration backup downloaded');
  };

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
        const tabParam = urlParams.get('tab') as 'dashboard' | 'groups' | 'account' | 'settings' | null;
        const hash = window.location.hash.replace('#', '') as 'dashboard' | 'groups' | 'account' | 'settings';
        const savedTab = localStorage.getItem('openwrt-active-tab') as 'dashboard' | 'groups' | 'account' | 'settings' | null;
        const validTabs = ['dashboard', 'groups', 'account', 'settings'] as const;

        const candidate = (tabParam && validTabs.includes(tabParam) ? tabParam : null)
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

  // Close user dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    if (showUserDropdown) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showUserDropdown]);

  // Safeguard: redirect subadmins if they land on account page
  useEffect(() => {
    if (currentUser && currentUser.role === 'subadmin' && activeTab === 'account') {
      handleTabChange('dashboard');
    }
  }, [currentUser, activeTab]);

  const switchTheme = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('openwrt-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // Auth Session Verification on Load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
        }
      } catch {
        setCurrentUser(null);
      } finally {
        setAuthChecking(false);
      }
    };
    checkAuth();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/accounts');
      const data = await res.json();
      if (data.accounts) setAccountsList(data.accounts);
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    }
  };

  const fetchCacheStatus = async () => {
    try {
      const res = await fetch('/api/system/status');
      const data = await res.json();
      if (data.cache) setCacheInfo(data.cache);
    } catch {
      // ignore
    }
  };

  const handlePurgeCache = async () => {
    try {
      setIsPurgingCache(true);
      const res = await fetch('/api/system/status', { method: 'POST' });
      const data = await res.json();
      if (data.cache) setCacheInfo(data.cache);
      showToast('Redis in-memory cache successfully purged!');
      await fetchData(debouncedSearch, selectedGroup);
    } catch {
      showToast('Failed to purge cache', 'error');
    } finally {
      setIsPurgingCache(false);
    }
  };

  const fetchData = async (searchQuery = debouncedSearch, groupFilter = selectedGroup) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/users?search=${encodeURIComponent(searchQuery)}&group=${encodeURIComponent(groupFilter)}`);
      const data = await res.json();
      if (data.users) setUsers(data.users);
      if (data.groups) {
        setGroups(data.groups);
        setAddSelectedGroup((prev) => {
          if (prev) return prev;
          const def = data.groups.find((g: any) => g.name.toLowerCase() === 'default');
          return def ? def.id : (data.groups[0]?.id || '');
        });
      }
      if (data.stats) setStats(data.stats);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Debounced users fetch: prevents spamming requests on every keystroke
  useEffect(() => {
    if (currentUser) {
      fetchData(debouncedSearch, selectedGroup);
    }
  }, [debouncedSearch, selectedGroup, currentUser]);

  // Decoupled: fetch accounts only when admin is on accounts tab
  useEffect(() => {
    if (currentUser && currentUser.role === 'admin' && activeTab === 'account') {
      fetchAccounts();
    }
  }, [currentUser, activeTab]);

  // Fetch cache status when Settings tab is active
  useEffect(() => {
    if (currentUser && activeTab === 'settings') {
      fetchCacheStatus();
    }
  }, [currentUser, activeTab]);

  // Handle Edit User Save (from Edit Modal)
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const normName = normalizeName(formName);
    if (!normName.valid) {
      setFormError(normName.error || 'Invalid Name');
      return;
    }

    const normMac = normalizeMac(formMac);
    if (!normMac.valid) {
      setFormError(normMac.error || 'Invalid MAC');
      return;
    }

    // Automatically assign to Default group if no groups selected
    let finalGroupIds = formGroupIds;
    if (finalGroupIds.length === 0) {
      const defaultGroup = groups.find((g) => g.name.toLowerCase() === 'default');
      if (defaultGroup) {
        finalGroupIds = [defaultGroup.id];
      }
    }

    try {
      const payload = {
        operation: 'MODIFY',
        user_id: editingUserId,
        name: normName.normalized,
        mac_address: normMac.normalized,
        group_ids: finalGroupIds,
      };

      const res = await fetch('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error || 'Failed to stage pending change');
        return;
      }

      showToast(`User ${normName.normalized} updated in pending changes`);
      setModalMode(null);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Network error');
    }
  };

  // Horizontal Bar: Segmented MAC Input Change (2 characters per box, auto-format & auto-advance)
  const handleMacChange = (index: number, val: string) => {
    const clean = val.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
    const next = [...macOctets];
    next[index] = clean.slice(0, 2);
    setMacOctets(next);
    setAddError(null);

    if (clean.length >= 2) {
      if (index < 5) {
        macInputRefs.current[index + 1]?.focus();
        macInputRefs.current[index + 1]?.select();
      } else {
        nameInputRef.current?.focus();
      }
    }
  };

  // Horizontal Bar: Segmented MAC Keydown (Backspace navigation, arrow keys, delimiter handling)
  const handleMacKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!macOctets[index] && index > 0) {
        e.preventDefault();
        const next = [...macOctets];
        next[index - 1] = next[index - 1].slice(0, -1);
        setMacOctets(next);
        macInputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft') {
      if (index > 0 && (e.currentTarget.selectionStart === 0 || !macOctets[index])) {
        e.preventDefault();
        macInputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowRight') {
      if (index < 5 && (e.currentTarget.selectionEnd === macOctets[index].length || !macOctets[index])) {
        e.preventDefault();
        macInputRefs.current[index + 1]?.focus();
      }
    } else if (e.key === ':' || e.key === '-' || e.key === '.' || e.key === ' ') {
      e.preventDefault();
      if (index < 5) {
        macInputRefs.current[index + 1]?.focus();
        macInputRefs.current[index + 1]?.select();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleAddUserDirect(e);
    }
  };

  // Horizontal Bar: Segmented MAC Paste Handler (automatically fits any MAC format into the 6 boxes)
  const handleMacPaste = (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    if (!pasted) return;

    // Strip delimiters and invalid non-hex chars
    const hexOnly = pasted.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
    if (!hexOnly) return;

    const fullString = hexOnly.slice(0, 12);
    const newOctets = [...macOctets];

    // For full or multi-segment MACs, automatically populate starting from box 0
    const start = fullString.length >= 6 ? 0 : index;
    for (let i = 0; i < 6; i++) {
      if (i >= start) {
        const offset = (i - start) * 2;
        if (offset < fullString.length) {
          newOctets[i] = fullString.slice(offset, offset + 2);
        }
      }
    }

    setMacOctets(newOctets);
    setAddError(null);

    // If 12 characters were provided, focus the Name input directly
    if (fullString.length >= 12) {
      nameInputRef.current?.focus();
    } else {
      const nextEmpty = newOctets.findIndex((oct) => oct.length < 2);
      if (nextEmpty !== -1) {
        macInputRefs.current[nextEmpty]?.focus();
      } else {
        nameInputRef.current?.focus();
      }
    }
  };

  // Horizontal Bar: Submit Add User
  const handleAddUserDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    const isComplete = macOctets.every((oct) => oct.trim().length === 2);
    if (!isComplete) {
      setAddError('Please enter all 6 pairs (12 hex characters) for the MAC address.');
      return;
    }

    const rawMac = macOctets.join(':');
    const normMac = normalizeMac(rawMac);
    if (!normMac.valid) {
      setAddError(normMac.error || 'Invalid MAC address format');
      return;
    }

    if (!addName.trim()) {
      setAddError('Please enter a user or device name.');
      nameInputRef.current?.focus();
      return;
    }

    const normName = normalizeName(addName);
    if (!normName.valid) {
      setAddError(normName.error || 'Invalid user name');
      return;
    }

    try {
      setIsAdding(true);
      const defaultGroup = groups.find((g) => g.name.toLowerCase() === 'default');
      const finalGroupIds = addSelectedGroup
        ? [addSelectedGroup]
        : defaultGroup
          ? [defaultGroup.id]
          : [];

      const payload = {
        operation: 'ADD',
        user_id: null,
        name: normName.normalized,
        mac_address: normMac.normalized,
        group_ids: finalGroupIds,
      };

      const res = await fetch('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        setAddError(json.error || 'Failed to stage pending change');
        return;
      }

      showToast(`User ${normName.normalized} (${normMac.normalized}) staged in pending changes`);
      setMacOctets(['', '', '', '', '', '']);
      setAddName('');
      setAddSelectedGroup('');
      setAddError(null);
      fetchData();
      macInputRefs.current[0]?.focus();
    } catch (err: any) {
      setAddError(err.message || 'Network error');
    } finally {
      setIsAdding(false);
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (user: UserViewModel) => {
    const confirmDelete = window.confirm(`Queue deletion for ${user.name}? This will remain pending until applied.`);
    if (!confirmDelete) return;

    try {
      const res = await fetch('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'DELETE',
          user_id: user.id,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        showToast(json.error || 'Failed to delete user', 'error');
        return;
      }

      showToast(`Pending deletion staged for ${user.name}`);
      fetchData();
    } catch (err) {
      showToast('Network error while deleting', 'error');
    }
  };

  // Undo Last Change
  const handleUndo = async () => {
    try {
      const res = await fetch('/api/draft?action=undo', { method: 'DELETE' });
      const json = await res.json();
      if (res.ok) {
        showToast('Undid latest pending operation');
        fetchData();
      } else {
        showToast(json.message || 'Nothing to undo', 'error');
      }
    } catch (err) {
      showToast('Failed to undo', 'error');
    }
  };

  // Discard All Changes
  const handleDiscard = async () => {
    const confirmDiscard = window.confirm('Discard all pending changes and restore published state?');
    if (!confirmDiscard) return;

    try {
      const res = await fetch('/api/draft', { method: 'DELETE' });
      if (res.ok) {
        showToast('All pending draft changes discarded');
        fetchData();
      }
    } catch (err) {
      showToast('Failed to discard changes', 'error');
    }
  };

  // Apply Changes
  const handleApply = async () => {
    const confirmApply = window.confirm('Publish all draft changes and build new OpenWrt configuration snapshot?');
    if (!confirmApply) return;

    try {
      const res = await fetch('/api/apply', { method: 'POST' });
      const json = await res.json();
      if (res.ok) {
        showToast(`Configuration v${json.version} published successfully`);
        fetchData();
      } else {
        showToast(json.error || 'Failed to apply changes', 'error');
      }
    } catch (err) {
      showToast('Network error applying changes', 'error');
    }
  };

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

  // Subadmin Management: Create Subadmin
  const handleCreateSubadmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubadminError(null);
    setSubadminLoading(true);
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newSubadminUsername,
          password: newSubadminPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubadminError(data.error || 'Failed to create subadmin');
        return;
      }
      showToast(`Subadmin "${newSubadminUsername}" created successfully`);
      setNewSubadminUsername('');
      setNewSubadminPassword('');
      fetchAccounts();
    } catch (err: any) {
      setSubadminError(err.message || 'Network error');
    } finally {
      setSubadminLoading(false);
    }
  };

  // Subadmin Management: Delete Subadmin
  const handleDeleteSubadmin = async (id: string, username: string) => {
    const confirmDel = window.confirm(`Delete subadmin account "${username}"? This subadmin will lose access immediately.`);
    if (!confirmDel) return;
    try {
      const res = await fetch(`/api/accounts?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to delete subadmin', 'error');
        return;
      }
      showToast(`Subadmin "${username}" deleted`);
      fetchAccounts();
    } catch {
      showToast('Network error deleting subadmin', 'error');
    }
  };

  // Change Password Handlers (Admin only)
  const openPasswordModal = (account: { id: string; username: string; role: string }) => {
    setPasswordModalAccount(account);
    setNewPasswordVal('');
    setConfirmPasswordVal('');
    setPasswordModalError(null);
    setShowPasswordText(false);
  };

  const closePasswordModal = () => {
    setPasswordModalAccount(null);
    setNewPasswordVal('');
    setConfirmPasswordVal('');
    setPasswordModalError(null);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalAccount) return;

    if (!newPasswordVal) {
      setPasswordModalError('Please enter a new password');
      return;
    }
    if (newPasswordVal.length < 4) {
      setPasswordModalError('Password must be at least 4 characters long');
      return;
    }
    if (newPasswordVal !== confirmPasswordVal) {
      setPasswordModalError('Passwords do not match');
      return;
    }

    setPasswordModalLoading(true);
    setPasswordModalError(null);

    try {
      const res = await fetch('/api/accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: passwordModalAccount.id,
          username: passwordModalAccount.username,
          password: newPasswordVal,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPasswordModalError(data.error || 'Failed to update password');
        return;
      }

      showToast(`Password updated successfully for ${passwordModalAccount.username}`);
      closePasswordModal();
    } catch (err: any) {
      setPasswordModalError(err.message || 'Network error updating password');
    } finally {
      setPasswordModalLoading(false);
    }
  };

  // Group Management: Create Group
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setGroupError(null);
    setGroupLoading(true);

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGroupName.trim(),
          is_protected: newGroupIsProtected,
          is_no_internet: newGroupIsNoInternet,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGroupError(data.error || 'Failed to create group');
        return;
      }

      showToast(`Group "${newGroupName.trim()}" created successfully`);
      setNewGroupName('');
      setNewGroupIsProtected(false);
      setNewGroupIsNoInternet(false);
      fetchData();
    } catch (err: any) {
      setGroupError(err.message || 'Network error');
    } finally {
      setGroupLoading(false);
    }
  };

  // Toggle Group Protection (Admin only)
  const handleToggleProtection = async (groupId: string, currentProtection: boolean) => {
    try {
      const res = await fetch('/api/groups', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: groupId, is_protected: !currentProtection }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to update group protection');
        return;
      }
      showToast(`Group protection updated to ${!currentProtection ? 'Protected' : 'Standard'}`);
      fetchData();
    } catch {
      showToast('Network error updating group protection', 'error');
    }
  };

  // Toggle Group No-Internet Tag (Admin only, with conflict handling)
  const handleToggleNoInternet = async (group: Group, conflictAction?: 'force_add' | 'remove_from_group') => {
    try {
      const nextNoInternet = conflictAction ? true : !group.is_no_internet;
      const res = await fetch('/api/groups', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: group.id,
          is_no_internet: nextNoInternet,
          conflict_action: conflictAction,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to update No Internet status');
        return;
      }

      if (data.conflict) {
        setConflictModalData({
          targetGroup: group,
          conflicts: data.conflicts,
        });
        return;
      }

      setConflictModalData(null);
      showToast(
        nextNoInternet
          ? `Group "${group.name}" tagged as No Internet. Internet blocked for members.`
          : `Group "${group.name}" restored to Internet Access.`
      );
      fetchData();
    } catch {
      showToast('Network error updating No Internet tag', 'error');
    }
  };

  // Group Management: Delete Group with auto-reassignment to Default
  const handleDeleteGroup = async (group: Group) => {
    if (group.name.toLowerCase() === 'default') {
      alert('The "Default" fallback group cannot be deleted.');
      return;
    }

    if (group.is_protected && currentUser?.role !== 'admin') {
      alert('This group is Protected. Only administrators can delete protected groups.');
      return;
    }

    const confirmDel = window.confirm(
      `Delete group "${group.name}"?\n\nAll MAC addresses currently under this group will automatically be reassigned to the "Default" group.`
    );
    if (!confirmDel) return;

    try {
      const res = await fetch(`/api/groups?id=${group.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to delete group');
        return;
      }

      showToast(data.message || `Group "${group.name}" deleted`);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Network error deleting group');
    }
  };

  // Open Edit Dialog
  const openEditModal = (user: UserViewModel) => {
    setModalMode('EDIT');
    setEditingUserId(user.id);
    setFormName(user.name);
    setFormMac(user.mac_address);
    setFormGroupIds(user.groups.map((g) => g.id));
    setFormError(null);
  };

  // Open History Dialog
  const openHistoryModal = async () => {
    setShowHistory(true);
    try {
      const res = await fetch('/api/config/history');
      const data = await res.json();
      if (data.history) setHistoryList(data.history);
    } catch (e) {
      console.error(e);
    }
  };

  // Auth Loading Screen
  if (authChecking) {
    return (
      <div className="auth-page-container" style={{ background: 'var(--bg-app)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: 'var(--text-secondary)', fontSize: '0.86rem', fontWeight: 500 }}>
          <span className="gateway-pill-dot" style={{ animation: 'pulse 1s infinite' }}></span>
          <span>Connecting to OpenWrt Gateway...</span>
        </div>
      </div>
    );
  }

  // Login Screen if Unauthenticated
  if (!currentUser) {
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

          <form className="auth-form" onSubmit={handleLogin}>
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

  return (
    <div className="app-shell">
      {/* ============================================================
          LEFT VERTICAL SIDEBAR (240px - 260px)
          ============================================================ */}
      <aside className="sidebar">
        <div className="sidebar-top">
          {/* Logo & Header */}
          <div className="brand-header">
            <div className="brand-icon-box">W</div>
            <div className="brand-text-col">
              <span className="brand-title">OpenWrt Manager</span>
              <span className="brand-subtitle">GATEWAY ACCESS</span>
            </div>
          </div>

          {/* Navigation Menu (Users replaced by Account) */}
          <ul className="nav-menu">
            <li>
              <button
                className={`nav-item-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => handleTabChange('dashboard')}
              >
                <span className="nav-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
                  </svg>
                </span>
                <span className="nav-label-text">Dashboard</span>
              </button>
            </li>
            <li>
              <button
                className={`nav-item-btn ${activeTab === 'groups' ? 'active' : ''}`}
                onClick={() => handleTabChange('groups')}
              >
                <span className="nav-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </span>
                <span className="nav-label-text">Groups</span>
              </button>
            </li>
            <li>
              <button
                className={`nav-item-btn ${activeTab === 'account' ? 'active' : ''}`}
                onClick={() => handleTabChange('account')}
              >
                <span className="nav-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <span className="nav-label-text">Account</span>
              </button>
            </li>
            <li>
              <button
                className={`nav-item-btn ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => handleTabChange('settings')}
              >
                <span className="nav-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </span>
                <span className="nav-label-text">Settings</span>
              </button>
            </li>
          </ul>
        </div>

        {/* Sidebar Footer Status */}
        <div className="sidebar-bottom">
          <div className="system-status-row">
            <span className="status-indicator-dot"></span>
            <span>System Online</span>
          </div>
          <span className="system-version-sub">OpenWrt v23.05.5</span>
        </div>
      </aside>

      {/* ============================================================
          MAIN WRAPPER (TOP BAR + CONTENT)
          ============================================================ */}
      <div className="main-wrapper">
        {/* Minimal Top Bar */}
        <header className="top-header">
          {/* Mobile Brand Title (shown on mobile devices where sidebar is at bottom) */}
          <div className="mobile-header-brand">
            <div className="brand-icon-box" style={{ width: '28px', height: '28px', fontSize: '0.88rem', borderRadius: 'var(--radius-sm)' }}>W</div>
            <div className="brand-text-col">
              <span className="brand-title" style={{ fontSize: '0.88rem', lineHeight: 1.1 }}>OpenWrt</span>
              <span className="brand-subtitle" style={{ fontSize: '0.55rem' }}>GATEWAY</span>
            </div>
          </div>

          <div className="top-header-actions">
            {/* Direct Configuration Downloads & History */}
            <button className="btn btn-ghost btn-sm" onClick={openHistoryModal} style={{ fontSize: '0.8rem' }}>
              History
            </button>
            <a
              href="/api/config/firewall?download=true"
              className="btn btn-ghost btn-sm"
              download="firewall"
              style={{ fontSize: '0.8rem' }}
            >
              firewall
            </a>
            <a
              href="/api/config/ethers?download=true"
              className="btn btn-ghost btn-sm"
              download="ethers"
              style={{ fontSize: '0.8rem' }}
            >
              ethers
            </a>

            {/* Theme Toggle Capsule */}
            <div className="theme-toggle-capsule">
              <button
                type="button"
                className={`theme-btn-option ${theme === 'light' ? 'active' : ''}`}
                onClick={() => switchTheme('light')}
                title="Light Mode"
                aria-label="Light Mode"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              </button>
              <button
                type="button"
                className={`theme-btn-option ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => switchTheme('dark')}
                title="Dark Mode"
                aria-label="Dark Mode"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              </button>
            </div>

            {/* Compact Account Avatar & Dropdown Popover */}
            <div className="user-menu-wrapper" ref={userDropdownRef}>
              <button
                type="button"
                className={`user-avatar-btn ${showUserDropdown ? 'active' : ''}`}
                onClick={() => setShowUserDropdown((prev) => !prev)}
                title={`Account: ${currentUser.username} (${currentUser.role})`}
                aria-label="User Account Menu"
                aria-expanded={showUserDropdown}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </button>

              {showUserDropdown && (
                <div className="user-dropdown-popover">
                  {/* User Profile Header */}
                  <div className="user-dropdown-header">
                    <div className="user-dropdown-avatar">
                      {currentUser.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="user-dropdown-details">
                      <div className="user-dropdown-name">{currentUser.username}</div>
                      <div className="user-dropdown-role-row">
                        <span className={`badge-role badge-role-${currentUser.role}`}>
                          {currentUser.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="user-dropdown-divider" />

                  {/* Dropdown Options */}
                  <div className="user-dropdown-items">
                    <button
                      type="button"
                      className="user-dropdown-item"
                      onClick={() => {
                        setShowUserDropdown(false);
                        handleTabChange('account');
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      <span>Account Management</span>
                    </button>

                    <button
                      type="button"
                      className="user-dropdown-item"
                      onClick={() => {
                        setShowUserDropdown(false);
                        handleTabChange('settings');
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                      </svg>
                      <span>Gateway Settings</span>
                    </button>

                    {currentUser?.role === 'admin' && (
                      <button
                        type="button"
                        className="user-dropdown-item"
                        onClick={() => {
                          setShowUserDropdown(false);
                          openPasswordModal({
                            id: currentUser.id,
                            username: currentUser.username,
                            role: currentUser.role,
                          });
                        }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <span>Change Password</span>
                      </button>
                    )}

                    <div className="user-dropdown-divider" />

                    <button
                      type="button"
                      className="user-dropdown-item item-danger"
                      onClick={() => {
                        setShowUserDropdown(false);
                        handleLogout();
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dashboard Main Content */}
        <main className="dashboard-container">
          {/* Toast Notification */}
          {notification && (
            <div className="toast-notice">
              <span>{notification.message}</span>
              <button
                onClick={() => setNotification(null)}
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                aria-label="Close notification"
              >
                <IconClose size={12} />
              </button>
            </div>
          )}

          {/* ============================================================
              VIEW 1: DASHBOARD / USERS (MAIN ACCESS MANAGER)
              ============================================================ */}
          {activeTab === 'dashboard' && (
            <>
              {/* Small Top Pill */}
              <div>
                <div className="gateway-pill">
                  <span className="gateway-pill-dot"></span>
                  <span>Single Gateway Access Management</span>
                </div>
              </div>

              {/* Page Headline */}
              <div className="header-row" style={{ alignItems: 'flex-start' }}>
                <div className="title-col">
                  <h1 className="page-headline">MAC Authentication</h1>
                  <p className="page-description">
                    Publish deterministic access control policies and static DHCP lease bindings directly to your OpenWrt router.
                  </p>
                </div>
                <div className="actions-col" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {stats.mac_auth && !stats.mac_auth.enabled ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-md)' }}>
                      <span className="status-indicator-dot" style={{ background: '#ef4444' }}></span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ef4444' }}>
                        MAC Auth: OFF (Open{stats.mac_auth.disabled_until ? ` until ${new Date(stats.mac_auth.disabled_until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ' permanently'})
                      </span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-md)' }}>
                      <span className="status-indicator-dot" style={{ background: '#10b981' }}></span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#10b981' }}>
                        MAC Auth: ON (Enforced)
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    className={`btn ${stats.mac_auth && !stats.mac_auth.enabled ? 'btn-primary' : 'btn-secondary'}`}
                    disabled={isUpdatingMacAuth}
                    onClick={handleToggleMacAuthClick}
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.95rem', fontWeight: 600 }}
                  >
                    {isUpdatingMacAuth ? 'Updating...' : stats.mac_auth && !stats.mac_auth.enabled ? 'Turn ON MAC Auth' : 'Turn OFF MAC Auth'}
                  </button>
                </div>
              </div>

              {/* Statistics Cards Row */}
              <div className="stats-cards-row">
                {/* Card 1: Published Users */}
                <div className="stat-card-box">
                  <div className="stat-top-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.7 }}>
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                      </svg>
                      <span className="stat-title-label">PUBLISHED USERS</span>
                    </div>
                    <span className="stat-index-badge">01</span>
                  </div>
                  <div className="stat-big-value">{stats.total_users}</div>
                  <div className="stat-footer-text">Active client rules</div>
                </div>

                {/* Card 2: Groups (Clicking switches to Groups page) */}
                <div
                  className="stat-card-box"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleTabChange('groups')}
                >
                  <div className="stat-top-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.7 }}>
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      <span className="stat-title-label">GROUPS</span>
                    </div>
                    <span className="stat-index-badge">02</span>
                  </div>
                  <div className="stat-big-value">{stats.total_groups}</div>
                  <div className="stat-footer-text">Click to add/delete groups</div>
                </div>

                {/* Card 3: Pending Draft */}
                <div className="stat-card-box">
                  <div className="stat-top-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.7 }}>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                      <span className="stat-title-label">PENDING DRAFT</span>
                    </div>
                    <span className="stat-index-badge">03</span>
                  </div>
                  <div className="stat-big-value">{stats.pending_changes}</div>
                  <div className="stat-footer-text">
                    {stats.pending_changes > 0 ? 'Draft unapplied modifications' : 'Synchronized with router'}
                  </div>
                </div>

                {/* Card 4: Config Version */}
                <div className="stat-card-box">
                  <div className="stat-top-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.7 }}>
                        <polyline points="16 18 22 12 16 6" />
                        <polyline points="8 6 2 12 8 18" />
                      </svg>
                      <span className="stat-title-label">CONFIG VERSION</span>
                    </div>
                    <span className="stat-index-badge">04</span>
                  </div>
                  <div className="stat-big-value">v{stats.current_version ?? 1}</div>
                  <div className="stat-footer-text">
                    {stats.last_applied
                      ? `Live since ${new Date(stats.last_applied).toLocaleDateString('en-US')}`
                      : 'Live since 9/27/2026'}
                  </div>
                </div>
              </div>

              {/* Horizontal Quick Add Bar (MAC address first -> Name -> Group (optional) -> Add User) */}
              <div className="horizontal-add-card">
                <div className="horizontal-add-header">
                  <div className="horizontal-add-title">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span>Quick Register Device</span>
                  </div>
                </div>

                <form className="horizontal-add-form" onSubmit={handleAddUserDirect}>
                  {/* Field 1: MAC Address (6 separate 2-character boxes) */}
                  <div className="add-bar-field field-mac">
                    <label className="add-bar-label">MAC Address</label>
                    <div className="mac-segmented-box">
                      {macOctets.map((octet, idx) => (
                        <React.Fragment key={idx}>
                          <input
                            ref={(el) => { macInputRefs.current[idx] = el; }}
                            type="text"
                            maxLength={2}
                            className="mac-octet-input"
                            placeholder="00"
                            value={octet}
                            onChange={(e) => handleMacChange(idx, e.target.value)}
                            onKeyDown={(e) => handleMacKeyDown(idx, e)}
                            onPaste={(e) => handleMacPaste(idx, e)}
                            autoCapitalize="characters"
                            autoComplete="off"
                            spellCheck={false}
                          />
                          {idx < 5 && <span className="mac-octet-sep">:</span>}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  {/* Field 2: Name */}
                  <div className="add-bar-field field-name">
                    <label className="add-bar-label">User / Device Name</label>
                    <input
                      ref={nameInputRef}
                      type="text"
                      className="add-bar-name-input"
                      placeholder="e.g. ratul ahmed or Rezwan-Ahmed"
                      value={addName}
                      onChange={(e) => {
                        setAddName(e.target.value);
                        setAddError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !addName) {
                          macInputRefs.current[5]?.focus();
                        }
                      }}
                    />
                  </div>

                  {/* Field 3: Group */}
                  <div className="add-bar-field field-group">
                    <label className="add-bar-label">Group</label>
                    <select
                      className="add-bar-group-select"
                      value={addSelectedGroup}
                      onChange={(e) => setAddSelectedGroup(e.target.value)}
                    >
                      {groups.map((g) => {
                        const isRestricted = currentUser.role === 'subadmin' && g.is_protected;
                        let suffix = '';
                        if (g.is_protected) suffix = ' (Protected)';
                        if (g.is_no_internet) suffix = ' (No Internet)';
                        return (
                          <option key={g.id} value={g.id} disabled={isRestricted}>
                            {g.name}{suffix}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Field 4: Add User Action */}
                  <div className="add-bar-field field-action">
                    <button
                      type="submit"
                      className="btn btn-primary add-bar-submit-btn"
                      disabled={isAdding}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      <span>{isAdding ? 'Adding...' : 'Add User'}</span>
                    </button>
                  </div>
                </form>

                {groups.find((g) => g.id === addSelectedGroup)?.is_no_internet && (
                  <div className="form-exclusive-notice" style={{ marginTop: '0.65rem' }}>
                    <IconBan size={15} />
                    <span><strong>No Internet Policy:</strong> WAN access will be blocked for this MAC address via dedicated firewall rule.</span>
                  </div>
                )}

                {addError && (
                  <div className="add-bar-alert-error">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{addError}</span>
                  </div>
                )}
              </div>

              {/* Search / Filter Container */}
              <div className="search-filter-container">
                <div className="search-field-box">
                  <span className="search-icon-symbol">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    className="search-text-input"
                    placeholder="Search user name or MAC address..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <select
                  className="group-dropdown-select"
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                >
                  <option value="ALL">All Groups</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} {g.is_no_internet ? '(No Internet)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* User Table */}
              <div className="table-card-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '150px' }}>STATUS</th>
                      <th>NAME</th>
                      <th>MAC ADDRESS</th>
                      <th>ASSIGNED GROUPS</th>
                      <th style={{ textAlign: 'right', width: '150px' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-secondary)' }}>
                          {loading ? 'Loading users...' : 'No users found.'}
                        </td>
                      </tr>
                    ) : (
                      displayedUsers.map((u) => {
                        const isNoInternetUser = u.groups?.some((g) => g.is_no_internet);
                        return (
                          <tr key={u.id} style={{ opacity: u.status === 'deleted' ? 0.4 : 1 }}>
                            <td>
                              {isNoInternetUser ? (
                                <span className="badge-no-internet" title="Internet access blocked by firewall rule">
                                  <IconBan size={12} style={{ marginRight: '0.35rem' }} />
                                  <span>No Internet</span>
                                </span>
                              ) : (
                                <span className={`status-badge-capsule status-badge-${u.status}`}>
                                  <span className="status-green-dot"></span>
                                  <span>{u.status}</span>
                                </span>
                              )}
                            </td>
                            <td>
                              <span className="user-name-cell">{u.name}</span>
                            </td>
                            <td>
                              <span className="mac-address-pill">{u.mac_address}</span>
                            </td>
                            <td>
                              <div className="group-tags-wrap">
                                {u.groups && u.groups.length > 0 ? (
                                  u.groups.map((g) => (
                                    <span
                                      key={g.id}
                                      className="group-tag-pill"
                                      style={
                                        g.is_no_internet
                                          ? { borderColor: 'rgba(220, 38, 38, 0.4)', background: 'rgba(220, 38, 38, 0.08)' }
                                          : undefined
                                      }
                                    >
                                      {g.is_no_internet && (
                                        <IconBan size={11} style={{ marginRight: '0.25rem' }} />
                                      )}
                                      {g.name}
                                      {g.is_protected && (
                                        <span style={{ marginLeft: '0.3rem', display: 'inline-flex', alignItems: 'center' }} title="Protected Group">
                                          <IconLock size={11} style={{ color: 'var(--text-secondary)' }} />
                                        </span>
                                      )}
                                    </span>
                                  ))
                                ) : (
                                  <span className="group-tag-pill">Default</span>
                                )}
                              </div>
                            </td>
                            <td>
                              {u.status !== 'deleted' ? (
                                <div className="table-actions-cell">
                                  {u.groups?.some((g) => g.is_protected) && currentUser.role === 'subadmin' ? (
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }} title="User is assigned to a protected group. Only administrators can edit or delete this user.">
                                      <IconLock size={11} />
                                      <span>Protected (Admin Only)</span>
                                    </span>
                                  ) : (
                                    <>
                                      <button
                                        className="btn-text-action"
                                        onClick={() => openEditModal(u)}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        className="btn-text-action"
                                        onClick={() => handleDeleteUser(u)}
                                      >
                                        Delete
                                      </button>
                                    </>
                                  )}
                                </div>
                              ) : (
                                <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  Pending Delete
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ============================================================
              VIEW 2: SEPARATE DEDICATED GROUPS PAGE
              Opened by clicking "Groups" in the left sidebar
              ============================================================ */}
          {activeTab === 'groups' && (
            <div>
              {/* Small Top Pill */}
              <div>
                <div className="gateway-pill">
                  <span className="gateway-pill-dot"></span>
                  <span>Organizational Taxonomies</span>
                </div>
              </div>

              {/* Groups Page Headline */}
              <div className="header-row">
                <div className="title-col">
                  <h1 className="page-headline">Manage Groups</h1>
                  <p className="page-description">
                    Create and manage organizational groups for network devices. Deleting a group automatically reassigns all affected MAC addresses to the &quot;Default&quot; group.
                  </p>
                </div>
                <div className="actions-col">
                  <button className="btn btn-secondary" onClick={() => handleTabChange('dashboard')}>
                    ← Back to Dashboard
                  </button>
                </div>
              </div>

              {/* Create Group Form Card */}
              <div className="groups-create-card">
                <form onSubmit={handleCreateGroup}>
                  <label className="form-label-title">Add New Group</label>
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.45rem', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      className="form-input-element"
                      placeholder="e.g. Contractors, IoT Devices, Office..."
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      style={{ maxWidth: '420px' }}
                    />
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={groupLoading || !newGroupName.trim()}
                    >
                      + Add Group
                    </button>
                  </div>

                  {currentUser.role === 'admin' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.75rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem', cursor: newGroupIsNoInternet ? 'not-allowed' : 'pointer', color: 'var(--text-primary)', opacity: newGroupIsNoInternet ? 0.5 : 1 }}>
                        <input
                          type="checkbox"
                          disabled={newGroupIsNoInternet}
                          checked={newGroupIsProtected}
                          onChange={(e) => {
                            setNewGroupIsProtected(e.target.checked);
                            if (e.target.checked) setNewGroupIsNoInternet(false);
                          }}
                        />
                        <span>Tag as <strong>Protected Group</strong> (Subadmins cannot assign, edit, or delete users under this group)</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem', cursor: newGroupIsProtected ? 'not-allowed' : 'pointer', color: 'var(--text-primary)', opacity: newGroupIsProtected ? 0.5 : 1 }}>
                        <input
                          type="checkbox"
                          disabled={newGroupIsProtected}
                          checked={newGroupIsNoInternet}
                          onChange={(e) => {
                            setNewGroupIsNoInternet(e.target.checked);
                            if (e.target.checked) setNewGroupIsProtected(false);
                          }}
                        />
                        <span>Tag as <strong>No Internet Group</strong> (WAN access blocked by dedicated OpenWrt firewall rule)</span>
                      </label>
                    </div>
                  )}

                  {groupError && <div className="form-alert-msg" style={{ marginTop: '0.75rem', maxWidth: '420px' }}>{groupError}</div>}
                </form>
              </div>

              {/* Groups Table Card */}
              <div className="table-card-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>GROUP NAME</th>
                      <th>TOTAL USERS</th>
                      <th>ACCESS &amp; PROTECTION TAGS</th>
                      <th style={{ textAlign: 'right', width: '280px' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((group) => {
                      const isDefault = group.name.toLowerCase() === 'default';
                      const userCount = users.filter((u) => u.groups.some((g) => g.id === group.id)).length;
                      return (
                        <tr key={group.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                                {group.name}
                              </span>
                              {isDefault && (
                                <span className="fallback-badge">
                                  FALLBACK
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span style={{ color: 'var(--text-secondary)' }}>
                              {userCount} {userCount === 1 ? 'client' : 'clients'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                              {group.is_protected && (
                                <span className="badge-protected">
                                  <IconLock size={12} style={{ marginRight: '0.3rem' }} />
                                  <span>Protected</span>
                                </span>
                              )}
                              {group.is_no_internet ? (
                                <span className="badge-no-internet">
                                  <IconBan size={12} style={{ marginRight: '0.3rem' }} />
                                  <span>No Internet</span>
                                </span>
                              ) : (
                                !group.is_protected && (
                                  <span className="badge-internet">
                                    <IconGlobe size={12} style={{ marginRight: '0.3rem' }} />
                                    <span>Internet Allowed</span>
                                  </span>
                                )
                              )}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', alignItems: 'center' }}>
                              {currentUser.role === 'admin' && !isDefault && (
                                <>
                                  {!group.is_no_internet && (
                                    <button
                                      type="button"
                                      className="btn-text-action"
                                      onClick={() => handleToggleProtection(group.id, Boolean(group.is_protected))}
                                    >
                                      {group.is_protected ? 'Unprotect' : 'Make Protected'}
                                    </button>
                                  )}
                                  {!group.is_protected && (
                                    <button
                                      type="button"
                                      className="btn-text-action"
                                      onClick={() => handleToggleNoInternet(group)}
                                    >
                                      {group.is_no_internet ? 'Allow Internet' : 'Tag No Internet'}
                                    </button>
                                  )}
                                </>
                              )}
                              {!isDefault ? (
                                <button
                                  type="button"
                                  className="btn-text-action"
                                  style={{ color: '#ef4444' }}
                                  onClick={() => handleDeleteGroup(group)}
                                >
                                  Delete
                                </button>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  Permanent
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ============================================================
              VIEW 3: ACCOUNT TAB (ADMIN & SUBADMIN MANAGEMENT)
              ============================================================ */}
          {activeTab === 'account' && (
            <div>
              {/* Small Top Pill */}
              <div>
                <div className="gateway-pill">
                  <span className="gateway-pill-dot"></span>
                  <span>Identity & Role Privileges</span>
                </div>
              </div>

              {/* Account Headline */}
              <div className="header-row">
                <div className="title-col">
                  <h1 className="page-headline">Account Management</h1>
                  <p className="page-description">
                    Manage administrative roles, subadmin credentials, and system privileges.
                  </p>
                </div>
                <div className="actions-col">
                  <button className="btn btn-secondary" onClick={() => handleTabChange('dashboard')}>
                    ← Back to Dashboard
                  </button>
                </div>
              </div>

              {/* My Account Card */}
              <div className="account-info-box">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.85rem', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="brand-icon-box" style={{ width: '36px', height: '36px', fontSize: '1rem' }}>
                      {currentUser.username[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{currentUser.username}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Active authenticated session</div>
                    </div>
                  </div>
                  <span className={`badge-role badge-role-${currentUser.role}`}>{currentUser.role}</span>
                </div>

                <div className="account-details-grid">
                  <div className="account-detail-item">
                    <span className="account-detail-label">Account Role</span>
                    <span className="account-detail-value">{currentUser.role === 'admin' ? 'Administrator (Full Access)' : 'Subadmin (Restricted)'}</span>
                  </div>
                  <div className="account-detail-item">
                    <span className="account-detail-label">Protected Group Access</span>
                    <span className="account-detail-value">{currentUser.role === 'admin' ? 'Authorized (Create, Edit, Delete)' : 'Restricted (Admin Only)'}</span>
                  </div>
                  <div className="account-detail-item">
                    <span className="account-detail-label">Subadmin Creation</span>
                    <span className="account-detail-value">{currentUser.role === 'admin' ? 'Authorized' : 'Restricted (Admin Only)'}</span>
                  </div>
                  <div className="account-detail-item">
                    <span className="account-detail-label">Configuration Publish</span>
                    <span className="account-detail-value">Authorized</span>
                  </div>
                </div>
              </div>

              {/* Subadmin Management Section (Admin Only) */}
              {currentUser.role === 'admin' ? (
                <div>
                  <div style={{ marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Subadmin Accounts</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      Create credentials for subadmins. Subadmins can manage general users but cannot modify users assigned to protected groups.
                    </p>
                  </div>

                  {/* Create Subadmin Form */}
                  <div className="horizontal-add-card">
                    <div className="horizontal-add-title" style={{ marginBottom: '0.75rem' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      <span>Add New Subadmin</span>
                    </div>

                    <form className="subadmin-create-form" onSubmit={handleCreateSubadmin}>
                      <div className="add-bar-field" style={{ flex: 1, minWidth: '180px' }}>
                        <label className="add-bar-label">Username</label>
                        <input
                          type="text"
                          className="add-bar-name-input"
                          placeholder="e.g. net_operator"
                          value={newSubadminUsername}
                          onChange={(e) => setNewSubadminUsername(e.target.value)}
                          required
                        />
                      </div>

                      <div className="add-bar-field" style={{ flex: 1, minWidth: '180px' }}>
                        <label className="add-bar-label">Password</label>
                        <input
                          type="password"
                          className="add-bar-name-input"
                          placeholder="Assign password (min 4 chars)"
                          value={newSubadminPassword}
                          onChange={(e) => setNewSubadminPassword(e.target.value)}
                          required
                        />
                      </div>

                      <div className="add-bar-field">
                        <button
                          type="submit"
                          className="btn btn-primary add-bar-submit-btn"
                          disabled={subadminLoading}
                        >
                          <span>{subadminLoading ? 'Creating...' : '+ Create Subadmin'}</span>
                        </button>
                      </div>
                    </form>

                    {subadminError && (
                      <div className="add-bar-alert-error">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span>{subadminError}</span>
                      </div>
                    )}
                  </div>

                  {/* Accounts Table */}
                  <div className="table-card-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>USERNAME</th>
                          <th>ROLE</th>
                          <th>CREATED AT</th>
                          <th style={{ textAlign: 'right', minWidth: '180px' }}>ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {accountsList.map((acc) => (
                          <tr key={acc.id}>
                            <td>
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{acc.username}</span>
                            </td>
                            <td>
                              <span className={`badge-role badge-role-${acc.role}`}>{acc.role}</span>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                {acc.created_at ? new Date(acc.created_at).toLocaleDateString() : 'System default'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.85rem', justifyContent: 'flex-end' }}>
                                <button
                                  type="button"
                                  className="btn-text-action"
                                  onClick={() => openPasswordModal(acc)}
                                  style={{ color: 'var(--brand-primary, #6366f1)', fontWeight: 500 }}
                                >
                                  Change Password
                                </button>
                                {acc.role !== 'admin' ? (
                                  <button
                                    type="button"
                                    className="btn-text-action"
                                    onClick={() => handleDeleteSubadmin(acc.id, acc.username)}
                                    style={{ color: '#ef4444' }}
                                  >
                                    Delete
                                  </button>
                                ) : (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(Primary)</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="horizontal-add-card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Subadmin Privileges Notice</h3>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    You are logged in as a <strong>Subadmin</strong>. You can add, edit, and delete regular devices, as well as stage network draft configurations. However, subadmins cannot manage accounts or modify users in groups tagged as <strong>Protected</strong>.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ============================================================
              VIEW 4: DEDICATED REDESIGNED SETTINGS PAGE
              ============================================================ */}
          {activeTab === 'settings' && (
            <div className="settings-page-wrapper">
              {/* Small Top Pill */}
              <div>
                <div className="gateway-pill">
                  <span className="gateway-pill-dot"></span>
                  <span>System &amp; Gateway Configuration</span>
                </div>
              </div>

              {/* Header Row */}
              <div className="header-row">
                <div className="title-col">
                  <h1 className="page-headline">Settings</h1>
                  <p className="page-description">
                    Configure OpenWrt router synchronization, firewall security policies, automated polling frequency, and interface preferences.
                  </p>
                </div>
                <div className="actions-col" style={{ display: 'flex', gap: '0.65rem' }}>
                  <button className="btn btn-secondary" onClick={() => handleTabChange('dashboard')}>
                    ← Back to Dashboard
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => showToast('Settings preferences saved')}
                  >
                    Save Preferences
                  </button>
                </div>
              </div>

              {/* SECTION 1: Master MAC Authentication Control */}
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
                          Re-enables automatically on {new Date(stats.mac_auth.disabled_until).toLocaleString()}
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

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <button
                    type="button"
                    className={`btn ${stats.mac_auth && !stats.mac_auth.enabled ? 'btn-primary' : 'btn-secondary'}`}
                    disabled={isUpdatingMacAuth}
                    onClick={handleToggleMacAuthClick}
                    style={{ fontSize: '0.82rem', padding: '0.55rem 1.1rem', fontWeight: 700 }}
                  >
                    {isUpdatingMacAuth ? 'Updating...' : stats.mac_auth && !stats.mac_auth.enabled ? 'Turn ON MAC Auth' : 'Turn OFF MAC Auth'}
                  </button>
                </div>
              </div>

              {/* SECTION 2: Gateway Connection & Diagnostics */}
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
                    onClick={handleTestGateway}
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

              {/* SECTION 2: Firewall Security & Access Rules */}
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
                      Low-level packet filter parameters applied to `/etc/config/firewall`.
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

              {/* SECTION 3: API Endpoints & Secret Token */}
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
                      onClick={() => handleCopyText('openwrt-secret-token-change-in-production', 'token')}
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
                      onClick={() => handleCopyText('/api/config/version', 'endpoint')}
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
                        onClick={() => handleCopyText('/api/config/firewall', 'endpoint')}
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
                        <div className="endpoint-desc-text">Generates static DHCP hostname and MAC mappings for `/etc/ethers`.</div>
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
                        onClick={() => handleCopyText('/api/config/ethers', 'endpoint')}
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION: Redis In-Memory Caching & Performance Engine */}
              <div className="settings-section-card">
                <div className="settings-section-header">
                  <div className="settings-section-title-wrap">
                    <h2 className="settings-section-title">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                      </svg>
                      Redis Caching Engine &amp; Performance
                    </h2>
                    <p className="settings-section-desc">
                      High-performance in-memory cache accelerating router cron polling and API queries to sub-millisecond speeds.
                    </p>
                  </div>
                  {currentUser?.role === 'admin' && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={isPurgingCache}
                      onClick={handlePurgeCache}
                      style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="1 4 1 10 7 10"/>
                        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                      </svg>
                      <span>{isPurgingCache ? 'Purging...' : 'Purge Cache'}</span>
                    </button>
                  )}
                </div>

                <div className="settings-rows-list">
                  <div className="settings-row-item">
                    <div className="settings-row-info">
                      <span className="settings-row-label">Cache Engine Status</span>
                      <span className="settings-row-caption">State of the in-memory key-value caching daemon.</span>
                    </div>
                    <div className="settings-row-control">
                      <div className="gateway-pill" style={{ margin: 0 }}>
                        <span className="gateway-pill-dot" style={{ backgroundColor: cacheInfo?.connected ? '#22c55e' : '#eab308' }}></span>
                        <span style={{ fontWeight: 600 }}>
                          {cacheInfo?.engine === 'redis' ? 'Redis 7.0 (Active & Connected)' : 'In-Memory Cache (Active)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="settings-row-item">
                    <div className="settings-row-info">
                      <span className="settings-row-label">Memory Read Latency</span>
                      <span className="settings-row-caption">Time required to retrieve cached configuration payloads.</span>
                    </div>
                    <div className="settings-row-control">
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                        {cacheInfo?.pingMs !== undefined ? `${cacheInfo.pingMs} ms (Sub-millisecond)` : '< 1 ms'}
                      </span>
                    </div>
                  </div>

                  <div className="settings-row-item">
                    <div className="settings-row-info">
                      <span className="settings-row-label">Active Cached Objects</span>
                      <span className="settings-row-caption">Cached keys for users, config versions, firewall, and ethers.</span>
                    </div>
                    <div className="settings-row-control">
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                        {cacheInfo?.keysCount ?? 0} keys
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: Appearance & Theme Preferences */}
              <div className="settings-section-card">
                <div className="settings-section-header">
                  <div className="settings-section-title-wrap">
                    <h2 className="settings-section-title">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="5" />
                        <line x1="12" y1="1" x2="12" y2="3" />
                        <line x1="12" y1="21" x2="12" y2="23" />
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                        <line x1="1" y1="12" x2="3" y2="12" />
                        <line x1="21" y1="12" x2="23" y2="12" />
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                      </svg>
                      Appearance &amp; Theme
                    </h2>
                    <p className="settings-section-desc">
                      Customize interface themes with instant application and zero flash.
                    </p>
                  </div>
                </div>

                <div className="theme-picker-cards">
                  <button
                    type="button"
                    className={`theme-card-btn ${theme === 'light' ? 'active' : ''}`}
                    onClick={() => switchTheme('light')}
                  >
                    <div className="theme-card-preview-bar" style={{ background: '#fafafa', border: '1px solid #e5e7eb' }}>
                      <div style={{ width: '30%', background: '#ffffff', borderRight: '1px solid #e5e7eb' }}></div>
                      <div style={{ flex: 1, padding: '4px' }}>
                        <div style={{ height: '6px', width: '60%', background: '#111111', borderRadius: '2px', marginBottom: '3px' }}></div>
                        <div style={{ height: '4px', width: '40%', background: '#d1d5db', borderRadius: '2px' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="theme-card-title">Light Mode</div>
                      <div className="theme-card-desc">Clean monochrome SaaS aesthetic</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`theme-card-btn ${theme === 'dark' ? 'active' : ''}`}
                    onClick={() => switchTheme('dark')}
                  >
                    <div className="theme-card-preview-bar" style={{ background: '#050505', border: '1px solid #242424' }}>
                      <div style={{ width: '30%', background: '#09090b', borderRight: '1px solid #242424' }}></div>
                      <div style={{ flex: 1, padding: '4px' }}>
                        <div style={{ height: '6px', width: '60%', background: '#ffffff', borderRadius: '2px', marginBottom: '3px' }}></div>
                        <div style={{ height: '4px', width: '40%', background: '#333333', borderRadius: '2px' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="theme-card-title">Dark Mode</div>
                      <div className="theme-card-desc">High-contrast midnight theme</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* SECTION 5: Backup & Maintenance */}
              <div className="settings-section-card">
                <div className="settings-section-header">
                  <div className="settings-section-title-wrap">
                    <h2 className="settings-section-title">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      System Maintenance &amp; Backup
                    </h2>
                    <p className="settings-section-desc">
                      Archive configuration snapshots, download JSON backups, and view deployment audit logs.
                    </p>
                  </div>
                </div>

                <div className="settings-rows-list">
                  <div className="settings-row-item">
                    <div className="settings-row-info">
                      <span className="settings-row-label">Configuration History</span>
                      <span className="settings-row-caption">View the chronological audit log of all applied gateway versions.</span>
                    </div>
                    <div className="settings-row-control">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={openHistoryModal}
                      >
                        View Version History
                      </button>
                    </div>
                  </div>

                  <div className="settings-row-item">
                    <div className="settings-row-info">
                      <span className="settings-row-label">Export System Snapshot (JSON)</span>
                      <span className="settings-row-caption">Download a full JSON backup of all registered devices, groups, and tags.</span>
                    </div>
                    <div className="settings-row-control">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleExportConfig}
                      >
                        Download Backup
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ============================================================
          STICKY / FLOATING DRAFT BAR
          ============================================================ */}
      {stats.pending_changes > 0 && (
        <div className="floating-pending-bar-wrapper">
          <div className="floating-pending-bar">
            <div className="pending-left-info">
              <span className="pending-dot-pulse"></span>
              <span>
                {stats.pending_changes} pending {stats.pending_changes === 1 ? 'change' : 'changes'} in draft
              </span>
            </div>
            <div className="pending-btn-actions">
              <button
                className="btn btn-secondary"
                onClick={handleUndo}
                style={{ padding: '0.45rem 0.95rem', fontSize: '0.8rem' }}
              >
                Undo
              </button>
              <button
                className="btn btn-ghost"
                onClick={handleDiscard}
                style={{ color: 'inherit', padding: '0.45rem 0.95rem', fontSize: '0.8rem' }}
              >
                Discard
              </button>
              <button
                className="btn btn-primary"
                onClick={handleApply}
                style={{ padding: '0.45rem 1.1rem', fontSize: '0.8rem' }}
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODALS
          ============================================================ */}

      {/* Edit User Modal (Only opens when clicking "Edit" in the table) */}
      {modalMode === 'EDIT' && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header-row">
              <h3 className="modal-headline">Edit User</h3>
              <button onClick={() => setModalMode(null)} className="modal-close-icon" aria-label="Close">
                <IconClose size={13} />
              </button>
            </div>

            <form onSubmit={handleSaveUser}>
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
                <div className="form-help-caption">Formats any 12-char hex string, colons, or dashes into canonical format.</div>
              </div>

              <div className="form-group-block">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label className="form-label-title" style={{ marginBottom: 0 }}>Assigned Groups</label>
                  <button
                    type="button"
                    onClick={() => { setModalMode(null); handleTabChange('groups'); }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Go to Groups Page →
                  </button>
                </div>
                <div className="checkbox-tags-grid">
                  {groups.map((group) => {
                    const isChecked = formGroupIds.includes(group.id);
                    const isRestrictedForSubadmin = currentUser?.role === 'subadmin' && group.is_protected;

                    // Protected incompatibility: cannot assign to No Internet if currently in or selecting protected group
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
                              ? 'Cannot assign to No Internet while assigned to protected group. Remove protected group first.'
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
                                // Rule: exclusive No Internet - replace all other regular groups
                                setFormGroupIds([group.id]);
                              } else {
                                // Rule: adding regular group removes any No Internet group
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
                    <span><strong>No Internet Policy:</strong> Devices in a No Internet group cannot be assigned to any group with internet access. Internet access will be blocked via firewall rule.</span>
                  </div>
                )}

                {formGroupIds.some((id) => groups.find((g) => g.id === id)?.is_protected) && (
                  <div className="form-exclusive-notice">
                    <IconLock size={15} />
                    <span><strong>Protected Group:</strong> Users in protected groups cannot be placed into No Internet groups unless removed from protected groups first.</span>
                  </div>
                )}

                <div className="form-help-caption">No Internet groups block WAN access via dedicated firewall rule. Regular groups allow internet access.</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '1.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalMode(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '750px' }}>
            <div className="modal-header-row">
              <h3 className="modal-headline">Configuration History</h3>
              <button onClick={() => setShowHistory(false)} className="modal-close-icon" aria-label="Close">
                <IconClose size={13} />
              </button>
            </div>

            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Version</th>
                    <th>Users</th>
                    <th>SHA-256 Hash</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {historyList.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                        No published configurations found.
                      </td>
                    </tr>
                  ) : (
                    historyList.map((h) => (
                      <tr key={h.id}>
                        <td>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            v{h.version} {h.is_current && ' (Live)'}
                          </span>
                        </td>
                        <td>{h.user_count}</td>
                        <td>
                          <span className="mac-address-pill" style={{ fontSize: '0.72rem' }}>
                            {h.hash ? h.hash.substring(0, 16) + '...' : 'N/A'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                          {new Date(h.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowHistory(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAC Authentication Schedule / Disable Modal */}
      {showMacAuthModal && (
        <div className="modal-backdrop">
          <div className="mac-auth-modal-card">
            <div className="modal-header-row">
              <h3 className="modal-headline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <IconUnlock size={17} />
                <span>Turn OFF MAC Authentication</span>
              </h3>
              <button
                onClick={() => setShowMacAuthModal(false)}
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
                onClick={() => setShowMacAuthModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={isUpdatingMacAuth}
                onClick={handleConfirmDisableMacAuth}
              >
                {isUpdatingMacAuth ? 'Applying...' : 'Confirm & Turn OFF'}
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Multi-Group Conflict Modal (No Internet Group Tagging) */}
      {conflictModalData && (
        <div className="conflict-modal-overlay">
          <div className="conflict-modal-card">
            <div className="modal-header-row">
              <h3 className="modal-headline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <IconAlertTriangle size={18} />
                <span>Warning: Multi-Group Conflict</span>
              </h3>
              <button
                onClick={() => setConflictModalData(null)}
                className="modal-close-icon"
                disabled={isResolvingConflict}
                aria-label="Close"
              >
                <IconClose size={13} />
              </button>
            </div>

            <div className="conflict-warning-box">
              <div className="conflict-warning-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconAlertTriangle size={22} />
              </div>
              <div style={{ fontSize: '0.84rem', lineHeight: 1.5, color: 'var(--text-primary)' }}>
                <strong>Policy Violation:</strong> No user can be a member of a &quot;No Internet&quot; group and another group that has internet access.
                <div style={{ marginTop: '0.35rem', color: 'var(--text-secondary)' }}>
                  The following user(s) in group <strong>&quot;{conflictModalData.targetGroup.name}&quot;</strong> are also members of other internet-enabled groups:
                </div>
              </div>
            </div>

            <div className="conflict-users-list">
              {conflictModalData.conflicts.map((c) => (
                <div key={c.userId} className="conflict-user-card">
                  <div className="conflict-user-meta">
                    <span className="conflict-user-name">{c.userName}</span>
                    <span className="conflict-user-mac">{c.mac}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                      Also in:
                    </div>
                    <div className="conflict-other-groups">
                      {c.otherGroups.map((gName, idx) => (
                        <span key={idx} className="group-tag-pill">
                          {gName}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="conflict-actions-footer">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={isResolvingConflict}
                onClick={() => setConflictModalData(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-conflict-remove"
                disabled={isResolvingConflict}
                onClick={async () => {
                  setIsResolvingConflict(true);
                  await handleToggleNoInternet(conflictModalData.targetGroup, 'remove_from_group');
                  setIsResolvingConflict(false);
                }}
                title="Removes these users from this group only. They will keep their other groups."
              >
                {isResolvingConflict ? 'Resolving...' : 'Remove from this Group'}
              </button>
              <button
                type="button"
                className="btn-force-danger"
                disabled={isResolvingConflict}
                onClick={async () => {
                  setIsResolvingConflict(true);
                  await handleToggleNoInternet(conflictModalData.targetGroup, 'force_add');
                  setIsResolvingConflict(false);
                }}
                title="Removes these users from other groups and keeps them only in this No Internet group."
              >
                {isResolvingConflict ? 'Resolving...' : 'Force Add to No Internet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal (Admin Only) */}
      {passwordModalAccount && currentUser?.role === 'admin' && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '440px' }}>
            <div className="modal-header-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(99, 102, 241, 0.12)',
                  color: 'var(--brand-primary, #6366f1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <div>
                  <h3 className="modal-headline" style={{ margin: 0 }}>Change Password</h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Updating password for <strong style={{ color: 'var(--text-primary)' }}>{passwordModalAccount.username}</strong> ({passwordModalAccount.role})
                  </div>
                </div>
              </div>
              <button onClick={closePasswordModal} className="modal-close-icon" aria-label="Close">
                <IconClose size={13} />
              </button>
            </div>

            <form onSubmit={handleChangePassword}>
              {passwordModalError && (
                <div className="form-alert-msg" style={{ marginBottom: '1rem' }}>
                  {passwordModalError}
                </div>
              )}

              <div className="form-group-block">
                <label className="form-label-title">New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPasswordText ? "text" : "password"}
                    className="form-input-element"
                    placeholder="Enter new password (min. 4 characters)"
                    value={newPasswordVal}
                    onChange={(e) => setNewPasswordVal(e.target.value)}
                    required
                    minLength={4}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      padding: '4px',
                    }}
                  >
                    {showPasswordText ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="form-group-block">
                <label className="form-label-title">Confirm New Password</label>
                <input
                  type={showPasswordText ? "text" : "password"}
                  className="form-input-element"
                  placeholder="Re-enter new password"
                  value={confirmPasswordVal}
                  onChange={(e) => setConfirmPasswordVal(e.target.value)}
                  required
                  minLength={4}
                />
              </div>

              <div className="modal-footer-row" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closePasswordModal}
                  disabled={passwordModalLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={passwordModalLoading}
                >
                  {passwordModalLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
