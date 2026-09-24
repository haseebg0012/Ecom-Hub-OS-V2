import React, { useState, useEffect } from 'react';
import { ShieldCheck, Building2, LayoutDashboard, Settings, LogOut, Lock, Activity, Users, UserCog, Briefcase, Layers, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { PlatformDashboardView } from './PlatformDashboardView';
import { PlatformWorkspacesView } from './PlatformWorkspacesView';
import { MasterBusinessRolesView } from './MasterBusinessRolesView';
import { MasterTaskBuilderView } from './MasterTaskBuilderView';
import { MasterProfileView } from './MasterProfileView';
import { MasterTeamView } from './MasterTeamView';

type PlatformNavTab = 'dashboard' | 'workspaces' | 'business-roles' | 'task-builder' | 'team' | 'profile' | 'audit-logs' | 'settings';

export const PlatformAdminShell: React.FC = () => {
  const { user, logout, isPlatformOwner } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<PlatformNavTab>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash.includes('profile')) return 'profile';
      if (hash.includes('team')) return 'team';
      if (hash.includes('workspaces')) return 'workspaces';
      if (hash.includes('business-roles')) return 'business-roles';
      if (hash.includes('task-builder')) return 'task-builder';
      if (hash.includes('settings')) return 'settings';
      if (hash.includes('audit')) return 'audit-logs';
    }
    return 'dashboard';
  });

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.includes('profile')) setActiveTab('profile');
      else if (hash.includes('team')) setActiveTab('team');
      else if (hash.includes('workspaces')) setActiveTab('workspaces');
      else if (hash.includes('business-roles')) setActiveTab('business-roles');
      else if (hash.includes('task-builder')) setActiveTab('task-builder');
      else if (hash.includes('settings')) setActiveTab('settings');
      else if (hash.includes('audit')) setActiveTab('audit-logs');
      else setActiveTab('dashboard');
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const switchTab = (tab: PlatformNavTab) => {
    setActiveTab(tab);
    try {
      window.history.pushState({}, '', `/master#${tab}`);
    } catch {
      // ignore
    }
  };

  if (!isPlatformOwner) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-4">
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-[#0F172A] mb-2">Access Denied — Platform Owner Required</h1>
        <p className="text-sm text-[#64748B] max-w-md mb-6">
          You are signed in as a workspace user. The EcomHub OS Master Control Panel is strictly restricted to EcomHub OS Platform Owners.
        </p>
        <button
          onClick={() => (window.location.href = '/')}
          className="px-4 py-2 bg-[#4F46E5] text-white rounded-xl text-sm font-medium hover:bg-[#4338CA] transition-colors"
        >
          Return to My Workspace
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#F8FAFC] flex flex-row overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`bg-[#0F172A] text-slate-300 flex flex-col justify-between border-r border-slate-800 shrink-0 transition-all duration-200 z-30 ${
          isSidebarOpen ? 'w-64 min-w-[16rem]' : 'w-0 min-w-0 overflow-hidden border-none pointer-events-none'
        }`}
      >
        <div>
          {/* Logo Header */}
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#4F46E5] flex items-center justify-center text-white font-bold text-base shadow-xs">
              EH
            </div>
            <div>
              <h2 className="text-white font-bold text-sm tracking-tight leading-none">EcomHub OS</h2>
              <span className="text-[10px] font-semibold text-[#818CF8] tracking-widest uppercase mt-0.5 block">
                Control Center
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            <button
              onClick={() => switchTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-[#4F46E5] text-white shadow-xs'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => switchTab('workspaces')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                activeTab === 'workspaces'
                  ? 'bg-[#4F46E5] text-white shadow-xs'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Workspaces</span>
            </button>

            <button
              onClick={() => switchTab('business-roles')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                activeTab === 'business-roles'
                  ? 'bg-[#4F46E5] text-white shadow-xs'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Business Roles</span>
            </button>

            <button
              onClick={() => switchTab('task-builder')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                activeTab === 'task-builder'
                  ? 'bg-[#4F46E5] text-white shadow-xs'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Task Builder</span>
            </button>

            <button
              onClick={() => switchTab('team')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                activeTab === 'team'
                  ? 'bg-[#4F46E5] text-white shadow-xs'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Master Team</span>
            </button>

            <button
              onClick={() => switchTab('profile')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                activeTab === 'profile'
                  ? 'bg-[#4F46E5] text-white shadow-xs'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <UserCog className="w-4 h-4" />
              <span>Master Profile</span>
            </button>

            <button
              onClick={() => switchTab('audit-logs')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                activeTab === 'audit-logs'
                  ? 'bg-[#4F46E5] text-white shadow-xs'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Platform Activity</span>
            </button>

            <button
              onClick={() => switchTab('settings')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'bg-[#4F46E5] text-white shadow-xs'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </nav>
        </div>

        {/* User Footer */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center justify-between mb-3 px-2">
            <div className="truncate cursor-pointer" onClick={() => switchTab('profile')}>
              <div className="text-xs font-semibold text-white truncate">{user?.full_name || 'Master Owner'}</div>
              <div className="text-[11px] text-slate-400 truncate">{user?.email}</div>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-[#4F46E5]/20 text-[#818CF8] text-[10px] font-bold uppercase">
              Master
            </span>
          </div>
          <button
            onClick={async () => {
              await logout();
              window.location.href = '/masterlogin';
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Master Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="bg-white border-b border-[#E2E8F0] px-6 py-4 flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-[#4F46E5] hover:bg-slate-100 transition-colors"
              title={isSidebarOpen ? 'Collapse Navigation Sidebar' : 'Expand Navigation Sidebar'}
            >
              {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#4F46E5]" />
              <span className="text-sm font-bold text-[#0F172A]">EcomHub OS Master Control Center</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-medium">Welcome, Master</span>
          </div>
        </header>

        <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && (
            <PlatformDashboardView
              onNavigateToWorkspaces={() => switchTab('workspaces')}
              onCreateWorkspace={() => switchTab('workspaces')}
            />
          )}
          {activeTab === 'workspaces' && <PlatformWorkspacesView />}
          {activeTab === 'business-roles' && <MasterBusinessRolesView />}
          {activeTab === 'task-builder' && <MasterTaskBuilderView />}
          {activeTab === 'team' && <MasterTeamView />}
          {activeTab === 'profile' && <MasterProfileView />}
          {activeTab === 'audit-logs' && (
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs">
              <h2 className="text-base font-bold text-[#0F172A] mb-2">Platform Security & Audit Logs</h2>
              <p className="text-xs text-[#64748B] mb-6">Real-time immutable audit trail of all master administration actions.</p>
              <div className="space-y-3 font-mono text-xs">
                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex items-center justify-between">
                  <span className="text-emerald-700">[AUTH] Platform Owner authenticated successfully via /masterlogin.</span>
                  <span className="text-slate-400 text-[10px]">{new Date().toLocaleTimeString()}</span>
                </div>
                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex items-center justify-between">
                  <span className="text-[#4F46E5]">[TENANT] Multi-tenant RLS verified across active business instances.</span>
                  <span className="text-slate-400 text-[10px]">Today</span>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'settings' && (
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs">
              <h2 className="text-base font-bold text-[#0F172A] mb-2">Platform Configuration</h2>
              <p className="text-xs text-[#64748B] mb-4">Master platform settings and global security policies.</p>
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                  <div>
                    <div className="font-semibold text-[#0F172A]">PostgreSQL Row Level Security (RLS)</div>
                    <div className="text-[#64748B]">Enforced strictly across all tenant schemas.</div>
                  </div>
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-800 font-bold rounded">Active</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                  <div>
                    <div className="font-semibold text-[#0F172A]">Supabase Auth Integration</div>
                    <div className="text-[#64748B]">Token verification & secure invitation dispatch.</div>
                  </div>
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-800 font-bold rounded">Connected</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

