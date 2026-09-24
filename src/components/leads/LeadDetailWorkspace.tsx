import React, { useState } from 'react';
import {
  ArrowLeft,
  Phone,
  Mail,
  Globe,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  UserCheck,
  Tag,
  MessageSquare,
  Plus,
  Send,
  ExternalLink,
  ChevronDown,
  AlertCircle,
  Sparkles,
  ArrowRight,
  DollarSign,
  UserPlus,
  ArrowRightLeft,
  X,
} from 'lucide-react';
import { useCrm } from '../../lib/crm-context';
import { useAuth } from '../../lib/auth-context';
import { Lead, LeadStatus, LeadPriority, CrmActivityType, Client } from '../../types';
import { CurrencyConverterModal } from '../common/CurrencyConverterModal';
import { SUPPORTED_CURRENCIES, resolveCurrency } from '../../lib/currencies';

interface LeadDetailWorkspaceProps {
  leadId: string;
  onBack: () => void;
  onOpenClient?: (clientId: string) => void;
}

export const LeadDetailWorkspace: React.FC<LeadDetailWorkspaceProps> = ({
  leadId,
  onBack,
  onOpenClient,
}) => {
  const {
    leads,
    updateLead,
    updateLeadStatus,
    addLeadActivity,
    scheduleFollowup,
    completeFollowup,
    followups,
    activities,
    convertLeadToClient,
    getExchangeRate,
  } = useCrm();
  const { user, members, activeBusiness } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'calls' | 'followups' | 'notes' | 'timeline'>('overview');

  // Currency Converter Modal State
  const [showConverter, setShowConverter] = useState(false);

  // Convert to Client Modal State
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertCompanyName, setConvertCompanyName] = useState('');
  const [convertCurrency, setConvertCurrency] = useState<string>('PKR');
  const [isConverting, setIsConverting] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);

  // Call Logger State
  const [callOutcome, setCallOutcome] = useState('Connected - Interested');
  const [callDuration, setCallDuration] = useState('15');
  const [callNotes, setCallNotes] = useState('');
  const [isLoggingCall, setIsLoggingCall] = useState(false);

  // Follow-up Schedule Form State
  const [followupDate, setFollowupDate] = useState(new Date().toISOString().split('T')[0]);
  const [followupTime, setFollowupTime] = useState('14:00');
  const [followupNote, setFollowupNote] = useState('');
  const [followupAssignee, setFollowupAssignee] = useState(user?.id || '');

  // Quick Note State
  const [newNote, setNewNote] = useState('');

  const lead = leads.find((l) => l.id === leadId);

  if (!lead) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-[#E2E8F0]">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-[#0F172A]">Lead record not found</h3>
        <p className="text-xs text-[#64748B] mt-1">This lead may have been deleted or archived.</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-1.5 text-xs font-semibold text-[#4F46E5] bg-[#EEF2FF] rounded-xl"
        >
          Return to Leads
        </button>
      </div>
    );
  }

  // Filter activities and follow-ups for this lead
  const leadActivities = activities.filter((a) => a.lead_id === lead.id);
  const leadFollowups = followups.filter((f) => f.lead_id === lead.id);

  // Status colors & styles
  const getStatusColor = (st: LeadStatus) => {
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
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getPriorityColor = (pr: LeadPriority) => {
    switch (pr) {
      case 'Urgent':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'High':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Low':
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  // Convert Lead Handler
  const handleOpenConvert = () => {
    setConvertCompanyName(lead.company || lead.name);
    setConvertCurrency(resolveCurrency(lead.currency || activeBusiness?.default_currency));
    setShowConvertModal(true);
  };

  const handleExecuteConvert = async () => {
    setIsConverting(true);
    setConvertError(null);

    const res = await convertLeadToClient(lead.id, {
      company_name: convertCompanyName,
      preferred_currency: convertCurrency,
    });

    setIsConverting(false);
    if (res.success && res.client) {
      setShowConvertModal(false);
      if (onOpenClient) {
        onOpenClient(res.client.id);
      }
    } else {
      setConvertError(res.error || 'Failed to convert lead.');
    }
  };

  // Handle Log Call
  const handleLogCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callOutcome) return;

    setIsLoggingCall(true);
    await addLeadActivity(
      lead.id,
      'Call',
      `Call Logged: ${callOutcome}`,
      `${callDuration ? `Duration: ${callDuration} mins. ` : ''}${callNotes}`,
      { outcome: callOutcome, duration_minutes: callDuration }
    );

    setCallNotes('');
    setIsLoggingCall(false);
  };

  // Handle Schedule Followup
  const handleAddFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followupDate) return;

    await scheduleFollowup({
      leadId: lead.id,
      date: followupDate,
      time: followupTime,
      note: followupNote,
      assignedTo: followupAssignee,
    });

    setFollowupNote('');
  };

  // Handle Add Note
  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    await addLeadActivity(lead.id, 'Note', 'Internal Note Added', newNote.trim());
    setNewNote('');
  };

  // Multi-currency calculation
  const budgetVal = lead.budget || 0;
  const otherCurrency = lead.currency === 'PKR' ? 'USD' : 'PKR';
  const convertedBudgetVal = budgetVal * getExchangeRate(lead.currency, otherCurrency);

  // Phone clean for WhatsApp
  const rawPhone = lead.phone ? lead.phone.replace(/[^0-9]/g, '') : '';

  return (
    <div className="space-y-6">
      {/* Top Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-xl transition-colors border border-[#E2E8F0] bg-white shadow-2xs"
            title="Return to pipeline"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                Prospect Profile
              </span>
              <span className="text-[#94A3B8]">•</span>
              <span className="text-xs font-semibold text-[#4F46E5] bg-[#EEF2FF] px-2 py-0.5 rounded">
                {lead.source}
              </span>
              {lead.agent_name && (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span>Agent: {lead.agent_name}</span>
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-[#0F172A] tracking-tight mt-0.5 flex items-center gap-2">
              <span>{lead.name}</span>
              {lead.company && (
                <span className="text-sm font-normal text-[#64748B]">
                  ({lead.company})
                </span>
              )}
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Status Dropdown */}
          <div className="relative">
            <select
              value={lead.status}
              onChange={(e) => updateLeadStatus(lead.id, e.target.value as LeadStatus)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer focus:outline-none ${getStatusColor(
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
          </div>

          {/* Convert to Client Button */}
          {lead.converted_to_client_id ? (
            <button
              onClick={() => onOpenClient && onOpenClient(lead.converted_to_client_id!)}
              className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>View Converted Client</span>
            </button>
          ) : (
            <button
              onClick={handleOpenConvert}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-xl shadow-2xs transition-colors flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Convert to Client</span>
            </button>
          )}
        </div>
      </div>

      {/* Highlights Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Value & Multi-Currency */}
        <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span>Estimated Budget</span>
            <button
              onClick={() => setShowConverter(true)}
              className="text-[11px] font-medium text-[#4F46E5] hover:underline flex items-center gap-1"
            >
              <ArrowRightLeft className="w-3 h-3" />
              <span>Convert</span>
            </button>
          </div>
          <div className="text-lg font-bold text-[#0F172A] tracking-tight">
            {lead.budget ? `${lead.currency} ${lead.budget.toLocaleString()}` : 'Not Specified'}
          </div>
          {lead.budget ? (
            <p className="text-[11px] text-[#64748B]">
              ≈ {otherCurrency} {Math.round(convertedBudgetVal).toLocaleString()}
            </p>
          ) : null}
        </div>

        {/* Priority */}
        <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs space-y-1">
          <span className="text-xs text-[#64748B] block">Priority Level</span>
          <div>
            <select
              value={lead.priority}
              onChange={(e) => updateLead(lead.id, { priority: e.target.value as LeadPriority })}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border focus:outline-none cursor-pointer ${getPriorityColor(
                lead.priority
              )}`}
            >
              {['Low', 'Medium', 'High', 'Urgent'].map((pr) => (
                <option key={pr} value={pr}>
                  {pr} Priority
                </option>
              ))}
            </select>
          </div>
          <p className="text-[11px] text-[#94A3B8]">Workflow urgency rank</p>
        </div>

        {/* Assignee */}
        <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs space-y-1">
          <span className="text-xs text-[#64748B] block">Assigned Specialist</span>
          <select
            value={lead.assigned_to || ''}
            onChange={(e) => updateLead(lead.id, { assigned_to: e.target.value || null })}
            className="w-full px-2 py-1 text-xs font-medium text-[#0F172A] bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#4F46E5]"
          >
            <option value="">-- Unassigned --</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.profile?.full_name || m.profile?.email} ({m.role})
              </option>
            ))}
          </select>
          <p className="text-[11px] text-[#94A3B8]">Responsible sales agent</p>
        </div>

        {/* Next Scheduled Follow-up */}
        <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs space-y-1">
          <span className="text-xs text-[#64748B] block">Next Follow-up</span>
          <div className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#4F46E5]" />
            <span>
              {lead.next_followup_at
                ? new Date(lead.next_followup_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'None scheduled'}
            </span>
          </div>
          <p className="text-[11px] text-[#94A3B8]">
            {lead.last_contacted_at
              ? `Last contact: ${new Date(lead.last_contacted_at).toLocaleDateString()}`
              : 'Not yet contacted'}
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-[#E2E8F0] flex items-center gap-2 overflow-x-auto text-xs font-semibold">
        {[
          { id: 'overview', label: 'Overview & Details' },
          { id: 'calls', label: `Calls & Outreach (${leadActivities.filter((a) => a.activity_type === 'Call').length})` },
          { id: 'followups', label: `Follow-ups (${leadFollowups.filter((f) => f.status === 'Pending').length})` },
          { id: 'notes', label: `Notes (${leadActivities.filter((a) => a.activity_type === 'Note').length})` },
          { id: 'timeline', label: `Full Timeline (${leadActivities.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 px-3 pt-1 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-[#4F46E5] text-[#4F46E5]'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 Cols): Inquiry & Core Data */}
          <div className="lg:col-span-2 space-y-6">
            {/* Service & Inquiry Message */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                Service Inquiry & Message
              </h3>
              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <span className="text-[11px] font-semibold text-[#4F46E5] block">
                  Requested Solution:
                </span>
                <p className="text-sm font-bold text-[#0F172A] mt-0.5">
                  {lead.service || 'General eCommerce Consultation'}
                </p>
              </div>

              <div>
                <span className="text-xs font-semibold text-[#64748B] block mb-1">
                  Client Message / Requirement Details:
                </span>
                <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] text-xs text-[#334155] leading-relaxed">
                  {lead.message || 'No additional message was provided during initial lead capture.'}
                </div>
              </div>
            </div>

            {/* Inbound Marketing Attribution */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                Marketing Attribution & Source Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <span className="text-[11px] text-[#64748B] block">Origin Source</span>
                  <span className="font-semibold text-[#0F172A] mt-0.5 block">{lead.source}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <span className="text-[11px] text-[#64748B] block">Lead Agent</span>
                  <span className="font-semibold text-[#4F46E5] mt-0.5 block">
                    {lead.agent_name || 'None (Direct Inbound)'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <span className="text-[11px] text-[#64748B] block">Campaign / Form</span>
                  <span className="font-semibold text-[#0F172A] mt-0.5 block truncate">
                    {lead.campaign || 'Direct / Organic'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <span className="text-[11px] text-[#64748B] block">Landing Page</span>
                  <span className="font-semibold text-[#0F172A] mt-0.5 block truncate">
                    {lead.landing_page || '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Direct Contact & Actions */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs space-y-4">
              <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                Direct Contact Actions
              </h3>

              <div className="space-y-3">
                {/* Email */}
                {lead.email ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Mail className="w-4 h-4 text-[#4F46E5] shrink-0" />
                      <span className="text-xs font-medium text-[#0F172A] truncate">
                        {lead.email}
                      </span>
                    </div>
                    <a
                      href={`mailto:${lead.email}?subject=Inquiry: ${encodeURIComponent(
                        lead.service || 'Ecometrix Hub'
                      )}`}
                      className="px-2 py-1 text-[11px] font-semibold text-[#4F46E5] hover:bg-[#EEF2FF] rounded-lg transition-colors shrink-0"
                    >
                      Email
                    </a>
                  </div>
                ) : null}

                {/* Phone & Call */}
                {lead.phone ? (
                  <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Phone className="w-4 h-4 text-[#4F46E5] shrink-0" />
                        <span className="text-xs font-medium text-[#0F172A] truncate">
                          {lead.phone}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <a
                        href={`tel:${lead.phone}`}
                        className="flex-1 text-center py-1.5 px-2 rounded-lg bg-white border border-[#E2E8F0] hover:bg-[#EEF2FF] text-[#4F46E5] font-semibold text-[11px] transition-colors"
                      >
                        Call (Phone)
                      </a>
                      {rawPhone && (
                        <a
                          href={`https://wa.me/${rawPhone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 text-center py-1.5 px-2 rounded-lg bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 font-semibold text-[11px] transition-colors"
                        >
                          WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* Website */}
                {lead.website ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Globe className="w-4 h-4 text-[#4F46E5] shrink-0" />
                      <span className="text-xs font-medium text-[#0F172A] truncate">
                        {lead.website}
                      </span>
                    </div>
                    <a
                      href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 text-[#64748B] hover:text-[#4F46E5] rounded shrink-0"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Quick Action to Log Call */}
            <div className="p-4 rounded-2xl bg-[#EEF2FF]/50 border border-[#E0E7FF] flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-[#0F172A]">Finished reaching out?</h4>
                <p className="text-[11px] text-[#64748B]">Log the call outcome and schedule next task.</p>
              </div>
              <button
                onClick={() => setActiveTab('calls')}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-xl transition-colors shrink-0"
              >
                Log Call →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB: CALLS & OUTREACH LOGGER */}
      {activeTab === 'calls' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Call Logging Form */}
          <div className="lg:col-span-1 bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#4F46E5]" /> Log Call / Outreach
            </h3>

            <form onSubmit={handleLogCall} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">
                  Call Outcome *
                </label>
                <select
                  value={callOutcome}
                  onChange={(e) => setCallOutcome(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                >
                  <option value="Connected - Interested">Connected - Interested</option>
                  <option value="Connected - Meeting Scheduled">Connected - Meeting Scheduled</option>
                  <option value="Connected - Follow-up Requested">Connected - Follow-up Requested</option>
                  <option value="Connected - Not Interested">Connected - Not Interested</option>
                  <option value="Left Voicemail">Left Voicemail</option>
                  <option value="Busy / No Answer">Busy / No Answer</option>
                  <option value="Wrong Number / Invalid">Wrong Number / Invalid</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  value={callDuration}
                  onChange={(e) => setCallDuration(e.target.value)}
                  min="1"
                  className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">
                  Call Notes & Discussion Summary
                </label>
                <textarea
                  rows={4}
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="Discussed scope, budget in PKR/USD, decision maker timelines..."
                  className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingCall}
                className="w-full py-2 bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-60 text-white font-semibold text-xs rounded-xl shadow-2xs transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Save Call to History</span>
              </button>
            </form>
          </div>

          {/* Past Calls List */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
              Outreach & Call History
            </h3>

            {leadActivities.filter((a) => a.activity_type === 'Call').length === 0 ? (
              <div className="py-12 text-center text-xs text-[#64748B]">
                No calls have been logged for this prospect yet.
              </div>
            ) : (
              <div className="space-y-3">
                {leadActivities
                  .filter((a) => a.activity_type === 'Call')
                  .map((act) => (
                    <div
                      key={act.id}
                      className="p-4 rounded-xl border border-[#E2E8F0] bg-white space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#0F172A]">
                          {act.title}
                        </span>
                        <span className="text-[11px] text-[#94A3B8]">
                          {new Date(act.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-[#64748B] leading-relaxed">
                        {act.description}
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: FOLLOW-UPS */}
      {activeTab === 'followups' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Schedule Followup Form */}
          <div className="lg:col-span-1 bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#4F46E5]" /> Schedule Follow-up
            </h3>

            <form onSubmit={handleAddFollowup} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">
                  Follow-up Date *
                </label>
                <input
                  type="date"
                  value={followupDate}
                  onChange={(e) => setFollowupDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">
                  Target Time
                </label>
                <input
                  type="time"
                  value={followupTime}
                  onChange={(e) => setFollowupTime(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">
                  Assigned Agent
                </label>
                <select
                  value={followupAssignee}
                  onChange={(e) => setFollowupAssignee(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                >
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.profile?.full_name || m.profile?.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">
                  Task Note / Agenda
                </label>
                <textarea
                  rows={3}
                  value={followupNote}
                  onChange={(e) => setFollowupNote(e.target.value)}
                  placeholder="Send proposal draft, review invoice, demo WhatsApp automation..."
                  className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold text-xs rounded-xl shadow-2xs transition-colors"
              >
                Schedule Follow-up
              </button>
            </form>
          </div>

          {/* Follow-up Tasks List */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
              Follow-up Action Items
            </h3>

            {leadFollowups.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#64748B]">
                No follow-ups recorded for this prospect.
              </div>
            ) : (
              <div className="space-y-3">
                {leadFollowups.map((flw) => (
                  <div
                    key={flw.id}
                    className={`p-4 rounded-xl border transition-colors flex items-start justify-between gap-4 ${
                      flw.status === 'Completed'
                        ? 'bg-[#F8FAFC] border-[#E2E8F0] opacity-75'
                        : 'bg-white border-[#E2E8F0]'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            flw.status === 'Completed'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {flw.status}
                        </span>
                        <span className="text-xs font-bold text-[#0F172A]">
                          Due {flw.followup_date} {flw.followup_time ? `@ ${flw.followup_time}` : ''}
                        </span>
                      </div>
                      <p className="text-xs text-[#64748B] leading-relaxed">
                        {flw.note || 'No specific note added.'}
                      </p>
                    </div>

                    {flw.status === 'Pending' && (
                      <button
                        onClick={() => completeFollowup(flw.id)}
                        className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors shrink-0"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: NOTES */}
      {activeTab === 'notes' && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-2xs space-y-6">
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
              Add Internal Discussion Note
            </h3>
            <div className="flex gap-2">
              <textarea
                rows={2}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Share internal context or requirements among the team..."
                className="flex-1 px-3.5 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
              />
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim()}
                className="px-4 py-2 bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-2xs transition-colors shrink-0 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Post Note</span>
              </button>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-[#E2E8F0]">
            <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
              Recorded Notes
            </h4>
            {leadActivities.filter((a) => a.activity_type === 'Note').length === 0 ? (
              <p className="text-xs text-[#64748B]">No internal notes posted yet.</p>
            ) : (
              leadActivities
                .filter((a) => a.activity_type === 'Note')
                .map((n) => (
                  <div key={n.id} className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                      <span className="font-semibold text-[#0F172A]">
                        {n.user_profile?.full_name || 'Team Member'}
                      </span>
                      <span>{new Date(n.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-[#334155] leading-relaxed">{n.description || n.title}</p>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* TAB: TIMELINE */}
      {activeTab === 'timeline' && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-2xs space-y-4">
          <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
            Lead Lifecycle Timeline
          </h3>
          <div className="space-y-4 border-l-2 border-[#E2E8F0] ml-3 pl-4">
            {leadActivities.map((act) => (
              <div key={act.id} className="relative space-y-1">
                <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-[#4F46E5] ring-4 ring-white" />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0F172A]">{act.title}</span>
                  <span className="text-[10px] text-[#94A3B8]">
                    {new Date(act.created_at).toLocaleString()}
                  </span>
                </div>
                {act.description && (
                  <p className="text-xs text-[#64748B] leading-relaxed">{act.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Currency Converter Modal */}
      <CurrencyConverterModal
        isOpen={showConverter}
        onClose={() => setShowConverter(false)}
        initialAmount={lead.budget || 1000}
        initialFrom={lead.currency}
        initialTo={lead.currency === 'USD' ? 'PKR' : 'USD'}
      />

      {/* Convert Lead to Client Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">Convert Lead to Client</h3>
                  <p className="text-[11px] text-[#64748B]">
                    Enrolls organization into active Client directory
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowConvertModal(false)}
                className="p-1.5 text-[#64748B] hover:text-[#0F172A] rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-[#64748B] leading-relaxed">
                Converting <strong>{lead.name}</strong> will create a permanent Client Workspace in your tenant directory, generate primary contact records, link previous call history, and change the pipeline stage to <strong>Won</strong>.
              </p>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">
                  Client Company / Account Name *
                </label>
                <input
                  type="text"
                  value={convertCompanyName}
                  onChange={(e) => setConvertCompanyName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl font-semibold text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">
                  Primary Preferred Currency
                </label>
                <select
                  value={convertCurrency}
                  onChange={(e) => setConvertCurrency(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl font-semibold text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {convertError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl">
                  {convertError}
                </div>
              )}
            </div>

            <div className="px-5 py-3.5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConvertModal(false)}
                className="px-3.5 py-1.5 font-medium text-[#64748B] hover:text-[#0F172A] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteConvert}
                disabled={isConverting || !convertCompanyName.trim()}
                className="px-4 py-1.5 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition-colors shadow-2xs"
              >
                {isConverting ? 'Creating Client...' : 'Confirm Conversion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
