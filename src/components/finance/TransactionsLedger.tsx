import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Plus,
  Search,
  Filter,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Building,
} from 'lucide-react';
import { useFinance } from '../../lib/finance-context';
import { useCrm } from '../../lib/crm-context';
import { usePermissions } from '../../lib/use-permissions';
import { TransactionType } from '../../types/finance';
import { SUPPORTED_CURRENCIES } from '../../lib/currencies';

interface TransactionsLedgerProps {
  onOpenAddTransaction: () => void;
}

export const TransactionsLedger: React.FC<TransactionsLedgerProps> = ({
  onOpenAddTransaction,
}) => {
  const { transactions, categories, accounts, exportFinancialReport } = useFinance();
  const { clients } = useCrm();
  const { can } = usePermissions();

  const canCreate = can('finance.create');

  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [accountFilter, setAccountFilter] = useState<string>('All');
  const [currencyFilter, setCurrencyFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (typeFilter !== 'All' && tx.type !== typeFilter) return false;
      if (categoryFilter !== 'All' && tx.category_id !== categoryFilter) return false;
      if (accountFilter !== 'All' && tx.account_id !== accountFilter) return false;
      if (currencyFilter !== 'All' && tx.currency !== currencyFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const client = clients.find((c) => c.id === tx.client_id);
        const matchDesc = tx.description.toLowerCase().includes(q);
        const matchRef = tx.reference?.toLowerCase().includes(q);
        const matchClient = client?.company_name.toLowerCase().includes(q);
        if (!matchDesc && !matchRef && !matchClient) return false;
      }
      return true;
    });
  }, [transactions, typeFilter, categoryFilter, accountFilter, currencyFilter, searchQuery, clients]);

  return (
    <div className="space-y-6">
      {/* Search, Filters and Export Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Search */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search description, reference..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
          >
            <option value="All">All Types</option>
            <option value="Income">Income (+)</option>
            <option value="Expense">Expense (-)</option>
            <option value="Investment">Investment</option>
            <option value="Transfer">Transfer</option>
            <option value="Refund">Refund</option>
          </select>

          {/* Account Filter */}
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

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
          >
            <option value="All">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.type})
              </option>
            ))}
          </select>

          {/* Currency Filter */}
          <select
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
          >
            <option value="All">All Currencies</option>
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportFinancialReport('transactions')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0F172A] bg-white border border-[#E2E8F0] rounded-xl hover:bg-[#F8FAFC] transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-[#64748B]" />
            <span>Export CSV</span>
          </button>
          {canCreate && (
            <button
              id="transactions-add-tx-btn"
              onClick={onOpenAddTransaction}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-xl shadow-xs transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Transaction</span>
            </button>
          )}
        </div>
      </div>

      {/* Unified Ledger Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold">Type</th>
                <th className="py-3 px-4 font-semibold">Description</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold">Account</th>
                <th className="py-3 px-4 font-semibold">Client / Payee</th>
                <th className="py-3 px-4 font-semibold text-right">Amount</th>
                <th className="py-3 px-4 font-semibold text-right">Base (PKR)</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-[#94A3B8]">
                    No transactions match current filters.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const cat = categories.find((c) => c.id === tx.category_id);
                  const acc = accounts.find((a) => a.id === tx.account_id);
                  const client = clients.find((c) => c.id === tx.client_id);
                  const isIncome = tx.type === 'Income';
                  const isExpense = tx.type === 'Expense';
                  const isInvestment = tx.type === 'Investment';

                  return (
                    <tr key={tx.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3.5 px-4 text-[#64748B] whitespace-nowrap">
                        {tx.transaction_date}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isIncome
                              ? 'bg-emerald-50 text-emerald-700'
                              : isExpense
                              ? 'bg-rose-50 text-rose-700'
                              : isInvestment
                              ? 'bg-indigo-50 text-indigo-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {isIncome && <ArrowUpRight className="w-3 h-3" />}
                          {isExpense && <ArrowDownRight className="w-3 h-3" />}
                          <span>{tx.type}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 max-w-[260px]">
                        <p className="font-semibold text-[#0F172A] truncate">{tx.description}</p>
                        {tx.reference && (
                          <p className="text-[10px] text-[#94A3B8] font-mono truncate">
                            Ref: {tx.reference}
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
                          <span className="text-[#94A3B8]">Uncategorized</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-[#0F172A] font-medium whitespace-nowrap">
                        {acc?.name || 'Account'}
                      </td>

                      <td className="py-3.5 px-4 text-[#64748B] truncate max-w-[140px]">
                        {client?.company_name || '—'}
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold whitespace-nowrap">
                        <span
                          className={
                            isIncome
                              ? 'text-emerald-600'
                              : isExpense
                              ? 'text-rose-600'
                              : 'text-[#0F172A]'
                          }
                        >
                          {isIncome ? '+' : isExpense ? '-' : ''} {tx.currency}{' '}
                          {tx.amount.toLocaleString()}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right text-[#64748B] font-mono text-[11px] whitespace-nowrap">
                        Rs. {(tx.base_amount || tx.amount).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {tx.status}
                        </span>
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
