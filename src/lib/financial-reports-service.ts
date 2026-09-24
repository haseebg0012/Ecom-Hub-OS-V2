/**
 * EcomHub OS — Financial Reporting Calculation Engine
 * Product: EcomHub OS | Tagline: Your Business, One Hub.
 * 
 * Shared calculation layer ensuring Dashboard, Reports, and Server APIs
 * produce identical, mathematically consistent financial figures.
 */

import { Transaction, FinancialCategory } from '../types/finance';

export type ReportDatePreset =
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'last_quarter'
  | 'this_year'
  | 'last_year'
  | 'today'
  | 'this_week'
  | 'all'
  | 'custom';

export interface DateRangeBounds {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  periodLabel: string;
  preset: ReportDatePreset;
  previousStartDate: string;
  previousEndDate: string;
  previousPeriodLabel: string;
}

export interface ProfitAndLossReport {
  businessId: string;
  businessName: string;
  baseCurrency: string;
  periodLabel: string;
  preset: ReportDatePreset;
  startDate: string;
  endDate: string;
  generatedAt: string;
  revenue: {
    clientPayments: number;
    otherIncome: number;
    refunds: number;
    totalRevenue: number;
  };
  expenses: {
    totalExpenses: number;
    categories: Array<{
      id: string;
      name: string;
      amount: number;
      percentage: number;
      color?: string;
    }>;
  };
  investments: {
    totalInvestments: number;
    items: Array<{
      id: string;
      name: string;
      amount: number;
      date: string;
    }>;
  };
  netProfit: number;
  profitMargin: number | null; // null if totalRevenue === 0
  revenueByCategory: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  expensesByCategory: Array<{
    category: string;
    amount: number;
    percentage: number;
    color?: string;
  }>;
  monthlyTrend: Array<{
    label: string;
    periodKey: string;
    revenue: number;
    expenses: number;
    profit: number;
  }>;
  comparison?: {
    previousStartDate: string;
    previousEndDate: string;
    previousPeriodLabel: string;
    previousRevenue: number;
    previousExpenses: number;
    previousProfit: number;
    revenueChangePct: number | null;
    expenseChangePct: number | null;
    profitChangePct: number | null;
  };
}

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Format a Date object to YYYY-MM-DD in local time
 */
export function formatDateToISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date string (YYYY-MM-DD) into display string: "01 Sep 2026"
 */
export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parts[2].padStart(2, '0');
  const monthName = MONTH_NAMES_SHORT[monthIdx] || parts[1];
  return `${day} ${monthName} ${year}`;
}

/**
 * Calculate Start Date, End Date, and Prior Period for any preset or custom range
 */
