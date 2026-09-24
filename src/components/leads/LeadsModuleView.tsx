import React, { useState, useMemo } from 'react';
import {
  Target,
  Plus,
  UploadCloud,
  Globe,
  LayoutGrid,
  Table as TableIcon,
  PhoneCall,
  Search,
  Filter,
  ArrowRightLeft,
  DollarSign,
  TrendingUp,
  UserCheck,
  Sparkles,
  Users,
  Smartphone,
} from 'lucide-react';
import { useCrm } from '../../lib/crm-context';
import { useAuth } from '../../lib/auth-context';
import { Lead, LeadStatus, LeadPriority } from '../../types';
import { LeadTableView } from './LeadTableView';
import { LeadKanbanBoard } from './LeadKanbanBoard';
import { ColdCallingWorkflowView } from './ColdCallingWorkflowView';
import { AgentPerformanceView } from './AgentPerformanceView';
import { LeadDetailWorkspace } from './LeadDetailWorkspace';
import { AddLeadModal } from './AddLeadModal';
import { CsvImportModal } from './CsvImportModal';
import { LeadCaptureApiModal } from './LeadCaptureApiModal';
import { CurrencyConverterModal } from '../common/CurrencyConverterModal';

interface LeadsModuleViewProps {
  initialLeadId?: string | null;
  onOpenClient?: (clientId: string) => void;
  onOpenLeadSettings?: () => void;
}

