'use client';

import { useState, useRef, useMemo } from 'react';
import { UserViewModel, Group } from '@/lib/types';
import { normalizeMac } from '@/lib/normalize-mac';
import { normalizeName } from '@/lib/normalize-name';
import { getMacVendor } from '@/lib/mac-vendors';

interface UseQuickAddProps {
  users: UserViewModel[];
  groups: Group[];
  onSuccess: () => void;
  onShowToast: (message: string, type?: 'success' | 'error') => void;
}

export function useQuickAdd({ users, groups, onSuccess, onShowToast }: UseQuickAddProps) {
  const [macOctets, setMacOctets] = useState<string[]>(['', '', '', '', '', '']);
  const [addName, setAddName] = useState('');
  const [addSelectedGroup, setAddSelectedGroup] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isAddFormCollapsed, setIsAddFormCollapsed] = useState(false);

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

  const quickAddDuplicateName = useMemo(() => {
    const trimmed = addName.trim();
    if (!trimmed) return null;
    const norm = normalizeName(trimmed);
    const targetName = norm.valid ? norm.normalized.toLowerCase() : trimmed.toLowerCase();
    return (
      users.find(
        (u) =>
          u.status !== 'deleted' &&
          (u.name.toLowerCase() === targetName ||
            u.name.toLowerCase().replace(/_/g, ' ') === trimmed.toLowerCase().replace(/_/g, ' '))
      ) || null
    );
  }, [addName, users]);

  // Helper: Distribute full or partial MAC string across the 6 octet boxes
  const distributeMacString = (startIndex: number, raw: string) => {
    const hexOnly = raw.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
    if (!hexOnly) return;

    const fullString = hexOnly.slice(0, 12);
    const newOctets = [...macOctets];

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

  // Segmented MAC Input Change
  const handleMacChange = (index: number, val: string) => {
    const clean = val.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();

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
          onShowToast('MAC address pasted from clipboard');
        }
      }
    } catch {
      macInputRefs.current[0]?.focus();
    }
  };

  // Segmented MAC Keydown
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

  // Segmented MAC Paste Handler
  const handleMacPaste = (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData?.getData('text');
    if (!pasted) return;

    e.preventDefault();
    distributeMacString(index, pasted);
  };

  // Submit Add User
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

    // Uniqueness validation: MAC Address
    const existingByMac = users.find(
      (u) => u.status !== 'deleted' && u.mac_address.toUpperCase() === normMac.normalized.toUpperCase()
    );
    if (existingByMac) {
      setAddError(`MAC address ${normMac.normalized} already exists (registered to "${existingByMac.name}").`);
      return;
    }

    // Uniqueness validation: User Name
    const targetName = normName.normalized.toLowerCase();
    const existingByName = users.find(
      (u) =>
        u.status !== 'deleted' &&
        (u.name.toLowerCase() === targetName ||
          u.name.toLowerCase().replace(/_/g, ' ') === normName.normalized.toLowerCase().replace(/_/g, ' '))
    );
    if (existingByName) {
      setAddError(`User name "${normName.normalized}" already exists (registered to MAC ${existingByName.mac_address}).`);
      nameInputRef.current?.focus();
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

      onShowToast(`User ${normName.normalized} (${normMac.normalized}) staged in pending changes`);
      setMacOctets(['', '', '', '', '', '']);
      setAddName('');
      setAddSelectedGroup('');
      setAddError(null);
      onSuccess();
      macInputRefs.current[0]?.focus();
    } catch (err: any) {
      setAddError(err.message || 'Network error');
    } finally {
      setIsAdding(false);
    }
  };

  return {
    macOctets,
    setMacOctets,
    addName,
    setAddName,
    addSelectedGroup,
    setAddSelectedGroup,
    addError,
    setAddError,
    isAdding,
    isAddFormCollapsed,
    setIsAddFormCollapsed,
    macInputRefs,
    nameInputRef,
    quickAddMacString,
    quickAddVendor,
    quickAddDuplicate,
    quickAddDuplicateName,
    distributeMacString,
    handleMacChange,
    handleMacKeyDown,
    handleMacPaste,
    handlePasteClipboardDirect,
    handleAddUserDirect,
  };
}
