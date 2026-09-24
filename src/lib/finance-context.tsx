import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  FinancialAccount,
  FinancialCategory,
  BusinessFinanceSettings,
  Invoice,
  InvoiceItem,
  Payment,
  Transaction,
  Expense,
  IncomeRecord,
  Investment,
  RecurringTransaction,
  RecurringTransactionRun,
  FinancialMetrics,
  FinanceDateRange,
  PaymentMethod,
  InvoiceStatus,
  TransactionType,
  PaymentStatus,
  TransactionStatus,
} from '../types/finance';
import {
  calculateProfitAndLoss,
  generateProfitLossCSV,
  ProfitAndLossReport,
  ReportDatePreset,
} from './financial-reports-service';
import { useAuth } from './auth-context';
import { useCrm } from './crm-context';
import { getSupabaseClient } from './supabase';
import {
  calculateNextRunDate,
  hasRunAlreadyExecuted,
  normalizeFrequency,
} from './recurring-engine';

interface FinanceContextType {
  // Data State
  accounts: FinancialAccount[];
  categories: FinancialCategory[];
  financeSettings: BusinessFinanceSettings | null;
  invoices: Invoice[];
  invoiceItems: InvoiceItem[];
  payments: Payment[];
  transactions: Transaction[];
  expenses: Expense[];
  incomeRecords: IncomeRecord[];
  investments: Investment[];
  recurringTransactions: RecurringTransaction[];
  recurringRuns: RecurringTransactionRun[];
  isLoading: boolean;

  // Filter & Date Range
  dateRange: FinanceDateRange;
  setDateRange: (range: FinanceDateRange) => void;
  customStartDate: string;
  setCustomStartDate: (date: string) => void;
  customEndDate: string;
  setCustomEndDate: (date: string) => void;

  // Filtered lists by selected period
  filteredTransactions: Transaction[];
  filteredInvoices: Invoice[];
  filteredExpenses: Expense[];
  filteredIncomeRecords: IncomeRecord[];
  filteredInvestments: Investment[];
  filteredPayments: Payment[];

  // Metrics
  metrics: FinancialMetrics;

  // Invoices
  createInvoice: (
    data: {
      client_id: string;
      issue_date: string;
      due_date: string;
      currency: string;
      tax?: number;
      discount?: number;
      notes?: string;
      terms?: string;
    },
    items: Array<{ description: string; quantity: number; unit_price: number }>
  ) => Promise<{ success: boolean; invoice?: Invoice; error?: string }>;
  updateInvoice: (
    invoiceId: string,
    updates: Partial<Invoice>,
    items?: Array<{ description: string; quantity: number; unit_price: number }>
  ) => Promise<{ success: boolean; error?: string }>;
  updateInvoiceStatus: (invoiceId: string, status: InvoiceStatus) => Promise<{ success: boolean; error?: string }>;
  cancelInvoice: (invoiceId: string) => Promise<{ success: boolean; error?: string }>;
  deleteInvoice: (invoiceId: string) => Promise<{ success: boolean; error?: string }>;

  // Payments
  recordPayment: (data: {
    invoiceId?: string | null;
    clientId: string;
    accountId: string;
    amount: number;
    currency: string;
    paymentMethod: PaymentMethod;
    paymentDate?: string;
    reference?: string;
    notes?: string;
  }) => Promise<{ success: boolean; payment?: Payment; error?: string }>;
  cancelPayment: (paymentId: string, reason?: string) => Promise<{ success: boolean; error?: string }>;

  // Expenses
  addExpense: (data: {
    categoryId: string;
    accountId: string;
    amount: number;
    currency: string;
    vendor: string;
    description: string;
    expenseDate?: string;
    paymentMethod: PaymentMethod;
    reference?: string;
    notes?: string;
    attachmentUrl?: string;
  }) => Promise<{ success: boolean; expense?: Expense; error?: string }>;
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<{ success: boolean; error?: string }>;
  deleteExpense: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Income
  addIncome: (data: {
    clientId?: string | null;
    categoryId: string;
    accountId: string;
    amount: number;
    currency: string;
    source: string;
    incomeDate?: string;
    paymentMethod: PaymentMethod;
    reference?: string;
    notes?: string;
  }) => Promise<{ success: boolean; income?: IncomeRecord; error?: string }>;

  // Investments
  addInvestment: (data: {
    categoryId?: string;
    accountId: string;
    name: string;
    amount: number;
    currency: string;
    investmentDate?: string;
    expectedReturn?: string;
    notes?: string;
    attachmentUrl?: string;
  }) => Promise<{ success: boolean; investment?: Investment; error?: string }>;

  // Accounts
  addAccount: (data: Omit<FinancialAccount, 'id' | 'business_id' | 'created_at' | 'updated_at'>) => Promise<{ success: boolean; account?: FinancialAccount; error?: string }>;
  updateAccount: (id: string, updates: Partial<FinancialAccount>) => Promise<{ success: boolean; error?: string }>;
  toggleAccountActive: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Categories
  addCategory: (data: Omit<FinancialCategory, 'id' | 'business_id' | 'created_at' | 'updated_at'>) => Promise<{ success: boolean; category?: FinancialCategory; error?: string }>;
  updateCategory: (id: string, updates: Partial<FinancialCategory>) => Promise<{ success: boolean; error?: string }>;
  archiveCategory: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Recurring
  addRecurringTransaction: (data: Omit<RecurringTransaction, 'id' | 'business_id' | 'created_at' | 'updated_at'>) => Promise<{ success: boolean; recurring?: RecurringTransaction; error?: string }>;
  updateRecurringTransaction: (id: string, updates: Partial<RecurringTransaction>) => Promise<{ success: boolean; error?: string }>;
  pauseRecurringTransaction: (id: string) => Promise<{ success: boolean; error?: string }>;
  resumeRecurringTransaction: (id: string) => Promise<{ success: boolean; error?: string }>;
  toggleRecurringActive: (id: string) => Promise<{ success: boolean; error?: string }>;
  deleteRecurringTransaction: (id: string) => Promise<{ success: boolean; error?: string }>;
  runRecurringTransactionNow: (id: string) => Promise<{ success: boolean; transaction?: Transaction; run?: RecurringTransactionRun; error?: string }>;
  processDueRecurringTransactions: () => Promise<{ success: boolean; processed: number; successful: number; failed: number; error?: string }>;

  // Settings
  updateFinanceSettings: (updates: Partial<BusinessFinanceSettings>) => Promise<{ success: boolean; error?: string }>;

  // Reports & Analytics
  getProfitAndLossReport: (preset?: FinanceDateRange, customStart?: string, customEnd?: string) => ProfitAndLossReport;

