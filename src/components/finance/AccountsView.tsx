import React, { useState } from 'react';
import {
  Wallet,
  Plus,
  Building,
  CreditCard,
  Banknote,
  Globe,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
} from 'lucide-react';
import { useFinance } from '../../lib/finance-context';
import { usePermissions } from '../../lib/use-permissions';
import { AddAccountModal } from './modals/AddAccountModal';

export const AccountsView: React.FC = () => {
  const { accounts, metrics } = useFinance();
  const { can } = usePermissions();
  const canCreate = can('finance.create');
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'Bank':
        return <Building className="w-5 h-5 text-indigo-600" />;
      case 'Cash':
        return <Banknote className="w-5 h-5 text-emerald-600" />;
      case 'Digital Wallet':
        return <Globe className="w-5 h-5 text-sky-600" />;
      case 'Payment Gateway':
        return <CreditCard className="w-5 h-5 text-purple-600" />;
      default:
        return <Wallet className="w-5 h-5 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
            Consolidated Liquid Cash
          </span>
          <p className="text-2xl font-bold text-[#0F172A] mt-1 tracking-tight">
            PKR {(metrics?.totalCashBalance ?? metrics?.cashBalance ?? 0).toLocaleString()}
          </p>
          <p className="text-xs text-[#64748B] mt-0.5">
            Across {accounts.length} active business accounts and liquid reserves
          </p>
        </div>

        {canCreate && (
          <button
            id="accounts-add-account-btn"
            onClick={() => setIsAddAccountOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-xl shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Account</span>
          </button>
        )}
      </div>

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((acc) => (
          <div
            key={acc.id}
            className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs hover:border-[#CBD5E1] transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center">
                    {getAccountIcon(acc.account_type)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#0F172A] tracking-tight">{acc.name}</h3>
                    <p className="text-[11px] text-[#64748B]">{acc.account_type}</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F1F5F9] text-[#0F172A] uppercase">
                  {acc.currency}
                </span>
              </div>

              {acc.description && (
                <p className="text-xs text-[#64748B] mt-3 font-mono line-clamp-1">
                  {acc.description}
                </p>
              )}
            </div>

            <div className="pt-5 mt-4 border-t border-[#E2E8F0] flex items-end justify-between">
              <div>
                <span className="text-[10px] uppercase font-semibold text-[#94A3B8] block">
                  Current Live Balance
                </span>
                <p className="text-xl font-bold text-[#0F172A] tracking-tight mt-0.5">
                  {acc.currency} {acc.current_balance.toLocaleString()}
                </p>
              </div>

              <div className="text-right text-[11px] text-[#64748B]">
                <span className="block text-[10px] text-[#94A3B8]">Opening</span>
                <span>
                  {acc.currency} {acc.opening_balance.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isAddAccountOpen && (
        <AddAccountModal isOpen={isAddAccountOpen} onClose={() => setIsAddAccountOpen(false)} />
      )}
    </div>
  );
};
