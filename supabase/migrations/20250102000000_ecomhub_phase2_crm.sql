-- ==============================================================================
-- EcomHub OS — Phase 2 CRM, Leads, Clients & Multi-Currency Migration
-- Description: Leads, Clients, Contacts, Activities, Follow-ups, Exchange Rates,
--              and Notifications with strict Row Level Security (RLS).
-- Brand: EcomHub | Product: EcomHub OS | Tagline: Your Business, One Hub.
-- ==============================================================================

-- 1. Clients Table (Must precede leads table for converted_to_client_id FK)
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    logo TEXT,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    website TEXT,
    industry TEXT,
    address TEXT,
    city TEXT,
    country TEXT,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Onboarding', 'Inactive', 'Archived')),
    source TEXT,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    preferred_currency TEXT NOT NULL DEFAULT 'USD' CHECK (preferred_currency IN ('USD', 'PKR')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Leads Table
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    company TEXT,
    email TEXT,
    phone TEXT,
    website TEXT,
    service TEXT,
    message TEXT,
    budget NUMERIC(15, 2),
    currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'PKR')),
    source TEXT NOT NULL DEFAULT 'Website',
    campaign TEXT,
    landing_page TEXT,
    status TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'Contacted', 'Qualified', 'Meeting', 'Proposal', 'Negotiation', 'Won', 'Lost')),
    priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    last_contacted_at TIMESTAMPTZ,
    next_followup_at TIMESTAMPTZ,
    converted_to_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Client Contacts Table
CREATE TABLE IF NOT EXISTS public.client_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position TEXT,
    email TEXT,
    phone TEXT,
    is_primary BOOLEAN DEFAULT false NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Client Notes Table
CREATE TABLE IF NOT EXISTS public.client_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Unified CRM Activities Table (Leads & Clients Timeline)
CREATE TABLE IF NOT EXISTS public.crm_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('Note', 'Call', 'Email', 'Meeting', 'Status change', 'Assignment', 'Follow-up', 'Website submission', 'Import', 'Converted')),
    title TEXT NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Lead Follow-ups Table
CREATE TABLE IF NOT EXISTS public.lead_followups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    followup_date DATE NOT NULL,
    followup_time TEXT,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed', 'Cancelled')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. Multi-Currency Exchange Rates Table
CREATE TABLE IF NOT EXISTS public.exchange_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    from_currency TEXT NOT NULL,
    to_currency TEXT NOT NULL,
    rate NUMERIC(15, 6) NOT NULL,
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 8. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link_section TEXT NOT NULL DEFAULT 'leads',
    entity_id TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==============================================================================
