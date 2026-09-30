import React, { useMemo } from 'react';
import { BarChart3, TrendingUp, Users, DollarSign, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { useCrm } from '../../lib/crm-context';
import { useFinance } from '../../lib/finance-context';

export const AnalyticsView: React.FC = () => {
  const { activeBusiness } = useAuth();
  const { leads, clients, getExchangeRate } = useCrm();
  const { metrics: finMetrics, getProfitAndLossReport } = useFinance();

  const analytics = useMemo(() => {
    const totalLeads = leads.length;
    const newCount = leads.filter((l) => l.status === 'New').length;
    const contactedQualifiedCount = leads.filter(
      (l) => l.status === 'Contacted' || l.status === 'Qualified'
    ).length;
    const proposalNegotiationCount = leads.filter(
      (l) => l.status === 'Proposal' || l.status === 'Negotiation' || l.status === 'Meeting'
    ).length;
    const wonCount = leads.filter((l) => l.status === 'Won').length;

    const conversionRate =
      totalLeads > 0 ? ((wonCount / totalLeads) * 100).toFixed(1) : '0.0';

    const activeClientsCount = clients.filter((c) => c.status === 'Active').length;

    const monthlyRevenueUSD = finMetrics?.monthlyRevenue || 0;
    const monthlyExpensesUSD = finMetrics?.monthlyExpenses || 0;

    const calcPct = (cnt: number) => {
      if (totalLeads === 0) return '0%';
      return `${Math.round((cnt / totalLeads) * 100)}%`;
    };

    return {
      totalLeads,
      newCount,
      contactedQualifiedCount,
      proposalNegotiationCount,
      wonCount,
      conversionRate,
      activeClientsCount,
      monthlyRevenueUSD,
      monthlyExpensesUSD,
      pipelineDistribution: [
        {
          label: 'New Inbound Leads',
          count: newCount,
          pct: calcPct(newCount),
          color: 'bg-indigo-500',
        },
        {
          label: 'Contacted & Qualified',
          count: contactedQualifiedCount,
          pct: calcPct(contactedQualifiedCount),
          color: 'bg-blue-500',
        },
        {
          label: 'Proposal & Negotiation',
          count: proposalNegotiationCount,
          pct: calcPct(proposalNegotiationCount),
          color: 'bg-amber-500',
        },
        {
          label: 'Closed / Converted',
          count: wonCount,
          pct: calcPct(wonCount),
          color: 'bg-green-500',
        },
      ],
    };
  }, [leads, clients, finMetrics]);

  const velocityTrend = useMemo(() => {
    const report = getProfitAndLossReport ? getProfitAndLossReport('this_year') : null;
    if (!report?.monthlyTrend || report.monthlyTrend.length === 0) {
      return [];
    }
    return report.monthlyTrend.slice(-7).map((m) => ({
      label: m.label.split(' ')[0],
      revenue: m.revenue,
    }));
  }, [getProfitAndLossReport]);

  const maxVelocityRevenue = Math.max(1, ...velocityTrend.map((v) => v.revenue));
  const hasVelocityRevenue = velocityTrend.some((v) => v.revenue > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#0F172A] flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-[#4F46E5]" />
          <span>Executive Analytics & Reports</span>
        </h1>
        <p className="text-xs text-[#64748B] mt-0.5">
          Real-time performance metrics and business growth KPIs for {activeBusiness?.name || 'your business'}.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs space-y-2">
          <p className="text-xs font-medium text-[#64748B]">Monthly Revenue</p>
          <div className="flex items-baseline justify-between">
            <h3 className="text-lg font-bold text-[#0F172A]">
              ${analytics.monthlyRevenueUSD.toLocaleString()}
            </h3>
            <span className="text-xs font-semibold text-emerald-600 flex items-center">
              <ArrowUpRight className="w-3 h-3 inline" /> Live
            </span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs space-y-2">
          <p className="text-xs font-medium text-[#64748B]">Active Clients</p>
          <div className="flex items-baseline justify-between">
            <h3 className="text-lg font-bold text-[#0F172A]">{analytics.activeClientsCount}</h3>
            <span className="text-xs font-semibold text-slate-500">Active</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs space-y-2">
          <p className="text-xs font-medium text-[#64748B]">Conversion Rate</p>
          <div className="flex items-baseline justify-between">
            <h3 className="text-lg font-bold text-[#0F172A]">{analytics.conversionRate}%</h3>
            <span className="text-xs font-semibold text-slate-500">Won / Total</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs space-y-2">
          <p className="text-xs font-medium text-[#64748B]">Operating Expenses</p>
          <div className="flex items-baseline justify-between">
            <h3 className="text-lg font-bold text-[#0F172A]">
              ${analytics.monthlyExpensesUSD.toLocaleString()}
            </h3>
            <span className="text-xs font-semibold text-slate-500">Current</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-[#0F172A]">Revenue Velocity Trend</h3>
          {!hasVelocityRevenue ? (
            <div className="h-64 flex items-center justify-center text-xs text-[#94A3B8]">
              No revenue activity recorded for velocity trend.
            </div>
          ) : (
            <>
              <div className="h-64 flex items-end justify-between gap-3 pt-6 border-b border-[#E2E8F0]">
                {velocityTrend.map((item, idx) => {
                  const heightPct = item.revenue > 0 ? Math.max(5, (item.revenue / maxVelocityRevenue) * 100) : 0;
                  return (
                    <div key={idx} className="w-full bg-indigo-50/50 rounded-t-lg flex flex-col justify-end group relative h-full">
                      <div
                        className="bg-indigo-500 rounded-t-lg transition-all"
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-[#64748B]">
                {velocityTrend.map((item, idx) => (
                  <span key={idx}>{item.label}</span>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#0F172A]">Lead Pipeline Distribution</h3>
            <span className="text-xs font-semibold text-[#4F46E5] bg-[#EEF2FF] px-2 py-0.5 rounded-full">
              {analytics.totalLeads} Total Leads
            </span>
          </div>
          <div className="space-y-3">
            {analytics.pipelineDistribution.map((item, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-[#0F172A]">
                  <span>{item.label}</span>
                  <span className="text-[#64748B]">
                    {item.count} leads ({item.pct})
                  </span>
                </div>
                <div className="w-full h-2.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: item.pct }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
