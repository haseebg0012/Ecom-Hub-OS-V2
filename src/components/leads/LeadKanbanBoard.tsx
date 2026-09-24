import React from 'react';
import {
  Lead,
  LeadStatus,
} from '../../types';
import {
  Clock,
  ArrowRight,
  CheckCircle2,
  DollarSign,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { useCrm } from '../../lib/crm-context';

interface LeadKanbanBoardProps {
  leads: Lead[];
  onSelectLead: (leadId: string) => void;
}

const STAGES: { id: LeadStatus; label: string; color: string; border: string }[] = [
  { id: 'New', label: 'New Inbound', color: 'bg-blue-500', border: 'border-blue-200' },
  { id: 'Contacted', label: 'Contacted', color: 'bg-amber-500', border: 'border-amber-200' },
  { id: 'Qualified', label: 'Qualified', color: 'bg-purple-500', border: 'border-purple-200' },
  { id: 'Meeting', label: 'Meeting Set', color: 'bg-indigo-500', border: 'border-indigo-200' },
  { id: 'Proposal', label: 'Proposal Sent', color: 'bg-cyan-500', border: 'border-cyan-200' },
  { id: 'Negotiation', label: 'Negotiation', color: 'bg-orange-500', border: 'border-orange-200' },
  { id: 'Won', label: 'Won / Client', color: 'bg-emerald-500', border: 'border-emerald-200' },
  { id: 'Lost', label: 'Lost / Closed', color: 'bg-slate-400', border: 'border-slate-200' },
];

export const LeadKanbanBoard: React.FC<LeadKanbanBoardProps> = ({
  leads,
  onSelectLead,
}) => {
  const { updateLeadStatus } = useCrm();

  const getPriorityBadge = (pr: string) => {
    switch (pr) {
      case 'Urgent':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'High':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const isOverdue = (dateStr: string | null) => {
    if (!dateStr) return false;
    return new Date(dateStr).getTime() < Date.now();
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 pt-1 items-start min-h-[560px]">
      {STAGES.map((col) => {
        const colLeads = leads.filter((l) => l.status === col.id);
        const totalBudget = colLeads.reduce((sum, l) => sum + (Number(l.budget) || 0), 0);

        return (
          <div
            key={col.id}
            className="w-72 shrink-0 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] p-3 flex flex-col max-h-[80vh]"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E2E8F0] mb-3 px-1">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${col.color}`} />
                <h4 className="text-xs font-bold text-[#0F172A] tracking-tight">{col.label}</h4>
                <span className="w-5 h-5 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center text-[10px] font-bold text-[#64748B]">
                  {colLeads.length}
                </span>
              </div>
              {totalBudget > 0 && (
                <span className="text-[10px] font-semibold text-[#64748B]">
                  ${totalBudget >= 1000 ? `${(totalBudget / 1000).toFixed(1)}k` : totalBudget}
                </span>
              )}
            </div>

            {/* Column Cards */}
            <div className="space-y-2.5 overflow-y-auto pr-0.5 flex-1">
              {colLeads.length === 0 ? (
                <div className="py-8 text-center text-[11px] text-[#94A3B8] border-2 border-dashed border-[#E2E8F0] rounded-xl">
                  No prospects
                </div>
              ) : (
                colLeads.map((lead) => {
                  const overdue = isOverdue(lead.next_followup_at);

                  return (
                    <div
                      key={lead.id}
                      onClick={() => onSelectLead(lead.id)}
                      className="p-3.5 bg-white rounded-xl border border-[#E2E8F0] hover:border-[#4F46E5]/40 hover:shadow-sm transition-all cursor-pointer space-y-2 group"
                    >
                      {/* Name & Priority */}
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="min-w-0">
                          <h5 className="text-xs font-bold text-[#0F172A] group-hover:text-[#4F46E5] transition-colors truncate">
                            {lead.name}
                          </h5>
                          {lead.company && (
                            <p className="text-[11px] text-[#64748B] truncate mt-0.5">
                              {lead.company}
                            </p>
                          )}
                        </div>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold border shrink-0 ${getPriorityBadge(
                            lead.priority
                          )}`}
                        >
                          {lead.priority}
                        </span>
                      </div>

                      {/* Service tag */}
                      {lead.service && (
                        <p className="text-[10px] text-[#475569] bg-[#F1F5F9] px-2 py-0.5 rounded truncate inline-block max-w-full">
                          {lead.service}
                        </p>
                      )}

                      {/* Budget & Follow-up row */}
                      <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="font-bold text-[#0F172A]">
                          {lead.budget ? `${lead.currency} ${lead.budget.toLocaleString()}` : '—'}
                        </span>

                        {lead.next_followup_at ? (
                          <span
                            className={`flex items-center gap-1 text-[10px] font-semibold ${
                              overdue ? 'text-rose-600' : 'text-[#64748B]'
                            }`}
                            title={lead.next_followup_at}
                          >
                            {overdue ? (
                              <AlertTriangle className="w-3 h-3 text-rose-500" />
                            ) : (
                              <Clock className="w-3 h-3 text-[#4F46E5]" />
                            )}
                            <span>
                              {new Date(lead.next_followup_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#94A3B8]">{lead.source}</span>
                        )}
                      </div>

                      {/* Move Stage Quick Action */}
                      <div className="pt-1 flex items-center justify-between text-[10px] text-[#94A3B8]">
                        <select
                          value={lead.status}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            e.stopPropagation();
                            updateLeadStatus(lead.id, e.target.value as LeadStatus);
                          }}
                          className="bg-[#F8FAFC] border border-[#E2E8F0] rounded px-1.5 py-0.5 font-medium text-[#0F172A] focus:outline-none"
                        >
                          {STAGES.map((s) => (
                            <option key={s.id} value={s.id}>
                              Move to: {s.label}
                            </option>
                          ))}
                        </select>

                        <span className="text-[#4F46E5] font-semibold flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          Details <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
