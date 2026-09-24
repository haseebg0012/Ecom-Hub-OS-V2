/**
 * EcomHub OS — Lead Entry Form & Agent Management Settings
 * Form Token controls (Copy, Regenerate, Enable/Disable) & Lead Agent CRUD.
 */

import React, { useState, useEffect } from 'react';
import {
  Link2,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Power,
  Shield,
  Plus,
  Users,
  Search,
  Edit2,
  Trash2,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Sparkles,
  Smartphone,
  Share2
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { useCrm } from '../../lib/crm-context';
import {
  getLeadEntryForm,
  regenerateFormToken,
  toggleLeadFormActive,
  fetchLeadAgents,
  createLeadAgent,
  updateLeadAgent,
  deleteLeadAgent,
} from '../../lib/lead-entry-service';
import { LeadAgent, LeadEntryForm } from '../../types';

export const LeadEntrySettingsView: React.FC = () => {
  const { activeBusiness } = useAuth();
  const { leads } = useCrm();

  const [form, setForm] = useState<LeadEntryForm | null>(null);
  const [agents, setAgents] = useState<LeadAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRegenModal, setShowRegenModal] = useState(false);

  // Agent Management Modals & State
  const [agentSearch, setAgentSearch] = useState('');
  const [showAddAgentModal, setShowAddAgentModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<LeadAgent | null>(null);
  const [agentNameInput, setAgentNameInput] = useState('');
  const [agentPhoneInput, setAgentPhoneInput] = useState('');
  const [agentEmailInput, setAgentEmailInput] = useState('');
  const [agentError, setAgentError] = useState<string | null>(null);

  const canManage =
    activeBusiness?.role === 'Owner' ||
    activeBusiness?.role === 'Admin' ||
    activeBusiness?.role === 'Manager';

  const loadData = async () => {
    if (!activeBusiness) return;
    setLoading(true);
    try {
      const [formData, agentsData] = await Promise.all([
        getLeadEntryForm(activeBusiness.id),
        fetchLeadAgents(activeBusiness.id),
      ]);
      setForm(formData);
      setAgents(agentsData);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeBusiness?.id]);

  // Compute public link URL
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.ecomhubos.com';
  const publicUrl = form ? `${origin}/lead-entry/${form.token}` : '';

  const handleCopyLink = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleOpenForm = () => {
    if (!publicUrl) return;
    window.open(publicUrl, '_blank');
  };

  const handleRegenerate = async () => {
    if (!activeBusiness || !canManage) return;
    setActionLoading(true);
    try {
      const updated = await regenerateFormToken(activeBusiness.id);
      setForm(updated);
      setShowRegenModal(false);
    } catch {
      // ignore
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async () => {
    if (!activeBusiness || !form || !canManage) return;
    setActionLoading(true);
    try {
      const updated = await toggleLeadFormActive(activeBusiness.id, !form.is_active);
      setForm(updated);
    } catch {
      // ignore
    } finally {
      setActionLoading(false);
    }
  };

  // Agent Form Handlers
  const handleSaveAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness) return;
    setAgentError(null);

    if (!agentNameInput.trim()) {
      setAgentError('Agent name is required.');
      return;
    }

    setActionLoading(true);
    try {
      if (editingAgent) {
        // Update
        const res = await updateLeadAgent(editingAgent.id, {
          name: agentNameInput.trim(),
          phone: agentPhoneInput.trim() || null,
          email: agentEmailInput.trim() || null,
        });
        if (res.success) {
          setEditingAgent(null);
          await loadData();
        } else {
          setAgentError(res.error || 'Failed to update agent.');
        }
      } else {
        // Create
        const res = await createLeadAgent(activeBusiness.id, {
          name: agentNameInput.trim(),
          phone: agentPhoneInput.trim() || undefined,
          email: agentEmailInput.trim() || undefined,
        });
        if (res.success) {
          setShowAddAgentModal(false);
          setAgentNameInput('');
          setAgentPhoneInput('');
          setAgentEmailInput('');
          await loadData();
        } else {
          setAgentError(res.error || 'Failed to create agent.');
        }
      }
    } catch {
      setAgentError('An unexpected error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleAgentStatus = async (agent: LeadAgent) => {
    if (!canManage) return;
    await updateLeadAgent(agent.id, { is_active: !agent.is_active });
    await loadData();
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!canManage) return;
    if (confirm('Are you sure you want to remove this agent? Existing leads submitted by them will retain their attribution.')) {
      await deleteLeadAgent(agentId);
      await loadData();
    }
  };

  // Calculate leads count per agent
  const agentLeadCounts = React.useMemo(() => {
    const map: Record<string, number> = {};
    leads.forEach((l) => {
      if (l.agent_name) {
        const clean = l.agent_name.trim();
        map[clean] = (map[clean] || 0) + 1;
      }
    });
    return map;
  }, [leads]);

  // Filtered Agents
  const filteredAgents = agents.filter((a) => {
    const q = agentSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      a.name.toLowerCase().includes(q) ||
      (a.email && a.email.toLowerCase().includes(q)) ||
      (a.phone && a.phone.includes(q))
    );
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">
              Lead Entry & Agent Gateway
            </h1>
            <p className="text-xs text-[#64748B]">
              Public mobile lead capture link for field agents with automated CRM ingestion.
            </p>
          </div>
        </div>

        {form && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenForm}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0F172A] bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] rounded-xl shadow-2xs transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#4F46E5]" />
              <span>Open Public Form</span>
            </button>
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-xl shadow-2xs transition-colors"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy Form Link'}</span>
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-[#4F46E5]" />
          <span className="text-xs text-[#64748B]">Loading gateway settings...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Left Column: Public Link Card & Controls */}
          <div className="lg:col-span-2 space-y-6">
            {/* Form Configuration Card */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
              <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-[#0F172A]">Public Lead Entry Form</h2>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Share this secret link with lead-generation agents. No EcomHub OS login required.
                  </p>
                </div>
                <span
                  className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                    form?.is_active
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {form?.is_active ? 'Active' : 'Disabled'}
                </span>
              </div>

              <div className="p-5 space-y-4">
                {/* Link Box */}
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    Public Agent Link
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-mono text-[#0F172A] truncate">
                      {publicUrl}
                    </div>
                    <button
                      onClick={handleCopyLink}
                      className="px-3 py-2 bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-semibold text-[#0F172A] rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs shrink-0"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-[#4F46E5]" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-[#64748B] mt-1.5">
                    The token <code className="font-mono text-[#4F46E5]">{form?.token}</code>{' '}
                    routes leads directly into <strong className="text-[#0F172A]">{activeBusiness?.name}</strong>.
                  </p>
                </div>

                {/* Form Management Actions */}
                {canManage && (
                  <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleToggleActive}
                        disabled={actionLoading}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors flex items-center gap-1.5 ${
                          form?.is_active
                            ? 'bg-white hover:bg-rose-50 text-rose-600 border-rose-200'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>{form?.is_active ? 'Disable Form' : 'Enable Form'}</span>
                      </button>

                      <button
                        onClick={() => setShowRegenModal(true)}
                        disabled={actionLoading}
                        className="px-3 py-1.5 bg-white hover:bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                        <span>Regenerate Link</span>
                      </button>
                    </div>

                    <span className="text-[11px] text-[#94A3B8]">
                      Last updated: {new Date(form?.updated_at || Date.now()).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Agent Management Section */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
              <div className="p-5 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-[#0F172A]">Lead Agents</h2>
                    <span className="px-2 py-0.5 text-xs font-semibold bg-[#EEF2FF] text-[#4F46E5] rounded-full">
                      {agents.length}
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Agents listed here appear in the dropdown on the public lead entry form.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={agentSearch}
                      onChange={(e) => setAgentSearch(e.target.value)}
                      placeholder="Search agents..."
                      className="pl-8 pr-2.5 py-1 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[#0F172A] focus:outline-none focus:border-[#4F46E5] w-36 sm:w-44"
                    />
                  </div>

                  {canManage && (
                    <button
                      onClick={() => {
                        setEditingAgent(null);
                        setAgentNameInput('');
                        setAgentPhoneInput('');
                        setAgentEmailInput('');
                        setAgentError(null);
                        setShowAddAgentModal(true);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-xl shadow-2xs transition-colors flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Agent</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Agent List */}
              <div className="divide-y divide-[#E2E8F0]">
                {filteredAgents.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <Users className="w-8 h-8 text-[#94A3B8] mx-auto" />
                    <p className="text-xs font-medium text-[#64748B]">No agents found</p>
                    <p className="text-[11px] text-[#94A3B8]">
                      Add lead agents so they can be selected on the public form.
                    </p>
                  </div>
                ) : (
                  filteredAgents.map((agent) => {
                    const submittedCount = agentLeadCounts[agent.name.trim()] || 0;
                    return (
                      <div
                        key={agent.id}
                        className="p-4 flex items-center justify-between gap-3 hover:bg-[#F8FAFC] transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              agent.is_active
                                ? 'bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE]'
                                : 'bg-[#F1F5F9] text-[#94A3B8] border border-[#E2E8F0]'
                            }`}
                          >
                            {agent.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-[#0F172A] truncate">
                                {agent.name}
                              </p>
                              {!agent.is_active && (
                                <span className="px-1.5 py-0.2 text-[10px] font-semibold bg-slate-100 text-slate-500 rounded">
                                  Inactive
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-[#64748B] mt-0.5">
                              {agent.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-[#94A3B8]" />
                                  <span>{agent.phone}</span>
                                </span>
                              )}
                              {agent.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3 text-[#94A3B8]" />
                                  <span>{agent.email}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Lead Count & Actions */}
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right hidden sm:block">
                            <span className="text-xs font-bold text-[#0F172A]">
                              {submittedCount}
                            </span>
                            <span className="text-[10px] text-[#64748B] block">leads logged</span>
                          </div>

                          {canManage && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleToggleAgentStatus(agent)}
                                title={agent.is_active ? 'Deactivate agent' : 'Activate agent'}
                                className={`p-1.5 rounded-lg border transition-colors text-xs ${
                                  agent.is_active
                                    ? 'border-[#E2E8F0] text-[#64748B] hover:text-rose-600 hover:bg-rose-50'
                                    : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                                }`}
                              >
                                {agent.is_active ? (
                                  <XCircle className="w-3.5 h-3.5" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                )}
                              </button>

                              <button
                                onClick={() => {
                                  setEditingAgent(agent);
                                  setAgentNameInput(agent.name);
                                  setAgentPhoneInput(agent.phone || '');
                                  setAgentEmailInput(agent.email || '');
                                  setAgentError(null);
                                  setShowAddAgentModal(true);
                                }}
                                title="Edit agent"
                                className="p-1.5 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg transition-colors border border-transparent hover:border-[#E2E8F0]"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeleteAgent(agent.id)}
                                title="Delete agent"
                                className="p-1.5 text-[#94A3B8] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Workflow Overview & Mobile Simulator Tips */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8F0]">
                <Smartphone className="w-4 h-4 text-[#4F46E5]" />
                <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  Mobile Workflow for Agents
                </h3>
              </div>

              <div className="space-y-3 text-xs text-[#64748B]">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <strong className="text-[#0F172A] block font-semibold">Share the Link</strong>
                    Send the public form link to field agents, callers, or affiliate reps via WhatsApp or SMS.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <strong className="text-[#0F172A] block font-semibold">&lt; 30-Second Entry</strong>
                    Agents select their name from the dropdown, enter lead name & phone number, and submit.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <strong className="text-[#0F172A] block font-semibold">Instant CRM Dispatch</strong>
                    Lead is created in CRM with <span className="font-semibold text-[#0F172A]">Source = Agent</span>, activity logged, and immediate in-app notifications generated.
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E2E8F0] bg-[#F8FAFC] -mx-5 -mb-5 p-4 rounded-b-2xl">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 mb-1">
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Security & Isolation</span>
                </div>
                <p className="text-[11px] text-[#64748B] leading-relaxed">
                  Agents never have access to company finances, dashboards, client lists, or database credentials.
                </p>
              </div>
            </div>

            {/* Quick Test Card */}
            <div className="bg-[#EEF2FF] rounded-2xl border border-[#C7D2FE] p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#4F46E5]" />
                <h4 className="text-xs font-bold text-[#0F172A]">Test as an Agent</h4>
              </div>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Open the form in a new tab or incognito window to simulate the agent submission experience.
              </p>
              <button
                onClick={handleOpenForm}
                className="w-full py-2 bg-white hover:bg-slate-50 border border-[#C7D2FE] text-[#4F46E5] text-xs font-semibold rounded-xl shadow-2xs transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Launch Test Window</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Regenerate Form Link Warning */}
      {showRegenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-[#0F172A]">Regenerate Public Form Link?</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Generating a new link will <strong>immediately deactivate</strong> the current link. Any agents using the old link will no longer be able to submit leads until you send them the new link.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowRegenModal(false)}
                className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={actionLoading}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Yes, Regenerate Link</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add / Edit Agent */}
      {showAddAgentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">
                    {editingAgent ? 'Edit Lead Agent' : 'Add Lead Agent'}
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    For {activeBusiness?.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddAgentModal(false)}
                className="text-[#94A3B8] hover:text-[#0F172A] p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAgent} className="p-5 space-y-4">
              {agentError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {agentError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Agent Full Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={agentNameInput}
                  onChange={(e) => setAgentNameInput(e.target.value)}
                  placeholder="e.g. Ali Raza"
                  className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={agentPhoneInput}
                  onChange={(e) => setAgentPhoneInput(e.target.value)}
                  placeholder="+92 300 1234567"
                  className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={agentEmailInput}
                  onChange={(e) => setAgentEmailInput(e.target.value)}
                  placeholder="agent@company.com"
                  className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddAgentModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingAgent ? 'Save Changes' : 'Add Agent'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
