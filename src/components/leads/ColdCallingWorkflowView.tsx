import React, { useState, useMemo } from 'react';
import {
  Phone,
  MessageCircle,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Plus,
  ArrowRight,
  Filter,
  User,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useCrm } from '../../lib/crm-context';
import { Lead, LeadStatus } from '../../types';

interface ColdCallingWorkflowViewProps {
  onSelectLead: (leadId: string) => void;
}

export const ColdCallingWorkflowView: React.FC<ColdCallingWorkflowViewProps> = ({
  onSelectLead,
}) => {
  const {
    leads,
    followups,
    updateLeadStatus,
    addLeadActivity,
    scheduleFollowup,
    completeFollowup,
  } = useCrm();

  const [activeSubTab, setActiveSubTab] = useState<'today' | 'overdue' | 'new_leads' | 'upcoming'>('today');

  // Quick call logger modal/drawer state
  const [selectedLeadForCall, setSelectedLeadForCall] = useState<Lead | null>(null);
  const [callOutcome, setCallOutcome] = useState('Connected - Follow-up Requested');
  const [callDuration, setCallDuration] = useState('10');
  const [callNotes, setCallNotes] = useState('');
  const [nextFollowupDate, setNextFollowupDate] = useState(new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]);
  const [nextFollowupTime, setNextFollowupTime] = useState('14:00');
  const [isSubmittingCall, setIsSubmittingCall] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  // Groupings
  const todayCalls = useMemo(() => {
    return followups
      .filter((f) => f.status === 'Pending' && f.followup_date === todayStr)
      .map((f) => ({ followup: f, lead: leads.find((l) => l.id === f.lead_id) }))
      .filter((item) => item.lead !== undefined);
  }, [followups, leads, todayStr]);

  const overdueCalls = useMemo(() => {
    return followups
      .filter((f) => f.status === 'Pending' && f.followup_date < todayStr)
      .map((f) => ({ followup: f, lead: leads.find((l) => l.id === f.lead_id) }))
      .filter((item) => item.lead !== undefined);
  }, [followups, leads, todayStr]);

  const upcomingCalls = useMemo(() => {
    return followups
      .filter((f) => f.status === 'Pending' && f.followup_date > todayStr)
      .map((f) => ({ followup: f, lead: leads.find((l) => l.id === f.lead_id) }))
      .filter((item) => item.lead !== undefined);
  }, [followups, leads, todayStr]);

  const newUncontactedLeads = useMemo(() => {
    return leads.filter((l) => l.status === 'New' && !l.last_contacted_at);
  }, [leads]);

  const handleOpenCallModal = (lead: Lead) => {
    setSelectedLeadForCall(lead);
    setCallOutcome('Connected - Follow-up Requested');
    setCallDuration('10');
    setCallNotes('');
  };

  const handleSaveOutreach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadForCall) return;

    setIsSubmittingCall(true);

    // 1. Log Activity
    await addLeadActivity(
      selectedLeadForCall.id,
      'Call',
      `Outreach Call: ${callOutcome}`,
      `${callDuration ? `Duration: ${callDuration}m. ` : ''}${callNotes}`,
      { outcome: callOutcome, duration_minutes: callDuration }
    );

    // 2. If status was New, update to Contacted
    if (selectedLeadForCall.status === 'New') {
      await updateLeadStatus(selectedLeadForCall.id, 'Contacted', 'Updated after first cold outreach call.');
    }

    // 3. Complete today's pending followup if one exists
    const matchingFollowup = followups.find(
      (f) => f.lead_id === selectedLeadForCall.id && f.status === 'Pending' && f.followup_date <= todayStr
    );
    if (matchingFollowup) {
      await completeFollowup(matchingFollowup.id, `Call completed: ${callOutcome}`);
    }

    // 4. Schedule next followup if requested
    if (nextFollowupDate) {
      await scheduleFollowup({
        leadId: selectedLeadForCall.id,
        date: nextFollowupDate,
        time: nextFollowupTime,
        note: `Follow-up after outreach call. Outcome: ${callOutcome}`,
      });
    }

    setIsSubmittingCall(false);
    setSelectedLeadForCall(null);
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setActiveSubTab('today')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeSubTab === 'today'
              ? 'bg-[#EEF2FF] border-[#4F46E5] shadow-xs'
              : 'bg-white border-[#E2E8F0] hover:bg-[#F8FAFC]'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span>Today's Calls</span>
            <Phone className="w-4 h-4 text-[#4F46E5]" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A] mt-1">
            {todayCalls.length}
          </div>
          <p className="text-[11px] text-[#4F46E5] font-semibold mt-0.5">Scheduled for today</p>
        </button>

        <button
          onClick={() => setActiveSubTab('overdue')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeSubTab === 'overdue'
              ? 'bg-rose-50 border-rose-500 shadow-xs'
              : 'bg-white border-[#E2E8F0] hover:bg-[#F8FAFC]'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span>Overdue Calls</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-1">
            {overdueCalls.length}
          </div>
          <p className="text-[11px] text-rose-600 font-semibold mt-0.5">Immediate attention</p>
        </button>

        <button
          onClick={() => setActiveSubTab('new_leads')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeSubTab === 'new_leads'
              ? 'bg-[#EEF2FF] border-[#4F46E5] shadow-xs'
              : 'bg-white border-[#E2E8F0] hover:bg-[#F8FAFC]'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span>New Uncontacted</span>
            <Sparkles className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A] mt-1">
            {newUncontactedLeads.length}
          </div>
          <p className="text-[11px] text-[#64748B] font-semibold mt-0.5">Fresh inbound inquiries</p>
        </button>

        <button
          onClick={() => setActiveSubTab('upcoming')}
          className={`p-4 rounded-xl border text-left transition-all ${
            activeSubTab === 'upcoming'
              ? 'bg-[#EEF2FF] border-[#4F46E5] shadow-xs'
              : 'bg-white border-[#E2E8F0] hover:bg-[#F8FAFC]'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span>Upcoming Queue</span>
            <Calendar className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A] mt-1">
            {upcomingCalls.length}
          </div>
          <p className="text-[11px] text-[#64748B] font-semibold mt-0.5">Scheduled future calls</p>
        </button>
      </div>

      {/* Leads List for Selected Sub Tab */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
              {activeSubTab === 'today' && "Today's Call Schedule"}
              {activeSubTab === 'overdue' && 'Overdue Follow-up Priority Queue'}
              {activeSubTab === 'new_leads' && 'New Uncontacted Inbound Inquiries'}
              {activeSubTab === 'upcoming' && 'Future Scheduled Follow-ups'}
            </h3>
            <p className="text-[11px] text-[#64748B]">
              Quick-dial phone numbers, trigger WhatsApp, and log outcomes in seconds.
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {/* Active list rendering */}
          {activeSubTab === 'today' &&
            (todayCalls.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#64748B]">
                No calls scheduled for today. Great job! Check the "New Uncontacted" tab.
              </div>
            ) : (
              todayCalls.map(({ followup, lead }) =>
                renderLeadRow(lead!, followup.note, followup.followup_time)
              )
            ))}

          {activeSubTab === 'overdue' &&
            (overdueCalls.length === 0 ? (
              <div className="py-12 text-center text-xs text-emerald-700">
                Zero overdue calls. All prospect tasks are up to date!
              </div>
            ) : (
              overdueCalls.map(({ followup, lead }) =>
                renderLeadRow(
                  lead!,
                  `Overdue since ${followup.followup_date}: ${followup.note || ''}`,
                  followup.followup_time,
                  true
                )
              )
            ))}

          {activeSubTab === 'new_leads' &&
            (newUncontactedLeads.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#64748B]">
                All inbound leads have been contacted.
              </div>
            ) : (
              newUncontactedLeads.map((lead) =>
                renderLeadRow(lead, lead.message || 'Fresh inquiry awaiting first contact.')
              )
            ))}

          {activeSubTab === 'upcoming' &&
            (upcomingCalls.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#64748B]">
                No future follow-ups scheduled yet.
              </div>
            ) : (
              upcomingCalls.map(({ followup, lead }) =>
                renderLeadRow(
                  lead!,
                  `Scheduled for ${followup.followup_date}: ${followup.note || ''}`,
                  followup.followup_time
                )
              )
            ))}
        </div>
      </div>

      {/* Outreach Quick Logger Modal */}
      {selectedLeadForCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">
                    Log Call with {selectedLeadForCall.name}
                  </h3>
                  <p className="text-[11px] text-[#64748B]">
                    {selectedLeadForCall.company || 'Private Prospect'} • {selectedLeadForCall.phone || 'No phone'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLeadForCall(null)}
                className="p-1 text-[#64748B] hover:text-[#0F172A] rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveOutreach} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#64748B] mb-1">
                  Call Outcome *
                </label>
                <select
                  value={callOutcome}
                  onChange={(e) => setCallOutcome(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl font-semibold text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                >
                  <option value="Connected - Follow-up Requested">Connected - Follow-up Requested</option>
                  <option value="Connected - Meeting Scheduled">Connected - Meeting Scheduled</option>
                  <option value="Connected - Interested">Connected - Interested</option>
                  <option value="Left Voicemail">Left Voicemail</option>
                  <option value="Busy / No Answer">Busy / No Answer</option>
                  <option value="Connected - Not Interested">Connected - Not Interested</option>
                  <option value="Wrong Number / Invalid">Wrong Number / Invalid</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#64748B] mb-1">
                    Call Duration (Mins)
                  </label>
                  <input
                    type="number"
                    value={callDuration}
                    onChange={(e) => setCallDuration(e.target.value)}
                    min="1"
                    className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#64748B] mb-1">
                    Next Follow-up Date
                  </label>
                  <input
                    type="date"
                    value={nextFollowupDate}
                    onChange={(e) => setNextFollowupDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#64748B] mb-1">
                  Discussion Notes & Next Steps
                </label>
                <textarea
                  rows={3}
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="Summarize key points discussed, objections, timeline..."
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedLeadForCall(null)}
                  className="px-3.5 py-1.5 font-medium text-[#64748B] hover:text-[#0F172A] rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCall}
                  className="px-4 py-1.5 font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50 rounded-xl transition-colors shadow-2xs"
                >
                  {isSubmittingCall ? 'Saving...' : 'Save Outreach & Follow-up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  function renderLeadRow(
    lead: Lead,
    agendaNote?: string | null,
    time?: string | null,
    isOverdueBadge?: boolean
  ) {
    const rawPhone = lead.phone ? lead.phone.replace(/[^0-9]/g, '') : '';

    return (
      <div
        key={lead.id}
        className="p-4 hover:bg-[#F8FAFC] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              onClick={() => onSelectLead(lead.id)}
              className="font-bold text-[#0F172A] hover:text-[#4F46E5] cursor-pointer text-sm truncate"
            >
              {lead.name}
            </span>
            {lead.company && (
              <span className="text-xs text-[#64748B] font-medium truncate">
                ({lead.company})
              </span>
            )}
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                isOverdueBadge ? 'bg-rose-50 text-rose-700' : 'bg-[#EEF2FF] text-[#4F46E5]'
              }`}
            >
              {lead.status}
            </span>
            {time && (
              <span className="text-[11px] text-[#64748B] font-semibold flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#4F46E5]" /> {time}
              </span>
            )}
          </div>

          <p className="text-xs text-[#64748B] line-clamp-1">
            {agendaNote || lead.service || 'Prospect inquiry'}
          </p>

          <div className="flex items-center gap-3 text-[11px] text-[#94A3B8]">
            {lead.phone && <span>Phone: {lead.phone}</span>}
            {lead.budget && (
              <span>
                Budget: {lead.currency} {lead.budget.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {lead.phone && (
            <>
              <a
                href={`tel:${lead.phone}`}
                className="px-3 py-1.5 rounded-xl border border-[#E2E8F0] hover:bg-[#EEF2FF] text-[#4F46E5] font-semibold text-xs transition-colors flex items-center gap-1.5"
                title={`Call ${lead.phone}`}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call</span>
              </a>
              {rawPhone && (
                <a
                  href={`https://wa.me/${rawPhone}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs transition-colors flex items-center gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              )}
            </>
          )}

          <button
            onClick={() => handleOpenCallModal(lead)}
            className="px-3.5 py-1.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold text-xs shadow-2xs transition-colors"
          >
            Log Outcome
          </button>

          <button
            onClick={() => onSelectLead(lead.id)}
            className="p-1.5 text-[#64748B] hover:text-[#0F172A] rounded-lg"
            title="Open Lead Workspace"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }
};
