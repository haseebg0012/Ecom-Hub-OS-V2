import React, { useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  Download,
  Receipt,
  ExternalLink,
  Laptop,
} from 'lucide-react';
import { useFinance } from '../../lib/finance-context';

interface InvestmentsViewProps {
  onOpenAddInvestment: () => void;
}

export const InvestmentsView: React.FC<InvestmentsViewProps> = ({ onOpenAddInvestment }) => {
  const { investments, categories, accounts, exportFinancialReport } = useFinance();

  const [searchQuery, setSearchQuery] = useState('');

  const filteredInvestments = useMemo(() => {
    return investments.filter((inv) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const title = (inv.title || inv.name || '').toLowerCase();
      return (
        title.includes(q) ||
        inv.expected_return?.toLowerCase().includes(q) ||
        inv.notes?.toLowerCase().includes(q)
      );
    });
  }, [investments, searchQuery]);

  const totalInvestmentAmount = useMemo(
    () => investments.reduce((sum, i) => sum + (i.base_amount || i.amount), 0),
    [investments]
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
            Total Capital Investments (CapEx)
          </span>
          <p className="text-2xl font-bold text-indigo-600 mt-1 tracking-tight">
            PKR {totalInvestmentAmount.toLocaleString()}
          </p>
          <p className="text-xs text-[#64748B] mt-0.5">
            Hardware, equipment, studio facilities, and long-term business assets
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportFinancialReport('investments')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0F172A] bg-white border border-[#E2E8F0] rounded-xl hover:bg-[#F8FAFC] transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-[#64748B]" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={onOpenAddInvestment}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-xl shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Investment</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-sm">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search asset title or details..."
          className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
        />
      </div>

      {/* Investments Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold">Asset / Investment Title</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold">Funding Account</th>
                <th className="py-3 px-4 font-semibold">Expected Lifespan / ROI</th>
                <th className="py-3 px-4 font-semibold text-right">Cost</th>
                <th className="py-3 px-4 font-semibold text-right">Base (PKR)</th>
                <th className="py-3 px-4 font-semibold text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filteredInvestments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-[#94A3B8]">
                    No capital investments recorded.
                  </td>
                </tr>
              ) : (
                filteredInvestments.map((inv) => {
                  const cat = categories.find((c) => c.id === inv.category_id);
                  const acc = accounts.find((a) => a.id === inv.account_id);

                  return (
                    <tr key={inv.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3.5 px-4 text-[#64748B] whitespace-nowrap">
                        {inv.investment_date}
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-bold text-[#0F172A]">{inv.title || inv.name}</p>
                        {inv.notes && (
                          <p className="text-[11px] text-[#64748B] truncate max-w-[240px]">
                            {inv.notes}
                          </p>
                        )}
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
                          <span className="text-[#94A3B8]">CapEx</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-[#0F172A] font-medium whitespace-nowrap">
                        {acc?.name || 'Account'}
                      </td>

                      <td className="py-3.5 px-4 text-[#64748B]">
                        {inv.expected_return || 'Long-term asset'}
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-indigo-600 whitespace-nowrap">
                        {inv.currency} {inv.amount.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-right text-[#64748B] font-mono text-[11px] whitespace-nowrap">
                        Rs. {(inv.base_amount || inv.amount).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {inv.attachment_url ? (
                          <a
                            href={inv.attachment_url}
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
