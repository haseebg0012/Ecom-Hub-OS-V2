import React, { useState } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';
import { useFinance } from '../../../lib/finance-context';
import { CategoryType } from '../../../types/finance';

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: CategoryType;
}

const PRESET_COLORS = [
  '#4F46E5', // Indigo
  '#0EA5E9', // Sky
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#64748B', // Slate
];

export const AddCategoryModal: React.FC<AddCategoryModalProps> = ({
  isOpen,
  onClose,
  defaultType = 'Expense',
}) => {
  const { addCategory } = useFinance();

  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>(defaultType);
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please enter a category name.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const res = await addCategory({
      name: name.trim(),
      type,
      color,
    });

    setIsSubmitting(false);

    if (res.success) {
      onClose();
    } else {
      setErrorMsg(res.error || 'Failed to create category.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-sm w-full border border-[#E2E8F0] shadow-xl overflow-hidden my-8">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div>
            <h2 className="text-base font-bold text-[#0F172A] tracking-tight">New Category</h2>
            <p className="text-xs text-[#64748B]">Organize income, expenses, or investments.</p>
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
              Category Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cloud Hosting, Office Equipment, Legal & Audit"
              className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-[#0F172A] mb-1">Financial Classification</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as CategoryType)}
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
            >
              <option value="Expense">Operating Expense (Bill, Service, Overhead)</option>
              <option value="Income">Revenue / Income Source</option>
              <option value="Investment">Capital Investment (Asset, Equipment)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-[#0F172A] mb-1.5">Color Tag</label>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    color === c ? 'scale-125 ring-2 ring-offset-2 ring-[#4F46E5]' : 'hover:opacity-80'
                  }`}
                />
              ))}
            </div>
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
              <span>{isSubmitting ? 'Saving...' : 'Add Category'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
