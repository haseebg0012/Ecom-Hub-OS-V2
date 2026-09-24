import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Download,
  Printer,
  Calendar,
  TrendingUp,
  TrendingDown,
  Wallet,
  Percent,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  Building2,
  Clock,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { useFinance } from '../../lib/finance-context';
import { useAuth } from '../../lib/auth-context';
import { FinanceDateRange } from '../../types/finance';
import {
  RevenueExpenseBarChart,
  ProfitTrendLineChart,
  CategoryDonutChart,
} from './FinancialCharts';
import {
  calculateProfitAndLoss,
  ProfitAndLossReport,
  formatDisplayDate,
  ReportDatePreset,
} from '../../lib/financial-reports-service';

interface ProfitLossReportViewProps {
  onBackToReports?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const ProfitLossReportView: React.FC<ProfitLossReportViewProps> = ({
  onBackToReports,
  onNavigateTab,
}) => {
  const {
    transactions,
    categories,
    baseCurrency,
    exportPLCSV,
    dateRange: globalDateRange,
    customStartDate: globalCustomStart,
    customEndDate: globalCustomEnd,
  } = useFinance();
  const { activeBusiness } = useAuth();

  // Local report controls so user can freely filter periods without altering global ledger
  const [selectedPreset, setSelectedPreset] = useState<FinanceDateRange>(
    (globalDateRange as FinanceDateRange) || 'this_month'
  );
  const [customStart, setCustomStart] = useState<string>(globalCustomStart || '');
  const [customEnd, setCustomEnd] = useState<string>(globalCustomEnd || '');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(
    globalDateRange === 'custom'
  );
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Compute report using unified calculation service
  const report: ProfitAndLossReport = useMemo(() => {
    const bizId = activeBusiness?.id || 'biz-ecometrix-001';
    const bizName = activeBusiness?.name || 'EcomHub Business';

    return calculateProfitAndLoss({
      businessId: bizId,
      businessName: bizName,
      transactions,
      categories,
      preset: selectedPreset as ReportDatePreset,
      customStartDate: isCustomMode ? customStart : undefined,
      customEndDate: isCustomMode ? customEnd : undefined,
      baseCurrency,
    });
  }, [
    activeBusiness?.id,
    activeBusiness?.name,
    transactions,
    categories,
    selectedPreset,
    isCustomMode,
    customStart,
    customEnd,
    baseCurrency,
  ]);

  // Handle preset change
  const handleSelectPreset = (preset: FinanceDateRange) => {
    setSelectedPreset(preset);
    if (preset === 'custom') {
      setIsCustomMode(true);
    } else {
      setIsCustomMode(false);
    }
  };

  // CSV Export with audit log
  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      exportPLCSV(report);
      // Also notify server endpoint for audit compliance
      try {
        await fetch('/api/finance/reports/log-export', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-business-id': activeBusiness?.id || 'biz-ecometrix-001',
          },
          body: JSON.stringify({
            report_type: 'profit_and_loss',
            periodLabel: report.periodLabel,
          }),
        });
      } catch (err) {
        // Silent fallback for audit logging in local mode
        console.warn('Audit log server ping completed:', err);
      }
    } finally {
      setTimeout(() => setIsExporting(false), 600);
    }
  };

  // Format monetary numbers
  const fmt = (n: number) => {
    return (Number(n) || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Format compact numbers
  const fmtCompact = (n: number) => {
    return (Number(n) || 0).toLocaleString(undefined, {
      maximumFractionDigits: 0,
    });
  };

  // Prepare chart slices for donut chart
  const donutSlices = useMemo(() => {
    return report.expenses.categories.map((c) => ({
      label: c.name,
      value: c.amount,
      color: c.color || '#64748B',
    }));
  }, [report.expenses.categories]);

  // Trend data for bar & line charts
  const chartBarData = useMemo(() => {
    return report.monthlyTrend.map((m) => ({
      label: m.label,
      revenue: m.revenue,
      expenses: m.expenses,
    }));
  }, [report.monthlyTrend]);

  const chartTrendData = useMemo(() => {
    return report.monthlyTrend.map((m) => ({
      label: m.label,
      profit: m.profit,
    }));
  }, [report.monthlyTrend]);

  return (
    <div className="space-y-6">
      {/* 1. Header & Navigation Breadcrumbs */}
      <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            {/* Breadcrumb Navigation (Requirement 1) */}
            <nav className="flex items-center gap-2 text-xs text-[#64748B] mb-1 font-medium">
              <button
                id="pl-breadcrumb-finance"
                onClick={() => onNavigateTab ? onNavigateTab('overview') : onBackToReports?.()}
                className="hover:text-[#4F46E5] transition-colors"
              >
                Finance
              </button>
              <span>/</span>
              <button
                id="pl-breadcrumb-reports"
                onClick={onBackToReports}
                className="hover:text-[#4F46E5] transition-colors"
              >
                Reports
              </button>
              <span>/</span>
              <span className="text-[#0F172A] font-semibold">Profit & Loss</span>
            </nav>

            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">
                Profit & Loss Statement
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-[#EEF2FF] text-[#4F46E5] border border-[#E0E7FF]">
                {baseCurrency}
              </span>
            </div>

            <p className="text-xs text-[#64748B] mt-1 flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5" />
              <span>{report.businessName}</span>
              <span>•</span>
              <Clock className="w-3.5 h-3.5" />
              <span>Reporting Period: <strong className="text-[#0F172A]">{report.periodLabel}</strong></span>
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center flex-wrap gap-2.5">
            {onBackToReports && (
              <button
                id="pl-back-to-reports-btn"
                onClick={onBackToReports}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#64748B] bg-[#F8FAFC] hover:bg-[#F1F5F9] hover:text-[#0F172A] border border-[#E2E8F0] rounded-xl transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>All Reports</span>
              </button>
            )}

            <button
              id="pl-print-btn"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#475569] bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl transition-colors"
              title="Print Statement"
            >
              <Printer className="w-3.5 h-3.5 text-[#64748B]" />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              id="pl-export-csv-btn"
              onClick={handleExportCSV}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>
          </div>
        </div>

        {/* 2. Date Range Filter Toolbar */}
        <div className="mt-5 pt-4 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-[#64748B] mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Period:</span>
            </span>

            {(
              [
                { id: 'this_month', label: 'This Month' },
                { id: 'last_month', label: 'Last Month' },
                { id: 'this_quarter', label: 'This Quarter' },
                { id: 'last_quarter', label: 'Last Quarter' },
                { id: 'this_year', label: 'This Year' },
                { id: 'last_year', label: 'Last Year' },
                { id: 'all', label: 'All Time' },
                { id: 'custom', label: 'Custom' },
              ] as Array<{ id: FinanceDateRange; label: string }>
            ).map((item) => (
              <button
                key={item.id}
                id={`pl-date-preset-${item.id}`}
                onClick={() => handleSelectPreset(item.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                  selectedPreset === item.id
                    ? 'bg-[#4F46E5] text-white shadow-xs'
                    : 'bg-[#F8FAFC] text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] border border-[#E2E8F0]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="text-xs text-[#64748B] font-mono bg-[#F8FAFC] px-2.5 py-1 rounded-lg border border-[#E2E8F0]">
            Range: {report.startDate} → {report.endDate}
          </div>
        </div>

        {/* Custom Range Inputs */}
        {isCustomMode && (
          <div className="mt-3 p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex flex-wrap items-center gap-3 text-xs">
            <span className="font-medium text-[#475569]">Custom Bounds:</span>
            <div className="flex items-center gap-2">
              <label className="text-[#64748B]">From</label>
              <input
                id="pl-custom-start-input"
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2.5 py-1 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A]"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[#64748B]">To</label>
              <input
                id="pl-custom-end-input"
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2.5 py-1 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A]"
              />
            </div>
            <button
              id="pl-apply-custom-btn"
              onClick={() => setSelectedPreset('custom')}
              className="px-3 py-1 bg-[#4F46E5] text-white font-medium rounded-lg hover:bg-[#4338CA] transition-colors"
            >
              Apply Filter
            </button>
          </div>
        )}
      </div>

      {/* 3. Primary KPI Cards (Requirement 10) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div id="pl-kpi-revenue" className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Total Revenue
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#0F172A] tracking-tight">
              {baseCurrency} {fmt(report.revenue.totalRevenue)}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs">
              {report.comparison?.revenueChangePct !== null ? (
                <span
                  className={`font-semibold ${
                    (report.comparison?.revenueChangePct || 0) >= 0
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                  }`}
                >
                  {(report.comparison?.revenueChangePct || 0) >= 0 ? '+' : ''}
                  {report.comparison?.revenueChangePct}%
                </span>
              ) : (
                <span className="text-[#94A3B8]">Prior: N/A</span>
              )}
              <span className="text-[#64748B]">vs preceding period</span>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-[#94A3B8] border-t border-[#F1F5F9] pt-2 flex justify-between">
            <span>Completed payments only</span>
            <span>{report.revenue.clientPayments > 0 ? `${fmtCompact(report.revenue.clientPayments)} client` : 'No rev'}</span>
          </div>
        </div>

        {/* Total Operating Expenses */}
        <div id="pl-kpi-expenses" className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Total Expenses
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#0F172A] tracking-tight">
              {baseCurrency} {fmt(report.expenses.totalExpenses)}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs">
              {report.comparison?.expenseChangePct !== null ? (
                <span
                  className={`font-semibold ${
                    (report.comparison?.expenseChangePct || 0) <= 0
                      ? 'text-emerald-600'
                      : 'text-amber-600'
                  }`}
                >
                  {(report.comparison?.expenseChangePct || 0) >= 0 ? '+' : ''}
                  {report.comparison?.expenseChangePct}%
                </span>
              ) : (
                <span className="text-[#94A3B8]">Prior: N/A</span>
              )}
              <span className="text-[#64748B]">vs preceding period</span>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-[#94A3B8] border-t border-[#F1F5F9] pt-2 flex justify-between">
            <span>Operating expenses</span>
            <span>{report.expenses.categories.length} categories</span>
          </div>
        </div>

        {/* Net Profit / Loss */}
        <div id="pl-kpi-net-profit" className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Net Operating Profit
            </span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                report.netProfit >= 0
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-rose-50 text-rose-600'
              }`}
            >
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div
              className={`text-2xl font-bold tracking-tight ${
                report.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {baseCurrency} {fmt(report.netProfit)}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-[#64748B]">
              <span
                className={`font-semibold ${
                  report.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {report.netProfit >= 0 ? 'Surplus' : 'Deficit'}
              </span>
              <span>• Total Rev - OpEx</span>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-[#94A3B8] border-t border-[#F1F5F9] pt-2 flex justify-between">
            <span>Bottom-line result</span>
            <span className={report.netProfit >= 0 ? 'text-emerald-600 font-medium' : 'text-rose-600 font-medium'}>
              {report.netProfit >= 0 ? 'Profitable' : 'Loss'}
            </span>
          </div>
        </div>

        {/* Profit Margin (Divide-by-zero protected) */}
        <div id="pl-kpi-margin" className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Profit Margin
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-[#4F46E5] flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#0F172A] tracking-tight">
              {report.profitMargin !== null ? `${report.profitMargin}%` : 'N/A'}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-[#64748B]">
              {report.profitMargin !== null ? (
                <span
                  className={`font-semibold ${
                    report.profitMargin >= 25
                      ? 'text-emerald-600'
                      : report.profitMargin >= 10
                      ? 'text-amber-600'
                      : 'text-rose-600'
                  }`}
                >
                  {report.profitMargin >= 25
                    ? 'High Margin'
                    : report.profitMargin >= 10
                    ? 'Standard'
                    : 'Low Margin'}
                </span>
              ) : (
                <span className="text-[#94A3B8]">Zero revenue period</span>
              )}
              <span>• Net ÷ Rev</span>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-[#94A3B8] border-t border-[#F1F5F9] pt-2 flex justify-between">
            <span>Operating efficiency</span>
            <span>Target: 20%+</span>
          </div>
        </div>
      </div>

      {/* 4. Visual Financial Charts (Requirement 13) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Revenue vs Expenses (Bar Chart) */}
        <div id="pl-chart-rev-vs-exp" className="lg:col-span-2 bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-sm font-bold text-[#0F172A]">
                Revenue vs Operating Expenses
              </h2>
              <p className="text-xs text-[#64748B]">
                Financial comparison over selected timeline in {baseCurrency}
              </p>
            </div>
            <span className="text-[11px] font-semibold text-[#4F46E5] bg-[#EEF2FF] px-2 py-0.5 rounded">
              Base: {baseCurrency}
            </span>
          </div>
          <RevenueExpenseBarChart data={chartBarData} currencySymbol={baseCurrency} />
        </div>

        {/* Chart 2: Expense Breakdown Donut */}
        <div id="pl-chart-expense-donut" className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-[#0F172A]">
                Expense Breakdown
              </h2>
              <span className="text-[11px] text-[#64748B]">By Category</span>
            </div>
            <p className="text-xs text-[#64748B] mb-3">
              Distribution across {report.expenses.categories.length} operational cost centers
            </p>
            <CategoryDonutChart
              slices={donutSlices}
              totalAmount={report.expenses.totalExpenses}
              currencySymbol={baseCurrency}
            />
          </div>

          {/* Quick Category Legend */}
          <div className="mt-4 pt-3 border-t border-[#F1F5F9] space-y-1.5 max-h-36 overflow-y-auto pr-1 scrollbar-thin">
            {report.expenses.categories.slice(0, 4).map((c, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: c.color || '#64748B' }}
                  />
                  <span className="text-[#475569] truncate font-medium">{c.name}</span>
                </div>
                <span className="font-semibold text-[#0F172A] shrink-0">
                  {c.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chart 3: Net Profit Trend Line */}
      <div id="pl-chart-profit-trend" className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-sm font-bold text-[#0F172A]">
              Net Operating Profit Trend
            </h2>
            <p className="text-xs text-[#64748B]">
              Trajectory of net bottom-line cash generation throughout the reporting period
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
              <CheckCircle2 className="w-3 h-3" />
              <span>Real Ledger Data</span>
            </span>
          </div>
        </div>
        <ProfitTrendLineChart data={chartTrendData} currencySymbol={baseCurrency} />
      </div>

      {/* 5. Detailed Accounting Statements & Tables (Requirements 11 & 12) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* REVENUE BREAKDOWN TABLE (Requirement 11) */}
        <div id="pl-revenue-table" className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h2 className="text-sm font-bold text-[#0F172A]">
                Revenue Breakdown
              </h2>
            </div>
            <span className="text-xs font-mono font-semibold text-emerald-700">
              {baseCurrency} {fmt(report.revenue.totalRevenue)}
            </span>
          </div>

          <div className="p-4 flex-1">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[#64748B] border-b border-[#E2E8F0] text-left">
                  <th className="pb-2 font-semibold">Category / Stream</th>
                  <th className="pb-2 font-semibold text-right">Amount ({baseCurrency})</th>
                  <th className="pb-2 font-semibold text-right">% of Rev</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {/* Client Payments */}
                <tr>
                  <td className="py-2.5 font-medium text-[#0F172A] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Client Payments (Invoices & Retainers)</span>
                  </td>
                  <td className="py-2.5 text-right font-mono font-semibold text-[#0F172A]">
                    {fmt(report.revenue.clientPayments)}
                  </td>
                  <td className="py-2.5 text-right font-mono text-[#64748B]">
                    {report.revenue.totalRevenue > 0
                      ? `${((report.revenue.clientPayments / report.revenue.totalRevenue) * 100).toFixed(1)}%`
                      : '0.0%'}
                  </td>
                </tr>

                {/* Other Income */}
                {report.revenue.otherIncome > 0 && (
                  <tr>
                    <td className="py-2.5 font-medium text-[#0F172A] flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      <span>Other Operating Income</span>
                    </td>
                    <td className="py-2.5 text-right font-mono font-semibold text-[#0F172A]">
                      {fmt(report.revenue.otherIncome)}
                    </td>
                    <td className="py-2.5 text-right font-mono text-[#64748B]">
                      {report.revenue.totalRevenue > 0
                        ? `${((report.revenue.otherIncome / report.revenue.totalRevenue) * 100).toFixed(1)}%`
                        : '0.0%'}
                    </td>
                  </tr>
                )}

                {/* Detailed categories if available */}
                {report.revenueByCategory
                  .filter(
                    (r) =>
                      r.category !== 'Client Payments' &&
                      r.category !== 'Other Income'
                  )
                  .map((rc, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 text-[#475569] pl-3">
                        {rc.category}
                      </td>
                      <td className="py-2.5 text-right font-mono text-[#475569]">
                        {fmt(rc.amount)}
                      </td>
                      <td className="py-2.5 text-right font-mono text-[#64748B]">
                        {rc.percentage}%
                      </td>
                    </tr>
                  ))}

                {/* Refunds (Contra-Revenue) */}
                {report.revenue.refunds > 0 && (
                  <tr className="bg-rose-50/50">
                    <td className="py-2.5 font-medium text-rose-700">
                      Less: Refunds & Adjustments
                    </td>
                    <td className="py-2.5 text-right font-mono font-semibold text-rose-600">
                      -{fmt(report.revenue.refunds)}
                    </td>
                    <td className="py-2.5 text-right font-mono text-rose-600">
                      Contra
                    </td>
                  </tr>
                )}

                {/* Empty State */}
                {report.revenue.totalRevenue === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-[#94A3B8]">
                      No completed revenue recorded in this period.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#E2E8F0] font-bold text-[#0F172A]">
                  <td className="pt-3">Total Operating Revenue</td>
                  <td className="pt-3 text-right font-mono text-emerald-600 text-sm">
                    {baseCurrency} {fmt(report.revenue.totalRevenue)}
                  </td>
                  <td className="pt-3 text-right font-mono">100.0%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* EXPENSE BREAKDOWN TABLE (Requirement 12) */}
        <div id="pl-expense-table" className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <h2 className="text-sm font-bold text-[#0F172A]">
                Operating Expenses Breakdown
              </h2>
            </div>
            <span className="text-xs font-mono font-semibold text-rose-700">
              {baseCurrency} {fmt(report.expenses.totalExpenses)}
            </span>
          </div>

          <div className="p-4 flex-1">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[#64748B] border-b border-[#E2E8F0] text-left">
                  <th className="pb-2 font-semibold">Expense Category</th>
                  <th className="pb-2 font-semibold text-right">Amount ({baseCurrency})</th>
                  <th className="pb-2 font-semibold text-right">% of Exp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {report.expenses.categories.map((cat, idx) => (
                  <tr key={idx} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-2.5 font-medium text-[#0F172A] flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color || '#64748B' }}
                      />
                      <span>{cat.name}</span>
                    </td>
                    <td className="py-2.5 text-right font-mono font-semibold text-[#0F172A]">
                      {fmt(cat.amount)}
                    </td>
                    <td className="py-2.5 text-right font-mono text-[#64748B]">
                      {cat.percentage}%
                    </td>
                  </tr>
                ))}

                {/* Empty State */}
                {report.expenses.categories.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-[#94A3B8]">
                      No operating expenses recorded in this period.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#E2E8F0] font-bold text-[#0F172A]">
                  <td className="pt-3">Total Operating Expenses</td>
                  <td className="pt-3 text-right font-mono text-rose-600 text-sm">
                    {baseCurrency} {fmt(report.expenses.totalExpenses)}
                  </td>
                  <td className="pt-3 text-right font-mono">100.0%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* 6. Comprehensive Profit & Loss Summary Statement */}
      <div id="pl-summary-statement" className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-6">
        <h2 className="text-sm font-bold text-[#0F172A] mb-1">
          Statement of Profit and Loss (Summary)
        </h2>
        <p className="text-xs text-[#64748B] mb-4">
          Formal accounting aggregation for {report.businessName} ({report.periodLabel})
        </p>

        <div className="space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between py-2 border-b border-[#F1F5F9]">
            <span className="text-[#0F172A] font-medium font-sans">Gross Completed Operating Revenue</span>
            <span className="font-semibold text-emerald-600">
              +{baseCurrency} {fmt(report.revenue.totalRevenue)}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-[#F1F5F9]">
            <span className="text-[#0F172A] font-medium font-sans">Less: Operating Expenses (OpEx)</span>
            <span className="font-semibold text-rose-600">
              -{baseCurrency} {fmt(report.expenses.totalExpenses)}
            </span>
          </div>

          <div className="flex items-center justify-between py-3 border-t-2 border-[#E2E8F0] bg-[#F8FAFC] px-3 rounded-lg">
            <div className="font-sans">
              <span className="font-bold text-sm text-[#0F172A]">Net Operating Profit / (Loss)</span>
              <span className="block text-[11px] text-[#64748B] font-mono">
                Margin: {report.profitMargin !== null ? `${report.profitMargin}%` : 'N/A'}
              </span>
            </div>
            <span
              className={`font-bold text-base ${
                report.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {baseCurrency} {fmt(report.netProfit)}
            </span>
          </div>
        </div>

        {/* 7. Business Investments (CapEx) — Kept Separate (Requirement 6) */}
        {report.investments.totalInvestments > 0 && (
          <div id="pl-capex-section" className="mt-6 pt-5 border-t border-[#E2E8F0]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  Capital Investments (CapEx) — Kept Separate from OpEx
                </h3>
              </div>
              <span className="text-xs font-mono font-semibold text-indigo-600">
                {baseCurrency} {fmt(report.investments.totalInvestments)}
              </span>
            </div>

            <p className="text-[11px] text-[#64748B] mb-3">
              Equipment, hardware, and capital assets are tracked separately from operational overhead per standard accounting rules.
            </p>

            <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0] space-y-2">
              {report.investments.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[#64748B] font-mono">{item.date}</span>
                    <span className="font-medium text-[#0F172A]">{item.name}</span>
                  </div>
                  <span className="font-mono font-semibold text-[#0F172A]">
                    {baseCurrency} {fmt(item.amount)}
                  </span>
                </div>
              ))}

              <div className="pt-2 border-t border-[#E2E8F0] flex justify-between text-xs font-semibold">
                <span className="text-[#475569]">Net Cash Flow after Capital Investments:</span>
                <span className="font-mono text-[#0F172A]">
                  {baseCurrency} {fmt(report.netProfit - report.investments.totalInvestments)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 8. Audit & Compliance Standards Notice */}
        <div className="mt-6 pt-4 border-t border-[#F1F5F9] flex items-start gap-2 text-[11px] text-[#94A3B8]">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-[#64748B] mt-0.5" />
          <p>
            Authoritative accounting note: Revenue includes completed client payments and finalized financial income records only. Unpaid invoice balances, pending receivables, and cancelled records are excluded from revenue to prevent overstated earnings. All multi-currency transactions are converted into business base currency ({baseCurrency}) using historical settlement exchange rates.
          </p>
        </div>
      </div>
    </div>
  );
};
