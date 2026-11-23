import crypto from 'crypto';
import { DeviceSchedule, Group } from './types';

/**
 * Base firewall rules template exactly matching the OpenWrt firewall configuration specification.
 */
const FIREWALL_BASE_TEMPLATE = `config defaults
	option input 'REJECT'
	option output 'ACCEPT'
	option forward 'REJECT'
	option flow_offloading '1'
	option flow_offloading_hw '1'
	option fullcone '1'
	option synflood_protect '1'

config zone
	option name 'lan'
	option input 'ACCEPT'
	option output 'ACCEPT'
	option forward 'ACCEPT'
	list network 'lan'

config rule
	option name 'Allow-DHCP-Renew'
	option src 'wan'
	option proto 'udp'
	option dest_port '68'
	option target 'ACCEPT'
	option family 'ipv4'
	option enabled '1'

config rule
	option name 'Allow-Ping'
	option src 'wan'
	option proto 'icmp'
	option icmp_type 'echo-request'
	option family 'ipv4'
	option target 'ACCEPT'
	option enabled '1'

config rule
	option name 'Allow-IGMP'
	option src 'wan'
	option proto 'igmp'
	option family 'ipv4'
	option target 'ACCEPT'
	option enabled '1'

config rule
	option name 'Allow-DHCPv6'
	option src 'wan'
	option proto 'udp'
	option dest_port '546'
	option family 'ipv6'
	option target 'ACCEPT'
	option enabled '1'

config rule
	option name 'Allow-MLD'
	option src 'wan'
	option proto 'icmp'
	option src_ip 'fe80::/10'
	list icmp_type '130/0'
	list icmp_type '131/0'
	list icmp_type '132/0'
	list icmp_type '143/0'
	option family 'ipv6'
	option target 'ACCEPT'
	option enabled '1'

config rule
	option name 'Allow-ICMPv6-Input'
	option src 'wan'
	option proto 'icmp'
	list icmp_type 'echo-request'
	list icmp_type 'echo-reply'
	list icmp_type 'destination-unreachable'
	list icmp_type 'packet-too-big'
	list icmp_type 'time-exceeded'
	list icmp_type 'bad-header'
	list icmp_type 'unknown-header-type'
	list icmp_type 'router-solicitation'
	list icmp_type 'neighbour-solicitation'
	list icmp_type 'router-advertisement'
	list icmp_type 'neighbour-advertisement'
	option limit '1000/sec'
	option family 'ipv6'
	option target 'ACCEPT'
	option enabled '1'

config rule
	option name 'Allow-ICMPv6-Forward'
	option src 'wan'
	option dest '*'
	option proto 'icmp'
	list icmp_type 'echo-request'
	list icmp_type 'echo-reply'
	list icmp_type 'destination-unreachable'
	list icmp_type 'packet-too-big'
	list icmp_type 'time-exceeded'
	list icmp_type 'bad-header'
	list icmp_type 'unknown-header-type'
	option limit '1000/sec'
	option family 'ipv6'
	option target 'ACCEPT'
	option enabled '1'

config rule
	option name 'Allow-IPSec-ESP'
	option src 'wan'
	option dest 'lan'
	option proto 'esp'
	option target 'ACCEPT'
	option enabled '1'

config rule
	option name 'Allow-ISAKMP'
	option src 'wan'
	option dest 'lan'
	option dest_port '500'
	option proto 'udp'
	option target 'ACCEPT'
	option enabled '1'

config rule
	option name 'Allow-SSH'
	option src 'wan'
	option proto 'tcp'
	option dest_port '22'
	option target 'ACCEPT'
	option enabled '1'

config rule
	option name 'Allow-WebUI'
	option src 'wan'
	option proto 'tcp'
	option dest_port '80'
	option target 'ACCEPT'
	option enabled '1'

config zone
	option name 'wan'
	option input 'REJECT'
	option output 'ACCEPT'
	option forward 'DROP'
	option masq '1'
	option mtu_fix '1'
	list network 'wan'
	list network 'wan6'`;

export interface DeviceScheduleInput {
  enabled?: boolean;
  days?: string[];
  weekdays?: string[] | string;
  start_time: string;
  stop_time: string;
  timezone?: string;
  utc_time?: boolean | string | number;
}

