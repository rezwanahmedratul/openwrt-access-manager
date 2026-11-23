// ============================================================
// Core Types for OpenWrt Access Manager
// ============================================================

export type AccountRole = 'admin' | 'subadmin';

export interface Account {
  id: string;
  username: string;
  password_hash?: string;
  role: AccountRole;
  created_at: string;
  updated_at: string;
}

export interface SessionUser {
  id: string;
  username: string;
  role: AccountRole;
}

export type DayOfWeek = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

export interface DeviceSchedule {
  enabled?: boolean;
  days: string[] | DayOfWeek[];
  start_time: string; // "HH:MM" e.g. "08:00"
  stop_time: string; // "HH:MM" e.g. "22:00"
  timezone?: string; // e.g. "Asia/Dhaka" or "UTC"
}

export interface TemporaryAccess {
  enabled?: boolean;
  until: string | null; // ISO 8601 string or null
}

export interface User {
  id: string;
  name: string;
  mac_address: string;
  schedule?: DeviceSchedule | null;
  temporary_access_until?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Group {
  id: string;
  name: string;
  is_protected?: boolean;
  is_no_internet?: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserGroup {
  user_id: string;
  group_id: string;
  created_at: string;
}

export interface UserWithGroups extends User {
  groups: Group[];
}

// Draft / Pending Changes
export type DraftOperationType = 'ADD' | 'MODIFY' | 'DELETE';

export interface DraftUserData {
  name: string;
  mac_address: string;
  group_ids: string[];
  schedule?: DeviceSchedule | null;
  temporary_access_until?: string | null;
}

export interface DraftChange {
  id: string;
  operation: DraftOperationType;
  user_id: string | null; // null for ADD operations
  user_data: DraftUserData | null; // null for DELETE
  original_data?: DraftUserData | null; // stored for MODIFY to enable undo
  created_at: string;
  sequence: number; // ordering for undo
}

export interface DraftState {
  id: string;
  changes: DraftChange[];
  created_at: string;
  updated_at: string;
}

// Configuration & Deployment
export type DeploymentStatus = 'pending' | 'in_progress' | 'applied' | 'successful' | 'failed' | 'rolled_back';

export interface Configuration {
  id: string;
  version: number;
  hash: string;
  user_count: number;
  firewall_content: string;
  ethers_content: string;
  is_current?: boolean;
  metadata?: Record<string, unknown>;
  rollback_from_version?: number | null;
  change_description?: string | null;
  author_id?: string | null;
  author_name?: string | null;
  deployment_status?: DeploymentStatus;
  created_at: string;
}

export interface ConfigVersionHistory {
  id: string;
  version: number;
  hash: string;
  user_count: number;
  change_description?: string | null;
  author_id?: string | null;
  author_name?: string | null;
  deployment_status?: DeploymentStatus;
  rollback_from_version?: number | null;
  is_current?: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// Router Token Settings
export interface RouterTokenSettings {
  token_hash: string | null;
  created_at: string | null;
  revoked: boolean;
  last_used_at?: string | null;
  name?: string;
}

// Router Telemetry & Heartbeat
export interface RouterTelemetry {
  id: string;
  uptime: number | null;
  openwrt_version: string | null;
  config_version: number | null;
  last_sync: string | null;
  cpu_usage: number | null;
  memory_usage: number | null;
  disk_free: number | null;
  wan_status: string | null;
  connected_clients: number | null;
  last_sync_error: string | null;
  created_at: string;
}

export interface RouterTelemetryInput {
  uptime?: number | null;
  openwrt_version?: string | null;
  config_version?: number | null;
  last_sync?: string | null;
  cpu_usage?: number | null;
  memory_usage?: number | null;
  disk_free?: number | null;
  wan_status?: string | null;
  connected_clients?: number | null;
  last_sync_error?: string | null;
}

// Audit Logging
export interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_username: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface AuditLogInput {
  actor_id?: string | null;
  actor_username?: string | null;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  details?: Record<string, unknown> | null;
  ip_address?: string | null;
}

// API responses
export interface ConfigVersionResponse {
  version: number;
  hash: string;
  created_at: string;
}

export interface ApplyResult {
  success: boolean;
  version: number;
  hash: string;
  user_count: number;
  error?: string;
}

export interface MacAuthSettings {
  enabled: boolean; // true = forwarding removed (MAC auth ON, restricted to registered MACs), false = forwarding lan ➔ wan added (MAC auth OFF, open to all)
  disabled_until: string | null; // ISO string if temporarily disabled, null if permanently
  disabled_by_role?: AccountRole;
}

export interface DashboardStats {
  total_users: number;
  total_groups: number;
  pending_changes: number;
  current_version: number | null;
  last_applied: string | null;
  mac_auth?: MacAuthSettings;
  router_last_seen?: string | null;
  router_telemetry?: RouterTelemetry | null;
}

// View model for the user table (combines applied state + draft state)
export interface UserViewModel {
  id: string; // real ID or temp ID for new
  name: string;
  mac_address: string;
  vendor?: string | null;
  groups: Group[];
  schedule?: DeviceSchedule | null;
  temporary_access_until?: string | null;
  status: 'applied' | 'added' | 'modified' | 'deleted';
  draft_change_id?: string;
}

export type ActiveTab = 'dashboard' | 'users' | 'groups' | 'history' | 'account' | 'settings' | 'audit';
