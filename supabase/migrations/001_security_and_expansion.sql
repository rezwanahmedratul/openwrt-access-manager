-- ==============================================================================
-- OpenWrt MAC Access Manager: Security & Expansion Migration
-- Migration: 001_security_and_expansion.sql
-- ==============================================================================

-- 1. Ensure foreign key constraints on existing tables with appropriate ON DELETE
DO $$
BEGIN
    -- draft_changes.user_id -> users(id) ON DELETE SET NULL
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_draft_changes_user' AND table_name = 'draft_changes'
    ) THEN
        ALTER TABLE public.draft_changes 
        ADD CONSTRAINT fk_draft_changes_user 
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Unique Indexes for case-insensitive and canonical identity
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_name_unique ON public.users(lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_mac_unique ON public.users(mac_address);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_mac_lower_unique ON public.users(lower(mac_address));
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_username_unique ON public.accounts(lower(username));

-- 3. Add columns to public.users for scheduling & temporary access
ALTER TABLE public.users 
    ADD COLUMN IF NOT EXISTS schedule JSONB DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS temporary_access_until TIMESTAMPTZ DEFAULT NULL;

-- 4. Add columns to public.configurations for deployment tracking, diffs, & rollbacks
ALTER TABLE public.configurations
    ADD COLUMN IF NOT EXISTS rollback_from_version INT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS change_description TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS author_name TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS deployment_status TEXT NOT NULL DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_configurations_deployment_status ON public.configurations(deployment_status);

-- 5. Create table public.audit_logs
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

-- 6. Create table public.router_telemetry
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

-- 7. Ensure app_settings supports router token rotation
INSERT INTO public.app_settings (key, value) VALUES
    ('router_token', '{"token_hash": null, "created_at": null, "revoked": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 8. Strict Row Level Security Policies
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.router_telemetry ENABLE ROW LEVEL SECURITY;

-- Tamper-proof audit logs: Read and insert allowed, UPDATE and DELETE strictly blocked
DROP POLICY IF EXISTS "Allow read audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow insert audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Deny update audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Deny delete audit_logs" ON public.audit_logs;

CREATE POLICY "Allow read audit_logs" ON public.audit_logs 
    FOR SELECT TO public USING (true);

CREATE POLICY "Allow insert audit_logs" ON public.audit_logs 
    FOR INSERT TO public WITH CHECK (true);

-- Explicitly reject client-side updates and deletes on audit_logs
CREATE POLICY "Deny update audit_logs" ON public.audit_logs 
    FOR UPDATE TO public USING (false);

CREATE POLICY "Deny delete audit_logs" ON public.audit_logs 
    FOR DELETE TO public USING (false);

-- Router telemetry RLS
DROP POLICY IF EXISTS "Allow read router_telemetry" ON public.router_telemetry;
DROP POLICY IF EXISTS "Allow insert router_telemetry" ON public.router_telemetry;
DROP POLICY IF EXISTS "Deny update router_telemetry" ON public.router_telemetry;
DROP POLICY IF EXISTS "Deny delete router_telemetry" ON public.router_telemetry;

CREATE POLICY "Allow read router_telemetry" ON public.router_telemetry 
    FOR SELECT TO public USING (true);

CREATE POLICY "Allow insert router_telemetry" ON public.router_telemetry 
    FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Deny update router_telemetry" ON public.router_telemetry 
    FOR UPDATE TO public USING (false);

CREATE POLICY "Deny delete router_telemetry" ON public.router_telemetry 
    FOR DELETE TO public USING (false);
