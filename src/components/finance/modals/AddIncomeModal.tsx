import React, { useState } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';
import { useFinance } from '../../../lib/finance-context';
import { useCrm } from '../../../lib/crm-context';
import { useAuth } from '../../../lib/auth-context';
import { PaymentMethod } from '../../../types/finance';
import { SUPPORTED_CURRENCIES, resolveCurrency } from '../../../lib/currencies';

interface AddIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddIncomeModal: React.FC<AddIncomeModalProps> = ({ isOpen, onClose }) => {
  const { categories, accounts, addIncome } = useFinance();
  const { clients } = useCrm();
  const { activeBusiness } = useAuth();

  const incomeCategories = categories.filter((c) => c.type === 'Income');

  const [source, setSource] = useState('');
  const [clientId, setClientId] = useState('');
  const [categoryId, setCategoryId] = useState(incomeCategories[0]?.id || '');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [amount, setAmount] = useState<number>(0);
  const [currency, setCurrency] = useState<string>(resolveCurrency(activeBusiness?.default_currency));
  const [incomeDate, setIncomeDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank Transfer');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!source.trim()) {
      setErrorMsg('Please enter an income source description.');
      return;
    }
    if (amount <= 0) {
      setErrorMsg('Amount must be greater than zero.');
      return;
    }
    if (!accountId) {
      setErrorMsg('Please select the receiving account.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const res = await addIncome({
      source: source.trim(),
      clientId: clientId || undefined,
      categoryId: categoryId || incomeCategories[0]?.id || '',
      accountId,
      amount: Number(amount),
      currency,
      incomeDate,
      paymentMethod,
      reference: reference.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    setIsSubmitting(false);

    if (res.success) {
      onClose();
    } else {
      setErrorMsg(res.error || 'Failed to record income.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-[#E2E8F0] shadow-xl overflow-hidden my-8">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div>
            <h2 className="text-base font-bold text-[#0F172A] tracking-tight">Record Direct Income</h2>
            <p className="text-xs text-[#64748B]">
              Log consulting earnings, retainers, interest, or direct client revenue.
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
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-[#0F172A] mb-1">
              Source / Description <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g. Monthly Retainer for Brand Architecture"
              className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-[#0F172A] mb-1">
              Associated Client <span className="text-[#94A3B8] font-normal">(Optional)</span>
            </label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
            >
              <option value="">No client / General business revenue</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name}
                </option>
              ))}
            </select>
          </div>

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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[#0F172A] mb-1">Revenue Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
              >
                {incomeCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-[#0F172A] mb-1">Receiving Account</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                required
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.currency})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[#0F172A] mb-1">Receipt Date</label>
              <input
                type="date"
                value={incomeDate}
                onChange={(e) => setIncomeDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-[#0F172A] mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Online Payment">Online Payment (Wise, Stripe)</option>
                <option value="Card">Card</option>
                <option value="Cash">Cash</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#0F172A] mb-1">Reference / Transaction ID</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. WIRE-8849301"
              className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#0F172A] mb-1">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contract or project details"
              className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
            />
          </div>

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
              <span>{isSubmitting ? 'Saving...' : 'Record Income'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
