import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  AlertCircle,
  Clock,
  Search,
  Download,
  CheckCircle2,
  Calendar,
  Building,
  ArrowRight,
  TrendingUp,
  CreditCard,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { useFinance } from '../../lib/finance-context';
import { useCrm } from '../../lib/crm-context';
import { usePermissions } from '../../lib/use-permissions';
import { RecordPaymentModal } from './modals/RecordPaymentModal';
import { Invoice } from '../../types/finance';

interface AccountsReceivableViewProps {
  onSelectInvoice: (invoiceId: string) => void;
  onSelectClient?: (clientId: string) => void;
}

export const AccountsReceivableView: React.FC<AccountsReceivableViewProps> = ({
  onSelectInvoice,
  onSelectClient,
}) => {
  const { invoices, metrics, exportReceivablesCSV, financeSettings } = useFinance();
  const { clients, getExchangeRate } = useCrm();
  const { can } = usePermissions();
  const canRecordPayment = can('finance.create');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Current' | 'Overdue'>('All');
  const [clientFilter, setClientFilter] = useState<string>('All');
  const [currencyFilter, setCurrencyFilter] = useState<string>('All');
  const [agingFilter, setAgingFilter] = useState<string>('All');
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<string | null>(null);

  const baseCurrency = financeSettings?.base_currency || 'PKR';
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Filter open / unpaid invoices
  const openInvoices = useMemo(() => {
    return invoices.filter(
      (inv) => inv.status !== 'Paid' && inv.status !== 'Cancelled' && (Number(inv.balance_due) || 0) > 0.01
    );
  }, [invoices]);

  // Calculations for overdue days
  const getDaysOverdue = (dueDateStr: string): number => {
    const due = new Date(dueDateStr);
    due.setHours(0, 0, 0, 0);
    const diff = today.getTime() - due.getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  };

  // Aging categorization helper
  const getAgingBucket = (inv: Invoice): 'current' | '1-30' | '31-60' | '60+' => {
    if (inv.due_date >= todayStr) return 'current';
    const days = getDaysOverdue(inv.due_date);
    if (days <= 30) return '1-30';
    if (days <= 60) return '31-60';
    return '60+';
  };

  // Filtered list
  const filteredInvoices = useMemo(() => {
    return openInvoices.filter((inv) => {
      const isOverdue = inv.due_date < todayStr;

      // Status filter
      if (statusFilter === 'Current' && isOverdue) return false;
      if (statusFilter === 'Overdue' && !isOverdue) return false;

      // Client filter
      if (clientFilter !== 'All' && inv.client_id !== clientFilter) return false;

      // Currency filter
      if (currencyFilter !== 'All' && inv.currency !== currencyFilter) return false;

      // Aging filter
      if (agingFilter !== 'All') {
        const bucket = getAgingBucket(inv);
        if (agingFilter === 'current' && bucket !== 'current') return false;
        if (agingFilter === '1-30' && bucket !== '1-30') return false;
        if (agingFilter === '31-60' && bucket !== '31-60') return false;
        if (agingFilter === '60+' && bucket !== '60+') return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const client = clients.find((c) => c.id === inv.client_id);
        const matchNum = inv.invoice_number.toLowerCase().includes(q);
        const matchClient = client?.company_name.toLowerCase().includes(q);
        if (!matchNum && !matchClient) return false;
      }

      return true;
    });
  }, [openInvoices, statusFilter, clientFilter, currencyFilter, agingFilter, searchQuery, clients, todayStr]);

  // Aging summary metrics
  const agingSummary = useMemo(() => {
    let currentTotalBase = 0;
    let b1_30TotalBase = 0;
    let b31_60TotalBase = 0;
    let b60PlusTotalBase = 0;

    let currentCount = 0;
    let b1_30Count = 0;
    let b31_60Count = 0;
    let b60PlusCount = 0;

    openInvoices.forEach((inv) => {
      const rate = inv.currency === baseCurrency ? 1 : (inv.exchange_rate || getExchangeRate(inv.currency, baseCurrency));
      const balBase = (Number(inv.balance_due) || 0) * rate;
      const bucket = getAgingBucket(inv);

      if (bucket === 'current') {
        currentTotalBase += balBase;
        currentCount++;
      } else if (bucket === '1-30') {
        b1_30TotalBase += balBase;
        b1_30Count++;
      } else if (bucket === '31-60') {
        b31_60TotalBase += balBase;
        b31_60Count++;
      } else {
        b60PlusTotalBase += balBase;
        b60PlusCount++;
      }
    });

    const overdueTotalBase = b1_30TotalBase + b31_60TotalBase + b60PlusTotalBase;
    const overdueCount = b1_30Count + b31_60Count + b60PlusCount;
    const totalBase = currentTotalBase + overdueTotalBase;

    return {
      currentTotalBase,
      currentCount,
      b1_30TotalBase,
      b1_30Count,
      b31_60TotalBase,
      b31_60Count,
      b60PlusTotalBase,
      b60PlusCount,
      overdueTotalBase,
      overdueCount,
      totalBase,
    };
  }, [openInvoices, baseCurrency, getExchangeRate]);

  // USD equivalent of total receivables
  const totalInUSD = useMemo(() => {
    const pkrToUsdRate = getExchangeRate('PKR', 'USD') || (1 / 280);
    return Math.round(agingSummary.totalBase * pkrToUsdRate);
  }, [agingSummary.totalBase, getExchangeRate]);

  return (
    <div id="accounts-receivable-view" className="space-y-6">
      {/* Top Header & Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Receivables (PKR) */}
        <div id="card-total-receivables" className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              Total Receivables
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-[#4F46E5]">
              {openInvoices.length} Invoices
            </span>
          </div>
          <p className="text-xl font-bold text-[#0F172A] mt-2 tracking-tight">
            PKR {Math.round(agingSummary.totalBase).toLocaleString()}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-[#64748B] mt-1">
            <span>≈ USD ${totalInUSD.toLocaleString()}</span>
            <span className="text-[10px] text-[#94A3B8]">• Converted Base</span>
          </div>
        </div>

        {/* Current Receivables */}
        <div id="card-current-receivables" className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              Current (Not Due)
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
              {agingSummary.currentCount} Invoices
            </span>
          </div>
          <p className="text-xl font-bold text-emerald-600 mt-2 tracking-tight">
            PKR {Math.round(agingSummary.currentTotalBase).toLocaleString()}
          </p>
          <p className="text-xs text-[#64748B] mt-1">
            {agingSummary.totalBase > 0
              ? `${Math.round((agingSummary.currentTotalBase / agingSummary.totalBase) * 100)}% of open receivables`
              : '0%'}
          </p>
        </div>

        {/* Overdue Receivables */}
        <div id="card-overdue-receivables" className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              Overdue Receivables
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700">
              {agingSummary.overdueCount} Overdue
            </span>
          </div>
          <p className="text-xl font-bold text-rose-600 mt-2 tracking-tight">
            PKR {Math.round(agingSummary.overdueTotalBase).toLocaleString()}
          </p>
          <p className="text-xs text-[#64748B] mt-1">
            Requires immediate payment follow-up
          </p>
        </div>

        {/* Overdue Invoices Count / High Alert */}
        <div id="card-receivables-health" className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
              Critical Aging (60+d)
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
              {agingSummary.b60PlusCount} Critical
            </span>
          </div>
          <p className="text-xl font-bold text-amber-600 mt-2 tracking-tight">
            PKR {Math.round(agingSummary.b60PlusTotalBase).toLocaleString()}
          </p>
          <p className="text-xs text-[#64748B] mt-1">
            {agingSummary.b60PlusCount > 0 ? 'High default risk' : 'No 60+ days aging'}
          </p>
        </div>
      </div>

      {/* Aging Breakdown Bar */}
      <div id="aging-breakdown-panel" className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
              Accounts Receivable Aging Analysis
            </h3>
            <p className="text-[11px] text-[#64748B]">
              Distribution of outstanding client balances across aging buckets
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="btn-export-receivables"
              onClick={exportReceivablesCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0F172A] bg-white border border-[#E2E8F0] rounded-xl hover:bg-[#F8FAFC] transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-[#64748B]" />
              <span>Export AR Report (CSV)</span>
            </button>
          </div>
        </div>

        {/* Visual Progress Ribbon */}
        {agingSummary.totalBase > 0 && (
          <div className="w-full h-3 bg-[#F1F5F9] rounded-full overflow-hidden flex">
            {agingSummary.currentTotalBase > 0 && (
              <div
                style={{ width: `${(agingSummary.currentTotalBase / agingSummary.totalBase) * 100}%` }}
                className="bg-emerald-500 h-full transition-all"
                title={`Current: PKR ${Math.round(agingSummary.currentTotalBase).toLocaleString()}`}
              />
            )}
            {agingSummary.b1_30TotalBase > 0 && (
              <div
                style={{ width: `${(agingSummary.b1_30TotalBase / agingSummary.totalBase) * 100}%` }}
                className="bg-amber-400 h-full transition-all"
                title={`1-30 Days: PKR ${Math.round(agingSummary.b1_30TotalBase).toLocaleString()}`}
              />
            )}
            {agingSummary.b31_60TotalBase > 0 && (
              <div
                style={{ width: `${(agingSummary.b31_60TotalBase / agingSummary.totalBase) * 100}%` }}
                className="bg-orange-500 h-full transition-all"
                title={`31-60 Days: PKR ${Math.round(agingSummary.b31_60TotalBase).toLocaleString()}`}
              />
            )}
            {agingSummary.b60PlusTotalBase > 0 && (
              <div
                style={{ width: `${(agingSummary.b60PlusTotalBase / agingSummary.totalBase) * 100}%` }}
                className="bg-rose-500 h-full transition-all"
                title={`60+ Days: PKR ${Math.round(agingSummary.b60PlusTotalBase).toLocaleString()}`}
              />
            )}
          </div>
        )}

        {/* 4 Interactive Aging Buckets */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <button
            onClick={() => setAgingFilter(agingFilter === 'current' ? 'All' : 'current')}
            className={`p-3 rounded-xl border text-left transition-all ${
              agingFilter === 'current'
                ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-200'
                : 'border-[#E2E8F0] hover:bg-[#F8FAFC]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                Current (On Time)
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <p className="text-sm font-bold text-[#0F172A] mt-1">
              PKR {Math.round(agingSummary.currentTotalBase).toLocaleString()}
            </p>
            <p className="text-[10px] text-[#64748B]">{agingSummary.currentCount} open invoices</p>
          </button>

          <button
            onClick={() => setAgingFilter(agingFilter === '1-30' ? 'All' : '1-30')}
            className={`p-3 rounded-xl border text-left transition-all ${
              agingFilter === '1-30'
                ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-200'
                : 'border-[#E2E8F0] hover:bg-[#F8FAFC]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                1–30 Days Late
              </span>
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            </div>
            <p className="text-sm font-bold text-[#0F172A] mt-1">
              PKR {Math.round(agingSummary.b1_30TotalBase).toLocaleString()}
            </p>
            <p className="text-[10px] text-[#64748B]">{agingSummary.b1_30Count} overdue invoices</p>
          </button>

          <button
            onClick={() => setAgingFilter(agingFilter === '31-60' ? 'All' : '31-60')}
            className={`p-3 rounded-xl border text-left transition-all ${
              agingFilter === '31-60'
                ? 'border-orange-500 bg-orange-50/50 ring-2 ring-orange-200'
                : 'border-[#E2E8F0] hover:bg-[#F8FAFC]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700">
                31–60 Days Late
              </span>
              <span className="w-2 h-2 rounded-full bg-orange-500" />
            </div>
            <p className="text-sm font-bold text-[#0F172A] mt-1">
              PKR {Math.round(agingSummary.b31_60TotalBase).toLocaleString()}
            </p>
            <p className="text-[10px] text-[#64748B]">{agingSummary.b31_60Count} overdue invoices</p>
          </button>

          <button
            onClick={() => setAgingFilter(agingFilter === '60+' ? 'All' : '60+')}
            className={`p-3 rounded-xl border text-left transition-all ${
              agingFilter === '60+'
                ? 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-200'
                : 'border-[#E2E8F0] hover:bg-[#F8FAFC]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
                60+ Days Late
              </span>
              <span className="w-2 h-2 rounded-full bg-rose-500" />
            </div>
            <p className="text-sm font-bold text-[#0F172A] mt-1">
              PKR {Math.round(agingSummary.b60PlusTotalBase).toLocaleString()}
            </p>
            <p className="text-[10px] text-[#64748B]">{agingSummary.b60PlusCount} overdue invoices</p>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              id="input-search-receivables"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search invoice # or client..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center bg-white border border-[#E2E8F0] rounded-xl p-0.5 text-xs font-semibold">
            <button
              onClick={() => setStatusFilter('All')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                statusFilter === 'All' ? 'bg-[#4F46E5] text-white' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              All Open
            </button>
            <button
              onClick={() => setStatusFilter('Current')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                statusFilter === 'Current' ? 'bg-[#4F46E5] text-white' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Current
            </button>
            <button
              onClick={() => setStatusFilter('Overdue')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                statusFilter === 'Overdue' ? 'bg-rose-600 text-white' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Overdue
            </button>
          </div>

          {/* Client Filter */}
          <select
            id="select-client-filter"
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
          >
            <option value="All">All Clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company_name}
              </option>
            ))}
          </select>

          {/* Currency Filter */}
          <select
            id="select-currency-filter"
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
          >
            <option value="All">All Currencies</option>
            <option value="PKR">PKR (Pakistani Rupee)</option>
            <option value="USD">USD (US Dollar)</option>
          </select>

          {agingFilter !== 'All' && (
            <button
              onClick={() => setAgingFilter('All')}
              className="px-2.5 py-1 text-[11px] font-semibold text-[#4F46E5] bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              Clear Aging Filter ({agingFilter})
            </button>
          )}
        </div>

        <div className="text-xs text-[#64748B] self-end md:self-center">
          Showing <span className="font-bold text-[#0F172A]">{filteredInvoices.length}</span> receivable invoices
        </div>
      </div>

      {/* Receivables Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 font-semibold">Invoice #</th>
                <th className="py-3 px-4 font-semibold">Client</th>
                <th className="py-3 px-4 font-semibold">Issue Date</th>
                <th className="py-3 px-4 font-semibold">Due Date</th>
                <th className="py-3 px-4 font-semibold text-right">Total</th>
                <th className="py-3 px-4 font-semibold text-right">Paid</th>
                <th className="py-3 px-4 font-semibold text-right">Balance Due</th>
                <th className="py-3 px-4 font-semibold text-right">Base (PKR)</th>
                <th className="py-3 px-4 font-semibold text-center">Status / Aging</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-xs text-[#94A3B8]">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                    <p className="font-semibold text-[#0F172A]">No outstanding receivables found</p>
                    <p className="text-[11px] text-[#64748B] mt-0.5">
                      All invoices match payment criteria or no records fit selected filters.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const client = clients.find((c) => c.id === inv.client_id);
                  const isOverdue = inv.due_date < todayStr;
                  const daysOverdue = isOverdue ? getDaysOverdue(inv.due_date) : 0;
                  const rate = inv.currency === baseCurrency ? 1 : (inv.exchange_rate || getExchangeRate(inv.currency, baseCurrency));
                  const balBase = (Number(inv.balance_due) || 0) * rate;
                  const invoiceTotal = Number(inv.total ?? (inv as any).total_amount ?? 0);

                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-[#F8FAFC] transition-colors group cursor-pointer"
                      onClick={() => onSelectInvoice(inv.id)}
                    >
                      {/* Invoice # */}
                      <td className="py-3.5 px-4 font-bold text-[#4F46E5] whitespace-nowrap hover:underline">
                        {inv.invoice_number}
                      </td>

                      {/* Client */}
                      <td className="py-3.5 px-4">
                        <p
                          className="font-semibold text-[#0F172A] truncate max-w-[180px] hover:text-[#4F46E5]"
                          onClick={(e) => {
                            if (onSelectClient && inv.client_id) {
                              e.stopPropagation();
                              onSelectClient(inv.client_id);
                            }
                          }}
                        >
                          {client?.company_name || 'Client'}
                        </p>
                        {client?.contact_person && (
                          <p className="text-[11px] text-[#64748B] truncate max-w-[180px]">
                            {client.contact_person}
                          </p>
                        )}
                      </td>

                      {/* Issue Date */}
                      <td className="py-3.5 px-4 text-[#64748B] whitespace-nowrap">
                        {inv.issue_date}
                      </td>

                      {/* Due Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 font-medium ${
                            isOverdue ? 'text-rose-600 font-bold' : 'text-[#0F172A]'
                          }`}
                        >
                          {isOverdue && <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                          <span>{inv.due_date}</span>
                        </span>
                      </td>

                      {/* Total */}
                      <td className="py-3.5 px-4 text-right font-medium text-[#0F172A] whitespace-nowrap">
                        {inv.currency} {invoiceTotal.toLocaleString()}
                      </td>

                      {/* Paid */}
                      <td className="py-3.5 px-4 text-right font-medium text-emerald-600 whitespace-nowrap">
                        {inv.currency} {(Number(inv.paid_amount) || 0).toLocaleString()}
                      </td>

                      {/* Balance Due */}
                      <td className="py-3.5 px-4 text-right font-bold text-[#4F46E5] whitespace-nowrap">
                        {inv.currency} {(Number(inv.balance_due) || 0).toLocaleString()}
                      </td>

                      {/* Base Equivalent */}
                      <td className="py-3.5 px-4 text-right text-[#64748B] font-mono text-[11px] whitespace-nowrap">
                        Rs. {Math.round(balBase).toLocaleString()}
                      </td>

                      {/* Status / Aging Badge */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {isOverdue ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertCircle className="w-3 h-3" />
                            <span>Overdue ({daysOverdue}d)</span>
                          </span>
                        ) : inv.paid_amount > 0 ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700">
                            Partially Paid
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700">
                            Current (Due soon)
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div
                          className="flex items-center justify-end gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {canRecordPayment && (
                            <button
                              onClick={() => setSelectedInvoiceForPayment(inv.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-lg shadow-2xs transition-colors"
                              title="Record Payment"
                            >
                              <CreditCard className="w-3 h-3" />
                              <span>Record Pay</span>
                            </button>
                          )}
                          <button
                            onClick={() => onSelectInvoice(inv.id)}
                            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
                            title="View Invoice Detail"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {selectedInvoiceForPayment && (
        <RecordPaymentModal
          isOpen={Boolean(selectedInvoiceForPayment)}
          onClose={() => setSelectedInvoiceForPayment(null)}
          defaultInvoiceId={selectedInvoiceForPayment}
        />
      )}
    </div>
  );
};
