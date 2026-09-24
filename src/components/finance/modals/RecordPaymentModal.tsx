import React, { useState, useEffect } from 'react';
import { X, Check, DollarSign, Wallet, CreditCard, AlertCircle } from 'lucide-react';
import { useFinance } from '../../../lib/finance-context';
import { useCrm } from '../../../lib/crm-context';
import { useAuth } from '../../../lib/auth-context';
import { PaymentMethod } from '../../../types/finance';
import { SUPPORTED_CURRENCIES, resolveCurrency } from '../../../lib/currencies';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultInvoiceId?: string;
  defaultClientId?: string;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  defaultInvoiceId,
  defaultClientId,
}) => {
  const { clients } = useCrm();
  const { invoices, accounts, recordPayment, financeSettings } = useFinance();
  const { activeBusiness } = useAuth();

  const [invoiceId, setInvoiceId] = useState<string>(defaultInvoiceId || '');
  const [clientId, setClientId] = useState<string>(defaultClientId || '');
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id || '');
  const [amount, setAmount] = useState<number>(0);
  const [currency, setCurrency] = useState<string>(resolveCurrency(activeBusiness?.default_currency));
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank Transfer');
  const [reference, setReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // When invoice changes, sync client, remaining balance, currency
  useEffect(() => {
    if (invoiceId) {
      const inv = invoices.find((i) => i.id === invoiceId);
      if (inv) {
        setClientId(inv.client_id);
        setCurrency(resolveCurrency(inv.currency));
        setAmount(Number(inv.balance_due) || 0);
      }
    } else if (defaultClientId) {
      setClientId(defaultClientId);
      const c = clients.find((client) => client.id === defaultClientId);
      if (c) setCurrency(resolveCurrency(c.preferred_currency));
    }
  }, [invoiceId, invoices, defaultClientId, clients]);

  // Set default account on load
  useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      const def = accounts.find((a) => a.id === financeSettings?.default_account_id) || accounts[0];
      setAccountId(def.id);
    }
  }, [accounts, financeSettings, accountId]);

  // Filter invoices for selected client
  const clientOpenInvoices = invoices.filter(
    (inv) =>
      inv.client_id === clientId &&
      inv.status !== 'Paid' &&
      inv.status !== 'Cancelled' &&
      inv.balance_due > 0
  );

  const selectedInvoice = invoices.find((i) => i.id === invoiceId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      setErrorMsg('Please select a client.');
      return;
    }
    if (!accountId) {
      setErrorMsg('Please select the receiving financial account.');
      return;
    }
    if (amount <= 0) {
      setErrorMsg('Payment amount must be greater than zero.');
      return;
    }

    if (selectedInvoice && amount > selectedInvoice.balance_due + 0.01) {
      setErrorMsg(
        `Payment amount cannot exceed remaining balance of ${selectedInvoice.currency} ${selectedInvoice.balance_due.toLocaleString()}.`
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const res = await recordPayment({
      invoiceId: invoiceId || null,
      clientId,
      accountId,
      amount: Number(amount),
      currency,
      paymentMethod,
      paymentDate,
      reference,
      notes,
    });

    setIsSubmitting(false);

    if (res.success) {
      onClose();
    } else {
      setErrorMsg(res.error || 'Failed to record payment.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-[#E2E8F0] shadow-xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div>
            <h2 className="text-base font-bold text-[#0F172A] tracking-tight">Record Client Payment</h2>
            <p className="text-xs text-[#64748B]">
              Deposit funds into a financial account and reconcile invoice balances.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#0F172A] hover:bg-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Client Selection */}
          <div>
            <label className="block font-semibold text-[#0F172A] mb-1">
              Client <span className="text-rose-500">*</span>
            </label>
            <select
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                setInvoiceId(''); // reset invoice selection when client changes
              }}
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
              required
            >
              <option value="">Select client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name}
                </option>
              ))}
            </select>
          </div>

          {/* Link to Open Invoice */}
          <div>
            <label className="block font-semibold text-[#0F172A] mb-1">
              Apply to Invoice <span className="text-[#94A3B8] font-normal">(Optional)</span>
            </label>
            <select
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
            >
              <option value="">Direct Client Deposit (No specific invoice)</option>
              {clientOpenInvoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoice_number} — Balance: {inv.currency} {inv.balance_due.toLocaleString()} (Due {inv.due_date})
                </option>
              ))}
            </select>
          </div>

          {selectedInvoice && (
            <div className="p-3 rounded-xl bg-[#EEF2FF] border border-indigo-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-[#64748B] block">Invoice Outstanding</span>
                <span className="text-sm font-bold text-[#4F46E5]">
                  {selectedInvoice.currency} {selectedInvoice.balance_due.toLocaleString()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAmount(selectedInvoice.balance_due)}
                className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-[#E2E8F0] text-[#4F46E5] rounded-lg hover:bg-[#F8FAFC]"
              >
                Pay Full Balance
              </button>
            </div>
          )}

          {/* Amount & Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[#0F172A] mb-1">
                Amount Received <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl font-bold text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-[#0F172A] mb-1">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl font-bold text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Receiving Account */}
          <div>
            <label className="block font-semibold text-[#0F172A] mb-1">
              Deposit Account <span className="text-rose-500">*</span>
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
              required
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.currency}) — Balance: {acc.currency} {acc.current_balance.toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[#0F172A] mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
              >
                <option value="Bank Transfer">Bank Transfer (IBFT/Wire)</option>
                <option value="Online Payment">Online Payment (Wise, Stripe)</option>
                <option value="Card">Credit/Debit Card</option>
                <option value="Cash">Cash</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-[#0F172A] mb-1">Payment Date</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                required
              />
            </div>
          </div>

          {/* Reference & Notes */}
          <div>
            <label className="block font-semibold text-[#0F172A] mb-1">
              Transaction / Wire Reference #
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. FT-83920194, WIRE-SCB-0042, etc."
              className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#0F172A] mb-1">Receipt Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal bookkeeping notes or payment confirmation comments"
              className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Recording...' : 'Record Payment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