export const LeadsModuleView: React.FC<LeadsModuleViewProps> = ({
  initialLeadId,
  onOpenClient,
  onOpenLeadSettings,
}) => {
  const { leads, getExchangeRate } = useCrm();
  const { activeBusiness, members } = useAuth();

  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(initialLeadId || null);
  const [viewMode, setViewMode] = useState<'table' | 'kanban' | 'cold_calling' | 'agents'>('table');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [assignedFilter, setAssignedFilter] = useState<string>('ALL');
  const [agentFilter, setAgentFilter] = useState<string>('ALL');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showApiModal, setShowApiModal] = useState(false);
  const [showConverter, setShowConverter] = useState(false);

  // Unique Field Agents in CRM
  const uniqueAgents = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.agent_name && l.agent_name.trim()) {
        set.add(l.agent_name.trim());
      }
    });
    return Array.from(set).sort();
  }, [leads]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        l.name.toLowerCase().includes(q) ||
        (l.company && l.company.toLowerCase().includes(q)) ||
        (l.email && l.email.toLowerCase().includes(q)) ||
        (l.phone && l.phone.includes(q)) ||
        (l.agent_name && l.agent_name.toLowerCase().includes(q)) ||
        (l.service && l.service.toLowerCase().includes(q));

      const matchStatus = statusFilter === 'ALL' || l.status === statusFilter;
      const matchSource = sourceFilter === 'ALL' || l.source === sourceFilter;
      const matchPriority = priorityFilter === 'ALL' || l.priority === priorityFilter;
      const matchAssigned = assignedFilter === 'ALL' || l.assigned_to === assignedFilter;
      const matchAgent = agentFilter === 'ALL' || (l.agent_name && l.agent_name.trim() === agentFilter);

      return matchSearch && matchStatus && matchSource && matchPriority && matchAssigned && matchAgent;
    });
  }, [leads, searchQuery, statusFilter, sourceFilter, priorityFilter, assignedFilter, agentFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = leads.length;
    const newCount = leads.filter((l) => l.status === 'New').length;
    const wonCount = leads.filter((l) => l.status === 'Won').length;
    const inPipelineCount = leads.filter(
      (l) => l.status !== 'Won' && l.status !== 'Lost'
    ).length;

    // Pipeline Value normalized to USD
    const totalPipelineValueUSD = leads
      .filter((l) => l.status !== 'Lost')
      .reduce((sum, l) => {
        const val = Number(l.budget) || 0;
        if (l.currency === 'USD') return sum + val;
        return sum + val * getExchangeRate(l.currency, 'USD');
      }, 0);

    const conversionRate = total > 0 ? Math.round((wonCount / total) * 100) : 0;

    return {
      total,
      newCount,
      wonCount,
      inPipelineCount,
      totalPipelineValueUSD,
      conversionRate,
    };
  }, [leads, getExchangeRate]);

  // If a lead is currently selected, show the workspace view
  if (selectedLeadId) {
    return (
      <LeadDetailWorkspace
        leadId={selectedLeadId}
        onBack={() => setSelectedLeadId(null)}
        onOpenClient={onOpenClient}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              CRM Engine
            </span>
            <span className="text-[#94A3B8]">•</span>
            <span className="text-xs font-semibold text-[#4F46E5] bg-[#EEF2FF] px-2 py-0.5 rounded">
              Leads & Pipeline
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight mt-0.5">
            Prospects & Lead Management
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {onOpenLeadSettings && (
            <button
              onClick={onOpenLeadSettings}
              className="px-3 py-1.5 text-xs font-semibold text-[#4F46E5] hover:text-[#4338CA] bg-[#EEF2FF] border border-[#C7D2FE] hover:bg-[#E0E7FF] rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
              title="Agent lead entry link and agent management"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Agent Lead Form</span>
            </button>
          )}

          <button
            onClick={() => setShowConverter(true)}
            className="px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
            title="Convert currencies"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-[#4F46E5]" />
            <span>Currency Calculator</span>
          </button>

          <button
            onClick={() => setShowApiModal(true)}
            className="px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
            title="Lead Capture API documentation & live webhook tester"
          >
            <Globe className="w-3.5 h-3.5 text-[#4F46E5]" />
            <span>Website API</span>
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
            title="Import leads from CSV with duplicate detection"
          >
            <UploadCloud className="w-3.5 h-3.5 text-[#4F46E5]" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-xl shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs">
          <span className="text-xs text-[#64748B] block">Total Leads</span>
          <div className="text-2xl font-bold text-[#0F172A] mt-1 tracking-tight">
            {stats.total}
          </div>
          <p className="text-[11px] text-[#4F46E5] font-semibold mt-0.5">Active Tenant Inquiries</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs">
          <span className="text-xs text-[#64748B] block">New Inbound</span>
          <div className="text-2xl font-bold text-blue-600 mt-1 tracking-tight">
            {stats.newCount}
          </div>
          <p className="text-[11px] text-[#64748B] mt-0.5">Awaiting first outreach</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs">
          <span className="text-xs text-[#64748B] block">Active Pipeline</span>
          <div className="text-2xl font-bold text-[#0F172A] mt-1 tracking-tight">
            {stats.inPipelineCount}
          </div>
          <p className="text-[11px] text-[#64748B] mt-0.5">In qualification / meetings</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs">
          <span className="text-xs text-[#64748B] block">Pipeline Value</span>
          <div className="text-xl font-bold text-[#0F172A] mt-1 tracking-tight truncate">
            ${Math.round(stats.totalPipelineValueUSD).toLocaleString()}{' '}
            <span className="text-xs font-normal text-[#64748B]">USD</span>
          </div>
          <p className="text-[11px] text-[#64748B] mt-0.5">
            ≈ PKR {Math.round(stats.totalPipelineValueUSD * getExchangeRate('USD', 'PKR')).toLocaleString()}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs col-span-2 lg:col-span-1">
          <span className="text-xs text-[#64748B] block">Won & Converted</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1 tracking-tight">
            {stats.wonCount}{' '}
            <span className="text-xs font-semibold text-[#64748B]">({stats.conversionRate}%)</span>
          </div>
          <p className="text-[11px] text-[#64748B] mt-0.5">Converted to active clients</p>
        </div>
      </div>

      {/* View Switcher & Filters */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* View Modes */}
          <div className="flex items-center gap-1 bg-[#F8FAFC] p-1 rounded-xl border border-[#E2E8F0]">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === 'table'
                  ? 'bg-white text-[#0F172A] shadow-2xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5 text-[#4F46E5]" />
              <span>Table</span>
            </button>

            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === 'kanban'
                  ? 'bg-white text-[#0F172A] shadow-2xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-[#4F46E5]" />
              <span>Pipeline Kanban</span>
            </button>

            <button
              onClick={() => setViewMode('cold_calling')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === 'cold_calling'
                  ? 'bg-white text-[#0F172A] shadow-2xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <PhoneCall className="w-3.5 h-3.5 text-[#4F46E5]" />
              <span>Cold Calling Outreach</span>
            </button>

            <button
              onClick={() => setViewMode('agents')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === 'agents'
                  ? 'bg-white text-[#0F172A] shadow-2xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-[#4F46E5]" />
              <span>Agent Performance</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search leads by name, company, email..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#4F46E5]"
            />
          </div>
        </div>

        {/* Filter Selectors (Only shown in Table and Kanban views) */}
        {viewMode !== 'cold_calling' && (
          <div className="pt-2 border-t border-[#F1F5F9] flex items-center gap-2 flex-wrap text-xs">
            <span className="text-[11px] font-semibold text-[#64748B] flex items-center gap-1">
              <Filter className="w-3 h-3 text-[#4F46E5]" /> Filters:
            </span>

            {/* Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#0F172A] focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              {['New', 'Contacted', 'Qualified', 'Meeting', 'Proposal', 'Negotiation', 'Won', 'Lost'].map(
                (st) => (
                  <option key={st} value={st}>
                    Status: {st}
                  </option>
                )
              )}
            </select>

            {/* Source */}
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-2.5 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#0F172A] focus:outline-none"
            >
              <option value="ALL">All Sources</option>
              {['Agent', 'Website', 'Cold Call', 'LinkedIn', 'Referral', 'Import', 'Ads', 'Organic'].map((src) => (
                <option key={src} value={src}>
                  Source: {src}
                </option>
              ))}
            </select>

            {/* Agent Filter */}
            {uniqueAgents.length > 0 && (
              <select
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value)}
                className="px-2.5 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#0F172A] focus:outline-none"
              >
                <option value="ALL">All Field Agents</option>
                {uniqueAgents.map((ag) => (
                  <option key={ag} value={ag}>
                    Agent: {ag}
                  </option>
                ))}
              </select>
            )}

            {/* Priority */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-2.5 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#0F172A] focus:outline-none"
            >
              <option value="ALL">All Priorities</option>
              {['Urgent', 'High', 'Medium', 'Low'].map((pr) => (
                <option key={pr} value={pr}>
                  Priority: {pr}
                </option>
              ))}
            </select>

            {/* Assigned Specialist */}
            <select
              value={assignedFilter}
              onChange={(e) => setAssignedFilter(e.target.value)}
              className="px-2.5 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#0F172A] focus:outline-none"
            >
              <option value="ALL">All Specialists</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.profile?.full_name || m.profile?.email}
                </option>
              ))}
            </select>

            {(statusFilter !== 'ALL' ||
              sourceFilter !== 'ALL' ||
              priorityFilter !== 'ALL' ||
              assignedFilter !== 'ALL' ||
              agentFilter !== 'ALL' ||
              searchQuery) && (
              <button
                onClick={() => {
                  setStatusFilter('ALL');
                  setSourceFilter('ALL');
                  setPriorityFilter('ALL');
                  setAssignedFilter('ALL');
                  setAgentFilter('ALL');
                  setSearchQuery('');
                }}
                className="text-[11px] text-[#4F46E5] hover:underline ml-auto"
              >
                Reset Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Active View Mode Renderer */}
      {viewMode === 'table' && (
        <LeadTableView
          leads={filteredLeads}
          onSelectLead={(id) => setSelectedLeadId(id)}
        />
      )}

      {viewMode === 'kanban' && (
        <LeadKanbanBoard
          leads={filteredLeads}
          onSelectLead={(id) => setSelectedLeadId(id)}
        />
      )}

      {viewMode === 'cold_calling' && (
        <ColdCallingWorkflowView
          onSelectLead={(id) => setSelectedLeadId(id)}
        />
      )}

      {viewMode === 'agents' && (
        <AgentPerformanceView
          leads={leads}
          onSelectAgentFilter={(ag) => {
            setAgentFilter(ag);
            setViewMode('table');
          }}
          onOpenLeadSettings={onOpenLeadSettings}
        />
      )}

      {/* Modals */}
      <AddLeadModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onLeadAdded={(id) => setSelectedLeadId(id)}
      />

      <CsvImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
      />

      <LeadCaptureApiModal
        isOpen={showApiModal}
        onClose={() => setShowApiModal(false)}
      />

      <CurrencyConverterModal
        isOpen={showConverter}
        onClose={() => setShowConverter(false)}
      />
    </div>
  );
};
