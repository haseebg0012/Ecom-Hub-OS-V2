import React from 'react';
import {
  Lead,
  LeadStatus,
  LeadPriority,
} from '../../types';
import {
  Phone,
  Mail,
  Clock,
  AlertTriangle,
  MoreHorizontal,
  ArrowRight,
  ExternalLink,
  DollarSign,
  MessageCircle,
} from 'lucide-react';
import { useCrm } from '../../lib/crm-context';

interface LeadTableViewProps {
  leads: Lead[];
  onSelectLead: (leadId: string) => void;
  onDeleteLead?: (leadId: string) => void;
}

export const LeadTableView: React.FC<LeadTableViewProps> = ({
  leads,
  onSelectLead,
  onDeleteLead,
}) => {
  const { updateLeadStatus } = useCrm();

  const getStatusBadge = (st: LeadStatus) => {
    switch (st) {
      case 'New':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Contacted':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Qualified':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Meeting':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Proposal':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'Negotiation':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Won':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Lost':
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getPriorityBadge = (pr: LeadPriority) => {
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

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-bold uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Lead / Company</th>
              <th className="py-3 px-4">Service</th>
              <th className="py-3 px-4">Pipeline Status</th>
              <th className="py-3 px-4">Budget</th>
              <th className="py-3 px-4">Contact & Outreach</th>
              <th className="py-3 px-4">Next Follow-up</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {leads.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-xs text-[#64748B]">
                  No leads found matching your criteria.
                </td>
              </tr>
            ) : (
              leads.map((lead) => {
                const rawPhone = lead.phone ? lead.phone.replace(/[^0-9]/g, '') : '';

                return (
                  <tr
                    key={lead.id}
                    onClick={() => onSelectLead(lead.id)}
                    className="hover:bg-[#F8FAFC] transition-colors cursor-pointer group"
                  >
                    {/* Name & Company */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-bold text-[#0F172A] group-hover:text-[#4F46E5] transition-colors">
                            {lead.name}
                          </p>
                          <p className="text-[11px] text-[#64748B]">
                            {lead.company || '—'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Service & Priority */}
                    <td className="py-3.5 px-4">
                      <p className="text-[#0F172A] font-semibold truncate max-w-[160px]">
                        {lead.service || 'Consulting'}
                      </p>
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold border mt-0.5 ${getPriorityBadge(
                          lead.priority
                        )}`}
                      >
                        {lead.priority}
                      </span>
                    </td>

                    {/* Status dropdown */}
                    <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={lead.status}
                        onChange={(e) => updateLeadStatus(lead.id, e.target.value as LeadStatus)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border focus:outline-none cursor-pointer ${getStatusBadge(
                          lead.status
                        )}`}
                      >
                        {[
                          'New',
                          'Contacted',
                          'Qualified',
                          'Meeting',
                          'Proposal',
                          'Negotiation',
                          'Won',
                          'Lost',
                        ].map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Budget & Attribution */}
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-[#0F172A]">
                        {lead.budget ? `${lead.currency} ${lead.budget.toLocaleString()}` : '—'}
                      </span>
                      {lead.agent_name ? (
                        <p className="text-[10px] text-emerald-700 font-semibold truncate max-w-[130px]">
                          Agent: {lead.agent_name}
                        </p>
                      ) : (
                        <p className="text-[10px] text-[#94A3B8]">via {lead.source}</p>
                      )}
                    </td>

                    {/* Contact Quick Buttons */}
                    <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        {lead.phone && (
                          <>
                            <a
                              href={`tel:${lead.phone}`}
                              className="p-1.5 rounded-lg border border-[#E2E8F0] hover:bg-[#EEF2FF] text-[#4F46E5] transition-colors"
                              title={`Call ${lead.phone}`}
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                            {rawPhone && (
                              <a
                                href={`https://wa.me/${rawPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                                title="Open WhatsApp chat"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </>
                        )}
                        {lead.email && (
                          <a
                            href={`mailto:${lead.email}`}
                            className="p-1.5 rounded-lg border border-[#E2E8F0] hover:bg-[#EEF2FF] text-[#4F46E5] transition-colors"
                            title={`Email ${lead.email}`}
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Next Follow-up */}
                    <td className="py-3.5 px-4">
                      {lead.next_followup_at ? (
                        <div className="flex items-center gap-1.5 text-xs text-[#0F172A] font-semibold">
                          <Clock className="w-3.5 h-3.5 text-[#4F46E5]" />
                          <span>
                            {new Date(lead.next_followup_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#94A3B8]">None</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectLead(lead.id);
                        }}
                        className="px-3 py-1 text-xs font-semibold text-[#4F46E5] bg-[#EEF2FF] hover:bg-[#E0E7FF] rounded-lg transition-colors inline-flex items-center gap-1"
                      >
                        <span>Workspace</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
