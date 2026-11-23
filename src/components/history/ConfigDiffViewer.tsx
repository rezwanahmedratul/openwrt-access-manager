'use client';

import React, { useMemo } from 'react';

export interface StructuralDiff {
  added_devices?: Array<{ name?: string; mac?: string; mac_address?: string; group?: string }>;
  removed_devices?: Array<{ name?: string; mac?: string; mac_address?: string; group?: string }>;
  modified_devices?: Array<{ name?: string; mac?: string; mac_address?: string; changes?: string[] | string }>;
  group_changes?: Array<{ group?: string; change?: string; name?: string }>;
  policy_changes?: Array<{ policy?: string; from?: string; to?: string }>;
}

interface ConfigDiffViewerProps {
  oldText: string;
  newText: string;
  diff?: StructuralDiff | null;
}

// Helper: Parse UCI firewall rules into device maps to compute structural diff if not pre-computed
function parseUciDevices(text: string) {
  const devices = new Map<string, { name: string; mac: string; target: string; fullRule: string }>();
  if (!text) return devices;

  const blocks = text.split(/(?=config rule)/);
  for (const block of blocks) {
    if (!block.trim().startsWith('config rule')) continue;
    const nameMatch = block.match(/option\s+name\s+['"]([^'"]+)['"]/);
    const macMatch = block.match(/option\s+src_mac\s+['"]([^'"]+)['"]/i);
    const targetMatch = block.match(/option\s+target\s+['"]([^'"]+)['"]/);

    if (nameMatch && macMatch) {
      const mac = macMatch[1].toUpperCase();
      const name = nameMatch[1];
      const target = targetMatch ? targetMatch[1] : 'ACCEPT';
      devices.set(mac, { name, mac, target, fullRule: block.trim() });
    }
  }
  return devices;
}

export const ConfigDiffViewer: React.FC<ConfigDiffViewerProps> = ({ oldText, newText, diff: providedDiff }) => {
  // If structural diff isn't provided directly, compute from UCI texts
  const computedDiff = useMemo<StructuralDiff>(() => {
    if (providedDiff) return providedDiff;

    const oldDevs = parseUciDevices(oldText || '');
    const newDevs = parseUciDevices(newText || '');

    const added: Array<{ name: string; mac: string }> = [];
    const removed: Array<{ name: string; mac: string }> = [];
    const modified: Array<{ name: string; mac: string; changes: string[] }> = [];

    newDevs.forEach((nDev, mac) => {
      if (!oldDevs.has(mac)) {
        added.push({ name: nDev.name, mac });
      } else {
        const oDev = oldDevs.get(mac)!;
        const changes: string[] = [];
        if (oDev.name !== nDev.name) changes.push(`Renamed from "${oDev.name}"`);
        if (oDev.target !== nDev.target) changes.push(`Policy changed to ${nDev.target}`);
        if (changes.length > 0) {
          modified.push({ name: nDev.name, mac, changes });
        }
      }
    });

    oldDevs.forEach((oDev, mac) => {
      if (!newDevs.has(mac)) {
        removed.push({ name: oDev.name, mac });
      }
    });

    return {
      added_devices: added,
      removed_devices: removed,
      modified_devices: modified,
      group_changes: [],
    };
  }, [oldText, newText, providedDiff]);

  const addedCount = computedDiff.added_devices?.length || 0;
  const removedCount = computedDiff.removed_devices?.length || 0;
  const modifiedCount = computedDiff.modified_devices?.length || 0;
  const groupCount = computedDiff.group_changes?.length || 0;
  const totalDeviceChanges = addedCount + removedCount + modifiedCount + groupCount;

  // Compute text diff lines
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {/* Structural Diff Summary Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          flexWrap: 'wrap',
          padding: '0.65rem 0.85rem',
          background: 'var(--bg-app)',
          borderRadius: '6px',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)', marginRight: '0.25rem' }}>
          CHANGE DELTA:
        </span>

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            fontSize: '0.72rem',
            fontWeight: 600,
            padding: '0.2rem 0.55rem',
            borderRadius: '9999px',
            background: 'var(--bg-card-subtle)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <span>+{addedCount} Added</span>
        </span>

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            fontSize: '0.72rem',
            fontWeight: 600,
            padding: '0.2rem 0.55rem',
            borderRadius: '9999px',
            background: 'var(--bg-card-subtle)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <span>-{removedCount} Removed</span>
        </span>

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            fontSize: '0.72rem',
            fontWeight: 600,
            padding: '0.2rem 0.55rem',
            borderRadius: '9999px',
            background: 'var(--bg-card-subtle)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <span>~{modifiedCount} Modified</span>
        </span>

        {groupCount > 0 && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.72rem',
              fontWeight: 600,
              padding: '0.2rem 0.55rem',
              borderRadius: '9999px',
              background: 'var(--bg-card-subtle)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <span>{groupCount} Group Changes</span>
          </span>
        )}
      </div>

      {/* Structural Changes Breakdown Cards */}
      {totalDeviceChanges > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.76rem' }}>
          {computedDiff.added_devices?.map((d, i) => (
            <div
              key={`add-dev-${i}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.4rem 0.65rem',
                borderRadius: '4px',
                background: 'var(--bg-card-subtle)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>+ ADDED:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.name || 'Unnamed Device'}</span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                {d.mac || d.mac_address}
              </span>
            </div>
          ))}

          {computedDiff.removed_devices?.map((d, i) => (
            <div
              key={`rem-dev-${i}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.4rem 0.65rem',
                borderRadius: '4px',
                background: 'var(--bg-card-subtle)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>- REMOVED:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.name || 'Unnamed Device'}</span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                {d.mac || d.mac_address}
              </span>
            </div>
          ))}

          {computedDiff.modified_devices?.map((d, i) => (
            <div
              key={`mod-dev-${i}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.4rem 0.65rem',
                borderRadius: '4px',
                background: 'var(--bg-card-subtle)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>~ MODIFIED:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.name}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>
                  ({Array.isArray(d.changes) ? d.changes.join(', ') : d.changes})
                </span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                {d.mac || d.mac_address}
              </span>
            </div>
          ))}

          {computedDiff.group_changes?.map((g, i) => (
            <div
              key={`grp-dev-${i}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.65rem',
                borderRadius: '4px',
                background: 'var(--bg-card-subtle)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>GROUP UPDATE:</span>
              <span>{g.group || g.name}: {g.change}</span>
            </div>
          ))}
        </div>
      )}

      {/* Line-by-Line Code Pre */}
      {result.length === 0 ? (
        <div style={{ padding: '1.5rem', color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.85rem' }}>
          Identical configuration content (no rule changes detected between releases)
        </div>
      ) : (
        <pre className="history-code-pre">{result}</pre>
      )}
    </div>
  );
};
