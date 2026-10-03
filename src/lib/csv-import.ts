// ============================================================
// CSV / Text Device Import Parser & Format Synchronizer
// Supports exported CSV format: "Name,MAC Address,Status,Groups"
// As well as legacy formats: "MAC, Name, Group" and space-delimited
// ============================================================

import { Group, UserViewModel } from './types';
import { normalizeMac } from './normalize-mac';
import { normalizeName } from './normalize-name';
import { getMacVendor } from './mac-vendors';

export interface ParsedImportItem {
  id: string;
  raw: string;
  rawMac: string;
  rawName: string;
  mac: string;
  name: string;
  vendor: string | null;
  groups: Group[];
  group?: Group;
  groupIds: string[];
  status?: string;
  isValid: boolean;
  error?: string | null;
  isDuplicate: boolean;
  duplicateReason?: string | null;
}

export interface HeaderMapping {
  hasHeader: boolean;
  nameIdx: number;
  macIdx: number;
  statusIdx: number;
  groupsIdx: number;
}

/**
 * Splits a single CSV/TSV line respecting double-quoted values (RFC 4180).
 */
export function parseCSVLine(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed) return [];

  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let hasQuotes = false;

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    if (char === '"') {
      hasQuotes = true;
      if (inQuotes && trimmed[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  // If only 1 cell resulted and no quotes were used, support tab or whitespace separation
  if (result.length === 1 && !hasQuotes) {
    if (trimmed.includes('\t')) {
      return trimmed.split('\t').map((p) => p.trim()).filter(Boolean);
    }
    const ws = trimmed.split(/\s+/);
    if (ws.length >= 2) {
      if (normalizeMac(ws[0]).valid) {
        return [ws[0], ws.slice(1).join(' ')];
      } else if (normalizeMac(ws[ws.length - 1]).valid) {
        return [ws.slice(0, -1).join(' '), ws[ws.length - 1]];
      }
      return ws;
    }
  }

  return result;
}

/**
 * Detects if a row of cells is a CSV header row and maps column indices.
 */
export function detectHeader(parts: string[]): HeaderMapping {
  if (parts.length === 0) {
    return { hasHeader: false, nameIdx: -1, macIdx: -1, statusIdx: -1, groupsIdx: -1 };
  }

  const cleanParts = parts.map((p) => p.toLowerCase().replace(/["'_\s]/g, '').trim());
  const rawFirst = parts[0].trim();

  // If line starts with comment '#'
  const isComment = rawFirst.startsWith('#');

  let nameIdx = -1;
  let macIdx = -1;
  let statusIdx = -1;
  let groupsIdx = -1;

  cleanParts.forEach((clean, idx) => {
    const c = clean.replace(/^#/, '');
    if (c === 'name' || c === 'devicename' || c === 'hostname' || c === 'user' || c === 'username') {
      nameIdx = idx;
    } else if (c === 'mac' || c === 'macaddress' || c === 'macaddr' || c === 'ether' || c === 'ethers') {
      macIdx = idx;
    } else if (c === 'status' || c === 'state') {
      statusIdx = idx;
    } else if (c === 'group' || c === 'groups' || c === 'grouplist') {
      groupsIdx = idx;
    }
  });

  // Verify it's actually a header (neither first nor second cell is an actual valid MAC address)
  const isHeader =
    isComment ||
    ((nameIdx !== -1 || macIdx !== -1) &&
      !normalizeMac(parts[0]).valid &&
      !normalizeMac(parts[1] || '').valid);

  return {
    hasHeader: isHeader,
    nameIdx,
    macIdx,
    statusIdx,
    groupsIdx,
  };
}

/**
 * Parse an entire raw CSV / text string into an array of validated ParsedImportItem objects.
 * Automatically recognizes:
 * 1. Export format: "Name,MAC Address,Status,Groups"
 * 2. Header-based CSV with arbitrary column ordering
 * 3. Legacy positional CSV: "MAC, Name, Groups"
 * 4. Space / Tab delimited devices
 */
export function parseImportText(
  text: string,
  existingUsers: UserViewModel[],
  availableGroups: Group[],
  fallbackGroupId?: string
): ParsedImportItem[] {
  if (!text || !text.trim()) return [];

  const rawLines = text.split('\n');
  const seenMacsInBatch = new Set<string>();
  const seenNamesInBatch = new Set<string>();

  // First pass: check if the first non-empty line is a header
  let headerMapping: HeaderMapping = {
    hasHeader: false,
    nameIdx: -1,
    macIdx: -1,
    statusIdx: -1,
    groupsIdx: -1,
  };
  let headerLineIndex = -1;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (!line) continue;
    const parts = parseCSVLine(line);
    const candidateHeader = detectHeader(parts);
    if (candidateHeader.hasHeader) {
      headerMapping = candidateHeader;
      headerLineIndex = i;
    }
    break;
  }

  const items: ParsedImportItem[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    // Skip header line
    if (i === headerLineIndex) continue;

    const line = rawLines[i].trim();
    if (!line || line.startsWith('#')) continue;

    const parts = parseCSVLine(line);
    if (parts.length === 0) continue;

    let rawName = '';
    let rawMac = '';
    let rawStatus = '';
    let rawGroups = '';

    if (headerMapping.hasHeader) {
      if (headerMapping.nameIdx !== -1 && parts[headerMapping.nameIdx] !== undefined) {
        rawName = parts[headerMapping.nameIdx];
      }
      if (headerMapping.macIdx !== -1 && parts[headerMapping.macIdx] !== undefined) {
        rawMac = parts[headerMapping.macIdx];
      }
      if (headerMapping.statusIdx !== -1 && parts[headerMapping.statusIdx] !== undefined) {
        rawStatus = parts[headerMapping.statusIdx];
      }
      if (headerMapping.groupsIdx !== -1 && parts[headerMapping.groupsIdx] !== undefined) {
        rawGroups = parts[headerMapping.groupsIdx];
      }
    } else {
      // Positional heuristic: check if parts[1] is MAC (export format: Name, MAC, Status, Groups)
      // or if parts[0] is MAC (legacy format: MAC, Name, Groups)
      const macInSecondPos = parts[1] && normalizeMac(parts[1]).valid;
      const macInFirstPos = parts[0] && normalizeMac(parts[0]).valid;

      if (macInSecondPos) {
        rawName = parts[0] || '';
        rawMac = parts[1] || '';
        if (parts.length >= 4) {
          rawStatus = parts[2] || '';
          rawGroups = parts[3] || '';
        } else if (parts.length === 3) {
          const p2Lower = parts[2].toLowerCase();
          if (['applied', 'added', 'modified', 'deleted'].includes(p2Lower)) {
            rawStatus = parts[2];
            rawGroups = '';
          } else {
            rawStatus = '';
            rawGroups = parts[2];
          }
        }
      } else if (macInFirstPos) {
        rawMac = parts[0] || '';
        rawName = parts[1] || '';
        rawGroups = parts[2] || '';
        rawStatus = parts[3] || '';
      } else {
        // Fallback default: parts[0] MAC, parts[1] Name, parts[2] Groups
        rawMac = parts[0] || '';
        rawName = parts[1] || '';
        rawGroups = parts[2] || '';
        rawStatus = parts[3] || '';
      }
    }

    // Clean any residual surrounding quotes
    rawName = rawName.replace(/^["']|["']$/g, '').trim();
    rawMac = rawMac.replace(/^["']|["']$/g, '').trim();
    rawGroups = rawGroups.replace(/^["']|["']$/g, '').trim();
    rawStatus = rawStatus.replace(/^["']|["']$/g, '').trim();

    const macRes = normalizeMac(rawMac);
    const nameRes = normalizeName(rawName);

    const normalizedMacUpper = macRes.valid ? macRes.normalized.toUpperCase() : '';
    const normalizedNameLower = nameRes.valid ? nameRes.normalized.toLowerCase() : '';

    // Check duplicate MAC against existing active users or earlier items in batch
    const isDuplicateMacExisting =
      macRes.valid &&
      existingUsers.some(
        (u) => u.status !== 'deleted' && u.mac_address.toUpperCase() === normalizedMacUpper
      );
    const isDuplicateMacBatch = macRes.valid && seenMacsInBatch.has(normalizedMacUpper);
    const isDuplicateMac = isDuplicateMacExisting || isDuplicateMacBatch;

    // Check duplicate Name against existing active users or earlier items in batch
    const isDuplicateNameExisting =
      nameRes.valid &&
      existingUsers.some(
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

    // Match groups from CSV: support semicolon ';' or comma ',' separated multiple groups
    const groupTokens = rawGroups
      ? rawGroups
          .split(/[;,]/)
          .map((g) => g.trim())
          .filter(Boolean)
      : [];

    const matchedGroups: Group[] = [];
    const seenGroupIdSet = new Set<string>();

    for (const gToken of groupTokens) {
      const found = availableGroups.find((g) => g.name.toLowerCase() === gToken.toLowerCase());
      if (found && !seenGroupIdSet.has(found.id)) {
        matchedGroups.push(found);
        seenGroupIdSet.add(found.id);
      }
    }

    // Fallback if no matching group was found
    if (matchedGroups.length === 0) {
      let fallback: Group | undefined;
      if (fallbackGroupId) {
        fallback = availableGroups.find((g) => g.id === fallbackGroupId);
      }
      if (!fallback) {
        fallback = availableGroups.find((g) => g.name.toLowerCase() === 'default') || availableGroups[0];
      }
      if (fallback) {
        matchedGroups.push(fallback);
        seenGroupIdSet.add(fallback.id);
      }
    }

    const vendor = macRes.valid ? getMacVendor(macRes.normalized) : null;

    items.push({
      id: `import-${i}-${Date.now()}`,
      raw: line,
      rawMac,
      rawName,
      mac: macRes.valid ? macRes.normalized : rawMac,
      name: nameRes.valid ? nameRes.normalized : rawName,
      vendor,
      groups: matchedGroups,
      group: matchedGroups[0],
      groupIds: matchedGroups.map((g) => g.id),
      status: rawStatus || undefined,
      isValid: macRes.valid && nameRes.valid,
      error: !macRes.valid ? macRes.error : !nameRes.valid ? nameRes.error : null,
      isDuplicate,
      duplicateReason,
    });
  }

  return items;
}
