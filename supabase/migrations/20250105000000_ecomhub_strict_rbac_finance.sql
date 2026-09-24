-- ==============================================================================
-- EcomHub OS — Phase 3A: Strict Role-Based Access Control (RBAC) on Finance Tables
-- Enforces 4th Layer Security directly at the Database Row Level Security (RLS) engine
-- Brand: EcomHub | Product: EcomHub OS | Tagline: Your Business, One Hub.
-- ==============================================================================

-- Drop permissive or previous policies on financial tables
DROP POLICY IF EXISTS "Users can access financial_accounts for their businesses" ON public.financial_accounts;
DROP POLICY IF EXISTS "Users can access financial_categories for their businesses" ON public.financial_categories;
DROP POLICY IF EXISTS "Users can access business_finance_settings for their businesses" ON public.business_finance_settings;
DROP POLICY IF EXISTS "Users can access transactions for their businesses" ON public.transactions;
DROP POLICY IF EXISTS "Users can access expenses for their businesses" ON public.expenses;
DROP POLICY IF EXISTS "Users can access income_records for their businesses" ON public.income_records;
DROP POLICY IF EXISTS "Users can access investments for their businesses" ON public.investments;
DROP POLICY IF EXISTS "Users can access recurring_transactions for their businesses" ON public.recurring_transactions;

-- Ensure RLS is active
ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_finance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- Helper Function: Check User's Role in Business
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_user_business_role(p_business_id UUID, p_user_id UUID)
RETURNS TEXT AS $$
    SELECT role FROM public.business_members
    WHERE business_id = p_business_id AND user_id = p_user_id
    LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ==============================================================================
-- 1. FINANCIAL ACCOUNTS POLICIES
-- ==============================================================================
CREATE POLICY "financial_accounts_select_policy"
    ON public.financial_accounts FOR SELECT
    USING (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm
            WHERE bm.user_id = auth.uid()
              AND bm.role IN ('Owner', 'Admin', 'Finance', 'Manager', 'Viewer')
        )
    );

CREATE POLICY "financial_accounts_insert_policy"
    ON public.financial_accounts FOR INSERT
    WITH CHECK (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm
            WHERE bm.user_id = auth.uid()
              AND bm.role IN ('Owner', 'Admin', 'Finance')
        )
    );

CREATE POLICY "financial_accounts_update_policy"
    ON public.financial_accounts FOR UPDATE
    USING (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm
            WHERE bm.user_id = auth.uid()
              AND bm.role IN ('Owner', 'Admin', 'Finance')
        )
    )
    WITH CHECK (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm
            WHERE bm.user_id = auth.uid()
              AND bm.role IN ('Owner', 'Admin', 'Finance')
        )
    );

CREATE POLICY "financial_accounts_delete_policy"
    ON public.financial_accounts FOR DELETE
    USING (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm
            WHERE bm.user_id = auth.uid()
              AND bm.role IN ('Owner', 'Admin')
        )
    );

-- ==============================================================================
-- 2. FINANCIAL CATEGORIES POLICIES
-- ==============================================================================
CREATE POLICY "financial_categories_select_policy"
    ON public.financial_categories FOR SELECT
    USING (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm
            WHERE bm.user_id = auth.uid()
              AND bm.role IN ('Owner', 'Admin', 'Finance', 'Manager', 'Viewer')
        )
    );

CREATE POLICY "financial_categories_insert_policy"
    ON public.financial_categories FOR INSERT
    WITH CHECK (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm
            WHERE bm.user_id = auth.uid()
              AND bm.role IN ('Owner', 'Admin', 'Finance')
        )
    );

CREATE POLICY "financial_categories_update_policy"
    ON public.financial_categories FOR UPDATE
    USING (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm
            WHERE bm.user_id = auth.uid()
              AND bm.role IN ('Owner', 'Admin', 'Finance')
        )
    )
    WITH CHECK (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm
            WHERE bm.user_id = auth.uid()
              AND bm.role IN ('Owner', 'Admin', 'Finance')
        )
    );

CREATE POLICY "financial_categories_delete_policy"
    ON public.financial_categories FOR DELETE
    USING (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm
            WHERE bm.user_id = auth.uid()
              AND bm.role IN ('Owner', 'Admin')
        )
    );

