-- ==============================================================================
-- Supabase Migration: Full Combined Migration for OpenWrt MAC Access Manager
-- Run this in your Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Ensure columns exist on public.groups
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS is_protected BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS is_no_internet BOOLEAN NOT NULL DEFAULT false;

-- 2. Seed default groups if not already present
INSERT INTO public.groups (name, is_protected, is_no_internet) VALUES
    ('Default', false, false),
    ('Family', false, false),
    ('Friends', false, false),
    ('Students', false, false),
    ('Guests', false, false),
    ('Devices', false, false),
    ('Others', false, false)
ON CONFLICT (name) DO UPDATE SET
    is_protected = EXCLUDED.is_protected,
    is_no_internet = EXCLUDED.is_no_internet;

-- 3. Create Accounts Table (for Admin / Subadmin logins)
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'subadmin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Seed default admin and subadmin logins
INSERT INTO public.accounts (username, password_hash, role) VALUES
    ('admin', 'admin123', 'admin'),
    ('subadmin', 'subadmin123', 'subadmin')
ON CONFLICT (username) DO NOTHING;

-- 4. Create App Settings Table
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Seed initial MAC Authentication state & router token
INSERT INTO public.app_settings (key, value) VALUES
    ('mac_auth', '{"enabled": true, "disabled_until": null, "disabled_by_role": null}'::jsonb),
    ('router_token', '{"token_hash": null, "created_at": null, "revoked": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 5. Foreign keys on existing tables
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_draft_changes_user' AND table_name = 'draft_changes'
    ) THEN
        ALTER TABLE public.draft_changes 
        ADD CONSTRAINT fk_draft_changes_user 
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 6. Unique Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_name_unique ON public.users(lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_mac_unique ON public.users(mac_address);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_mac_lower_unique ON public.users(lower(mac_address));
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_username_unique ON public.accounts(lower(username));

-- 7. Add columns to users for scheduling & temporary access
ALTER TABLE public.users 
    ADD COLUMN IF NOT EXISTS schedule JSONB DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS temporary_access_until TIMESTAMPTZ DEFAULT NULL;

-- 8. Add columns to configurations
ALTER TABLE public.configurations
    ADD COLUMN IF NOT EXISTS rollback_from_version INT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS change_description TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS author_name TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS deployment_status TEXT NOT NULL DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_configurations_deployment_status ON public.configurations(deployment_status);

-- 9. Create Audit Logs Table
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

-- 10. Create Router Telemetry Table
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

-- 11. Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.router_telemetry ENABLE ROW LEVEL SECURITY;

-- Base RLS Policies
DROP POLICY IF EXISTS "Allow all users" ON public.users;
DROP POLICY IF EXISTS "Allow all groups" ON public.groups;
DROP POLICY IF EXISTS "Allow all user_groups" ON public.user_groups;
DROP POLICY IF EXISTS "Allow all drafts" ON public.drafts;
DROP POLICY IF EXISTS "Allow all draft_changes" ON public.draft_changes;
DROP POLICY IF EXISTS "Allow all configurations" ON public.configurations;
DROP POLICY IF EXISTS "Allow all accounts" ON public.accounts;
DROP POLICY IF EXISTS "Allow all app_settings" ON public.app_settings;

CREATE POLICY "Allow all users" ON public.users FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all groups" ON public.groups FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all user_groups" ON public.user_groups FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all drafts" ON public.drafts FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all draft_changes" ON public.draft_changes FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all configurations" ON public.configurations FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all accounts" ON public.accounts FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all app_settings" ON public.app_settings FOR ALL TO public USING (true) WITH CHECK (true);

-- Strict tamper protection for audit_logs & router_telemetry
DROP POLICY IF EXISTS "Allow read audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow insert audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Deny update audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Deny delete audit_logs" ON public.audit_logs;

CREATE POLICY "Allow read audit_logs" ON public.audit_logs FOR SELECT TO public USING (true);
CREATE POLICY "Allow insert audit_logs" ON public.audit_logs FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Deny update audit_logs" ON public.audit_logs FOR UPDATE TO public USING (false);
CREATE POLICY "Deny delete audit_logs" ON public.audit_logs FOR DELETE TO public USING (false);

DROP POLICY IF EXISTS "Allow read router_telemetry" ON public.router_telemetry;
DROP POLICY IF EXISTS "Allow insert router_telemetry" ON public.router_telemetry;
DROP POLICY IF EXISTS "Deny update router_telemetry" ON public.router_telemetry;
DROP POLICY IF EXISTS "Deny delete router_telemetry" ON public.router_telemetry;

CREATE POLICY "Allow read router_telemetry" ON public.router_telemetry FOR SELECT TO public USING (true);
CREATE POLICY "Allow insert router_telemetry" ON public.router_telemetry FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Deny update router_telemetry" ON public.router_telemetry FOR UPDATE TO public USING (false);
CREATE POLICY "Deny delete router_telemetry" ON public.router_telemetry FOR DELETE TO public USING (false);
