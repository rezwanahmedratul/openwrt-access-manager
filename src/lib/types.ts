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

export interface User {
  id: string;
  name: string;
  mac_address: string;
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

export interface DraftChange {
  id: string;
  operation: DraftOperationType;
  user_id: string | null; // null for ADD operations
  user_data: {
    name: string;
    mac_address: string;
    group_ids: string[];
  } | null; // null for DELETE
  original_data?: {
    name: string;
    mac_address: string;
    group_ids: string[];
  } | null; // stored for MODIFY to enable undo
  created_at: string;
  sequence: number; // ordering for undo
}

export interface DraftState {
  id: string;
  changes: DraftChange[];
  created_at: string;
  updated_at: string;
}

// Configuration
export interface Configuration {
  id: string;
  version: number;
  hash: string;
  user_count: number;
  firewall_content: string;
  ethers_content: string;
  metadata: Record<string, unknown>;
  created_at: string;
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
  enabled: boolean; // true = destination 'unspecified' (MAC auth ON), false = destination 'wan' (MAC auth OFF, open to all)
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
}

// View model for the user table (combines applied state + draft state)
export interface UserViewModel {
  id: string; // real ID or temp ID for new
  name: string;
  mac_address: string;
  groups: Group[];
  status: 'applied' | 'added' | 'modified' | 'deleted';
  draft_change_id?: string;
}

