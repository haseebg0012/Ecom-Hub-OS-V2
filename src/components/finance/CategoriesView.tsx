import React, { useState } from 'react';
import { Tag, Plus, Check } from 'lucide-react';
import { useFinance } from '../../lib/finance-context';
import { usePermissions } from '../../lib/use-permissions';
import { CategoryType } from '../../types/finance';
import { AddCategoryModal } from './modals/AddCategoryModal';

export const CategoriesView: React.FC = () => {
  const { categories, transactions } = useFinance();
  const { can } = usePermissions();
  const canCreate = can('finance.create');

  const [activeTab, setActiveTab] = useState<CategoryType>('Expense');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const filteredCategories = categories.filter((c) => c.type === activeTab);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
            Financial Chart of Accounts
          </span>
          <p className="text-xl font-bold text-[#0F172A] mt-1 tracking-tight">
            Financial Categories
          </p>
          <p className="text-xs text-[#64748B] mt-0.5">
            Organize bookkeeping, analytical breakdowns, and reporting classifications
          </p>
        </div>

        {canCreate && (
          <button
            id="categories-new-category-btn"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-xl shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Category</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2">
        {(['Expense', 'Income', 'Investment'] as CategoryType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors ${
              activeTab === tab
                ? 'bg-[#4F46E5] text-white shadow-xs'
                : 'bg-white text-[#64748B] hover:text-[#0F172A] border border-[#E2E8F0]'
            }`}
          >
            {tab} Categories ({categories.filter((c) => c.type === tab).length})
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategories.map((cat) => {
          const usageCount = transactions.filter((t) => t.category_id === cat.id).length;

          return (
            <div
              key={cat.id}
              className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <div>
                  <h4 className="text-xs font-bold text-[#0F172A]">{cat.name}</h4>
                  <p className="text-[11px] text-[#64748B]">{usageCount} transactions linked</p>
                </div>
              </div>

              {cat.is_default && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F1F5F9] text-[#64748B]">
                  System Default
                </span>
              )}
            </div>
          );
        })}
      </div>

      {isAddModalOpen && (
        <AddCategoryModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          defaultType={activeTab}
        />
      )}
    </div>
  );
};
