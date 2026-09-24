import React, { useEffect, useState } from 'react';
import { Building2, Users, ShieldCheck, Activity, Plus, ArrowUpRight, Server, Globe } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { apiFetch } from '../../lib/supabase';

interface PlatformStats {
  totalWorkspaces: number;
  activeWorkspaces: number;
  suspendedWorkspaces: number;
  totalOwners: number;
  totalEmployees: number;
  recentWorkspaces: any[];
}

export const PlatformDashboardView: React.FC<{ onNavigateToWorkspaces: () => void; onCreateWorkspace: () => void }> = ({
  onNavigateToWorkspaces,
  onCreateWorkspace,
}) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<PlatformStats>({
    totalWorkspaces: 0,
    activeWorkspaces: 0,
    suspendedWorkspaces: 0,
    totalOwners: 0,
    totalEmployees: 0,
    recentWorkspaces: [],
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Fetch platform stats from API using authenticated session
    setIsLoading(true);
    apiFetch('/api/platform/dashboard')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setStats(data);
        }
      })
      .catch((err) => {
        console.error('Error fetching dashboard stats:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [user]);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#4F46E5]/30 text-[#818CF8] text-xs font-medium mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Platform Master Control Panel</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">EcomHub OS Architecture & Governance</h1>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl">
            Manage multi-tenant customer workspaces, tenant isolation policies, platform administrators, and system-wide telemetry.
          </p>
        </div>
        <button
          onClick={onCreateWorkspace}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-medium text-sm transition-colors shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Provision New Workspace</span>
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Workspaces</span>
            <Building2 className="w-4 h-4 text-[#4F46E5]" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A]">{stats.totalWorkspaces}</div>
          <div className="text-xs text-emerald-600 font-medium mt-1">100% Isolated Tenants</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Tenants</span>
            <Globe className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A]">{stats.activeWorkspaces}</div>
          <div className="text-xs text-[#64748B] mt-1">Operational & Healthy</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Suspended</span>
            <Server className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A]">{stats.suspendedWorkspaces}</div>
          <div className="text-xs text-[#64748B] mt-1">Awaiting review / billing</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Workspace Owners</span>
            <Users className="w-4 h-4 text-[#4F46E5]" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A]">{stats.totalOwners}</div>
          <div className="text-xs text-[#64748B] mt-1">Authenticated Admins</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Team Staff</span>
            <Activity className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A]">{stats.totalEmployees}</div>
          <div className="text-xs text-[#64748B] mt-1">Cross-tenant employees</div>
        </div>
      </div>

      {/* Recent Workspaces Table Card */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">Customer Workspaces</h2>
            <p className="text-xs text-[#64748B]">Overview of active multi-tenant instances on EcomHub OS.</p>
          </div>
          <button
            onClick={onNavigateToWorkspaces}
            className="text-xs font-semibold text-[#4F46E5] hover:text-[#4338CA] inline-flex items-center gap-1"
          >
            <span>View All Workspaces</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                <th className="py-3 px-5">Workspace Name</th>
                <th className="py-3 px-5">Business ID</th>
                <th className="py-3 px-5">Owner</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs text-[#0F172A]">
              {stats.recentWorkspaces.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No customer workspaces have been provisioned yet.
                  </td>
                </tr>
              ) : (
                stats.recentWorkspaces.map((ws: any) => (
                  <tr key={ws.id} className="hover:bg-[#F8FAFC]/50 transition-colors">
                    <td className="py-3.5 px-5 font-semibold flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#4F46E5]/10 text-[#4F46E5] flex items-center justify-center font-bold text-xs">
                        {ws.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span>{ws.name}</span>
                    </td>
                    <td className="py-3.5 px-5 font-mono text-[#64748B]">{ws.id}</td>
                    <td className="py-3.5 px-5">{ws.owner_name || ws.owner || 'Workspace Owner'}</td>
                    <td className="py-3.5 px-5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {ws.status || 'Active'}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-[#64748B]">{new Date(ws.created_at || Date.now()).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
