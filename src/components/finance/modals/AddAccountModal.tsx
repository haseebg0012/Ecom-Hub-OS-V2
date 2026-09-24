import React, { useState } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';
import { useFinance } from '../../../lib/finance-context';
import { useAuth } from '../../../lib/auth-context';
import { AccountType } from '../../../types/finance';
import { SUPPORTED_CURRENCIES, resolveCurrency } from '../../../lib/currencies';

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddAccountModal: React.FC<AddAccountModalProps> = ({ isOpen, onClose }) => {
  const { addAccount } = useFinance();
  const { activeBusiness } = useAuth();

  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('Bank');
  const [currency, setCurrency] = useState<string>(resolveCurrency(activeBusiness?.default_currency));
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please enter an account name.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const res = await addAccount({
      name: name.trim(),
      accountType,
      currency,
      openingBalance: Number(openingBalance) || 0,
      description: description.trim() || undefined,
    });

    setIsSubmitting(false);

    if (res.success) {
      onClose();
    } else {
      setErrorMsg(res.error || 'Failed to create financial account.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full border border-[#E2E8F0] shadow-xl overflow-hidden my-8">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div>
            <h2 className="text-base font-bold text-[#0F172A] tracking-tight">Add Financial Account</h2>
            <p className="text-xs text-[#64748B]">
              Configure a business bank, cash drawer, or payment gateway.
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
              Account Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Standard Chartered Corporate, Petty Cash, Wise Multi-Currency"
              className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[#0F172A] mb-1">Account Type</label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as AccountType)}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
              >
                <option value="Bank">Bank Account</option>
                <option value="Cash">Cash / Petty Cash</option>
                <option value="Digital Wallet">Digital Wallet (Wise/PayPal)</option>
                <option value="Payment Gateway">Payment Gateway (Stripe)</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-[#0F172A] mb-1">Denomination Currency</label>
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

          <div>
            <label className="block font-semibold text-[#0F172A] mb-1">
              Opening / Initial Balance ({currency})
            </label>
            <input
              type="number"
              step="any"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(Number(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl font-bold text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#0F172A] mb-1">Description / Account #</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. IBAN: PK36SCBL0000001234567801"
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
              <span>{isSubmitting ? 'Saving...' : 'Create Account'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
