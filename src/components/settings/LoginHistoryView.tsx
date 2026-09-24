import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  History,
  Shield,
  Clock,
  Users,
  Search,
  Filter,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Laptop,
  ArrowUpDown,
  Lock,
  Calendar,
  Activity,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { usePermissions } from '../../lib/use-permissions';
import {
  UserSession,
  BusinessRole,
  ActiveNavSection,
} from '../../types';
import {
  getBusinessSessions,
  calculateSessionMetrics,
  getActiveOnlineUsers,
  getSessionStatus,
  formatLoginTime,
  formatDurationMs,
} from '../../lib/session-service';

interface LoginHistoryViewProps {
  onNavigate?: (section: ActiveNavSection) => void;
  targetUserId?: string; // Optional: filter to specific member
}

export const LoginHistoryView: React.FC<LoginHistoryViewProps> = ({
  onNavigate,
  targetUserId,
}) => {
  const { user, activeBusiness, members } = useAuth();
  const { can } = usePermissions();

  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedDateRange, setSelectedDateRange] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [selectedMemberId, setSelectedMemberId] = useState<string>(targetUserId || 'ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Authorization check: Owner, Admin, and Finance
  const isAuthorized = activeBusiness?.role === 'Owner' || activeBusiness?.role === 'Admin' || activeBusiness?.role === 'Finance' || can('team_roles.view');

  const loadSessions = useCallback(async () => {
    if (!activeBusiness?.id) return;
    setIsLoading(true);
    try {
      const data = await getBusinessSessions(activeBusiness.id);
      setSessions(data);
    } catch (e) {
      console.error('Failed to load sessions:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeBusiness?.id]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadSessions();
  };

  // Metrics calculated across all sessions of this business
  const metrics = useMemo(() => {
    return calculateSessionMetrics(sessions);
  }, [sessions]);

  // Active online members
  const onlineUsers = useMemo(() => {
    return getActiveOnlineUsers(sessions, user?.id);
  }, [sessions, user?.id]);

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      // Member Filter
      if (selectedMemberId !== 'ALL' && s.user_id !== selectedMemberId) {
        return false;
      }

      // Role Filter
      if (selectedRole !== 'ALL' && s.user_role !== selectedRole) {
        return false;
      }

      // Status Filter
      const { status } = getSessionStatus(s);
      if (selectedStatus !== 'ALL' && status.toUpperCase() !== selectedStatus.toUpperCase()) {
        return false;
      }

      // Date Range Filter
      if (selectedDateRange !== 'all') {
        const sessionTime = new Date(s.session_started_at).getTime();
        const now = Date.now();
        if (selectedDateRange === 'today') {
          const oneDayAgo = now - 24 * 60 * 60 * 1000;
          if (sessionTime < oneDayAgo) return false;
        } else if (selectedDateRange === '7days') {
          const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
          if (sessionTime < sevenDaysAgo) return false;
        } else if (selectedDateRange === '30days') {
          const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
          if (sessionTime < thirtyDaysAgo) return false;
        }
      }

      // Text Search (name, email, IP, browser)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (s.user_profile?.full_name || '').toLowerCase();
        const email = (s.user_profile?.email || '').toLowerCase();
        const ip = (s.ip_address || '').toLowerCase();
        const ua = (s.user_agent || '').toLowerCase();
        return name.includes(q) || email.includes(q) || ip.includes(q) || ua.includes(q);
      }

      return true;
    });
  }, [sessions, selectedMemberId, selectedRole, selectedStatus, selectedDateRange, searchQuery]);

  // Paginated records
  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / pageSize));
  const paginatedSessions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSessions.slice(start, start + pageSize);
  }, [filteredSessions, currentPage]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredSessions.length === 0) return;

    const headers = [
      'Session ID',
      'User Name',
      'User Email',
      'Role',
      'Session Started At',
      'Last Seen At',
      'Session Ended At',
      'Duration (Minutes)',
      'Status',
      'End Reason',
      'IP Address',
      'User Agent',
    ];

    const rows = filteredSessions.map((s) => {
      const { status, durationMs } = getSessionStatus(s);
      return [
        `"${s.id}"`,
        `"${s.user_profile?.full_name || 'Team Member'}"`,
        `"${s.user_profile?.email || ''}"`,
        `"${s.user_role || 'Employee'}"`,
        `"${s.session_started_at}"`,
        `"${s.last_seen_at}"`,
        `"${s.session_ended_at || ''}"`,
        Math.round(durationMs / 60000),
        `"${status}"`,
        `"${s.end_reason || ''}"`,
        `"${s.ip_address || ''}"`,
        `"${(s.user_agent || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `ecomhub-login-history-${activeBusiness?.name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // If unauthorized, show explicit security notice
  if (!isAuthorized) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 max-w-xl mx-auto my-12 text-center shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-[#0F172A]">Access Restricted</h2>
        <p className="text-xs text-[#64748B] mt-2 leading-relaxed">
          The User Session Audit & Login History log is restricted to business <strong>Owners</strong> and <strong>Administrators</strong>. Your role is <strong>{activeBusiness?.role || 'Employee'}</strong>.
        </p>
        {onNavigate && (
          <button
            onClick={() => onNavigate('dashboard')}
            className="mt-6 px-4 py-2 text-xs font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-xl transition-colors"
          >
            Return to Dashboard
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#4F46E5] bg-indigo-50 px-2.5 py-0.5 rounded-full">
              Security & Compliance Audit
            </span>
            <span className="text-xs text-[#94A3B8]">•</span>
            <span className="text-xs text-[#64748B] flex items-center gap-1 font-medium">
              <Shield className="w-3.5 h-3.5 text-[#4F46E5]" />
              Tenant Scope: {activeBusiness?.name}
            </span>
          </div>
          <h1 className="text-xl font-black text-[#0F172A] tracking-tight mt-1">
            Login History & Session Audit
          </h1>
          <p className="text-xs text-[#64748B]">
            Track authenticated user sessions, active online members, session durations, and security heartbeats.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#475569] hover:text-[#0F172A] bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl transition-colors"
            title="Refresh login history"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#4F46E5]' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={filteredSessions.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#0F172A] hover:bg-slate-800 rounded-xl shadow-xs transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Online Sessions */}
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B]">Currently Online</span>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#0F172A]">
              {metrics.activeSessionsCount}
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
              Live
            </span>
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-1">
            Active within past 15 min
          </p>
        </div>

        {/* Total Sessions */}
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B]">Total Sessions</span>
            <History className="w-4 h-4 text-[#4F46E5]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#0F172A]">
              {metrics.totalSessions}
            </span>
            <span className="text-[11px] text-[#64748B]">recorded</span>
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-1">
            Across active business members
          </p>
        </div>

        {/* Total Login Time */}
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B]">Total Login Time</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#0F172A]">
              {metrics.totalLoginTimeFormatted}
            </span>
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-1">
            Accumulated member hours
          </p>
        </div>

        {/* Average Session Duration */}
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B]">Avg Session Time</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#0F172A]">
              {metrics.averageSessionDurationFormatted}
            </span>
            <span className="text-[11px] text-[#64748B]">per session</span>
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-1">
            First login: {metrics.firstLoginAt ? new Date(metrics.firstLoginAt).toLocaleDateString() : 'N/A'}
          </p>
        </div>
      </div>

      {/* Currently Logged-in Users Strip */}
      <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-sm font-bold text-[#0F172A]">
              Currently Logged-in Users ({onlineUsers.length})
            </h3>
          </div>
          <span className="text-xs text-[#64748B]">
            Updated via real-time heartbeat
          </span>
        </div>

        {onlineUsers.length === 0 ? (
          <div className="py-4 text-center text-xs text-[#94A3B8]">
            No members are currently active in this business workspace.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {onlineUsers.map((item) => (
              <div
                key={item.session.id}
                className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/40 flex items-center justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-[#4F46E5] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      {item.profile.full_name?.slice(0, 2).toUpperCase() || 'US'}
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-[#0F172A] truncate">
                        {item.profile.full_name || 'Team Member'}
                      </p>
                      {item.isCurrentUser && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-100 text-[#4F46E5]">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#64748B] truncate">
                      {item.profile.email}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white border border-emerald-200 text-emerald-800">
                    {item.role}
                  </span>
                  <p className="text-[10px] text-emerald-700 mt-1">
                    {item.lastSeenMinutesAgo === 0 ? 'Active just now' : `Active ${item.lastSeenMinutesAgo}m ago`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Search Box */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by user name, email, IP..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-[#E2E8F0] rounded-xl text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
            />
          </div>

          {/* Member Filter */}
          <div>
            <select
              value={selectedMemberId}
              onChange={(e) => {
                setSelectedMemberId(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-xl text-[#0F172A] bg-white focus:outline-none focus:border-[#4F46E5]"
            >
              <option value="ALL">All Team Members</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.profile?.full_name || m.profile?.email || m.user_id} ({m.role})
                </option>
              ))}
            </select>
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-xl text-[#0F172A] bg-white focus:outline-none focus:border-[#4F46E5]"
            >
              <option value="ALL">All Roles</option>
              <option value="Owner">Owner</option>
              <option value="Admin">Admin</option>
              <option value="Manager">Manager</option>
              <option value="Finance">Finance</option>
              <option value="Sales">Sales</option>
              <option value="Employee">Employee</option>
              <option value="Viewer">Viewer</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-xl text-[#0F172A] bg-white focus:outline-none focus:border-[#4F46E5]"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Currently Active</option>
              <option value="ENDED">Ended (Logged Out)</option>
              <option value="INACTIVE">Inactive / Expired</option>
            </select>
          </div>
        </div>

        {/* Date Filter Badges */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#F1F5F9]">
          <span className="text-[11px] font-semibold text-[#64748B] mr-2 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-[#94A3B8]" />
            Date Period:
          </span>
          {(['all', 'today', '7days', '30days'] as const).map((range) => (
            <button
              key={range}
              onClick={() => {
                setSelectedDateRange(range);
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                selectedDateRange === range
                  ? 'bg-[#EEF2FF] text-[#4F46E5] border border-indigo-200'
                  : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
              }`}
            >
              {range === 'all' && 'All Time'}
              {range === 'today' && 'Today (24h)'}
              {range === '7days' && 'Last 7 Days'}
              {range === '30days' && 'Last 30 Days'}
            </button>
          ))}
          <span className="ml-auto text-[11px] text-[#94A3B8]">
            Showing {filteredSessions.length} sessions
          </span>
        </div>
      </div>

      {/* Main Login History Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Login Time</th>
                <th className="py-3 px-4">Last Activity</th>
                <th className="py-3 px-4">Logout / End Time</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Client / IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#94A3B8]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-[#4F46E5]" />
                      <span>Loading user session audit logs...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedSessions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#94A3B8]">
                    No sessions match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedSessions.map((session) => {
                  const { status, label, durationFormatted } = getSessionStatus(session);
                  const userName = session.user_profile?.full_name || 'Team Member';
                  const userEmail = session.user_profile?.email || 'N/A';
                  const role = session.user_role || 'Employee';

                  return (
                    <tr key={session.id} className="hover:bg-[#F8FAFC] transition-colors">
                      {/* User */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#4F46E5] text-white flex items-center justify-center font-bold text-[11px] shrink-0 shadow-2xs">
                            {userName.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-[#0F172A] truncate">
                              {userName}
                            </p>
                            <p className="text-[11px] text-[#64748B] truncate">
                              {userEmail}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-[#475569] border border-slate-200">
                          {role}
                        </span>
                      </td>

                      {/* Login Time */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-medium text-[#0F172A]">
                          {formatLoginTime(session.session_started_at)}
                        </span>
                      </td>

                      {/* Last Activity */}
                      <td className="py-3 px-4 whitespace-nowrap text-[#64748B]">
                        {formatLoginTime(session.last_seen_at)}
                      </td>

                      {/* Logout / End Time */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {session.session_ended_at ? (
                          <span className="text-[#64748B] flex items-center gap-1">
                            <LogOut className="w-3 h-3 text-[#94A3B8]" />
                            {formatLoginTime(session.session_ended_at)}
                          </span>
                        ) : status === 'Active' ? (
                          <span className="text-emerald-600 font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Currently Online
                          </span>
                        ) : (
                          <span className="text-[#94A3B8] italic">— (Timed out)</span>
                        )}
                      </td>

                      {/* Duration */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold text-[#0F172A]">
                          {durationFormatted}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {status === 'Active' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            Active
                          </span>
                        ) : status === 'Ended' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            <CheckCircle2 className="w-3 h-3 text-slate-500" />
                            Ended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Client / IP */}
                      <td className="py-3 px-4 max-w-[180px] truncate text-[11px] text-[#64748B]">
                        <span title={session.user_agent || 'Web Browser'}>
                          {session.ip_address ? `${session.ip_address} • ` : ''}
                          {session.user_agent?.includes('Chrome')
                            ? 'Chrome'
                            : session.user_agent?.includes('Safari')
                            ? 'Safari'
                            : session.user_agent?.includes('Firefox')
                            ? 'Firefox'
                            : 'Web Browser'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between text-xs">
            <span className="text-[#64748B]">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC] disabled:opacity-40 flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC] disabled:opacity-40 flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
