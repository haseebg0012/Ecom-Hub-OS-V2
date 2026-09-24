/**
 * EcomHub OS — Public Lead Entry Form for Lead-Generation Agents
 * Optimized for mobile (<30s submission), zero login required, secure token lookup.
 */

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  User,
  Phone,
  Building,
  Mail,
  FileText,
  Briefcase,
  Search,
  ArrowRight,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import {
  verifyPublicFormToken,
  submitPublicLead,
} from '../../lib/lead-entry-service';
import { PublicFormConfig, PublicLeadEntryPayload } from '../../types';

const POPULAR_SERVICES = [
  'Meta Ads',
  'Google Ads',
  'Social Media Marketing',
  'Website Development',
  'SEO',
  'E-commerce',
  'Branding',
  'Other',
];

interface PublicLeadEntryFormProps {
  token: string;
}

export const PublicLeadEntryForm: React.FC<PublicLeadEntryFormProps> = ({ token }) => {
  const [formConfig, setFormConfig] = useState<PublicFormConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState<boolean>(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const [formStatus, setFormStatus] = useState<'active' | 'inactive' | 'invalid'>('active');

  // Form Fields
  const [leadName, setLeadName] = useState('');
  const [phone, setPhone] = useState('');
  const [agentSelection, setAgentSelection] = useState<string>('');
  const [customAgentName, setCustomAgentName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [service, setService] = useState('Meta Ads');
  const [sourceDetail, setSourceDetail] = useState('');
  const [notes, setNotes] = useState('');
  const [honeypot, setHoneypot] = useState(''); // Bot trap

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    matches: string[];
    message: string;
  } | null>(null);
  const [submittedLead, setSubmittedLead] = useState<{
    name: string;
    agentName: string;
  } | null>(null);

  // Load Form Metadata using Token
  const loadConfig = async () => {
    setLoadingConfig(true);
    setConfigError(null);
    try {
      // First try server endpoint
      let verified: any = null;
      try {
        const res = await fetch(`/api/public/lead-entry?token=${encodeURIComponent(token)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.valid && data.config) {
            verified = { valid: true, status: 'active', config: data.config };
          }
        }
      } catch {
        // Fallback to client-side service verification
      }

      if (!verified) {
        verified = await verifyPublicFormToken(token);
      }

      if (verified.valid && verified.config) {
        setFormConfig(verified.config);
        setFormStatus('active');
        // If agents exist, select first by default, otherwise prompt manual entry
        if (verified.config.agents.length > 0) {
          setAgentSelection(verified.config.agents[0].name);
        } else {
          setAgentSelection('__OTHER__');
        }
      } else {
        setFormStatus(verified.status);
        setConfigError(verified.error || 'This lead form is unavailable.');
      }
    } catch {
      setConfigError('Unable to load lead entry form. Please check your network connection.');
      setFormStatus('invalid');
    } finally {
      setLoadingConfig(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, [token]);

  // Compute active agent name
  const resolvedAgentName =
    agentSelection === '__OTHER__' ? customAgentName.trim() : agentSelection.trim();

  // Reset form to submit another lead
  const handleResetForAnother = () => {
    setLeadName('');
    setPhone('');
    setCompany('');
    setEmail('');
    setService('Meta Ads');
    setSourceDetail('');
    setNotes('');
    setFormError(null);
    setDuplicateWarning(null);
    setSubmittedLead(null);
    // Keep the agent selected for fast consecutive submissions!
  };

  const handleSubmit = async (e: React.FormEvent, forceDuplicate = false) => {
    if (e) e.preventDefault();
    setFormError(null);

    // Validation
    if (!leadName.trim()) {
      setFormError('Please enter the lead name.');
      return;
    }
    if (!phone.trim()) {
      setFormError('Please enter a valid contact phone number.');
      return;
    }
    if (!resolvedAgentName) {
      setFormError('Please select or specify your Agent Name.');
      return;
    }

    setIsSubmitting(true);

    const payload: PublicLeadEntryPayload & { force_duplicate_submit?: boolean } = {
      form_token: token,
      name: leadName.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      company: company.trim() || undefined,
      service,
      agent_name: resolvedAgentName,
      source_detail: sourceDetail.trim() || undefined,
      notes: notes.trim() || undefined,
      honeypot: honeypot.trim() || undefined,
      force_duplicate_submit: forceDuplicate,
    };

    try {
      // 1. Try server endpoint
      let response: any = null;
      try {
        const res = await fetch('/api/public/lead-entry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          response = await res.json();
        } else if (res.status === 409) {
          const conflictData = await res.json();
          response = {
            success: false,
            isDuplicate: true,
            error: conflictData.error || 'This lead may already exist in the system.',
            duplicateMatches: conflictData.duplicateMatches || [],
          };
        }
      } catch {
        // Fallback to internal service engine
      }

      // 2. Fallback to client-side service execution
      if (!response) {
        response = await submitPublicLead(payload);
      }

      if (response.success) {
        setDuplicateWarning(null);
        setSubmittedLead({
          name: leadName.trim(),
          agentName: resolvedAgentName,
        });
      } else if (response.isDuplicate) {
        setDuplicateWarning({
          message: response.error || 'This lead may already exist in the system.',
          matches: response.duplicateMatches || [
            'A lead with this phone number or email is already registered in CRM.',
          ],
        });
      } else {
        setFormError(response.error || 'Failed to submit lead. Please verify the information.');
      }
    } catch {
      setFormError('Something went wrong. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading State
  if (loadingConfig) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-8 max-w-sm w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center mx-auto">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">Loading Lead Form...</h2>
            <p className="text-xs text-[#64748B] mt-1">Verifying secure agent credentials</p>
          </div>
        </div>
      </div>
    );
  }

  // Error / Disabled Form State
  if (configError || formStatus !== 'active' || !formConfig) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-8 max-w-md w-full text-center space-y-5">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#0F172A]">
              {formStatus === 'inactive' ? 'This lead form has been disabled.' : 'This lead form is unavailable.'}
            </h1>
            <p className="text-xs text-[#64748B] mt-2 leading-relaxed">
              {configError ||
                'The link you used is inactive, expired, or invalid. Please request a refreshed link from your business administrator.'}
            </p>
          </div>
          <button
            onClick={loadConfig}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-xs font-semibold text-[#0F172A] rounded-xl transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  // SUCCESS SCREEN
  if (submittedLead) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 sm:p-8 max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-[#0F172A] tracking-tight">
              Lead Submitted Successfully
            </h2>
            <p className="text-xs text-[#64748B]">
              The lead has been securely routed into the business CRM.
            </p>
          </div>

          <div className="bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] p-4 text-left space-y-2.5 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <span className="text-[#64748B]">Lead Name</span>
              <span className="font-bold text-[#0F172A]">{submittedLead.name}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <span className="text-[#64748B]">Agent Name</span>
              <span className="font-bold text-[#4F46E5]">{submittedLead.agentName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#64748B]">Assigned Source</span>
              <span className="px-2 py-0.5 rounded font-semibold bg-emerald-100 text-emerald-800 text-[11px]">
                Agent
              </span>
            </div>
          </div>

          <button
            onClick={handleResetForAnother}
            className="w-full py-3 px-4 bg-[#4F46E5] hover:bg-[#4338CA] active:scale-[0.99] text-white text-sm font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
          >
            <span>Submit Another Lead</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ACTIVE SUBMISSION FORM
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-6 px-4 sm:px-6">
      <div className="max-w-md w-full mx-auto">
        {/* Centered Minimal Brand Card */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          {/* Header */}
          <div className="p-6 pb-4 border-b border-[#E2E8F0] text-center bg-linear-to-b from-white to-[#F8FAFC]/50">
            {formConfig.business_logo ? (
              <img
                src={formConfig.business_logo}
                alt={formConfig.business_name}
                className="w-12 h-12 object-contain mx-auto mb-2 rounded-lg"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-[#4F46E5] text-white flex items-center justify-center font-bold text-sm mx-auto mb-2.5 shadow-xs">
                EH
              </div>
            )}
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[#4F46E5]">
                <span>{formConfig.business_name || 'EcomHub OS'}</span>
              </div>
              <h1 className="text-xl font-bold text-[#0F172A] tracking-tight mt-0.5">
                Lead Entry
              </h1>
              <p className="text-xs text-[#64748B] mt-0.5">
                Submit a new lead
              </p>
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={(e) => handleSubmit(e, false)} className="p-6 space-y-4">
            {/* Honeypot field (hidden from legitimate users, catches spam bots) */}
            <input
              type="text"
              name="ecomhub_trap_field"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              className="hidden pointer-events-none"
              aria-hidden="true"
            />

            {/* Error Notification */}
            {formError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            {/* Duplicate Lead Detection Warning */}
            {duplicateWarning && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2 animate-in fade-in duration-150">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <strong className="font-semibold block">{duplicateWarning.message}</strong>
                    <ul className="mt-1 space-y-0.5 text-[11px] list-disc list-inside text-amber-800">
                      {duplicateWarning.matches.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="pt-2 border-t border-amber-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDuplicateWarning(null)}
                    className="px-2.5 py-1 text-[11px] font-medium text-amber-800 hover:text-amber-950 rounded hover:bg-amber-100"
                  >
                    Edit Information
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleSubmit(e, true)}
                    disabled={isSubmitting}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] rounded-lg shadow-2xs transition-colors"
                  >
                    Submit Anyway
                  </button>
                </div>
              </div>
            )}

            {/* 1. Lead Name (Required) */}
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Lead Name <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  placeholder="Enter lead name"
                  className="w-full pl-10 pr-3 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-sm font-medium text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-all"
                />
              </div>
            </div>

            {/* 2. Phone Number (Required) */}
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Phone <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+92 300 1234567"
                  className="w-full pl-10 pr-3 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-sm font-medium text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-all"
                />
              </div>
            </div>

            {/* 3. Agent Name (Required - Dropdown with Active Agents + Manual Entry) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#0F172A]">
                Agent Name <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <select
                  value={agentSelection}
                  onChange={(e) => setAgentSelection(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-sm font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-all"
                >
                  {formConfig.agents.length > 0 ? (
                    <optgroup label="Registered Agents">
                      {formConfig.agents.map((agent) => (
                        <option key={agent.id} value={agent.name}>
                          {agent.name}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                  <option value="__OTHER__">Other / Enter manually</option>
                </select>
              </div>

              {/* If "Other / Enter manually" is chosen */}
              {agentSelection === '__OTHER__' && (
                <div className="pt-1 animate-in fade-in duration-150">
                  <input
                    type="text"
                    required
                    value={customAgentName}
                    onChange={(e) => setCustomAgentName(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-sm font-medium text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                  />
                  <p className="text-[11px] text-[#64748B] mt-1">
                    Enter your name as it should appear in the CRM record.
                  </p>
                </div>
              )}
            </div>

            {/* 4. Company (Optional) */}
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Company <span className="text-[#94A3B8] font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                  <Building className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Company name"
                  className="w-full pl-10 pr-3 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-sm font-medium text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-all"
                />
              </div>
            </div>

            {/* 5. Email (Optional) */}
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Email <span className="text-[#94A3B8] font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#94A3B8]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full pl-10 pr-3 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-sm font-medium text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-all"
                />
              </div>
            </div>

            {/* 6. Interested Service (Dropdown) */}
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Interested Service
              </label>
              <div className="relative">
                <select
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-sm font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] transition-all"
                >
                  {POPULAR_SERVICES.map((srv) => (
                    <option key={srv} value={srv}>
                      {srv}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 7. Lead Source Detail (Optional) */}
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Lead Source Detail <span className="text-[#94A3B8] font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={sourceDetail}
                onChange={(e) => setSourceDetail(e.target.value)}
                placeholder="Where did you find this lead?"
                className="w-full px-3.5 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#4F46E5]"
              />
            </div>

            {/* 8. Notes (Optional textarea) */}
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Notes <span className="text-[#94A3B8] font-normal">(Optional)</span>
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional information..."
                className="w-full px-3.5 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] resize-none"
              />
            </div>

            {/* Large Mobile-Friendly Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 bg-[#4F46E5] hover:bg-[#4338CA] active:scale-[0.99] text-white text-sm font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Lead...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Lead</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer Security Badge */}
          <div className="py-3 px-6 bg-[#F8FAFC] border-t border-[#E2E8F0] text-center">
            <p className="text-[11px] text-[#94A3B8] flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Protected by EcomHub OS Secure Agent Gateway</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
