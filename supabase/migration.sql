-- ==============================================================================
-- Supabase Migration: Update Schema for OpenWrt MAC Access Manager
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

-- 4. Create App Settings Table (for MAC Auth toggle state & schedule)
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Seed initial MAC Authentication state
INSERT INTO public.app_settings (key, value) VALUES
    ('mac_auth', '{"enabled": true, "disabled_until": null, "disabled_by_role": null}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 5. Ensure all tables have Row Level Security enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- 6. Grant Public Access Policies (Allows publishable key and authenticated clients to read/write)
DROP POLICY IF EXISTS "Allow all users" ON public.users;
DROP POLICY IF EXISTS "Allow all groups" ON public.groups;
DROP POLICY IF EXISTS "Allow all user_groups" ON public.user_groups;
DROP POLICY IF EXISTS "Allow all drafts" ON public.drafts;
DROP POLICY IF EXISTS "Allow all draft_changes" ON public.draft_changes;
DROP POLICY IF EXISTS "Allow all configurations" ON public.configurations;
DROP POLICY IF EXISTS "Allow all accounts" ON public.accounts;
DROP POLICY IF EXISTS "Allow all app_settings" ON public.app_settings;

DROP POLICY IF EXISTS "Authenticated users have full access to users" ON public.users;
DROP POLICY IF EXISTS "Authenticated users have full access to groups" ON public.groups;
DROP POLICY IF EXISTS "Authenticated users have full access to user_groups" ON public.user_groups;
DROP POLICY IF EXISTS "Authenticated users have full access to drafts" ON public.drafts;
DROP POLICY IF EXISTS "Authenticated users have full access to draft_changes" ON public.draft_changes;
DROP POLICY IF EXISTS "Authenticated users have full access to configurations" ON public.configurations;

CREATE POLICY "Allow all users" ON public.users FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all groups" ON public.groups FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all user_groups" ON public.user_groups FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all drafts" ON public.drafts FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all draft_changes" ON public.draft_changes FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all configurations" ON public.configurations FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all accounts" ON public.accounts FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all app_settings" ON public.app_settings FOR ALL TO public USING (true) WITH CHECK (true);

-- 7. Ensure unique user names (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_name_unique ON public.users(lower(name));
-- ==============================================================================
-- Supabase Migration: Update Schema for OpenWrt MAC Access Manager
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

-- 4. Create App Settings Table (for MAC Auth toggle state & schedule)
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Seed initial MAC Authentication state
INSERT INTO public.app_settings (key, value) VALUES
    ('mac_auth', '{"enabled": true, "disabled_until": null, "disabled_by_role": null}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 5. Ensure all tables have Row Level Security enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- 6. Grant Public Access Policies (Allows publishable key and authenticated clients to read/write)
DROP POLICY IF EXISTS "Allow all users" ON public.users;
DROP POLICY IF EXISTS "Allow all groups" ON public.groups;
DROP POLICY IF EXISTS "Allow all user_groups" ON public.user_groups;
DROP POLICY IF EXISTS "Allow all drafts" ON public.drafts;
DROP POLICY IF EXISTS "Allow all draft_changes" ON public.draft_changes;
DROP POLICY IF EXISTS "Allow all configurations" ON public.configurations;
DROP POLICY IF EXISTS "Allow all accounts" ON public.accounts;
DROP POLICY IF EXISTS "Allow all app_settings" ON public.app_settings;

DROP POLICY IF EXISTS "Authenticated users have full access to users" ON public.users;
DROP POLICY IF EXISTS "Authenticated users have full access to groups" ON public.groups;
DROP POLICY IF EXISTS "Authenticated users have full access to user_groups" ON public.user_groups;
DROP POLICY IF EXISTS "Authenticated users have full access to drafts" ON public.drafts;
DROP POLICY IF EXISTS "Authenticated users have full access to draft_changes" ON public.draft_changes;
DROP POLICY IF EXISTS "Authenticated users have full access to configurations" ON public.configurations;

CREATE POLICY "Allow all users" ON public.users FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all groups" ON public.groups FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all user_groups" ON public.user_groups FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all drafts" ON public.drafts FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all draft_changes" ON public.draft_changes FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all configurations" ON public.configurations FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all accounts" ON public.accounts FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all app_settings" ON public.app_settings FOR ALL TO public USING (true) WITH CHECK (true);

-- 7. Ensure unique user names (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_name_unique ON public.users(lower(name));