-- INDEXES FOR HIGH-PERFORMANCE SEARCH, FILTERING AND PIPELINE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_leads_business_id ON public.leads(business_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_company ON public.leads(company);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_clients_business_id ON public.clients(business_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_assigned_to ON public.clients(assigned_to);
CREATE INDEX IF NOT EXISTS idx_clients_company_name ON public.clients(company_name);
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email);

CREATE INDEX IF NOT EXISTS idx_client_contacts_client_id ON public.client_contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_client_contacts_business_id ON public.client_contacts(business_id);

CREATE INDEX IF NOT EXISTS idx_crm_activities_lead_id ON public.crm_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_client_id ON public.crm_activities(client_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_business_id ON public.crm_activities(business_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_created_at ON public.crm_activities(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_followups_lead_id ON public.lead_followups(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_followups_business_id ON public.lead_followups(business_id);
CREATE INDEX IF NOT EXISTS idx_lead_followups_status ON public.lead_followups(status);
CREATE INDEX IF NOT EXISTS idx_lead_followups_date ON public.lead_followups(followup_date);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_business_id ON public.exchange_rates(business_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_business ON public.notifications(business_id, user_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) FOR CRM TABLES
-- ==============================================================================
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Leads Policies:
-- -----------------------------------------------------------------------------
CREATE POLICY "Members can view leads in their business"
    ON public.leads FOR SELECT
    USING (public.is_business_member(business_id));

CREATE POLICY "Members can insert leads in their business"
    ON public.leads FOR INSERT
    WITH CHECK (public.is_business_member(business_id));

CREATE POLICY "Members can update leads in their business"
    ON public.leads FOR UPDATE
    USING (public.is_business_member(business_id));

CREATE POLICY "Managers, Admins, and Owners can delete leads"
    ON public.leads FOR DELETE
    USING (public.has_business_role(business_id, ARRAY['Owner', 'Admin', 'Manager']::public.business_role[]));

-- -----------------------------------------------------------------------------
-- Clients Policies:
-- -----------------------------------------------------------------------------
CREATE POLICY "Members can view clients in their business"
    ON public.clients FOR SELECT
    USING (public.is_business_member(business_id));

CREATE POLICY "Members can insert clients in their business"
    ON public.clients FOR INSERT
    WITH CHECK (public.is_business_member(business_id));

CREATE POLICY "Members can update clients in their business"
    ON public.clients FOR UPDATE
    USING (public.is_business_member(business_id));

CREATE POLICY "Managers, Admins, and Owners can delete clients"
    ON public.clients FOR DELETE
    USING (public.has_business_role(business_id, ARRAY['Owner', 'Admin', 'Manager']::public.business_role[]));

-- -----------------------------------------------------------------------------
-- Client Contacts Policies:
-- -----------------------------------------------------------------------------
CREATE POLICY "Members can view client contacts in their business"
    ON public.client_contacts FOR SELECT
    USING (public.is_business_member(business_id));

CREATE POLICY "Members can insert client contacts in their business"
    ON public.client_contacts FOR INSERT
    WITH CHECK (public.is_business_member(business_id));

CREATE POLICY "Members can update client contacts in their business"
    ON public.client_contacts FOR UPDATE
    USING (public.is_business_member(business_id));

CREATE POLICY "Members can delete client contacts in their business"
    ON public.client_contacts FOR DELETE
    USING (public.is_business_member(business_id));

-- -----------------------------------------------------------------------------
-- Client Notes Policies:
-- -----------------------------------------------------------------------------
CREATE POLICY "Members can view client notes in their business"
    ON public.client_notes FOR SELECT
    USING (public.is_business_member(business_id));

CREATE POLICY "Members can insert client notes in their business"
    ON public.client_notes FOR INSERT
    WITH CHECK (public.is_business_member(business_id));

CREATE POLICY "Authors, Admins, and Owners can update client notes"
    ON public.client_notes FOR UPDATE
    USING (
        (auth.uid() = user_id)
        OR public.has_business_role(business_id, ARRAY['Owner', 'Admin']::public.business_role[])
    );

CREATE POLICY "Authors, Admins, and Owners can delete client notes"
    ON public.client_notes FOR DELETE
    USING (
        (auth.uid() = user_id)
        OR public.has_business_role(business_id, ARRAY['Owner', 'Admin']::public.business_role[])
    );

-- -----------------------------------------------------------------------------
-- CRM Activities Policies:
-- -----------------------------------------------------------------------------
CREATE POLICY "Members can view activities in their business"
    ON public.crm_activities FOR SELECT
    USING (public.is_business_member(business_id));

CREATE POLICY "Members can insert activities in their business"
    ON public.crm_activities FOR INSERT
    WITH CHECK (public.is_business_member(business_id));

-- -----------------------------------------------------------------------------
-- Lead Follow-ups Policies:
-- -----------------------------------------------------------------------------
CREATE POLICY "Members can view follow-ups in their business"
    ON public.lead_followups FOR SELECT
    USING (public.is_business_member(business_id));

CREATE POLICY "Members can insert follow-ups in their business"
    ON public.lead_followups FOR INSERT
    WITH CHECK (public.is_business_member(business_id));

CREATE POLICY "Members can update follow-ups in their business"
    ON public.lead_followups FOR UPDATE
    USING (public.is_business_member(business_id));

CREATE POLICY "Members can delete follow-ups in their business"
    ON public.lead_followups FOR DELETE
    USING (public.is_business_member(business_id));

-- -----------------------------------------------------------------------------
-- Exchange Rates Policies:
-- -----------------------------------------------------------------------------
CREATE POLICY "Members can view exchange rates in their business"
    ON public.exchange_rates FOR SELECT
    USING (public.is_business_member(business_id));

CREATE POLICY "Managers, Finance, Admins, and Owners can insert/update rates"
    ON public.exchange_rates FOR INSERT
    WITH CHECK (public.has_business_role(business_id, ARRAY['Owner', 'Admin', 'Finance', 'Manager']::public.business_role[]));

-- -----------------------------------------------------------------------------
-- Notifications Policies:
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view notifications for their business"
    ON public.notifications FOR SELECT
    USING (
        public.is_business_member(business_id)
        AND (user_id IS NULL OR user_id = auth.uid())
    );

CREATE POLICY "Users can update their notifications (mark as read)"
    ON public.notifications FOR UPDATE
    USING (
        public.is_business_member(business_id)
        AND (user_id IS NULL OR user_id = auth.uid())
    );

-- -----------------------------------------------------------------------------
-- Auto updated_at Triggers
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS update_leads_updated_at ON public.leads;
CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON public.leads
    FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON public.clients
    FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

DROP TRIGGER IF EXISTS update_lead_followups_updated_at ON public.lead_followups;
CREATE TRIGGER update_lead_followups_updated_at
    BEFORE UPDATE ON public.lead_followups
    FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
