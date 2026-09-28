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
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Seed Default group and common groups
INSERT INTO public.groups (name) VALUES
    ('Default'),
    ('Family'),
    ('Friends'),
    ('Students'),
    ('Guests'),
    ('Devices'),
    ('Others')
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

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configurations ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full read/write, service_role bypasses RLS
CREATE POLICY "Authenticated users have full access to users" ON public.users
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users have full access to groups" ON public.groups
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users have full access to user_groups" ON public.user_groups
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users have full access to drafts" ON public.drafts
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users have full access to draft_changes" ON public.draft_changes
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users have full access to configurations" ON public.configurations
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
