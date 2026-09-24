import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  FileText,
  Clock,
  CheckCircle2,
  Building2,
  Plus,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { useFinance } from '../../lib/finance-context';
import { useCrm } from '../../lib/crm-context';
import {
  RevenueExpenseBarChart,
  ProfitTrendLineChart,
  CategoryDonutChart,
  ClientRevenueBarChart,
} from './FinancialCharts';

interface FinanceOverviewProps {
  onNavigateTab: (tab: string) => void;
  onOpenCreateInvoice: () => void;
  onOpenRecordPayment: () => void;
  onOpenAddExpense: () => void;
  onSelectInvoice: (invoiceId: string) => void;
}

export const FinanceOverview: React.FC<FinanceOverviewProps> = ({
  onNavigateTab,
  onOpenCreateInvoice,
  onOpenRecordPayment,
  onOpenAddExpense,
  onSelectInvoice,
}) => {
  const {
    metrics,
    invoices,
    transactions,
    categories,
    accounts,
    recurringTransactions,
    dateRange,
    baseCurrency,
    getProfitAndLossReport,
  } = useFinance();
  const { clients } = useCrm();

  const isNetProfitPositive = (metrics?.netProfit ?? metrics?.operatingProfit ?? 0) >= 0;

  // Authoritative Current Month Report via shared calculation engine
  const currentMonthReport = React.useMemo(() => {
    return getProfitAndLossReport ? getProfitAndLossReport('this_month') : null;
  }, [getProfitAndLossReport]);

  // Use authoritative trend data if available, or fallback to distributed buckets
  const barChartData = React.useMemo(() => {
    if (currentMonthReport?.monthlyTrend && currentMonthReport.monthlyTrend.length > 0) {
      return currentMonthReport.monthlyTrend.map((m) => ({
        label: m.label,
        revenue: m.revenue,
        expenses: m.expenses,
      }));
    }
    return [
      { label: 'W1', revenue: Math.round((metrics?.totalRevenue || 0) * 0.2), expenses: Math.round((metrics?.totalExpenses || 0) * 0.25) },
      { label: 'W2', revenue: Math.round((metrics?.totalRevenue || 0) * 0.3), expenses: Math.round((metrics?.totalExpenses || 0) * 0.3) },
      { label: 'W3', revenue: Math.round((metrics?.totalRevenue || 0) * 0.25), expenses: Math.round((metrics?.totalExpenses || 0) * 0.2) },
      { label: 'W4', revenue: Math.round((metrics?.totalRevenue || 0) * 0.25), expenses: Math.round((metrics?.totalExpenses || 0) * 0.25) },
    ];
  }, [currentMonthReport, metrics]);

  const trendData = React.useMemo(() => {
    if (currentMonthReport?.monthlyTrend && currentMonthReport.monthlyTrend.length > 0) {
      return currentMonthReport.monthlyTrend.map((m) => ({
        label: m.label,
        profit: m.profit,
      }));
    }
    return [
      { label: 'W1', profit: Math.round((metrics?.netProfit ?? metrics?.operatingProfit ?? 0) * 0.2) },
      { label: 'W2', profit: Math.round((metrics?.netProfit ?? metrics?.operatingProfit ?? 0) * 0.3) },
      { label: 'W3', profit: Math.round((metrics?.netProfit ?? metrics?.operatingProfit ?? 0) * 0.25) },
      { label: 'W4', profit: Math.round((metrics?.netProfit ?? metrics?.operatingProfit ?? 0) * 0.25) },
    ];
  }, [currentMonthReport, metrics]);

  // Prepare category donut data from active expenses
  const categoryMap = new Map<string, { label: string; value: number; color: string }>();
  transactions
    .filter((t) => t.type === 'Expense' && t.status === 'Completed')
    .forEach((t) => {
      const cat = categories.find((c) => c.id === t.category_id);
      const label = cat?.name || 'General Expense';
      const color = cat?.color || '#64748B';
      const current = categoryMap.get(label) || { label, value: 0, color };
      current.value += t.base_amount || t.amount;
      categoryMap.set(label, current);
    });

  const categorySlices = Array.from(categoryMap.values()).sort((a, b) => b.value - a.value);

  // Prepare client revenue data
  const clientRevenueMap = new Map<string, number>();
  invoices
    .filter((inv) => inv.status !== 'Cancelled')
    .forEach((inv) => {
      const client = clients.find((c) => c.id === inv.client_id);
      const name = client?.company_name || 'Client';
      const paid = inv.paid_amount || 0;
      clientRevenueMap.set(name, (clientRevenueMap.get(name) || 0) + paid);
    });

  const topClients = Array.from(clientRevenueMap.entries())
    .map(([clientName, amount]) => ({
      clientName,
      amount,
      percentage: metrics.totalRevenue > 0 ? Math.round((amount / metrics.totalRevenue) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const recentInvoices = invoices.slice(0, 5);
  const recentTransactions = transactions.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Financial Reports & Profit/Loss Quick Navigation Banner (Requirement 17) */}
      <div className="bg-gradient-to-r from-[#EEF2FF] via-white to-[#F8FAFC] p-4 sm:p-5 rounded-2xl border border-[#C7D2FE] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#4F46E5] text-white flex items-center justify-center shrink-0 shadow-xs">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#0F172A]">
                Financial Reports & Intelligence
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">
                P&L LIVE
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              {currentMonthReport
                ? `Current Month P&L: Rev PKR ${currentMonthReport.revenue.totalRevenue.toLocaleString()} • OpEx PKR ${currentMonthReport.expenses.totalExpenses.toLocaleString()} • Net ${currentMonthReport.netProfit >= 0 ? '+' : ''}PKR ${currentMonthReport.netProfit.toLocaleString()} (${currentMonthReport.profitMargin !== null ? `${currentMonthReport.profitMargin}%` : '0%'} margin)`
                : 'Authoritative Profit & Loss statements, expense category distributions, and multi-currency compliance.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            id="overview-open-reports-hub-btn"
            onClick={() => onNavigateTab('reports')}
            className="px-3 py-1.5 text-xs font-semibold text-[#4F46E5] bg-white hover:bg-[#F8FAFC] border border-[#C7D2FE] rounded-xl transition-colors"
          >
            All Reports
          </button>
          <button
            id="overview-open-profit-loss-btn"
            onClick={() => onNavigateTab('reports-profit-loss')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-xl shadow-xs transition-colors"
          >
            <span>Profit & Loss Statement</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 6 Core Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* Total Revenue */}
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              Total Revenue
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-[#0F172A] mt-2 tracking-tight">
            PKR {(metrics?.totalRevenue ?? 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-[#64748B] mt-1">Paid receipts in period</p>
        </div>

        {/* Total Operating Expenses */}
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              Total Expenses
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-[#0F172A] mt-2 tracking-tight">
            PKR {(metrics?.totalExpenses ?? 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-[#64748B] mt-1">Operating overhead</p>
        </div>

        {/* Net Operating Profit */}
        <div
          className={`p-4 rounded-2xl border shadow-xs ${
            isNetProfitPositive
              ? 'bg-gradient-to-br from-white to-emerald-50/40 border-emerald-200/80'
              : 'bg-gradient-to-br from-white to-rose-50/40 border-rose-200/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              Net Operating Profit
            </span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isNetProfitPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p
            className={`text-xl font-bold mt-2 tracking-tight ${
              isNetProfitPositive ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            PKR {(metrics?.netProfit ?? metrics?.operatingProfit ?? 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-[#64748B] mt-1">
            Margin:{' '}
            <span className="font-semibold text-[#0F172A]">
              {(metrics?.totalRevenue || 0) > 0
                ? `${Math.round(((metrics?.netProfit ?? metrics?.operatingProfit ?? 0) / metrics.totalRevenue) * 100)}%`
                : '0%'}
            </span>
          </p>
        </div>

        {/* Outstanding Receivables */}
        <div
          onClick={() => onNavigateTab('receivables')}
          className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs cursor-pointer hover:border-amber-300 hover:shadow-sm transition-all"
          title="Click to view Accounts Receivable analysis"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              Receivables
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-[#0F172A] mt-2 tracking-tight">
            PKR {(metrics?.outstandingReceivables ?? 0).toLocaleString()}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            {(metrics?.overdueAmount ?? metrics?.overdueReceivables ?? 0) > 0 ? (
              <span className="text-[11px] font-medium text-rose-600 flex items-center gap-0.5">
                <AlertCircle className="w-3 h-3" />
                PKR {(metrics?.overdueAmount ?? metrics?.overdueReceivables ?? 0).toLocaleString()} overdue
              </span>
            ) : (
              <span className="text-[11px] text-[#64748B]">0 overdue invoices</span>
            )}
          </div>
        </div>

        {/* Capital Investments */}
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              Investments
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-[#0F172A] mt-2 tracking-tight">
            PKR {(metrics?.totalInvestments ?? 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-[#64748B] mt-1">Hardware & CapEx</p>
        </div>

        {/* Cash Balance */}
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              Total Cash
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-[#0F172A] mt-2 tracking-tight">
            PKR {(metrics?.totalCashBalance ?? metrics?.cashBalance ?? 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-[#64748B] mt-1">{accounts.length} active accounts</p>
        </div>
      </div>

      {/* Recurring Transactions & Overhead Automation Insight */}
      {recurringTransactions && recurringTransactions.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-50/60 via-white to-slate-50 border border-indigo-100/80 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-[#4F46E5] flex items-center justify-center shrink-0">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-[#0F172A] tracking-tight">
                  Recurring Financial Automation
                </h4>
                <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-[#4F46E5] text-white">
                  {recurringTransactions.filter((r) => r.is_active && r.status === 'Active').length} Active
                </span>
              </div>
              <p className="text-[11px] text-[#64748B] mt-0.5">
                Automating SaaS subscriptions, rent, and client retainers with server-side idempotent execution.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('recurring')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#4F46E5] bg-white border border-indigo-200 hover:bg-indigo-50/50 rounded-xl transition-colors shrink-0 shadow-2xs"
          >
            <span>View Recurring Schedules</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Charts Section: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue vs Expenses */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A] tracking-tight">Revenue vs. Expenses</h3>
              <p className="text-xs text-[#64748B]">Cash generation vs overhead outflow</p>
            </div>
          </div>
          <RevenueExpenseBarChart data={barChartData} currencySymbol="PKR" />
        </div>

        {/* Profit Trend */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A] tracking-tight">Profit Trend</h3>
              <p className="text-xs text-[#64748B]">Net operating profit over selected period</p>
            </div>
          </div>
          <ProfitTrendLineChart data={trendData} currencySymbol="PKR" />
        </div>
      </div>

      {/* Secondary Charts: Expense Breakdown & Revenue by Client */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A] tracking-tight">Expense Breakdown</h3>
              <p className="text-xs text-[#64748B]">Operating expenditure distributed by category</p>
            </div>
            <button
              onClick={() => onNavigateTab('expenses')}
              className="text-xs font-semibold text-[#4F46E5] hover:text-[#4338CA]"
            >
              View All
            </button>
          </div>
          <CategoryDonutChart
            slices={categorySlices}
            totalAmount={metrics.totalExpenses}
            currencySymbol="PKR"
          />
        </div>

        {/* Revenue by Client */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A] tracking-tight">Top Revenue by Client</h3>
              <p className="text-xs text-[#64748B]">Client accounts ranked by collected cash</p>
            </div>
            <button
              onClick={() => onNavigateTab('invoices')}
              className="text-xs font-semibold text-[#4F46E5] hover:text-[#4338CA]"
            >
              View Invoices
            </button>
          </div>
          <ClientRevenueBarChart clients={topClients} currencySymbol="PKR" />
        </div>
      </div>

      {/* Recent Activity: Recent Invoices & Recent Transactions Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#4F46E5]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                Recent Invoices
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenCreateInvoice}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#4F46E5] hover:text-[#4338CA]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create</span>
              </button>
              <button
                onClick={() => onNavigateTab('invoices')}
                className="text-xs font-semibold text-[#64748B] hover:text-[#0F172A]"
              >
                View all
              </button>
            </div>
          </div>

          <div className="divide-y divide-[#E2E8F0]">
            {recentInvoices.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#94A3B8]">No invoices created yet.</div>
            ) : (
              recentInvoices.map((inv) => {
                const client = clients.find((c) => c.id === inv.client_id);
                return (
                  <div
                    key={inv.id}
                    onClick={() => onSelectInvoice(inv.id)}
                    className="p-3 hover:bg-[#F8FAFC] transition-colors flex items-center justify-between cursor-pointer text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#0F172A]">{inv.invoice_number}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            inv.status === 'Paid'
                              ? 'bg-emerald-50 text-emerald-700'
                              : inv.status === 'Partially Paid'
                              ? 'bg-sky-50 text-sky-700'
                              : inv.status === 'Overdue'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#64748B] mt-0.5 truncate max-w-[200px]">
                        {client?.company_name || 'Client'} • Due {inv.due_date}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-[#0F172A]">
                        {inv.currency} {(inv.total_amount || 0).toLocaleString()}
                      </span>
                      {inv.balance_due > 0 && (
                        <p className="text-[10px] text-rose-600 font-medium">
                          Bal: {inv.currency} {(inv.balance_due || 0).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Ledger Transactions */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-[#4F46E5]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                Recent Ledger Activity
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenAddExpense}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#4F46E5] hover:text-[#4338CA]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Expense</span>
              </button>
              <button
                onClick={() => onNavigateTab('transactions')}
                className="text-xs font-semibold text-[#64748B] hover:text-[#0F172A]"
              >
                View ledger
              </button>
            </div>
          </div>

          <div className="divide-y divide-[#E2E8F0]">
            {recentTransactions.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#94A3B8]">No transactions recorded yet.</div>
            ) : (
              recentTransactions.map((tx) => {
                const isIncome = tx.type === 'Income';
                const isExpense = tx.type === 'Expense';
                return (
                  <div
                    key={tx.id}
                    className="p-3 hover:bg-[#F8FAFC] transition-colors flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isIncome
                            ? 'bg-emerald-50 text-emerald-600'
                            : isExpense
                            ? 'bg-rose-50 text-rose-600'
                            : 'bg-indigo-50 text-indigo-600'
                        }`}
                      >
                        {isIncome ? (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-[#0F172A] truncate max-w-[220px]">
                          {tx.description}
                        </p>
                        <p className="text-[10px] text-[#64748B]">
                          {tx.transaction_date} • {tx.payment_method}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`font-bold ${
                          isIncome ? 'text-emerald-600' : isExpense ? 'text-rose-600' : 'text-[#0F172A]'
                        }`}
                      >
                        {isIncome ? '+' : '-'} {tx.currency} {(tx.amount || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