export function getDateRangeBounds(
  preset: ReportDatePreset,
  customStart?: string,
  customEnd?: string,
  referenceDate: Date = new Date()
): DateRangeBounds {
  const now = new Date(referenceDate);
  const curYear = now.getFullYear();
  const curMonth = now.getMonth(); // 0-indexed

  let start: Date;
  let end: Date;
  let periodLabel = '';
  let prevStart: Date;
  let prevEnd: Date;
  let prevPeriodLabel = '';

  switch (preset) {
    case 'this_month': {
      start = new Date(curYear, curMonth, 1);
      end = new Date(curYear, curMonth + 1, 0); // Last day of month
      periodLabel = `${formatDisplayDate(formatDateToISO(start))} — ${formatDisplayDate(formatDateToISO(end))}`;
      
      prevStart = new Date(curYear, curMonth - 1, 1);
      prevEnd = new Date(curYear, curMonth, 0);
      prevPeriodLabel = `${formatDisplayDate(formatDateToISO(prevStart))} — ${formatDisplayDate(formatDateToISO(prevEnd))}`;
      break;
    }
    case 'last_month': {
      start = new Date(curYear, curMonth - 1, 1);
      end = new Date(curYear, curMonth, 0);
      periodLabel = `${formatDisplayDate(formatDateToISO(start))} — ${formatDisplayDate(formatDateToISO(end))}`;

      prevStart = new Date(curYear, curMonth - 2, 1);
      prevEnd = new Date(curYear, curMonth - 1, 0);
      prevPeriodLabel = `${formatDisplayDate(formatDateToISO(prevStart))} — ${formatDisplayDate(formatDateToISO(prevEnd))}`;
      break;
    }
    case 'this_quarter': {
      const q = Math.floor(curMonth / 3);
      start = new Date(curYear, q * 3, 1);
      end = new Date(curYear, (q + 1) * 3, 0);
      periodLabel = `Q${q + 1} ${curYear} (${formatDisplayDate(formatDateToISO(start))} — ${formatDisplayDate(formatDateToISO(end))})`;

      const prevQ = q === 0 ? 3 : q - 1;
      const prevQYear = q === 0 ? curYear - 1 : curYear;
      prevStart = new Date(prevQYear, prevQ * 3, 1);
      prevEnd = new Date(prevQYear, (prevQ + 1) * 3, 0);
      prevPeriodLabel = `Q${prevQ + 1} ${prevQYear}`;
      break;
    }
    case 'last_quarter': {
      const curQ = Math.floor(curMonth / 3);
      const q = curQ === 0 ? 3 : curQ - 1;
      const qYear = curQ === 0 ? curYear - 1 : curYear;
      start = new Date(qYear, q * 3, 1);
      end = new Date(qYear, (q + 1) * 3, 0);
      periodLabel = `Q${q + 1} ${qYear} (${formatDisplayDate(formatDateToISO(start))} — ${formatDisplayDate(formatDateToISO(end))})`;

      const prevQ = q === 0 ? 3 : q - 1;
      const prevQYear = q === 0 ? qYear - 1 : qYear;
      prevStart = new Date(prevQYear, prevQ * 3, 1);
      prevEnd = new Date(prevQYear, (prevQ + 1) * 3, 0);
      prevPeriodLabel = `Q${prevQ + 1} ${prevQYear}`;
      break;
    }
    case 'this_year': {
      start = new Date(curYear, 0, 1);
      end = new Date(curYear, 11, 31);
      periodLabel = `Full Year ${curYear} (${formatDisplayDate(formatDateToISO(start))} — ${formatDisplayDate(formatDateToISO(end))})`;

      prevStart = new Date(curYear - 1, 0, 1);
      prevEnd = new Date(curYear - 1, 11, 31);
      prevPeriodLabel = `Full Year ${curYear - 1}`;
      break;
    }
    case 'last_year': {
      start = new Date(curYear - 1, 0, 1);
      end = new Date(curYear - 1, 11, 31);
      periodLabel = `Full Year ${curYear - 1} (${formatDisplayDate(formatDateToISO(start))} — ${formatDisplayDate(formatDateToISO(end))})`;

      prevStart = new Date(curYear - 2, 0, 1);
      prevEnd = new Date(curYear - 2, 11, 31);
      prevPeriodLabel = `Full Year ${curYear - 2}`;
      break;
    }
    case 'today': {
      start = new Date(curYear, curMonth, now.getDate());
      end = new Date(curYear, curMonth, now.getDate());
      periodLabel = formatDisplayDate(formatDateToISO(start));

      prevStart = new Date(curYear, curMonth, now.getDate() - 1);
      prevEnd = new Date(curYear, curMonth, now.getDate() - 1);
      prevPeriodLabel = formatDisplayDate(formatDateToISO(prevStart));
      break;
    }
    case 'this_week': {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(curYear, curMonth, diff);
      end = new Date(start.getTime() + 6 * 86400000);
      periodLabel = `${formatDisplayDate(formatDateToISO(start))} — ${formatDisplayDate(formatDateToISO(end))}`;

      prevStart = new Date(start.getTime() - 7 * 86400000);
      prevEnd = new Date(prevStart.getTime() + 6 * 86400000);
      prevPeriodLabel = `${formatDisplayDate(formatDateToISO(prevStart))} — ${formatDisplayDate(formatDateToISO(prevEnd))}`;
      break;
    }
    case 'custom': {
      const s = customStart ? new Date(customStart) : new Date(curYear, curMonth, 1);
      const e = customEnd ? new Date(customEnd) : new Date(curYear, curMonth + 1, 0);
      start = isNaN(s.getTime()) ? new Date(curYear, curMonth, 1) : s;
      end = isNaN(e.getTime()) ? new Date(curYear, curMonth + 1, 0) : e;
      periodLabel = `${formatDisplayDate(formatDateToISO(start))} — ${formatDisplayDate(formatDateToISO(end))}`;

      // Equivalent preceding duration
      const diffMs = Math.max(86400000, end.getTime() - start.getTime() + 86400000);
      prevEnd = new Date(start.getTime() - 86400000);
      prevStart = new Date(prevEnd.getTime() - diffMs + 86400000);
      prevPeriodLabel = `${formatDisplayDate(formatDateToISO(prevStart))} — ${formatDisplayDate(formatDateToISO(prevEnd))}`;
      break;
    }
    case 'all':
    default: {
      start = new Date(2020, 0, 1);
      end = new Date(curYear + 1, 11, 31);
      periodLabel = 'All Historical Records';
      prevStart = new Date(2015, 0, 1);
      prevEnd = new Date(2019, 11, 31);
      prevPeriodLabel = 'Preceding Period';
      break;
    }
  }

  return {
    startDate: formatDateToISO(start),
    endDate: formatDateToISO(end),
    periodLabel,
    preset,
    previousStartDate: formatDateToISO(prevStart),
    previousEndDate: formatDateToISO(prevEnd),
    previousPeriodLabel: prevPeriodLabel,
  };
}

