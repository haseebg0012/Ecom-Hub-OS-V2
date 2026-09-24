import React, { useState, useMemo } from 'react';
import {
  RefreshCw,
  Plus,
  Search,
  Play,
  Pause,
  Trash2,
  Edit2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  History,
  Building2,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { useFinance } from '../../lib/finance-context';
import { usePermissions } from '../../lib/use-permissions';
import { RecurringTransaction, RecurringTransactionRun } from '../../types/finance';
import { formatFrequency, getDaysUntilNextRun, isRunDue } from '../../lib/recurring-engine';
import { AddRecurringModal } from './modals/AddRecurringModal';

export const RecurringView: React.FC = () => {
  const {
    recurringTransactions,
    recurringRuns,
    accounts,
    categories,
    runRecurringTransactionNow,
    pauseRecurringTransaction,
    resumeRecurringTransaction,
    deleteRecurringTransaction,
    processDueRecurringTransactions,
  } = useFinance();

  const { can } = usePermissions();
  const canCreate = can('finance.create');
  const canEdit = can('finance.edit');
  const canDelete = can('finance.delete');

  const [activeSubTab, setActiveSubTab] = useState<'schedules' | 'history'>('schedules');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'expense' | 'income' | 'investment'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Paused' | 'Completed'>('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringTransaction | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filtered recurring items
  const filteredItems = useMemo(() => {
    return recurringTransactions.filter((item) => {
      if (typeFilter !== 'All' && item.transaction_type !== typeFilter) return false;
      if (statusFilter !== 'All' && item.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchDesc = item.description?.toLowerCase().includes(q);
        const matchRef = item.reference?.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchRef) return false;
      }
      return true;
    });
  }, [recurringTransactions, typeFilter, statusFilter, searchQuery]);

  // Financial Projections (Monthly Base Equivalent)
  const stats = useMemo(() => {
    const active = recurringTransactions.filter((r) => r.is_active && r.status === 'Active');

    const getMonthlyMultiplier = (freq: string): number => {
      switch (freq.toLowerCase()) {
        case 'daily':
          return 30;
        case 'weekly':
          return 52 / 12;
        case 'bi-weekly':
        case 'biweekly':
          return 26 / 12;
        case 'monthly':
          return 1;
        case 'quarterly':
          return 1 / 3;
        case 'yearly':
          return 1 / 12;
        default:
          return 1;
      }
    };

    let monthlyExpenses = 0;
    let monthlyIncome = 0;
    let dueCount = 0;

    active.forEach((item) => {
      const baseAmt = item.base_amount || item.amount;
      const mult = getMonthlyMultiplier(item.frequency);
      if (item.transaction_type === 'expense') {
        monthlyExpenses += baseAmt * mult;
      } else if (item.transaction_type === 'income') {
        monthlyIncome += baseAmt * mult;
      }

      if (isRunDue(item.next_run_date)) {
        dueCount++;
      }
    });

    return {
      activeCount: active.length,
      monthlyExpenses: Math.round(monthlyExpenses),
      monthlyIncome: Math.round(monthlyIncome),
      netMonthly: Math.round(monthlyIncome - monthlyExpenses),
      dueCount,
    };
  }, [recurringTransactions]);

  const handleRunNow = async (id: string, name: string) => {
    setRunningId(id);
    setFeedbackMsg(null);
    try {
      const res = await runRecurringTransactionNow(id);
      if (res.success) {
        setFeedbackMsg({
          type: 'success',
          text: `Executed "${name}". New financial transaction recorded and account balance updated.`,
        });
      } else {
        setFeedbackMsg({
          type: 'error',
          text: res.error || `Failed to execute "${name}".`,
        });
      }
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || 'Execution error.',
      });
    } finally {
      setRunningId(null);
    }
  };

  const handleProcessDue = async () => {
    setIsProcessingBatch(true);
    setFeedbackMsg(null);
    try {
      const res = await processDueRecurringTransactions();
      if (res.success) {
        setFeedbackMsg({
          type: 'success',
          text: `Automated run complete: ${res.successful} processed successfully, ${res.failed} skipped/failed.`,
        });
      } else {
        setFeedbackMsg({
          type: 'error',
          text: res.error || 'Batch execution failed.',
        });
      }
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || 'Batch execution failed.',
      });
    } finally {
      setIsProcessingBatch(false);
    }
  };

  const handleTogglePause = async (item: RecurringTransaction) => {
    if (item.status === 'Active') {
      await pauseRecurringTransaction(item.id);
      setFeedbackMsg({
        type: 'success',
        text: `Paused recurring transaction "${item.name}".`,
      });
    } else {
      await resumeRecurringTransaction(item.id);
      setFeedbackMsg({
        type: 'success',
        text: `Resumed recurring transaction "${item.name}".`,
      });
    }
  };

  const handleDelete = async (id: string) => {
    await deleteRecurringTransaction(id);
    setDeleteConfirmId(null);
    setFeedbackMsg({
      type: 'success',
      text: 'Recurring transaction schedule removed. Historical transactions remain preserved.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Financial Projections */}
      <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4F46E5]">
                <RefreshCw className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-[#0F172A] tracking-tight">
                Recurring Transactions & Automation
              </h2>
            </div>
            <p className="text-xs text-[#64748B] mt-1">
              Automated recurring subscriptions, payroll, office overhead, and monthly client retainers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {stats.dueCount > 0 && canCreate && (
              <button
                id="recurring-process-due-btn"
                onClick={handleProcessDue}
                disabled={isProcessingBatch}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-200 rounded-xl shadow-xs transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-amber-900" />
                <span>
                  {isProcessingBatch ? 'Processing...' : `Run Due Now (${stats.dueCount})`}
                </span>
              </button>
            )}

            {canCreate && (
              <button
                id="recurring-schedule-btn"
                onClick={() => {
                  setEditingItem(null);
                  setIsAddModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-xl shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Schedule Recurring</span>
              </button>
            )}
          </div>
        </div>

        {/* Projection Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-5 border-t border-[#E2E8F0]">
          <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
              Active Schedules
            </span>
            <span className="text-xl font-bold text-[#0F172A] mt-1 block">
              {stats.activeCount}
            </span>
            <span className="text-[11px] text-[#64748B] mt-0.5 block">
              {stats.dueCount} currently due for execution
            </span>
          </div>

          <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
            <span className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider block flex items-center gap-1">
              <ArrowDownRight className="w-3.5 h-3.5" />
              Monthly Overhead
            </span>
            <span className="text-xl font-bold text-rose-600 mt-1 block">
              PKR {stats.monthlyExpenses.toLocaleString()}
            </span>
            <span className="text-[11px] text-[#64748B] mt-0.5 block">
              Projected recurring expenses
            </span>
          </div>

          <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
            <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              Monthly Retainers
            </span>
            <span className="text-xl font-bold text-emerald-600 mt-1 block">
              PKR {stats.monthlyIncome.toLocaleString()}
            </span>
            <span className="text-[11px] text-[#64748B] mt-0.5 block">
              Projected recurring income
            </span>
          </div>

          <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
            <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider block">
              Net Monthly Recurring
            </span>
            <span
              className={`text-xl font-bold mt-1 block ${
                stats.netMonthly >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              PKR {stats.netMonthly.toLocaleString()}
            </span>
            <span className="text-[11px] text-[#64748B] mt-0.5 block">
              Projected monthly net delta
            </span>
          </div>
        </div>
      </div>

      {/* Feedback Toast Banner */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-[#64748B] hover:text-[#0F172A] font-bold ml-4"
          >
            ×
          </button>
        </div>
      )}

      {/* Section Sub-Navigation (Schedules vs Execution History) */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('schedules')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'schedules'
                ? 'bg-[#4F46E5] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-white'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Templates & Schedules</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeSubTab === 'schedules' ? 'bg-white/20 text-white' : 'bg-slate-100 text-[#64748B]'
              }`}
            >
              {recurringTransactions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'history'
                ? 'bg-[#4F46E5] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Execution Audit Log</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeSubTab === 'history' ? 'bg-white/20 text-white' : 'bg-slate-100 text-[#64748B]'
              }`}
            >
              {recurringRuns.length}
            </span>
          </button>
        </div>
      </div>

      {activeSubTab === 'schedules' && (
        <div className="space-y-4">
          {/* Filters and Search Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[240px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search recurring template, memo..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                />
              </div>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
              >
                <option value="All">All Types</option>
                <option value="expense">Expenses</option>
                <option value="income">Income</option>
                <option value="investment">Investments</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Paused">Paused</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <span className="text-xs text-[#64748B]">
              Showing {filteredItems.length} of {recurringTransactions.length} schedules
            </span>
          </div>

          {/* Schedules Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                    <th className="py-3 px-4">Template / Description</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Cadence</th>
                    <th className="py-3 px-4">Account / Category</th>
                    <th className="py-3 px-4">Next Run</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-xs">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-[#64748B]">
                        <RefreshCw className="w-8 h-8 mx-auto text-[#94A3B8] mb-2" />
                        <p className="font-semibold text-sm text-[#0F172A]">No recurring schedules found</p>
                        <p className="text-xs mt-1">
                          Schedule monthly software fees, rent, or client retainers for automated accounting.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => {
                      const account = accounts.find((a) => a.id === item.account_id);
                      const category = categories.find((c) => c.id === item.category_id);
                      const isDue = isRunDue(item.next_run_date);
                      const daysUntil = getDaysUntilNextRun(item.next_run_date);
                      const isRunning = runningId === item.id;

                      let typeBadgeClass = 'bg-slate-100 text-slate-700';
                      if (item.transaction_type === 'expense') typeBadgeClass = 'bg-rose-50 text-rose-700 border-rose-100';
                      if (item.transaction_type === 'income') typeBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                      if (item.transaction_type === 'investment') typeBadgeClass = 'bg-blue-50 text-blue-700 border-blue-100';

                      return (
                        <tr key={item.id} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="py-3.5 px-4 font-medium text-[#0F172A]">
                            <div className="font-semibold text-[#0F172A]">{item.name}</div>
                            {item.description && (
                              <div className="text-[11px] text-[#64748B] line-clamp-1">{item.description}</div>
                            )}
                            {item.reference && (
                              <span className="inline-block mt-0.5 text-[10px] text-[#94A3B8] font-mono">
                                Ref: {item.reference}
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase ${typeBadgeClass}`}
                            >
                              {item.transaction_type}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-bold text-[#0F172A]">
                              {item.currency} {item.amount.toLocaleString()}
                            </div>
                            {item.currency !== 'PKR' && item.base_amount && (
                              <div className="text-[10px] text-[#64748B]">
                                ≈ PKR {item.base_amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px] font-medium text-[#475569]">
                              {formatFrequency(item.frequency)}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-[#64748B]">
                            <div className="font-medium text-[#0F172A] line-clamp-1">
                              {account ? account.name : 'Unknown Account'}
                            </div>
                            <div className="text-[11px] text-[#64748B]">
                              {category ? category.name : 'Uncategorized'}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-mono text-xs text-[#0F172A]">{item.next_run_date}</div>
                            <div
                              className={`text-[10px] font-semibold mt-0.5 ${
                                isDue
                                  ? 'text-amber-600'
                                  : daysUntil <= 3
                                  ? 'text-indigo-600'
                                  : 'text-[#64748B]'
                              }`}
                            >
                              {isDue
                                ? 'Due Now'
                                : daysUntil === 1
                                ? 'Tomorrow'
                                : `In ${daysUntil} days`}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                item.status === 'Active'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.status === 'Paused'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Run Now Action */}
                              {canCreate && item.status !== 'Completed' && (
                                <button
                                  id={`recurring-run-btn-${item.id}`}
                                  disabled={isRunning}
                                  onClick={() => handleRunNow(item.id, item.name)}
                                  title="Run now and generate transaction record"
                                  className={`p-1.5 rounded-lg border transition-all flex items-center gap-1 text-[11px] font-semibold ${
                                    isDue
                                      ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-xs'
                                      : 'bg-white text-[#4F46E5] border-indigo-200 hover:bg-indigo-50'
                                  }`}
                                >
                                  <Play className="w-3 h-3 fill-current" />
                                  <span className="hidden sm:inline">
                                    {isRunning ? 'Running...' : 'Run'}
                                  </span>
                                </button>
                              )}

                              {/* Pause / Resume Action */}
                              {canEdit && item.status !== 'Completed' && (
                                <button
                                  id={`recurring-pause-btn-${item.id}`}
                                  onClick={() => handleTogglePause(item)}
                                  title={item.status === 'Active' ? 'Pause schedule' : 'Resume schedule'}
                                  className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 border border-transparent transition-colors"
                                >
                                  {item.status === 'Active' ? (
                                    <Pause className="w-3.5 h-3.5" />
                                  ) : (
                                    <Play className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}

                              {/* Edit Action */}
                              {canEdit && (
                                <button
                                  id={`recurring-edit-btn-${item.id}`}
                                  onClick={() => {
                                    setEditingItem(item);
                                    setIsAddModalOpen(true);
                                  }}
                                  title="Edit schedule"
                                  className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 border border-transparent transition-colors"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Delete Action */}
                              {canDelete && (
                                <button
                                  id={`recurring-delete-btn-${item.id}`}
                                  onClick={() => setDeleteConfirmId(item.id)}
                                  title="Delete recurring schedule"
                                  className="p-1.5 rounded-lg text-[#64748B] hover:text-rose-600 hover:bg-rose-50 border border-transparent transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
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
      )}

      {/* Execution Audit Log View */}
      {activeSubTab === 'history' && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                Execution Audit Trail
              </h3>
              <p className="text-[11px] text-[#64748B]">
                Immutable server execution logs with idempotency tracking to prevent duplicate financial disbursements.
              </p>
            </div>
            <span className="text-xs text-[#64748B] font-mono">
              Total Runs: {recurringRuns.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-[#E2E8F0] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                  <th className="py-3 px-4">Scheduled Date</th>
                  <th className="py-3 px-4">Execution Time</th>
                  <th className="py-3 px-4">Recurring Template</th>
                  <th className="py-3 px-4">Generated Transaction ID</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Details / Errors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs">
                {recurringRuns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-[#64748B]">
                      <History className="w-6 h-6 mx-auto text-[#94A3B8] mb-1.5" />
                      <p className="font-semibold text-[#0F172A]">No execution runs recorded yet</p>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        Runs will appear here once recurring schedules execute automatically or manually.
                      </p>
                    </td>
                  </tr>
                ) : (
                  recurringRuns.map((run) => {
                    const template = recurringTransactions.find(
                      (r) => r.id === run.recurring_transaction_id
                    );

                    return (
                      <tr key={run.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-4 font-mono font-semibold text-[#0F172A]">
                          {run.scheduled_date}
                        </td>
                        <td className="py-3 px-4 text-[#64748B]">
                          {new Date(run.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-medium text-[#0F172A]">
                          {template ? template.name : run.recurring_transaction_id}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-[#4F46E5]">
                          {run.transaction_id || '—'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              run.status === 'success'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {run.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#64748B]">
                          {run.error_message ? (
                            <span className="text-rose-600 font-medium">{run.error_message}</span>
                          ) : (
                            <span className="text-emerald-700 flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-600" /> Idempotent execution completed
                            </span>
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
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-[#E2E8F0] shadow-xl space-y-4">
            <div className="flex items-center gap-2.5 text-rose-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-sm text-[#0F172A]">Delete Recurring Schedule?</h3>
            </div>
            <p className="text-xs text-[#64748B]">
              This will cancel future automated runs for this schedule. Past transactions generated by this template will remain safely in your ledger.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Recurring Modal */}
      {isAddModalOpen && (
        <AddRecurringModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingItem(null);
          }}
          editItem={editingItem}
        />
      )}
    </div>
  );
};
