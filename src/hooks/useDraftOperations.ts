'use client';

import { useState, useMemo } from 'react';
import { UserViewModel, Group } from '@/lib/types';
import { normalizeName } from '@/lib/normalize-name';
import { normalizeMac } from '@/lib/normalize-mac';

interface UseDraftOperationsProps {
  users?: UserViewModel[];
  groups: Group[];
  onRefresh: () => void;
  onShowToast: (message: string, type?: 'success' | 'error') => void;
}

export function useDraftOperations({
  users = [],
  groups,
  onRefresh,
  onShowToast,
}: UseDraftOperationsProps) {
  const [isApplying, setIsApplying] = useState(false);

  // User Edit Modal State
  const [modalMode, setModalMode] = useState<'EDIT' | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formMac, setFormMac] = useState('');
  const [formGroupIds, setFormGroupIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Duplicate checks against other existing users
  const duplicateMacUser = useMemo(() => {
    if (!formMac.trim() || !editingUserId) return null;
    const norm = normalizeMac(formMac);
    if (!norm.valid) return null;
    return (
      users.find(
        (u) =>
          u.id !== editingUserId &&
          u.status !== 'deleted' &&
          u.mac_address.toUpperCase() === norm.normalized.toUpperCase()
      ) || null
    );
  }, [formMac, editingUserId, users]);

  const duplicateNameUser = useMemo(() => {
    if (!formName.trim() || !editingUserId) return null;
    const norm = normalizeName(formName);
    const targetName = (norm.valid ? norm.normalized : formName.trim()).toLowerCase();
    return (
      users.find(
        (u) =>
          u.id !== editingUserId &&
          u.status !== 'deleted' &&
          (u.name.toLowerCase() === targetName ||
            u.name.toLowerCase().replace(/_/g, ' ') === formName.trim().toLowerCase().replace(/_/g, ' '))
      ) || null
    );
  }, [formName, editingUserId, users]);

  // Open Edit Dialog
  const openEditModal = (user: UserViewModel) => {
    setModalMode('EDIT');
    setEditingUserId(user.id);
    setFormName(user.name);
    setFormMac(user.mac_address);
    setFormGroupIds(user.groups.map((g) => g.id));
    setFormError(null);
  };

  // Handle Edit User Save
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

    // Uniqueness validation
    if (duplicateMacUser) {
      setFormError(`MAC address ${normMac.normalized} already exists (registered to "${duplicateMacUser.name}").`);
      return;
    }

    if (duplicateNameUser) {
      setFormError(`User name "${normName.normalized}" already exists (registered to MAC ${duplicateNameUser.mac_address}).`);
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

      onShowToast(`User ${normName.normalized} updated in pending changes`);
      setModalMode(null);
      onRefresh();
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
        onShowToast(json.error || 'Failed to delete user', 'error');
        return;
      }

      onShowToast(`Pending deletion staged for ${user.name}`);
      onRefresh();
    } catch (err) {
      onShowToast('Network error while deleting', 'error');
    }
  };

  // Undo Last Change
  const handleUndo = async () => {
    try {
      const res = await fetch('/api/draft?action=undo', { method: 'DELETE' });
      const json = await res.json();
      if (res.ok) {
        onShowToast('Undid latest pending operation');
        onRefresh();
      } else {
        onShowToast(json.message || 'Nothing to undo', 'error');
      }
    } catch (err) {
      onShowToast('Failed to undo', 'error');
    }
  };

  // Discard All Changes
  const handleDiscard = async () => {
    const confirmDiscard = window.confirm('Discard all pending changes and restore published state?');
    if (!confirmDiscard) return;

    try {
      const res = await fetch('/api/draft', { method: 'DELETE' });
      if (res.ok) {
        onShowToast('All pending draft changes discarded');
        onRefresh();
      }
    } catch (err) {
      onShowToast('Failed to discard changes', 'error');
    }
  };

  // Apply Changes
  const handleApply = async () => {
    if (isApplying) return;
    setIsApplying(true);

    try {
      const res = await fetch('/api/apply', { method: 'POST' });
      const json = await res.json();
      if (res.ok) {
        onShowToast(`Configuration v${json.version} published successfully`);
        onRefresh();
      } else {
        onShowToast(json.error || 'Failed to apply changes', 'error');
      }
    } catch (err) {
      onShowToast('Network error applying changes', 'error');
    } finally {
      setIsApplying(false);
    }
  };

  return {
    isApplying,
    modalMode,
    setModalMode,
    editingUserId,
    formName,
    setFormName,
    formMac,
    setFormMac,
    formGroupIds,
    setFormGroupIds,
    formError,
    setFormError,
    duplicateMacUser,
    duplicateNameUser,
    openEditModal,
    handleSaveUser,
    handleDeleteUser,
    handleUndo,
    handleDiscard,
    handleApply,
  };
}
