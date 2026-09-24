import React, { useState } from 'react';
import { X, Calendar, AlertCircle, RefreshCw, DollarSign, Info } from 'lucide-react';
import { useFinance } from '../../../lib/finance-context';
import { useAuth } from '../../../lib/auth-context';
import { useCrm } from '../../../lib/crm-context';
import { RecurringFrequency, TransactionType, PaymentMethod, RecurringTransaction } from '../../../types/finance';
import { SUPPORTED_CURRENCIES, resolveCurrency } from '../../../lib/currencies';
import { normalizeFrequency, formatFrequency } from '../../../lib/recurring-engine';

interface AddRecurringModalProps {
  isOpen: boolean;
  onClose: () => void;
  editItem?: RecurringTransaction | null;
}

export const AddRecurringModal: React.FC<AddRecurringModalProps> = ({
  isOpen,
  onClose,
  editItem,
}) => {
  const { categories, accounts, addRecurringTransaction, updateRecurringTransaction } = useFinance();
  const { activeBusiness } = useAuth();
  const { clients, getExchangeRate } = useCrm();

  const baseCurrency = activeBusiness?.default_currency || 'PKR';

  const [transactionType, setTransactionType] = useState<TransactionType>(
    editItem?.transaction_type || 'expense'
  );
  const [name, setName] = useState(editItem?.name || '');
  const [description, setDescription] = useState(editItem?.description || '');
  const [amount, setAmount] = useState<number>(editItem?.amount || 0);
  const [currency, setCurrency] = useState<string>(
    editItem?.currency || resolveCurrency(activeBusiness?.default_currency)
  );
  const [frequency, setFrequency] = useState<RecurringFrequency>(
    editItem ? normalizeFrequency(editItem.frequency) : 'Monthly'
  );
  const [startDate, setStartDate] = useState<string>(
    editItem?.start_date || new Date().toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(editItem?.end_date || '');
  const [accountId, setAccountId] = useState<string>(
    editItem?.account_id || accounts[0]?.id || ''
  );
  const [categoryId, setCategoryId] = useState<string>(
    editItem?.category_id || ''
  );
  const [clientId, setClientId] = useState<string>(editItem?.client_id || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    (editItem?.payment_method as PaymentMethod) || 'Bank Transfer'
  );
  const [reference, setReference] = useState<string>(editItem?.reference || '');
  const [notes, setNotes] = useState<string>(editItem?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter categories by chosen transaction type
  const relevantCategories = categories.filter((c) => {
    if (transactionType === 'expense') return c.type === 'Expense';
    if (transactionType === 'income') return c.type === 'Income';
    return true;
  });

  const rate = currency === baseCurrency ? 1 : getExchangeRate(currency, baseCurrency);
  const calculatedBaseAmount = Number(amount || 0) * rate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please specify a title or template name.');
      return;
    }
    if (amount <= 0) {
      setErrorMsg('Amount must be greater than zero.');
      return;
    }
    if (!accountId) {
      setErrorMsg('Please select a financial account.');
      return;
    }
    if (!startDate) {
      setErrorMsg('Please set a starting scheduled date.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (editItem) {
        const res = await updateRecurringTransaction(editItem.id, {
          name: name.trim(),
          description: description.trim() || null,
          transaction_type: transactionType,
          type: transactionType,
          amount: Number(amount),
          currency,
          exchange_rate: rate,
          frequency: normalizeFrequency(frequency),
          start_date: startDate,
          end_date: endDate.trim() ? endDate : null,
          account_id: accountId,
          category_id: categoryId || null,
          client_id: transactionType === 'income' && clientId ? clientId : null,
          payment_method: paymentMethod,
          reference: reference.trim() || null,
          notes: notes.trim() || null,
        });

        setIsSubmitting(false);
        if (res.success) {
          onClose();
        } else {
          setErrorMsg(res.error || 'Failed to update recurring transaction.');
        }
      } else {
        const res = await addRecurringTransaction({
          name: name.trim(),
          description: description.trim() || null,
          transaction_type: transactionType,
          type: transactionType,
          amount: Number(amount),
          currency,
          exchange_rate: rate,
          base_currency: baseCurrency,
          base_amount: calculatedBaseAmount,
          frequency: normalizeFrequency(frequency),
          start_date: startDate,
          end_date: endDate.trim() ? endDate : null,
          next_run_date: startDate,
          account_id: accountId,
          category_id: categoryId || relevantCategories[0]?.id || null,
          client_id: transactionType === 'income' && clientId ? clientId : null,
          payment_method: paymentMethod,
          reference: reference.trim() || null,
          notes: notes.trim() || null,
          is_active: true,
          status: 'Active',
          last_run_at: null,
          created_by: null,
        });

        setIsSubmitting(false);
        if (res.success) {
          onClose();
        } else {
          setErrorMsg(res.error || 'Failed to schedule recurring transaction.');
        }
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err.message || 'An unexpected error occurred.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-[#E2E8F0] shadow-xl overflow-hidden my-8">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4F46E5]">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0F172A] tracking-tight">
                {editItem ? 'Edit Recurring Transaction' : 'Schedule Recurring Transaction'}
              </h2>
              <p className="text-xs text-[#64748B]">
                Automate regular subscriptions, client retainers, rent, or payroll with server-side scheduling.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#0F172A] hover:bg-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Transaction Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
              Transaction Flow
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTransactionType('expense')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-center ${
                  transactionType === 'expense'
                    ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-xs'
                    : 'border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC]'
                }`}
              >
                Recurring Expense
              </button>
              <button
                type="button"
                onClick={() => setTransactionType('income')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-center ${
                  transactionType === 'income'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-xs'
                    : 'border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC]'
                }`}
              >
                Recurring Income
              </button>
              <button
                type="button"
                onClick={() => setTransactionType('investment')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-center ${
                  transactionType === 'investment'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-xs'
                    : 'border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC]'
                }`}
              >
                Capital Investment
              </button>
            </div>
          </div>

          {/* Name & Frequency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Name / Template Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  transactionType === 'expense'
                    ? 'e.g. AWS Hosting / Nayatel Internet'
                    : 'e.g. Monthly Marketing Retainer'
                }
                className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Frequency Cadence <span className="text-rose-500">*</span>
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(normalizeFrequency(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
              >
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly (Every 7 days)</option>
                <option value="Bi-weekly">Bi-weekly (Every 14 days)</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly (Every 3 months)</option>
                <option value="Yearly">Yearly</option>
              </select>
            </div>
          </div>

          {/* Amount & Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Amount <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={amount || ''}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.name} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Currency conversion notice if foreign currency */}
          {currency !== baseCurrency && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                <Info className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  Exchange Rate: 1 {currency} = {rate.toFixed(2)} {baseCurrency}
                </span>
              </span>
              <span className="font-bold">
                ≈ {baseCurrency} {calculatedBaseAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {/* Schedule Start & End Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Start Date (First Run) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                End Date (Optional)
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="date"
                  min={startDate}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="Never expires"
                  className="w-full pl-8 pr-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                />
              </div>
            </div>
          </div>

          {/* Account & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Disbursement Account <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
              >
                {accounts
                  .filter((a) => a.is_active)
                  .map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency} • Bal: {acc.current_balance.toLocaleString()})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Finance Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
              >
                <option value="">Select Category...</option>
                {relevantCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Client Selection (For Income) */}
          {transactionType === 'income' && (
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Client (Optional)
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
              >
                <option value="">No specific client / General</option>
                {clients.map((cli) => (
                  <option key={cli.id} value={cli.id}>
                    {cli.name} {cli.company_name ? `(${cli.company_name})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Payment Method & Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Card">Credit / Debit Card</option>
                <option value="Online">Digital Wallet / Online</option>
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Reference Code / Memo
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. SUB-AWS-CLUST"
                className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
              />
            </div>
          </div>

          {/* Description & Notes */}
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">
              Internal Notes / Details
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe contract terms, invoice link, or renewal details..."
              className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
            />
          </div>

          <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : (
                <span>{editItem ? 'Save Changes' : 'Schedule Recurring Transaction'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
