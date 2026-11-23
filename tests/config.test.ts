import { describe, it, expect } from 'vitest';
import {
  generateFirewallConfig,
  generateEthersConfig,
  computeConfigHash,
  computeConfigDiff,
  normalizeTime,
  normalizeWeekdays,
  getNextDayWeekdays,
  UserConfigInput,
} from '../src/lib/config-generator';

describe('Configuration Generator & Diff Computation', () => {
  describe('Helper Functions', () => {
    it('normalizes HH:MM and HH:MM:SS time strings correctly', () => {
      expect(normalizeTime('8:30')).toBe('08:30:00');
      expect(normalizeTime('22:00')).toBe('22:00:00');
      expect(normalizeTime('06:15:30')).toBe('06:15:30');
      expect(normalizeTime('')).toBe('00:00:00');
    });

    it('normalizes days of the week to standard OpenWrt capitalized day names', () => {
      expect(normalizeWeekdays(['mon', 'wed', 'fri'])).toBe('Mon Wed Fri');
      expect(normalizeWeekdays('1, 3, 5')).toBe('Mon Wed Fri');
      expect(normalizeWeekdays(['Sun', 'Sat'])).toBe('Sun Sat');
      expect(normalizeWeekdays('')).toBe('Sun Mon Tue Wed Thu Fri Sat');
    });

    it('computes next day (D+1) for midnight crossover schedules', () => {
      expect(getNextDayWeekdays('Mon Tue Wed')).toBe('Tue Wed Thu');
      expect(getNextDayWeekdays('Fri Sat')).toBe('Sun Sat');
      expect(getNextDayWeekdays('Sun')).toBe('Mon');
      expect(getNextDayWeekdays('Sat')).toBe('Sun');
    });
  });

  describe('Firewall & Ethers Generation', () => {
    const sampleUsers: UserConfigInput[] = [
      {
        name: 'Device Alpha',
        mac_address: '00:11:22:33:44:02',
        is_no_internet: false,
      },
      {
        name: 'Blocked Device',
        mac_address: '00:11:22:33:44:01',
        is_no_internet: true,
      },
      {
        name: 'Device Beta',
        mac_address: '00:11:22:33:44:03',
        is_no_internet: false,
      },
    ];

    it('generates ethers config sorted deterministically by name, then MAC', () => {
      const ethers = generateEthersConfig(sampleUsers);
      const lines = ethers.trim().split('\n');

      expect(lines.length).toBe(3);
      expect(lines[0]).toBe('00:11:22:33:44:01 Blocked Device');
      expect(lines[1]).toBe('00:11:22:33:44:02 Device Alpha');
      expect(lines[2]).toBe('00:11:22:33:44:03 Device Beta');
    });

    it('generates firewall config separating allowed and blocked devices', () => {
      const fw = generateFirewallConfig(sampleUsers, true);

      // Blocked Internet rule should appear with target DROP
      expect(fw).toContain("option name 'Block Internet'");
      expect(fw).toContain("option target 'DROP'");
      expect(fw).toContain("list src_mac '00:11:22:33:44:01'");

      // Allowed Internet Access rule should appear with target ACCEPT
      expect(fw).toContain("option name 'Allow Internet Access'");
      expect(fw).toContain("option target 'ACCEPT'");
      expect(fw).toContain("list src_mac '00:11:22:33:44:02'");
      expect(fw).toContain("list src_mac '00:11:22:33:44:03'");
    });

    it('omits forwarding section when MAC authentication is enabled', () => {
      const fw = generateFirewallConfig(sampleUsers, true);
      expect(fw).not.toContain("config forwarding\n\toption src 'lan'\n\toption dest 'wan'");
    });

    it('includes forwarding section when MAC authentication is disabled (open to all)', () => {
      const fw = generateFirewallConfig(sampleUsers, false);
      expect(fw).toContain("config forwarding\n\toption src 'lan'\n\toption dest 'wan'");
    });

    it('computes deterministic SHA-256 config hashes', () => {
      const fw1 = generateFirewallConfig(sampleUsers, true);
      const ethers1 = generateEthersConfig(sampleUsers);
      const hash1 = computeConfigHash(fw1, ethers1);

      const fw2 = generateFirewallConfig(sampleUsers, true);
      const ethers2 = generateEthersConfig(sampleUsers);
      const hash2 = computeConfigHash(fw2, ethers2);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('Recurring Weekly Schedules & Midnight Crossover Splitting', () => {
    it('creates standard within-day schedule rule', () => {
      const userWithSchedule: UserConfigInput = {
        name: 'Work Laptop',
        mac_address: '11:22:33:44:55:66',
        schedule: {
          enabled: true,
          start_time: '09:00',
          stop_time: '17:00',
          days: ['mon', 'tue', 'wed', 'thu', 'fri'],
        },
      };

      const fw = generateFirewallConfig([userWithSchedule]);

      expect(fw).toContain("option name 'Allow Schedule - Work Laptop'");
      expect(fw).toContain("option start_time '09:00:00'");
      expect(fw).toContain("option stop_time '17:00:00'");
      expect(fw).toContain("option weekdays 'Mon Tue Wed Thu Fri'");
      expect(fw).toContain("list src_mac '11:22:33:44:55:66'");
      expect(fw).toContain("option target 'ACCEPT'");
    });

    it('splits midnight crossover schedule into two rules across Day D and Day D+1', () => {
      const userWithNightSchedule: UserConfigInput = {
        name: 'Night Camera',
        mac_address: '22:33:44:55:66:77',
        schedule: {
          enabled: true,
          start_time: '22:00',
          stop_time: '06:00',
          days: ['mon', 'wed'],
        },
      };

      const fw = generateFirewallConfig([userWithNightSchedule]);

      // Part 1: from 22:00:00 to 23:59:59 on Mon Wed
      expect(fw).toContain("option name 'Allow Schedule - Night Camera (Part 1)'");
      expect(fw).toContain("option start_time '22:00:00'");
      expect(fw).toContain("option stop_time '23:59:59'");
      expect(fw).toContain("option weekdays 'Mon Wed'");

      // Part 2: from 00:00:00 to 06:00:00 on Tue Thu (D+1)
      expect(fw).toContain("option name 'Allow Schedule - Night Camera (Part 2)'");
      expect(fw).toContain("option start_time '00:00:00'");
      expect(fw).toContain("option stop_time '06:00:00'");
      expect(fw).toContain("option weekdays 'Tue Thu'");
    });

    it('sets utc_time option appropriately based on schedule timezone', () => {
      const userUtc: UserConfigInput = {
        name: 'UTC Device',
        mac_address: '33:44:55:66:77:88',
        schedule: {
          enabled: true,
          start_time: '10:00',
          stop_time: '12:00',
          timezone: 'UTC',
        },
      };

      const fw = generateFirewallConfig([userUtc]);
      expect(fw).toContain("option utc_time '1'");
    });
  });

  describe('Temporary Access Expiration', () => {
    it('allows devices with temporary access in the future', () => {
      const futureDate = new Date(Date.now() + 3600 * 1000).toISOString();
      const user: UserConfigInput = {
        name: 'Guest Phone',
        mac_address: '44:55:66:77:88:99',
        temporary_access_until: futureDate,
      };

      const fw = generateFirewallConfig([user], { now: new Date() });
      expect(fw).toContain("option name 'Allow Internet Access'");
      expect(fw).toContain("list src_mac '44:55:66:77:88:99'");
    });

    it('blocks devices whose temporary access has expired', () => {
      const pastDate = new Date(Date.now() - 3600 * 1000).toISOString();
      const user: UserConfigInput = {
        name: 'Expired Guest',
        mac_address: '44:55:66:77:88:99',
        temporary_access_until: pastDate,
      };

      const fw = generateFirewallConfig([user], { now: new Date() });
      // Should be placed in Block Internet rule
      expect(fw).toContain("option name 'Block Internet'");
      expect(fw).toContain("list src_mac '44:55:66:77:88:99'");
      // And NOT in Allow rule
      const allowIndex = fw.indexOf("option name 'Allow Internet Access'");
      const allowSection = fw.slice(allowIndex);
      expect(allowSection).not.toContain("list src_mac '44:55:66:77:88:99'");
    });
  });

  describe('Structural Config Diff & Rollback Integrity', () => {
    const oldConfig = {
      users: [
        { name: 'Old Phone', mac_address: '11:11:11:11:11:11', is_no_internet: false },
        { name: 'Server', mac_address: '22:22:22:22:22:22', is_no_internet: false },
      ],
      groups: [{ id: 'g1', name: 'Office', is_protected: false }],
      mac_auth: true,
    };

    const newConfig = {
      users: [
        // 'Old Phone' removed
        { name: 'Server Upgraded', mac_address: '22:22:22:22:22:22', is_no_internet: true }, // modified
        { name: 'New Tablet', mac_address: '33:33:33:33:33:33', is_no_internet: false }, // added
      ],
      groups: [
        { id: 'g1', name: 'Office Main', is_protected: true }, // modified
        { id: 'g2', name: 'IoT', is_protected: false }, // added
      ],
      mac_auth: false, // policy changed
    };

    it('computes accurate structural diff between two configs', () => {
      const diff = computeConfigDiff(oldConfig, newConfig);

      // Added devices
      expect(diff.added_devices.length).toBe(1);
      expect(diff.added_devices[0].mac_address).toBe('33:33:33:33:33:33');

      // Removed devices
      expect(diff.removed_devices.length).toBe(1);
      expect(diff.removed_devices[0].mac_address).toBe('11:11:11:11:11:11');

      // Modified devices
      expect(diff.modified_devices.length).toBe(1);
      expect(diff.modified_devices[0].mac_address).toBe('22:22:22:22:22:22');

      // Group changes
      expect(diff.group_changes.some((g) => g.action === 'added')).toBe(true);
      expect(diff.group_changes.some((g) => g.action === 'modified')).toBe(true);

      // Policy changes (MAC auth toggled from true to false)
      expect(diff.policy_changes.length).toBeGreaterThan(0);
      expect(diff.policy_changes[0].policy).toBe('mac_auth');
    });

    it('validates rollback integrity: rolling back to previous state generates identical diff symmetry', () => {
      const rollbackDiff = computeConfigDiff(newConfig, oldConfig);

      // Symmetrical inversion
      expect(rollbackDiff.added_devices.length).toBe(1);
      expect(rollbackDiff.added_devices[0].mac_address).toBe('11:11:11:11:11:11'); // Old Phone restored

      expect(rollbackDiff.removed_devices.length).toBe(1);
      expect(rollbackDiff.removed_devices[0].mac_address).toBe('33:33:33:33:33:33'); // New Tablet removed

      expect(rollbackDiff.modified_devices.length).toBe(1);
      expect(rollbackDiff.modified_devices[0].mac_address).toBe('22:22:22:22:22:22');
    });
  });
});
