import { z } from 'zod';

/**
 * Standard regular expression for MAC address format:
 * Matches 6 hex pairs separated by colons or hyphens (e.g. 00:11:22:33:44:55 or 00-11-22-33-44-55)
 */
export const MAC_REGEX = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;

/**
 * MAC Address schema (validates format 00:11:22:33:44:55)
 */
export const macAddressSchema = z
  .string()
  .trim()
  .regex(MAC_REGEX, 'Invalid MAC address format. Expected format: 00:11:22:33:44:55');

/**
 * IPv4 Address schema
 */
export const ipv4Schema = z
  .string()
  .trim()
  .ipv4('Invalid IPv4 address');

/**
 * Username schema (3-32 characters, alphanumeric, underscores, hyphens)
 */
export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(32, 'Username cannot exceed 32 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username must only contain letters, numbers, underscores, or hyphens');

/**
 * Password schema (min 4, max 128 characters)
 */
export const passwordSchema = z
  .string()
  .min(4, 'Password must be at least 4 characters')
  .max(128, 'Password cannot exceed 128 characters');

/**
 * Device name schema (1-64 characters)
 */
export const deviceNameSchema = z
  .string()
  .trim()
  .min(1, 'Device name is required')
  .max(64, 'Device name cannot exceed 64 characters');

/**
 * Group name schema (1-64 characters)
 */
export const groupNameSchema = z
  .string()
  .trim()
  .min(1, 'Group name is required')
  .max(64, 'Group name cannot exceed 64 characters');

/**
 * Router token schema (8-128 characters)
 */
export const routerTokenSchema = z
  .string()
  .trim()
  .min(8, 'Router token must be at least 8 characters')
  .max(128, 'Router token cannot exceed 128 characters');

/**
 * Heartbeat telemetry payload schema
 */
export const heartbeatPayloadSchema = z.object({
  uptime: z.number().int().nonnegative().optional(),
  openwrt_version: z.string().trim().optional(),
  config_version: z.number().int().optional(),
  last_sync: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid timestamp' })
    .optional(),
  cpu_usage: z.number().min(0).max(100).optional(),
  memory_usage: z.number().min(0).max(100).optional(),
  disk_free: z.number().int().nonnegative().optional(),
  wan_status: z.string().trim().optional(),
  connected_clients: z.number().int().nonnegative().optional(),
  last_sync_error: z.string().nullable().optional(),
});

/**
 * Pagination schema with coercing numbers
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().optional(),
});

/**
 * Date / timestamp schema
 */
export const dateSchema = z
  .string()
  .trim()
  .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date/timestamp format' });

/**
 * Schedule schema for recurring weekly schedules
 */
export const scheduleSchema = z.object({
  days: z.array(z.number().int().min(0).max(6)).min(1),
  start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Format HH:MM or HH:MM:SS'),
  stop_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Format HH:MM or HH:MM:SS'),
  timezone: z.string().default('Asia/Dhaka'),
});

/**
 * Login credentials schema
 */
export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, 'Password is required'),
});

/**
 * Account creation schema
 */
export const createAccountSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

/**
 * Update password schema
 */
export const updatePasswordSchema = z.object({
  id: z.string().uuid().or(z.string().min(1)).optional(),
  username: usernameSchema.optional(),
  password: passwordSchema,
});
