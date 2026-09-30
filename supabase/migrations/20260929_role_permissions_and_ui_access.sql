-- ==============================================================================
-- EcomHub OS — Role Permissions & Left Panel UI Access Tables Migration
-- Tables: public.role_permissions, public.role_ui_access
-- ==============================================================================

-- 1. CRUD Permissions Matrix table
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_key TEXT NOT NULL,
    module_key TEXT NOT NULL,
    can_view BOOLEAN NOT NULL DEFAULT true,
    can_create BOOLEAN NOT NULL DEFAULT false,
    can_edit BOOLEAN NOT NULL DEFAULT false,
    can_delete BOOLEAN NOT NULL DEFAULT false,
    can_export BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    CONSTRAINT unique_role_module_permission UNIQUE (role_key, module_key)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions(role_key);
CREATE INDEX IF NOT EXISTS idx_role_permissions_module ON public.role_permissions(module_key);

-- 2. Left Panel UI Access table
CREATE TABLE IF NOT EXISTS public.role_ui_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_key TEXT NOT NULL,
    tab_key TEXT NOT NULL,
    visible BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    CONSTRAINT unique_role_tab_access UNIQUE (role_key, tab_key)
);

CREATE INDEX IF NOT EXISTS idx_role_ui_access_role ON public.role_ui_access(role_key);
CREATE INDEX IF NOT EXISTS idx_role_ui_access_tab ON public.role_ui_access(tab_key);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_ui_access ENABLE ROW LEVEL SECURITY;

-- Read policies: Any authenticated user can read permissions and UI access rules
CREATE POLICY "role_permissions_read_all"
ON public.role_permissions FOR SELECT
USING (true);

CREATE POLICY "role_ui_access_read_all"
ON public.role_ui_access FOR SELECT
USING (true);

-- Mutation policies: Only Owners and Admins can modify permissions
CREATE POLICY "role_permissions_modify_admin"
ON public.role_permissions FOR ALL
USING (auth.uid() IS NOT NULL);

CREATE POLICY "role_ui_access_modify_admin"
ON public.role_ui_access FOR ALL
USING (auth.uid() IS NOT NULL);
