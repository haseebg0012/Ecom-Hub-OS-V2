/**
 * EcomHub OS — Phase 3 Finance Types
 * Product: EcomHub OS | Tagline: Your Business, One Hub.
 */

import { Profile, Client } from './index';

export type TransactionType =
  | 'income'
  | 'expense'
  | 'investment'
  | 'refund'
  | 'transfer'
  | 'Income'
  | 'Expense'
  | 'Investment'
  | 'Refund'
  | 'Transfer';
export type TransactionStatus = 'pending' | 'completed' | 'cancelled';
export type PaymentMethod = 'Cash' | 'Bank Transfer' | 'Card' | 'Online Payment' | 'Other';

export type InvoiceStatus = 'Draft' | 'Sent' | 'Partially Paid' | 'Paid' | 'Overdue' | 'Cancelled';
export type PaymentStatus = 'Completed' | 'Pending' | 'Failed' | 'Refunded' | 'Cancelled' | 'cancelled';

export type FinancialAccountType = 'Cash' | 'Bank' | 'Digital Wallet' | 'Payment Gateway' | 'Other';
export type AccountType = FinancialAccountType;
export type FinancialCategoryType = 'Income' | 'Expense' | 'Investment';
export type CategoryType = FinancialCategoryType;
export type RecurringFrequency =
  | 'Daily'
  | 'Weekly'
  | 'Bi-weekly'
  | 'Monthly'
  | 'Quarterly'
  | 'Yearly'
  | 'daily'
  | 'weekly'
  | 'bi-weekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

export type FinanceDateRange =
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'last_quarter'
  | 'this_year'
  | 'last_year'
  | 'all'
  | 'custom';

export interface FinancialAccount {
  id: string;
  business_id: string;
  name: string;
  type: FinancialAccountType;
  currency: string; // 'PKR' | 'USD'
  opening_balance: number;
  current_balance: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FinancialCategory {
  id: string;
  business_id: string;
  name: string;
  type: FinancialCategoryType;
  color?: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessFinanceSettings {
  id: string;
  business_id: string;
  base_currency: string; // 'PKR' | 'USD'
  default_invoice_currency: string;
  default_payment_terms: string;
  default_tax_rate: number;
  invoice_prefix: string;
  next_invoice_number: number;
  payment_prefix: string;
  next_payment_number: number;
  default_account_id: string | null;
  financial_year_start: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  business_id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  created_at: string;
}

export interface Invoice {
  id: string;
  business_id: string;
  client_id: string;
  client?: Client | null;
  invoice_number: string;
  issue_date: string; // YYYY-MM-DD
  due_date: string; // YYYY-MM-DD
  status: InvoiceStatus;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paid_amount: number;
  balance_due: number;
  currency: string; // 'USD' | 'PKR'
  exchange_rate: number;
  base_total: number;
  base_currency: string;
  notes: string | null;
  terms: string | null;
  items?: InvoiceItem[];
  created_by: string | null;
  created_by_profile?: Profile | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  business_id: string;
  invoice_id: string | null;
  invoice?: Invoice | null;
  client_id: string;
  client?: Client | null;
  account_id: string;
  account?: FinancialAccount | null;
  payment_number: string;
  amount: number;
  currency: string;
  exchange_rate: number;
  base_amount: number;
  base_currency: string;
  payment_date: string; // YYYY-MM-DD
  payment_method: PaymentMethod;
  reference: string | null;
  transaction_id?: string | null;
  status: PaymentStatus;
  cancellation_reason?: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  business_id: string;
  transaction_type: TransactionType;
  description: string;
  reference: string | null;
  category_id: string | null;
  category?: FinancialCategory | null;
  account_id: string;
  account?: FinancialAccount | null;
  client_id: string | null;
  client?: Client | null;
  amount: number;
  currency: string;
  exchange_rate: number;
  base_amount: number;
  base_currency: string;
  transaction_date: string; // YYYY-MM-DD
  payment_method: PaymentMethod;
  status: TransactionStatus;
  notes: string | null;
  attachment_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  business_id: string;
  category_id: string | null;
  category?: FinancialCategory | null;
  account_id: string;
  account?: FinancialAccount | null;
  transaction_id: string | null;
  amount: number;
  currency: string;
  exchange_rate: number;
  base_amount: number;
  base_currency: string;
  vendor: string;
  description: string;
  expense_date: string; // YYYY-MM-DD
  payment_method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  attachment_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncomeRecord {
  id: string;
  business_id: string;
  client_id: string | null;
  client?: Client | null;
  category_id: string | null;
  category?: FinancialCategory | null;
  account_id: string;
  account?: FinancialAccount | null;
  transaction_id: string | null;
  amount: number;
  currency: string;
  exchange_rate: number;
  base_amount: number;
  base_currency: string;
  source: string;
  income_date: string; // YYYY-MM-DD
  payment_method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Investment {
  id: string;
  business_id: string;
  category_id: string | null;
  category?: FinancialCategory | null;
  account_id: string;
  account?: FinancialAccount | null;
  transaction_id: string | null;
  name: string;
  title?: string;
  amount: number;
  currency: string;
  exchange_rate: number;
  base_amount: number;
  base_currency: string;
  investment_date: string; // YYYY-MM-DD
  expected_return: string | null;
  notes: string | null;
  attachment_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type RecurringTransactionType = 'income' | 'expense' | 'investment';
export type RecurringStatus = 'Active' | 'Paused' | 'Completed';

export interface RecurringTransaction {
  id: string;
  business_id: string;
  name: string;
  description?: string | null;
  transaction_type: RecurringTransactionType;
  type?: 'income' | 'expense' | 'investment'; // Backward compatibility
  category_id: string | null;
  category?: FinancialCategory | null;
  account_id: string;
  account?: FinancialAccount | null;
  client_id?: string | null;
  client?: Client | null;
  amount: number;
  currency: string;
  exchange_rate: number;
  base_currency: string;
  base_amount: number;
  frequency: RecurringFrequency;
  start_date: string;
  end_date: string | null;
  next_run_date: string;
  payment_method?: PaymentMethod | string | null;
  reference?: string | null;
  notes?: string | null;
  is_active: boolean;
  status: RecurringStatus;
  last_run_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecurringTransactionRun {
  id: string;
  business_id: string;
  recurring_transaction_id: string;
  scheduled_date: string; // YYYY-MM-DD
  transaction_id: string | null;
  status: 'success' | 'failed';
  error_message?: string | null;
  created_at: string;
}

export interface FinancialMetrics {
  totalRevenue: number; // in Base Currency
  totalExpenses: number; // in Base Currency
  operatingProfit: number; // Revenue - Operating Expenses
  netProfit: number; // Alias for operatingProfit
  totalInvestments: number; // Capital investments
  netCashAfterInvestment: number; // Operating Profit - Investments
  outstandingReceivables: number; // Total unpaid invoice balance
  overdueReceivables: number;
  overdueAmount: number; // Alias for overdueReceivables
  cashBalance: number; // Sum of current cash accounts
  totalCashBalance: number; // Alias for cashBalance
  baseCurrency: string;
}

export type FinanceSubNav =
  | 'overview'
  | 'transactions'
  | 'invoices'
  | 'payments'
  | 'expenses'
  | 'income'
  | 'investments'
  | 'recurring'
  | 'accounts'
  | 'categories'
  | 'reports';
