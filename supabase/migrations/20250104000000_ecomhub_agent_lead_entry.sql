-- ==============================================================================
-- EcomHub OS — Public Lead Entry & Agent Management Migration
-- Description: Lead Entry Forms, Lead Agents, and Agent Tracking with strict RLS.
-- Brand: EcomHub | Product: EcomHub OS | Tagline: Your Business, One Hub.
-- ==============================================================================

-- 1. Extend Leads Table with Agent Name
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS agent_name TEXT;
CREATE INDEX IF NOT EXISTS idx_leads_agent_name ON public.leads(agent_name);
CREATE INDEX IF NOT EXISTS idx_leads_source ON public.leads(source);

-- 2. Lead Agents Table (Business-specific agents who submit leads)
CREATE TABLE IF NOT EXISTS public.lead_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lead_agents_business_id ON public.lead_agents(business_id);
CREATE INDEX IF NOT EXISTS idx_lead_agents_is_active ON public.lead_agents(is_active);

-- 3. Lead Entry Forms Table (Secure public entry tokens per business)
CREATE TABLE IF NOT EXISTS public.lead_entry_forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_entry_forms_token ON public.lead_entry_forms(token);
CREATE INDEX IF NOT EXISTS idx_lead_entry_forms_business_id ON public.lead_entry_forms(business_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.lead_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_entry_forms ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for Lead Agents
DROP POLICY IF EXISTS "Users can view lead agents of businesses they belong to" ON public.lead_agents;
CREATE POLICY "Users can view lead agents of businesses they belong to"
ON public.lead_agents FOR SELECT
USING (
    business_id IN (
        SELECT bm.business_id FROM public.business_members bm WHERE bm.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Business members can manage lead agents" ON public.lead_agents;
CREATE POLICY "Business members can manage lead agents"
ON public.lead_agents FOR ALL
USING (
    business_id IN (
        SELECT bm.business_id FROM public.business_members bm 
        WHERE bm.user_id = auth.uid() 
        AND bm.role IN ('Owner', 'Admin', 'Manager', 'Sales')
    )
);

-- 6. RLS Policies for Lead Entry Forms
DROP POLICY IF EXISTS "Users can view lead entry forms of businesses they belong to" ON public.lead_entry_forms;
CREATE POLICY "Users can view lead entry forms of businesses they belong to"
ON public.lead_entry_forms FOR SELECT
USING (
    business_id IN (
        SELECT bm.business_id FROM public.business_members bm WHERE bm.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Business owners and admins can manage lead entry forms" ON public.lead_entry_forms;
CREATE POLICY "Business owners and admins can manage lead entry forms"
ON public.lead_entry_forms FOR ALL
USING (
    business_id IN (
        SELECT bm.business_id FROM public.business_members bm 
        WHERE bm.user_id = auth.uid() 
        AND bm.role IN ('Owner', 'Admin')
    )
);
