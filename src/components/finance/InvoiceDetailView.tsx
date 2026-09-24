import React, { useState } from 'react';
import {
  ArrowLeft,
  Printer,
  DollarSign,
  Send,
  XCircle,
  Clock,
  CheckCircle2,
  Building,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { useFinance } from '../../lib/finance-context';
import { useCrm } from '../../lib/crm-context';
import { usePermissions } from '../../lib/use-permissions';
import { Payment } from '../../types/finance';
import { RecordPaymentModal } from './modals/RecordPaymentModal';

interface InvoiceDetailViewProps {
  invoiceId: string;
  onBack: () => void;
}

export const InvoiceDetailView: React.FC<InvoiceDetailViewProps> = ({ invoiceId, onBack }) => {
  const { invoices, payments, updateInvoiceStatus, financeSettings, cancelPayment } = useFinance();
  const { clients } = useCrm();
  const { can } = usePermissions();
  const canCancel = can('finance.delete') || can('finance.edit');

  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [cancellingPayment, setCancellingPayment] = useState<Payment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  const invoice = invoices.find((i) => i.id === invoiceId);

  if (!invoice) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-[#E2E8F0]">
        <p className="text-sm font-semibold text-[#0F172A]">Invoice not found.</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 text-xs font-semibold text-[#4F46E5] hover:underline"
        >
          Return to invoices list
        </button>
      </div>
    );
  }

  const client = clients.find((c) => c.id === invoice.client_id);
  const invoicePayments = payments.filter((p) => p.invoice_id === invoice.id);

  const handlePrint = () => {
    window.print();
  };

  const handleMarkSent = async () => {
    await updateInvoiceStatus(invoice.id, 'Sent');
  };

  const handleCancelInvoice = async () => {
    if (window.confirm('Are you sure you want to cancel this invoice?')) {
      await updateInvoiceStatus(invoice.id, 'Cancelled');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar (Hidden during print) */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] p-2 hover:bg-white rounded-xl border border-transparent hover:border-[#E2E8F0] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Invoices</span>
        </button>

        <div className="flex items-center gap-2">
          {invoice.status === 'Draft' && (
            <button
              onClick={handleMarkSent}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#4F46E5] bg-white border border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Mark as Sent</span>
            </button>
          )}

          {invoice.balance_due > 0 && invoice.status !== 'Cancelled' && (
            <button
              onClick={() => setIsRecordPaymentOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-xl shadow-xs transition-colors"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Record Payment</span>
            </button>
          )}

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0F172A] bg-white border border-[#E2E8F0] rounded-xl hover:bg-[#F8FAFC] transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF</span>
          </button>

          {invoice.status !== 'Cancelled' && (
            <button
              onClick={handleCancelInvoice}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 bg-white border border-rose-200 rounded-xl hover:bg-rose-50 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          )}
        </div>
      </div>

      {/* Printable Invoice Document Sheet */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-8 sm:p-12 max-w-4xl mx-auto print:border-none print:shadow-none print:p-0">
        {/* Header Branding & Invoice Meta */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-[#E2E8F0] pb-8">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-[#4F46E5] text-white flex items-center justify-center font-bold text-base shadow-xs">
                E
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">Ecometrix Hub</h1>
                <p className="text-xs text-[#64748B]">Digital Architecture & Business Operations</p>
              </div>
            </div>
            <div className="mt-4 text-xs text-[#64748B] space-y-1">
              <p>Islamabad / Lahore, Pakistan</p>
              <p>billing@ecometrixhub.com • www.ecometrixhub.com</p>
              <p className="text-[11px] text-[#94A3B8]">Tax ID: PK-84920194-ECOM</p>
            </div>
          </div>

          <div className="sm:text-right space-y-2">
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                invoice.status === 'Paid'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : invoice.status === 'Partially Paid'
                  ? 'bg-sky-50 text-sky-700 border border-sky-200'
                  : invoice.status === 'Overdue'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {invoice.status}
            </span>
            <p className="text-2xl font-black text-[#0F172A] tracking-tight">
              {invoice.invoice_number}
            </p>
            <div className="text-xs text-[#64748B] space-y-1 font-medium">
              <p>
                Issue Date:{' '}
                <span className="text-[#0F172A] font-semibold">{invoice.issue_date}</span>
              </p>
              <p>
                Due Date:{' '}
                <span className="text-[#0F172A] font-semibold">{invoice.due_date}</span>
              </p>
              <p>
                Terms:{' '}
                <span className="text-[#0F172A] font-semibold">{invoice.terms || 'Net 15'}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Bill To & Remit Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-8 border-b border-[#E2E8F0] text-xs">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] block mb-2">
              Billed To:
            </span>
            <p className="text-base font-bold text-[#0F172A]">{client?.company_name || 'Client'}</p>
            {client?.contact_person && (
              <p className="text-[#64748B] mt-0.5">Attn: {client.contact_person}</p>
            )}
            {client?.email && (
              <p className="text-[#64748B] flex items-center gap-1 mt-1">
                <Mail className="w-3.5 h-3.5 text-[#94A3B8]" />
                <span>{client.email}</span>
              </p>
            )}
            {client?.address && (
              <p className="text-[#64748B] flex items-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5 text-[#94A3B8]" />
                <span>
                  {client.address}, {client.country}
                </span>
              </p>
            )}
          </div>

          <div className="sm:text-right space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] block mb-2">
              Payment Summary:
            </span>
            <p className="text-xs text-[#64748B]">
              Total Invoiced:{' '}
              <span className="font-semibold text-[#0F172A]">
                {invoice.currency} {(invoice.total_amount || 0).toLocaleString()}
              </span>
            </p>
            <p className="text-xs text-[#64748B]">
              Paid to Date:{' '}
              <span className="font-semibold text-emerald-600">
                {invoice.currency} {(invoice.paid_amount || 0).toLocaleString()}
              </span>
            </p>
            <div className="pt-2">
              <span className="text-xs font-semibold text-[#64748B] block">Amount Due</span>
              <span className="text-xl font-black text-[#4F46E5]">
                {invoice.currency} {(invoice.balance_due || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Itemized Deliverables Table */}
        <div className="py-8 border-b border-[#E2E8F0]">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-[#64748B] uppercase tracking-wider text-[11px]">
                <th className="pb-3 font-semibold">Scope & Description</th>
                <th className="pb-3 text-center font-semibold w-16">Qty</th>
                <th className="pb-3 text-right font-semibold w-28">Unit Price</th>
                <th className="pb-3 text-right font-semibold w-28">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {invoice.items.map((item, idx) => (
                <tr key={idx} className="py-3">
                  <td className="py-3.5 pr-4 text-[#0F172A] font-medium">
                    {item.description}
                  </td>
                  <td className="py-3.5 text-center text-[#64748B]">{item.quantity}</td>
                  <td className="py-3.5 text-right text-[#64748B]">
                    {invoice.currency} {(item.unit_price || 0).toLocaleString()}
                  </td>
                  <td className="py-3.5 text-right font-bold text-[#0F172A]">
                    {invoice.currency} {(item.total_amount || 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Subtotals & Totals summary block */}
          <div className="flex justify-end pt-6">
            <div className="w-64 space-y-2 text-xs">
              <div className="flex justify-between text-[#64748B]">
                <span>Subtotal</span>
                <span className="font-semibold text-[#0F172A]">
                  {invoice.currency} {(invoice.subtotal || 0).toLocaleString()}
                </span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between text-[#64748B]">
                  <span>Discount</span>
                  <span className="font-semibold text-rose-600">
                    - {invoice.currency} {(invoice.discount || 0).toLocaleString()}
                  </span>
                </div>
              )}
              {invoice.tax > 0 && (
                <div className="flex justify-between text-[#64748B]">
                  <span>Tax / VAT</span>
                  <span className="font-semibold text-[#0F172A]">
                    + {invoice.currency} {(invoice.tax || 0).toLocaleString()}
                  </span>
                </div>
              )}
              <div className="pt-2 border-t border-[#E2E8F0] flex justify-between items-center text-sm font-bold text-[#0F172A]">
                <span>Total</span>
                <span className="text-base text-[#0F172A]">
                  {invoice.currency} {(invoice.total ?? (invoice as any).total_amount ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs font-semibold text-emerald-600">
                <span>Paid</span>
                <span>
                  - {invoice.currency} {(invoice.paid_amount || 0).toLocaleString()}
                </span>
              </div>
              <div className="pt-2 border-t border-[#E2E8F0] flex justify-between items-center text-sm font-bold">
                <span className="text-[#0F172A]">Balance Due</span>
                <span className="text-base text-[#4F46E5]">
                  {invoice.currency} {(invoice.balance_due || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payments History for this invoice */}
        {invoicePayments.length > 0 && (
          <div className="py-6 border-b border-[#E2E8F0]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] block mb-3">
              Payment Receipts Applied ({invoicePayments.length}):
            </span>
            <div className="space-y-2 text-xs">
              {invoicePayments.map((p) => {
                const isCancelled = p.status === 'Cancelled' || p.status === 'cancelled';
                return (
                  <div
                    key={p.id}
                    className={`p-3 rounded-xl border flex items-center justify-between ${
                      isCancelled
                        ? 'bg-rose-50/40 border-rose-200/60 opacity-75'
                        : 'bg-[#F8FAFC] border-[#E2E8F0]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {isCancelled ? (
                        <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${isCancelled ? 'line-through text-[#64748B]' : 'text-[#0F172A]'}`}>
                            {p.payment_number}
                          </span>
                          {isCancelled && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                              Cancelled
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#64748B] mt-0.5">
                          {p.payment_date} via {p.payment_method}
                          {p.reference ? ` • Ref: ${p.reference}` : ''}
                          {isCancelled && p.cancellation_reason ? ` • (${p.cancellation_reason})` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`font-bold ${isCancelled ? 'line-through text-[#94A3B8]' : 'text-emerald-600'}`}>
                        + {p.currency} {(p.amount || 0).toLocaleString()}
                      </span>
                      {!isCancelled && canCancel && (
                        <button
                          onClick={() => {
                            setCancellingPayment(p);
                            setCancelReason('');
                          }}
                          className="p-1 text-[#94A3B8] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Cancel this payment receipt"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Notes & Wire Instructions */}
        <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-[#64748B]">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F172A] block mb-1">
              Payment Instructions
            </span>
            <p className="leading-relaxed">
              Wire transfer to Standard Chartered Bank (Pakistan) Limited.<br />
              IBAN: PK36SCBL0000001234567801<br />
              SWIFT: SCBLPKKA
            </p>
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F172A] block mb-1">
              Client Terms & Notes
            </span>
            <p className="leading-relaxed">{invoice.notes || 'No custom notes provided.'}</p>
          </div>
        </div>
      </div>

      {/* Record Payment Modal */}
      {isRecordPaymentOpen && (
        <RecordPaymentModal
          isOpen={isRecordPaymentOpen}
          onClose={() => setIsRecordPaymentOpen(false)}
          defaultInvoiceId={invoice.id}
          defaultClientId={invoice.client_id}
        />
      )}

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
              Cancelling this payment receipt will restore the balance due on this invoice, reverse the financial transaction in the account, and increase client outstanding balance.
            </p>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#64748B] mb-1">
                Cancellation Reason (Optional)
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Returned cheque, duplicate entry, client request"
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
                Keep Receipt
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsSubmittingCancel(true);
                  await cancelPayment(cancellingPayment.id, cancelReason.trim() || 'Cancelled from invoice details');
                  setIsSubmittingCancel(false);
                  setCancellingPayment(null);
                }}
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
