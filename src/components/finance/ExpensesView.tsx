import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Plus,
  Search,
  Download,
  Receipt,
  ExternalLink,
  ArrowDownRight,
  TrendingDown,
} from 'lucide-react';
import { useFinance } from '../../lib/finance-context';
import { usePermissions } from '../../lib/use-permissions';

interface ExpensesViewProps {
  onOpenAddExpense: () => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({ onOpenAddExpense }) => {
  const { expenses, categories, accounts, exportFinancialReport } = useFinance();
  const { can } = usePermissions();
  const canCreate = can('finance.create');

  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [accountFilter, setAccountFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const expenseCategories = categories.filter((c) => c.type === 'Expense');

  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      if (categoryFilter !== 'All' && exp.category_id !== categoryFilter) return false;
      if (accountFilter !== 'All' && exp.account_id !== accountFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchVendor = exp.vendor.toLowerCase().includes(q);
        const matchDesc = exp.description.toLowerCase().includes(q);
        const matchRef = exp.reference?.toLowerCase().includes(q);
        if (!matchVendor && !matchDesc && !matchRef) return false;
      }
      return true;
    });
  }, [expenses, categoryFilter, accountFilter, searchQuery]);

  const totalExpenseAmount = useMemo(
    () => expenses.reduce((sum, e) => sum + (e.base_amount || e.amount), 0),
    [expenses]
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
            Total Operating Overhead
          </span>
          <p className="text-2xl font-bold text-rose-600 mt-1 tracking-tight">
            PKR {totalExpenseAmount.toLocaleString()}
          </p>
          <p className="text-xs text-[#64748B] mt-0.5">
            {expenses.length} vendor bills and operational disbursements
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportFinancialReport('expenses')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0F172A] bg-white border border-[#E2E8F0] rounded-xl hover:bg-[#F8FAFC] transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-[#64748B]" />
            <span>Export CSV</span>
          </button>
          {canCreate && (
            <button
              id="expenses-add-expense-btn"
              onClick={onOpenAddExpense}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-xl shadow-xs transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Expense</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search vendor, description, or ref..."
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
        >
          <option value="All">All Categories</option>
          {expenseCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={accountFilter}
          onChange={(e) => setAccountFilter(e.target.value)}
          className="px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
        >
          <option value="All">All Accounts</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold">Vendor / Payee</th>
                <th className="py-3 px-4 font-semibold">Description</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold">Account</th>
                <th className="py-3 px-4 font-semibold">Method & Ref</th>
                <th className="py-3 px-4 font-semibold text-right">Amount</th>
                <th className="py-3 px-4 font-semibold text-right">Base (PKR)</th>
                <th className="py-3 px-4 font-semibold text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-[#94A3B8]">
                    No expense items match current filters.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => {
                  const cat = categories.find((c) => c.id === exp.category_id);
                  const acc = accounts.find((a) => a.id === exp.account_id);

                  return (
                    <tr key={exp.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3.5 px-4 text-[#64748B] whitespace-nowrap">
                        {exp.expense_date}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-[#0F172A] whitespace-nowrap">
                        {exp.vendor}
                      </td>

                      <td className="py-3.5 px-4 max-w-[240px]">
                        <p className="font-medium text-[#0F172A] truncate">{exp.description}</p>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {cat ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                            <span className="text-[#0F172A] font-medium">{cat.name}</span>
                          </span>
                        ) : (
                          <span className="text-[#94A3B8]">General</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-[#0F172A] font-medium whitespace-nowrap">
                        {acc?.name || 'Account'}
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-medium text-[#0F172A]">{exp.payment_method}</p>
                        {exp.reference && (
                          <p className="text-[10px] text-[#94A3B8] font-mono">{exp.reference}</p>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-rose-600 whitespace-nowrap">
                        - {exp.currency} {exp.amount.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-right text-[#64748B] font-mono text-[11px] whitespace-nowrap">
                        Rs. {(exp.base_amount || exp.amount).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {exp.attachment_url ? (
                          <a
                            href={exp.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[#4F46E5] hover:underline"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>View</span>
                          </a>
                        ) : (
                          <span className="text-[#94A3B8]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
