'use client';

import { useState, useMemo } from 'react';
import { UserViewModel, Group } from '@/lib/types';
import { normalizeMac } from '@/lib/normalize-mac';
import { normalizeName } from '@/lib/normalize-name';
import { getMacVendor } from '@/lib/mac-vendors';

interface UseBatchImportProps {
  users: UserViewModel[];
  groups: Group[];
  onRefresh: () => void;
  onShowToast: (message: string, type?: 'success' | 'error') => void;
}

export function useBatchImport({
  users,
  groups,
  onRefresh,
  onShowToast,
}: UseBatchImportProps) {
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importTargetGroup, setImportTargetGroup] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Batch Import Parser
  const parsedImportItems = useMemo(() => {
    if (!importText.trim()) return [];
    const lines = importText.split('\n');
    const seenMacsInBatch = new Set<string>();
    const seenNamesInBatch = new Set<string>();

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

        const normalizedMacUpper = macRes.valid ? macRes.normalized.toUpperCase() : '';
        const normalizedNameLower = nameRes.valid ? nameRes.normalized.toLowerCase() : '';

        // Check duplicate MAC against existing active users or earlier items in batch
        const isDuplicateMacExisting =
          macRes.valid &&
          users.some(
            (u) => u.status !== 'deleted' && u.mac_address.toUpperCase() === normalizedMacUpper
          );
        const isDuplicateMacBatch = macRes.valid && seenMacsInBatch.has(normalizedMacUpper);
        const isDuplicateMac = isDuplicateMacExisting || isDuplicateMacBatch;

        // Check duplicate Name against existing active users or earlier items in batch
        const isDuplicateNameExisting =
          nameRes.valid &&
          users.some(
            (u) =>
              u.status !== 'deleted' &&
              (u.name.toLowerCase() === normalizedNameLower ||
                u.name.toLowerCase().replace(/_/g, ' ') === normalizedNameLower.replace(/_/g, ' '))
          );
        const isDuplicateNameBatch = nameRes.valid && seenNamesInBatch.has(normalizedNameLower);
        const isDuplicateName = isDuplicateNameExisting || isDuplicateNameBatch;

        if (macRes.valid) seenMacsInBatch.add(normalizedMacUpper);
        if (nameRes.valid) seenNamesInBatch.add(normalizedNameLower);

        const isDuplicate = isDuplicateMac || isDuplicateName;
        const duplicateReason =
          isDuplicateMac && isDuplicateName
            ? 'Duplicate MAC & Name'
            : isDuplicateMac
            ? 'Duplicate MAC'
            : isDuplicateName
            ? 'Duplicate Name'
            : null;

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
          isDuplicate,
          duplicateReason,
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
        duplicateReason?: string | null;
      }[];
  }, [importText, users, groups, importTargetGroup]);

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
    onShowToast(`Imported ${successCount} devices to pending drafts${failCount > 0 ? ` (${failCount} failed)` : ''}`);
    onRefresh();
  };

  return {
    showImportModal,
    setShowImportModal,
    importText,
    setImportText,
    importTargetGroup,
    setImportTargetGroup,
    isImporting,
    importError,
    setImportError,
    parsedImportItems,
    handleExecuteImport,
  };
}
