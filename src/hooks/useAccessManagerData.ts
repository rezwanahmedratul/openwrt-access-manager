'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { UserViewModel, Group, DashboardStats, SessionUser } from '@/lib/types';

interface UseAccessManagerDataProps {
  currentUser: SessionUser | null;
  onShowToast: (message: string, type?: 'success' | 'error') => void;
}

export function useAccessManagerData({ currentUser, onShowToast }: UseAccessManagerDataProps) {
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

  // Debounce search by 200ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 200);
    return () => clearTimeout(handler);
  }, [search]);

  // Column Sorting State
  const [sortColumn, setSortColumn] = useState<'name' | 'mac_address' | 'status' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Status Filter State
  const [statusFilter, setStatusFilter] = useState<'all' | 'applied' | 'added' | 'modified' | 'deleted'>('all');

  // MAC Copy Feedback
  const [copiedMac, setCopiedMac] = useState<string | null>(null);

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

  // Dashboard Pagination State
  const [dashboardPage, setDashboardPage] = useState(1);
  const DASHBOARD_PAGE_SIZE = 10;
  const dashboardTotalPages = Math.max(1, Math.ceil(displayedUsers.length / DASHBOARD_PAGE_SIZE));
  const paginatedDashboardUsers = useMemo(() => {
    const start = (dashboardPage - 1) * DASHBOARD_PAGE_SIZE;
    return displayedUsers.slice(start, start + DASHBOARD_PAGE_SIZE);
  }, [displayedUsers, dashboardPage]);

  // Reset pagination to first page when search or filters change
  useEffect(() => {
    setDashboardPage(1);
  }, [search, statusFilter, selectedGroup]);

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

  // Copy MAC address to clipboard
  const handleCopyMac = async (mac: string) => {
    try {
      await navigator.clipboard.writeText(mac);
      setCopiedMac(mac);
      setTimeout(() => setCopiedMac(null), 1500);
    } catch {
      // fallback
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
    onShowToast(`Exported ${users.length} users as CSV`);
  };

  // Fetch all users, groups, and stats
  const fetchData = useCallback(async (searchQuery = debouncedSearch, groupFilter = selectedGroup) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/users?search=${encodeURIComponent(searchQuery)}&group=${encodeURIComponent(groupFilter)}`);
      const data = await res.json();
      if (data.users) setUsers(data.users);
      if (data.groups) setGroups(data.groups);
      if (data.stats) setStats(data.stats);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedGroup]);

  // Debounced users fetch: triggers on search/group filter changes
  useEffect(() => {
    if (currentUser) {
      fetchData(debouncedSearch, selectedGroup);
    }
  }, [debouncedSearch, selectedGroup, currentUser, fetchData]);

  const handleRefreshData = () => {
    fetchData(debouncedSearch, selectedGroup);
    onShowToast('Data refreshed');
  };

  return {
    users,
    setUsers,
    groups,
    setGroups,
    stats,
    setStats,
    loading,
    search,
    setSearch,
    debouncedSearch,
    selectedGroup,
    setSelectedGroup,
    statusFilter,
    setStatusFilter,
    sortColumn,
    sortDirection,
    handleSortToggle,
    sortArrow,
    displayedUsers,
    dashboardPage,
    setDashboardPage,
    DASHBOARD_PAGE_SIZE,
    dashboardTotalPages,
    paginatedDashboardUsers,
    copiedMac,
    handleCopyMac,
    handleExportCSV,
    fetchData,
    handleRefreshData,
  };
}
