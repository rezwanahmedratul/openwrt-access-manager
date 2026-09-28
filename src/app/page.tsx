'use client';

import React, { useState, useEffect, useRef } from 'react';
import { UserViewModel, Group, DashboardStats, SessionUser } from '@/lib/types';
import { normalizeMac } from '@/lib/normalize-mac';
import { normalizeName } from '@/lib/normalize-name';

export default function DashboardPage() {
  // Authentication & Session State
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [loginUsername, setLoginUsername] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('admin123');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Subadmin Management State (for Account tab)
  const [accountsList, setAccountsList] = useState<any[]>([]);
  const [newSubadminUsername, setNewSubadminUsername] = useState('');
  const [newSubadminPassword, setNewSubadminPassword] = useState('');
  const [subadminError, setSubadminError] = useState<string | null>(null);
  const [subadminLoading, setSubadminLoading] = useState(false);

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
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Theme Management (Light / Dark Mode)
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Navigation state: 'dashboard' | 'groups' | 'account' | 'settings'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'groups' | 'account' | 'settings'>('dashboard');

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
  const [groupError, setGroupError] = useState<string | null>(null);
  const [groupLoading, setGroupLoading] = useState(false);

  // History Modal State
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);

  // Settings Modal State
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Feedback Notification
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
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

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/users?search=${encodeURIComponent(search)}&group=${encodeURIComponent(selectedGroup)}`);
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

  useEffect(() => {
    if (currentUser) {
      fetchData();
      if (currentUser.role === 'admin') {
        fetchAccounts();
      }
    }
  }, [search, selectedGroup, currentUser]);

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
      setActiveTab('dashboard');
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
        showToast(data.error || 'Failed to update group protection', 'error');
        return;
      }
      showToast(`Group protection updated to ${!currentProtection ? 'Protected' : 'Standard'}`);
      fetchData();
    } catch {
      showToast('Network error updating group protection', 'error');
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
      <div className="auth-page-container">
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', fontWeight: 500 }}>
          Authenticating gateway session...
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

          {/* Quick Credential Test Buttons */}
          <div className="auth-quick-creds">
            <span>Test Role Credentials:</span>
            <div className="auth-creds-pills">
              <button
                type="button"
                className="auth-role-pill-btn"
                onClick={() => {
                  setLoginUsername('admin');
                  setLoginPassword('admin123');
                }}
              >
                <strong>Admin</strong> (admin / admin123)
              </button>
              <button
                type="button"
                className="auth-role-pill-btn"
                onClick={() => {
                  setLoginUsername('subadmin');
                  setLoginPassword('subadmin123');
                }}
              >
                <strong>Subadmin</strong> (subadmin / subadmin123)
              </button>
            </div>
          </div>
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
                onClick={() => setActiveTab('dashboard')}
              >
                <span className="nav-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
                  </svg>
                </span>
                <span className="nav-label-text">Dashboard</span>
              </button>
            </li>
            <li>
              <button
                className={`nav-item-btn ${activeTab === 'groups' ? 'active' : ''}`}
                onClick={() => setActiveTab('groups')}
              >
                <span className="nav-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </span>
                <span className="nav-label-text">Groups</span>
              </button>
            </li>
            <li>
              <button
                className={`nav-item-btn ${activeTab === 'account' ? 'active' : ''}`}
                onClick={() => setActiveTab('account')}
              >
                <span className="nav-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </span>
                <span className="nav-label-text">Account</span>
              </button>
            </li>
            <li>
              <button
                className={`nav-item-btn ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => { setActiveTab('settings'); setShowSettingsModal(true); }}
              >
                <span className="nav-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
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
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/>
                  <line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
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
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              </button>
            </div>

            {/* User Session Profile Badge & Logout */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                className="user-profile-badge"
                title={`${currentUser.username} (${currentUser.role})`}
                onClick={() => setActiveTab('account')}
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.25rem 0.65rem',
                  width: 'auto',
                  height: '32px',
                  borderRadius: 'var(--radius-pill)',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{currentUser.username}</span>
                <span className={`badge-role badge-role-${currentUser.role}`}>{currentUser.role}</span>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleLogout}
                title="Sign out of gateway"
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem', height: '32px' }}
              >
                Sign Out
              </button>
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
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
              >
                ✕
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
              <div className="header-row">
                <div className="title-col">
                  <h1 className="page-headline">MAC Authentication</h1>
                  <p className="page-description">
                    Publish deterministic access control policies and static DHCP lease bindings directly to your OpenWrt router.
                  </p>
                </div>
              </div>

              {/* Statistics Cards Row */}
              <div className="stats-cards-row">
                {/* Card 1: Published Users */}
                <div className="stat-card-box">
                  <div className="stat-top-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.7 }}>
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
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
                  onClick={() => setActiveTab('groups')}
                >
                  <div className="stat-top-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.7 }}>
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
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
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
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
                        <polyline points="16 18 22 12 16 6"/>
                        <polyline points="8 6 2 12 8 18"/>
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
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
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
                      placeholder="e.g. ratul ahmed or TP-Link-Anik"
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
                        return (
                          <option key={g.id} value={g.id} disabled={isRestricted}>
                            {g.name} {g.is_protected ? '(🔒 Protected)' : ''}
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
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      <span>{isAdding ? 'Adding...' : 'Add User'}</span>
                    </button>
                  </div>
                </form>

                {addError && (
                  <div className="add-bar-alert-error">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
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
                      <circle cx="11" cy="11" r="8"/>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
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
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* User Table */}
              <div className="table-card-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '130px' }}>STATUS</th>
                      <th>NAME</th>
                      <th>MAC ADDRESS</th>
                      <th>ASSIGNED GROUPS</th>
                      <th style={{ textAlign: 'right', width: '150px' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-secondary)' }}>
                          {loading ? 'Loading users...' : 'No users found.'}
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => (
                        <tr key={u.id} style={{ opacity: u.status === 'deleted' ? 0.4 : 1 }}>
                          <td>
                            <span className={`status-badge-capsule status-badge-${u.status}`}>
                              <span className="status-green-dot"></span>
                              <span>{u.status}</span>
                            </span>
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
                                  <span key={g.id} className="group-tag-pill">
                                    {g.name}
                                    {g.is_protected && (
                                      <span style={{ marginLeft: '0.25rem', color: '#DC2626', fontWeight: 700 }} title="Protected Group">
                                        🔒
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
                                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }} title="User is assigned to a protected group. Only administrators can edit or delete this user.">
                                    🔒 Protected (Admin Only)
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
                      ))
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
                  <button className="btn btn-secondary" onClick={() => setActiveTab('dashboard')}>
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
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: '0.65rem', fontSize: '0.82rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                      <input
                        type="checkbox"
                        checked={newGroupIsProtected}
                        onChange={(e) => setNewGroupIsProtected(e.target.checked)}
                      />
                      <span>Tag as <strong>Protected Group</strong> (Subadmins cannot assign, edit, or delete users under this group)</span>
                    </label>
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
                      <th>PROTECTION TYPE</th>
                      <th style={{ textAlign: 'right', width: '220px' }}>ACTIONS</th>
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
                            {group.is_protected ? (
                              <span className="badge-protected">
                                🔒 Protected
                              </span>
                            ) : (
                              <span className="badge-standard">
                                Standard
                              </span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', alignItems: 'center' }}>
                              {currentUser.role === 'admin' && !isDefault && (
                                <button
                                  type="button"
                                  className="btn-text-action"
                                  onClick={() => handleToggleProtection(group.id, Boolean(group.is_protected))}
                                >
                                  {group.is_protected ? 'Unprotect' : 'Make Protected'}
                                </button>
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
                  <button className="btn btn-secondary" onClick={() => setActiveTab('dashboard')}>
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
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
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
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="12" y1="8" x2="12" y2="12"/>
                          <line x1="12" y1="16" x2="12.01" y2="16"/>
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
                          <th style={{ textAlign: 'right', width: '130px' }}>ACTIONS</th>
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
                              {acc.role !== 'admin' ? (
                                <button
                                  className="btn-text-action"
                                  onClick={() => handleDeleteSubadmin(acc.id, acc.username)}
                                  style={{ color: '#ef4444' }}
                                >
                                  Delete
                                </button>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Primary Admin</span>
                              )}
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
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
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
        </main>
      </div>

      {/* ============================================================
          STICKY / FLOATING DRAFT BAR
          ============================================================ */}
      {stats.pending_changes > 0 && (
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
              <button onClick={() => setModalMode(null)} className="modal-close-icon">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser}>
              {formError && <div className="form-alert-msg">{formError}</div>}

              <div className="form-group-block">
                <label className="form-label-title">User Name</label>
                <input
                  type="text"
                  className="form-input-element"
                  placeholder="e.g. ratul ahmed or TP-Link-Anik"
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
                    onClick={() => { setModalMode(null); setActiveTab('groups'); }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Go to Groups Page →
                  </button>
                </div>
                <div className="checkbox-tags-grid">
                  {groups.map((group) => {
                    const isChecked = formGroupIds.includes(group.id);
                    const isRestrictedForSubadmin = currentUser?.role === 'subadmin' && group.is_protected;
                    return (
                      <label
                        key={group.id}
                        className="checkbox-tag-item"
                        style={{ opacity: isRestrictedForSubadmin ? 0.45 : 1, cursor: isRestrictedForSubadmin ? 'not-allowed' : 'pointer' }}
                        title={isRestrictedForSubadmin ? 'Protected group (Administrator only)' : ''}
                      >
                        <input
                          type="checkbox"
                          disabled={isRestrictedForSubadmin}
                          checked={isChecked}
                          onChange={(e) => {
                            if (isRestrictedForSubadmin) return;
                            if (e.target.checked) {
                              setFormGroupIds([...formGroupIds, group.id]);
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
                        <span>
                          {group.name}
                          {group.is_protected ? ' (🔒 Protected)' : ''}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <div className="form-help-caption">Groups are organizational tags and do not affect firewall rules.</div>
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
              <button onClick={() => setShowHistory(false)} className="modal-close-icon">
                ✕
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

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header-row">
              <h3 className="modal-headline">Gateway Settings</h3>
              <button onClick={() => setShowSettingsModal(false)} className="modal-close-icon">
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.86rem' }}>
              <div>
                <span className="form-label-title">Router Sync Status</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <span className="status-indicator-dot"></span>
                  <span style={{ fontWeight: 600 }}>Connected & Polling</span>
                </div>
              </div>

              <div>
                <span className="form-label-title">Router Version</span>
                <div style={{ color: 'var(--text-secondary)' }}>OpenWrt v23.05.5-r24106</div>
              </div>

              <div>
                <span className="form-label-title">Configuration Endpoints</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.35rem' }}>
                  <code style={{ fontSize: '0.75rem', background: 'var(--bg-pill)', padding: '0.3rem 0.6rem', borderRadius: '4px' }}>
                    GET /api/config/version
                  </code>
                  <code style={{ fontSize: '0.75rem', background: 'var(--bg-pill)', padding: '0.3rem 0.6rem', borderRadius: '4px' }}>
                    GET /api/config/firewall
                  </code>
                  <code style={{ fontSize: '0.75rem', background: 'var(--bg-pill)', padding: '0.3rem 0.6rem', borderRadius: '4px' }}>
                    GET /api/config/ethers
                  </code>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowSettingsModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