-- ==============================================================================
-- 3. TRANSACTIONS (CENTRAL LEDGER) POLICIES
-- ==============================================================================
CREATE POLICY "transactions_select_policy"
    ON public.transactions FOR SELECT
    USING (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm
            WHERE bm.user_id = auth.uid()
              AND bm.role IN ('Owner', 'Admin', 'Finance', 'Manager', 'Viewer')
        )
    );

CREATE POLICY "transactions_insert_policy"
    ON public.transactions FOR INSERT
    WITH CHECK (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm
            WHERE bm.user_id = auth.uid()
              AND bm.role IN ('Owner', 'Admin', 'Finance')
        )
    );

CREATE POLICY "transactions_update_policy"
    ON public.transactions FOR UPDATE
    USING (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm
            WHERE bm.user_id = auth.uid()
              AND bm.role IN ('Owner', 'Admin', 'Finance')
        )
    )
    WITH CHECK (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm
            WHERE bm.user_id = auth.uid()
              AND bm.role IN ('Owner', 'Admin', 'Finance')
        )
    );

CREATE POLICY "transactions_delete_policy"
    ON public.transactions FOR DELETE
    USING (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm
            WHERE bm.user_id = auth.uid()
              AND bm.role IN ('Owner', 'Admin')
        )
    );

-- ==============================================================================
-- 4. EXPENSES POLICIES
-- ==============================================================================
CREATE POLICY "expenses_select_policy"
    ON public.expenses FOR SELECT
    USING (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm
            WHERE bm.user_id = auth.uid()
              AND bm.role IN ('Owner', 'Admin', 'Finance', 'Manager', 'Viewer')
        )
    );

CREATE POLICY "expenses_insert_policy"
    ON public.expenses FOR INSERT
    WITH CHECK (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm
            WHERE bm.user_id = auth.uid()
              AND bm.role IN ('Owner', 'Admin', 'Finance')
        )
    );

CREATE POLICY "expenses_update_policy"
    ON public.expenses FOR UPDATE
    USING (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm
            WHERE bm.user_id = auth.uid()
              AND bm.role IN ('Owner', 'Admin', 'Finance')
        )
    )
    WITH CHECK (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm
            WHERE bm.user_id = auth.uid()
              AND bm.role IN ('Owner', 'Admin', 'Finance')
        )
    );

CREATE POLICY "expenses_delete_policy"
    ON public.expenses FOR DELETE
    USING (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm
            WHERE bm.user_id = auth.uid()
              AND bm.role IN ('Owner', 'Admin')
        )
    );

-- ==============================================================================
-- 5. INCOME RECORDS POLICIES
-- ==============================================================================
CREATE POLICY "income_records_select_policy"
    ON public.income_records FOR SELECT
    USING (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm
            WHERE bm.user_id = auth.uid()
              AND bm.role IN ('Owner', 'Admin', 'Finance', 'Manager', 'Viewer')
        )
    );

CREATE POLICY "income_records_insert_policy"
    ON public.income_records FOR INSERT
    WITH CHECK (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm
            WHERE bm.user_id = auth.uid()
              AND bm.role IN ('Owner', 'Admin', 'Finance')
        )
    );

CREATE POLICY "income_records_update_policy"
    ON public.income_records FOR UPDATE
    USING (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm
            WHERE bm.user_id = auth.uid()
              AND bm.role IN ('Owner', 'Admin', 'Finance')
        )
    )
    WITH CHECK (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm
            WHERE bm.user_id = auth.uid()
              AND bm.role IN ('Owner', 'Admin', 'Finance')
        )
    );

CREATE POLICY "income_records_delete_policy"
    ON public.income_records FOR DELETE
    USING (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm
            WHERE bm.user_id = auth.uid()
              AND bm.role IN ('Owner', 'Admin')
        )
    );

-- ==============================================================================
-- 6. BUSINESS FINANCE SETTINGS POLICIES
-- ==============================================================================
CREATE POLICY "business_finance_settings_select_policy"
    ON public.business_finance_settings FOR SELECT
    USING (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm
            WHERE bm.user_id = auth.uid()
              AND bm.role IN ('Owner', 'Admin', 'Finance', 'Manager', 'Viewer')
        )
    );

CREATE POLICY "business_finance_settings_modify_policy"
    ON public.business_finance_settings FOR ALL
    USING (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm
            WHERE bm.user_id = auth.uid()
              AND bm.role IN ('Owner', 'Admin', 'Finance')
        )
    );
