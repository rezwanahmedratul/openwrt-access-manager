-- OpenWrt MAC Access Manager Schema
-- Run this in your Supabase SQL Editor

-- 1. Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    mac_address TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for case-insensitive and prefix lookups
CREATE INDEX IF NOT EXISTS idx_users_name ON public.users(name);
CREATE INDEX IF NOT EXISTS idx_users_mac ON public.users(mac_address);

-- 2. Groups Table
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

-- 3. User Groups Junction Table
CREATE TABLE IF NOT EXISTS public.user_groups (
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, group_id)
);

-- 4. Drafts Table (Single active draft session or per-admin)
CREATE TABLE IF NOT EXISTS public.drafts (
    id TEXT PRIMARY KEY DEFAULT 'current',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

INSERT INTO public.drafts (id) VALUES ('current') ON CONFLICT (id) DO NOTHING;

-- 5. Draft Changes (Pending Operations with Undo Stack)
CREATE TABLE IF NOT EXISTS public.draft_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draft_id TEXT NOT NULL REFERENCES public.drafts(id) ON DELETE CASCADE DEFAULT 'current',
    sequence SERIAL,
    operation TEXT NOT NULL CHECK (operation IN ('ADD', 'MODIFY', 'DELETE')),
    user_id UUID, -- For existing users undergoing MODIFY or DELETE
    user_data JSONB, -- { name, mac_address, group_ids }
    original_data JSONB, -- For undoing MODIFY
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_draft_changes_draft_seq ON public.draft_changes(draft_id, sequence ASC);

-- 6. Configurations (Published State & History)
CREATE TABLE IF NOT EXISTS public.configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version INT NOT NULL UNIQUE,
    hash TEXT NOT NULL,
    user_count INT NOT NULL DEFAULT 0,
    firewall_content TEXT NOT NULL,
    ethers_content TEXT NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_configurations_is_current ON public.configurations(is_current);
CREATE INDEX IF NOT EXISTS idx_configurations_version ON public.configurations(version DESC);

-- 7. Accounts Table (RBAC: Admin and Subadmin accounts)
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'subadmin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Seed default admin and subadmin accounts
INSERT INTO public.accounts (username, password_hash, role) VALUES
    ('admin', 'admin123', 'admin'),
    ('subadmin', 'subadmin123', 'subadmin')
ON CONFLICT (username) DO NOTHING;

-- 8. App Settings Table (Persistent MAC Auth state and router options)
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Seed initial MAC Authentication enabled state
INSERT INTO public.app_settings (key, value) VALUES
    ('mac_auth', '{"enabled": true, "disabled_until": null, "disabled_by_role": null}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow full access to all tables (Backend uses Service Role Key which bypasses RLS, but these policies ensure seamless access)
CREATE POLICY "Full access to users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access to groups" ON public.groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access to user_groups" ON public.user_groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access to drafts" ON public.drafts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access to draft_changes" ON public.draft_changes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access to configurations" ON public.configurations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access to accounts" ON public.accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access to app_settings" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);