export interface UserConfigInput {
  id?: string;
  name: string;
  mac_address: string;
  is_no_internet?: boolean;
  schedule?: DeviceSchedule | DeviceScheduleInput | null;
  temporary_access_until?: string | null;
  created_at?: string;
  updated_at?: string;
  group_ids?: string[];
  groups?: Group[];
}

export interface FirewallConfigOptions {
  macAuthEnabled?: boolean;
  defaultTimezone?: string;
  now?: Date;
}

const DAY_ORDER: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const NEXT_DAY: Record<string, string> = {
  Sun: 'Mon',
  Mon: 'Tue',
  Tue: 'Wed',
  Wed: 'Thu',
  Thu: 'Fri',
  Fri: 'Sat',
  Sat: 'Sun',
};

/**
 * Normalizes time string to standard OpenWrt HH:MM:SS format
 */
export function normalizeTime(timeStr: string): string {
  if (!timeStr) return '00:00:00';
  const parts = timeStr.trim().split(':');
  if (parts.length === 2) {
    const hh = parts[0].padStart(2, '0');
    const mm = parts[1].padStart(2, '0');
    return `${hh}:${mm}:00`;
  }
  if (parts.length === 3) {
    const hh = parts[0].padStart(2, '0');
    const mm = parts[1].padStart(2, '0');
    const ss = parts[2].padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
  return timeStr;
}

/**
 * Normalizes input days to standard OpenWrt short capitalized day names (Sun, Mon, Tue, etc.)
 */
export function normalizeWeekdays(input?: string[] | string): string {
  if (!input) {
    return 'Sun Mon Tue Wed Thu Fri Sat';
  }
  const dayTokens: string[] = Array.isArray(input)
    ? input
    : input.split(/[\s,]+/);

  const matchedDays: string[] = [];
  for (const token of dayTokens) {
    const clean = token.trim().toLowerCase();
    if (!clean) continue;
    if (clean.startsWith('sun') || clean === '0' || clean === '7') matchedDays.push('Sun');
    else if (clean.startsWith('mon') || clean === '1') matchedDays.push('Mon');
    else if (clean.startsWith('tue') || clean === '2') matchedDays.push('Tue');
    else if (clean.startsWith('wed') || clean === '3') matchedDays.push('Wed');
    else if (clean.startsWith('thu') || clean === '4') matchedDays.push('Thu');
    else if (clean.startsWith('fri') || clean === '5') matchedDays.push('Fri');
    else if (clean.startsWith('sat') || clean === '6') matchedDays.push('Sat');
  }

  const unique = Array.from(new Set(matchedDays));
  if (unique.length === 0) {
    return 'Sun Mon Tue Wed Thu Fri Sat';
  }
  unique.sort((a, b) => (DAY_ORDER[a] ?? 0) - (DAY_ORDER[b] ?? 0));
  return unique.join(' ');
}

/**
 * Calculates next day (D+1) for midnight-spanning schedules
 */
export function getNextDayWeekdays(weekdaysStr: string): string {
  const days = weekdaysStr.split(/\s+/).filter(Boolean);
  const nextDays = days.map((d) => NEXT_DAY[d] || d);
  const unique = Array.from(new Set(nextDays));
  unique.sort((a, b) => (DAY_ORDER[a] ?? 0) - (DAY_ORDER[b] ?? 0));
  return unique.join(' ');
}

/**
 * Resolves whether the rule should use UTC time (1) or router local time (0)
 */
function getUtcTimeOption(schedule: DeviceScheduleInput | DeviceSchedule): string {
  const anySched = schedule as unknown as Record<string, unknown>;
  if (anySched.utc_time !== undefined && anySched.utc_time !== null) {
    if (anySched.utc_time === true || anySched.utc_time === '1' || anySched.utc_time === 1) {
      return '1';
    }
    return '0';
  }
  if (anySched.timezone === 'UTC' || anySched.timezone === 'Etc/UTC') {
    return '1';
  }
  return '0';
}

/**
 * Deterministically generates firewall configuration.
 * - Recurring weekly schedules: generates OpenWrt firewall rules with start_time, stop_time, weekdays, utc_time.
 *   If schedule crosses midnight (e.g. 22:00 to 06:00), splits into two rules:
 *   (22:00:00-23:59:59 on day D and 00:00:00-06:00:00 on day D+1).
 * - Temporary device access: respects temporary_access_until expiration.
 * - Allowed users without schedules are added to "Allow Internet Access" (target ACCEPT, proto all).
 * - Blocked and expired users are added to "Block Internet" (target DROP, proto all).
 * - Forwarding section:
 *    - When macAuthEnabled is true (MAC authentication ON): forwarding section is removed completely
 *    - When macAuthEnabled is false (MAC authentication OFF): config forwarding src 'lan' dest 'wan' is added
 * Users sorted by MAC address for complete reproducibility.
 */
export function generateFirewallConfig(
  users: UserConfigInput[],
  macAuthEnabledOrOptions: boolean | FirewallConfigOptions = true,
  defaultTimezoneParam: string = 'Asia/Dhaka'
): string {
  let macAuthEnabled = true;
  let now = new Date();

  if (typeof macAuthEnabledOrOptions === 'boolean') {
    macAuthEnabled = macAuthEnabledOrOptions;
  } else if (typeof macAuthEnabledOrOptions === 'object' && macAuthEnabledOrOptions !== null) {
    macAuthEnabled = macAuthEnabledOrOptions.macAuthEnabled ?? true;
    if (macAuthEnabledOrOptions.now instanceof Date && !isNaN(macAuthEnabledOrOptions.now.getTime())) {
      now = macAuthEnabledOrOptions.now;
    }
  }

  const blocked: UserConfigInput[] = [];
  const scheduled: UserConfigInput[] = [];
  const allowed: UserConfigInput[] = [];

  for (const user of users) {
    const isExpired = user.temporary_access_until
      ? new Date(user.temporary_access_until).getTime() <= now.getTime()
      : false;

    if (user.is_no_internet || isExpired) {
      blocked.push(user);
      continue;
    }

    const sched = user.schedule;
    const hasValidSchedule =
      sched &&
      sched.enabled !== false &&
      Boolean(sched.start_time && sched.stop_time);

    if (hasValidSchedule) {
      scheduled.push(user);
    } else {
      allowed.push(user);
    }
  }

  const sortedBlocked = [...blocked].sort((a, b) => a.mac_address.localeCompare(b.mac_address));
  const sortedScheduled = [...scheduled].sort((a, b) => a.mac_address.localeCompare(b.mac_address));
  const sortedAllowed = [...allowed].sort((a, b) => a.mac_address.localeCompare(b.mac_address));

  let config = FIREWALL_BASE_TEMPLATE;

  // Blocked internet access rule (evaluated first: explicit DROP takes priority)
  if (sortedBlocked.length > 0) {
    config += `\n\nconfig rule\n\toption src 'lan'\n\toption dest 'wan'\n\toption name 'Block Internet'\n\toption target 'DROP'\n\toption enabled '1'\n\tlist proto 'all'`;
    for (const user of sortedBlocked) {
      config += `\n\tlist src_mac '${user.mac_address}'`;
    }
  }

  // Scheduled user rules
  for (const user of sortedScheduled) {
    const sched = user.schedule!;
    const normalizedStart = normalizeTime(sched.start_time);
    const normalizedStop = normalizeTime(sched.stop_time);
    const daysRaw = (sched as any).days || (sched as any).weekdays;
    const daysD = normalizeWeekdays(daysRaw);
    const daysNext = getNextDayWeekdays(daysD);
    const utcVal = getUtcTimeOption(sched);
    const safeName = user.name.replace(/'/g, "\\'");

    if (normalizedStart > normalizedStop) {
      // Midnight crossover: split into two distinct rules
      // Rule 1: normalizedStart to 23:59:59 on Day D
      config += `\n\nconfig rule\n\toption src 'lan'\n\toption dest 'wan'\n\toption name 'Allow Schedule - ${safeName} (Part 1)'\n\toption target 'ACCEPT'\n\toption enabled '1'\n\tlist proto 'all'\n\tlist src_mac '${user.mac_address}'\n\toption start_time '${normalizedStart}'\n\toption stop_time '23:59:59'\n\toption weekdays '${daysD}'\n\toption utc_time '${utcVal}'`;

      // Rule 2: 00:00:00 to normalizedStop on Day D+1
      config += `\n\nconfig rule\n\toption src 'lan'\n\toption dest 'wan'\n\toption name 'Allow Schedule - ${safeName} (Part 2)'\n\toption target 'ACCEPT'\n\toption enabled '1'\n\tlist proto 'all'\n\tlist src_mac '${user.mac_address}'\n\toption start_time '00:00:00'\n\toption stop_time '${normalizedStop}'\n\toption weekdays '${daysNext}'\n\toption utc_time '${utcVal}'`;
    } else {
      // Normal within-day schedule
      config += `\n\nconfig rule\n\toption src 'lan'\n\toption dest 'wan'\n\toption name 'Allow Schedule - ${safeName}'\n\toption target 'ACCEPT'\n\toption enabled '1'\n\tlist proto 'all'\n\tlist src_mac '${user.mac_address}'\n\toption start_time '${normalizedStart}'\n\toption stop_time '${normalizedStop}'\n\toption weekdays '${daysD}'\n\toption utc_time '${utcVal}'`;
    }
  }

  // Allowed internet access rule for 24/7 users
  config += `\n\nconfig rule\n\toption src 'lan'\n\toption dest 'wan'\n\toption name 'Allow Internet Access'\n\toption target 'ACCEPT'\n\toption enabled '1'\n\tlist proto 'all'`;
  for (const user of sortedAllowed) {
    config += `\n\tlist src_mac '${user.mac_address}'`;
  }

  // Forwarding section:
  // Turning on MAC authentication removes 'config forwarding' entirely.
  // Turning off MAC authentication adds 'config forwarding' with src 'lan' and dest 'wan'.
  if (!macAuthEnabled) {
    config += `\n\nconfig forwarding\n\toption src 'lan'\n\toption dest 'wan'`;
  }

  config += `\n`;
  return config;
}

/**
 * Deterministically generates ethers configuration
 * Format: MAC_ADDRESS NAME
 * Users sorted deterministically by normalized name, then MAC.
 */
export function generateEthersConfig(users: Array<UserConfigInput | { name: string; mac_address: string }>): string {
  const sorted = [...users].sort((a, b) => {
    const nameCmp = a.name.localeCompare(b.name);
    if (nameCmp !== 0) return nameCmp;
    return a.mac_address.localeCompare(b.mac_address);
  });

  const lines = sorted.map((u) => `${u.mac_address} ${u.name}`);
  return lines.length > 0 ? lines.join('\n') + '\n' : '';
}

/**
 * Compute sha256 hash of configuration (combined deterministic representation)
 */
export function computeConfigHash(firewallContent: string, ethersContent: string): string {
  const combined = `firewall:\n${firewallContent}\n---\nethers:\n${ethersContent}`;
  return crypto.createHash('sha256').update(combined, 'utf8').digest('hex');
}

// ==============================================================================
//  Structural Configuration Diff Calculation
// ==============================================================================

export interface DeviceDiffChange {
  field: string;
  old_value: unknown;
  new_value: unknown;
}

export interface DeviceDiffItem {
  mac_address: string;
  name: string;
  old_name?: string;
  new_name?: string;
  is_no_internet?: boolean;
  schedule?: DeviceSchedule | DeviceScheduleInput | null;
  temporary_access_until?: string | null;
  changes?: DeviceDiffChange[];
  old_device?: UserConfigInput;
  new_device?: UserConfigInput;
  [key: string]: unknown;
}

export interface GroupDiffItem {
  id?: string;
  name: string;
  action: 'added' | 'removed' | 'modified';
  changes?: { field: string; old_value: unknown; new_value: unknown }[];
  [key: string]: unknown;
}

export interface PolicyDiffItem {
  policy: string;
  action: 'enabled' | 'disabled' | 'modified';
  old_value?: unknown;
  new_value?: unknown;
  description?: string;
}

export interface ConfigDiff {
  added_devices: DeviceDiffItem[];
  removed_devices: DeviceDiffItem[];
  modified_devices: DeviceDiffItem[];
  group_changes: GroupDiffItem[];
  policy_changes: PolicyDiffItem[];
}

function parseEthersText(ethersContent: string): UserConfigInput[] {
  const devices: UserConfigInput[] = [];
  const lines = ethersContent.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([0-9a-fA-F:]{17})\s+(.+)$/);
    if (match) {
      devices.push({
        mac_address: match[1].toLowerCase(),
        name: match[2].trim(),
      });
    }
  }
  return devices;
}

