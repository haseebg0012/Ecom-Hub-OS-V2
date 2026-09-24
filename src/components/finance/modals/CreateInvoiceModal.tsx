import React, { useState } from 'react';
import { X, Plus, Trash2, Calendar, DollarSign, FileText, Check } from 'lucide-react';
import { useFinance } from '../../../lib/finance-context';
import { useCrm } from '../../../lib/crm-context';
import { useAuth } from '../../../lib/auth-context';
import { Client } from '../../../types';
import { SUPPORTED_CURRENCIES, resolveCurrency } from '../../../lib/currencies';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultClientId?: string;
}

export const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({
  isOpen,
  onClose,
  defaultClientId,
}) => {
  const { clients } = useCrm();
  const { createInvoice, financeSettings } = useFinance();
  const { activeBusiness } = useAuth();

  const [clientId, setClientId] = useState<string>(defaultClientId || (clients[0]?.id || ''));
  const initialClient = clients.find((c) => c.id === (defaultClientId || clients[0]?.id));
  const [currency, setCurrency] = useState<string>(
    initialClient?.preferred_currency ? resolveCurrency(initialClient.preferred_currency) : resolveCurrency(activeBusiness?.default_currency)
  );
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
  );
  const [discount, setDiscount] = useState<number>(0);
  const [tax, setTax] = useState<number>(0);
  const [notes, setNotes] = useState<string>('Thank you for partnering with Ecometrix Hub.');
  const [terms, setTerms] = useState<string>(financeSettings?.default_payment_terms || 'Net 15');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Line items state
  const [items, setItems] = useState<Array<{ description: string; quantity: number; unit_price: number }>>([
    { description: 'E-Commerce Platform Engineering & Optimization', quantity: 1, unit_price: 5000 },
  ]);

  // Sync currency with selected client's preferred currency
  const handleClientChange = (cId: string) => {
    setClientId(cId);
    const selected = clients.find((c) => c.id === cId);
    if (selected?.preferred_currency) {
      setCurrency(resolveCurrency(selected.preferred_currency));
    }
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, { description: '', quantity: 1, unit_price: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: 'description' | 'quantity' | 'unit_price', val: any) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        return {
          ...item,
          [field]: field === 'description' ? val : Number(val) || 0,
        };
      })
    );
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_price) || 0), 0);
  const total = Math.max(0, subtotal + Number(tax) - Number(discount));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      setErrorMsg('Please select a client for this invoice.');
      return;
    }
    if (items.some((i) => !i.description.trim())) {
      setErrorMsg('Please ensure all invoice line items have a description.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const res = await createInvoice(
      {
        client_id: clientId,
        issue_date: issueDate,
        due_date: dueDate,
        currency,
        tax: Number(tax),
        discount: Number(discount),
        notes,
        terms,
      },
      items
    );

    setIsSubmitting(false);

    if (res.success) {
      onClose();
    } else {
      setErrorMsg(res.error || 'Failed to create invoice.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-[#E2E8F0] shadow-xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div>
            <h2 className="text-base font-bold text-[#0F172A] tracking-tight">Create Professional Invoice</h2>
            <p className="text-xs text-[#64748B]">Issue an itemized billing invoice to a client organization.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#0F172A] hover:bg-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Client & Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Client Organization <span className="text-rose-500">*</span>
              </label>
              <select
                value={clientId}
                onChange={(e) => handleClientChange(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                required
              >
                <option value="">Select a client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name} ({c.contact_person || 'No primary contact'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Invoice Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl font-bold text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Issue & Due Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Issue Date</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Payment Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                required
              />
            </div>
          </div>

          {/* Line Items Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                Itemized Scope & Deliverables
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#4F46E5] hover:text-[#4338CA]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {items.map((item, idx) => {
                const lineTotal = Number(item.quantity) * Number(item.unit_price);
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] grid grid-cols-12 gap-2 items-center text-xs"
                  >
                    <div className="col-span-6">
                      <label className="block text-[10px] text-[#64748B] mb-0.5">Description</label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        placeholder="e.g. Custom Shopify Theme Architecture"
                        className="w-full px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] font-medium focus:outline-none focus:border-[#4F46E5]"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] text-[#64748B] mb-0.5">Qty</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] font-medium text-center focus:outline-none focus:border-[#4F46E5]"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] text-[#64748B] mb-0.5">Unit Price</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] font-medium text-right focus:outline-none focus:border-[#4F46E5]"
                        required
                      />
                    </div>
                    <div className="col-span-2 flex items-center justify-between pl-2">
                      <div className="text-right">
                        <span className="block text-[10px] text-[#64748B]">Amount</span>
                        <span className="font-bold text-[#0F172A]">
                          {currency} {lineTotal.toLocaleString()}
                        </span>
                      </div>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-[#94A3B8] hover:text-rose-600 p-1 transition-colors"
                          title="Remove line item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Subtotal, Tax, Discount & Total Summary */}
          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2 text-xs">
            <div className="flex justify-between text-[#64748B]">
              <span>Subtotal</span>
              <span className="font-semibold text-[#0F172A]">
                {currency} {subtotal.toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] mb-1">
                  Applicable Tax / VAT ({currency})
                </label>
                <input
                  type="number"
                  min="0"
                  value={tax}
                  onChange={(e) => setTax(Number(e.target.value) || 0)}
                  className="w-full px-2.5 py-1 bg-white border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] mb-1">
                  Discount ({currency})
                </label>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                  className="w-full px-2.5 py-1 bg-white border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#0F172A]"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-[#E2E8F0] flex justify-between items-center text-sm font-bold text-[#0F172A]">
              <span>Total Invoice Amount</span>
              <span className="text-base text-[#4F46E5]">
                {currency} {total.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Terms & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-[#0F172A] mb-1">Payment Terms</label>
              <input
                type="text"
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="e.g. Net 15, Net 30, Due on Receipt"
                className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#0F172A] mb-1">Client Notes / Wire Instructions</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Bank swift code, wiring details, or custom note"
                className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-end gap-3">
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
              <span>{isSubmitting ? 'Generating Invoice...' : 'Save & Issue Invoice'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
