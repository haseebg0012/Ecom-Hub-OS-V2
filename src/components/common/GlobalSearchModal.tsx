import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, X, Target, Users, ArrowRight, CornerDownLeft, Sparkles, Building2, FileText, CreditCard } from 'lucide-react';
import { useCrm } from '../../lib/crm-context';
import { useFinance } from '../../lib/finance-context';
import { ActiveNavSection } from '../../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (section: ActiveNavSection, entityId?: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const { leads, clients } = useCrm();
  const { invoices } = useFinance();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Search Results aggregation
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Default quick actions / recent
      return [
        { type: 'nav', id: 'leads', title: 'Open Leads Pipeline', subtitle: 'View all prospects and kanban board', icon: Target, section: 'leads' as ActiveNavSection },
        { type: 'nav', id: 'clients', title: 'Open Clients Directory', subtitle: 'View client organizations and accounts', icon: Users, section: 'clients' as ActiveNavSection },
        { type: 'nav', id: 'dashboard', title: 'Go to Business Dashboard', subtitle: 'Overview metrics & recent activities', icon: Sparkles, section: 'dashboard' as ActiveNavSection },
      ];
    }

    const items: Array<{
      type: 'lead' | 'client' | 'nav';
      id: string;
      title: string;
      subtitle: string;
      badge?: string;
      icon: any;
      section: ActiveNavSection;
      entityId?: string;
    }> = [];

    // Search Leads
    leads.forEach((l) => {
      const match =
        l.name.toLowerCase().includes(q) ||
        (l.company && l.company.toLowerCase().includes(q)) ||
        (l.email && l.email.toLowerCase().includes(q)) ||
        (l.phone && l.phone.includes(q)) ||
        (l.service && l.service.toLowerCase().includes(q)) ||
        l.status.toLowerCase().includes(q);

      if (match) {
        items.push({
          type: 'lead',
          id: l.id,
          title: l.name,
          subtitle: `${l.company ? `${l.company} • ` : ''}${l.service || 'Prospect'} (${l.source})`,
          badge: l.status,
          icon: Target,
          section: 'leads',
          entityId: l.id,
        });
      }
    });

    // Search Clients
    clients.forEach((c) => {
      const match =
        c.company_name.toLowerCase().includes(q) ||
        (c.contact_person && c.contact_person.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.industry && c.industry.toLowerCase().includes(q));

      if (match) {
        items.push({
          type: 'client',
          id: c.id,
          title: c.company_name,
          subtitle: `${c.contact_person ? `${c.contact_person} • ` : ''}${c.industry || 'Client Organization'}`,
          badge: c.status,
          icon: Building2,
          section: 'clients',
          entityId: c.id,
        });
      }
    });

    // Modules search
    const modules: { name: string; desc: string; section: ActiveNavSection }[] = [
      { name: 'Leads', desc: 'Prospects, pipeline & follow-ups', section: 'leads' },
      { name: 'Clients', desc: 'Organizations & contacts directory', section: 'clients' },
      { name: 'Projects', desc: 'Deliverables & budgets', section: 'projects' },
      { name: 'Finance', desc: 'Invoices, transactions & multi-currency', section: 'finance' },
      { name: 'Tasks', desc: 'Operational assignments & checklists', section: 'tasks' },
      { name: 'Team Members & Roles', desc: 'Staff directory, permissions & system roles', section: 'team-members-roles' },
      { name: 'Database Schema & RLS', desc: 'Architecture, migrations & security', section: 'database-schema' },
    ];

    modules.forEach((m) => {
      if (m.name.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q)) {
        items.push({
          type: 'nav',
          id: `nav-${m.section}`,
          title: m.name,
          subtitle: m.desc,
          icon: ArrowRight,
          section: m.section,
        });
      }
    });

    // Search Invoices
    invoices.forEach((inv) => {
      const client = clients.find((c) => c.id === inv.client_id);
      const match =
        inv.invoice_number.toLowerCase().includes(q) ||
        (client && client.company_name.toLowerCase().includes(q)) ||
        (inv.notes && inv.notes.toLowerCase().includes(q)) ||
        inv.status.toLowerCase().includes(q);

      if (match) {
        items.push({
          type: 'client' as any,
          id: inv.id,
          title: `Invoice ${inv.invoice_number}`,
          subtitle: `${client?.company_name || 'Client'} • ${inv.currency} ${(inv.total_amount || 0).toLocaleString()} (${inv.status})`,
          badge: inv.status,
          icon: FileText,
          section: 'finance',
          entityId: inv.id,
        });
      }
    });

    return items;
  }, [query, leads, clients, invoices]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const handleSelect = (item: typeof results[0]) => {
    onNavigate(item.section, item.entityId);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < results.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl w-full max-w-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-[#E2E8F0]">
          <Search className="w-5 h-5 text-[#64748B] shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search leads, clients, companies, or modules..."
            className="w-full bg-transparent text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none font-medium"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-[#94A3B8] hover:text-[#0F172A] rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 ml-2 text-[10px] font-mono text-[#64748B] bg-[#F1F5F9] border border-[#E2E8F0] rounded">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-slate-100">
          {results.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#64748B]">
              No matching records found for "{query}".
            </div>
          ) : (
            results.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#EEF2FF]' : 'hover:bg-[#F8FAFC]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        item.type === 'lead'
                          ? 'bg-[#EEF2FF] text-[#4F46E5]'
                          : item.type === 'client'
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-[#F1F5F9] text-[#64748B]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#0F172A] truncate">
                          {item.title}
                        </span>
                        {item.badge && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white border border-[#E2E8F0] text-[#4F46E5]">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#64748B] truncate mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 text-[#94A3B8] ml-2">
                    {isSelected && (
                      <span className="hidden sm:inline-flex items-center text-[10px] text-[#4F46E5] font-medium gap-1">
                        Select <CornerDownLeft className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between text-[11px] text-[#64748B]">
          <span>
            Press <kbd className="font-mono bg-white px-1 py-0.5 rounded border border-[#E2E8F0]">↑</kbd>{' '}
            <kbd className="font-mono bg-white px-1 py-0.5 rounded border border-[#E2E8F0]">↓</kbd> to navigate
          </span>
          <span>
            <kbd className="font-mono bg-white px-1 py-0.5 rounded border border-[#E2E8F0]">↵</kbd> to select
          </span>
        </div>
      </div>
    </div>
  );
};
