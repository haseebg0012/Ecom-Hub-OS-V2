-- ==============================================================================
-- EcomHub OS — Business Roles & Task Builder Foundation Migration
-- Product: EcomHub OS | Tagline: Your Business, One Hub.
-- Description: Master-defined business role templates, workspace assignments, and task templates
-- ==============================================================================

-- 1. BUSINESS ROLE TEMPLATES (Global catalog managed by Platform Master)
CREATE TABLE IF NOT EXISTS public.business_role_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    department TEXT NOT NULL,
    description TEXT NOT NULL,
    responsibilities JSONB DEFAULT '[]'::jsonb,
    default_task_templates JSONB DEFAULT '[]'::jsonb,
    recommended_permissions JSONB DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. WORKSPACE ASSIGNED ROLES (Workspace-specific enabled business roles)
CREATE TABLE IF NOT EXISTS public.workspace_assigned_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    role_template_id UUID NOT NULL REFERENCES public.business_role_templates(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(business_id, role_template_id)
);

-- 3. TASK TEMPLATES (Reusable task templates created by Master)
CREATE TABLE IF NOT EXISTS public.task_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    department TEXT NOT NULL,
    role_name TEXT,
    description TEXT,
    instructions TEXT,
    priority_default TEXT DEFAULT 'Medium' CHECK (priority_default in ('Low', 'Medium', 'High', 'Urgent')),
    estimated_duration TEXT,
    recurring_suggestion TEXT,
    required_module TEXT,
    recommended_permission TEXT,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 4. ROLE <-> TASK TEMPLATES RELATIONSHIP
CREATE TABLE IF NOT EXISTS public.role_task_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_template_id UUID NOT NULL REFERENCES public.business_role_templates(id) ON DELETE CASCADE,
    task_template_id UUID NOT NULL REFERENCES public.task_templates(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(role_template_id, task_template_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workspace_assigned_roles_business_id ON public.workspace_assigned_roles(business_id);
CREATE INDEX IF NOT EXISTS idx_workspace_assigned_roles_role_id ON public.workspace_assigned_roles(role_template_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_department ON public.task_templates(department);
CREATE INDEX IF NOT EXISTS idx_business_role_templates_dept ON public.business_role_templates(department);

-- Enable RLS
ALTER TABLE public.business_role_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_assigned_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_task_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Global role templates: readable by all authenticated business users, modifiable by platform owner/admin via server
CREATE POLICY "business_role_templates_select_all"
ON public.business_role_templates FOR SELECT
USING (true);

CREATE POLICY "business_role_templates_admin_all"
ON public.business_role_templates FOR ALL
USING (auth.uid() IS NOT NULL);

-- Workspace assigned roles: readable by members of that business
CREATE POLICY "workspace_assigned_roles_select_policy"
ON public.workspace_assigned_roles FOR SELECT
USING (public.is_business_member(business_id));

CREATE POLICY "workspace_assigned_roles_admin_all"
ON public.workspace_assigned_roles FOR ALL
USING (auth.uid() IS NOT NULL);

-- Task templates: readable by all authenticated users
CREATE POLICY "task_templates_select_all"
ON public.task_templates FOR SELECT
USING (true);

CREATE POLICY "task_templates_admin_all"
ON public.task_templates FOR ALL
USING (auth.uid() IS NOT NULL);

-- Role task templates: readable by all
CREATE POLICY "role_task_templates_select_all"
ON public.role_task_templates FOR SELECT
USING (true);

CREATE POLICY "role_task_templates_admin_all"
ON public.role_task_templates FOR ALL
USING (auth.uid() IS NOT NULL);

-- Seed initial professional Business Roles (excluding Manager as requested)
INSERT INTO public.business_role_templates (name, department, description, responsibilities, default_task_templates, recommended_permissions, status)
VALUES
('Lead Generator', 'Sales', 'Responsible for sourcing, researching, entering and maintaining potential business leads.',
 '["Research potential prospects", "Add leads", "Maintain lead contact data", "Record lead source", "Add lead notes", "Perform basic qualification", "Keep lead information accurate"]'::jsonb,
 '["Research New Leads", "Add Qualified Leads", "Verify Lead Contact Details", "Update Lead Source", "Add Lead Notes", "Review Assigned Lead List"]'::jsonb,
 '["leads.view", "leads.create", "leads.edit"]'::jsonb, 'Active'),

('Cold Caller', 'Sales', 'Review assigned leads, call prospects, record call outcomes, add call notes, schedule follow-ups.',
 '["Review assigned leads", "Call prospects", "Record call outcome", "Add call notes", "Update permitted lead status", "Schedule follow-up", "Complete follow-up", "Escalate qualified leads"]'::jsonb,
 '["Today Assigned Calls", "Contact New Leads", "Update Call Outcomes", "Schedule Follow-ups", "Complete Pending Follow-ups", "Escalate Qualified Lead"]'::jsonb,
 '["leads.view", "leads.edit", "calls.manage"]'::jsonb, 'Active'),

('Sales Representative', 'Sales', 'Manage sales pipelines, close deals, coordinate client onboarding.',
 '["Manage sales pipeline", "Conduct sales demos", "Negotiate contract terms", "Close deals", "Coordinate client handover"]'::jsonb,
 '["Conduct Sales Demo", "Prepare Proposal", "Follow Up On Quote", "Close Deal & Handover"]'::jsonb,
 '["deals.manage", "crm.full"]'::jsonb, 'Active'),

('Business Admin', 'Operations', 'Manage operations, employee profiles, operational work, CRM, tasks, and settings according to permissions.',
 '["Manage employees according to permissions", "Assign employee profiles", "Manage operational work", "Manage CRM", "Manage projects/tasks", "Edit assignments", "Manage business settings"]'::jsonb,
 '["Review Daily Operations", "Audit Employee Assignments", "Approve Operational Requests"]'::jsonb,
 '["settings.manage", "team.manage", "operations.full"]'::jsonb, 'Active'),

('Graphic Designer', 'Creative', 'Create visual design assets, marketing graphics, and brand collateral.',
 '["Review design brief", "Create visual concepts", "Design marketing collateral", "Apply client revisions", "Export deliverables"]'::jsonb,
 '["Review Design Brief", "Create Design Draft", "Submit for Review", "Apply Revisions", "Deliver Final Asset"]'::jsonb,
 '["creative.manage", "assets.view"]'::jsonb, 'Active'),

('Accountant', 'Finance', 'Manage invoicing, expense recording, accounts payable/receivable, and financial reporting.',
 '["Review receivables", "Record expenses", "Reconcile accounts", "Prepare invoices", "Assist with tax filings"]'::jsonb,
 '["Review Receivables", "Record Expense", "Reconcile Account", "Prepare Invoice"]'::jsonb,
 '["finance.manage", "invoices.full"]'::jsonb, 'Active')
ON CONFLICT (name) DO NOTHING;
