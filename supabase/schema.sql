-- OpenWrt MAC Access Manager Canonical Schema
-- Run this in your Supabase SQL Editor

-- 1. Accounts Table (RBAC: Admin and Subadmin accounts)
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'subadmin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_username_unique ON public.accounts(lower(username));

-- Seed default admin and subadmin accounts
INSERT INTO public.accounts (username, password_hash, role) VALUES
    ('admin', 'admin123', 'admin'),
    ('subadmin', 'subadmin123', 'subadmin')
ON CONFLICT (username) DO NOTHING;

-- 2. Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    mac_address TEXT NOT NULL UNIQUE,
    schedule JSONB DEFAULT NULL,
    temporary_access_until TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for users
CREATE INDEX IF NOT EXISTS idx_users_name ON public.users(name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_name_unique ON public.users(lower(name));
CREATE INDEX IF NOT EXISTS idx_users_mac ON public.users(mac_address);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_mac_unique ON public.users(mac_address);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_mac_lower_unique ON public.users(lower(mac_address));

-- 3. Groups Table
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    is_protected BOOLEAN NOT NULL DEFAULT false,
    is_no_internet BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Seed Default group and common groups
INSERT INTO public.groups (name, is_protected, is_no_internet) VALUES
    ('Default', false, false),
    ('Family', false, false),
    ('Friends', false, false),
    ('Students', false, false),
    ('Guests', false, false),
    ('Devices', false, false),
    ('Others', false, false)
ON CONFLICT (name) DO NOTHING;

-- 4. User Groups Junction Table
CREATE TABLE IF NOT EXISTS public.user_groups (
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, group_id)
);

-- 5. Drafts Table (Single active draft session or per-admin)
CREATE TABLE IF NOT EXISTS public.drafts (
    id TEXT PRIMARY KEY DEFAULT 'current',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

INSERT INTO public.drafts (id) VALUES ('current') ON CONFLICT (id) DO NOTHING;

-- 6. Draft Changes (Pending Operations with Undo Stack)
CREATE TABLE IF NOT EXISTS public.draft_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draft_id TEXT NOT NULL REFERENCES public.drafts(id) ON DELETE CASCADE DEFAULT 'current',
    sequence SERIAL,
    operation TEXT NOT NULL CHECK (operation IN ('ADD', 'MODIFY', 'DELETE')),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- For existing users undergoing MODIFY or DELETE
    user_data JSONB, -- { name, mac_address, group_ids, schedule, temporary_access_until }
    original_data JSONB, -- For undoing MODIFY
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_draft_changes_draft_seq ON public.draft_changes(draft_id, sequence ASC);

-- 7. Configurations (Published State & History)
CREATE TABLE IF NOT EXISTS public.configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version INT NOT NULL UNIQUE,
    hash TEXT NOT NULL,
    user_count INT NOT NULL DEFAULT 0,
    firewall_content TEXT NOT NULL,
    ethers_content TEXT NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    rollback_from_version INT DEFAULT NULL,
    change_description TEXT DEFAULT NULL,
    author_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    author_name TEXT DEFAULT NULL,
    deployment_status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_configurations_is_current ON public.configurations(is_current);
CREATE INDEX IF NOT EXISTS idx_configurations_version ON public.configurations(version DESC);
CREATE INDEX IF NOT EXISTS idx_configurations_deployment_status ON public.configurations(deployment_status);

-- 8. Audit Logs Table (Tamper-proof activity ledger)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    actor_username TEXT,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_username);

-- 9. Router Telemetry Table (Heartbeats, sync results, and health)
CREATE TABLE IF NOT EXISTS public.router_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uptime INT,
    openwrt_version TEXT,
    config_version INT,
    last_sync TIMESTAMPTZ,
    cpu_usage NUMERIC,
    memory_usage NUMERIC,
    disk_free INT,
    wan_status TEXT,
    connected_clients INT,
    last_sync_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_router_telemetry_created_at ON public.router_telemetry(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_router_telemetry_config_version ON public.router_telemetry(config_version);

-- 10. App Settings Table (Persistent MAC Auth state and router options)
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Seed initial MAC Authentication enabled state & router token rotation slot
INSERT INTO public.app_settings (key, value) VALUES
    ('mac_auth', '{"enabled": true, "disabled_until": null, "disabled_by_role": null}'::jsonb),
    ('router_token', '{"token_hash": null, "created_at": null, "revoked": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 11. Enable Row Level Security
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.router_telemetry ENABLE ROW LEVEL SECURITY;

-- 12. Standard RLS Policies
CREATE POLICY "Full access to accounts" ON public.accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access to users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access to groups" ON public.groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access to user_groups" ON public.user_groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access to drafts" ON public.drafts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access to draft_changes" ON public.draft_changes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access to configurations" ON public.configurations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access to app_settings" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);

-- 13. Strict Tamper-Proof Policies for Audit Logs & Telemetry
-- Clients can read and write audit events, but NEVER mutate or delete historical audits
CREATE POLICY "Allow read audit_logs" ON public.audit_logs FOR SELECT USING (true);
CREATE POLICY "Allow insert audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Deny update audit_logs" ON public.audit_logs FOR UPDATE USING (false);
CREATE POLICY "Deny delete audit_logs" ON public.audit_logs FOR DELETE USING (false);

-- Router telemetry: insert and read allowed, mutation and deletion blocked
CREATE POLICY "Allow read router_telemetry" ON public.router_telemetry FOR SELECT USING (true);
CREATE POLICY "Allow insert router_telemetry" ON public.router_telemetry FOR INSERT WITH CHECK (true);
CREATE POLICY "Deny update router_telemetry" ON public.router_telemetry FOR UPDATE USING (false);
CREATE POLICY "Deny delete router_telemetry" ON public.router_telemetry FOR DELETE USING (false);