/**
 * Standard expense categories with color palettes for financial charts
 */
export const STANDARD_EXPENSE_COLORS: Record<string, string> = {
  'Advertising': '#EC4899',
  'Advertising & PPC Spend': '#EC4899',
  'Software': '#6366F1',
  'Software & Cloud Subscriptions': '#6366F1',
  'Hosting': '#0EA5E9',
  'Salaries': '#10B981',
  'Freelancers': '#F59E0B',
  'Office': '#8B5CF6',
  'Office Rent & Utilities': '#8B5CF6',
  'Internet': '#06B6D4',
  'Transportation': '#14B8A6',
  'Marketing': '#F43F5E',
  'Equipment': '#3B82F6',
  'Taxes': '#E11D48',
  'Utilities': '#84CC16',
  'Other Expenses': '#64748B',
  'General Operations': '#64748B',
};

/**
 * Pure calculation function for Profit & Loss
 * Used both on server and in React context.
 */
export function calculateProfitAndLoss(params: {
  businessId: string;
  businessName?: string;
  transactions: Transaction[];
  categories: FinancialCategory[];
  preset?: ReportDatePreset;
  startDate?: string;
  endDate?: string;
  customStartDate?: string;
  customEndDate?: string;
  baseCurrency?: string;
}): ProfitAndLossReport {
  const {
    businessId,
    businessName = 'EcomHub Business',
    transactions = [],
    categories = [],
    preset = 'this_month',
    customStartDate,
    customEndDate,
    baseCurrency = 'PKR',
  } = params;

  // Resolve bounds
  const bounds = getDateRangeBounds(preset, params.startDate || customStartDate, params.endDate || customEndDate);
  const { startDate, endDate, periodLabel, previousStartDate, previousEndDate, previousPeriodLabel } = bounds;

  // 1. Filter authoritative completed transactions in current period
  const periodTransactions = transactions.filter((t) => {
    if (t.business_id !== businessId) return false;
    const status = (t.status || '').toLowerCase();
    if (status !== 'completed') return false; // Exclude pending and cancelled
    const date = t.transaction_date;
    if (!date) return false;
    return date >= startDate && date <= endDate;
  });

  // 2. Filter authoritative completed transactions in previous period (for comparison)
  const prevPeriodTransactions = transactions.filter((t) => {
    if (t.business_id !== businessId) return false;
    const status = (t.status || '').toLowerCase();
    if (status !== 'completed') return false;
    const date = t.transaction_date;
    if (!date) return false;
    return date >= previousStartDate && date <= previousEndDate;
  });

  // Map category id to category info
  const categoryMap = new Map<string, FinancialCategory>();
  categories.forEach((c) => categoryMap.set(c.id, c));

  // --- REVENUE CALCULATION ---
  let clientPayments = 0;
  let otherIncome = 0;
  let refunds = 0;
  const revenueCatMap = new Map<string, number>();

  // --- EXPENSE CALCULATION ---
  let totalExpenses = 0;
  const expenseCatMap = new Map<string, { id: string; name: string; amount: number; color: string }>();

  // --- INVESTMENTS (CapEx) ---
  let totalInvestments = 0;
  const investmentItems: Array<{ id: string; name: string; amount: number; date: string }> = [];

  // Iterate current period transactions
  periodTransactions.forEach((t) => {
    const type = (t.transaction_type || '').toLowerCase();
    const baseAmt = Math.round((Number(t.base_amount) || (Number(t.amount) * (Number(t.exchange_rate) || 1))) * 100) / 100;

    if (type === 'income') {
      // Differentiate client payments vs other income
      const cat = t.category_id ? categoryMap.get(t.category_id) : null;
      const catName = cat?.name || 'Client Payments';
      const desc = (t.description || '').toLowerCase();
      const ref = (t.reference || '').toLowerCase();

      const isClientPayment =
        !!t.client_id ||
        ref.startsWith('pay-') ||
        ref.startsWith('inv-') ||
        desc.includes('client') ||
        desc.includes('invoice') ||
        desc.includes('retainer') ||
        catName.toLowerCase().includes('client') ||
        catName.toLowerCase().includes('retainer');

      if (isClientPayment) {
        clientPayments += baseAmt;
      } else {
        otherIncome += baseAmt;
      }

      const revCatKey = catName || (isClientPayment ? 'Client Payments' : 'Other Income');
      revenueCatMap.set(revCatKey, (revenueCatMap.get(revCatKey) || 0) + baseAmt);
    } else if (type === 'refund') {
      refunds += baseAmt;
    } else if (type === 'expense') {
      totalExpenses += baseAmt;
      const cat = t.category_id ? categoryMap.get(t.category_id) : null;
      const catName = cat?.name || 'Other Expenses';
      const catId = cat?.id || 'cat-general';
      const catColor = cat?.color || STANDARD_EXPENSE_COLORS[catName] || '#64748B';

      const existing = expenseCatMap.get(catName) || {
        id: catId,
        name: catName,
        amount: 0,
        color: catColor,
      };
      existing.amount += baseAmt;
      expenseCatMap.set(catName, existing);
    } else if (type === 'investment') {
      totalInvestments += baseAmt;
      investmentItems.push({
        id: t.id,
        name: t.description || 'Capital Investment',
        amount: baseAmt,
        date: t.transaction_date,
      });
    }
  });

  // Net finalized revenue
  const totalRevenue = Math.max(0, Math.round((clientPayments + otherIncome - refunds) * 100) / 100);
  totalExpenses = Math.round(totalExpenses * 100) / 100;
  totalInvestments = Math.round(totalInvestments * 100) / 100;

  // Net Profit / Loss
  const netProfit = Math.round((totalRevenue - totalExpenses) * 100) / 100;

  // Profit Margin
  let profitMargin: number | null = null;
  if (totalRevenue > 0) {
    profitMargin = Math.round(((totalRevenue - totalExpenses) / totalRevenue) * 1000) / 10;
  }

  // Format Revenue by Category
  const revenueByCategory = Array.from(revenueCatMap.entries())
    .map(([category, amount]) => ({
      category,
      amount: Math.round(amount * 100) / 100,
      percentage: totalRevenue > 0 ? Math.round((amount / totalRevenue) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // If no detailed category was recorded, populate from client payments and other income
  if (revenueByCategory.length === 0 && totalRevenue > 0) {
    if (clientPayments > 0) {
      revenueByCategory.push({
        category: 'Client Payments',
        amount: clientPayments,
        percentage: Math.round((clientPayments / totalRevenue) * 1000) / 10,
      });
    }
    if (otherIncome > 0) {
      revenueByCategory.push({
        category: 'Other Income',
        amount: otherIncome,
        percentage: Math.round((otherIncome / totalRevenue) * 1000) / 10,
      });
    }
  }

  // Format Expenses by Category
  const expensesByCategory = Array.from(expenseCatMap.values())
    .map((item) => ({
      id: item.id,
      category: item.name,
      name: item.name,
      amount: Math.round(item.amount * 100) / 100,
      percentage: totalExpenses > 0 ? Math.round((item.amount / totalExpenses) * 1000) / 10 : 0,
      color: item.color,
    }))
    .sort((a, b) => b.amount - a.amount);

  // --- MONTHLY / PERIODIC TREND ---
  // Build time buckets for the charts
  const trendBucketsMap = new Map<string, { label: string; periodKey: string; revenue: number; expenses: number }>();

  // Determine granularity: if range > 35 days, group by month (YYYY-MM); otherwise group by week or day
  const startD = new Date(startDate);
  const endD = new Date(endDate);
  const rangeDays = Math.max(1, Math.round((endD.getTime() - startD.getTime()) / 86400000));

  if (rangeDays > 35) {
    // Monthly grouping
    let trendStart = new Date(startD.getFullYear(), startD.getMonth(), 1);
    let trendEnd = endD;

    if (preset === 'all') {
      const dates = periodTransactions.map((t) => t.transaction_date).filter(Boolean).sort();
      if (dates.length > 0) {
        const firstD = new Date(dates[0]);
        trendStart = new Date(firstD.getFullYear(), firstD.getMonth(), 1);
        const lastD = new Date(dates[dates.length - 1]);
        const nowD = new Date();
        trendEnd = lastD > nowD ? lastD : nowD;
      } else {
        const nowD = new Date();
        trendStart = new Date(nowD.getFullYear() - 1, nowD.getMonth(), 1);
        trendEnd = nowD;
      }
    }

    let cur = new Date(trendStart);
    while (cur <= trendEnd) {
      const year = cur.getFullYear();
      const monthIdx = cur.getMonth();
      const key = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
      const label = `${MONTH_NAMES_SHORT[monthIdx]} ${year}`;
      trendBucketsMap.set(key, { label, periodKey: key, revenue: 0, expenses: 0 });
      cur = new Date(year, monthIdx + 1, 1);
    }

    periodTransactions.forEach((t) => {
      const monthKey = (t.transaction_date || '').substring(0, 7);
      const bucket = trendBucketsMap.get(monthKey);
      if (bucket) {
        const type = (t.transaction_type || '').toLowerCase();
        const amt = Number(t.base_amount) || 0;
        if (type === 'income') bucket.revenue += amt;
        else if (type === 'refund') bucket.revenue -= amt;
        else if (type === 'expense') bucket.expenses += amt;
      }
    });
  } else {
    // 4-week or sub-period grouping for single-month view
    const daysPerBucket = Math.max(1, Math.ceil(rangeDays / 4));
    for (let i = 0; i < 4; i++) {
      const bStart = new Date(startD.getTime() + i * daysPerBucket * 86400000);
      if (bStart > endD) break;
      const bEnd = new Date(Math.min(endD.getTime(), startD.getTime() + (i + 1) * daysPerBucket * 86400000 - 86400000));
      const key = `W${i + 1}`;
      const label = `W${i + 1} (${formatDisplayDate(formatDateToISO(bStart)).substring(0, 6)})`;
      trendBucketsMap.set(key, { label, periodKey: key, revenue: 0, expenses: 0 });
    }

    periodTransactions.forEach((t) => {
      const tTime = new Date(t.transaction_date).getTime();
      const offsetDays = Math.floor((tTime - startD.getTime()) / 86400000);
      const bucketIndex = Math.min(3, Math.max(0, Math.floor(offsetDays / daysPerBucket)));
      const key = `W${bucketIndex + 1}`;
      const bucket = trendBucketsMap.get(key);
      if (bucket) {
        const type = (t.transaction_type || '').toLowerCase();
        const amt = Number(t.base_amount) || 0;
        if (type === 'income') bucket.revenue += amt;
        else if (type === 'refund') bucket.revenue -= amt;
        else if (type === 'expense') bucket.expenses += amt;
      }
    });
  }

  const monthlyTrend = Array.from(trendBucketsMap.values()).map((b) => ({
    label: b.label,
    periodKey: b.periodKey,
    revenue: Math.round(Math.max(0, b.revenue) * 100) / 100,
    expenses: Math.round(b.expenses * 100) / 100,
    profit: Math.round((b.revenue - b.expenses) * 100) / 100,
  }));

  // --- PREVIOUS PERIOD COMPARISON ---
  let prevRevenue = 0;
  let prevExpenses = 0;

  prevPeriodTransactions.forEach((t) => {
    const type = (t.transaction_type || '').toLowerCase();
    const amt = Number(t.base_amount) || 0;
    if (type === 'income') prevRevenue += amt;
    else if (type === 'refund') prevRevenue -= amt;
    else if (type === 'expense') prevExpenses += amt;
  });

  prevRevenue = Math.max(0, Math.round(prevRevenue * 100) / 100);
  prevExpenses = Math.round(prevExpenses * 100) / 100;
  const prevProfit = Math.round((prevRevenue - prevExpenses) * 100) / 100;

  let revenueChangePct: number | null = null;
  if (prevRevenue > 0) {
    revenueChangePct = Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 1000) / 10;
  } else if (totalRevenue > 0) {
    revenueChangePct = 100;
  }

  let expenseChangePct: number | null = null;
  if (prevExpenses > 0) {
    expenseChangePct = Math.round(((totalExpenses - prevExpenses) / prevExpenses) * 1000) / 10;
  } else if (totalExpenses > 0) {
    expenseChangePct = 100;
  }

  let profitChangePct: number | null = null;
  if (prevProfit !== 0) {
    profitChangePct = Math.round(((netProfit - prevProfit) / Math.abs(prevProfit)) * 1000) / 10;
  }

  return {
    businessId,
    businessName,
    baseCurrency,
    periodLabel,
    preset,
    startDate,
    endDate,
    generatedAt: new Date().toISOString(),
    revenue: {
      clientPayments: Math.round(clientPayments * 100) / 100,
      otherIncome: Math.round(otherIncome * 100) / 100,
      refunds: Math.round(refunds * 100) / 100,
      totalRevenue,
    },
    expenses: {
      totalExpenses,
      categories: expensesByCategory,
    },
    investments: {
      totalInvestments,
      items: investmentItems,
    },
    netProfit,
    profitMargin,
    revenueByCategory,
    expensesByCategory,
    monthlyTrend,
    comparison: {
      previousStartDate,
      previousEndDate,
      previousPeriodLabel,
      previousRevenue: prevRevenue,
      previousExpenses: prevExpenses,
      previousProfit: prevProfit,
      revenueChangePct,
      expenseChangePct,
      profitChangePct,
    },
  };
}

/**
 * Generate standard RFC-4180 compliant CSV content for Profit & Loss
 */
export function generateProfitLossCSV(report: ProfitAndLossReport): string {
  const lines: string[] = [];

  // Header metadata
  lines.push(`"EcomHub OS — Profit & Loss Financial Statement"`);
  lines.push(`"Business Name","${(report.businessName || '').replace(/"/g, '""')}"`);
  lines.push(`"Reporting Period","${(report.periodLabel || '').replace(/"/g, '""')}"`);
  lines.push(`"Date Range","${report.startDate} to ${report.endDate}"`);
  lines.push(`"Base Currency","${report.baseCurrency}"`);
  lines.push(`"Generated At","${report.generatedAt}"`);
  lines.push('');

  // Table Columns
  lines.push(`"Category","Type","Amount (${report.baseCurrency})","% of Total","Date Range"`);

  // REVENUE SECTION
  lines.push(`"Client Payments","Revenue",${report.revenue.clientPayments},"${report.revenue.totalRevenue > 0 ? ((report.revenue.clientPayments / report.revenue.totalRevenue) * 100).toFixed(1) + '%' : '0%'}","${report.startDate} — ${report.endDate}"`);
  if (report.revenue.otherIncome > 0) {
    lines.push(`"Other Income","Revenue",${report.revenue.otherIncome},"${report.revenue.totalRevenue > 0 ? ((report.revenue.otherIncome / report.revenue.totalRevenue) * 100).toFixed(1) + '%' : '0%'}","${report.startDate} — ${report.endDate}"`);
  }
  if (report.revenue.refunds > 0) {
    lines.push(`"Less: Refunds / Adjustments","Revenue (Contra)",-${report.revenue.refunds},"N/A","${report.startDate} — ${report.endDate}"`);
  }
  lines.push(`"Total Revenue","Summary - Revenue",${report.revenue.totalRevenue},"100.0%","${report.startDate} — ${report.endDate}"`);
  lines.push('');

  // EXPENSES SECTION
  report.expenses.categories.forEach((cat) => {
    lines.push(`"${(cat.name || 'General Operations').replace(/"/g, '""')}","Operating Expense",${cat.amount},"${cat.percentage}%","${report.startDate} — ${report.endDate}"`);
  });
  lines.push(`"Total Operating Expenses","Summary - Expense",${report.expenses.totalExpenses},"100.0%","${report.startDate} — ${report.endDate}"`);
  lines.push('');

  // SUMMARY & PROFITABILITY
  lines.push(`"Net Operating Profit / Loss","Summary - Net Profit",${report.netProfit},"${report.profitMargin !== null ? report.profitMargin + '%' : 'N/A'}","${report.startDate} — ${report.endDate}"`);
  lines.push(`"Profit Margin","Summary - Margin","${report.profitMargin !== null ? report.profitMargin + '%' : 'N/A'}","N/A","${report.startDate} — ${report.endDate}"`);

  // INVESTMENTS SECTION (Separate from operating expenses)
  if (report.investments.totalInvestments > 0) {
    lines.push('');
    lines.push(`"Business Capital Investments (CapEx)","Investment",${report.investments.totalInvestments},"Separate from OpEx","${report.startDate} — ${report.endDate}"`);
  }

  // Monthly trend summary
  if (report.monthlyTrend.length > 0) {
    lines.push('');
    lines.push(`"PERIODIC TREND BREAKDOWN"`);
    lines.push(`"Period","Revenue (${report.baseCurrency})","Expenses (${report.baseCurrency})","Net Profit (${report.baseCurrency})"`);
    report.monthlyTrend.forEach((m) => {
      lines.push(`"${m.label}",${m.revenue},${m.expenses},${m.profit}`);
    });
  }

  return lines.join('\n');
}