function extractDevices(config: unknown): UserConfigInput[] {
  if (!config) return [];
  if (Array.isArray(config)) return config as UserConfigInput[];

  const obj = config as Record<string, unknown>;
  if (Array.isArray(obj.users)) return obj.users as UserConfigInput[];
  if (Array.isArray(obj.devices)) return obj.devices as UserConfigInput[];

  if (obj.metadata && typeof obj.metadata === 'object') {
    const meta = obj.metadata as Record<string, unknown>;
    if (Array.isArray(meta.users)) return meta.users as UserConfigInput[];
    if (Array.isArray(meta.devices)) return meta.devices as UserConfigInput[];
  }

  if (typeof obj.ethers_content === 'string') {
    const parsed = parseEthersText(obj.ethers_content);
    if (typeof obj.firewall_content === 'string') {
      const fw = obj.firewall_content;
      for (const dev of parsed) {
        if (fw.includes(`list src_mac '${dev.mac_address}'`)) {
          // Check if it was in Block Internet
          const blockMatch = fw.match(/config rule\s+option src 'lan'\s+option dest 'wan'\s+option name 'Block Internet'[\s\S]*?(?=config rule|config zone|config forwarding|$)/);
          if (blockMatch && blockMatch[0].includes(`list src_mac '${dev.mac_address}'`)) {
            dev.is_no_internet = true;
          }
        }
      }
    }
    return parsed;
  }

  if (typeof config === 'string') {
    return parseEthersText(config);
  }

  return [];
}

