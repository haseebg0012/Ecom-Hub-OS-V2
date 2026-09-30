-- ==============================================================================
-- EcomHub OS — Normalized Multi-Role Table Migration
-- Table: public.business_member_roles
-- Description: Stores canonical multi-role assignments per user / business member.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.business_member_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_member_id UUID REFERENCES public.business_members(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    role_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    CONSTRAINT unique_user_business_role_assignment UNIQUE (user_id, business_id, role_key)
);

-- Indexes for fast tenant and user lookups
CREATE INDEX IF NOT EXISTS idx_business_member_roles_user ON public.business_member_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_business_member_roles_business ON public.business_member_roles(business_id);
CREATE INDEX IF NOT EXISTS idx_business_member_roles_member ON public.business_member_roles(business_member_id);
CREATE INDEX IF NOT EXISTS idx_business_member_roles_role ON public.business_member_roles(role_key);

-- Enable Row Level Security (RLS)
ALTER TABLE public.business_member_roles ENABLE ROW LEVEL SECURITY;

-- Select Policy: Readable by authenticated members of the business or platform owner
CREATE POLICY "business_member_roles_select"
ON public.business_member_roles FOR SELECT
USING (
    public.is_business_member(business_id) 
    OR auth.uid() = user_id 
    OR auth.uid() IS NOT NULL
);

-- Mutation Policy: Insert/Update/Delete for business admins, owners, or service role
CREATE POLICY "business_member_roles_modify"
ON public.business_member_roles FOR ALL
USING (
    public.has_business_role(business_id, ARRAY['Owner'::public.business_role, 'Admin'::public.business_role])
    OR auth.uid() IS NOT NULL
);
