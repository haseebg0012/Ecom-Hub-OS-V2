import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Plus,
  Search,
  Download,
  ArrowUpRight,
  Building,
} from 'lucide-react';
import { useFinance } from '../../lib/finance-context';
import { useCrm } from '../../lib/crm-context';
import { usePermissions } from '../../lib/use-permissions';

interface IncomeViewProps {
  onOpenAddIncome: () => void;
}

export const IncomeView: React.FC<IncomeViewProps> = ({ onOpenAddIncome }) => {
  const { incomes, categories, accounts, exportFinancialReport } = useFinance();
  const { clients } = useCrm();
  const { can } = usePermissions();
  const canCreate = can('finance.create');

  const [searchQuery, setSearchQuery] = useState('');

  const filteredIncomes = useMemo(() => {
    return incomes.filter((inc) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const client = clients.find((c) => c.id === inc.client_id);
      return (
        inc.source.toLowerCase().includes(q) ||
        client?.company_name.toLowerCase().includes(q) ||
        inc.reference?.toLowerCase().includes(q)
      );
    });
  }, [incomes, searchQuery, clients]);

  const totalIncomeAmount = useMemo(
    () => incomes.reduce((sum, i) => sum + (i.base_amount || i.amount), 0),
    [incomes]
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
            Total Direct Income & Consulting
          </span>
          <p className="text-2xl font-bold text-emerald-600 mt-1 tracking-tight">
            PKR {totalIncomeAmount.toLocaleString()}
          </p>
          <p className="text-xs text-[#64748B] mt-0.5">
            Non-invoiced revenue, retainers, and earnings
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportFinancialReport('income')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0F172A] bg-white border border-[#E2E8F0] rounded-xl hover:bg-[#F8FAFC] transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-[#64748B]" />
            <span>Export CSV</span>
          </button>
          {canCreate && (
            <button
              id="income-record-income-btn"
              onClick={onOpenAddIncome}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-xl shadow-xs transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Income</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-sm">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search income source, client, or ref..."
          className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
        />
      </div>

      {/* Income Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold">Source Description</th>
                <th className="py-3 px-4 font-semibold">Client</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold">Account</th>
                <th className="py-3 px-4 font-semibold">Method & Ref</th>
                <th className="py-3 px-4 font-semibold text-right">Amount</th>
                <th className="py-3 px-4 font-semibold text-right">Base (PKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filteredIncomes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-[#94A3B8]">
                    No income records found.
                  </td>
                </tr>
              ) : (
                filteredIncomes.map((inc) => {
                  const client = clients.find((c) => c.id === inc.client_id);
                  const cat = categories.find((c) => c.id === inc.category_id);
                  const acc = accounts.find((a) => a.id === inc.account_id);

                  return (
                    <tr key={inc.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3.5 px-4 text-[#64748B] whitespace-nowrap">
                        {inc.income_date}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-[#0F172A]">
                        {inc.source}
                      </td>

                      <td className="py-3.5 px-4 text-[#64748B]">
                        {client?.company_name || 'General Business'}
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
                          <span className="text-[#94A3B8]">Revenue</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-[#0F172A] font-medium whitespace-nowrap">
                        {acc?.name || 'Account'}
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-medium text-[#0F172A]">{inc.payment_method}</p>
                        {inc.reference && (
                          <p className="text-[10px] text-[#94A3B8] font-mono">{inc.reference}</p>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-emerald-600 whitespace-nowrap">
                        + {inc.currency} {inc.amount.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-right text-[#64748B] font-mono text-[11px] whitespace-nowrap">
                        Rs. {(inc.base_amount || inc.amount).toLocaleString()}
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