function extractGroups(config: unknown): Group[] {
  if (!config) return [];
  const obj = config as Record<string, unknown>;
  if (Array.isArray(obj.groups)) return obj.groups as Group[];
  if (obj.metadata && typeof obj.metadata === 'object') {
    const meta = obj.metadata as Record<string, unknown>;
    if (Array.isArray(meta.groups)) return meta.groups as Group[];
  }
  return [];
}

function extractMacAuth(config: unknown): boolean | undefined {
  if (!config) return undefined;
  const obj = config as Record<string, unknown>;
  if (typeof obj.mac_auth === 'boolean') return obj.mac_auth;
  if (obj.mac_auth && typeof obj.mac_auth === 'object') {
    return (obj.mac_auth as Record<string, unknown>).enabled as boolean | undefined;
  }
  if (obj.metadata && typeof obj.metadata === 'object') {
    const meta = obj.metadata as Record<string, unknown>;
    if (typeof meta.mac_auth === 'boolean') return meta.mac_auth;
    if (meta.mac_auth && typeof meta.mac_auth === 'object') {
      return (meta.mac_auth as Record<string, unknown>).enabled as boolean | undefined;
    }
  }
  if (typeof obj.firewall_content === 'string') {
    // If forwarding lan->wan is present, MAC auth is OFF
    return !obj.firewall_content.includes("config forwarding\n\toption src 'lan'\n\toption dest 'wan'");
  }
  return undefined;
}

