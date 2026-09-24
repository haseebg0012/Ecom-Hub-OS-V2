import React, { useState, useMemo, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import {
  Building2,
  Plus,
  Search,
  ArrowRightLeft,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';
import { useCrm } from '../../lib/crm-context';
import { useAuth } from '../../lib/auth-context';
import { Client, ClientStatus } from '../../types';
import { ClientDetailWorkspace } from './ClientDetailWorkspace';
import { AddClientModal } from './AddClientModal';
import { CurrencyConverterModal } from '../common/CurrencyConverterModal';

interface ErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Defensive Error Boundary to protect Clients page from any runtime render crashes
 */
class ClientsErrorBoundary extends (React.Component as any)<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState;
  props: ErrorBoundaryProps;
  setState: any;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ClientsErrorBoundary caught an error:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 my-6 max-w-2xl mx-auto bg-white rounded-2xl border border-rose-200 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">Something went wrong loading Clients</h2>
            <p className="text-xs text-[#64748B] mt-1 max-w-md mx-auto">
              An unexpected error occurred while rendering the client workspace. Your data is safe.
            </p>
            {this.state.error && (
              <p className="mt-2 text-[11px] font-mono text-rose-700 bg-rose-50 p-2 rounded-lg inline-block max-w-full overflow-x-auto text-left">
                {this.state.error.message}
              </p>
            )}
          </div>
          <div>
            <button
              onClick={this.handleReset}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry / Reload Clients</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export interface ClientsModuleViewProps {
  initialClientId?: string | null;
  onSelectClient?: (clientId: string | null) => void;
  onOpenLead?: (leadId: string) => void;
}

const ClientsModuleInner: React.FC<ClientsModuleViewProps> = ({
  initialClientId,
  onSelectClient,
  onOpenLead,
}) => {
  const {
    clients = [],
    contacts = [],
    clientContacts = [],
    getExchangeRate,
    isLoading = false,
    error: crmError = null,
    refreshCrmData,
  } = useCrm();
  const { activeBusiness, members = [] } = useAuth();

  const [selectedClientId, setSelectedClientId] = useState<string | null>(initialClientId || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConverter, setShowConverter] = useState(false);

  // Synchronize state when initialClientId prop changes (e.g., browser back/forward or route change)
  useEffect(() => {
    if (initialClientId !== undefined) {
      setSelectedClientId(initialClientId || null);
    }
  }, [initialClientId]);

  // Combine contacts aliases safely
  const allContacts = useMemo(() => {
    if (contacts && contacts.length > 0) return contacts;
    if (clientContacts && clientContacts.length > 0) return clientContacts;
    return [];
  }, [contacts, clientContacts]);

  // Handle client selection with URL synchronization callback
  const handleSelectClient = (clientId: string | null) => {
    setSelectedClientId(clientId);
    if (onSelectClient) {
      onSelectClient(clientId);
    }
  };

  // Filtered Clients list with robust null guards
  const filteredClients = useMemo(() => {
    if (!Array.isArray(clients)) return [];

    return clients.filter((c) => {
      if (!c) return false;
      const q = (searchQuery || '').toLowerCase().trim();

      const companyName = (c.company_name || '').toLowerCase();
      const industry = (c.industry || '').toLowerCase();
      const email = (c.email || (c as any).billing_email || '').toLowerCase();

      const matchSearch =
        !q ||
        companyName.includes(q) ||
        industry.includes(q) ||
        email.includes(q);

      const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [clients, searchQuery, statusFilter]);

  // Statistics calculation with full defensive fallbacks
  const stats = useMemo(() => {
    const list = Array.isArray(clients) ? clients.filter(Boolean) : [];
    const total = list.length;
    const activeCount = list.filter((c) => c.status === 'Active').length;
    const onboardingCount = list.filter((c) => c.status === 'Onboarding').length;

    // Total Lifetime Revenue normalized to USD
    const totalRevenueUSD = list.reduce((sum, c) => {
      const rev = Number(c.total_revenue) || 0;
      const curr = c.preferred_currency || 'USD';
      if (curr === 'USD') return sum + rev;

      const rate = typeof getExchangeRate === 'function' ? getExchangeRate(curr, 'USD') : 1;
      return sum + rev * (rate > 0 ? rate : 1);
    }, 0);

    const usdToPkrRate = typeof getExchangeRate === 'function' ? getExchangeRate('USD', 'PKR') : 278;

    return {
      total,
      activeCount,
      onboardingCount,
      totalRevenueUSD,
      usdToPkrRate,
    };
  }, [clients, getExchangeRate]);

  // 1. Detail Workspace View
  if (selectedClientId) {
    return (
      <ClientDetailWorkspace
        clientId={selectedClientId}
        onBack={() => handleSelectClient(null)}
        onOpenLead={onOpenLead}
      />
    );
  }

  // 2. Loading State (Skeleton)
  if (isLoading && (!clients || clients.length === 0)) {
    return (
      <div className="space-y-6 animate-pulse" id="clients-loading-skeleton">
        <div className="flex justify-between items-center pb-4 border-b border-[#E2E8F0]">
          <div className="h-8 w-64 bg-slate-200 rounded-xl"></div>
          <div className="flex gap-2">
            <div className="h-8 w-32 bg-slate-200 rounded-xl"></div>
            <div className="h-8 w-28 bg-slate-200 rounded-xl"></div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-white rounded-xl border border-[#E2E8F0] p-4">
              <div className="h-3 w-20 bg-slate-200 rounded mb-2"></div>
              <div className="h-6 w-12 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
        <div className="h-12 bg-white rounded-xl border border-[#E2E8F0]"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 bg-white rounded-2xl border border-[#E2E8F0] p-5"></div>
          ))}
        </div>
      </div>
    );
  }

  const getStatusBadge = (st: ClientStatus | string) => {
    switch (st) {
      case 'Active':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Onboarding':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Paused':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Inactive':
      case 'Archived':
      case 'Churned':
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="space-y-6" id="clients-module-view">
      {/* Optional Error Banner */}
      {crmError && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Notice: {crmError}</span>
          </div>
          {refreshCrmData && (
            <button
              onClick={() => refreshCrmData()}
              className="font-semibold underline hover:text-amber-900"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Client Directory
            </span>
            <span className="text-[#94A3B8]">•</span>
            <span className="text-xs font-semibold text-[#4F46E5] bg-[#EEF2FF] px-2 py-0.5 rounded">
              Accounts & Retainers
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight mt-0.5">
            Client Accounts & Workspaces
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="open-currency-converter-btn"
            onClick={() => setShowConverter(true)}
            className="px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-[#4F46E5]" />
            <span>Currency Calculator</span>
          </button>

          <button
            id="add-client-btn"
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-xl shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Client</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" id="clients-stats-grid">
        <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs">
          <span className="text-xs text-[#64748B] block">Total Accounts</span>
          <div className="text-2xl font-bold text-[#0F172A] mt-1 tracking-tight">
            {stats.total}
          </div>
          <p className="text-[11px] text-[#4F46E5] font-semibold mt-0.5">
            {activeBusiness?.name || 'Active Workspace'}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs">
          <span className="text-xs text-[#64748B] block">Active Retainers</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1 tracking-tight">
            {stats.activeCount}
          </div>
          <p className="text-[11px] text-[#64748B] mt-0.5">Generating recurring revenue</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs">
          <span className="text-xs text-[#64748B] block">In Onboarding</span>
          <div className="text-2xl font-bold text-blue-600 mt-1 tracking-tight">
            {stats.onboardingCount}
          </div>
          <p className="text-[11px] text-[#64748B] mt-0.5">Sprint launch underway</p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs">
          <span className="text-xs text-[#64748B] block">Portfolio Revenue</span>
          <div className="text-xl font-bold text-[#0F172A] mt-1 tracking-tight truncate">
            ${Math.round(stats.totalRevenueUSD).toLocaleString()}{' '}
            <span className="text-xs font-normal text-[#64748B]">USD</span>
          </div>
          <p className="text-[11px] text-[#64748B] mt-0.5">
            ≈ PKR {Math.round(stats.totalRevenueUSD * stats.usdToPkrRate).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="clients-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clients by name, industry, email..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#4F46E5]"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#64748B]">Status:</span>
          <select
            id="clients-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none"
          >
            <option value="ALL">All Clients</option>
            <option value="Active">Active</option>
            <option value="Onboarding">Onboarding</option>
            <option value="Paused">Paused</option>
            <option value="Churned">Churned</option>
          </select>
        </div>
      </div>

      {/* Clients Grid or Empty States */}
      {clients.length === 0 ? (
        // Clean Initial Empty State
        <div
          id="clients-empty-state"
          className="p-12 text-center bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs space-y-4 max-w-md mx-auto my-6"
        >
          <div className="w-14 h-14 rounded-2xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center mx-auto">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#0F172A]">No clients yet</h3>
            <p className="text-xs text-[#64748B] mt-1">
              Add your first client to start managing customer accounts, retainers, and multi-currency invoicing.
            </p>
          </div>
          <div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Your First Client</span>
            </button>
          </div>
        </div>
      ) : filteredClients.length === 0 ? (
        // Search Empty State
        <div
          id="clients-search-empty-state"
          className="col-span-full py-16 text-center text-xs text-[#64748B] bg-white rounded-2xl border border-[#E2E8F0] space-y-3"
        >
          <FolderOpen className="w-8 h-8 text-[#94A3B8] mx-auto" />
          <p className="font-semibold text-[#0F172A]">No client records matched your criteria.</p>
          <p className="text-[11px] text-[#64748B]">Try searching with a different term or reset the status filter.</p>
          <div>
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
              }}
              className="px-3 py-1.5 text-xs font-semibold text-[#4F46E5] bg-[#EEF2FF] hover:bg-[#E0E7FF] rounded-xl transition-colors"
            >
              Clear filters
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="clients-card-grid">
          {filteredClients.map((client) => {
            const clientContactList = allContacts.filter((c) => c && c.client_id === client.id);
            const primaryContact = clientContactList.find((c) => c.is_primary) || clientContactList[0];
            const managerId = client.account_manager_id || client.assigned_to;
            const manager = members.find((m) => m && m.user_id === managerId);

            const displayInitials = (client.company_name || 'CL')
              .trim()
              .substring(0, 2)
              .toUpperCase();

            const currency = client.preferred_currency || 'PKR';
            const revenue = Number(client.total_revenue) || 0;

            return (
              <div
                key={client.id}
                id={`client-card-${client.id}`}
                onClick={() => handleSelectClient(client.id)}
                className="p-5 bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden hover:border-[#4F46E5]/50 hover:shadow-md transition-all cursor-pointer space-y-4 flex flex-col justify-between group"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center font-bold text-sm shrink-0">
                        {displayInitials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-sm text-[#0F172A] group-hover:text-[#4F46E5] transition-colors truncate">
                          {client.company_name || 'Untitled Client'}
                        </h3>
                        {client.industry && (
                          <p className="text-[11px] text-[#64748B] truncate">
                            {client.industry}
                          </p>
                        )}
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold border shrink-0 whitespace-nowrap ${getStatusBadge(
                        client.status
                      )}`}
                    >
                      {client.status || 'Active'}
                    </span>
                  </div>

                  {/* Primary contact preview */}
                  {primaryContact && (
                    <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs space-y-1">
                      <div className="flex items-center justify-between font-semibold text-[#0F172A]">
                        <span className="truncate">{primaryContact.name}</span>
                        <span className="text-[10px] text-[#64748B] shrink-0 ml-2">
                          {primaryContact.position || (primaryContact as any).role || 'Contact'}
                        </span>
                      </div>
                      {primaryContact.email && (
                        <p className="text-[11px] text-[#64748B] truncate">{primaryContact.email}</p>
                      )}
                    </div>
                  )}

                  {manager && (
                    <div className="text-[11px] text-[#64748B]">
                      Lead:{' '}
                      <span className="font-medium text-[#0F172A]">
                        {manager.profile?.full_name || manager.profile?.email || 'Assigned'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-[#94A3B8] block">Lifetime Revenue</span>
                    <span className="font-bold text-[#0F172A]">
                      {currency} {revenue.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 font-semibold text-[#4F46E5] group-hover:translate-x-0.5 transition-transform">
                    <span>Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <AddClientModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onClientAdded={(id) => handleSelectClient(id)}
      />

      <CurrencyConverterModal
        isOpen={showConverter}
        onClose={() => setShowConverter(false)}
      />
    </div>
  );
};

export const ClientsModuleView: React.FC<ClientsModuleViewProps> = (props) => {
  return (
    <ClientsErrorBoundary>
      <ClientsModuleInner {...props} />
    </ClientsErrorBoundary>
  );
};

export default ClientsModuleView;
