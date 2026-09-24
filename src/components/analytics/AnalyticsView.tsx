import React from 'react';
import { BarChart3, TrendingUp, Users, DollarSign, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';

export const AnalyticsView: React.FC = () => {
  const { activeBusiness } = useAuth();

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
            <h3 className="text-lg font-bold text-[#0F172A]">$45,280</h3>
            <span className="text-xs font-semibold text-green-600 flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5" /> +18.4%
            </span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs space-y-2">
          <p className="text-xs font-medium text-[#64748B]">Active Clients</p>
          <div className="flex items-baseline justify-between">
            <h3 className="text-lg font-bold text-[#0F172A]">24</h3>
            <span className="text-xs font-semibold text-green-600 flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5" /> +4.2%
            </span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs space-y-2">
          <p className="text-xs font-medium text-[#64748B]">Conversion Rate</p>
          <div className="flex items-baseline justify-between">
            <h3 className="text-lg font-bold text-[#0F172A]">32.8%</h3>
            <span className="text-xs font-semibold text-green-600 flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5" /> +6.1%
            </span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs space-y-2">
          <p className="text-xs font-medium text-[#64748B]">Operating Expenses</p>
          <div className="flex items-baseline justify-between">
            <h3 className="text-lg font-bold text-[#0F172A]">$12,450</h3>
            <span className="text-xs font-semibold text-amber-600">-1.5%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-[#0F172A]">Revenue Velocity Trend</h3>
          <div className="h-64 flex items-end justify-between gap-3 pt-6 border-b border-[#E2E8F0]">
            {[45, 60, 55, 80, 70, 95, 110].map((val, idx) => (
              <div key={idx} className="w-full bg-indigo-50 rounded-t-lg flex flex-col justify-end group relative h-full">
                <div
                  className="bg-[#4F46E5] rounded-t-lg transition-all group-hover:bg-[#4338CA]"
                  style={{ height: `${val}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-[#64748B]">
            <span>Oct</span>
            <span>Nov</span>
            <span>Dec</span>
            <span>Jan</span>
            <span>Feb</span>
            <span>Mar</span>
            <span>Apr</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-[#0F172A]">Lead Pipeline Distribution</h3>
          <div className="space-y-3">
            {[
              { label: 'New Inbound Leads', count: 45, pct: '75%', color: 'bg-indigo-500' },
              { label: 'Contacted & Qualified', count: 28, pct: '50%', color: 'bg-blue-500' },
              { label: 'Proposal & Negotiation', count: 12, pct: '30%', color: 'bg-amber-500' },
              { label: 'Closed / Converted', count: 8, pct: '18%', color: 'bg-green-500' },
            ].map((item, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-[#0F172A]">
                  <span>{item.label}</span>
                  <span className="text-[#64748B]">{item.count} leads</span>
                </div>
                <div className="w-full h-2.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full`} style={{ width: item.pct }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
