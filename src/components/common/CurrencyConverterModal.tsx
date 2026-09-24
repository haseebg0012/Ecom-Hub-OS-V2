import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, RefreshCw, Check, DollarSign } from 'lucide-react';
import { useCrm } from '../../lib/crm-context';
import { useAuth } from '../../lib/auth-context';
import { SUPPORTED_CURRENCIES } from '../../lib/currencies';

interface CurrencyConverterModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAmount?: number;
  initialFrom?: string;
  initialTo?: string;
}

export const CurrencyConverterModal: React.FC<CurrencyConverterModalProps> = ({
  isOpen,
  onClose,
  initialAmount = 1000,
  initialFrom = 'USD',
  initialTo = 'PKR',
}) => {
  const { getExchangeRate, setExchangeRate, exchangeRates } = useCrm();
  const { activeBusiness } = useAuth();

  const [fromCurrency, setFromCurrency] = useState<string>(initialFrom);
  const [toCurrency, setToCurrency] = useState<string>(initialTo);
  const [amount, setAmount] = useState<number | string>(initialAmount);
  const [customRate, setCustomRate] = useState<number | string>('');
  const [isUpdatingRate, setIsUpdatingRate] = useState(false);
  const [rateUpdatedSuccess, setRateUpdatedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFromCurrency(initialFrom);
      setToCurrency(initialTo);
      setAmount(initialAmount);
      const currentRate = getExchangeRate(initialFrom, initialTo);
      setCustomRate(currentRate);
    }
  }, [isOpen, initialFrom, initialTo, initialAmount, getExchangeRate]);

  if (!isOpen) return null;

  const currentEffectiveRate = getExchangeRate(fromCurrency, toCurrency);
  const numericAmount = Number(amount) || 0;
  const convertedResult = numericAmount * currentEffectiveRate;

  const handleSwap = () => {
    const prevFrom = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(prevFrom);
    const newRate = getExchangeRate(toCurrency, prevFrom);
    setCustomRate(newRate);
  };

  const handleUpdateRate = async () => {
    const numRate = Number(customRate);
    if (!numRate || numRate <= 0) return;

    setIsUpdatingRate(true);
    const res = await setExchangeRate(fromCurrency, toCurrency, numRate);
    setIsUpdatingRate(false);

    if (res.success) {
      setRateUpdatedSuccess(true);
      setTimeout(() => setRateUpdatedSuccess(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center font-bold text-sm">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#0F172A]">Currency Converter</h3>
              <p className="text-[11px] text-[#64748B]">
                Multi-currency calculation & exchange rate ledger
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Amount input */}
          <div>
            <label className="block text-xs font-medium text-[#64748B] mb-1.5">
              Enter Amount
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="any"
                className="w-full px-3.5 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-sm font-semibold text-[#0F172A] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                placeholder="0.00"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#64748B]">
                {fromCurrency}
              </span>
            </div>
          </div>

          {/* Currencies Select & Swap */}
          <div className="grid grid-cols-5 gap-2 items-center">
            <div className="col-span-2">
              <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                From
              </label>
              <select
                value={fromCurrency}
                onChange={(e) => {
                  setFromCurrency(e.target.value);
                  setCustomRate(getExchangeRate(e.target.value, toCurrency));
                }}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={handleSwap}
                className="w-8 h-8 rounded-full border border-[#E2E8F0] bg-white hover:bg-[#EEF2FF] hover:text-[#4F46E5] text-[#64748B] flex items-center justify-center transition-colors"
                title="Swap currencies"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="col-span-2">
              <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                To
              </label>
              <select
                value={toCurrency}
                onChange={(e) => {
                  setToCurrency(e.target.value);
                  setCustomRate(getExchangeRate(fromCurrency, e.target.value));
                }}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Result Banner */}
          <div className="p-4 rounded-xl bg-[#EEF2FF]/60 border border-[#E0E7FF]">
            <span className="text-[11px] font-medium text-[#4F46E5] uppercase tracking-wider block">
              Converted Amount ({toCurrency})
            </span>
            <div className="text-2xl font-bold text-[#0F172A] tracking-tight mt-1">
              {new Intl.NumberFormat('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }).format(convertedResult)}{' '}
              <span className="text-sm font-semibold text-[#4F46E5]">{toCurrency}</span>
            </div>
            <p className="text-[11px] text-[#64748B] mt-1">
              1 {fromCurrency} = {currentEffectiveRate.toLocaleString()} {toCurrency}
            </p>
          </div>

          {/* Exchange Rate Adjustment for Tenant */}
          <div className="pt-2 border-t border-[#E2E8F0]">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-[#0F172A]">
                Effective Rate (1 {fromCurrency} = X {toCurrency})
              </label>
              {rateUpdatedSuccess && (
                <span className="text-[10px] font-medium text-emerald-600 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Saved to ledger
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                step="any"
                value={customRate}
                onChange={(e) => setCustomRate(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                placeholder="Rate"
              />
              <button
                onClick={handleUpdateRate}
                disabled={isUpdatingRate}
                className="px-3 py-1.5 text-xs font-medium text-white bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-60 rounded-lg transition-colors flex items-center gap-1 shrink-0"
              >
                {isUpdatingRate ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
                <span>Update Rate</span>
              </button>
            </div>
            <p className="text-[10px] text-[#94A3B8] mt-1">
              Stored in <code className="font-mono text-[9px] bg-slate-100 px-1 py-0.5 rounded">exchange_rates</code> table scoped to {activeBusiness?.name}.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#F8FAFC] border-t border-[#E2E8F0] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-[#0F172A] bg-white border border-[#E2E8F0] hover:bg-[#F1F5F9] rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
