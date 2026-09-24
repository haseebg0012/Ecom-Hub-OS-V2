-- ==============================================================================
-- EcomHub OS — Phase 3D Migration: Recurring Transactions & Automation Engine
-- ==============================================================================

-- 1. recurring_transactions table
CREATE TABLE IF NOT EXISTS public.recurring_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense', 'investment')),
  category_id UUID REFERENCES public.financial_categories(id) ON DELETE SET NULL,
  account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'PKR',
  exchange_rate NUMERIC(15, 6) DEFAULT 1.0,
  base_currency TEXT NOT NULL DEFAULT 'PKR',
  base_amount NUMERIC(15, 2) NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE,
  next_run_date DATE NOT NULL,
  payment_method TEXT DEFAULT 'Bank Transfer',
  reference TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Paused', 'Completed')),
  last_run_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT valid_date_range CHECK (end_date IS NULL OR end_date >= start_date)
);

-- 2. recurring_transaction_runs table (Idempotency and execution tracking)
CREATE TABLE IF NOT EXISTS public.recurring_transaction_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  recurring_transaction_id UUID NOT NULL REFERENCES public.recurring_transactions(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  transaction_id UUID REFERENCES public.financial_transactions(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  -- STRICT IDEMPOTENCY: Exactly one execution attempt record per scheduled date
  CONSTRAINT uq_recurring_scheduled_run UNIQUE (recurring_transaction_id, scheduled_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rec_tx_business ON public.recurring_transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_rec_tx_active_next ON public.recurring_transactions(business_id, is_active, next_run_date);
CREATE INDEX IF NOT EXISTS idx_rec_tx_type ON public.recurring_transactions(business_id, transaction_type);
CREATE INDEX IF NOT EXISTS idx_rec_tx_account ON public.recurring_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_rec_tx_category ON public.recurring_transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_rec_tx_client ON public.recurring_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_rec_runs_business ON public.recurring_transaction_runs(business_id);
CREATE INDEX IF NOT EXISTS idx_rec_runs_lookup ON public.recurring_transaction_runs(recurring_transaction_id, scheduled_date);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_transaction_runs ENABLE ROW LEVEL SECURITY;

-- Policy 1: Members can view recurring transactions for their business
CREATE POLICY "Members can view recurring transactions"
  ON public.recurring_transactions
  FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM public.business_members
      WHERE user_id = auth.uid()
    )
  );

-- Policy 2: Authorized finance staff can insert recurring transactions
CREATE POLICY "Finance staff can create recurring transactions"
  ON public.recurring_transactions
  FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT bm.business_id FROM public.business_members bm
      WHERE bm.user_id = auth.uid()
      AND bm.role IN ('Owner', 'Admin', 'Finance')
    )
  );

-- Policy 3: Authorized finance staff can update recurring transactions
CREATE POLICY "Finance staff can update recurring transactions"
  ON public.recurring_transactions
  FOR UPDATE
  USING (
    business_id IN (
      SELECT bm.business_id FROM public.business_members bm
      WHERE bm.user_id = auth.uid()
      AND bm.role IN ('Owner', 'Admin', 'Finance')
    )
  );

-- Policy 4: Runs table visibility
CREATE POLICY "Members can view recurring transaction runs"
  ON public.recurring_transaction_runs
  FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM public.business_members
      WHERE user_id = auth.uid()
    )
  );

-- Policy 5: System / Finance can insert runs
CREATE POLICY "Finance staff can record recurring runs"
  ON public.recurring_transaction_runs
  FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT bm.business_id FROM public.business_members bm
      WHERE bm.user_id = auth.uid()
      AND bm.role IN ('Owner', 'Admin', 'Finance')
    )
  );
