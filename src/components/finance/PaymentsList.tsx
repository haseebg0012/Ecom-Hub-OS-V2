import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  Building,
  DollarSign,
  Download,
  XCircle,
  AlertTriangle,
  RotateCcw,
  FileText,
} from 'lucide-react';
import { useFinance } from '../../lib/finance-context';
import { useCrm } from '../../lib/crm-context';
import { usePermissions } from '../../lib/use-permissions';
import { Payment } from '../../types/finance';

interface PaymentsListProps {
  onOpenRecordPayment: () => void;
  onSelectInvoice: (invoiceId: string) => void;
}

export const PaymentsList: React.FC<PaymentsListProps> = ({
  onOpenRecordPayment,
  onSelectInvoice,
}) => {
  const { payments, invoices, accounts, cancelPayment, exportPaymentsCSV } = useFinance();
  const { clients } = useCrm();
  const { can } = usePermissions();
  const canCancel = can('finance.delete') || can('finance.edit');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Completed' | 'Cancelled'>('All');
  const [accountFilter, setAccountFilter] = useState<string>('All');
  
  // Payment cancellation state
  const [cancellingPayment, setCancellingPayment] = useState<Payment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      // Status filter
      if (statusFilter === 'Completed' && (p.status === 'Cancelled' || p.status === 'cancelled')) return false;
      if (statusFilter === 'Cancelled' && p.status !== 'Cancelled' && p.status !== 'cancelled') return false;

      // Account filter
      if (accountFilter !== 'All' && p.account_id !== accountFilter) return false;

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const client = clients.find((c) => c.id === p.client_id);
        const invoice = invoices.find((i) => i.id === p.invoice_id);
        const matchNumber = p.payment_number.toLowerCase().includes(q);
        const matchClient = client?.company_name.toLowerCase().includes(q);
        const matchInv = invoice?.invoice_number.toLowerCase().includes(q);
        const matchRef = p.reference?.toLowerCase().includes(q);
        if (!matchNumber && !matchClient && !matchInv && !matchRef) return false;
      }

      return true;
    });
  }, [payments, statusFilter, accountFilter, searchQuery, clients, invoices]);

  // Aggregate active collections
  const activePayments = payments.filter((p) => p.status !== 'Cancelled' && p.status !== 'cancelled');
  const totalCollectedBase = activePayments.reduce((sum, p) => sum + (Number(p.base_amount) || Number(p.amount) || 0), 0);
  const cancelledCount = payments.filter((p) => p.status === 'Cancelled' || p.status === 'cancelled').length;

  const handleConfirmCancel = async () => {
    if (!cancellingPayment) return;
    setIsSubmittingCancel(true);
    setCancelError(null);

    const res = await cancelPayment(cancellingPayment.id, cancelReason.trim() || 'Cancelled by authorized user');
    setIsSubmittingCancel(false);

    if (res.success) {
      setCancellingPayment(null);
      setCancelReason('');
    } else {
      setCancelError(res.error || 'Failed to cancel payment.');
    }
  };

  return (
    <div id="payments-list-container" className="space-y-6">
      {/* Metrics Banner */}
      <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
            Reconciled Client Collections
          </span>
          <p className="text-2xl font-bold text-emerald-600 mt-1 tracking-tight">
            PKR {Math.round(totalCollectedBase).toLocaleString()}
          </p>
          <div className="flex items-center gap-2 text-xs text-[#64748B] mt-0.5">
            <span>{activePayments.length} active verified deposits</span>
            {cancelledCount > 0 && (
              <span className="text-rose-600 font-semibold">• {cancelledCount} cancelled</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-export-payments"
            onClick={exportPaymentsCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0F172A] bg-white border border-[#E2E8F0] rounded-xl hover:bg-[#F8FAFC] transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-[#64748B]" />
            <span>Export CSV</span>
          </button>
          <button
            id="btn-record-payment-top"
            onClick={onOpenRecordPayment}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-xl shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              id="input-search-payments"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search payment #, client, or invoice..."
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
              All
            </button>
            <button
              onClick={() => setStatusFilter('Completed')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                statusFilter === 'Completed' ? 'bg-emerald-600 text-white' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => setStatusFilter('Cancelled')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                statusFilter === 'Cancelled' ? 'bg-rose-600 text-white' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Cancelled
            </button>
          </div>

          {/* Account Filter */}
          <select
            id="select-account-filter"
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
          >
            <option value="All">All Bank / Cash Accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.currency})
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-[#64748B] self-end md:self-center">
          Showing <span className="font-bold text-[#0F172A]">{filteredPayments.length}</span> payment records
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 font-semibold">Payment #</th>
                <th className="py-3 px-4 font-semibold">Client</th>
                <th className="py-3 px-4 font-semibold">Invoice Ref</th>
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold">Deposited To</th>
                <th className="py-3 px-4 font-semibold">Method & Ref</th>
                <th className="py-3 px-4 font-semibold text-right">Amount</th>
                <th className="py-3 px-4 font-semibold text-right">Base (PKR)</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-xs text-[#94A3B8]">
                    No payment records found.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  const client = clients.find((c) => c.id === p.client_id);
                  const invoice = invoices.find((i) => i.id === p.invoice_id);
                  const account = accounts.find((a) => a.id === p.account_id);
                  const isCancelled = p.status === 'Cancelled' || p.status === 'cancelled';

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-[#F8FAFC] transition-colors ${
                        isCancelled ? 'opacity-65 bg-gray-50/50' : ''
                      }`}
                    >
                      {/* Payment # */}
                      <td className="py-3.5 px-4 font-bold text-[#0F172A] whitespace-nowrap">
                        <span className={isCancelled ? 'line-through text-[#94A3B8]' : ''}>
                          {p.payment_number}
                        </span>
                      </td>

                      {/* Client */}
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-[#0F172A] truncate max-w-[160px]">
                          {client?.company_name || 'Client'}
                        </p>
                      </td>

                      {/* Invoice Ref */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {invoice ? (
                          <button
                            onClick={() => onSelectInvoice(invoice.id)}
                            className="font-semibold text-[#4F46E5] hover:underline inline-flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3" />
                            <span>{invoice.invoice_number}</span>
                          </button>
                        ) : (
                          <span className="text-[#94A3B8]">Direct Deposit</span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-[#64748B] whitespace-nowrap">
                        {p.payment_date}
                      </td>

                      {/* Account */}
                      <td className="py-3.5 px-4 text-[#0F172A] font-medium whitespace-nowrap">
                        {account?.name || 'Account'}
                      </td>

                      {/* Method & Reference */}
                      <td className="py-3.5 px-4">
                        <p className="font-medium text-[#0F172A]">{p.payment_method}</p>
                        {p.reference && (
                          <p className="text-[10px] text-[#94A3B8] font-mono truncate max-w-[120px]">
                            {p.reference}
                          </p>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right font-bold whitespace-nowrap">
                        <span className={isCancelled ? 'line-through text-[#94A3B8]' : 'text-emerald-600'}>
                          + {p.currency} {Number(p.amount).toLocaleString()}
                        </span>
                      </td>

                      {/* Base PKR */}
                      <td className="py-3.5 px-4 text-right text-[#64748B] font-mono text-[11px] whitespace-nowrap">
                        <span className={isCancelled ? 'line-through' : ''}>
                          Rs. {Math.round(Number(p.base_amount || p.amount)).toLocaleString()}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {isCancelled ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200"
                            title={p.cancellation_reason || 'Cancelled'}
                          >
                            <XCircle className="w-3 h-3" />
                            <span>Cancelled</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Completed</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {invoice && (
                            <button
                              onClick={() => onSelectInvoice(invoice.id)}
                              className="px-2 py-1 text-[11px] font-semibold text-[#4F46E5] hover:bg-indigo-50 rounded-lg transition-colors"
                              title="View Linked Invoice"
                            >
                              View Invoice
                            </button>
                          )}
                          {!isCancelled && canCancel && (
                            <button
                              onClick={() => {
                                setCancellingPayment(p);
                                setCancelReason('');
                                setCancelError(null);
                              }}
                              className="p-1 text-[#94A3B8] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Cancel this Payment"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
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

      {/* Cancel Payment Confirmation Modal */}
      {cancellingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-[#E2E8F0] shadow-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">
                  Cancel Payment {cancellingPayment.payment_number}
                </h3>
                <p className="text-xs text-[#64748B]">
                  Amount: {cancellingPayment.currency} {Number(cancellingPayment.amount).toLocaleString()}
                </p>
              </div>
            </div>

            <p className="text-xs text-[#64748B] leading-relaxed">
              Cancelling this payment will mark the financial transaction as cancelled, reverse the account balance increase, restore the invoice balance due, and increase client outstanding balance.
            </p>

            {cancelError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
                {cancelError}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#64748B] mb-1">
                Cancellation Reason (Optional)
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Cheque bounced, duplicate entry, client request"
                className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F1F5F9]">
              <button
                type="button"
                onClick={() => setCancellingPayment(null)}
                disabled={isSubmittingCancel}
                className="px-3.5 py-2 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] bg-white border border-[#E2E8F0] rounded-xl hover:bg-[#F8FAFC] transition-colors"
              >
                Keep Payment
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isSubmittingCancel}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-2xs disabled:opacity-50"
              >
                {isSubmittingCancel ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

