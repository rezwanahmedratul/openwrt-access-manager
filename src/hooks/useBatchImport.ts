'use client';

import { useState, useMemo, useCallback } from 'react';
import { UserViewModel, Group } from '@/lib/types';
import { parseImportText, ParsedImportItem } from '@/lib/csv-import';

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

  // File Upload & Drag-and-Drop state
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileSize, setUploadedFileSize] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Batch Import Parser: supports exported CSV ("Name,MAC Address,Status,Groups") and legacy formats
  const parsedImportItems = useMemo<ParsedImportItem[]>(() => {
    return parseImportText(importText, users, groups, importTargetGroup);
  }, [importText, users, groups, importTargetGroup]);

  // Handle uploaded file (from input picker or drag-drop)
  const handleFileUpload = useCallback(
    async (file: File) => {
      try {
        setImportError(null);
        const text = await file.text();
        setImportText(text);
        setUploadedFileName(file.name);
        setUploadedFileSize(file.size);
        const kbSize = (file.size / 1024).toFixed(1);
        onShowToast(`Loaded ${file.name} (${kbSize} KB)`);
      } catch (err: any) {
        setImportError(`Failed to read file: ${err.message || 'Unknown error'}`);
      }
    },
    [onShowToast]
  );

  // Clear file and text
  const handleClear = useCallback(() => {
    setImportText('');
    setUploadedFileName(null);
    setUploadedFileSize(null);
    setImportError(null);
  }, []);

  // Paste from System Clipboard
  const handlePasteFromClipboard = useCallback(async () => {
    try {
      setImportError(null);
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        setImportError('Clipboard reading is not supported in this browser. Use Ctrl+V / Cmd+V to paste directly into the box.');
        return;
      }
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        onShowToast('Clipboard is empty or does not contain text', 'error');
        return;
      }
      setImportText((prev) => (prev ? `${prev.trim()}\n${text.trim()}` : text.trim()));
      onShowToast(`Pasted ${text.trim().split('\n').length} lines from clipboard`);
    } catch (err: any) {
      setImportError(`Clipboard access failed: ${err.message || 'Permission denied'}. You can paste directly using Ctrl+V.`);
    }
  }, [onShowToast]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        handleFileUpload(file);
      } else {
        const text = e.dataTransfer.getData('text');
        if (text) {
          setImportText(text);
          onShowToast(`Dropped ${text.trim().split('\n').length} lines`);
        }
      }
    },
    [handleFileUpload, onShowToast]
  );

  // Execute Batch Import
  const handleExecuteImport = async () => {
    const validItems = parsedImportItems.filter((item) => item.isValid);
    if (validItems.length === 0) {
      setImportError('No valid devices found to import.');
      return;
    }

    setIsImporting(true);
    setImportError(null);

    // Try high-performance batch draft API first
    const operations = validItems.map((item) => ({
      operation: 'ADD' as const,
      name: item.name,
      mac_address: item.mac,
      group_ids: item.groupIds,
    }));

    try {
      const batchRes = await fetch('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operations }),
      });

      if (batchRes.ok) {
        const batchData = await batchRes.json();
        setIsImporting(false);
        setShowImportModal(false);
        handleClear();
        onShowToast(`Successfully staged ${batchData.count || validItems.length} devices into pending drafts`);
        onRefresh();
        return;
      }
    } catch {
      // If batch fails, fallback to sequential insertion below
    }

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
            group_ids: item.groupIds,
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
    handleClear();
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
    uploadedFileName,
    uploadedFileSize,
    isDragging,
    handleFileUpload,
    handleClear,
    handlePasteFromClipboard,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    parsedImportItems,
    handleExecuteImport,
  };
}