  // Exports
  exportTransactionsCSV: () => void;
  exportInvoicesCSV: () => void;
  exportPaymentsCSV: () => void;
  exportReceivablesCSV: () => void;
  exportExpensesCSV: () => void;
  exportPLCSV: (overrideReport?: ProfitAndLossReport) => void;
  exportFinancialReport: (type: 'payments' | 'invoices' | 'transactions' | 'receivables' | 'expenses') => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

// Local Storage Keys
const LS_ACCOUNTS_KEY = 'ecomhub_fin_accounts';
const LS_CATEGORIES_KEY = 'ecomhub_fin_categories';
const LS_SETTINGS_KEY = 'ecomhub_fin_settings';
const LS_INVOICES_KEY = 'ecomhub_fin_invoices';
const LS_INVOICE_ITEMS_KEY = 'ecomhub_fin_invoice_items';
const LS_PAYMENTS_KEY = 'ecomhub_fin_payments';
const LS_TRANSACTIONS_KEY = 'ecomhub_fin_transactions';
const LS_EXPENSES_KEY = 'ecomhub_fin_expenses';
const LS_INCOME_KEY = 'ecomhub_fin_income';
const LS_INVESTMENTS_KEY = 'ecomhub_fin_investments';
const LS_RECURRING_KEY = 'ecomhub_fin_recurring';
const LS_RECURRING_RUNS_KEY = 'ecomhub_fin_recurring_runs';

// Helpers
const getTodayDate = () => new Date().toISOString().split('T')[0];
const getDateNDaysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().split('T')[0];
const getDateNDaysFromNow = (n: number) => new Date(Date.now() + n * 86400000).toISOString().split('T')[0];

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, activeBusiness, isSupabaseConnected } = useAuth();
  const { getExchangeRate, clients, updateClient, addNotification } = useCrm();

  const businessId = activeBusiness?.id || 'biz-ecometrix-001';
  const baseCurrency = activeBusiness?.default_currency || 'PKR';

  // Filters
  const [dateRange, setDateRange] = useState<FinanceDateRange>('this_month');
  const [customStartDate, setCustomStartDate] = useState<string>(getDateNDaysAgo(30));
  const [customEndDate, setCustomEndDate] = useState<string>(getTodayDate());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Entities
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [financeSettings, setFinanceSettings] = useState<BusinessFinanceSettings | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [recurringRuns, setRecurringRuns] = useState<RecurringTransactionRun[]>([]);

  // Seed default demo financial data for workspace if empty
  const getInitialDemoAccounts = (bizId: string): FinancialAccount[] => [
    {
      id: `acc-${bizId}-001`,
      business_id: bizId,
      name: 'Meezan Bank - Corporate PKR',
      type: 'Bank',
      currency: 'PKR',
      opening_balance: 1500000,
      current_balance: 2450000,
      description: 'Primary corporate operational checking account for local payroll and vendor payments.',
      is_active: true,
      created_at: new Date(Date.now() - 86400000 * 90).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: `acc-${bizId}-002`,
      business_id: bizId,
      name: 'Standard Chartered - USD Inward',
      type: 'Bank',
      currency: 'USD',
      opening_balance: 25000,
      current_balance: 38450,
      description: 'Foreign currency account receiving overseas client retainer wire transfers.',
      is_active: true,
      created_at: new Date(Date.now() - 86400000 * 90).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: `acc-${bizId}-003`,
      business_id: bizId,
      name: 'Wise Business Global Multi-Currency',
      type: 'Digital Wallet',
      currency: 'USD',
      opening_balance: 8000,
      current_balance: 12150,
      description: 'Used for paying global SaaS tools (Shopify, Figma, AWS, Vercel) and contractor disbursements.',
      is_active: true,
      created_at: new Date(Date.now() - 86400000 * 90).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: `acc-${bizId}-004`,
      business_id: bizId,
      name: 'Office Petty Cash Vault',
      type: 'Cash',
      currency: 'PKR',
      opening_balance: 100000,
      current_balance: 65000,
      description: 'Daily office supplies, refreshments, courier delivery charges, and local errands.',
      is_active: true,
      created_at: new Date(Date.now() - 86400000 * 90).toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const getInitialDemoCategories = (bizId: string): FinancialCategory[] => [
    // Income
    { id: `cat-${bizId}-001`, business_id: bizId, name: 'Client Payment', type: 'Income', color: '#10B981', is_default: true, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: `cat-${bizId}-002`, business_id: bizId, name: 'Service Retainer', type: 'Income', color: '#059669', is_default: true, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: `cat-${bizId}-003`, business_id: bizId, name: 'Consulting & Architecture', type: 'Income', color: '#34D399', is_default: true, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: `cat-${bizId}-004`, business_id: bizId, name: 'Other Income', type: 'Income', color: '#6EE7B7', is_default: true, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },

    // Expense
    { id: `cat-${bizId}-005`, business_id: bizId, name: 'Software & Subscriptions', type: 'Expense', color: '#6366F1', is_default: true, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: `cat-${bizId}-006`, business_id: bizId, name: 'Cloud Hosting & Servers', type: 'Expense', color: '#8B5CF6', is_default: true, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: `cat-${bizId}-007`, business_id: bizId, name: 'Salaries & Payroll', type: 'Expense', color: '#EF4444', is_default: true, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: `cat-${bizId}-008`, business_id: bizId, name: 'Freelancers & Contractors', type: 'Expense', color: '#F97316', is_default: true, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: `cat-${bizId}-009`, business_id: bizId, name: 'Office Rent & Facilities', type: 'Expense', color: '#EC4899', is_default: true, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: `cat-${bizId}-010`, business_id: bizId, name: 'Internet & Communications', type: 'Expense', color: '#3B82F6', is_default: true, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: `cat-${bizId}-011`, business_id: bizId, name: 'Advertising & Marketing', type: 'Expense', color: '#F59E0B', is_default: true, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: `cat-${bizId}-012`, business_id: bizId, name: 'Equipment & Maintenance', type: 'Expense', color: '#64748B', is_default: true, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: `cat-${bizId}-013`, business_id: bizId, name: 'Taxes & Compliance', type: 'Expense', color: '#94A3B8', is_default: true, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: `cat-${bizId}-014`, business_id: bizId, name: 'Utilities & Power', type: 'Expense', color: '#A855F7', is_default: true, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },

    // Investment
    { id: `cat-${bizId}-015`, business_id: bizId, name: 'Hardware & Workstations', type: 'Investment', color: '#0EA5E9', is_default: true, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: `cat-${bizId}-016`, business_id: bizId, name: 'Studio & Video Equipment', type: 'Investment', color: '#14B8A6', is_default: true, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: `cat-${bizId}-017`, business_id: bizId, name: 'Strategic Marketing Capital', type: 'Investment', color: '#84CC16', is_default: true, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: `cat-${bizId}-018`, business_id: bizId, name: 'Business Expansion', type: 'Investment', color: '#EAB308', is_default: true, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ];

  const getInitialDemoSettings = (bizId: string): BusinessFinanceSettings => ({
    id: `set-${bizId}-001`,
    business_id: bizId,
    base_currency: 'PKR',
    default_invoice_currency: 'USD',
    default_payment_terms: 'Net 15',
    default_tax_rate: 5,
    invoice_prefix: 'INV-',
    next_invoice_number: 4,
    payment_prefix: 'PAY-',
    next_payment_number: 3,
    default_account_id: `acc-${bizId}-001`,
    financial_year_start: '07-01',
    updated_at: new Date().toISOString(),
  });

  const getInitialDemoInvoices = (bizId: string): { invoices: Invoice[]; items: InvoiceItem[] } => {
    const inv1: Invoice = {
      id: `inv-${bizId}-001`,
      business_id: bizId,
      client_id: 'client-001', // Velvet Rose Cosmetics
      invoice_number: 'INV-0001',
      issue_date: getDateNDaysAgo(25),
      due_date: getDateNDaysAgo(10),
      status: 'Paid',
      subtotal: 12000,
      tax: 0,
      discount: 0,
      total: 12000,
      paid_amount: 12000,
      balance_due: 0,
      currency: 'USD',
      exchange_rate: 280,
      base_total: 3360000,
      base_currency: 'PKR',
      notes: 'Monthly Retainer Sprint 1: Headless checkout migration and GCC localized currency checkout.',
      terms: 'Payment due within 15 days of invoice date via international wire or Wise.',
      created_by: 'usr-ecometrix-001',
      created_at: new Date(Date.now() - 86400000 * 25).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 18).toISOString(),
    };

    const inv2: Invoice = {
      id: `inv-${bizId}-002`,
      business_id: bizId,
      client_id: 'client-002', // Horizon Logistics Global
      invoice_number: 'INV-0002',
      issue_date: getDateNDaysAgo(15),
      due_date: getDateNDaysAgo(1),
      status: 'Partially Paid',
      subtotal: 18000,
      tax: 0,
      discount: 1000,
      total: 17000,
      paid_amount: 10000,
      balance_due: 7000,
      currency: 'USD',
      exchange_rate: 280,
      base_total: 4760000,
      base_currency: 'PKR',
      notes: 'Supply chain shipment portal UI redesign and API microservice integration.',
      terms: 'Milestone billing: 50% upon kickoff, 50% upon staging approval.',
      created_by: 'usr-ecometrix-001',
      created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    };

    const inv3: Invoice = {
      id: `inv-${bizId}-003`,
      business_id: bizId,
      client_id: 'client-003', // Natura Botanicals
      invoice_number: 'INV-0003',
      issue_date: getDateNDaysAgo(5),
      due_date: getDateNDaysFromNow(10),
      status: 'Sent',
      subtotal: 600000,
      tax: 30000,
      discount: 0,
      total: 630000,
      paid_amount: 0,
      balance_due: 630000,
      currency: 'PKR',
      exchange_rate: 1,
      base_total: 630000,
      base_currency: 'PKR',
      notes: 'Phase 1 Shopify Plus setup, nationwide Cash-on-Delivery ERP synchronization, SMS order updates.',
      terms: 'Net 15 Days. Bank transfer to Meezan Bank Corporate Account.',
      created_by: 'usr-ecometrix-001',
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    };

    const items: InvoiceItem[] = [
      {
        id: `item-${bizId}-001`,
        business_id: bizId,
        invoice_id: inv1.id,
        description: 'Shopify Plus Custom Storefront Architecture & GCC Region Engine',
        quantity: 1,
        unit_price: 8000,
        amount: 8000,
        created_at: inv1.created_at,
      },
      {
        id: `item-${bizId}-002`,
        business_id: bizId,
        invoice_id: inv1.id,
        description: 'Multi-Currency Real-Time Exchange Rate Engine & Checkout Localizer',
        quantity: 1,
        unit_price: 4000,
        amount: 4000,
        created_at: inv1.created_at,
      },
      {
        id: `item-${bizId}-003`,
        business_id: bizId,
        invoice_id: inv2.id,
        description: 'Logistics Tracking Portal React Component Library',
        quantity: 1,
        unit_price: 12000,
        amount: 12000,
        created_at: inv2.created_at,
      },
      {
        id: `item-${bizId}-004`,
        business_id: bizId,
        invoice_id: inv2.id,
        description: 'Backend REST API Webhooks & Container Deployment on Cloud Run',
        quantity: 1,
        unit_price: 6000,
        amount: 6000,
        created_at: inv2.created_at,
      },
      {
        id: `item-${bizId}-005`,
        business_id: bizId,
        invoice_id: inv3.id,
        description: 'D2C E-Commerce Storefront Setup & Custom Urdu/English Typography',
        quantity: 1,
        unit_price: 350000,
        amount: 350000,
        created_at: inv3.created_at,
      },
      {
        id: `item-${bizId}-006`,
        business_id: bizId,
        invoice_id: inv3.id,
        description: 'Courier API Integration (TCS, Leopards, Trax) for Automated COD Dispatch',
        quantity: 1,
        unit_price: 250000,
        amount: 250000,
        created_at: inv3.created_at,
      },
    ];

    return { invoices: [inv1, inv2, inv3], items };
  };

  const getInitialDemoPayments = (bizId: string): Payment[] => [
    {
      id: `pay-${bizId}-001`,
      business_id: bizId,
      invoice_id: `inv-${bizId}-001`,
      client_id: 'client-001',
      account_id: `acc-${bizId}-002`, // Standard Chartered USD
      payment_number: 'PAY-0001',
      amount: 12000,
      currency: 'USD',
      exchange_rate: 280,
      base_amount: 3360000,
      base_currency: 'PKR',
      payment_date: getDateNDaysAgo(18),
      payment_method: 'Bank Transfer',
      reference: 'WIRE-SCB-9938210',
      status: 'Completed',
      notes: 'Full payment received for Sprint 1 headless migration.',
      created_by: 'usr-ecometrix-001',
      created_at: new Date(Date.now() - 86400000 * 18).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 18).toISOString(),
    },
    {
      id: `pay-${bizId}-002`,
      business_id: bizId,
      invoice_id: `inv-${bizId}-002`,
      client_id: 'client-002',
      account_id: `acc-${bizId}-003`, // Wise Business
      payment_number: 'PAY-0002',
      amount: 10000,
      currency: 'USD',
      exchange_rate: 280,
      base_amount: 2800000,
      base_currency: 'PKR',
      payment_date: getDateNDaysAgo(8),
      payment_method: 'Online Payment',
      reference: 'WISE-TRX-58201',
      status: 'Completed',
      notes: '50% kickoff milestone received via Wise business.',
      created_by: 'usr-ecometrix-001',
      created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 8).toISOString(),
    },
  ];

  const getInitialDemoExpenses = (bizId: string): Expense[] => [
    {
      id: `exp-${bizId}-001`,
      business_id: bizId,
      category_id: `cat-${bizId}-005`, // Software
      account_id: `acc-${bizId}-003`, // Wise USD
      transaction_id: `trx-${bizId}-exp-001`,
      amount: 250,
      currency: 'USD',
      exchange_rate: 280,
      base_amount: 70000,
      base_currency: 'PKR',
      vendor: 'Figma Enterprise',
      description: 'Monthly team seats for product design and client UX presentations.',
      expense_date: getDateNDaysAgo(20),
      payment_method: 'Card',
      reference: 'INV-FIG-2025-01',
      notes: 'Tax invoice saved in receipt repository.',
      attachment_url: null,
      created_by: 'usr-ecometrix-001',
      created_at: new Date(Date.now() - 86400000 * 20).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 20).toISOString(),
    },
    {
      id: `exp-${bizId}-002`,
      business_id: bizId,
      category_id: `cat-${bizId}-006`, // Hosting
      account_id: `acc-${bizId}-003`, // Wise USD
      transaction_id: `trx-${bizId}-exp-002`,
      amount: 450,
      currency: 'USD',
      exchange_rate: 280,
      base_amount: 126000,
      base_currency: 'PKR',
      vendor: 'Amazon Web Services (AWS)',
      description: 'Cloud production infrastructure, EC2 clusters, RDS PostgreSQL, and S3 CDN buckets.',
      expense_date: getDateNDaysAgo(12),
      payment_method: 'Card',
      reference: 'AWS-BILL-84920',
      notes: 'Tier 1 high-availability setup for client eCommerce microservices.',
      attachment_url: null,
      created_by: 'usr-ecometrix-001',
      created_at: new Date(Date.now() - 86400000 * 12).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 12).toISOString(),
    },
    {
      id: `exp-${bizId}-003`,
      business_id: bizId,
      category_id: `cat-${bizId}-007`, // Salaries
      account_id: `acc-${bizId}-001`, // Meezan PKR
      transaction_id: `trx-${bizId}-exp-003`,
      amount: 650000,
      currency: 'PKR',
      exchange_rate: 1,
      base_amount: 650000,
      base_currency: 'PKR',
      vendor: 'Core Engineering & Design Team',
      description: 'Monthly payroll disbursement for senior full-stack engineers and UI architects.',
      expense_date: getDateNDaysAgo(14),
      payment_method: 'Bank Transfer',
      reference: 'PR-2025-BATCH01',
      notes: 'Direct IBFT to team employee bank accounts.',
      attachment_url: null,
      created_by: 'usr-ecometrix-001',
      created_at: new Date(Date.now() - 86400000 * 14).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 14).toISOString(),
    },
    {
      id: `exp-${bizId}-004`,
      business_id: bizId,
      category_id: `cat-${bizId}-009`, // Office Rent
      account_id: `acc-${bizId}-001`, // Meezan PKR
      transaction_id: `trx-${bizId}-exp-004`,
      amount: 180000,
      currency: 'PKR',
      exchange_rate: 1,
      base_amount: 180000,
      base_currency: 'PKR',
      vendor: 'Gulberg Corporate Plaza',
      description: 'Monthly commercial office lease and shared facilities service charges.',
      expense_date: getDateNDaysAgo(10),
      payment_method: 'Bank Transfer',
      reference: 'RENT-LHE-FEB25',
      notes: 'Paid on schedule.',
      attachment_url: null,
      created_by: 'usr-ecometrix-001',
      created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    },
    {
      id: `exp-${bizId}-005`,
      business_id: bizId,
      category_id: `cat-${bizId}-010`, // Internet
      account_id: `acc-${bizId}-001`, // Meezan PKR
      transaction_id: `trx-${bizId}-exp-005`,
      amount: 35000,
      currency: 'PKR',
      exchange_rate: 1,
      base_amount: 35000,
      base_currency: 'PKR',
      vendor: 'Nayatel Fiber Gigabit',
      description: 'Dedicated business fiber internet 100Mbps static IP with 24/7 SLA.',
      expense_date: getDateNDaysAgo(4),
      payment_method: 'Online Payment',
      reference: 'NT-8302194',
      notes: 'Automated direct debit.',
      attachment_url: null,
      created_by: 'usr-ecometrix-001',
      created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    },
  ];

  const getInitialDemoInvestments = (bizId: string): Investment[] => [
    {
      id: `inv-cap-${bizId}-001`,
      business_id: bizId,
      category_id: `cat-${bizId}-015`, // Hardware
      account_id: `acc-${bizId}-001`, // Meezan Bank
      transaction_id: `trx-${bizId}-inv-001`,
      name: 'Apple MacBook Pro M3 Max 36GB for Lead Tech Architect',
      amount: 890000,
      currency: 'PKR',
      exchange_rate: 1,
      base_amount: 890000,
      base_currency: 'PKR',
      investment_date: getDateNDaysAgo(22),
      expected_return: 'Accelerate local Docker builds and compile times for enterprise client projects.',
      notes: 'Capital asset logged in inventory tag ECOM-HW-042.',
      attachment_url: null,
      created_by: 'usr-ecometrix-001',
      created_at: new Date(Date.now() - 86400000 * 22).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 22).toISOString(),
    },
    {
      id: `inv-cap-${bizId}-002`,
      business_id: bizId,
      category_id: `cat-${bizId}-016`, // Studio equipment
      account_id: `acc-${bizId}-003`, // Wise USD
      transaction_id: `trx-${bizId}-inv-002`,
      name: 'Sony FX3 Cinema Camera & Studio Lighting Rig for Client Product Showcases',
      amount: 3200,
      currency: 'USD',
      exchange_rate: 280,
      base_amount: 896000,
      base_currency: 'PKR',
      investment_date: getDateNDaysAgo(16),
      expected_return: 'Produce high-end 4K promotional commercial reels for e-commerce clients.',
      notes: 'Purchased from B&H Photo Video.',
      attachment_url: null,
      created_by: 'usr-ecometrix-001',
      created_at: new Date(Date.now() - 86400000 * 16).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 16).toISOString(),
    },
  ];

  const getInitialDemoTransactions = (
    bizId: string,
    payments: Payment[],
    expenses: Expense[],
    investments: Investment[]
  ): Transaction[] => {
    const list: Transaction[] = [];

    // Payments into transactions
    payments.forEach((p) => {
      list.push({
        id: `trx-${bizId}-pay-${p.id}`,
        business_id: bizId,
        transaction_type: 'income',
        description: `Client Invoice Payment (${p.payment_number})`,
        reference: p.reference || p.payment_number,
        category_id: `cat-${bizId}-001`,
        account_id: p.account_id,
        client_id: p.client_id,
        amount: p.amount,
        currency: p.currency,
        exchange_rate: p.exchange_rate,
        base_amount: p.base_amount,
        base_currency: p.base_currency,
        transaction_date: p.payment_date,
        payment_method: p.payment_method,
        status: 'completed',
        notes: p.notes,
        attachment_url: null,
        created_by: p.created_by,
        created_at: p.created_at,
        updated_at: p.updated_at,
      });
    });

    // Expenses into transactions
    expenses.forEach((e) => {
      list.push({
        id: e.transaction_id || `trx-${bizId}-exp-${e.id}`,
        business_id: bizId,
        transaction_type: 'expense',
        description: `${e.vendor}: ${e.description}`,
        reference: e.reference,
        category_id: e.category_id,
        account_id: e.account_id,
        client_id: null,
        amount: e.amount,
        currency: e.currency,
        exchange_rate: e.exchange_rate,
        base_amount: e.base_amount,
        base_currency: e.base_currency,
        transaction_date: e.expense_date,
        payment_method: e.payment_method,
        status: 'completed',
        notes: e.notes,
        attachment_url: e.attachment_url,
        created_by: e.created_by,
        created_at: e.created_at,
        updated_at: e.updated_at,
      });
    });

    // Investments into transactions
    investments.forEach((inv) => {
      list.push({
        id: inv.transaction_id || `trx-${bizId}-inv-${inv.id}`,
        business_id: bizId,
        transaction_type: 'investment',
        description: `Capital Investment: ${inv.name}`,
        reference: null,
        category_id: inv.category_id,
        account_id: inv.account_id,
        client_id: null,
        amount: inv.amount,
        currency: inv.currency,
        exchange_rate: inv.exchange_rate,
        base_amount: inv.base_amount,
        base_currency: inv.base_currency,
        transaction_date: inv.investment_date,
        payment_method: 'Bank Transfer',
        status: 'completed',
        notes: inv.notes,
        attachment_url: inv.attachment_url,
        created_by: inv.created_by,
        created_at: inv.created_at,
        updated_at: inv.updated_at,
      });
    });

    // Sort by date desc
    return list.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
  };

  const getInitialDemoRecurring = (bizId: string): RecurringTransaction[] => [
    {
      id: `rec-${bizId}-001`,
      business_id: bizId,
      name: 'Nayatel High-Speed Office Fiber Internet',
      description: 'Nayatel High-Speed Office Fiber Internet',
      transaction_type: 'expense',
      type: 'expense',
      category_id: `cat-${bizId}-010`,
      account_id: `acc-${bizId}-001`,
      client_id: null,
      amount: 35000,
      currency: 'PKR',
      exchange_rate: 1.0,
      base_currency: 'PKR',
      base_amount: 35000,
      frequency: 'Monthly',
      start_date: '2025-01-01',
      end_date: null,
      next_run_date: getDateNDaysFromNow(26),
      payment_method: 'Bank Transfer',
      reference: 'REC-NET-01',
      notes: null,
      is_active: true,
      status: 'Active',
      last_run_at: null,
      created_by: 'usr-ecometrix-001',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: `rec-${bizId}-002`,
      business_id: bizId,
      name: 'AWS Cloud Hosting & S3 Backup Cluster',
      description: 'AWS Cloud Hosting & S3 Backup Cluster',
      transaction_type: 'expense',
      type: 'expense',
      category_id: `cat-${bizId}-006`,
      account_id: `acc-${bizId}-003`,
      client_id: null,
      amount: 450,
      currency: 'USD',
      exchange_rate: 278.5,
      base_currency: 'PKR',
      base_amount: 125325,
      frequency: 'Monthly',
      start_date: '2025-01-01',
      end_date: null,
      next_run_date: getDateNDaysFromNow(18),
      payment_method: 'Card',
      reference: 'REC-AWS-01',
      notes: null,
      is_active: true,
      status: 'Active',
      last_run_at: null,
      created_by: 'usr-ecometrix-001',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: `rec-${bizId}-003`,
      business_id: bizId,
      name: 'Velvet Rose Cosmetics — E-Commerce Growth Retainer',
      description: 'Velvet Rose Cosmetics — E-Commerce Growth Retainer',
      transaction_type: 'income',
      type: 'income',
      category_id: `cat-${bizId}-002`,
      account_id: `acc-${bizId}-002`,
      client_id: null,
      amount: 12000,
      currency: 'USD',
      exchange_rate: 278.5,
      base_currency: 'PKR',
      base_amount: 3342000,
      frequency: 'Monthly',
      start_date: '2025-01-01',
      end_date: null,
      next_run_date: getDateNDaysFromNow(5),
      payment_method: 'Bank Transfer',
      reference: 'REC-RET-01',
      notes: null,
      is_active: true,
      status: 'Active',
      last_run_at: null,
      created_by: 'usr-ecometrix-001',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  // Initialize data on mount or businessId change
  useEffect(() => {
    setIsLoading(true);

    try {
      // 1. Accounts
      const rawAccounts = localStorage.getItem(`${LS_ACCOUNTS_KEY}_${businessId}`);
      if (rawAccounts) {
        setAccounts(JSON.parse(rawAccounts));
      } else {
        const initial = getInitialDemoAccounts(businessId);
        setAccounts(initial);
        localStorage.setItem(`${LS_ACCOUNTS_KEY}_${businessId}`, JSON.stringify(initial));
      }

      // 2. Categories
      const rawCats = localStorage.getItem(`${LS_CATEGORIES_KEY}_${businessId}`);
      if (rawCats) {
        setCategories(JSON.parse(rawCats));
      } else {
        const initial = getInitialDemoCategories(businessId);
        setCategories(initial);
        localStorage.setItem(`${LS_CATEGORIES_KEY}_${businessId}`, JSON.stringify(initial));
      }

      // 3. Settings
      const rawSettings = localStorage.getItem(`${LS_SETTINGS_KEY}_${businessId}`);
      if (rawSettings) {
        setFinanceSettings(JSON.parse(rawSettings));
      } else {
        const initial = getInitialDemoSettings(businessId);
        setFinanceSettings(initial);
        localStorage.setItem(`${LS_SETTINGS_KEY}_${businessId}`, JSON.stringify(initial));
      }

      // 4. Invoices & Items
      const rawInvoices = localStorage.getItem(`${LS_INVOICES_KEY}_${businessId}`);
      const rawItems = localStorage.getItem(`${LS_INVOICE_ITEMS_KEY}_${businessId}`);
      if (rawInvoices && rawItems) {
        setInvoices(JSON.parse(rawInvoices));
        setInvoiceItems(JSON.parse(rawItems));
      } else {
        const initial = getInitialDemoInvoices(businessId);
        setInvoices(initial.invoices);
        setInvoiceItems(initial.items);
        localStorage.setItem(`${LS_INVOICES_KEY}_${businessId}`, JSON.stringify(initial.invoices));
        localStorage.setItem(`${LS_INVOICE_ITEMS_KEY}_${businessId}`, JSON.stringify(initial.items));
      }

      // 5. Payments
      const rawPayments = localStorage.getItem(`${LS_PAYMENTS_KEY}_${businessId}`);
      let currentPayments: Payment[] = [];
      if (rawPayments) {
        currentPayments = JSON.parse(rawPayments);
        setPayments(currentPayments);
      } else {
        currentPayments = getInitialDemoPayments(businessId);
        setPayments(currentPayments);
        localStorage.setItem(`${LS_PAYMENTS_KEY}_${businessId}`, JSON.stringify(currentPayments));
      }

      // 6. Expenses
      const rawExpenses = localStorage.getItem(`${LS_EXPENSES_KEY}_${businessId}`);
      let currentExpenses: Expense[] = [];
      if (rawExpenses) {
        currentExpenses = JSON.parse(rawExpenses);
        setExpenses(currentExpenses);
      } else {
        currentExpenses = getInitialDemoExpenses(businessId);
        setExpenses(currentExpenses);
        localStorage.setItem(`${LS_EXPENSES_KEY}_${businessId}`, JSON.stringify(currentExpenses));
      }

      // 7. Income (Direct)
      const rawIncome = localStorage.getItem(`${LS_INCOME_KEY}_${businessId}`);
      if (rawIncome) {
        setIncomeRecords(JSON.parse(rawIncome));
      } else {
        setIncomeRecords([]);
      }

      // 8. Investments
      const rawInvestments = localStorage.getItem(`${LS_INVESTMENTS_KEY}_${businessId}`);
      let currentInvestments: Investment[] = [];
      if (rawInvestments) {
        currentInvestments = JSON.parse(rawInvestments);
        setInvestments(currentInvestments);
      } else {
        currentInvestments = getInitialDemoInvestments(businessId);
        setInvestments(currentInvestments);
        localStorage.setItem(`${LS_INVESTMENTS_KEY}_${businessId}`, JSON.stringify(currentInvestments));
      }

      // 9. Transactions
      const rawTransactions = localStorage.getItem(`${LS_TRANSACTIONS_KEY}_${businessId}`);
      if (rawTransactions) {
        setTransactions(JSON.parse(rawTransactions));
      } else {
        const initialTrx = getInitialDemoTransactions(
          businessId,
          currentPayments,
          currentExpenses,
          currentInvestments
        );
        setTransactions(initialTrx);
        localStorage.setItem(`${LS_TRANSACTIONS_KEY}_${businessId}`, JSON.stringify(initialTrx));
      }

      // 10. Recurring
      const rawRecurring = localStorage.getItem(`${LS_RECURRING_KEY}_${businessId}`);
      if (rawRecurring) {
        setRecurringTransactions(JSON.parse(rawRecurring));
      } else {
        const initialRec = getInitialDemoRecurring(businessId);
        setRecurringTransactions(initialRec);
        localStorage.setItem(`${LS_RECURRING_KEY}_${businessId}`, JSON.stringify(initialRec));
      }

      // 11. Recurring Runs
      const rawRuns = localStorage.getItem(`${LS_RECURRING_RUNS_KEY}_${businessId}`);
      if (rawRuns) {
        setRecurringRuns(JSON.parse(rawRuns));
      } else {
        setRecurringRuns([]);
      }
    } catch (err) {
      console.error('Error hydrating finance context:', err);
    } finally {
      setIsLoading(false);
    }
  }, [businessId]);

  // Persist state changes to LocalStorage
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(`${LS_ACCOUNTS_KEY}_${businessId}`, JSON.stringify(accounts));
      localStorage.setItem(`${LS_CATEGORIES_KEY}_${businessId}`, JSON.stringify(categories));
      if (financeSettings) {
        localStorage.setItem(`${LS_SETTINGS_KEY}_${businessId}`, JSON.stringify(financeSettings));
      }
      localStorage.setItem(`${LS_INVOICES_KEY}_${businessId}`, JSON.stringify(invoices));
      localStorage.setItem(`${LS_INVOICE_ITEMS_KEY}_${businessId}`, JSON.stringify(invoiceItems));
      localStorage.setItem(`${LS_PAYMENTS_KEY}_${businessId}`, JSON.stringify(payments));
      localStorage.setItem(`${LS_TRANSACTIONS_KEY}_${businessId}`, JSON.stringify(transactions));
      localStorage.setItem(`${LS_EXPENSES_KEY}_${businessId}`, JSON.stringify(expenses));
      localStorage.setItem(`${LS_INCOME_KEY}_${businessId}`, JSON.stringify(incomeRecords));
      localStorage.setItem(`${LS_INVESTMENTS_KEY}_${businessId}`, JSON.stringify(investments));
      localStorage.setItem(`${LS_RECURRING_KEY}_${businessId}`, JSON.stringify(recurringTransactions));
      localStorage.setItem(`${LS_RECURRING_RUNS_KEY}_${businessId}`, JSON.stringify(recurringRuns));
    }
  }, [
    accounts,
    categories,
    financeSettings,
    invoices,
    invoiceItems,
    payments,
    transactions,
    expenses,
    incomeRecords,
    investments,
    recurringTransactions,
    businessId,
    isLoading,
  ]);

  // Date filtering logic
  const isDateInFilter = useCallback(
    (dateStr: string): boolean => {
      if (dateRange === 'all') return true;
      const targetDate = new Date(dateStr);
      const now = new Date();

      switch (dateRange) {
        case 'today': {
          const today = getTodayDate();
          return dateStr.startsWith(today);
        }
        case 'this_week': {
          const firstDayOfWeek = new Date(now);
          const day = now.getDay();
          const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday start
          firstDayOfWeek.setDate(diff);
          firstDayOfWeek.setHours(0, 0, 0, 0);
          return targetDate >= firstDayOfWeek;
        }
        case 'this_month': {
          return (
            targetDate.getFullYear() === now.getFullYear() &&
            targetDate.getMonth() === now.getMonth()
          );
        }
        case 'last_month': {
          const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          return (
            targetDate.getFullYear() === lastMonthDate.getFullYear() &&
            targetDate.getMonth() === lastMonthDate.getMonth()
          );
        }
        case 'this_quarter': {
          const currentQuarter = Math.floor(now.getMonth() / 3);
          const targetQuarter = Math.floor(targetDate.getMonth() / 3);
          return (
            targetDate.getFullYear() === now.getFullYear() &&
            currentQuarter === targetQuarter
          );
        }
        case 'last_quarter': {
          const curQ = Math.floor(now.getMonth() / 3);
          const targetQ = curQ === 0 ? 3 : curQ - 1;
          const targetYear = curQ === 0 ? now.getFullYear() - 1 : now.getFullYear();
          const itemQ = Math.floor(targetDate.getMonth() / 3);
          return (
            targetDate.getFullYear() === targetYear &&
            itemQ === targetQ
          );
        }
        case 'this_year': {
          return targetDate.getFullYear() === now.getFullYear();
        }
        case 'last_year': {
          return targetDate.getFullYear() === now.getFullYear() - 1;
        }
        case 'custom': {
          if (!customStartDate && !customEndDate) return true;
          const start = customStartDate ? new Date(customStartDate) : new Date(0);
          const end = customEndDate ? new Date(`${customEndDate}T23:59:59`) : new Date(8640000000000000);
          return targetDate >= start && targetDate <= end;
        }
        default:
          return true;
      }
    },
    [dateRange, customStartDate, customEndDate]
  );

  // Filtered lists
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => isDateInFilter(t.transaction_date));
  }, [transactions, isDateInFilter]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => isDateInFilter(inv.issue_date));
  }, [invoices, isDateInFilter]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => isDateInFilter(e.expense_date));
  }, [expenses, isDateInFilter]);

  const filteredIncomeRecords = useMemo(() => {
    return incomeRecords.filter((inc) => isDateInFilter(inc.income_date));
  }, [incomeRecords, isDateInFilter]);

  const filteredInvestments = useMemo(() => {
    return investments.filter((inv) => isDateInFilter(inv.investment_date));
  }, [investments, isDateInFilter]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => isDateInFilter(p.payment_date));
  }, [payments, isDateInFilter]);

  // Derived Financial Metrics
  const metrics: FinancialMetrics = useMemo(() => {
    // 1. Total Revenue: Sum of payments received + direct income records in period, converted to base currency
    const paymentRevenueBase = filteredPayments.reduce((sum, p) => {
      if (p.status !== 'Completed') return sum;
      return sum + (Number(p.base_amount) || 0);
    }, 0);

    const directIncomeBase = filteredIncomeRecords.reduce((sum, inc) => {
      return sum + (Number(inc.base_amount) || 0);
    }, 0);

    const totalRevenue = paymentRevenueBase + directIncomeBase;

    // 2. Total Operating Expenses: in base currency
    const totalExpenses = filteredExpenses.reduce((sum, e) => {
      return sum + (Number(e.base_amount) || 0);
    }, 0);

    // 3. Operating Profit = Revenue - Operating Expenses
    const operatingProfit = totalRevenue - totalExpenses;

    // 4. Capital Investments: in base currency
    const totalInvestments = filteredInvestments.reduce((sum, inv) => {
      return sum + (Number(inv.base_amount) || 0);
    }, 0);

    // 5. Net Cash After Investment
    const netCashAfterInvestment = operatingProfit - totalInvestments;

    // 6. Outstanding Receivables: Sum of unpaid balances of all open invoices
    const outstandingReceivables = invoices.reduce((sum, inv) => {
      if (inv.status === 'Paid' || inv.status === 'Cancelled' || inv.status === 'Draft') return sum;
      const balance = Number(inv.balance_due) || 0;
      // Convert to base currency
      const balanceBase =
        inv.currency === baseCurrency
          ? balance
          : balance * (inv.exchange_rate || getExchangeRate(inv.currency, baseCurrency));
      return sum + balanceBase;
    }, 0);

    // 7. Overdue Receivables: invoices past due date
    const today = getTodayDate();
    const overdueReceivables = invoices.reduce((sum, inv) => {
      if (inv.status === 'Paid' || inv.status === 'Cancelled' || inv.status === 'Draft') return sum;
      if (inv.due_date >= today) return sum; // Not yet overdue
      const balance = Number(inv.balance_due) || 0;
      const balanceBase =
        inv.currency === baseCurrency
          ? balance
          : balance * (inv.exchange_rate || getExchangeRate(inv.currency, baseCurrency));
      return sum + balanceBase;
    }, 0);

    // 8. Total Cash Balance across active accounts (calculated from transactions)
    const cashBalance = accounts.reduce((sum, acc) => {
      if (!acc.is_active) return sum;
      const bal = Number(acc.current_balance) || 0;
      const balBase =
        acc.currency === baseCurrency
          ? bal
          : bal * getExchangeRate(acc.currency, baseCurrency);
      return sum + balBase;
    }, 0);

    return {
      totalRevenue: totalRevenue || 0,
      totalExpenses: totalExpenses || 0,
      operatingProfit: operatingProfit || 0,
      netProfit: operatingProfit || 0,
      totalInvestments: totalInvestments || 0,
      netCashAfterInvestment: netCashAfterInvestment || 0,
      outstandingReceivables: outstandingReceivables || 0,
      overdueReceivables: overdueReceivables || 0,
      overdueAmount: overdueReceivables || 0,
      cashBalance: cashBalance || 0,
      totalCashBalance: cashBalance || 0,
      baseCurrency: baseCurrency || 'PKR',
    };
  }, [
    filteredPayments,
    filteredIncomeRecords,
    filteredExpenses,
    filteredInvestments,
    invoices,
    accounts,
    baseCurrency,
    getExchangeRate,
  ]);

  // Recalculate account balances whenever transactions change
  const recomputeAccountBalances = useCallback(
    (currentAccounts: FinancialAccount[], currentTrx: Transaction[]): FinancialAccount[] => {
      return currentAccounts.map((acc) => {
        const accTrx = currentTrx.filter((t) => t.account_id === acc.id && t.status === 'completed');
        const netChange = accTrx.reduce((sum, t) => {
          const amt = Number(t.amount) || 0;
          if (t.transaction_type === 'income' || t.transaction_type === 'refund') {
            return sum + amt;
          } else if (t.transaction_type === 'expense' || t.transaction_type === 'investment') {
            return sum - amt;
          }
          return sum;
        }, 0);

        return {
          ...acc,
          current_balance: Number(acc.opening_balance || 0) + netChange,
          updated_at: new Date().toISOString(),
        };
      });
    },
    []
  );

  // INVOICE ACTIONS
  const createInvoice = async (
    data: {
      client_id: string;
      issue_date: string;
      due_date: string;
      currency: string;
      tax?: number;
      discount?: number;
      notes?: string;
      terms?: string;
    },
    items: Array<{ description: string; quantity: number; unit_price: number }>
  ): Promise<{ success: boolean; invoice?: Invoice; error?: string }> => {
    try {
      const client = clients.find((c) => c.id === data.client_id);
      if (!client) {
        return { success: false, error: 'Selected client not found in current organization.' };
      }

      const invPrefix = financeSettings?.invoice_prefix || 'INV-';
      const nextNum = financeSettings?.next_invoice_number || invoices.length + 1;
      const formattedNum = `${invPrefix}${String(nextNum).padStart(4, '0')}`;

      // Calculate line items
      let subtotal = 0;
      const invoiceId = `inv-${businessId}-${Date.now()}`;
      const lineItemEntities: InvoiceItem[] = items.map((item, idx) => {
        const lineAmt = Number(item.quantity) * Number(item.unit_price);
        subtotal += lineAmt;
        return {
          id: `item-${invoiceId}-${idx + 1}`,
          business_id: businessId,
          invoice_id: invoiceId,
          description: item.description,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          amount: lineAmt,
          created_at: new Date().toISOString(),
        };
      });

      const tax = Number(data.tax) || 0;
      const discount = Number(data.discount) || 0;
      const total = Math.max(0, subtotal + tax - discount);
      const rate =
        data.currency === baseCurrency ? 1 : getExchangeRate(data.currency, baseCurrency);
      const baseTotal = total * rate;

      const newInvoice: Invoice = {
        id: invoiceId,
        business_id: businessId,
        client_id: data.client_id,
        client,
        invoice_number: formattedNum,
        issue_date: data.issue_date || getTodayDate(),
        due_date: data.due_date,
        status: 'Draft',
        subtotal,
        tax,
        discount,
        total,
        paid_amount: 0,
        balance_due: total,
        currency: data.currency,
        exchange_rate: rate,
        base_total: baseTotal,
        base_currency: baseCurrency,
        notes: data.notes || null,
        terms: data.terms || financeSettings?.default_payment_terms || 'Net 15',
        items: lineItemEntities,
        created_by: user?.id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setInvoices((prev) => [newInvoice, ...prev]);
      setInvoiceItems((prev) => [...lineItemEntities, ...prev]);

      // Update next invoice number in settings
      if (financeSettings) {
        setFinanceSettings({
          ...financeSettings,
          next_invoice_number: nextNum + 1,
        });
      }

      // Update client outstanding balance
      const currentClientBal = Number(client.outstanding_balance) || 0;
      updateClient(client.id, {
        outstanding_balance: currentClientBal + total,
      });

      // Notification
      addNotification({
        user_id: user?.id || null,
        type: 'invoice_created',
        title: `New Invoice Created: ${formattedNum}`,
        message: `Issued to ${client.company_name} for ${data.currency} ${total.toLocaleString()}. Due on ${data.due_date}.`,
        link_section: 'finance',
        entity_id: newInvoice.id,
      });

      return { success: true, invoice: newInvoice };
    } catch (err: any) {
      console.error('Failed to create invoice:', err);
      return { success: false, error: err.message || 'Error creating invoice.' };
    }
  };

  const updateInvoice = async (
    invoiceId: string,
    updates: Partial<Invoice>,
    items?: Array<{ description: string; quantity: number; unit_price: number }>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const existing = invoices.find((inv) => inv.id === invoiceId);
      if (!existing) return { success: false, error: 'Invoice not found.' };

      let updatedSubtotal = existing.subtotal;
      let updatedItems = existing.items || [];

      if (items) {
        let sub = 0;
        updatedItems = items.map((item, idx) => {
          const lineAmt = Number(item.quantity) * Number(item.unit_price);
          sub += lineAmt;
          return {
            id: `item-${invoiceId}-${idx + 1}`,
            business_id: businessId,
            invoice_id: invoiceId,
            description: item.description,
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price),
            amount: lineAmt,
            created_at: new Date().toISOString(),
          };
        });
        updatedSubtotal = sub;

        // Replace items in state
        setInvoiceItems((prev) => [
          ...prev.filter((i) => i.invoice_id !== invoiceId),
          ...updatedItems,
        ]);
      }

      const tax = updates.tax !== undefined ? Number(updates.tax) : existing.tax;
      const discount = updates.discount !== undefined ? Number(updates.discount) : existing.discount;
      const total = Math.max(0, updatedSubtotal + tax - discount);
      const paid = existing.paid_amount || 0;
      const balance = Math.max(0, total - paid);

      const updatedInvoice: Invoice = {
        ...existing,
        ...updates,
        subtotal: updatedSubtotal,
        tax,
        discount,
        total,
        balance_due: balance,
        items: updatedItems,
        updated_at: new Date().toISOString(),
      };

      setInvoices((prev) => prev.map((inv) => (inv.id === invoiceId ? updatedInvoice : inv)));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error updating invoice.' };
    }
  };

  const updateInvoiceStatus = async (
    invoiceId: string,
    status: InvoiceStatus
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoiceId ? { ...inv, status, updated_at: new Date().toISOString() } : inv
        )
      );
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const cancelInvoice = async (invoiceId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const inv = invoices.find((i) => i.id === invoiceId);
      if (!inv) return { success: false, error: 'Invoice not found.' };

      // Deduct balance from client outstanding balance
      if (inv.client_id) {
        const client = clients.find((c) => c.id === inv.client_id);
        if (client) {
          const currentBal = Number(client.outstanding_balance) || 0;
          updateClient(client.id, {
            outstanding_balance: Math.max(0, currentBal - inv.balance_due),
          });
        }
      }

      return updateInvoiceStatus(invoiceId, 'Cancelled');
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const deleteInvoice = async (invoiceId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setInvoices((prev) => prev.filter((i) => i.id !== invoiceId));
      setInvoiceItems((prev) => prev.filter((i) => i.invoice_id !== invoiceId));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // RECORD PAYMENT
  const recordPayment = async (data: {
    invoiceId?: string | null;
    clientId: string;
    accountId: string;
    amount: number;
    currency: string;
    paymentMethod: PaymentMethod;
    paymentDate?: string;
    reference?: string;
    notes?: string;
  }): Promise<{ success: boolean; payment?: Payment; error?: string }> => {
    try {
      const client = clients.find((c) => c.id === data.clientId);
      if (!client) return { success: false, error: 'Client not found.' };

      const account = accounts.find((a) => a.id === data.accountId);
      if (!account) return { success: false, error: 'Financial account not found.' };

      const invoice = data.invoiceId ? invoices.find((i) => i.id === data.invoiceId) : null;

      // Validation: Check overpayment against invoice
      if (invoice) {
        const remaining = Number(invoice.balance_due) || 0;
        if (Number(data.amount) > remaining + 0.01) {
          return {
            success: false,
            error: `Payment amount (${data.currency} ${data.amount}) cannot exceed remaining balance (${data.currency} ${remaining}).`,
          };
        }
      }

      const payPrefix = financeSettings?.payment_prefix || 'PAY-';
      const nextNum = financeSettings?.next_payment_number || payments.length + 1;
      const paymentNumber = `${payPrefix}${String(nextNum).padStart(4, '0')}`;

      const rate =
        data.currency === baseCurrency
          ? 1
          : getExchangeRate(data.currency, baseCurrency);
      const baseAmount = Number(data.amount) * rate;

      const trxId = `trx-${businessId}-pay-${Date.now()}`;
      const paymentId = `pay-${businessId}-${Date.now()}`;
      const newPayment: Payment = {
        id: paymentId,
        business_id: businessId,
        invoice_id: data.invoiceId || null,
        invoice,
        client_id: data.clientId,
        client,
        account_id: data.accountId,
        account,
        payment_number: paymentNumber,
        amount: Number(data.amount),
        currency: data.currency,
        exchange_rate: rate,
        base_amount: baseAmount,
        base_currency: baseCurrency,
        payment_date: data.paymentDate || getTodayDate(),
        payment_method: data.paymentMethod,
        reference: data.reference || null,
        transaction_id: trxId,
        status: 'Completed',
        notes: data.notes || null,
        created_by: user?.id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // 1. Create Transaction in Central Ledger
      const newTransaction: Transaction = {
        id: trxId,
        business_id: businessId,
        transaction_type: 'income',
        description: invoice
          ? `Invoice Payment: ${invoice.invoice_number} (${paymentNumber})`
          : `Client Direct Payment: ${client.company_name} (${paymentNumber})`,
        reference: data.reference || paymentNumber,
        category_id: categories.find((c) => c.type === 'Income')?.id || null,
        account_id: data.accountId,
        client_id: data.clientId,
        amount: Number(data.amount),
        currency: data.currency,
        exchange_rate: rate,
        base_amount: baseAmount,
        base_currency: baseCurrency,
        transaction_date: data.paymentDate || getTodayDate(),
        payment_method: data.paymentMethod,
        status: 'completed',
        notes: data.notes || null,
        attachment_url: null,
        created_by: user?.id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // 2. Update Invoice Status and Balance
      if (invoice) {
        const newPaid = (Number(invoice.paid_amount) || 0) + Number(data.amount);
        const newBalance = Math.max(0, (Number(invoice.total) || 0) - newPaid);
        const newStatus: InvoiceStatus = newBalance <= 0.01 ? 'Paid' : 'Partially Paid';

        setInvoices((prev) =>
          prev.map((inv) =>
            inv.id === invoice.id
              ? {
                  ...inv,
                  paid_amount: newPaid,
                  balance_due: newBalance,
                  status: newStatus,
                  updated_at: new Date().toISOString(),
                }
              : inv
          )
        );
      }

      // 3. Update Client Lifetime Revenue & Outstanding Balance
      const currentRev = Number(client.total_revenue) || 0;
      const currentBal = Number(client.outstanding_balance) || 0;
      updateClient(client.id, {
        total_revenue: currentRev + (client.preferred_currency === data.currency ? Number(data.amount) : baseAmount),
        outstanding_balance: Math.max(0, currentBal - Number(data.amount)),
      });

      // 4. Update Payments & Transactions State
      const updatedTrx = [newTransaction, ...transactions];
      setPayments((prev) => [newPayment, ...prev]);
      setTransactions(updatedTrx);

      // 5. Update Account Balance
      setAccounts((prev) => recomputeAccountBalances(prev, updatedTrx));

      // 6. Update Settings
      if (financeSettings) {
        setFinanceSettings({
          ...financeSettings,
          next_payment_number: nextNum + 1,
        });
      }

      // 7. Notification
      addNotification({
        user_id: user?.id || null,
        type: 'payment_received',
        title: `Payment Received: ${paymentNumber}`,
        message: `Recorded ${data.currency} ${Number(data.amount).toLocaleString()} from ${client.company_name} into ${account.name}.`,
        link_section: 'finance',
        entity_id: newPayment.id,
      });

      return { success: true, payment: newPayment };
    } catch (err: any) {
      console.error('Failed to record payment:', err);
      return { success: false, error: err.message || 'Error recording payment.' };
    }
  };

  // CANCEL PAYMENT
  const cancelPayment = async (
    paymentId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const payment = payments.find((p) => p.id === paymentId);
      if (!payment) return { success: false, error: 'Payment record not found.' };

      if (payment.status === 'Cancelled' || payment.status === 'cancelled') {
        return { success: false, error: 'This payment has already been cancelled.' };
      }

      // 1. Mark Payment as Cancelled
      const updatedPayments: Payment[] = payments.map((p) =>
        p.id === paymentId
          ? {
              ...p,
              status: 'Cancelled' as PaymentStatus,
              cancellation_reason: reason || 'Cancelled by authorized user',
              updated_at: new Date().toISOString(),
            }
          : p
      );
      setPayments(updatedPayments);

      // 2. Mark Corresponding Transaction as Cancelled
      const updatedTransactions: Transaction[] = transactions.map((t) => {
        const isMatch =
          (payment.transaction_id && t.id === payment.transaction_id) ||
          t.reference === payment.payment_number ||
          (payment.reference && t.reference === payment.reference);
        return isMatch
          ? {
              ...t,
              status: 'cancelled' as TransactionStatus,
              updated_at: new Date().toISOString(),
            }
          : t;
      });
      setTransactions(updatedTransactions);

      // 3. Recalculate Invoice totals and status if attached to invoice
      if (payment.invoice_id) {
        const invoice = invoices.find((i) => i.id === payment.invoice_id);
        if (invoice) {
          // Sum of remaining non-cancelled payments for this invoice
          const activePayments = updatedPayments.filter(
            (p) =>
              p.invoice_id === invoice.id &&
              p.status !== 'Cancelled' &&
              p.status !== 'cancelled'
          );
          const newPaid = activePayments.reduce((sum, p) => sum + Number(p.amount), 0);
          const invoiceTotal = Number(invoice.total ?? (invoice as any).total_amount ?? 0);
          const newBalance = Math.max(0, invoiceTotal - newPaid);

          let newStatus: InvoiceStatus;
          if (newBalance <= 0.01) {
            newStatus = 'Paid';
          } else if (newPaid > 0) {
            newStatus = 'Partially Paid';
          } else {
            const today = getTodayDate();
            newStatus = invoice.due_date < today ? 'Overdue' : 'Sent';
          }

          setInvoices((prev) =>
            prev.map((inv) =>
              inv.id === invoice.id
                ? {
                    ...inv,
                    paid_amount: newPaid,
                    balance_due: newBalance,
                    status: newStatus,
                    updated_at: new Date().toISOString(),
                  }
                : inv
            )
          );
        }
      }

      // 4. Update Client Outstanding Balance & Lifetime Revenue
      const client = clients.find((c) => c.id === payment.client_id);
      if (client) {
        const currentBal = Number(client.outstanding_balance) || 0;
        const currentRev = Number(client.total_revenue) || 0;
        const pAmt = Number(payment.amount) || 0;
        const pBase = Number(payment.base_amount) || pAmt;

        updateClient(client.id, {
          outstanding_balance: currentBal + pAmt,
          total_revenue: Math.max(0, currentRev - (client.preferred_currency === payment.currency ? pAmt : pBase)),
        });
      }

      // 5. Update Account Balance (cancelled transactions are excluded)
      setAccounts((prev) => recomputeAccountBalances(prev, updatedTransactions));

      // 6. Notification
      addNotification({
        user_id: user?.id || null,
        type: 'payment_cancelled' as any,
        title: `Payment Cancelled: ${payment.payment_number}`,
        message: `Cancelled payment of ${payment.currency} ${payment.amount.toLocaleString()} from ${client?.company_name || 'Client'}. ${reason ? `Reason: ${reason}` : ''}`,
        link_section: 'finance',
        entity_id: payment.id,
      });

      return { success: true };
    } catch (err: any) {
      console.error('Failed to cancel payment:', err);
      return { success: false, error: err.message || 'Error cancelling payment.' };
    }
  };

  // EXPENSE ACTIONS
  const addExpense = async (data: {
    categoryId: string;
    accountId: string;
    amount: number;
    currency: string;
    vendor: string;
    description: string;
    expenseDate?: string;
    paymentMethod: PaymentMethod;
    reference?: string;
    notes?: string;
    attachmentUrl?: string;
  }): Promise<{ success: boolean; expense?: Expense; error?: string }> => {
    try {
      const account = accounts.find((a) => a.id === data.accountId);
      if (!account) return { success: false, error: 'Account not found.' };

      const category = categories.find((c) => c.id === data.categoryId);

      const rate =
        data.currency === baseCurrency ? 1 : getExchangeRate(data.currency, baseCurrency);
      const baseAmount = Number(data.amount) * rate;

      const expenseId = `exp-${businessId}-${Date.now()}`;
      const trxId = `trx-${businessId}-exp-${Date.now()}`;

      // Create ledger transaction
      const newTransaction: Transaction = {
        id: trxId,
        business_id: businessId,
        transaction_type: 'expense',
        description: `${data.vendor}: ${data.description}`,
        reference: data.reference || null,
        category_id: data.categoryId,
        account_id: data.accountId,
        client_id: null,
        amount: Number(data.amount),
        currency: data.currency,
        exchange_rate: rate,
        base_amount: baseAmount,
        base_currency: baseCurrency,
        transaction_date: data.expenseDate || getTodayDate(),
        payment_method: data.paymentMethod,
        status: 'completed',
        notes: data.notes || null,
        attachment_url: data.attachmentUrl || null,
        created_by: user?.id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const newExpense: Expense = {
        id: expenseId,
        business_id: businessId,
        category_id: data.categoryId,
        category,
        account_id: data.accountId,
        account,
        transaction_id: trxId,
        amount: Number(data.amount),
        currency: data.currency,
        exchange_rate: rate,
        base_amount: baseAmount,
        base_currency: baseCurrency,
        vendor: data.vendor,
        description: data.description,
        expense_date: data.expenseDate || getTodayDate(),
        payment_method: data.paymentMethod,
        reference: data.reference || null,
        notes: data.notes || null,
        attachment_url: data.attachmentUrl || null,
        created_by: user?.id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const updatedTrx = [newTransaction, ...transactions];
      setExpenses((prev) => [newExpense, ...prev]);
      setTransactions(updatedTrx);
      setAccounts((prev) => recomputeAccountBalances(prev, updatedTrx));

      // Notification for notable expenses
      if (baseAmount >= 50000) {
        addNotification({
          user_id: user?.id || null,
          type: 'expense_added',
          title: `Large Expense Logged: ${data.currency} ${Number(data.amount).toLocaleString()}`,
          message: `Paid to ${data.vendor} for "${data.description}" from ${account.name}.`,
          link_section: 'finance',
          entity_id: newExpense.id,
        });
      }

      return { success: true, expense: newExpense };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error adding expense.' };
    }
  };

  const updateExpense = async (
    id: string,
    updates: Partial<Expense>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const existing = expenses.find((e) => e.id === id);
      if (!existing) return { success: false, error: 'Expense not found.' };

      const updatedExpense = {
        ...existing,
        ...updates,
        updated_at: new Date().toISOString(),
      };

      setExpenses((prev) => prev.map((e) => (e.id === id ? updatedExpense : e)));

      // Sync transaction
      if (existing.transaction_id) {
        setTransactions((prev) =>
          prev.map((t) =>
            t.id === existing.transaction_id
              ? {
                  ...t,
                  description: `${updates.vendor || existing.vendor}: ${updates.description || existing.description}`,
                  amount: updates.amount !== undefined ? Number(updates.amount) : t.amount,
                  account_id: updates.account_id || t.account_id,
                  category_id: updates.category_id || t.category_id,
                  transaction_date: updates.expense_date || t.transaction_date,
                  updated_at: new Date().toISOString(),
                }
              : t
          )
        );
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const deleteExpense = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const existing = expenses.find((e) => e.id === id);
      if (!existing) return { success: false, error: 'Expense not found.' };

      setExpenses((prev) => prev.filter((e) => e.id !== id));
      if (existing.transaction_id) {
        const updatedTrx = transactions.filter((t) => t.id !== existing.transaction_id);
        setTransactions(updatedTrx);
        setAccounts((prev) => recomputeAccountBalances(prev, updatedTrx));
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // INCOME ACTIONS (Direct non-invoice)
  const addIncome = async (data: {
    clientId?: string | null;
    categoryId: string;
    accountId: string;
    amount: number;
    currency: string;
    source: string;
    incomeDate?: string;
    paymentMethod: PaymentMethod;
    reference?: string;
    notes?: string;
  }): Promise<{ success: boolean; income?: IncomeRecord; error?: string }> => {
    try {
      const account = accounts.find((a) => a.id === data.accountId);
      if (!account) return { success: false, error: 'Account not found.' };

      const category = categories.find((c) => c.id === data.categoryId);
      const client = data.clientId ? clients.find((c) => c.id === data.clientId) : null;

      const rate =
        data.currency === baseCurrency ? 1 : getExchangeRate(data.currency, baseCurrency);
      const baseAmount = Number(data.amount) * rate;

      const incomeId = `inc-${businessId}-${Date.now()}`;
      const trxId = `trx-${businessId}-inc-${Date.now()}`;

      const newTransaction: Transaction = {
        id: trxId,
        business_id: businessId,
        transaction_type: 'income',
        description: `Direct Income: ${data.source}`,
        reference: data.reference || null,
        category_id: data.categoryId,
        account_id: data.accountId,
        client_id: data.clientId || null,
        amount: Number(data.amount),
        currency: data.currency,
        exchange_rate: rate,
        base_amount: baseAmount,
        base_currency: baseCurrency,
        transaction_date: data.incomeDate || getTodayDate(),
        payment_method: data.paymentMethod,
        status: 'completed',
        notes: data.notes || null,
        attachment_url: null,
        created_by: user?.id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const newIncome: IncomeRecord = {
        id: incomeId,
        business_id: businessId,
        client_id: data.clientId || null,
        client,
        category_id: data.categoryId,
        category,
        account_id: data.accountId,
        account,
        transaction_id: trxId,
        amount: Number(data.amount),
        currency: data.currency,
        exchange_rate: rate,
        base_amount: baseAmount,
        base_currency: baseCurrency,
        source: data.source,
        income_date: data.incomeDate || getTodayDate(),
        payment_method: data.paymentMethod,
        reference: data.reference || null,
        notes: data.notes || null,
        created_by: user?.id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const updatedTrx = [newTransaction, ...transactions];
      setIncomeRecords((prev) => [newIncome, ...prev]);
      setTransactions(updatedTrx);
      setAccounts((prev) => recomputeAccountBalances(prev, updatedTrx));

      return { success: true, income: newIncome };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // INVESTMENT ACTIONS
  const addInvestment = async (data: {
    categoryId?: string;
    accountId: string;
    name: string;
    amount: number;
    currency: string;
    investmentDate?: string;
    expectedReturn?: string;
    notes?: string;
    attachmentUrl?: string;
  }): Promise<{ success: boolean; investment?: Investment; error?: string }> => {
    try {
      const account = accounts.find((a) => a.id === data.accountId);
      if (!account) return { success: false, error: 'Account not found.' };

      const category = data.categoryId ? categories.find((c) => c.id === data.categoryId) : null;

      const rate =
        data.currency === baseCurrency ? 1 : getExchangeRate(data.currency, baseCurrency);
      const baseAmount = Number(data.amount) * rate;

      const invId = `inv-cap-${businessId}-${Date.now()}`;
      const trxId = `trx-${businessId}-inv-${Date.now()}`;

      const newTransaction: Transaction = {
        id: trxId,
        business_id: businessId,
        transaction_type: 'investment',
        description: `Capital Investment: ${data.name}`,
        reference: null,
        category_id: data.categoryId || null,
        account_id: data.accountId,
        client_id: null,
        amount: Number(data.amount),
        currency: data.currency,
        exchange_rate: rate,
        base_amount: baseAmount,
        base_currency: baseCurrency,
        transaction_date: data.investmentDate || getTodayDate(),
        payment_method: 'Bank Transfer',
        status: 'completed',
        notes: data.notes || null,
        attachment_url: data.attachmentUrl || null,
        created_by: user?.id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const newInvestment: Investment = {
        id: invId,
        business_id: businessId,
        category_id: data.categoryId || null,
        category,
        account_id: data.accountId,
        account,
        transaction_id: trxId,
        name: data.name,
        amount: Number(data.amount),
        currency: data.currency,
        exchange_rate: rate,
        base_amount: baseAmount,
        base_currency: baseCurrency,
        investment_date: data.investmentDate || getTodayDate(),
        expected_return: data.expectedReturn || null,
        notes: data.notes || null,
        attachment_url: data.attachmentUrl || null,
        created_by: user?.id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const updatedTrx = [newTransaction, ...transactions];
      setInvestments((prev) => [newInvestment, ...prev]);
      setTransactions(updatedTrx);
      setAccounts((prev) => recomputeAccountBalances(prev, updatedTrx));

      return { success: true, investment: newInvestment };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // ACCOUNTS ACTIONS
  const addAccount = async (
    data: Omit<FinancialAccount, 'id' | 'business_id' | 'created_at' | 'updated_at'>
  ): Promise<{ success: boolean; account?: FinancialAccount; error?: string }> => {
    try {
      const newAcc: FinancialAccount = {
        id: `acc-${businessId}-${Date.now()}`,
        business_id: businessId,
        ...data,
        current_balance: Number(data.opening_balance) || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setAccounts((prev) => [...prev, newAcc]);
      return { success: true, account: newAcc };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const updateAccount = async (
    id: string,
    updates: Partial<FinancialAccount>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setAccounts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...updates, updated_at: new Date().toISOString() } : a))
      );
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const toggleAccountActive = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setAccounts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, is_active: !a.is_active, updated_at: new Date().toISOString() } : a))
      );
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // CATEGORIES ACTIONS
  const addCategory = async (
    data: Omit<FinancialCategory, 'id' | 'business_id' | 'created_at' | 'updated_at'>
  ): Promise<{ success: boolean; category?: FinancialCategory; error?: string }> => {
    try {
      const newCat: FinancialCategory = {
        id: `cat-${businessId}-${Date.now()}`,
        business_id: businessId,
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setCategories((prev) => [...prev, newCat]);
      return { success: true, category: newCat };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const updateCategory = async (
    id: string,
    updates: Partial<FinancialCategory>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c))
      );
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const archiveCategory = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, is_active: false, updated_at: new Date().toISOString() } : c))
      );
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // RECURRING ACTIONS
  const addRecurringTransaction = async (
    data: Omit<RecurringTransaction, 'id' | 'business_id' | 'created_at' | 'updated_at'>
  ): Promise<{ success: boolean; recurring?: RecurringTransaction; error?: string }> => {
    try {
      const rate =
        data.currency === baseCurrency
          ? 1
          : (data.exchange_rate || getExchangeRate(data.currency, baseCurrency));
      const baseAmount = Number(data.amount) * rate;

      const newRec: RecurringTransaction = {
        id: `rec-${businessId}-${Date.now()}`,
        business_id: businessId,
        name: data.name,
        description: data.description || null,
        transaction_type: data.transaction_type,
        type: data.transaction_type,
        category_id: data.category_id || null,
        account_id: data.account_id,
        client_id: data.client_id || null,
        amount: Number(data.amount),
        currency: data.currency,
        exchange_rate: rate,
        base_currency: baseCurrency,
        base_amount: baseAmount,
        frequency: normalizeFrequency(data.frequency),
        start_date: data.start_date,
        end_date: data.end_date || null,
        next_run_date: data.start_date,
        payment_method: data.payment_method || 'Bank Transfer',
        reference: data.reference || null,
        notes: data.notes || null,
        is_active: data.is_active !== undefined ? data.is_active : true,
        status: data.status || 'Active',
        last_run_at: null,
        created_by: user?.id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setRecurringTransactions((prev) => [newRec, ...prev]);

      addNotification({
        title: 'Recurring Transaction Created',
        message: `Scheduled recurring ${newRec.transaction_type}: "${newRec.name}" (${newRec.amount} ${newRec.currency})`,
        type: 'finance',
      });

      return { success: true, recurring: newRec };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const updateRecurringTransaction = async (
    id: string,
    updates: Partial<RecurringTransaction>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setRecurringTransactions((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          const curr = updates.currency || r.currency;
          const rate = updates.exchange_rate !== undefined ? updates.exchange_rate : r.exchange_rate;
          const amt = updates.amount !== undefined ? Number(updates.amount) : r.amount;
          const baseAmt = curr === baseCurrency ? amt : amt * rate;

          return {
            ...r,
            ...updates,
            amount: amt,
            currency: curr,
            exchange_rate: rate,
            base_amount: baseAmt,
            frequency: updates.frequency ? normalizeFrequency(updates.frequency) : r.frequency,
            updated_at: new Date().toISOString(),
          };
        })
      );
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const pauseRecurringTransaction = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setRecurringTransactions((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, is_active: false, status: 'Paused', updated_at: new Date().toISOString() } : r
        )
      );
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const resumeRecurringTransaction = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setRecurringTransactions((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, is_active: true, status: 'Active', updated_at: new Date().toISOString() } : r
        )
      );
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const toggleRecurringActive = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const existing = recurringTransactions.find((r) => r.id === id);
      if (existing?.is_active) {
        return pauseRecurringTransaction(id);
      } else {
        return resumeRecurringTransaction(id);
      }
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const deleteRecurringTransaction = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setRecurringTransactions((prev) => prev.filter((r) => r.id !== id));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // Run Now with Idempotency & Financial Record Creation
  const runRecurringTransactionNow = async (
    id: string
  ): Promise<{ success: boolean; transaction?: Transaction; run?: RecurringTransactionRun; error?: string }> => {
    try {
      const rec = recurringTransactions.find((r) => r.id === id);
      if (!rec) return { success: false, error: 'Recurring transaction not found' };

      const scheduledDate = rec.next_run_date || getTodayDate();

      // STRICT IDEMPOTENCY CHECK (Constraint: Exactly one run per recurring_transaction_id + scheduled_date)
      if (hasRunAlreadyExecuted(rec.id, scheduledDate, recurringRuns)) {
        return {
          success: false,
          error: `Transaction already executed for scheduled date ${scheduledDate}. Duplicate execution prevented.`,
        };
      }

      const account = accounts.find((a) => a.id === rec.account_id);
      if (!account) return { success: false, error: 'Account linked to recurring transaction not found' };

      const trxId = `trx-rec-${businessId}-${Date.now()}`;
      const nowISO = new Date().toISOString();
      const baseAmt = rec.base_amount || (rec.currency === baseCurrency ? rec.amount : rec.amount * rec.exchange_rate);

      let createdTx: Transaction | null = null;

      if (rec.transaction_type === 'expense') {
        const expId = `exp-rec-${businessId}-${Date.now()}`;
        createdTx = {
          id: trxId,
          business_id: businessId,
          transaction_type: 'expense',
          description: `Recurring Expense: ${rec.name}`,
          reference: rec.reference || `REC-${rec.id.substring(0, 8)}`,
          category_id: rec.category_id || null,
          account_id: rec.account_id,
          client_id: rec.client_id || null,
          amount: rec.amount,
          currency: rec.currency,
          exchange_rate: rec.exchange_rate,
          base_amount: baseAmt,
          base_currency: baseCurrency,
          transaction_date: scheduledDate,
          payment_method: (rec.payment_method as PaymentMethod) || 'Bank Transfer',
          status: 'completed',
          notes: rec.notes || `Generated from recurring template "${rec.name}"`,
          attachment_url: null,
          created_by: user?.id || null,
          created_at: nowISO,
          updated_at: nowISO,
        };

        const newExpense: Expense = {
          id: expId,
          business_id: businessId,
          transaction_id: trxId,
          category_id: rec.category_id || null,
          account_id: rec.account_id,
          amount: rec.amount,
          currency: rec.currency,
          exchange_rate: rec.exchange_rate,
          base_amount: baseAmt,
          base_currency: baseCurrency,
          vendor: rec.name,
          description: rec.description || rec.name,
          expense_date: scheduledDate,
          payment_method: (rec.payment_method as PaymentMethod) || 'Bank Transfer',
          reference: rec.reference || null,
          notes: rec.notes || `Generated from recurring template "${rec.name}"`,
          attachment_url: null,
          created_by: user?.id || null,
          created_at: nowISO,
          updated_at: nowISO,
        };

        const nextTrx = [createdTx, ...transactions];
        setExpenses((prev) => [newExpense, ...prev]);
        setTransactions(nextTrx);
        setAccounts((prev) => recomputeAccountBalances(prev, nextTrx));
      } else if (rec.transaction_type === 'income') {
        const incId = `inc-rec-${businessId}-${Date.now()}`;
        createdTx = {
          id: trxId,
          business_id: businessId,
          transaction_type: 'income',
          description: `Recurring Income: ${rec.name}`,
          reference: rec.reference || `REC-${rec.id.substring(0, 8)}`,
          category_id: rec.category_id || null,
          account_id: rec.account_id,
          client_id: rec.client_id || null,
          amount: rec.amount,
          currency: rec.currency,
          exchange_rate: rec.exchange_rate,
          base_amount: baseAmt,
          base_currency: baseCurrency,
          transaction_date: scheduledDate,
          payment_method: (rec.payment_method as PaymentMethod) || 'Bank Transfer',
          status: 'completed',
          notes: rec.notes || `Generated from recurring template "${rec.name}"`,
          attachment_url: null,
          created_by: user?.id || null,
          created_at: nowISO,
          updated_at: nowISO,
        };

        const newIncome: IncomeRecord = {
          id: incId,
          business_id: businessId,
          transaction_id: trxId,
          category_id: rec.category_id || null,
          account_id: rec.account_id,
          client_id: rec.client_id || null,
          amount: rec.amount,
          currency: rec.currency,
          exchange_rate: rec.exchange_rate,
          base_amount: baseAmt,
          base_currency: baseCurrency,
          source: rec.name,
          income_date: scheduledDate,
          payment_method: (rec.payment_method as PaymentMethod) || 'Bank Transfer',
          reference: rec.reference || null,
          notes: rec.notes || `Generated from recurring template "${rec.name}"`,
          created_by: user?.id || null,
          created_at: nowISO,
          updated_at: nowISO,
        };

        const nextTrx = [createdTx, ...transactions];
        setIncomeRecords((prev) => [newIncome, ...prev]);
        setTransactions(nextTrx);
        setAccounts((prev) => recomputeAccountBalances(prev, nextTrx));
      } else {
        // Investment
        const invId = `inv-rec-${businessId}-${Date.now()}`;
        createdTx = {
          id: trxId,
          business_id: businessId,
          transaction_type: 'investment',
          description: `Recurring Investment: ${rec.name}`,
          reference: rec.reference || `REC-${rec.id.substring(0, 8)}`,
          category_id: rec.category_id || null,
          account_id: rec.account_id,
          client_id: null,
          amount: rec.amount,
          currency: rec.currency,
          exchange_rate: rec.exchange_rate,
          base_amount: baseAmt,
          base_currency: baseCurrency,
          transaction_date: scheduledDate,
          payment_method: 'Bank Transfer',
          status: 'completed',
          notes: rec.notes || `Generated from recurring template "${rec.name}"`,
          attachment_url: null,
          created_by: user?.id || null,
          created_at: nowISO,
          updated_at: nowISO,
        };

        const newInv: Investment = {
          id: invId,
          business_id: businessId,
          category_id: rec.category_id || null,
          account_id: rec.account_id,
          transaction_id: trxId,
          name: rec.name,
          amount: rec.amount,
          currency: rec.currency,
          exchange_rate: rec.exchange_rate,
          base_amount: baseAmt,
          base_currency: baseCurrency,
          investment_date: scheduledDate,
          expected_return: null,
          notes: rec.notes || `Generated from recurring template "${rec.name}"`,
          attachment_url: null,
          created_by: user?.id || null,
          created_at: nowISO,
          updated_at: nowISO,
        };

        const nextTrx = [createdTx, ...transactions];
        setInvestments((prev) => [newInv, ...prev]);
        setTransactions(nextTrx);
        setAccounts((prev) => recomputeAccountBalances(prev, nextTrx));
      }

      // Record successful run
      const runRecord: RecurringTransactionRun = {
        id: `run-${businessId}-${Date.now()}`,
        business_id: businessId,
        recurring_transaction_id: rec.id,
        scheduled_date: scheduledDate,
        transaction_id: trxId,
        status: 'success',
        error_message: null,
        created_at: nowISO,
      };
      setRecurringRuns((prev) => [runRecord, ...prev]);

      // Calculate next scheduled run date
      const nextResult = calculateNextRunDate(rec.next_run_date, rec.frequency, rec.end_date);
      setRecurringTransactions((prev) =>
        prev.map((r) =>
          r.id === rec.id
            ? {
                ...r,
                last_run_at: nowISO,
                next_run_date: nextResult.nextRunDate,
                status: nextResult.isCompleted ? 'Completed' : r.status,
                is_active: nextResult.isCompleted ? false : r.is_active,
                updated_at: nowISO,
              }
            : r
        )
      );

      addNotification({
        title: 'Recurring Transaction Executed',
        message: `Successfully executed "${rec.name}" (${rec.amount} ${rec.currency}). Next scheduled run: ${nextResult.nextRunDate}`,
        type: 'finance',
      });

      return { success: true, transaction: createdTx, run: runRecord };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // Batch process all due recurring transactions
  const processDueRecurringTransactions = async (): Promise<{
    success: boolean;
    processed: number;
    successful: number;
    failed: number;
    error?: string;
  }> => {
    try {
      const today = getTodayDate();
      const dueItems = recurringTransactions.filter(
        (r) => r.is_active && r.status === 'Active' && r.next_run_date <= today
      );

      let processed = 0;
      let successful = 0;
      let failed = 0;

      for (const rec of dueItems) {
        processed++;
        const res = await runRecurringTransactionNow(rec.id);
        if (res.success) {
          successful++;
        } else {
          failed++;
        }
      }

      if (processed > 0) {
        addNotification({
          title: 'Automated Processing Complete',
          message: `Processed ${processed} due recurring transaction(s): ${successful} successful, ${failed} skipped or failed.`,
          type: 'finance',
        });
      }

      return { success: true, processed, successful, failed };
    } catch (err: any) {
      return { success: false, processed: 0, successful: 0, failed: 0, error: err.message };
    }
  };

  // SETTINGS
  const updateFinanceSettings = async (
    updates: Partial<BusinessFinanceSettings>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (financeSettings) {
        setFinanceSettings({
          ...financeSettings,
          ...updates,
          updated_at: new Date().toISOString(),
        });
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // CSV EXPORTS
  const downloadCSV = (filename: string, csvContent: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportTransactionsCSV = () => {
    const headers = [
      'Date',
      'Type',
      'Description',
      'Reference',
      'Account',
      'Amount',
      'Currency',
      'Exchange Rate',
      'Base Amount (PKR)',
      'Payment Method',
      'Status',
    ];
    const rows = filteredTransactions.map((t) => {
      const acc = accounts.find((a) => a.id === t.account_id);
      return [
        t.transaction_date,
        t.transaction_type,
        `"${(t.description || '').replace(/"/g, '""')}"`,
        t.reference || '',
        acc?.name || '',
        t.amount,
        t.currency,
        t.exchange_rate,
        t.base_amount,
        t.payment_method,
        t.status,
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    downloadCSV(`transactions_${businessId}_${getTodayDate()}.csv`, csv);
  };

  const exportInvoicesCSV = () => {
    const headers = [
      'Invoice Number',
      'Client',
      'Issue Date',
      'Due Date',
      'Status',
      'Subtotal',
      'Tax',
      'Discount',
      'Total',
      'Paid',
      'Balance Due',
      'Currency',
    ];
    const rows = filteredInvoices.map((inv) => {
      const client = clients.find((c) => c.id === inv.client_id);
      return [
        inv.invoice_number,
        `"${(client?.company_name || '').replace(/"/g, '""')}"`,
        inv.issue_date,
        inv.due_date,
        inv.status,
        inv.subtotal,
        inv.tax,
        inv.discount,
        inv.total,
        inv.paid_amount,
        inv.balance_due,
        inv.currency,
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    downloadCSV(`invoices_${businessId}_${getTodayDate()}.csv`, csv);
  };

  const exportPaymentsCSV = () => {
    const headers = [
      'Payment Number',
      'Client',
      'Invoice Number',
      'Payment Date',
      'Account',
      'Payment Method',
      'Reference',
      'Amount',
      'Currency',
      'Base Amount (PKR)',
      'Status',
      'Notes',
    ];
    const rows = filteredPayments.map((p) => {
      const client = clients.find((c) => c.id === p.client_id);
      const invoice = invoices.find((i) => i.id === p.invoice_id);
      const account = accounts.find((a) => a.id === p.account_id);
      return [
        p.payment_number,
        `"${(client?.company_name || '').replace(/"/g, '""')}"`,
        invoice?.invoice_number || 'Direct Deposit',
        p.payment_date,
        `"${(account?.name || '').replace(/"/g, '""')}"`,
        p.payment_method,
        `"${(p.reference || '').replace(/"/g, '""')}"`,
        p.amount,
        p.currency,
        p.base_amount || p.amount,
        p.status,
        `"${(p.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    downloadCSV(`payments_${businessId}_${getTodayDate()}.csv`, csv);
  };

  const exportReceivablesCSV = () => {
    const today = getTodayDate();
    const openInvoices = invoices.filter(
      (inv) => inv.status !== 'Paid' && inv.status !== 'Cancelled' && inv.balance_due > 0
    );
    const headers = [
      'Invoice Number',
      'Client',
      'Issue Date',
      'Due Date',
      'Total Amount',
      'Paid Amount',
      'Balance Due',
      'Currency',
      'Base Balance (PKR)',
      'Status',
      'Days Overdue',
    ];
    const rows = openInvoices.map((inv) => {
      const client = clients.find((c) => c.id === inv.client_id);
      const isOverdue = inv.due_date < today;
      const daysOverdue = isOverdue
        ? Math.max(
            0,
            Math.floor((new Date(today).getTime() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24))
          )
        : 0;
      const rate = inv.exchange_rate || getExchangeRate(inv.currency, baseCurrency);
      const baseBal = (Number(inv.balance_due) || 0) * rate;

      return [
        inv.invoice_number,
        `"${(client?.company_name || '').replace(/"/g, '""')}"`,
        inv.issue_date,
        inv.due_date,
        inv.total,
        inv.paid_amount,
        inv.balance_due,
        inv.currency,
        baseBal,
        isOverdue ? 'Overdue' : inv.status,
        daysOverdue,
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    downloadCSV(`receivables_${businessId}_${today}.csv`, csv);
  };

  const exportFinancialReport = (
    type: 'payments' | 'invoices' | 'transactions' | 'receivables' | 'expenses'
  ) => {
    if (type === 'payments') exportPaymentsCSV();
    else if (type === 'receivables') exportReceivablesCSV();
    else if (type === 'invoices') exportInvoicesCSV();
    else if (type === 'transactions') exportTransactionsCSV();
    else if (type === 'expenses') exportExpensesCSV();
  };

  const exportExpensesCSV = () => {
    const headers = [
      'Date',
      'Vendor',
      'Description',
      'Category',
      'Account',
      'Amount',
      'Currency',
      'Base Amount (PKR)',
      'Payment Method',
      'Reference',
    ];
    const rows = filteredExpenses.map((e) => {
      const cat = categories.find((c) => c.id === e.category_id);
      const acc = accounts.find((a) => a.id === e.account_id);
      return [
        e.expense_date,
        `"${(e.vendor || '').replace(/"/g, '""')}"`,
        `"${(e.description || '').replace(/"/g, '""')}"`,
        cat?.name || '',
        acc?.name || '',
        e.amount,
        e.currency,
        e.base_amount,
        e.payment_method,
        e.reference || '',
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    downloadCSV(`expenses_${businessId}_${getTodayDate()}.csv`, csv);
  };

  const getProfitAndLossReport = useCallback(
    (preset?: FinanceDateRange, customStart?: string, customEnd?: string): ProfitAndLossReport => {
      const activePreset = (preset || dateRange) as ReportDatePreset;
      return calculateProfitAndLoss({
        businessId,
        businessName: activeBusiness?.name || 'EcomHub Business',
        transactions,
        categories,
        preset: activePreset,
        customStartDate: customStart || customStartDate,
        customEndDate: customEnd || customEndDate,
        baseCurrency,
      });
    },
    [businessId, activeBusiness?.name, transactions, categories, dateRange, customStartDate, customEndDate, baseCurrency]
  );

  const exportPLCSV = (overrideReport?: ProfitAndLossReport) => {
    const report =
      overrideReport ||
      getProfitAndLossReport(dateRange as any, customStartDate, customEndDate);
    const csv = generateProfitLossCSV(report);
    downloadCSV(`profit_and_loss_${businessId}_${report.startDate}_to_${report.endDate}.csv`, csv);

    // Audit log
    addNotification({
      title: 'Financial Report Exported',
      message: `Profit & Loss statement (${report.periodLabel}) was exported to CSV.`,
      type: 'finance',
    });
  };

  return (
    <FinanceContext.Provider
      value={{
        accounts,
        categories,
        financeSettings,
        invoices,
        invoiceItems,
        payments,
        transactions,
        expenses,
        incomeRecords,
        investments,
        recurringTransactions,
        recurringRuns,
        isLoading,

        dateRange,
        setDateRange,
        customStartDate,
        setCustomStartDate,
        customEndDate,
        setCustomEndDate,

        filteredTransactions,
        filteredInvoices,
        filteredExpenses,
        filteredIncomeRecords,
        filteredInvestments,
        filteredPayments,

        metrics,

        createInvoice,
        updateInvoice,
        updateInvoiceStatus,
        cancelInvoice,
        deleteInvoice,

        recordPayment,
        cancelPayment,

        addExpense,
        updateExpense,
        deleteExpense,

        addIncome,

        addInvestment,

        addAccount,
        updateAccount,
        toggleAccountActive,

        addCategory,
        updateCategory,
        archiveCategory,

        addRecurringTransaction,
        updateRecurringTransaction,
        pauseRecurringTransaction,
        resumeRecurringTransaction,
        toggleRecurringActive,
        deleteRecurringTransaction,
        runRecurringTransactionNow,
        processDueRecurringTransactions,

        updateFinanceSettings,

        getProfitAndLossReport,
        exportTransactionsCSV,
        exportInvoicesCSV,
        exportPaymentsCSV,
        exportReceivablesCSV,
        exportExpensesCSV,
        exportPLCSV,
        exportFinancialReport,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
