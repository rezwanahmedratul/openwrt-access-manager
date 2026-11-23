import { describe, it, expect } from 'vitest';
import {
  macAddressSchema,
  ipv4Schema,
  usernameSchema,
  passwordSchema,
  deviceNameSchema,
  groupNameSchema,
  routerTokenSchema,
  heartbeatPayloadSchema,
  paginationSchema,
  dateSchema,
  loginSchema,
} from '../src/lib/validation';

describe('Zod Validation Schemas', () => {
  describe('macAddressSchema', () => {
    it('accepts valid colon-separated and hyphen-separated MAC addresses', () => {
      expect(macAddressSchema.safeParse('00:11:22:33:44:55').success).toBe(true);
      expect(macAddressSchema.safeParse('AA:BB:CC:DD:EE:FF').success).toBe(true);
      expect(macAddressSchema.safeParse('aa:bb:cc:dd:ee:ff').success).toBe(true);
      expect(macAddressSchema.safeParse('00-11-22-33-44-55').success).toBe(true);
    });

    it('rejects invalid MAC addresses', () => {
      expect(macAddressSchema.safeParse('00:11:22:33:44').success).toBe(false);
      expect(macAddressSchema.safeParse('00:11:22:33:44:55:66').success).toBe(false);
      expect(macAddressSchema.safeParse('GG:11:22:33:44:55').success).toBe(false);
      expect(macAddressSchema.safeParse('invalid-mac').success).toBe(false);
    });
  });

  describe('ipv4Schema', () => {
    it('accepts valid IPv4 addresses', () => {
      expect(ipv4Schema.safeParse('192.168.1.1').success).toBe(true);
      expect(ipv4Schema.safeParse('10.0.0.1').success).toBe(true);
      expect(ipv4Schema.safeParse('127.0.0.1').success).toBe(true);
      expect(ipv4Schema.safeParse('255.255.255.255').success).toBe(true);
    });

    it('rejects invalid IPv4 addresses', () => {
      expect(ipv4Schema.safeParse('256.0.0.1').success).toBe(false);
      expect(ipv4Schema.safeParse('192.168.1').success).toBe(false);
      expect(ipv4Schema.safeParse('999.999.999.999').success).toBe(false);
      expect(ipv4Schema.safeParse('not.an.ip').success).toBe(false);
    });
  });

  describe('usernameSchema', () => {
    it('accepts valid usernames', () => {
      expect(usernameSchema.safeParse('admin').success).toBe(true);
      expect(usernameSchema.safeParse('operator_1').success).toBe(true);
      expect(usernameSchema.safeParse('sub-admin').success).toBe(true);
    });

    it('rejects usernames that are too short or contain invalid characters', () => {
      expect(usernameSchema.safeParse('ab').success).toBe(false);
      expect(usernameSchema.safeParse('user@name').success).toBe(false);
      expect(usernameSchema.safeParse('user name').success).toBe(false);
    });
  });

  describe('passwordSchema', () => {
    it('accepts passwords meeting length requirements', () => {
      expect(passwordSchema.safeParse('pass').success).toBe(true);
      expect(passwordSchema.safeParse('superSecretPassword123!').success).toBe(true);
    });

    it('rejects passwords that are too short', () => {
      expect(passwordSchema.safeParse('123').success).toBe(false);
      expect(passwordSchema.safeParse('').success).toBe(false);
    });
  });

  describe('deviceNameSchema & groupNameSchema', () => {
    it('accepts valid device and group names', () => {
      expect(deviceNameSchema.safeParse("Ratul's Laptop").success).toBe(true);
      expect(groupNameSchema.safeParse('Family & Friends').success).toBe(true);
    });

    it('rejects empty names', () => {
      expect(deviceNameSchema.safeParse('').success).toBe(false);
      expect(groupNameSchema.safeParse('   ').success).toBe(false);
    });
  });

  describe('routerTokenSchema', () => {
    it('accepts tokens of sufficient length', () => {
      expect(routerTokenSchema.safeParse('abcdef1234567890').success).toBe(true);
    });

    it('rejects short tokens', () => {
      expect(routerTokenSchema.safeParse('short').success).toBe(false);
    });
  });

  describe('heartbeatPayloadSchema', () => {
    it('validates router telemetry payloads correctly', () => {
      const validPayload = {
        uptime: 123456,
        openwrt_version: '23.05.2',
        config_version: 5,
        last_sync: '2026-11-23T15:33:04Z',
        cpu_usage: 12.5,
        memory_usage: 45.2,
        disk_free: 1048576,
        wan_status: 'online',
        connected_clients: 8,
        last_sync_error: null,
      };

      const result = heartbeatPayloadSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('rejects invalid percentage or negative uptime', () => {
      expect(heartbeatPayloadSchema.safeParse({ cpu_usage: 150 }).success).toBe(false);
      expect(heartbeatPayloadSchema.safeParse({ uptime: -10 }).success).toBe(false);
    });
  });

  describe('paginationSchema', () => {
    it('applies default pagination values and coerces strings', () => {
      const parsed = paginationSchema.parse({});
      expect(parsed.page).toBe(1);
      expect(parsed.limit).toBe(20);

      const coerced = paginationSchema.parse({ page: '2', limit: '50' });
      expect(coerced.page).toBe(2);
      expect(coerced.limit).toBe(50);
    });
  });

  describe('dateSchema', () => {
    it('validates ISO dates and timestamps', () => {
      expect(dateSchema.safeParse('2026-11-23T15:33:04Z').success).toBe(true);
      expect(dateSchema.safeParse('2026-11-23').success).toBe(true);
      expect(dateSchema.safeParse('not-a-date').success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('validates login body credentials', () => {
      expect(loginSchema.safeParse({ username: 'admin', password: 'password123' }).success).toBe(true);
      expect(loginSchema.safeParse({ username: 'ad', password: 'password123' }).success).toBe(false);
      expect(loginSchema.safeParse({ username: 'admin', password: '' }).success).toBe(false);
    });
  });
});
