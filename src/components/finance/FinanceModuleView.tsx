import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  FileText,
  CreditCard,
  TrendingDown,
  TrendingUp,
  Building2,
  Wallet,
  Tag,
  BarChart3,
  Plus,
  ChevronDown,
  Calendar,
  Globe,
  Lock,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { useFinance } from '../../lib/finance-context';
import { useCrm } from '../../lib/crm-context';
import { usePermissions } from '../../lib/use-permissions';
import { FinanceOverview } from './FinanceOverview';
import { TransactionsLedger } from './TransactionsLedger';
import { InvoicesList } from './InvoicesList';
import { InvoiceDetailView } from './InvoiceDetailView';
import { PaymentsList } from './PaymentsList';
import { AccountsReceivableView } from './AccountsReceivableView';
import { ExpensesView } from './ExpensesView';
import { IncomeView } from './IncomeView';
import { InvestmentsView } from './InvestmentsView';
import { AccountsView } from './AccountsView';
import { CategoriesView } from './CategoriesView';
import { ReportsView } from './ReportsView';
import { RecurringView } from './RecurringView';

// Modals
import { CreateInvoiceModal } from './modals/CreateInvoiceModal';
import { RecordPaymentModal } from './modals/RecordPaymentModal';
import { AddExpenseModal } from './modals/AddExpenseModal';
import { AddIncomeModal } from './modals/AddIncomeModal';
import { AddInvestmentModal } from './modals/AddInvestmentModal';
import { AddTransactionModal } from './modals/AddTransactionModal';
import { AddRecurringModal } from './modals/AddRecurringModal';

interface FinanceModuleViewProps {
  initialSubTab?: string;
  onSubTabChange?: (subTab: string) => void;
}

