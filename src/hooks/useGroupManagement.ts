'use client';

import { useState } from 'react';
import { Group, SessionUser } from '@/lib/types';

interface UseGroupManagementProps {
  currentUser: SessionUser | null;
  onRefresh: () => void;
  onShowToast: (message: string, type?: 'success' | 'error') => void;
}

export function useGroupManagement({
  currentUser,
  onRefresh,
  onShowToast,
}: UseGroupManagementProps) {
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

  // Create Group
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

      onShowToast(`Group "${newGroupName.trim()}" created successfully`);
      setNewGroupName('');
      setNewGroupIsProtected(false);
      setNewGroupIsNoInternet(false);
      onRefresh();
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
      onShowToast(`Group protection updated to ${!currentProtection ? 'Protected' : 'Standard'}`);
      onRefresh();
    } catch {
      onShowToast('Network error updating group protection', 'error');
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
      onShowToast(
        nextNoInternet
          ? `Group "${group.name}" tagged as No Internet. Internet blocked for members.`
          : `Group "${group.name}" restored to Internet Access.`
      );
      onRefresh();
    } catch {
      onShowToast('Network error updating No Internet tag', 'error');
    }
  };

  // Delete Group with auto-reassignment to Default
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

      onShowToast(data.message || `Group "${group.name}" deleted`);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Network error deleting group');
    }
  };

  return {
    newGroupName,
    setNewGroupName,
    newGroupIsProtected,
    setNewGroupIsProtected,
    newGroupIsNoInternet,
    setNewGroupIsNoInternet,
    groupError,
    groupLoading,
    conflictModalData,
    setConflictModalData,
    isResolvingConflict,
    setIsResolvingConflict,
    handleCreateGroup,
    handleToggleProtection,
    handleToggleNoInternet,
    handleDeleteGroup,
  };
}
