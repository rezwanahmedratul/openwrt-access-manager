'use client';

import { useState, useMemo, useEffect } from 'react';
import { UserViewModel, SessionUser, Group } from '@/lib/types';

interface UseBulkActionsProps {
  users: UserViewModel[];
  displayedUsers: UserViewModel[];
  currentUser: SessionUser | null;
  onRefresh: () => void;
  onShowToast: (message: string, type?: 'success' | 'error') => void;
}

export function useBulkActions({
  users,
  displayedUsers,
  currentUser,
  onRefresh,
  onShowToast,
}: UseBulkActionsProps) {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  // Bulk Group Assignment Modal State
  const [showBulkGroupModal, setShowBulkGroupModal] = useState(false);
  const [bulkTargetGroupId, setBulkTargetGroupId] = useState('');
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);

  // Clear bulk selection when data changes
  useEffect(() => {
    setSelectedUserIds(new Set());
  }, [users]);

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
      onShowToast('No eligible users to delete (already deleted or protected)', 'error');
      setSelectedUserIds(new Set());
      return;
    }

    const confirmBulk = window.confirm(
      `Queue deletion for ${targetUsers.length} selected user(s)? Changes remain pending until applied.`
    );
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
      onShowToast(`Queued ${successCount} deletion(s), ${failCount} failed`, 'error');
    } else {
      onShowToast(`${successCount} user(s) queued for deletion`);
    }
    onRefresh();
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
    onShowToast(`Updated ${count} users to selected group`);
    onRefresh();
  };

  return {
    isSelectionMode,
    setIsSelectionMode,
    selectedUserIds,
    setSelectedUserIds,
    selectableUsers,
    handleToggleSelectionMode,
    handleToggleSelectAll,
    handleToggleSelectUser,
    handleBulkDelete,
    showBulkGroupModal,
    setShowBulkGroupModal,
    bulkTargetGroupId,
    setBulkTargetGroupId,
    isBulkAssigning,
    handleExecuteBulkGroupAssign,
  };
}
