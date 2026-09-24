/**
 * EcomHub OS — Agent Performance & Attribution View
 * Analytics, conversion rates, and leaderboard for field lead-generation agents.
 */

import React, { useMemo } from 'react';
import {
  Users,
  Award,
  TrendingUp,
  Target,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { Lead } from '../../types';
import { useCrm } from '../../lib/crm-context';

interface AgentPerformanceViewProps {
  leads: Lead[];
  onSelectAgentFilter: (agentName: string) => void;
  onOpenLeadSettings?: () => void;
}

interface AgentStat {
  agentName: string;
  totalLeads: number;
  newLeads: number;
  inPipeline: number;
  wonLeads: number;
  lostLeads: number;
  conversionRate: number;
  totalPipelineValueUSD: number;
  lastSubmittedAt: string | null;
}

export const AgentPerformanceView: React.FC<AgentPerformanceViewProps> = ({
  leads,
  onSelectAgentFilter,
  onOpenLeadSettings,
}) => {
  const { getExchangeRate } = useCrm();

  const agentStats = useMemo(() => {
    const map: Record<string, AgentStat> = {};

    leads.forEach((l) => {
      // Consider leads that have an agent_name or source === 'Agent'
      if (!l.agent_name && l.source !== 'Agent') return;
      const name = (l.agent_name || 'Unattributed Agent').trim();

      if (!map[name]) {
        map[name] = {
          agentName: name,
          totalLeads: 0,
          newLeads: 0,
          inPipeline: 0,
          wonLeads: 0,
          lostLeads: 0,
          conversionRate: 0,
          totalPipelineValueUSD: 0,
          lastSubmittedAt: null,
        };
      }

      const stat = map[name];
      stat.totalLeads += 1;

      if (l.status === 'New') {
        stat.newLeads += 1;
      } else if (l.status === 'Won') {
        stat.wonLeads += 1;
      } else if (l.status === 'Lost') {
        stat.lostLeads += 1;
      } else {
        stat.inPipeline += 1;
      }

      if (l.status !== 'Lost') {
        const val = Number(l.budget) || 0;
        const inUSD = l.currency === 'USD' ? val : val * getExchangeRate(l.currency, 'USD');
        stat.totalPipelineValueUSD += inUSD;
      }

      if (
        !stat.lastSubmittedAt ||
        new Date(l.created_at).getTime() > new Date(stat.lastSubmittedAt).getTime()
      ) {
        stat.lastSubmittedAt = l.created_at;
      }
    });

    const list = Object.values(map);
    list.forEach((s) => {
      s.conversionRate = s.totalLeads > 0 ? Math.round((s.wonLeads / s.totalLeads) * 100) : 0;
    });

    // Sort by total leads descending
    return list.sort((a, b) => b.totalLeads - a.totalLeads || b.wonLeads - a.wonLeads);
  }, [leads, getExchangeRate]);

  // Overall Agent Metrics
  const summary = useMemo(() => {
    const totalLeads = agentStats.reduce((sum, a) => sum + a.totalLeads, 0);
    const wonLeads = agentStats.reduce((sum, a) => sum + a.wonLeads, 0);
    const totalValue = agentStats.reduce((sum, a) => sum + a.totalPipelineValueUSD, 0);
    const overallConversion = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;
    const activeAgentsCount = agentStats.length;

    return { totalLeads, wonLeads, totalValue, overallConversion, activeAgentsCount };
  }, [agentStats]);

  return (
    <div className="space-y-6">
      {/* Top Summary Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span>Total Agent Leads</span>
            <Users className="w-4 h-4 text-[#4F46E5]" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A] mt-1 tracking-tight">
            {summary.totalLeads}
          </div>
          <p className="text-[11px] text-[#64748B] mt-0.5">Across {summary.activeAgentsCount} agents</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span>Won & Converted</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-1 tracking-tight">
            {summary.wonLeads}{' '}
            <span className="text-xs font-semibold text-[#64748B]">
              ({summary.overallConversion}%)
            </span>
          </div>
          <p className="text-[11px] text-[#64748B] mt-0.5">Closed deals from agent leads</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span>Agent Pipeline Value</span>
            <TrendingUp className="w-4 h-4 text-[#4F46E5]" />
          </div>
          <div className="text-xl font-bold text-[#0F172A] mt-1 tracking-tight truncate">
            ${Math.round(summary.totalValue).toLocaleString()}{' '}
            <span className="text-xs font-normal text-[#64748B]">USD</span>
          </div>
          <p className="text-[11px] text-[#64748B] mt-0.5">Inbound opportunity value</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs flex flex-col justify-between">
          <div>
            <span className="text-xs text-[#64748B] block">Lead Entry Gateway</span>
            <p className="text-xs font-bold text-[#0F172A] mt-1">Mobile Lead Form</p>
          </div>
          {onOpenLeadSettings && (
            <button
              onClick={onOpenLeadSettings}
              className="mt-2 text-xs font-semibold text-[#4F46E5] hover:underline flex items-center gap-1"
            >
              <span>Manage Form & Agents</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Leaderboard & Breakdown */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-[#0F172A]">Agent Performance & Attribution</h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Live breakdown of leads, conversion rates, and pipeline contributions by agent.
            </p>
          </div>
          <span className="text-xs text-[#64748B] bg-[#F8FAFC] px-3 py-1 rounded-lg border border-[#E2E8F0]">
            Click any row to filter leads by that agent
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Rank & Agent</th>
                <th className="py-3 px-4 text-center">Total Leads</th>
                <th className="py-3 px-4 text-center">New</th>
                <th className="py-3 px-4 text-center">In Pipeline</th>
                <th className="py-3 px-4 text-center">Won</th>
                <th className="py-3 px-4 text-center">Conversion Rate</th>
                <th className="py-3 px-4 text-right">Pipeline Value</th>
                <th className="py-3 px-4 text-right">Last Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {agentStats.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-[#64748B]">
                    No leads have been submitted by agents yet.
                  </td>
                </tr>
              ) : (
                agentStats.map((stat, idx) => {
                  return (
                    <tr
                      key={stat.agentName}
                      onClick={() => onSelectAgentFilter(stat.agentName)}
                      className="hover:bg-[#F8FAFC] transition-colors cursor-pointer group"
                    >
                      {/* Rank & Agent Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              idx === 0
                                ? 'bg-amber-100 text-amber-800'
                                : idx === 1
                                ? 'bg-slate-200 text-slate-700'
                                : idx === 2
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-[#F1F5F9] text-[#64748B]'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <div>
                            <p className="font-bold text-[#0F172A] group-hover:text-[#4F46E5] transition-colors">
                              {stat.agentName}
                            </p>
                            <span className="text-[10px] text-[#94A3B8]">Field Lead Agent</span>
                          </div>
                        </div>
                      </td>

                      {/* Total Leads */}
                      <td className="py-3.5 px-4 text-center font-bold text-sm text-[#0F172A]">
                        {stat.totalLeads}
                      </td>

                      {/* New */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                          {stat.newLeads}
                        </span>
                      </td>

                      {/* In Pipeline */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700">
                          {stat.inPipeline}
                        </span>
                      </td>

                      {/* Won */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                          {stat.wonLeads}
                        </span>
                      </td>

                      {/* Conversion Rate */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="font-bold text-xs text-[#0F172A]">
                            {stat.conversionRate}%
                          </span>
                          <div className="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full"
                              style={{ width: `${Math.min(stat.conversionRate, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Pipeline Value */}
                      <td className="py-3.5 px-4 text-right font-bold text-[#0F172A]">
                        ${Math.round(stat.totalPipelineValueUSD).toLocaleString()}
                      </td>

                      {/* Last Activity */}
                      <td className="py-3.5 px-4 text-right text-[11px] text-[#64748B]">
                        {stat.lastSubmittedAt
                          ? new Date(stat.lastSubmittedAt).toLocaleDateString()
                          : '—'}
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
