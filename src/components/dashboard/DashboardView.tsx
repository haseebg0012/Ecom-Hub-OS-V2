import React, { useMemo } from 'react';
import {
  TrendingUp,
  CreditCard,
  PieChart,
  Users,
  Target,
  FolderKanban,
  CheckSquare,
  Activity,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Calendar,
  Sparkles,
  ArrowRightLeft,
  Clock,
  CheckCircle2,
  Phone,
  Mail,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { useCrm } from '../../lib/crm-context';
import { useFinance } from '../../lib/finance-context';
import { formatGreeting } from '../../lib/utils';
import { ActiveNavSection } from '../../types';

interface DashboardViewProps {
  onNavigate: (section: ActiveNavSection) => void;
  onOpenLead?: (leadId: string) => void;
  onOpenClient?: (clientId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenLead,
  onOpenClient,
}) => {
  const { user, activeBusiness, members, isSupabaseConnected } = useAuth();
  const {
    leads,
    clients,
    followups,
    activities,
    getExchangeRate,
    completeFollowup,
  } = useCrm();
  const { metrics: finMetrics, invoices: finInvoices } = useFinance();

  const greeting = formatGreeting(user?.full_name);

  // CRM Calculations
  const metrics = useMemo(() => {
    const totalLeads = leads.length;
    const newLeadsCount = leads.filter((l) => l.status === 'New').length;
    const activeClientsCount = clients.filter((c) => c.status === 'Active').length;

    // Total Pipeline Value in USD
    const totalPipelineValueUSD = leads
      .filter((l) => l.status !== 'Lost')
      .reduce((sum, l) => {
        const val = Number(l.budget) || 0;
        if (l.currency === 'USD') return sum + val;
        return sum + val * getExchangeRate(l.currency, 'USD');
      }, 0);

    // Total Lifetime Billed Revenue in USD
    const totalRevenueUSD = clients.reduce((sum, c) => {
      const rev = Number(c.total_revenue) || 0;
      if (c.preferred_currency === 'USD') return sum + rev;
      return sum + rev * getExchangeRate(c.preferred_currency, 'USD');
    }, 0);

    // Pending follow-ups
    const pendingFollowups = followups
      .filter((f) => f.status === 'Pending')
      .slice(0, 4);

    return {
      totalLeads,
      newLeadsCount,
      activeClientsCount,
      totalPipelineValueUSD,
      totalRevenueUSD,
      pendingFollowups,
    };
  }, [leads, clients, followups, getExchangeRate]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner & Business Scope Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-[#0F172A] tracking-tight">
            {greeting}
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Real-time multi-tenant business operations and CRM overview.
          </p>
        </div>

        {/* Active Tenant Context Pill */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs shadow-2xs">
            <Building2 className="w-3.5 h-3.5 text-[#4F46E5]" />
            <span className="font-medium text-[#0F172A]">
              {activeBusiness?.name || 'Active Workspace'}
            </span>
            <span className="text-[#94A3B8]">•</span>
            <span className="text-[#64748B]">{activeBusiness?.default_currency || 'USD'}</span>
            <span className="text-[#94A3B8]">•</span>
            <span className="px-1.5 py-0.5 font-medium rounded bg-[#EEF2FF] text-[#4F46E5]">
              {activeBusiness?.role || 'Owner'}
            </span>
          </div>
        </div>
      </div>

      {/* Financial Core Metrics: Client Revenue, Pipeline Value, Exchange Rate */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
            Financial & Pipeline Overview
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#64748B]">
              Live 1 USD = {getExchangeRate('USD', 'PKR')} PKR
            </span>
            <button
              onClick={() => onNavigate('finance')}
              className="text-xs font-medium text-[#4F46E5] hover:text-[#4338CA] flex items-center gap-1"
            >
              <span>Finance Module</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Liquid Cash Reserves */}
          <div
            onClick={() => onNavigate('finance')}
            className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs cursor-pointer hover:border-[#4F46E5]/60 transition-colors group"
          >
            <div className="flex items-center justify-between text-[#64748B] mb-3">
              <span className="text-xs font-medium text-[#64748B]">Liquid Cash Reserves</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-[#EEF2FF] group-hover:text-[#4F46E5] flex items-center justify-center transition-colors">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xl font-bold text-[#0F172A] tracking-tight">
                PKR {(finMetrics?.totalCashBalance ?? finMetrics?.cashBalance ?? 0).toLocaleString()}
              </div>
              <p className="text-xs text-[#64748B]">
                Operating Net: PKR {(finMetrics?.netProfit ?? finMetrics?.operatingProfit ?? 0).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Client Billed Revenue */}
          <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs">
            <div className="flex items-center justify-between text-[#64748B] mb-3">
              <span className="text-xs font-medium text-[#64748B]">Client Revenue Billed</span>
              <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xl font-bold text-[#0F172A] tracking-tight">
                ${Math.round(metrics.totalRevenueUSD).toLocaleString()}{' '}
                <span className="text-xs font-normal text-[#64748B]">USD</span>
              </div>
              <p className="text-xs text-[#64748B] flex items-center gap-1">
                <span>≈ PKR {Math.round(metrics.totalRevenueUSD * getExchangeRate('USD', 'PKR')).toLocaleString()}</span>
              </p>
            </div>
          </div>

          {/* Active Pipeline Value */}
          <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs">
            <div className="flex items-center justify-between text-[#64748B] mb-3">
              <span className="text-xs font-medium text-[#64748B]">Inbound Pipeline Value</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-[#4F46E5] flex items-center justify-center">
                <Target className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xl font-bold text-[#0F172A] tracking-tight">
                ${Math.round(metrics.totalPipelineValueUSD).toLocaleString()}{' '}
                <span className="text-xs font-normal text-[#64748B]">USD</span>
              </div>
              <p className="text-xs text-[#64748B] flex items-center gap-1">
                <span>≈ PKR {Math.round(metrics.totalPipelineValueUSD * getExchangeRate('USD', 'PKR')).toLocaleString()}</span>
              </p>
            </div>
          </div>

          {/* Multi-Currency Rate Engine */}
          <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs">
            <div className="flex items-center justify-between text-[#64748B] mb-3">
              <span className="text-xs font-medium text-[#64748B]">Tenant Currency Engine</span>
              <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center">
                <ArrowRightLeft className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xl font-bold text-[#0F172A] tracking-tight">
                1 USD = {getExchangeRate('USD', 'PKR')} PKR
              </div>
              <p className="text-xs text-amber-700 font-semibold">
                {finInvoices.filter((i) => i.balance_due > 0).length} Invoices pending balance
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Stats: Clients, Leads, Projects, Tasks */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
          Sales & Operations
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Clients */}
          <div
            onClick={() => onNavigate('clients')}
            className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs hover:border-[#4F46E5]/60 cursor-pointer transition-colors group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-[#64748B]">Active Clients</span>
              <div className="w-7 h-7 rounded-lg bg-[#F8FAFC] text-[#64748B] group-hover:text-[#4F46E5] group-hover:bg-[#EEF2FF] flex items-center justify-center transition-colors">
                <Users className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-[#0F172A]">{clients.length}</div>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">
              {metrics.activeClientsCount} active retainers
            </p>
          </div>

          {/* Leads */}
          <div
            onClick={() => onNavigate('leads')}
            className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs hover:border-[#4F46E5]/60 cursor-pointer transition-colors group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-[#64748B]">Inbound Leads</span>
              <div className="w-7 h-7 rounded-lg bg-[#F8FAFC] text-[#64748B] group-hover:text-[#4F46E5] group-hover:bg-[#EEF2FF] flex items-center justify-center transition-colors">
                <Target className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-[#0F172A]">{metrics.totalLeads}</div>
            <p className="text-[11px] text-[#4F46E5] font-semibold mt-1">
              {metrics.newLeadsCount} new inbound inquiries
            </p>
          </div>

          {/* Projects */}
          <div
            onClick={() => onNavigate('projects')}
            className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs hover:border-[#CBD5E1] cursor-pointer transition-colors group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-[#64748B]">Active Projects</span>
              <div className="w-7 h-7 rounded-lg bg-[#F8FAFC] text-[#64748B] group-hover:text-[#4F46E5] group-hover:bg-[#EEF2FF] flex items-center justify-center transition-colors">
                <FolderKanban className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-[#0F172A]">3</div>
            <p className="text-[11px] text-[#94A3B8] mt-1">Connected to client retainers</p>
          </div>

          {/* Tasks */}
          <div
            onClick={() => onNavigate('tasks')}
            className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs hover:border-[#CBD5E1] cursor-pointer transition-colors group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-[#64748B]">Open Tasks</span>
              <div className="w-7 h-7 rounded-lg bg-[#F8FAFC] text-[#64748B] group-hover:text-[#4F46E5] group-hover:bg-[#EEF2FF] flex items-center justify-center transition-colors">
                <CheckSquare className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-[#0F172A]">8</div>
            <p className="text-[11px] text-[#94A3B8] mt-1">Ready for team sprint</p>
          </div>
        </div>
      </div>

      {/* Grid: Pending Outreach / Follow-ups & Live Recent CRM Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent CRM Activities */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#4F46E5]" />
              <h3 className="text-sm font-semibold text-[#0F172A]">Recent CRM & Inbound Activity</h3>
            </div>
            <button
              onClick={() => onNavigate('leads')}
              className="text-xs font-semibold text-[#4F46E5] hover:underline"
            >
              View Pipeline →
            </button>
          </div>

          <div className="space-y-3">
            {activities.length === 0 ? (
              <p className="text-xs text-[#64748B] py-8 text-center">
                No recent activity recorded yet.
              </p>
            ) : (
              activities.slice(0, 5).map((act) => (
                <div
                  key={act.id}
                  onClick={() => {
                    if (act.lead_id && onOpenLead) onOpenLead(act.lead_id);
                    else if (act.client_id && onOpenClient) onOpenClient(act.client_id);
                  }}
                  className="flex items-start gap-3 p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#4F46E5]/40 transition-colors cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                    {act.activity_type.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1 text-xs">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-[#0F172A] truncate">{act.title}</p>
                      <span className="text-[10px] text-[#94A3B8]">
                        {new Date(act.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    {act.description && (
                      <p className="text-[#64748B] text-[11px] mt-0.5 line-clamp-1">
                        {act.description}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending Follow-up Action Items */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#4F46E5]" />
                <h3 className="text-sm font-semibold text-[#0F172A]">Priority Follow-ups</h3>
              </div>
              <button
                onClick={() => onNavigate('leads')}
                className="text-xs font-semibold text-[#4F46E5] hover:underline"
              >
                All Calls
              </button>
            </div>

            <div className="mt-3 space-y-2.5">
              {metrics.pendingFollowups.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#64748B]">
                  No pending follow-ups right now.
                </div>
              ) : (
                metrics.pendingFollowups.map((flw) => {
                  const lead = leads.find((l) => l.id === flw.lead_id);
                  return (
                    <div
                      key={flw.id}
                      className="p-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          onClick={() => lead && onOpenLead && onOpenLead(lead.id)}
                          className="font-bold text-[#0F172A] hover:text-[#4F46E5] cursor-pointer truncate"
                        >
                          {lead?.name || 'Prospect'}
                        </span>
                        <span className="text-[10px] text-[#4F46E5] font-semibold">
                          Due {flw.followup_date}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#64748B] line-clamp-1">
                        {flw.note || 'Follow-up discussion'}
                      </p>
                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => completeFollowup(flw.id)}
                          className="px-2.5 py-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                        >
                          Mark Completed
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-[#E2E8F0]">
            <button
              onClick={() => onNavigate('leads')}
              className="w-full py-2 px-3 text-xs font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-xl transition-colors shadow-2xs text-center"
            >
              Open Cold Calling Queue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
