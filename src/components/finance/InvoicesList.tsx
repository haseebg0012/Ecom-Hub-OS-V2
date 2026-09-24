import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  DollarSign,
  AlertCircle,
  Clock,
  CheckCircle2,
  Send,
  Printer,
  ChevronRight,
  MoreVertical,
} from 'lucide-react';
import { useFinance } from '../../lib/finance-context';
import { useCrm } from '../../lib/crm-context';
import { InvoiceStatus } from '../../types/finance';
import { RecordPaymentModal } from './modals/RecordPaymentModal';

interface InvoicesListProps {
  onSelectInvoice: (invoiceId: string) => void;
  onOpenCreateInvoice: () => void;
}

export const InvoicesList: React.FC<InvoicesListProps> = ({
  onSelectInvoice,
  onOpenCreateInvoice,
}) => {
  const { invoices, metrics, updateInvoiceStatus } = useFinance();
  const { clients } = useCrm();

  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [clientFilter, setClientFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [paymentModalInvoiceId, setPaymentModalInvoiceId] = useState<string | null>(null);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Status filter
      if (statusFilter !== 'All' && inv.status !== statusFilter) {
        return false;
      }
      // Client filter
      if (clientFilter !== 'All' && inv.client_id !== clientFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const client = clients.find((c) => c.id === inv.client_id);
        const matchNumber = inv.invoice_number.toLowerCase().includes(query);
        const matchClient = client?.company_name.toLowerCase().includes(query);
        if (!matchNumber && !matchClient) {
          return false;
        }
      }
      return true;
    });
  }, [invoices, statusFilter, clientFilter, searchQuery, clients]);

  // Aggregate totals
  const totalInvoiced = useMemo(
    () => invoices.reduce((sum, i) => (i.status !== 'Cancelled' ? sum + i.total_amount : sum), 0),
    [invoices]
  );
  const totalCollected = useMemo(
    () => invoices.reduce((sum, i) => (i.status !== 'Cancelled' ? sum + i.paid_amount : sum), 0),
    [invoices]
  );
  const totalOutstanding = useMemo(
    () => invoices.reduce((sum, i) => (i.status !== 'Cancelled' ? sum + i.balance_due : sum), 0),
    [invoices]
  );

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
            Total Invoiced
          </span>
          <p className="text-xl font-bold text-[#0F172A] mt-1 tracking-tight">
            USD ${totalInvoiced.toLocaleString()}
          </p>
          <p className="text-[11px] text-[#64748B] mt-0.5">Across all active contracts</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
            Collected to Date
          </span>
          <p className="text-xl font-bold text-emerald-600 mt-1 tracking-tight">
            USD ${totalCollected.toLocaleString()}
          </p>
          <p className="text-[11px] text-[#64748B] mt-0.5">
            {totalInvoiced > 0 ? `${Math.round((totalCollected / totalInvoiced) * 100)}% collection rate` : '0%'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
            Outstanding Balance
          </span>
          <p className="text-xl font-bold text-[#4F46E5] mt-1 tracking-tight">
            USD ${totalOutstanding.toLocaleString()}
          </p>
          <p className="text-[11px] text-[#64748B] mt-0.5">Pending client receipt</p>
        </div>
      </div>

      {/* Action Bar with Search & Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Search box */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search invoice # or client..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
            />
          </div>

          {/* Status filter dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
          >
            <option value="All">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Sent">Sent</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Paid">Paid</option>
            <option value="Overdue">Overdue</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {/* Client filter dropdown */}
          <select
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
        </div>

        <button
          onClick={onOpenCreateInvoice}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-xl shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create Invoice</span>
        </button>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 font-semibold">Invoice #</th>
                <th className="py-3 px-4 font-semibold">Client</th>
                <th className="py-3 px-4 font-semibold">Issue Date</th>
                <th className="py-3 px-4 font-semibold">Due Date</th>
                <th className="py-3 px-4 font-semibold">Total Amount</th>
                <th className="py-3 px-4 font-semibold">Collection Progress</th>
                <th className="py-3 px-4 font-semibold">Balance Due</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-[#94A3B8]">
                    No invoices match current filters.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const client = clients.find((c) => c.id === inv.client_id);
                  const progress =
                    inv.total_amount > 0 ? Math.min(100, Math.round((inv.paid_amount / inv.total_amount) * 100)) : 0;
                  const isOverdue =
                    inv.balance_due > 0 &&
                    inv.status !== 'Paid' &&
                    inv.status !== 'Cancelled' &&
                    new Date(inv.due_date) < new Date();

                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-[#F8FAFC] transition-colors group cursor-pointer"
                      onClick={() => onSelectInvoice(inv.id)}
                    >
                      <td className="py-3.5 px-4 font-bold text-[#0F172A] whitespace-nowrap">
                        {inv.invoice_number}
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-[#0F172A] truncate max-w-[180px]">
                          {client?.company_name || 'Client'}
                        </p>
                        <p className="text-[11px] text-[#64748B] truncate max-w-[180px]">
                          {client?.contact_person}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 text-[#64748B] whitespace-nowrap">
                        {inv.issue_date}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 ${
                            isOverdue ? 'text-rose-600 font-semibold' : 'text-[#64748B]'
                          }`}
                        >
                          {isOverdue && <AlertCircle className="w-3 h-3" />}
                          <span>{inv.due_date}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-[#0F172A] whitespace-nowrap">
                        {inv.currency} {inv.total_amount.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 min-w-[140px]">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-[#64748B]">
                            <span>Paid: {inv.currency} {inv.paid_amount.toLocaleString()}</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                            <div
                              style={{ width: `${progress}%` }}
                              className={`h-full rounded-full ${
                                progress === 100 ? 'bg-emerald-500' : 'bg-[#4F46E5]'
                              }`}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-bold whitespace-nowrap">
                        {inv.balance_due > 0 ? (
                          <span className="text-[#4F46E5]">
                            {inv.currency} {inv.balance_due.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-medium">Cleared</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
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
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div
                          className="flex items-center justify-end gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {inv.balance_due > 0 && inv.status !== 'Cancelled' && (
                            <button
                              onClick={() => setPaymentModalInvoiceId(inv.id)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-[#4F46E5] bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                              title="Record Payment"
                            >
                              Pay
                            </button>
                          )}
                          <button
                            onClick={() => onSelectInvoice(inv.id)}
                            className="p-1 rounded-lg text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
                            title="View Invoice"
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

      {/* Record Payment Modal if triggered directly from table */}
      {paymentModalInvoiceId && (
        <RecordPaymentModal
          isOpen={Boolean(paymentModalInvoiceId)}
          onClose={() => setPaymentModalInvoiceId(null)}
          defaultInvoiceId={paymentModalInvoiceId}
        />
      )}
    </div>
  );
};
