-- ==============================================================================
-- EcomHub OS — Phase 3 Finance, Invoices, Payments, Expenses & Accounting Migration
-- Description: Financial Accounts, Categories, Transactions, Invoices, Invoice Items,
--              Payments, Expenses, Income, Investments, Recurring Transactions,
--              and Business Finance Settings with strict multi-tenant Row Level Security (RLS).
-- Brand: EcomHub | Product: EcomHub OS | Tagline: Your Business, One Hub.
-- ==============================================================================

-- 1. Financial Accounts Table
CREATE TABLE IF NOT EXISTS public.financial_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Cash', 'Bank', 'Digital Wallet', 'Payment Gateway', 'Other')),
    currency TEXT NOT NULL DEFAULT 'PKR' CHECK (currency IN ('PKR', 'USD')),
    opening_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    current_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Financial Categories Table
CREATE TABLE IF NOT EXISTS public.financial_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Income', 'Expense', 'Investment')),
    color TEXT DEFAULT '#4F46E5',
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Business Finance Settings Table
CREATE TABLE IF NOT EXISTS public.business_finance_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
    base_currency TEXT NOT NULL DEFAULT 'PKR' CHECK (base_currency IN ('PKR', 'USD')),
    default_invoice_currency TEXT NOT NULL DEFAULT 'USD' CHECK (default_invoice_currency IN ('PKR', 'USD')),
    default_payment_terms TEXT NOT NULL DEFAULT 'Net 15',
    default_tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    invoice_prefix TEXT NOT NULL DEFAULT 'INV-',
    next_invoice_number INTEGER NOT NULL DEFAULT 1,
    payment_prefix TEXT NOT NULL DEFAULT 'PAY-',
    next_payment_number INTEGER NOT NULL DEFAULT 1,
    default_account_id UUID REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
    financial_year_start TEXT NOT NULL DEFAULT '07-01', -- July 1 fiscal year common in PK / international
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    invoice_number TEXT NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled')),
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    tax NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    balance_due NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'PKR')),
    exchange_rate NUMERIC(12, 4) NOT NULL DEFAULT 1.0000,
    base_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    base_currency TEXT NOT NULL DEFAULT 'PKR' CHECK (base_currency IN ('USD', 'PKR')),
    notes TEXT,
    terms TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_invoice_number_per_business UNIQUE (business_id, invoice_number)
);

-- 5. Invoice Line Items Table
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
    unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
    account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
    payment_number TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'PKR')),
    exchange_rate NUMERIC(12, 4) NOT NULL DEFAULT 1.0000,
    base_amount NUMERIC(15, 2) NOT NULL,
    base_currency TEXT NOT NULL DEFAULT 'PKR' CHECK (base_currency IN ('USD', 'PKR')),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'Bank Transfer', 'Card', 'Online Payment', 'Other')),
    reference TEXT,
    status TEXT NOT NULL DEFAULT 'Completed' CHECK (status IN ('Completed', 'Pending', 'Failed', 'Refunded')),
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_payment_number_per_business UNIQUE (business_id, payment_number)
);

