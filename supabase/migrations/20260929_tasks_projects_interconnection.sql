-- ==============================================================================
-- EcomHub OS — Phase 6: Tasks, Projects & Clients Migration
-- Interconnected canonical tables for Tasks, Task Notes, and Projects.
-- ==============================================================================

-- 1. Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    client_name TEXT,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'On Hold', 'Completed', 'Planning')),
    budget NUMERIC(15, 2) DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'USD',
    deadline DATE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'Queue' CHECK (status IN ('Queue', 'Working', 'Pending', 'Having Problem', 'Done')),
    priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
    deadline DATE NOT NULL,
    due_date DATE,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assignee TEXT,
    short_note TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Task Notes Table
CREATE TABLE IF NOT EXISTS public.task_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_name TEXT,
    text VARCHAR(250) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_business_id ON public.tasks(business_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_projects_business_id ON public.projects(business_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects(client_id);
CREATE INDEX IF NOT EXISTS idx_task_notes_task_id ON public.task_notes(task_id);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_notes ENABLE ROW LEVEL SECURITY;

-- Permissive policies for workspace members
CREATE POLICY "Projects accessible by business members" ON public.projects
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.business_members bm
            WHERE bm.business_id = projects.business_id
            AND bm.user_id = auth.uid()
        )
    );

CREATE POLICY "Tasks accessible by business members" ON public.tasks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.business_members bm
            WHERE bm.business_id = tasks.business_id
            AND bm.user_id = auth.uid()
        )
    );

CREATE POLICY "Task notes accessible by business members" ON public.task_notes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.business_members bm
            WHERE bm.business_id = task_notes.business_id
            AND bm.user_id = auth.uid()
        )
    );
