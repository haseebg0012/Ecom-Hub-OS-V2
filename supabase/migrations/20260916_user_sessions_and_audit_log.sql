-- ==============================================================================
-- EcomHub OS — User Sessions Audit & Destructive Action Audit Logging
-- Product: EcomHub OS | Tagline: Your Business, One Hub.
-- Description: Tenant-isolated session tracking, heartbeat monitoring, and audit trails
-- ==============================================================================

-- 1. USER SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    session_started_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    session_ended_at TIMESTAMPTZ,
    end_reason TEXT CHECK (end_reason IN ('logout', 'expired', 'inactive', 'session_replaced', 'unknown')),
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Indexes for lightning-fast queries and active user lookups
CREATE INDEX IF NOT EXISTS idx_user_sessions_business_id ON public.user_sessions(business_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_seen ON public.user_sessions(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_started_at ON public.user_sessions(session_started_at DESC);

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS: Owner & Admin can view all sessions in their business. Users can view their own sessions.
CREATE POLICY "user_sessions_select_policy"
ON public.user_sessions
FOR SELECT
USING (
    public.is_business_member(business_id) AND (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.business_members bm
            WHERE bm.business_id = user_sessions.business_id
              AND bm.user_id = auth.uid()
              AND bm.role IN ('Owner', 'Admin')
        )
    )
);

CREATE POLICY "user_sessions_insert_policy"
ON public.user_sessions
FOR INSERT
WITH CHECK (
    public.is_business_member(business_id) AND auth.uid() = user_id
);

CREATE POLICY "user_sessions_update_policy"
ON public.user_sessions
FOR UPDATE
USING (
    public.is_business_member(business_id) AND auth.uid() = user_id
)
WITH CHECK (
    public.is_business_member(business_id) AND auth.uid() = user_id
);

-- 2. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    module TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('delete', 'archive', 'cancel', 'deactivate', 'soft_delete', 'restore')),
    record_id TEXT NOT NULL,
    record_title TEXT,
    reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_business_id ON public.audit_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON public.audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_select_policy"
ON public.audit_logs
FOR SELECT
USING (
    public.is_business_member(business_id) AND
    EXISTS (
        SELECT 1 FROM public.business_members bm
        WHERE bm.business_id = audit_logs.business_id
          AND bm.user_id = auth.uid()
          AND bm.role IN ('Owner', 'Admin')
    )
);

CREATE POLICY "audit_logs_insert_policy"
ON public.audit_logs
FOR INSERT
WITH CHECK (
    public.is_business_member(business_id) AND auth.uid() = user_id
);