-- 7. Transactions (Central Ledger)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense', 'investment', 'refund', 'transfer')),
    description TEXT NOT NULL,
    reference TEXT,
    category_id UUID REFERENCES public.financial_categories(id) ON DELETE SET NULL,
    account_id UUID REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    amount NUMERIC(15, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'PKR' CHECK (currency IN ('USD', 'PKR')),
    exchange_rate NUMERIC(12, 4) NOT NULL DEFAULT 1.0000,
    base_amount NUMERIC(15, 2) NOT NULL,
    base_currency TEXT NOT NULL DEFAULT 'PKR' CHECK (base_currency IN ('USD', 'PKR')),
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT NOT NULL DEFAULT 'Bank Transfer',
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
    notes TEXT,
    attachment_url TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 8. Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.financial_categories(id) ON DELETE SET NULL,
    account_id UUID REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'PKR' CHECK (currency IN ('USD', 'PKR')),
    exchange_rate NUMERIC(12, 4) NOT NULL DEFAULT 1.0000,
    base_amount NUMERIC(15, 2) NOT NULL,
    base_currency TEXT NOT NULL DEFAULT 'PKR' CHECK (base_currency IN ('USD', 'PKR')),
    vendor TEXT NOT NULL,
    description TEXT NOT NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT NOT NULL DEFAULT 'Bank Transfer',
    reference TEXT,
    notes TEXT,
    attachment_url TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 9. Income Records Table (Direct Non-Invoice Income)
CREATE TABLE IF NOT EXISTS public.income_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    category_id UUID REFERENCES public.financial_categories(id) ON DELETE SET NULL,
    account_id UUID REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'PKR' CHECK (currency IN ('USD', 'PKR')),
    exchange_rate NUMERIC(12, 4) NOT NULL DEFAULT 1.0000,
    base_amount NUMERIC(15, 2) NOT NULL,
    base_currency TEXT NOT NULL DEFAULT 'PKR' CHECK (base_currency IN ('USD', 'PKR')),
    source TEXT NOT NULL,
    income_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT NOT NULL DEFAULT 'Bank Transfer',
    reference TEXT,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 10. Investments Table
CREATE TABLE IF NOT EXISTS public.investments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.financial_categories(id) ON DELETE SET NULL,
    account_id UUID REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'PKR' CHECK (currency IN ('USD', 'PKR')),
    exchange_rate NUMERIC(12, 4) NOT NULL DEFAULT 1.0000,
    base_amount NUMERIC(15, 2) NOT NULL,
    base_currency TEXT NOT NULL DEFAULT 'PKR' CHECK (base_currency IN ('USD', 'PKR')),
    investment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_return TEXT,
    notes TEXT,
    attachment_url TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 11. Recurring Transactions Table
CREATE TABLE IF NOT EXISTS public.recurring_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    description TEXT NOT NULL,
    category_id UUID REFERENCES public.financial_categories(id) ON DELETE SET NULL,
    account_id UUID REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
    amount NUMERIC(15, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'PKR' CHECK (currency IN ('USD', 'PKR')),
    frequency TEXT NOT NULL CHECK (frequency IN ('Weekly', 'Monthly', 'Quarterly', 'Yearly')),
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    next_run_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_fin_accounts_biz ON public.financial_accounts(business_id);
CREATE INDEX IF NOT EXISTS idx_fin_categories_biz ON public.financial_categories(business_id, type);
CREATE INDEX IF NOT EXISTS idx_invoices_biz_client ON public.invoices(business_id, client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status_dates ON public.invoices(business_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_biz_invoice ON public.payments(business_id, invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_client ON public.payments(client_id);
CREATE INDEX IF NOT EXISTS idx_transactions_biz_date ON public.transactions(business_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(business_id, transaction_type);
CREATE INDEX IF NOT EXISTS idx_expenses_biz_date ON public.expenses(business_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_income_biz_date ON public.income_records(business_id, income_date DESC);
CREATE INDEX IF NOT EXISTS idx_investments_biz_date ON public.investments(business_id, investment_date DESC);
CREATE INDEX IF NOT EXISTS idx_recurring_biz ON public.recurring_transactions(business_id, is_active);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Multi-Tenant Data Isolation by business_members(user_id, business_id)
-- ==============================================================================

ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_finance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;

-- Helper policy definition macro for all tables
-- financial_accounts
CREATE POLICY "Users can access financial_accounts for their businesses"
    ON public.financial_accounts FOR ALL
    USING (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm WHERE bm.user_id = auth.uid()
        )
    )
    WITH CHECK (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm WHERE bm.user_id = auth.uid()
        )
    );

-- financial_categories
CREATE POLICY "Users can access financial_categories for their businesses"
    ON public.financial_categories FOR ALL
    USING (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm WHERE bm.user_id = auth.uid()
        )
    )
    WITH CHECK (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm WHERE bm.user_id = auth.uid()
        )
    );

-- business_finance_settings
CREATE POLICY "Users can access business_finance_settings for their businesses"
    ON public.business_finance_settings FOR ALL
    USING (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm WHERE bm.user_id = auth.uid()
        )
    )
    WITH CHECK (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm WHERE bm.user_id = auth.uid()
        )
    );

-- invoices
CREATE POLICY "Users can access invoices for their businesses"
    ON public.invoices FOR ALL
    USING (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm WHERE bm.user_id = auth.uid()
        )
    )
    WITH CHECK (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm WHERE bm.user_id = auth.uid()
        )
    );

-- invoice_items
CREATE POLICY "Users can access invoice_items for their businesses"
    ON public.invoice_items FOR ALL
    USING (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm WHERE bm.user_id = auth.uid()
        )
    )
    WITH CHECK (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm WHERE bm.user_id = auth.uid()
        )
    );

-- payments
CREATE POLICY "Users can access payments for their businesses"
    ON public.payments FOR ALL
    USING (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm WHERE bm.user_id = auth.uid()
        )
    )
    WITH CHECK (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm WHERE bm.user_id = auth.uid()
        )
    );

-- transactions
CREATE POLICY "Users can access transactions for their businesses"
    ON public.transactions FOR ALL
    USING (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm WHERE bm.user_id = auth.uid()
        )
    )
    WITH CHECK (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm WHERE bm.user_id = auth.uid()
        )
    );

-- expenses
CREATE POLICY "Users can access expenses for their businesses"
    ON public.expenses FOR ALL
    USING (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm WHERE bm.user_id = auth.uid()
        )
    )
    WITH CHECK (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm WHERE bm.user_id = auth.uid()
        )
    );

-- income_records
CREATE POLICY "Users can access income_records for their businesses"
    ON public.income_records FOR ALL
    USING (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm WHERE bm.user_id = auth.uid()
        )
    )
    WITH CHECK (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm WHERE bm.user_id = auth.uid()
        )
    );

-- investments
CREATE POLICY "Users can access investments for their businesses"
    ON public.investments FOR ALL
    USING (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm WHERE bm.user_id = auth.uid()
        )
    )
    WITH CHECK (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm WHERE bm.user_id = auth.uid()
        )
    );

-- recurring_transactions
CREATE POLICY "Users can access recurring_transactions for their businesses"
    ON public.recurring_transactions FOR ALL
    USING (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm WHERE bm.user_id = auth.uid()
        )
    )
    WITH CHECK (
        business_id IN (
            SELECT bm.business_id FROM public.business_members bm WHERE bm.user_id = auth.uid()
        )
    );