/**
 * Computes structural difference between two configurations.
 */
export function computeConfigDiff(oldConfig: unknown, newConfig: unknown): ConfigDiff {
  const oldDevices = extractDevices(oldConfig);
  const newDevices = extractDevices(newConfig);

  const oldGroups = extractGroups(oldConfig);
  const newGroups = extractGroups(newConfig);

  const oldMacAuth = extractMacAuth(oldConfig);
  const newMacAuth = extractMacAuth(newConfig);

  const added_devices: DeviceDiffItem[] = [];
  const removed_devices: DeviceDiffItem[] = [];
  const modified_devices: DeviceDiffItem[] = [];
  const group_changes: GroupDiffItem[] = [];
  const policy_changes: PolicyDiffItem[] = [];

  const oldDevMap = new Map<string, UserConfigInput>();
  for (const dev of oldDevices) {
    if (dev.mac_address) {
      oldDevMap.set(dev.mac_address.toLowerCase(), dev);
    }
  }

  const newDevMap = new Map<string, UserConfigInput>();
  for (const dev of newDevices) {
    if (dev.mac_address) {
      newDevMap.set(dev.mac_address.toLowerCase(), dev);
    }
  }

  // Check added & modified devices
  Array.from(newDevMap.entries()).forEach(([mac, newDev]) => {
    const oldDev = oldDevMap.get(mac);
    if (!oldDev) {
      added_devices.push({
        ...newDev,
        mac_address: newDev.mac_address,
        name: newDev.name,
      });
    } else {
      const changes: DeviceDiffChange[] = [];

      if (oldDev.name !== newDev.name) {
        changes.push({ field: 'name', old_value: oldDev.name, new_value: newDev.name });
      }

      if (Boolean(oldDev.is_no_internet) !== Boolean(newDev.is_no_internet)) {
        changes.push({
          field: 'is_no_internet',
          old_value: Boolean(oldDev.is_no_internet),
          new_value: Boolean(newDev.is_no_internet),
        });
      }

      if (oldDev.temporary_access_until !== newDev.temporary_access_until) {
        changes.push({
          field: 'temporary_access_until',
          old_value: oldDev.temporary_access_until ?? null,
          new_value: newDev.temporary_access_until ?? null,
        });
      }

      const oldSchedStr = JSON.stringify(oldDev.schedule ?? null);
      const newSchedStr = JSON.stringify(newDev.schedule ?? null);
      if (oldSchedStr !== newSchedStr) {
        changes.push({
          field: 'schedule',
          old_value: oldDev.schedule ?? null,
          new_value: newDev.schedule ?? null,
        });
      }

      if (changes.length > 0) {
        modified_devices.push({
          ...newDev,
          mac_address: newDev.mac_address,
          name: newDev.name,
          old_name: oldDev.name,
          new_name: newDev.name,
          changes,
          old_device: oldDev,
          new_device: newDev,
        });
      }
    }
  });

  // Check removed devices
  Array.from(oldDevMap.entries()).forEach(([mac, oldDev]) => {
    if (!newDevMap.has(mac)) {
      removed_devices.push({
        ...oldDev,
        mac_address: oldDev.mac_address,
        name: oldDev.name,
      });
    }
  });

  // Check group changes
  const oldGroupMap = new Map<string, Group>();
  for (const g of oldGroups) {
    oldGroupMap.set(g.id || g.name, g);
  }

  const newGroupMap = new Map<string, Group>();
  for (const g of newGroups) {
    newGroupMap.set(g.id || g.name, g);
  }

  Array.from(newGroupMap.entries()).forEach(([key, newG]) => {
    const oldG = oldGroupMap.get(key);
    if (!oldG) {
      group_changes.push({ id: newG.id, name: newG.name, action: 'added' });
    } else {
      const gChanges: { field: string; old_value: unknown; new_value: unknown }[] = [];
      if (oldG.name !== newG.name) {
        gChanges.push({ field: 'name', old_value: oldG.name, new_value: newG.name });
      }
      if (Boolean(oldG.is_no_internet) !== Boolean(newG.is_no_internet)) {
        gChanges.push({
          field: 'is_no_internet',
          old_value: Boolean(oldG.is_no_internet),
          new_value: Boolean(newG.is_no_internet),
        });
      }
      if (gChanges.length > 0) {
        group_changes.push({
          id: newG.id,
          name: newG.name,
          action: 'modified',
          changes: gChanges,
        });
      }
    }
  });

  Array.from(oldGroupMap.entries()).forEach(([key, oldG]) => {
    if (!newGroupMap.has(key)) {
      group_changes.push({ id: oldG.id, name: oldG.name, action: 'removed' });
    }
  });

  // Check policy changes
  if (oldMacAuth !== undefined && newMacAuth !== undefined && oldMacAuth !== newMacAuth) {
    policy_changes.push({
      policy: 'mac_auth',
      action: newMacAuth ? 'enabled' : 'disabled',
      old_value: oldMacAuth,
      new_value: newMacAuth,
      description: newMacAuth
        ? 'MAC authentication enabled (traffic restricted to registered devices)'
        : 'MAC authentication disabled (open LAN-to-WAN forwarding enabled)',
    });
  }

  return {
    added_devices,
    removed_devices,
    modified_devices,
    group_changes,
    policy_changes,
  };
}
