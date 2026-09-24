-- ==============================================================================
-- EcomHub OS — Database Foundation Migration
-- Description: Production-ready multi-tenant schema with Row Level Security (RLS)
-- Brand: EcomHub | Product: EcomHub OS | Tagline: Your Business, One Hub.
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create User Profiles Table
-- Linked 1:1 with auth.users (Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Create Businesses Table (Multi-tenant Root)
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    logo TEXT,
    email TEXT,
    phone TEXT,
    website TEXT,
    address TEXT,
    default_currency TEXT DEFAULT 'USD' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Create Business Memberships Table
-- Junction table supporting Multi-Tenancy and Extensible Roles
DO $$ BEGIN
    CREATE TYPE public.business_role AS ENUM (
        'Owner',
        'Admin',
        'Manager',
        'Finance',
        'Sales',
        'Employee',
        'Viewer'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.business_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    role public.business_role NOT NULL DEFAULT 'Employee',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_user_business UNIQUE (user_id, business_id)
);

-- 5. Indexes for High-Performance Tenant Lookups
CREATE INDEX IF NOT EXISTS idx_business_members_user_id ON public.business_members(user_id);
CREATE INDEX IF NOT EXISTS idx_business_members_business_id ON public.business_members(business_id);
CREATE INDEX IF NOT EXISTS idx_business_members_role ON public.business_members(role);
CREATE INDEX IF NOT EXISTS idx_businesses_name ON public.businesses(name);

-- 6. Helper Security Functions (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_business_member(b_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.business_members 
        WHERE business_id = b_id 
        AND user_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.has_business_role(b_id UUID, allowed_roles public.business_role[])
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.business_members 
        WHERE business_id = b_id 
        AND user_id = auth.uid()
        AND role = ANY(allowed_roles)
    );
$$;

-- 7. Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Profiles Policies:
-- Users can view their own profile, plus profiles of members in shared businesses.
-- Users can only update their own profile.
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view own profile" 
    ON public.profiles 
    FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can view colleagues in same businesses"
    ON public.profiles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.business_members bm1
            JOIN public.business_members bm2 ON bm1.business_id = bm2.business_id
            WHERE bm1.user_id = auth.uid() AND bm2.user_id = public.profiles.id
        )
    );

CREATE POLICY "Users can update own profile" 
    ON public.profiles 
    FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- Businesses Policies:
-- Users can only view businesses they belong to.
-- Only Owners and Admins can update their business details.
-- Authenticated users can create new businesses.
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view businesses they belong to"
    ON public.businesses
    FOR SELECT
    USING (public.is_business_member(id));

CREATE POLICY "Owners and Admins can update business"
    ON public.businesses
    FOR UPDATE
    USING (public.has_business_role(id, ARRAY['Owner', 'Admin']::public.business_role[]));

CREATE POLICY "Authenticated users can create businesses"
    ON public.businesses
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- -----------------------------------------------------------------------------
-- Business Members Policies:
-- Users can view members of businesses they belong to.
-- Owners and Admins can add or update members in their business.
-- Only Owners can delete members (or members can leave themselves).
-- -----------------------------------------------------------------------------
CREATE POLICY "Members can view other members in their business"
    ON public.business_members
    FOR SELECT
    USING (public.is_business_member(business_id));

CREATE POLICY "Owners and Admins can add members"
    ON public.business_members
    FOR INSERT
    WITH CHECK (
        public.has_business_role(business_id, ARRAY['Owner', 'Admin']::public.business_role[])
        OR 
        -- Allow the creator to add themselves as initial Owner when creating business
        (auth.uid() = user_id AND role = 'Owner')
    );

CREATE POLICY "Owners and Admins can update member roles"
    ON public.business_members
    FOR UPDATE
    USING (public.has_business_role(business_id, ARRAY['Owner', 'Admin']::public.business_role[]));

CREATE POLICY "Owners can remove members or members can remove themselves"
    ON public.business_members
    FOR DELETE
    USING (
        public.has_business_role(business_id, ARRAY['Owner']::public.business_role[])
        OR auth.uid() = user_id
    );

-- 8. Auto Profile Creation Trigger on Supabase Auth Sign Up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 9. Automatic Updated At Trigger Function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS update_businesses_updated_at ON public.businesses;
CREATE TRIGGER update_businesses_updated_at
    BEFORE UPDATE ON public.businesses
    FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
