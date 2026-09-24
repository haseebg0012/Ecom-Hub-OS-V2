import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  Wallet,
  Clock,
  CheckCircle2,
  ArrowRight,
  BarChart3,
  PieChart,
  ShieldCheck,
  Building2,
  Percent,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useFinance } from '../../lib/finance-context';
import { useAuth } from '../../lib/auth-context';
import { ProfitLossReportView } from './ProfitLossReportView';
import { calculateProfitAndLoss } from '../../lib/financial-reports-service';

interface ReportsViewProps {
  initialReport?: 'hub' | 'profit-loss';
  onNavigateTab?: (tab: string) => void;
  onNavigatePath?: (path: string) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  initialReport = 'hub',
  onNavigateTab,
  onNavigatePath,
}) => {
  const {
    transactions,
    categories,
    baseCurrency,
    invoices,
    expenses,
    metrics,
    exportPLCSV,
  } = useFinance();
  const { activeBusiness } = useAuth();

  const [activeReportView, setActiveReportView] = useState<'hub' | 'profit-loss'>(
    initialReport === 'profit-loss' ? 'profit-loss' : 'hub'
  );

  // Synchronize when initialReport prop changes (e.g. via direct URL navigation)
  React.useEffect(() => {
    if (initialReport === 'profit-loss') {
      setActiveReportView('profit-loss');
    } else if (initialReport === 'hub') {
      setActiveReportView('hub');
    }
  }, [initialReport]);

  // Compute current month benchmark using shared calculation layer
  const currentMonthReport = useMemo(() => {
    return calculateProfitAndLoss({
      businessId: activeBusiness?.id || 'biz-ecometrix-001',
      businessName: activeBusiness?.name || 'EcomHub Business',
      transactions,
      categories,
      preset: 'this_month',
      baseCurrency,
    });
  }, [activeBusiness?.id, activeBusiness?.name, transactions, categories, baseCurrency]);

  const handleOpenProfitLoss = () => {
    setActiveReportView('profit-loss');
    if (onNavigatePath) {
      onNavigatePath('/finance/reports/profit-loss');
    } else if (onNavigateTab) {
      onNavigateTab('reports-profit-loss');
    }
  };

  const handleBackToHub = () => {
    setActiveReportView('hub');
    if (onNavigatePath) {
      onNavigatePath('/finance/reports');
    } else if (onNavigateTab) {
      onNavigateTab('reports');
    }
  };

  const handleOpenReceivables = () => {
    if (onNavigatePath) {
      onNavigatePath('/finance/receivables');
    } else if (onNavigateTab) {
      onNavigateTab('receivables');
    }
  };

  // If viewing Profit & Loss Report
  if (activeReportView === 'profit-loss') {
    return (
      <ProfitLossReportView
        onBackToReports={handleBackToHub}
        onNavigateTab={onNavigateTab}
      />
    );
  }

  // Format currency helpers
  const fmt = (n: number) => {
    return (Number(n) || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <nav className="flex items-center gap-2 text-xs text-[#64748B] mb-1 font-medium">
            <button
              id="reports-hub-breadcrumb-finance"
              onClick={() => onNavigateTab?.('overview')}
              className="hover:text-[#4F46E5] transition-colors"
            >
              Finance
            </button>
            <span>/</span>
            <span className="text-[#0F172A] font-semibold">Reports</span>
          </nav>

          <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">
            Financial Reports & Statements
          </h1>
          <p className="text-xs text-[#64748B] mt-1 flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5" />
            <span>{activeBusiness?.name || 'EcomHub Business'}</span>
            <span>•</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Multi-currency GAAP & IFRS compliant reporting</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="reports-quick-export-pl-btn"
            onClick={() => exportPLCSV(currentMonthReport)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#475569] bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#64748B]" />
            <span>Export P&L (CSV)</span>
          </button>
        </div>
      </div>

      {/* 2. Current Month Financial Snapshot (Requirement 17) */}
      <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#4F46E5]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
              Current Month Benchmark ({currentMonthReport.periodLabel})
            </h2>
          </div>
          <span className="text-[11px] font-mono text-[#64748B] bg-[#F8FAFC] px-2 py-0.5 rounded border border-[#E2E8F0]">
            Base Currency: {baseCurrency}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <span className="text-xs text-[#64748B] font-medium">Month Revenue</span>
            <p className="text-xl font-bold text-[#0F172A] mt-1 font-mono">
              {baseCurrency} {fmt(currentMonthReport.revenue.totalRevenue)}
            </p>
            <span className="text-[11px] text-emerald-600 flex items-center gap-1 mt-1 font-medium">
              <TrendingUp className="w-3 h-3" />
              <span>Completed payments</span>
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <span className="text-xs text-[#64748B] font-medium">Month Expenses</span>
            <p className="text-xl font-bold text-[#0F172A] mt-1 font-mono">
              {baseCurrency} {fmt(currentMonthReport.expenses.totalExpenses)}
            </p>
            <span className="text-[11px] text-[#64748B] flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3" />
              <span>Operating overhead</span>
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <span className="text-xs text-[#64748B] font-medium">Net Profit</span>
            <p
              className={`text-xl font-bold mt-1 font-mono ${
                currentMonthReport.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {baseCurrency} {fmt(currentMonthReport.netProfit)}
            </p>
            <span className="text-[11px] text-[#64748B] mt-1 block">
              Revenue - Operating Expenses
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <span className="text-xs text-[#64748B] font-medium">Profit Margin</span>
            <p className="text-xl font-bold text-[#4F46E5] mt-1 font-mono">
              {currentMonthReport.profitMargin !== null ? `${currentMonthReport.profitMargin}%` : 'N/A'}
            </p>
            <span className="text-[11px] text-[#64748B] mt-1 block">
              {currentMonthReport.profitMargin !== null && currentMonthReport.profitMargin >= 20
                ? 'High operating margin'
                : 'Net ÷ Revenue'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Four Core Report Cards (Requirement 15) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* REPORT 1: Profit & Loss (LIVE) */}
        <div
          id="report-card-profit-loss"
          className="bg-white p-6 rounded-2xl border-2 border-[#4F46E5]/20 shadow-xs hover:border-[#4F46E5] transition-all flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center font-bold">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Live & Interactive</span>
              </span>
            </div>

            <h3 className="text-base font-bold text-[#0F172A] group-hover:text-[#4F46E5] transition-colors">
              Profit & Loss Statement (P&L)
            </h3>
            <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">
              Comprehensive operational income statement. Measures completed revenue, categorical expenses, operating profit, profit margins, and periodic trends.
            </p>

            <div className="mt-4 pt-3 border-t border-[#F1F5F9] grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-[#F8FAFC] p-2 rounded-lg border border-[#E2E8F0]">
                <span className="text-[10px] text-[#64748B] block">Revenue</span>
                <span className="font-mono font-bold text-[#0F172A] text-xs">
                  {baseCurrency} {fmt(currentMonthReport.revenue.totalRevenue)}
                </span>
              </div>
              <div className="bg-[#F8FAFC] p-2 rounded-lg border border-[#E2E8F0]">
                <span className="text-[10px] text-[#64748B] block">Expenses</span>
                <span className="font-mono font-bold text-[#0F172A] text-xs">
                  {baseCurrency} {fmt(currentMonthReport.expenses.totalExpenses)}
                </span>
              </div>
              <div className="bg-[#F8FAFC] p-2 rounded-lg border border-[#E2E8F0]">
                <span className="text-[10px] text-[#64748B] block">Margin</span>
                <span className="font-mono font-bold text-[#4F46E5] text-xs">
                  {currentMonthReport.profitMargin !== null ? `${currentMonthReport.profitMargin}%` : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-[#F1F5F9] flex items-center justify-between">
            <span className="text-xs text-[#64748B]">
              Date range filtering & CSV export
            </span>
            <button
              id="report-open-profit-loss-btn"
              onClick={handleOpenProfitLoss}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-xl shadow-xs transition-colors"
            >
              <span>View Report</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* REPORT 2: Receivables & Aging (LIVE) */}
        <div
          id="report-card-receivables"
          className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs hover:border-[#CBD5E1] transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Fully Functional</span>
              </span>
            </div>

            <h3 className="text-base font-bold text-[#0F172A]">
              Accounts Receivable & Aging Report
            </h3>
            <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">
              Unpaid client balances categorized into aging brackets (Current, 1–30, 31–60, 60+ days overdue) with one-click payment logging and WhatsApp follow-ups.
            </p>

            <div className="mt-4 pt-3 border-t border-[#F1F5F9] grid grid-cols-2 gap-3 text-center text-xs">
              <div className="bg-[#F8FAFC] p-2 rounded-lg border border-[#E2E8F0]">
                <span className="text-[10px] text-[#64748B] block">Total Outstanding</span>
                <span className="font-mono font-bold text-[#0F172A] text-xs">
                  {baseCurrency} {fmt(metrics.outstandingReceivables)}
                </span>
              </div>
              <div className="bg-[#F8FAFC] p-2 rounded-lg border border-[#E2E8F0]">
                <span className="text-[10px] text-[#64748B] block">Overdue Balance</span>
                <span className="font-mono font-bold text-rose-600 text-xs">
                  {baseCurrency} {fmt(metrics.overdueReceivables)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-[#F1F5F9] flex items-center justify-between">
            <span className="text-xs text-[#64748B]">
              Real-time invoice reconciliation
            </span>
            <button
              id="report-open-receivables-btn"
              onClick={handleOpenReceivables}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#0F172A] bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl transition-colors"
            >
              <span>Open Receivables</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* REPORT 3: Revenue Breakdown & Analytics (Upcoming) */}
        <div
          id="report-card-revenue"
          className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs opacity-90 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <BarChart3 className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                Coming in next report phase
              </span>
            </div>

            <h3 className="text-base font-bold text-[#0F172A]">
              Revenue Breakdown & Analytics
            </h3>
            <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">
              Client lifetime revenue, contract renewal pacing, and income concentration matrices.
            </p>

            <div className="mt-4 p-3 bg-[#F8FAFC] rounded-xl border border-dashed border-[#CBD5E1] text-center text-xs text-[#64748B]">
              <p className="font-medium text-[#475569]">Scheduled for Phase 3C Part 2</p>
              <span className="text-[11px] text-[#94A3B8]">
                In the meantime, revenue is fully detailed inside the Profit & Loss statement.
              </span>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-[#F1F5F9] flex items-center justify-between">
            <span className="text-[11px] text-[#94A3B8]">Phase 3C Part 2</span>
            <button
              id="report-preview-rev-btn"
              onClick={handleOpenProfitLoss}
              className="text-xs font-semibold text-[#4F46E5] hover:underline flex items-center gap-1"
            >
              <span>See Revenue in P&L</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* REPORT 4: Expense Deep Dive & Vendor Analysis (Upcoming) */}
        <div
          id="report-card-expenses"
          className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs opacity-90 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <PieChart className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                Coming in next report phase
              </span>
            </div>

            <h3 className="text-base font-bold text-[#0F172A]">
              Expense Deep Dive & Vendor Analysis
            </h3>
            <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">
              Vendor-level cost comparisons, recurring software subscription creep, and office overhead audits.
            </p>

            <div className="mt-4 p-3 bg-[#F8FAFC] rounded-xl border border-dashed border-[#CBD5E1] text-center text-xs text-[#64748B]">
              <p className="font-medium text-[#475569]">Scheduled for Phase 3C Part 2</p>
              <span className="text-[11px] text-[#94A3B8]">
                Expense category breakdown is available inside the live Profit & Loss report.
              </span>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-[#F1F5F9] flex items-center justify-between">
            <span className="text-[11px] text-[#94A3B8]">Phase 3C Part 2</span>
            <button
              id="report-preview-exp-btn"
              onClick={handleOpenProfitLoss}
              className="text-xs font-semibold text-[#4F46E5] hover:underline flex items-center gap-1"
            >
              <span>See Expenses in P&L</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
