'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { UserViewModel, Group, DashboardStats, SessionUser } from '@/lib/types';
import { normalizeMac } from '@/lib/normalize-mac';
import { normalizeName } from '@/lib/normalize-name';
import { getMacVendor } from '@/lib/mac-vendors';

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

  // Bulk Selection State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  // Column Sorting State
  const [sortColumn, setSortColumn] = useState<'name' | 'mac_address' | 'status' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Status Filter State
  const [statusFilter, setStatusFilter] = useState<'all' | 'applied' | 'added' | 'modified' | 'deleted'>('all');

  // Collapsible Quick Add Form
  const [isAddFormCollapsed, setIsAddFormCollapsed] = useState(false);

  // MAC Copy Feedback
  const [copiedMac, setCopiedMac] = useState<string | null>(null);

  // Batch CSV/Text Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importTargetGroup, setImportTargetGroup] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Bulk Group Assignment Modal State
  const [showBulkGroupModal, setShowBulkGroupModal] = useState(false);
  const [bulkTargetGroupId, setBulkTargetGroupId] = useState('');
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);

  // Instant zero-latency client-side search filtering, status filtering, group filtering, and sorting
  const displayedUsers = useMemo(() => {
    let result = users;

    // Group filter
    if (selectedGroup && selectedGroup !== 'ALL') {
      result = result.filter((u) => u.groups?.some((g) => g.id === selectedGroup));
    }

    // Text search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const cleanQ = q.replace(/[:\-]/g, '');
      result = result.filter((u) => {
        const nameMatch = u.name.toLowerCase().includes(q);
        const macMatch = u.mac_address.toLowerCase().replace(/[:\-]/g, '').includes(cleanQ);
        return nameMatch || macMatch;
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((u) => u.status === statusFilter);
    }

    // Column sorting
    if (sortColumn) {
      result = [...result].sort((a, b) => {
        let valA = '';
        let valB = '';
        if (sortColumn === 'name') {
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
        } else if (sortColumn === 'mac_address') {
          valA = a.mac_address.toLowerCase();
          valB = b.mac_address.toLowerCase();
        } else if (sortColumn === 'status') {
          valA = a.status || '';
          valB = b.status || '';
        }
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [users, search, statusFilter, selectedGroup, sortColumn, sortDirection]);

  // Redis / In-memory Cache Diagnostics state
  const [cacheInfo, setCacheInfo] = useState<{ engine: string; connected: boolean; keysCount: number; pingMs: number } | null>(null);
  const [isPurgingCache, setIsPurgingCache] = useState(false);

  // Theme Management (Light / Dark Mode)
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Navigation state: 'dashboard' | 'groups' | 'history' | 'account' | 'settings' with URL & localStorage persistence
  const [activeTab, setActiveTab] = useState<'dashboard' | 'groups' | 'history' | 'account' | 'settings'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const tabParam = urlParams.get('tab') as 'dashboard' | 'groups' | 'history' | 'account' | 'settings' | null;
        const hash = window.location.hash.replace('#', '') as 'dashboard' | 'groups' | 'history' | 'account' | 'settings';
        const savedTab = localStorage.getItem('openwrt-active-tab') as 'dashboard' | 'groups' | 'history' | 'account' | 'settings' | null;
        const validTabs = ['dashboard', 'groups', 'history', 'account', 'settings'] as const;

        if (tabParam && validTabs.includes(tabParam)) return tabParam;
        if (hash && validTabs.includes(hash)) return hash;
        if (savedTab && validTabs.includes(savedTab)) return savedTab;
      } catch {
        // fallback to dashboard
      }
    }
    return 'dashboard';
  });

  const handleTabChange = (tab: 'dashboard' | 'groups' | 'history' | 'account' | 'settings') => {
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

  // Quick Add Device Derived Vendor & Duplicate Check
  const quickAddMacString = useMemo(() => macOctets.join(':').toUpperCase(), [macOctets]);
  const quickAddVendor = useMemo(() => {
    if (macOctets.slice(0, 3).every((o) => o.trim().length === 2)) {
      return getMacVendor(quickAddMacString);
    }
    return null;
  }, [macOctets, quickAddMacString]);
  const quickAddDuplicate = useMemo(() => {
    if (macOctets.every((o) => o.trim().length === 2)) {
      return users.find((u) => u.status !== 'deleted' && u.mac_address.toUpperCase() === quickAddMacString) || null;
    }
    return null;
  }, [macOctets, users, quickAddMacString]);

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

  // Dedicated History Page & Modal State
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'live' | 'archive'>('all');
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any | null>(null);
  const [historyViewerTab, setHistoryViewerTab] = useState<'firewall' | 'ethers' | 'diff' | 'metadata'>('firewall');
  const [copiedHashId, setCopiedHashId] = useState<string | null>(null);
  const [copiedContentTab, setCopiedContentTab] = useState<string | null>(null);

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
  const [macAuthCountdown, setMacAuthCountdown] = useState<string>('');
  const [isApplying, setIsApplying] = useState(false);

  // Feedback Notification
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Clear bulk selection when data changes
  useEffect(() => {
    setSelectedUserIds(new Set());
  }, [users]);

  // Toggle column sort
  const handleSortToggle = (column: 'name' | 'mac_address' | 'status') => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Sort indicator arrow
  const sortArrow = (column: string) => {
    if (sortColumn !== column) return '';
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  };

  // Selectable users (excludes deleted users and protected users for subadmins)
  const selectableUsers = useMemo(() => {
    return displayedUsers.filter(
      (u) => u.status !== 'deleted' && !(currentUser?.role === 'subadmin' && u.groups?.some((g) => g.is_protected))
    );
  }, [displayedUsers, currentUser]);

  // Toggle selection mode on/off
  const handleToggleSelectionMode = () => {
    setIsSelectionMode((prev) => {
      if (prev) {
        setSelectedUserIds(new Set());
      }
      return !prev;
    });
  };

  // Bulk select all visible selectable users
  const handleToggleSelectAll = () => {
    if (selectableUsers.length > 0 && selectedUserIds.size === selectableUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(selectableUsers.map((u) => u.id)));
    }
  };

  // Bulk select/deselect single user
  const handleToggleSelectUser = (userId: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  // Bulk delete selected users
  const handleBulkDelete = async () => {
    if (selectedUserIds.size === 0) return;

    const targetUsers = users.filter((u) => {
      if (!selectedUserIds.has(u.id)) return false;
      if (u.status === 'deleted') return false;
      if (currentUser?.role === 'subadmin' && u.groups?.some((g) => g.is_protected)) return false;
      return true;
    });

    if (targetUsers.length === 0) {
      showToast('No eligible users to delete (already deleted or protected)', 'error');
      setSelectedUserIds(new Set());
      return;
    }

    const confirmBulk = window.confirm(`Queue deletion for ${targetUsers.length} selected user(s)? Changes remain pending until applied.`);
    if (!confirmBulk) return;

    let successCount = 0;
    let failCount = 0;
    for (const u of targetUsers) {
      try {
        const res = await fetch('/api/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operation: 'DELETE', user_id: u.id }),
        });
        if (res.ok) successCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }

    setSelectedUserIds(new Set());
    if (failCount > 0) {
      showToast(`Queued ${successCount} deletion(s), ${failCount} failed`, 'error');
    } else {
      showToast(`${successCount} user(s) queued for deletion`);
    }
    fetchData();
  };

  // Copy MAC address to clipboard
  const handleCopyMac = async (mac: string) => {
    try {
      await navigator.clipboard.writeText(mac);
      setCopiedMac(mac);
      setTimeout(() => setCopiedMac(null), 1500);
    } catch {
      // fallback: do nothing
    }
  };

  // Export users as CSV
  const handleExportCSV = () => {
    const header = 'Name,MAC Address,Status,Groups';
    const rows = users.map((u) => {
      const groupNames = u.groups?.map((g) => g.name).join('; ') || 'Default';
      return `"${u.name}","${u.mac_address}","${u.status}","${groupNames}"`;
    });
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `openwrt-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${users.length} users as CSV`);
  };

  // Manual refresh
  const handleRefreshData = () => {
    fetchData(debouncedSearch, selectedGroup);
    showToast('Data refreshed');
  };

  // Batch Import Parser
  const parsedImportItems = useMemo(() => {
    if (!importText.trim()) return [];
    const lines = importText.split('\n');
    return lines
      .map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return null;
        let parts = trimmed.split(/[,;\t]/).map((p) => p.trim());
        if (parts.length === 1) {
          const ws = trimmed.split(/\s+/);
          if (ws.length >= 2) {
            parts = [ws[0], ws.slice(1).join(' ')];
          }
        }
        const rawMac = parts[0] || '';
        const rawName = parts[1] || '';
        const rawGroupName = parts[2] || '';

        const macRes = normalizeMac(rawMac);
        const nameRes = normalizeName(rawName);

        const isDuplicateExisting =
          macRes.valid &&
          users.some(
            (u) => u.status !== 'deleted' && u.mac_address.toUpperCase() === macRes.normalized.toUpperCase()
          );

        let matchedGroup = groups.find((g) => g.name.toLowerCase() === rawGroupName.toLowerCase());
        if (!matchedGroup && importTargetGroup) {
          matchedGroup = groups.find((g) => g.id === importTargetGroup);
        }
        if (!matchedGroup) {
          matchedGroup = groups.find((g) => g.name.toLowerCase() === 'default') || groups[0];
        }

        const vendor = macRes.valid ? getMacVendor(macRes.normalized) : null;

        return {
          id: `import-${idx}`,
          raw: line,
          rawMac,
          rawName,
          mac: macRes.valid ? macRes.normalized : rawMac,
          name: nameRes.valid ? nameRes.normalized : rawName,
          vendor,
          group: matchedGroup,
          isValid: macRes.valid && nameRes.valid,
          error: !macRes.valid ? macRes.error : !nameRes.valid ? nameRes.error : null,
          isDuplicate: isDuplicateExisting,
        };
      })
      .filter(Boolean) as {
        id: string;
        raw: string;
        rawMac: string;
        rawName: string;
        mac: string;
        name: string;
        vendor: string | null;
        group: Group | undefined;
        isValid: boolean;
        error?: string | null;
        isDuplicate: boolean;
      }[];
  }, [importText, users, groups, importTargetGroup]);

  // Memoized Live Release and Filtered Releases for Dedicated History Page
  const liveHistoryItem = useMemo(() => {
    return historyList.find((h) => h.is_current) || historyList[0] || null;
  }, [historyList]);

  const filteredHistory = useMemo(() => {
    return historyList.filter((h) => {
      if (historyFilter === 'live' && !h.is_current) return false;
      if (historyFilter === 'archive' && h.is_current) return false;
      if (!historySearch.trim()) return true;
      const q = historySearch.trim().toLowerCase();
      const verMatch = `v${h.version}`.toLowerCase().includes(q) || String(h.version).includes(q);
      const hashMatch = h.hash && h.hash.toLowerCase().includes(q);
      const dateMatch = h.created_at && new Date(h.created_at).toLocaleString().toLowerCase().includes(q);
      return Boolean(verMatch || hashMatch || dateMatch);
    });
  }, [historyList, historyFilter, historySearch]);

  // Execute Batch Import
  const handleExecuteImport = async () => {
    const validItems = parsedImportItems.filter((item) => item.isValid);
    if (validItems.length === 0) {
      setImportError('No valid devices found to import.');
      return;
    }

    setIsImporting(true);
    setImportError(null);

    let successCount = 0;
    let failCount = 0;

    for (const item of validItems) {
      try {
        const res = await fetch('/api/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operation: 'ADD',
            name: item.name,
            mac_address: item.mac,
            group_ids: item.group ? [item.group.id] : [],
          }),
        });
        if (res.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    setIsImporting(false);
    setShowImportModal(false);
    setImportText('');
    showToast(`Imported ${successCount} devices to pending drafts${failCount > 0 ? ` (${failCount} failed)` : ''}`);
    fetchData();
  };

  // Bulk Group Assignment
  const handleExecuteBulkGroupAssign = async () => {
    if (!bulkTargetGroupId || selectedUserIds.size === 0) return;
    setIsBulkAssigning(true);

    const targetUsers = users.filter((u) => {
      if (!selectedUserIds.has(u.id)) return false;
      if (u.status === 'deleted') return false;
      if (currentUser?.role === 'subadmin' && u.groups?.some((g) => g.is_protected)) return false;
      return true;
    });
    let count = 0;

    for (const u of targetUsers) {
      try {
        await fetch('/api/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operation: 'MODIFY',
            user_id: u.id,
            name: u.name,
            mac_address: u.mac_address,
            group_ids: [bulkTargetGroupId],
          }),
        });
        count++;
      } catch {
        // continue
      }
    }

    setIsBulkAssigning(false);
    setShowBulkGroupModal(false);
    setSelectedUserIds(new Set());
    showToast(`Updated ${count} users to selected group`);
    fetchData();
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
        const tabParam = urlParams.get('tab') as 'dashboard' | 'groups' | 'history' | 'account' | 'settings' | null;
        const hash = window.location.hash.replace('#', '') as 'dashboard' | 'groups' | 'history' | 'account' | 'settings';
        const savedTab = localStorage.getItem('openwrt-active-tab') as 'dashboard' | 'groups' | 'history' | 'account' | 'settings' | null;
        const pathname = window.location.pathname.replace(/^\//, '') as 'dashboard' | 'groups' | 'history' | 'account' | 'settings';
        const validTabs = ['dashboard', 'groups', 'history', 'account', 'settings'] as const;

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

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/config/history');
      const data = await res.json();
      if (data.history && Array.isArray(data.history)) {
        setHistoryList(data.history);
        const live = data.history.find((item: any) => item.is_current) || data.history[0];
        if (live && !selectedHistoryItem) {
          setSelectedHistoryItem(live);
        }
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
      showToast('Failed to load configuration history', 'error');
    } finally {
      setHistoryLoading(false);
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

  // Fetch history when History tab is active
  useEffect(() => {
    if (currentUser && activeTab === 'history') {
      fetchHistory();
    }
  }, [currentUser, activeTab]);

  // Fetch cache status when Settings tab is active
  useEffect(() => {
    if (currentUser && activeTab === 'settings') {
      fetchCacheStatus();
    }
  }, [currentUser, activeTab]);

  // Live countdown and auto-refresh when MAC authentication is temporarily paused
  useEffect(() => {
    if (!stats.mac_auth || stats.mac_auth.enabled || !stats.mac_auth.disabled_until) {
      setMacAuthCountdown('');
      return;
    }

    const targetTime = new Date(stats.mac_auth.disabled_until).getTime();

    const updateCountdown = () => {
      const remainingMs = targetTime - Date.now();
      if (remainingMs <= 0) {
        setMacAuthCountdown('Expired — re-enabling...');
        fetchData();
        return false;
      }

      const totalSeconds = Math.floor(remainingMs / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      if (days > 0) {
        setMacAuthCountdown(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setMacAuthCountdown(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setMacAuthCountdown(`${minutes}m ${seconds}s`);
      } else {
        setMacAuthCountdown(`${seconds}s`);
      }
      return true;
    };

    updateCountdown();
    const interval = setInterval(() => {
      const active = updateCountdown();
      if (!active) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [stats.mac_auth?.enabled, stats.mac_auth?.disabled_until]);

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

  // Helper: Distribute full or partial MAC string across the 6 octet boxes
  const distributeMacString = (startIndex: number, raw: string) => {
    const hexOnly = raw.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
    if (!hexOnly) return;

    const fullString = hexOnly.slice(0, 12);
    const newOctets = [...macOctets];

    // For full or multi-segment MACs, always populate starting from box 0
    const start = fullString.length >= 6 ? 0 : startIndex;
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

  // Horizontal Bar: Segmented MAC Input Change (2 characters per box, auto-format & mobile paste support)
  const handleMacChange = (index: number, val: string) => {
    const clean = val.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();

    // If multiple octets pasted at once (e.g. mobile keyboard suggestion or long-press paste)
    if (clean.length > 2) {
      distributeMacString(index, clean);
      return;
    }

    const next = [...macOctets];
    next[index] = clean.slice(0, 2);
    setMacOctets(next);
    setAddError(null);

    if (clean.length === 2) {
      if (index < 5) {
        macInputRefs.current[index + 1]?.focus();
        macInputRefs.current[index + 1]?.select();
      } else {
        nameInputRef.current?.focus();
      }
    }
  };

  // Direct Clipboard Paste button helper
  const handlePasteClipboardDirect = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          distributeMacString(0, text);
          showToast('MAC address pasted from clipboard');
        }
      }
    } catch {
      macInputRefs.current[0]?.focus();
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
    const pasted = e.clipboardData?.getData('text');
    if (!pasted) return;

    e.preventDefault();
    distributeMacString(index, pasted);
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

  // Apply Changes (finalize directly without browser confirm popup)
  const handleApply = async () => {
    if (isApplying) return;
    setIsApplying(true);

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
    } finally {
      setIsApplying(false);
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

  // Open History Page / Dialog
  const openHistoryModal = () => {
    handleTabChange('history');
  };

  const downloadHistoryFile = (content: string, filename: string) => {
    if (!content) {
      showToast('No content available to download', 'error');
      return;
    }
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${filename}`);
  };

  const copyToClipboard = (text: string, identifier: string, isTab: boolean = false) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (isTab) {
      setCopiedContentTab(identifier);
      setTimeout(() => setCopiedContentTab(null), 2000);
    } else {
      setCopiedHashId(identifier);
      setTimeout(() => setCopiedHashId(null), 2000);
    }
    showToast('Copied to clipboard');
  };

  const renderConfigDiff = (oldText: string, newText: string) => {
    const oldLines = oldText ? oldText.split('\n') : [];
    const newLines = newText ? newText.split('\n') : [];
    const oldSet = new Set(oldLines.map((l) => l.trim()));
    const newSet = new Set(newLines.map((l) => l.trim()));
    const result: React.ReactNode[] = [];

    oldLines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed && !newSet.has(trimmed)) {
        result.push(
          <span key={`del-${idx}`} className="history-diff-line-removed">
            - {line}
          </span>
        );
      }
    });

    newLines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed && !oldSet.has(trimmed)) {
        result.push(
          <span key={`add-${idx}`} className="history-diff-line-added">
            + {line}
          </span>
        );
      } else if (trimmed.startsWith('config ') || trimmed.startsWith('option name')) {
        result.push(
          <span key={`ctx-${idx}`} className="history-diff-line-same">
            &nbsp;&nbsp;{line}
          </span>
        );
      }
    });

    if (result.length === 0) {
      return (
        <div style={{ padding: '1.5rem', color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.85rem' }}>
          Identical configuration content (no rule changes detected between releases)
        </div>
      );
    }

    return <pre className="history-code-pre">{result}</pre>;
  };

  // Auth Loading Screen
  if (authChecking) {
    return (
      <div className="auth-page-container" style={{ background: 'var(--bg-app)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div className="loading-spinner" style={{ width: '24px', height: '24px' }}></div>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', fontWeight: 500 }}>Connecting to OpenWrt Gateway...</span>
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
                className={`nav-item-btn ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => handleTabChange('history')}
              >
                <span className="nav-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </span>
                <span className="nav-label-text">History</span>
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
            {/* Direct Configuration Downloads & History (Desktop Only) */}
            <button className="btn btn-ghost btn-sm desktop-only-action" onClick={openHistoryModal} style={{ fontSize: '0.8rem' }}>
              History
            </button>
            <a
              href="/api/config/firewall?download=true"
              className="btn btn-ghost btn-sm desktop-only-action"
              download="firewall"
              style={{ fontSize: '0.8rem' }}
            >
              firewall
            </a>
            <a
              href="/api/config/ethers?download=true"
              className="btn btn-ghost btn-sm desktop-only-action"
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

                    <button
                      type="button"
                      className="user-dropdown-item"
                      onClick={() => {
                        setShowUserDropdown(false);
                        openHistoryModal();
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span>Configuration History</span>
                    </button>

                    <a
                      href="/api/config/firewall?download=true"
                      download="firewall"
                      className="user-dropdown-item"
                      onClick={() => setShowUserDropdown(false)}
                      style={{ textDecoration: 'none' }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      <span>Download Firewall Config</span>
                    </a>

                    <a
                      href="/api/config/ethers?download=true"
                      download="ethers"
                      className="user-dropdown-item"
                      onClick={() => setShowUserDropdown(false)}
                      style={{ textDecoration: 'none' }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      <span>Download Ethers Config</span>
                    </a>

                    {currentUser && (
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
            <div className={`toast-notice ${notification.type === 'error' ? 'toast-error' : 'toast-success'}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {notification.type === 'error' ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, color: '#ef4444' }}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, color: '#10b981' }}>
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                )}
                <span>{notification.message}</span>
              </div>
              <button
                onClick={() => setNotification(null)}
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '4px', transition: 'background 0.15s' }}
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
            <div className="page-content-animated" key="dashboard">
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
                    <div className="header-mac-auth-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-md)' }}>
                      <span className="status-indicator-dot" style={{ background: '#ef4444' }}></span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ef4444' }}>
                        MAC Auth: OFF (Open{stats.mac_auth.disabled_until ? ` · Re-enables in ${macAuthCountdown || '...'} (${formatDateTime(stats.mac_auth.disabled_until)})` : ' permanently'})
                      </span>
                    </div>
                  ) : (
                    <div className="header-mac-auth-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-md)' }}>
                      <span className="status-indicator-dot" style={{ background: '#10b981' }}></span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#10b981' }}>
                        MAC Auth: ON (Enforced)
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    className={`btn header-mac-auth-btn ${stats.mac_auth && !stats.mac_auth.enabled ? 'btn-primary' : 'btn-secondary'}`}
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
                  <button
                    type="button"
                    className="btn-text-action"
                    onClick={() => setIsAddFormCollapsed((v) => !v)}
                    style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: isAddFormCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                    <span>{isAddFormCollapsed ? 'Expand' : 'Collapse'}</span>
                  </button>
                </div>

                {!isAddFormCollapsed && (
                <>
                <form className="horizontal-add-form" onSubmit={handleAddUserDirect}>
                  {/* Field 1: MAC Address (6 separate 2-character boxes) */}
                  <div className="add-bar-field field-mac">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <label className="add-bar-label" style={{ margin: 0 }}>MAC Address</label>
                        {quickAddVendor && (
                          <span className="quick-add-vendor-chip" title="Hardware Manufacturer">
                            {quickAddVendor}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handlePasteClipboardDirect}
                        className="btn-text-action"
                        style={{ fontSize: '0.72rem', color: 'var(--brand-primary, #6366f1)', padding: '0 4px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                        title="Paste MAC from clipboard"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        <span>Paste</span>
                      </button>
                    </div>
                    <div className="mac-segmented-box">
                      {macOctets.map((octet, idx) => (
                        <React.Fragment key={idx}>
                          <input
                            ref={(el) => { macInputRefs.current[idx] = el; }}
                            type="text"
                            maxLength={17}
                            inputMode="text"
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
                    {quickAddDuplicate && (
                      <div className="quick-add-dup-warning">
                        <span>⚠️</span>
                        <span>Notice: MAC already registered to &quot;{quickAddDuplicate.name}&quot;</span>
                      </div>
                    )}
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
                </>)}
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
                  {search && (
                    <button
                      type="button"
                      className="search-clear-btn"
                      onClick={() => setSearch('')}
                      title="Clear search"
                      aria-label="Clear search"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
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

                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleRefreshData}
                  title="Refresh data"
                  style={{ padding: '0.45rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="1 4 1 10 7 10"/>
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                  </svg>
                </button>
              </div>

              {/* Status Filter Chips + Results Count + Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {(['all', 'applied', 'added', 'modified', 'deleted'] as const).map((status) => {
                    const counts: Record<string, number> = {
                      all: users.length,
                      applied: users.filter((u) => u.status === 'applied').length,
                      added: users.filter((u) => u.status === 'added').length,
                      modified: users.filter((u) => u.status === 'modified').length,
                      deleted: users.filter((u) => u.status === 'deleted').length,
                    };
                    if (status !== 'all' && counts[status] === 0) return null;
                    return (
                      <button
                        key={status}
                        type="button"
                        className={`status-filter-chip ${statusFilter === status ? 'active' : ''}`}
                        onClick={() => setStatusFilter(status)}
                      >
                        <span style={{ textTransform: 'capitalize' }}>{status}</span>
                        <span className="status-filter-count">{counts[status]}</span>
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    {displayedUsers.length === users.length
                      ? `${users.length} users`
                      : `${displayedUsers.length} of ${users.length}`}
                  </span>

                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={handleExportCSV}
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                    title="Export all users as CSV"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <span>CSV</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowImportModal(true)}
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                    title="Batch import devices from CSV or text"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span>Import</span>
                  </button>

                  <button
                    type="button"
                    className={`btn btn-sm ${isSelectionMode ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={handleToggleSelectionMode}
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.3rem 0.65rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                    title={isSelectionMode ? 'Exit selection mode' : 'Select multiple devices'}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      {isSelectionMode ? (
                        <polyline points="20 6 9 17 4 12" />
                      ) : (
                        <>
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <path d="m9 12 2 2 4-4" />
                        </>
                      )}
                    </svg>
                    <span>{isSelectionMode ? 'Done' : 'Select'}</span>
                  </button>

                  {isSelectionMode && selectedUserIds.size > 0 && (
                    <>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setShowBulkGroupModal(true)}
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        title="Assign selected users to group"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        <span>Group ({selectedUserIds.size})</span>
                      </button>

                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={handleBulkDelete}
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem', color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        title="Delete selected users"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        <span>Delete ({selectedUserIds.size})</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* User Table */}
              <div className="table-card-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      {isSelectionMode && (
                        <th className="cell-checkbox" style={{ width: '44px', padding: '0.75rem 0.5rem 0.75rem 1rem' }}>
                          <input
                            type="checkbox"
                            checked={selectableUsers.length > 0 && selectedUserIds.size === selectableUsers.length}
                            onChange={handleToggleSelectAll}
                            disabled={selectableUsers.length === 0}
                            style={{ cursor: selectableUsers.length === 0 ? 'not-allowed' : 'pointer', width: '15px', height: '15px', accentColor: 'var(--text-primary)' }}
                            title={selectableUsers.length === 0 ? 'No selectable users' : 'Select all'}
                          />
                        </th>
                      )}
                      <th
                        style={{ width: '130px', cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => handleSortToggle('status')}
                        title="Sort by status"
                      >
                        STATUS{sortArrow('status')}
                      </th>
                      <th
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => handleSortToggle('name')}
                        title="Sort by name"
                      >
                        NAME{sortArrow('name')}
                      </th>
                      <th
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => handleSortToggle('mac_address')}
                        title="Sort by MAC"
                      >
                        MAC ADDRESS{sortArrow('mac_address')}
                      </th>
                      <th>ASSIGNED GROUPS</th>
                      <th style={{ textAlign: 'right', width: '150px' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedUsers.length === 0 ? (
                      <tr>
                        <td colSpan={isSelectionMode ? 6 : 5} style={{ textAlign: 'center', padding: '3.5rem' }}>
                          {loading ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                              <div className="loading-spinner"></div>
                              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading users...</span>
                            </div>
                          ) : (
                            <div className="empty-state">
                              <div className="empty-state-icon">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                  <circle cx="9" cy="7" r="4" />
                                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
                              </div>
                              <span className="empty-state-text">No users found</span>
                              <span className="empty-state-hint">{search ? 'Try a different search query' : 'Register a device using the form above'}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ) : (
                      displayedUsers.map((u) => {
                        const isNoInternetUser = u.groups?.some((g) => g.is_no_internet);
                        const isProtectedFromSubadmin = currentUser?.role === 'subadmin' && u.groups?.some((g) => g.is_protected);
                        const isDeleted = u.status === 'deleted';
                        const isSelectable = !isDeleted && !isProtectedFromSubadmin;
                        return (
                          <tr key={u.id} className={`user-row-card ${isSelectionMode ? 'has-selection-mode' : ''}`} style={{ opacity: isDeleted ? 0.4 : 1 }}>
                            {isSelectionMode && (
                              <td className="cell-checkbox">
                                <input
                                  type="checkbox"
                                  disabled={!isSelectable}
                                  checked={selectedUserIds.has(u.id)}
                                  onChange={() => handleToggleSelectUser(u.id)}
                                  style={{
                                    cursor: isSelectable ? 'pointer' : 'not-allowed',
                                    width: '15px',
                                    height: '15px',
                                    accentColor: 'var(--text-primary)',
                                    opacity: isSelectable ? 1 : 0.35,
                                  }}
                                  title={isProtectedFromSubadmin ? 'Protected user (Admin only)' : isDeleted ? 'Already marked for deletion' : undefined}
                                />
                              </td>
                            )}
                            <td className="cell-status">
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
                            <td className="cell-name">
                              <span className="user-name-cell">{u.name}</span>
                            </td>
                            <td className="cell-mac">
                              <div style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem' }}>
                                <span
                                  className="mac-address-pill"
                                  onClick={() => handleCopyMac(u.mac_address)}
                                  style={{ cursor: 'pointer' }}
                                  title={copiedMac === u.mac_address ? 'Copied!' : 'Click to copy'}
                                >
                                  {copiedMac === u.mac_address ? (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                      <IconCheck size={11} style={{ color: 'var(--status-applied-dot)' }} />
                                      <span>Copied</span>
                                    </span>
                                  ) : (
                                    u.mac_address
                                  )}
                                </span>
                                {(() => {
                                  const vendor = getMacVendor(u.mac_address);
                                  return vendor ? (
                                    <span className="mac-vendor-pill" title={`Manufacturer: ${vendor}`}>
                                      {vendor}
                                    </span>
                                  ) : null;
                                })()}
                              </div>
                            </td>
                            <td className="cell-groups">
                              <div className="group-tags-wrap">
                                {u.groups && u.groups.length > 0 ? (
                                  u.groups.map((g) => (
                                    <span
                                      key={g.id}
                                      className="group-tag-pill"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedGroup(g.id);
                                      }}
                                      style={{
                                        cursor: 'pointer',
                                        ...(g.is_no_internet
                                          ? { borderColor: 'rgba(220, 38, 38, 0.4)', background: 'rgba(220, 38, 38, 0.08)' }
                                          : undefined),
                                      }}
                                      title={`Click to filter by "${g.name}"`}
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
                            <td className="cell-actions">
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
            </div>
          )}

          {/* ============================================================
              VIEW 2: SEPARATE DEDICATED GROUPS PAGE
              Opened by clicking "Groups" in the left sidebar
              ============================================================ */}
          {activeTab === 'groups' && (
            <div className="page-content-animated" key="groups">
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
                  <div className="groups-create-form-row" style={{ display: 'flex', gap: '0.75rem', marginTop: '0.45rem', flexWrap: 'wrap' }}>
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
                        <tr key={group.id} className="group-row-card">
                          <td className="cell-group-name">
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
                          <td className="cell-group-count">
                            <span style={{ color: 'var(--text-secondary)' }}>
                              {userCount} {userCount === 1 ? 'client' : 'clients'}
                            </span>
                          </td>
                          <td className="cell-group-tags">
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
                          <td className="cell-group-actions">
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
            <div className="page-content-animated" key="account">
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.85rem', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="brand-icon-box" style={{ width: '36px', height: '36px', fontSize: '1rem' }}>
                      {currentUser.username[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{currentUser.username}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Active authenticated session</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span className={`badge-role badge-role-${currentUser.role}`}>{currentUser.role}</span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => openPasswordModal({
                        id: currentUser.id,
                        username: currentUser.username,
                        role: currentUser.role,
                      })}
                      style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      <span>Change Password</span>
                    </button>
                  </div>
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
                      <div className="add-bar-field subadmin-form-field" style={{ flex: 1, minWidth: '180px' }}>
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

                      <div className="add-bar-field subadmin-form-field" style={{ flex: 1, minWidth: '180px' }}>
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

                      <div className="add-bar-field subadmin-submit-field">
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
                          <tr key={acc.id} className="account-row-card">
                            <td className="cell-account-username">
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{acc.username}</span>
                            </td>
                            <td className="cell-account-role">
                              <span className={`badge-role badge-role-${acc.role}`}>{acc.role}</span>
                            </td>
                            <td className="cell-account-created">
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                {acc.created_at ? new Date(acc.created_at).toLocaleDateString() : 'System default'}
                              </span>
                            </td>
                            <td className="cell-account-actions" style={{ textAlign: 'right' }}>
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
              VIEW: DEDICATED HISTORY PAGE (AUDIT LEDGER & CONFIG INSPECTOR)
              ============================================================ */}
          {activeTab === 'history' && (
            <div className="history-page-wrapper page-content-animated" key="history">
              {/* Small Top Pill */}
              <div>
                <div className="gateway-pill">
                  <span className="gateway-pill-dot"></span>
                  <span>Audit Trail &amp; Releases</span>
                </div>
              </div>

              {/* Header Row */}
              <div className="header-row">
                <div className="title-col">
                  <h1 className="page-headline">Configuration History</h1>
                  <p className="page-description">
                    Immutable chronological audit log of published gateway releases, SHA-256 integrity checksums, and configuration snapshots.
                  </p>
                </div>
                <div className="actions-col" style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={fetchHistory}
                    disabled={historyLoading}
                    title="Refresh releases ledger"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={historyLoading ? 'spin-icon' : ''}>
                      <polyline points="23 4 23 10 17 10" />
                      <polyline points="1 20 1 14 7 14" />
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                    </svg>
                    <span>{historyLoading ? 'Refreshing...' : 'Refresh'}</span>
                  </button>
                  <a
                    href="/api/config/firewall?download=true"
                    download="firewall"
                    className="btn btn-secondary btn-sm"
                    title="Download active firewall file"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <span>Live firewall</span>
                  </a>
                  <a
                    href="/api/config/ethers?download=true"
                    download="ethers"
                    className="btn btn-secondary btn-sm"
                    title="Download active ethers file"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <span>Live ethers</span>
                  </a>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleTabChange('dashboard')}>
                    ← Back to Dashboard
                  </button>
                </div>
              </div>

              {/* 4 Telemetry / Metric Summary Cards */}
              <div className="history-telemetry-grid">
                <div className="history-telemetry-card">
                  <div className="history-telemetry-header">
                    <span>Published Releases</span>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 2 7 12 12 22 7 12 2" />
                      <polyline points="2 17 12 22 22 17" />
                      <polyline points="2 12 12 17 22 12" />
                    </svg>
                  </div>
                  <div className="history-telemetry-value">
                    {historyList.length}
                    <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>versions</span>
                  </div>
                  <div className="history-telemetry-subtext">
                    <span>Total immutable snapshots tracked</span>
                  </div>
                </div>

                <div className="history-telemetry-card">
                  <div className="history-telemetry-header">
                    <span>Active Gateway Release</span>
                    <span className="history-live-pill">Live</span>
                  </div>
                  <div className="history-telemetry-value">
                    v{liveHistoryItem ? liveHistoryItem.version : (stats.version || 1)}
                  </div>
                  <div className="history-telemetry-subtext">
                    <span>{liveHistoryItem?.created_at ? new Date(liveHistoryItem.created_at).toLocaleString() : 'Currently deployed'}</span>
                  </div>
                </div>

                <div className="history-telemetry-card">
                  <div className="history-telemetry-header">
                    <span>Live Device Rules</span>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                      <line x1="12" y1="18" x2="12.01" y2="18" />
                    </svg>
                  </div>
                  <div className="history-telemetry-value">
                    {liveHistoryItem ? liveHistoryItem.user_count : (stats.total_users || 0)}
                    <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>devices</span>
                  </div>
                  <div className="history-telemetry-subtext">
                    <span>Compiled into gateway firewall</span>
                  </div>
                </div>

                <div className="history-telemetry-card">
                  <div className="history-telemetry-header">
                    <span>Integrity Seal</span>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  <div className="history-telemetry-value" style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', letterSpacing: '-0.02em' }}>
                    {liveHistoryItem?.hash ? liveHistoryItem.hash.substring(0, 10) + '...' : (stats.config_hash ? stats.config_hash.substring(0, 10) + '...' : 'Verified')}
                  </div>
                  <div className="history-telemetry-subtext" style={{ color: 'var(--status-applied-text)' }}>
                    <span>● SHA-256 Checksum Verified</span>
                  </div>
                </div>
              </div>

              {/* Search & Filter Toolbar */}
              <div className="history-filter-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, flexWrap: 'wrap' }}>
                  <div className="history-search-input-wrap">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="history-search-icon">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      type="text"
                      className="history-search-input"
                      placeholder="Search by version (v36), hash, or date..."
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                    />
                    {historySearch && (
                      <button
                        type="button"
                        onClick={() => setHistorySearch('')}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '4px',
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <button
                      type="button"
                      className={`status-filter-chip ${historyFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setHistoryFilter('all')}
                    >
                      <span>All Releases</span>
                      <span className="status-filter-count">{historyList.length}</span>
                    </button>
                    <button
                      type="button"
                      className={`status-filter-chip ${historyFilter === 'live' ? 'active' : ''}`}
                      onClick={() => setHistoryFilter('live')}
                    >
                      <span>Live Active</span>
                      <span className="status-filter-count">{historyList.filter((h) => h.is_current).length}</span>
                    </button>
                    <button
                      type="button"
                      className={`status-filter-chip ${historyFilter === 'archive' ? 'active' : ''}`}
                      onClick={() => setHistoryFilter('archive')}
                    >
                      <span>Archived</span>
                      <span className="status-filter-count">{historyList.filter((h) => !h.is_current).length}</span>
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                  Showing {filteredHistory.length} of {historyList.length} releases
                </div>
              </div>

              {/* Master-Detail Split: Left Ledger Table & Right Inspector */}
              <div className="history-split-layout">
                {/* Left: Releases Ledger */}
                <div className="history-ledger-card">
                  <div className="history-ledger-header">
                    <span className="history-ledger-title">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span>Release Chronology</span>
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      Click to inspect
                    </span>
                  </div>

                  <div className="history-ledger-list">
                    {filteredHistory.length === 0 ? (
                      <div style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
                        <div className="empty-state">
                          <span className="empty-state-text">No releases matching query</span>
                          <span className="empty-state-hint">Try clearing your search filters</span>
                        </div>
                      </div>
                    ) : (
                      filteredHistory.map((h) => {
                        const isSelected = selectedHistoryItem?.id === h.id || selectedHistoryItem?.version === h.version;
                        return (
                          <div
                            key={h.id || h.version}
                            className={`history-item-row ${isSelected ? 'is-selected' : ''}`}
                            onClick={() => setSelectedHistoryItem(h)}
                            role="button"
                            tabIndex={0}
                          >
                            <div className="history-item-row-top">
                              <div className="history-version-badge">
                                <span>v{h.version}</span>
                                {h.is_current ? (
                                  <span className="history-live-pill">Live</span>
                                ) : (
                                  <span className="history-archived-pill">Archived</span>
                                )}
                              </div>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {h.user_count} {h.user_count === 1 ? 'device' : 'devices'}
                              </span>
                            </div>

                            <div className="history-item-row-meta">
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                {new Date(h.created_at).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              <span className="history-hash-chip">
                                {h.hash ? h.hash.substring(0, 10) + '...' : 'No hash'}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right: Selected Version Inspector */}
                <div className="history-inspector-card">
                  {selectedHistoryItem ? (
                    <>
                      {/* Inspector Header */}
                      <div className="history-inspector-header">
                        <div className="history-inspector-header-top">
                          <div className="history-inspector-title">
                            <span>Release v{selectedHistoryItem.version}</span>
                            {selectedHistoryItem.is_current ? (
                              <span className="history-live-pill">Live Active</span>
                            ) : (
                              <span className="history-archived-pill">Archived Version</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => copyToClipboard(selectedHistoryItem.hash, 'hash')}
                              title="Copy full SHA-256 hash"
                              style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                              </svg>
                              <span>{copiedHashId === 'hash' ? 'Copied Hash!' : 'Copy Hash'}</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => downloadHistoryFile(selectedHistoryItem.firewall_content, `firewall-v${selectedHistoryItem.version}`)}
                              style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                              title="Download firewall configuration file"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                              </svg>
                              <span>firewall</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => downloadHistoryFile(selectedHistoryItem.ethers_content, `ethers-v${selectedHistoryItem.version}`)}
                              style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                              title="Download ethers static IP file"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                              </svg>
                              <span>ethers</span>
                            </button>
                          </div>
                        </div>

                        {/* Inspector Meta Subline */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.76rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                          <div>
                            <strong>Published:</strong> {new Date(selectedHistoryItem.created_at).toLocaleString()}
                          </div>
                          <div>
                            <strong>Devices:</strong> {selectedHistoryItem.user_count} rules compiled
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <strong>SHA-256:</strong>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-primary)' }}>
                              {selectedHistoryItem.hash}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Inspector Sub-Tabs */}
                      <div className="history-inspector-tabs">
                        <button
                          type="button"
                          className={`history-tab-btn ${historyViewerTab === 'firewall' ? 'is-active' : ''}`}
                          onClick={() => setHistoryViewerTab('firewall')}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                          <span>Firewall Rules (/etc/config/firewall)</span>
                        </button>
                        <button
                          type="button"
                          className={`history-tab-btn ${historyViewerTab === 'ethers' ? 'is-active' : ''}`}
                          onClick={() => setHistoryViewerTab('ethers')}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                            <line x1="8" y1="21" x2="16" y2="21" />
                            <line x1="12" y1="17" x2="12" y2="21" />
                          </svg>
                          <span>Ethers Map (/etc/ethers)</span>
                        </button>
                        <button
                          type="button"
                          className={`history-tab-btn ${historyViewerTab === 'diff' ? 'is-active' : ''}`}
                          onClick={() => setHistoryViewerTab('diff')}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="18" cy="18" r="3" />
                            <circle cx="6" cy="6" r="3" />
                            <path d="M13 6h3a2 2 0 0 1 2 2v7" />
                            <line x1="6" y1="9" x2="6" y2="21" />
                          </svg>
                          <span>Compare vs Live</span>
                        </button>
                        <button
                          type="button"
                          className={`history-tab-btn ${historyViewerTab === 'metadata' ? 'is-active' : ''}`}
                          onClick={() => setHistoryViewerTab('metadata')}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="16" x2="12" y2="12" />
                            <line x1="12" y1="8" x2="12.01" y2="8" />
                          </svg>
                          <span>Audit Properties</span>
                        </button>
                      </div>

                      {/* Inspector Content Panes */}
                      {historyViewerTab === 'firewall' && (
                        <div style={{ position: 'relative' }}>
                          <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 2 }}>
                            <button
                              type="button"
                              className="history-copy-btn"
                              onClick={() => copyToClipboard(selectedHistoryItem.firewall_content || '', 'firewall-content', true)}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                              </svg>
                              <span>{copiedContentTab === 'firewall-content' ? 'Copied!' : 'Copy Code'}</span>
                            </button>
                          </div>
                          <div className="history-code-container">
                            <pre className="history-code-pre">
                              {selectedHistoryItem.firewall_content || '# No firewall rules stored for this release'}
                            </pre>
                          </div>
                        </div>
                      )}

                      {historyViewerTab === 'ethers' && (
                        <div style={{ position: 'relative' }}>
                          <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 2 }}>
                            <button
                              type="button"
                              className="history-copy-btn"
                              onClick={() => copyToClipboard(selectedHistoryItem.ethers_content || '', 'ethers-content', true)}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                              </svg>
                              <span>{copiedContentTab === 'ethers-content' ? 'Copied!' : 'Copy Code'}</span>
                            </button>
                          </div>
                          <div className="history-code-container">
                            <pre className="history-code-pre">
                              {selectedHistoryItem.ethers_content || '# No static ethers entries in this release'}
                            </pre>
                          </div>
                        </div>
                      )}

                      {historyViewerTab === 'diff' && (
                        <div style={{ padding: '1rem' }}>
                          {selectedHistoryItem.is_current ? (
                            <div className="horizontal-add-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                                This is the currently active Live Release (v{selectedHistoryItem.version})
                              </div>
                              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                To inspect diffs, select an archived historical release from the list on the left to see what changed compared to this live release.
                              </p>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                              {/* Summary Banner */}
                              <div className="history-metadata-item" style={{ background: 'var(--bg-app)' }}>
                                <div>
                                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Comparing:</span>{' '}
                                  <span>v{selectedHistoryItem.version} (Archive)</span> →{' '}
                                  <span style={{ fontWeight: 600, color: 'var(--status-applied-text)' }}>v{liveHistoryItem?.version || stats.version || 1} (Live)</span>
                                </div>
                                <div style={{ fontSize: '0.78rem' }}>
                                  <strong>Device Delta:</strong>{' '}
                                  {(liveHistoryItem ? liveHistoryItem.user_count : stats.total_users || 0) - selectedHistoryItem.user_count >= 0
                                    ? `+${(liveHistoryItem ? liveHistoryItem.user_count : stats.total_users || 0) - selectedHistoryItem.user_count} devices`
                                    : `${(liveHistoryItem ? liveHistoryItem.user_count : stats.total_users || 0) - selectedHistoryItem.user_count} devices`}
                                </div>
                              </div>

                              {/* Diff Code View */}
                              <div className="history-code-container" style={{ margin: 0, maxHeight: '420px' }}>
                                {renderConfigDiff(selectedHistoryItem.firewall_content || '', liveHistoryItem?.firewall_content || '')}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {historyViewerTab === 'metadata' && (
                        <div className="history-metadata-box">
                          <div className="history-metadata-item">
                            <span style={{ color: 'var(--text-secondary)' }}>Release Identifier</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{selectedHistoryItem.id}</span>
                          </div>
                          <div className="history-metadata-item">
                            <span style={{ color: 'var(--text-secondary)' }}>Version Number</span>
                            <span style={{ fontWeight: 700 }}>v{selectedHistoryItem.version}</span>
                          </div>
                          <div className="history-metadata-item">
                            <span style={{ color: 'var(--text-secondary)' }}>Deployment Status</span>
                            {selectedHistoryItem.is_current ? (
                              <span className="history-live-pill">Active on Gateway</span>
                            ) : (
                              <span className="history-archived-pill">Archived / Superseded</span>
                            )}
                          </div>
                          <div className="history-metadata-item">
                            <span style={{ color: 'var(--text-secondary)' }}>Timestamp Generated</span>
                            <span>{new Date(selectedHistoryItem.created_at).toISOString()}</span>
                          </div>
                          <div className="history-metadata-item">
                            <span style={{ color: 'var(--text-secondary)' }}>Full Checksum (SHA-256)</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', wordBreak: 'break-all' }}>
                              {selectedHistoryItem.hash}
                            </span>
                          </div>
                          {selectedHistoryItem.metadata && (
                            <div className="history-metadata-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Extended Metadata JSON</span>
                              <pre style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: '0.75rem', background: 'var(--bg-app)', padding: '0.5rem', borderRadius: '4px', width: '100%', overflowX: 'auto' }}>
                                {JSON.stringify(selectedHistoryItem.metadata, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.5, marginBottom: '0.75rem' }}>
                        <polygon points="12 2 2 7 12 12 22 7 12 2" />
                        <polyline points="2 17 12 22 22 17" />
                        <polyline points="2 12 12 17 22 12" />
                      </svg>
                      <div style={{ fontWeight: 600 }}>Select a release to inspect</div>
                      <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>View firewall rules, MAC assignments, and checksums</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================
              VIEW 4: DEDICATED REDESIGNED SETTINGS PAGE
              ============================================================ */}
          {activeTab === 'settings' && (
            <div className="settings-page-wrapper page-content-animated" key="settings">
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
                          Re-enables automatically {macAuthCountdown ? `in ${macAuthCountdown} ` : ''}({formatDateTime(stats.mac_auth.disabled_until)})
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

                <div className="mac-auth-banner-right" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
              <span className="pending-count-badge">{stats.pending_changes}</span>
              <span className="pending-text-desktop">
                {stats.pending_changes} pending {stats.pending_changes === 1 ? 'change' : 'changes'} in draft
              </span>
              <span className="pending-text-mobile">
                draft
              </span>
            </div>
            <div className="pending-btn-actions">
              <button
                type="button"
                className="btn btn-secondary pending-btn-undo"
                onClick={handleUndo}
              >
                Undo
              </button>
              <button
                type="button"
                className="btn btn-ghost pending-btn-discard"
                onClick={handleDiscard}
              >
                Discard
              </button>
              <button
                type="button"
                className="btn btn-primary pending-btn-apply"
                onClick={handleApply}
                disabled={isApplying}
              >
                {isApplying ? (
                  'Applying...'
                ) : (
                  <>
                    <span className="btn-text-desktop">Apply Changes</span>
                    <span className="btn-text-mobile">Apply</span>
                  </>
                )}
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
                      <td colSpan={4} style={{ textAlign: 'center', padding: '2.5rem' }}>
                        <div className="empty-state">
                          <div className="empty-state-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                          </div>
                          <span className="empty-state-text">No published configurations found</span>
                          <span className="empty-state-hint">Apply changes to create your first version</span>
                        </div>
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

      {/* Change Password Modal */}
      {passwordModalAccount && (
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

              <div className="modal-actions-row modal-footer-row" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
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

      {/* Batch Import Modal */}
      {showImportModal && (
        <div className="modal-backdrop">
          <div className="import-modal-card">
            <div className="modal-header-row" style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <h3 className="modal-headline" style={{ margin: 0, fontSize: '1.15rem' }}>Batch Import Devices</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportError(null);
                }}
                className="modal-close-icon"
                aria-label="Close"
              >
                <IconClose size={14} />
              </button>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
              Paste devices below (one per line). Supported format: <code>MAC, Name [, Group]</code> or <code>MAC Name</code>.
              Delimiters (comma, semicolon, tab, space) are automatically parsed.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Device List
              </label>
              <textarea
                className="import-textarea"
                placeholder={`00:11:22:33:44:55, Office Laptop, Staff\n0C-F3-46-F3-CC-A9 Guest Tablet\nB8:27:EB:12:34:56, Sensor Node, Default`}
                value={importText}
                onChange={(e) => {
                  setImportText(e.target.value);
                  setImportError(null);
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '180px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                  Fallback Group
                </label>
                <select
                  className="form-input-element"
                  value={importTargetGroup}
                  onChange={(e) => setImportTargetGroup(e.target.value)}
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                >
                  <option value="">Default Group</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', alignSelf: 'flex-end' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {parsedImportItems.length} parsed ({parsedImportItems.filter((i) => i.isValid).length} valid)
                </span>
              </div>
            </div>

            {/* Preview Section */}
            {parsedImportItems.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Import Preview:
                </span>
                <div className="import-preview-wrap">
                  {parsedImportItems.map((item) => (
                    <div key={item.id} className="import-preview-item">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono, monospace)' }}>
                          {item.mac}
                        </span>
                        <span>{item.name}</span>
                        {item.vendor && (
                          <span className="mac-vendor-pill" style={{ fontSize: '0.65rem' }}>
                            {item.vendor}
                          </span>
                        )}
                        {item.group && (
                          <span className="group-tag-pill" style={{ fontSize: '0.65rem' }}>
                            {item.group.name}
                          </span>
                        )}
                        {item.isDuplicate && (
                          <span style={{ fontSize: '0.68rem', color: '#f59e0b', fontWeight: 600 }}>
                            ⚠️ Duplicate
                          </span>
                        )}
                      </div>
                      {!item.isValid && (
                        <span style={{ color: '#ef4444', fontSize: '0.7rem' }}>
                          {item.error || 'Invalid format'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {importError && (
              <div style={{ fontSize: '0.75rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
                {importError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowImportModal(false);
                  setImportError(null);
                }}
                disabled={isImporting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleExecuteImport}
                disabled={isImporting || parsedImportItems.filter((i) => i.isValid).length === 0}
              >
                {isImporting
                  ? 'Importing...'
                  : `Import ${parsedImportItems.filter((i) => i.isValid).length} Devices`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Group Assignment Modal */}
      {showBulkGroupModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '440px' }}>
            <div className="modal-header-row">
              <h3 className="modal-headline">Assign Group</h3>
              <button
                type="button"
                onClick={() => setShowBulkGroupModal(false)}
                className="modal-close-icon"
                aria-label="Close"
              >
                <IconClose size={13} />
              </button>
            </div>

            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Assign <strong>{selectedUserIds.size} selected device(s)</strong> to a group. Changes will remain in pending draft status until applied.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Select Target Group
              </label>
              <select
                className="form-input-element"
                value={bulkTargetGroupId}
                onChange={(e) => setBulkTargetGroupId(e.target.value)}
              >
                <option value="">-- Choose Group --</option>
                {groups.map((g) => {
                  const isRestricted = currentUser?.role === 'subadmin' && g.is_protected;
                  return (
                    <option key={g.id} value={g.id} disabled={isRestricted}>
                      {g.name} {g.is_no_internet ? '(No Internet)' : ''} {g.is_protected ? '(Protected)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowBulkGroupModal(false)}
                disabled={isBulkAssigning}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleExecuteBulkGroupAssign}
                disabled={!bulkTargetGroupId || isBulkAssigning}
              >
                {isBulkAssigning ? 'Updating...' : `Assign to ${selectedUserIds.size} Device(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
