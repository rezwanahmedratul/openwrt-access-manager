'use client';

import React, { useState, useEffect } from 'react';
import { UserViewModel, Group, DashboardStats } from '@/lib/types';
import { normalizeMac } from '@/lib/normalize-mac';
import { normalizeName } from '@/lib/normalize-name';

export default function DashboardPage() {
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

  // User Modal State
  const [modalMode, setModalMode] = useState<'ADD' | 'EDIT' | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formMac, setFormMac] = useState('');
  const [formGroupIds, setFormGroupIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Group Management Modal State
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [groupModalError, setGroupModalError] = useState<string | null>(null);
  const [groupModalLoading, setGroupModalLoading] = useState(false);

  // History Modal State
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);

  // Feedback Notification
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/users?search=${encodeURIComponent(search)}&group=${encodeURIComponent(selectedGroup)}`);
      const data = await res.json();
      if (data.users) setUsers(data.users);
      if (data.groups) setGroups(data.groups);
      if (data.stats) setStats(data.stats);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, selectedGroup]);

  // Handle Add/Edit User Save
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

    try {
      const payload = {
        operation: modalMode === 'ADD' ? 'ADD' : 'MODIFY',
        user_id: modalMode === 'EDIT' ? editingUserId : null,
        name: normName.normalized,
        mac_address: normMac.normalized,
        group_ids: formGroupIds,
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

      showToast(`User ${normName.normalized} queued in pending draft`);
      setModalMode(null);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Network error');
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
        showToast(`Configuration v${json.version} published`);
        fetchData();
      } else {
        showToast(json.error || 'Failed to apply changes', 'error');
      }
    } catch (err) {
      showToast('Network error applying changes', 'error');
    }
  };

  // Group Management: Create Group
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setGroupModalError(null);
    setGroupModalLoading(true);

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGroupModalError(data.error || 'Failed to create group');
        return;
      }

      showToast(`Group "${newGroupName.trim()}" created successfully`);
      setNewGroupName('');
      fetchData();
    } catch (err: any) {
      setGroupModalError(err.message || 'Network error');
    } finally {
      setGroupModalLoading(false);
    }
  };

  // Group Management: Delete Group with auto-reassignment to Default
  const handleDeleteGroup = async (group: Group) => {
    if (group.name.toLowerCase() === 'default') {
      alert('The "Default" fallback group cannot be deleted.');
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

  // Open Add Dialog
  const openAddModal = () => {
    setModalMode('ADD');
    setEditingUserId(null);
    setFormName('');
    setFormMac('');
    setFormGroupIds([]);
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

  return (
    <div>
      {/* Top Header */}
      <header className="app-header">
        <div className="logo-area">
          <div className="logo-badge">W</div>
          <div className="logo-titles">
            <span className="logo-main">OpenWrt Manager</span>
            <span className="logo-sub">GATEWAY ACCESS</span>
          </div>
        </div>
        <div className="nav-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => setShowGroupModal(true)}>
            Groups
          </button>
          <button className="btn btn-secondary btn-sm" onClick={openHistoryModal}>
            History
          </button>
          <a
            href="/api/config/firewall?download=true"
            className="btn btn-secondary btn-sm"
            download="firewall"
          >
            firewall
          </a>
          <a
            href="/api/config/ethers?download=true"
            className="btn btn-secondary btn-sm"
            download="ethers"
          >
            ethers
          </a>
        </div>
      </header>

      {/* Main Container */}
      <main className="container">
        {/* Toast Alert */}
        {notification && (
          <div className="notification-banner">
            <span className="notification-content">
              <span>{notification.type === 'success' ? '●' : '✕'}</span>
              <span>{notification.message}</span>
            </span>
            <button
              onClick={() => setNotification(null)}
              className="close-button"
            >
              ✕
            </button>
          </div>
        )}

        {/* Hero Section */}
        <div className="hero-section">
          <div>
            <div className="hero-tag">
              <span className="hero-tag-dot"></span>
              <span>Single Gateway Access Management</span>
            </div>
            <h1 className="hero-title">MAC Authentication</h1>
            <p className="hero-desc">
              Publish deterministic access control policies and static DHCP lease bindings directly to your OpenWrt router.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button className="btn btn-secondary" onClick={() => setShowGroupModal(true)}>
              Manage Groups
            </button>
            <button className="btn btn-primary" onClick={openAddModal}>
              + Add User
            </button>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="stats-grid">
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-label">Published Users</span>
              <span className="metric-icon-pill">01</span>
            </div>
            <div className="metric-number">{stats.total_users}</div>
            <div className="metric-caption">Active client rules</div>
          </div>

          <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => setShowGroupModal(true)}>
            <div className="metric-header">
              <span className="metric-label">Groups</span>
              <span className="metric-icon-pill">02</span>
            </div>
            <div className="metric-number">{stats.total_groups}</div>
            <div className="metric-caption">Click to add/delete groups</div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-label">Pending Draft</span>
              <span className="metric-icon-pill">03</span>
            </div>
            <div className="metric-number" style={{ color: stats.pending_changes > 0 ? '#ffffff' : 'var(--text-tertiary)' }}>
              {stats.pending_changes}
            </div>
            <div className="metric-caption">
              {stats.pending_changes > 0 ? 'Unpublished staged items' : 'Synchronized with router'}
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-label">Config Version</span>
              <span className="metric-icon-pill">04</span>
            </div>
            <div className="metric-number">v{stats.current_version ?? 1}</div>
            <div className="metric-caption">
              {stats.last_applied ? `Live since ${new Date(stats.last_applied).toLocaleDateString()}` : 'Initial baseline'}
            </div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="toolbar-card">
          <div className="toolbar-left">
            <div className="search-wrapper">
              <span className="search-icon-svg">🔍</span>
              <input
                type="text"
                className="search-input"
                placeholder="Search user name or MAC address..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="filter-select"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
            >
              <option value="ALL">All Groups</option>
              <option value="UNGROUPED">Ungrouped</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="table-panel">
          <table className="user-table">
            <thead>
              <tr>
                <th style={{ width: '130px' }}>Status</th>
                <th>Name</th>
                <th>MAC Address</th>
                <th>Assigned Groups</th>
                <th style={{ textAlign: 'right', width: '150px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-view">
                      <div className="empty-view-heading">
                        {loading ? 'Loading users...' : 'No users found'}
                      </div>
                      <div>Try another search keyword or create a new user.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} style={{ opacity: u.status === 'deleted' ? 0.35 : 1 }}>
                    <td>
                      <span className={`status-pill status-${u.status}`}>
                        <span className="status-dot"></span>
                        <span>{u.status}</span>
                      </span>
                    </td>
                    <td>
                      <span className="user-name-title">{u.name}</span>
                    </td>
                    <td>
                      <span className="mac-pill">{u.mac_address}</span>
                    </td>
                    <td>
                      <div className="group-tags">
                        {u.groups.length > 0 ? (
                          u.groups.map((g) => (
                            <span key={g.id} className="group-tag">
                              {g.name}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>Ungrouped</span>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {u.status !== 'deleted' ? (
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => openEditModal(u)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-danger-ghost btn-sm"
                            onClick={() => handleDeleteUser(u)}
                          >
                            Delete
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Staged Delete</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Floating Pending Dock */}
      {stats.pending_changes > 0 && (
        <div className="pending-dock-wrap">
          <div className="pending-dock">
            <div className="dock-status">
              <span className="dock-pulse-dot"></span>
              <span className="dock-text">
                {stats.pending_changes} pending {stats.pending_changes === 1 ? 'change' : 'changes'} in draft
              </span>
            </div>
            <div className="dock-actions">
              <button className="btn btn-secondary btn-sm" onClick={handleUndo}>
                ↺ Undo
              </button>
              <button className="btn btn-ghost btn-sm" onClick={handleDiscard}>
                Discard
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleApply}>
                Publish to Router
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Management Modal */}
      {showGroupModal && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Manage Groups</h3>
              <button onClick={() => setShowGroupModal(false)} className="close-button">
                ✕
              </button>
            </div>

            {/* Create Group Form */}
            <form onSubmit={handleCreateGroup} style={{ marginBottom: '1.75rem' }}>
              <label className="form-title">Create New Group</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.45rem' }}>
                <input
                  type="text"
                  className="form-field"
                  placeholder="e.g. Contractors, IoT, VIP"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={groupModalLoading || !newGroupName.trim()}
                >
                  + Add
                </button>
              </div>
              {groupModalError && <div className="form-alert" style={{ marginTop: '0.75rem' }}>{groupModalError}</div>}
            </form>

            <div style={{ borderTop: '1px solid var(--border-hairline)', paddingTop: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <span className="form-title" style={{ marginBottom: 0 }}>Existing Groups ({groups.length})</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                  Deleting reassigns MACs to &quot;Default&quot;
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '280px', overflowY: 'auto' }}>
                {groups.map((group) => {
                  const isDefault = group.name.toLowerCase() === 'default';
                  return (
                    <div
                      key={group.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.7rem 1rem',
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-hairline)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.88rem' }}>{group.name}</span>
                        {isDefault && (
                          <span
                            style={{
                              fontSize: '0.68rem',
                              padding: '0.15rem 0.5rem',
                              borderRadius: 'var(--radius-pill)',
                              background: '#ffffff',
                              color: '#000000',
                              fontWeight: 700,
                            }}
                          >
                            FALLBACK
                          </span>
                        )}
                      </div>

                      {!isDefault ? (
                        <button
                          type="button"
                          className="btn btn-danger-ghost btn-sm"
                          onClick={() => handleDeleteGroup(group)}
                        >
                          Delete
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)' }}>Protected</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowGroupModal(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit User Dialog */}
      {modalMode && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 className="modal-title">{modalMode === 'ADD' ? 'Add Access User' : 'Edit User'}</h3>
              <button onClick={() => setModalMode(null)} className="close-button">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser}>
              {formError && <div className="form-alert">{formError}</div>}

              <div className="form-item">
                <label className="form-title">Name</label>
                <input
                  type="text"
                  className="form-field"
                  placeholder="e.g. ratul ahmed or TP-Link-Anik"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
                <div className="form-hint">Spaces convert to underscores; hyphens are preserved (e.g. Ratul_Ahmed).</div>
              </div>

              <div className="form-item">
                <label className="form-title">MAC Address</label>
                <input
                  type="text"
                  className="form-field"
                  placeholder="e.g. 0cf346f3cca9 or 0C:F3:46:F3:CC:A9"
                  value={formMac}
                  onChange={(e) => setFormMac(e.target.value)}
                  required
                />
                <div className="form-hint">Automatically formats 12 hex digits into standard uppercase pairs.</div>
              </div>

              <div className="form-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-title" style={{ marginBottom: 0 }}>Groups</label>
                  <button
                    type="button"
                    onClick={() => { setModalMode(null); setShowGroupModal(true); }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    + Manage Groups
                  </button>
                </div>
                <div className="pill-grid">
                  {groups.map((group) => {
                    const isChecked = formGroupIds.includes(group.id);
                    return (
                      <label key={group.id} className="pill-check">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormGroupIds([...formGroupIds, group.id]);
                            } else {
                              setFormGroupIds(formGroupIds.filter((id) => id !== group.id));
                            }
                          }}
                        />
                        <span>{group.name}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="form-hint">Groups organize users in the dashboard without altering firewall rules.</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1.8rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalMode(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {modalMode === 'ADD' ? 'Queue Add User' : 'Save to Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Dialog */}
      {showHistory && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '780px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Published Versions</h3>
              <button onClick={() => setShowHistory(false)} className="close-button">
                ✕
              </button>
            </div>

            <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
              <table className="user-table">
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
                      <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
                        No published configurations found.
                      </td>
                    </tr>
                  ) : (
                    historyList.map((h) => (
                      <tr key={h.id}>
                        <td>
                          <span style={{ fontWeight: 600, color: h.is_current ? '#ffffff' : 'var(--text-tertiary)' }}>
                            v{h.version} {h.is_current && ' (Live)'}
                          </span>
                        </td>
                        <td>{h.user_count}</td>
                        <td>
                          <span className="mac-pill" style={{ fontSize: '0.74rem' }}>
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
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