export const FinanceModuleView: React.FC<FinanceModuleViewProps> = ({
  initialSubTab,
  onSubTabChange,
}) => {
  const { invoices, recurringTransactions, metrics, dateRange, setDateRange } = useFinance();
  const { exchangeRates } = useCrm();
  const { can, role } = usePermissions();

  const canCreate = can('finance.create');
  const canEdit = can('finance.edit');
  const canDelete = can('finance.delete');

  const [activeTab, setActiveTab] = useState<string>(initialSubTab || 'overview');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  // Sync when initialSubTab changes from URL
  useEffect(() => {
    if (initialSubTab && initialSubTab !== activeTab) {
      setActiveTab(initialSubTab);
    }
  }, [initialSubTab]);

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    setSelectedInvoiceId(null);
    if (onSubTabChange) {
      onSubTabChange(tabId);
    } else {
      let newPath = '/finance';
      if (tabId === 'reports-profit-loss') {
        newPath = '/finance/reports/profit-loss';
      } else if (tabId !== 'overview') {
        newPath = `/finance/${tabId}`;
      }
      window.history.pushState({}, '', newPath);
    }
  };

  // Modal open states
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAddIncomeOpen, setIsAddIncomeOpen] = useState(false);
  const [isAddInvestmentOpen, setIsAddInvestmentOpen] = useState(false);
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isAddRecurringOpen, setIsAddRecurringOpen] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const pendingInvoicesCount = invoices.filter(
    (i) => i.balance_due > 0 && i.status !== 'Cancelled'
  ).length;
  const overdueInvoicesCount = invoices.filter(
    (i) => i.balance_due > 0 && i.status !== 'Cancelled' && i.due_date < todayStr
  ).length;
  const dueRecurringCount = recurringTransactions.filter(
    (r) => r.is_active && r.status === 'Active' && r.next_run_date <= todayStr
  ).length;

  const handleSelectInvoice = (id: string) => {
    setSelectedInvoiceId(id);
  };

  const handleBackToInvoices = () => {
    setSelectedInvoiceId(null);
  };

  const navTabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'transactions', label: 'Transactions', icon: Wallet },
    { id: 'expenses', label: 'Expenses', icon: TrendingDown },
    { id: 'income', label: 'Income', icon: TrendingUp },
    { id: 'recurring', label: 'Recurring', icon: RefreshCw, badge: dueRecurringCount },
    { id: 'accounts', label: 'Accounts', icon: Building2 },
    { id: 'categories', label: 'Categories', icon: Tag },
    { id: 'invoices', label: 'Invoices', icon: FileText, badge: pendingInvoicesCount },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'receivables', label: 'Receivables', icon: Clock, badge: overdueInvoicesCount },
    { id: 'investments', label: 'Investments', icon: Building2 },
    { id: 'reports', label: 'Reports', icon: DollarSign },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#4F46E5] bg-indigo-50 px-2.5 py-0.5 rounded-full">
              Phase 3 Business Finance & Invoicing
            </span>
            <span className="text-xs text-[#94A3B8]">•</span>
            <span className="text-xs font-mono text-[#64748B] flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-[#94A3B8]" />
              1 USD = {exchangeRates['USD']?.rate || 278.5} PKR
            </span>
          </div>
          <h1 className="text-xl font-black text-[#0F172A] tracking-tight mt-1">
            Finance & Treasury
          </h1>
          <p className="text-xs text-[#64748B]">
            Unified financial ledger, multi-currency invoicing, expenses, cash flow & capital allocation.
          </p>
        </div>

        {/* Global Controls: Date Range & Quick Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Period preset selector */}
          <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-2.5 py-1.5 text-xs text-[#0F172A] font-medium">
            <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
            <select
              value={dateRange.preset}
              onChange={(e) => setDateRange({ ...dateRange, preset: e.target.value as any })}
              className="bg-transparent border-none text-xs font-semibold text-[#0F172A] focus:outline-none cursor-pointer"
            >
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_quarter">This Quarter</option>
              <option value="this_year">This Year</option>
              <option value="all">All Records</option>
            </select>
          </div>

          {/* New Transaction / Actions Dropdown (Layer 1 Action-level RBAC: Hidden if user lacks finance.create) */}
          {canCreate ? (
            <div className="relative">
              <button
                id="finance-new-entry-dropdown-btn"
                onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-xl shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>New Entry</span>
                <ChevronDown className="w-3.5 h-3.5 ml-0.5 opacity-80" />
              </button>

              {isQuickActionsOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-[#E2E8F0] shadow-xl py-1.5 z-30 text-xs animate-in fade-in"
                  onClick={() => setIsQuickActionsOpen(false)}
                >
                  <button
                    onClick={() => setIsAddTransactionOpen(true)}
                    className="w-full text-left px-3.5 py-2 hover:bg-[#F8FAFC] font-medium text-[#0F172A] flex items-center gap-2"
                  >
                    <DollarSign className="w-4 h-4 text-[#4F46E5]" />
                    <span>General Ledger Entry</span>
                  </button>
                  <div className="border-t border-[#F1F5F9] my-1" />
                  <button
                    onClick={() => setIsCreateInvoiceOpen(true)}
                    className="w-full text-left px-3.5 py-2 hover:bg-[#F8FAFC] font-medium text-[#0F172A] flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span>Create Invoice</span>
                  </button>
                  <button
                    onClick={() => setIsRecordPaymentOpen(true)}
                    className="w-full text-left px-3.5 py-2 hover:bg-[#F8FAFC] font-medium text-[#0F172A] flex items-center gap-2"
                  >
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    <span>Record Client Payment</span>
                  </button>
                  <button
                    onClick={() => setIsAddExpenseOpen(true)}
                    className="w-full text-left px-3.5 py-2 hover:bg-[#F8FAFC] font-medium text-[#0F172A] flex items-center gap-2"
                  >
                    <TrendingDown className="w-4 h-4 text-rose-600" />
                    <span>Add Expense</span>
                  </button>
                  <button
                    onClick={() => setIsAddIncomeOpen(true)}
                    className="w-full text-left px-3.5 py-2 hover:bg-[#F8FAFC] font-medium text-[#0F172A] flex items-center gap-2"
                  >
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span>Record Direct Income</span>
                  </button>
                  <button
                    onClick={() => setIsAddInvestmentOpen(true)}
                    className="w-full text-left px-3.5 py-2 hover:bg-[#F8FAFC] font-medium text-[#0F172A] flex items-center gap-2"
                  >
                    <Building2 className="w-4 h-4 text-purple-600" />
                    <span>Record Capital Investment</span>
                  </button>
                  <div className="border-t border-[#F1F5F9] my-1" />
                  <button
                    onClick={() => setIsAddRecurringOpen(true)}
                    className="w-full text-left px-3.5 py-2 hover:bg-[#F8FAFC] font-medium text-[#0F172A] flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4 text-[#4F46E5]" />
                    <span>Schedule Recurring Transaction</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs font-medium">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Read-only Mode ({role || 'Viewer'})</span>
            </div>
          )}
        </div>
      </div>

      {/* Sub-Navigation Bar */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-1.5 flex items-center gap-1 overflow-x-auto">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            (activeTab === tab.id || (tab.id === 'reports' && activeTab === 'reports-profit-loss')) &&
            !selectedInvoiceId;

          return (
            <button
              key={tab.id}
              id={`finance-tab-${tab.id}`}
              onClick={() => handleTabClick(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-[#4F46E5] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content Display */}
      <div>
        {selectedInvoiceId ? (
          <InvoiceDetailView invoiceId={selectedInvoiceId} onBack={handleBackToInvoices} />
        ) : (
          <>
            {activeTab === 'overview' && (
              <FinanceOverview
                onNavigateTab={(tab) => handleTabClick(tab)}
                onOpenCreateInvoice={() => setIsCreateInvoiceOpen(true)}
                onOpenRecordPayment={() => setIsRecordPaymentOpen(true)}
                onOpenAddExpense={() => setIsAddExpenseOpen(true)}
                onSelectInvoice={handleSelectInvoice}
              />
            )}

            {activeTab === 'transactions' && (
              <TransactionsLedger
                onOpenAddTransaction={() => setIsAddTransactionOpen(true)}
              />
            )}

            {activeTab === 'invoices' && (
              <InvoicesList
                onSelectInvoice={handleSelectInvoice}
                onOpenCreateInvoice={() => setIsCreateInvoiceOpen(true)}
              />
            )}

            {activeTab === 'payments' && (
              <PaymentsList
                onOpenRecordPayment={() => setIsRecordPaymentOpen(true)}
                onSelectInvoice={handleSelectInvoice}
              />
            )}

            {activeTab === 'receivables' && (
              <AccountsReceivableView
                onSelectInvoice={handleSelectInvoice}
              />
            )}

            {activeTab === 'expenses' && (
              <ExpensesView onOpenAddExpense={() => setIsAddExpenseOpen(true)} />
            )}

            {activeTab === 'income' && (
              <IncomeView onOpenAddIncome={() => setIsAddIncomeOpen(true)} />
            )}

            {activeTab === 'investments' && (
              <InvestmentsView onOpenAddInvestment={() => setIsAddInvestmentOpen(true)} />
            )}

            {activeTab === 'recurring' && <RecurringView />}

            {activeTab === 'accounts' && <AccountsView />}

            {activeTab === 'categories' && <CategoriesView />}

            {(activeTab === 'reports' || activeTab === 'reports-profit-loss') && (
              <ReportsView
                initialReport={activeTab === 'reports-profit-loss' ? 'profit-loss' : 'hub'}
                onNavigateTab={(t) => handleTabClick(t)}
                onNavigatePath={(path) => {
                  if (path === '/finance/reports/profit-loss') {
                    handleTabClick('reports-profit-loss');
                  } else if (path === '/finance/reports') {
                    handleTabClick('reports');
                  } else if (path === '/finance/receivables') {
                    handleTabClick('receivables');
                  } else {
                    window.history.pushState({}, '', path);
                  }
                }}
              />
            )}
          </>
        )}
      </div>

      {/* Global Modals */}
      {isCreateInvoiceOpen && (
        <CreateInvoiceModal
          isOpen={isCreateInvoiceOpen}
          onClose={() => setIsCreateInvoiceOpen(false)}
        />
      )}

      {isRecordPaymentOpen && (
        <RecordPaymentModal
          isOpen={isRecordPaymentOpen}
          onClose={() => setIsRecordPaymentOpen(false)}
        />
      )}

      {isAddExpenseOpen && (
        <AddExpenseModal
          isOpen={isAddExpenseOpen}
          onClose={() => setIsAddExpenseOpen(false)}
        />
      )}

      {isAddIncomeOpen && (
        <AddIncomeModal
          isOpen={isAddIncomeOpen}
          onClose={() => setIsAddIncomeOpen(false)}
        />
      )}

      {isAddInvestmentOpen && (
        <AddInvestmentModal
          isOpen={isAddInvestmentOpen}
          onClose={() => setIsAddInvestmentOpen(false)}
        />
      )}

      {isAddTransactionOpen && (
        <AddTransactionModal
          isOpen={isAddTransactionOpen}
          onClose={() => setIsAddTransactionOpen(false)}
        />
      )}

      {isAddRecurringOpen && (
        <AddRecurringModal
          isOpen={isAddRecurringOpen}
          onClose={() => setIsAddRecurringOpen(false)}
        />
      )}
    </div>
  );
};
