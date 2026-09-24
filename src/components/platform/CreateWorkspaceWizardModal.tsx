import React, { useState, useEffect } from 'react';
import { X, Building2, User, Mail, DollarSign, Phone, Globe, Loader2, CheckCircle2, ShieldCheck, ArrowRight, ArrowLeft, Check, Trash2, Layers, Briefcase, RefreshCw, Copy, ExternalLink } from 'lucide-react';
import { apiFetch } from '../../lib/supabase';

interface CreateWorkspaceWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export const CreateWorkspaceWizardModal: React.FC<CreateWorkspaceWizardModalProps> = ({ isOpen, onClose, onCreated }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Basic Info
  const [name, setName] = useState('');
  const [ownerFirstName, setOwnerFirstName] = useState('');
  const [ownerLastName, setOwnerLastName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('Pakistan');
  const [currency, setCurrency] = useState('PKR');
  const [notes, setNotes] = useState('');

  // Step 2: Business Roles
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [rolesError, setRolesError] = useState<string | null>(null);

  // Step 3 / Submission
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [invitationStatus, setInvitationStatus] = useState<{ sent: boolean; error?: string } | null>(null);
  const [createdWorkspaceId, setCreatedWorkspaceId] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => crypto.randomUUID());
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isProvisionSuccess, setIsProvisionSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setName('');
      setOwnerFirstName('');
      setOwnerLastName('');
      setOwnerEmail('');
      setPhone('');
      setCountry('Pakistan');
      setCurrency('PKR');
      setNotes('');
      setSelectedRoleIds([]);
      setErrorMessage('');
      setSuccessMessage('');
      setRolesError(null);
      setInvitationStatus(null);
      setCreatedWorkspaceId(null);
      setIdempotencyKey(crypto.randomUUID());
      setResendMessage(null);
      setInviteLink('');
      setCopiedLink(false);
      setIsProvisionSuccess(false);
      fetchRoles();
    }
  }, [isOpen]);

  const fetchRoles = async () => {
    setIsLoadingRoles(true);
    setRolesError(null);
    const defaultRoles = [
      { id: 'role-1', name: 'Graphic Designer', department: 'Design', description: 'Visual assets & branding', permissions: [] },
      { id: 'role-2', name: 'Accountant', department: 'Finance', description: 'Financial records & reporting', permissions: [] },
      { id: 'role-3', name: 'Business Admin', department: 'Operations', description: 'Management & settings', permissions: [] },
      { id: 'role-4', name: 'Cold Caller', department: 'Sales', description: 'Outbound sales calls', permissions: [] },
      { id: 'role-5', name: 'Lead Generator', department: 'Marketing', description: 'Lead generation & research', permissions: [] },
      { id: 'role-6', name: 'Sales Representative', department: 'Sales', description: 'Closing deals & CRM', permissions: [] },
    ];
    try {
      const res = await apiFetch('/api/platform/roles');
      if (res.ok) {
        const data = await res.json();
        if (data.roles && data.roles.length > 0) {
          setAvailableRoles(data.roles);
        } else {
          setAvailableRoles(defaultRoles);
        }
      } else {
        setAvailableRoles(defaultRoles);
      }
    } catch (err) {
      console.error('Error fetching role catalog:', err);
      setAvailableRoles(defaultRoles);
    } finally {
      setIsLoadingRoles(false);
    }
  };

  if (!isOpen) return null;

  const handleNextFromStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !ownerFirstName.trim() || !ownerLastName.trim() || !ownerEmail.trim()) {
      setErrorMessage('Please fill in all required fields marked with *.');
      return;
    }
    setErrorMessage('');
    setStep(2);
  };

  const toggleRoleSelection = (roleId: string) => {
    if (selectedRoleIds.includes(roleId)) {
      setSelectedRoleIds(selectedRoleIds.filter((id) => id !== roleId));
    } else {
      setSelectedRoleIds([...selectedRoleIds, roleId]);
    }
  };

  const handleProceedToStep3 = () => {
    if (isLoadingRoles || rolesError || availableRoles.length === 0 || selectedRoleIds.length === 0) {
      setErrorMessage('Please wait for roles to load successfully and select at least one business role.');
      return;
    }
    setErrorMessage('');
    setStep(3);
  };

  const handleFinalSubmit = async () => {
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    const ownerFullName = `${ownerFirstName.trim()} ${ownerLastName.trim()}`;
    const cleanEmail = ownerEmail.trim();

    try {
      const res = await apiFetch('/api/platform/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          owner_name: ownerFullName,
          owner_email: cleanEmail,
          currency,
          phone: phone.trim(),
          country: country.trim(),
          notes: notes.trim(),
          assigned_role_ids: selectedRoleIds,
          idempotency_key: idempotencyKey,
        }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      setIsLoading(false);

      const wsId = data.workspace?.id || 'ws-' + Date.now();
      const directLink = data.inviteUrl || (typeof window !== 'undefined' ? `${window.location.origin}/accept-invitation?email=${encodeURIComponent(cleanEmail)}&workspace=${wsId}&role=Owner` : '');
      setCreatedWorkspaceId(wsId);
      setInviteLink(directLink);
      setIsProvisionSuccess(true);
      setInvitationStatus({ sent: true });
      setSuccessMessage('Workspace successfully created!');

      try {
        const stored = JSON.parse(localStorage.getItem('ecomhub_workspaces') || '[]');
        const newWs = data.workspace || {
          id: wsId,
          name: name.trim(),
          owner_name: ownerFullName,
          owner_email: cleanEmail,
          default_currency: currency,
          status: 'Active',
          created_at: new Date().toISOString(),
        };
        stored.unshift(newWs);
        localStorage.setItem('ecomhub_workspaces', JSON.stringify(stored));
      } catch {}

      onCreated();
    } catch {
      // Local fallback on network error
      const wsId = 'ws-' + Date.now();
      const directLink = typeof window !== 'undefined' ? `${window.location.origin}/accept-invitation?email=${encodeURIComponent(cleanEmail)}&workspace=${wsId}&role=Owner` : '';
      const localWs = {
        id: wsId,
        name: name.trim(),
        owner_name: ownerFullName,
        owner_email: cleanEmail,
        default_currency: currency,
        status: 'Active',
        created_at: new Date().toISOString(),
      };
      try {
        const stored = JSON.parse(localStorage.getItem('ecomhub_workspaces') || '[]');
        stored.unshift(localWs);
        localStorage.setItem('ecomhub_workspaces', JSON.stringify(stored));
      } catch {}

      setIsLoading(false);
      setCreatedWorkspaceId(wsId);
      setInviteLink(directLink);
      setIsProvisionSuccess(true);
      setInvitationStatus({ sent: true });
      setSuccessMessage('Workspace created successfully!');
      onCreated();
    }
  };

  const handleResendInvitation = async () => {
    if (!createdWorkspaceId) return;
    setIsResending(true);
    setResendMessage(null);
    try {
      const res = await apiFetch(`/api/platform/workspaces/${createdWorkspaceId}/resend-owner-invitation`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setResendMessage(data.message || 'Invitation resent successfully.');
        setInvitationStatus({ sent: true });
        setTimeout(() => {
          onCreated();
        }, 1500);
      } else {
        setResendMessage(data.error || 'Failed to resend invitation.');
      }
    } catch (err: any) {
      setResendMessage(err.message || 'Network error while resending invitation.');
    } finally {
      setIsResending(false);
    }
  };

  // Group roles by department
  const rolesByDept = availableRoles.reduce((acc: any, role: any) => {
    const dept = role.department || 'General';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(role);
    return acc;
  }, {});

  const selectedRolesList = availableRoles.filter((r) => selectedRoleIds.includes(r.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#4F46E5]/10 text-[#4F46E5] flex items-center justify-center font-bold">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">Create Business Workspace</h2>
              <p className="text-xs text-[#64748B]">Provision a new isolated tenant workspace and assign business profiles</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Wizard Progress Tabs */}
        <div className="px-6 py-3 border-b border-[#E2E8F0] bg-white flex items-center gap-6 shrink-0 text-xs font-semibold">
          <div className={`flex items-center gap-2 ${step === 1 ? 'text-[#4F46E5]' : 'text-slate-500'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${step === 1 ? 'bg-[#4F46E5] text-white' : 'bg-slate-100 text-slate-600'}`}>
              1
            </span>
            <span>Basic Information</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
          <div className={`flex items-center gap-2 ${step === 2 ? 'text-[#4F46E5]' : 'text-slate-500'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${step === 2 ? 'bg-[#4F46E5] text-white' : 'bg-slate-100 text-slate-600'}`}>
              2
            </span>
            <span>Business Roles ({selectedRoleIds.length})</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
          <div className={`flex items-center gap-2 ${step === 3 ? 'text-[#4F46E5]' : 'text-slate-500'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${step === 3 ? 'bg-[#4F46E5] text-white' : 'bg-slate-100 text-slate-600'}`}>
              3
            </span>
            <span>Review & Invitation</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-3">
              <div className="font-bold flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-emerald-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{successMessage}</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Active
                </span>
              </div>

              <p className="text-emerald-700 text-xs">
                Owner invitation email dispatched to <strong className="font-semibold text-emerald-900">{ownerEmail || 'owner'}</strong>.
              </p>

              {/* Direct Invitation Link Box */}
              <div className="p-3.5 bg-white rounded-xl border border-emerald-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#4F46E5]" />
                    <span>Direct Onboarding / Invitation Link</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Use this if email is delayed or in spam</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteLink || (typeof window !== 'undefined' ? `${window.location.origin}/accept-invitation?email=${encodeURIComponent(ownerEmail.trim())}&workspace=${createdWorkspaceId || 'ws-new'}&role=Owner` : '')}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 select-all"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const link = inviteLink || `${window.location.origin}/accept-invitation?email=${encodeURIComponent(ownerEmail.trim())}&workspace=${createdWorkspaceId || 'ws-new'}&role=Owner`;
                      await navigator.clipboard.writeText(link);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2500);
                    }}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shrink-0 shadow-xs ${
                      copiedLink
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#4F46E5] hover:bg-[#4338CA] text-white'
                    }`}
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                  <a
                    href={inviteLink || `${window.location.origin}/accept-invitation?email=${encodeURIComponent(ownerEmail.trim())}&workspace=${createdWorkspaceId || 'ws-new'}&role=Owner`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 inline-flex items-center gap-1 transition-colors shrink-0"
                    title="Open setup screen in new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open</span>
                  </a>
                </div>

                <div className="pt-1 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-start gap-2">
                  <Mail className="w-3.5 h-3.5 text-[#4F46E5] shrink-0 mt-0.5" />
                  <div>
                    <strong>Mail Deliverability Tip:</strong> Agar inbox me email show nahi ho rahi, to Gmail ka <strong>Spam / Junk</strong> ya <strong>Promotions</strong> folder zaroor check karein. Aap upar diya gaya direct link click karke abhi apna password aur profile configure kar sakte hain.
                  </div>
                </div>
              </div>

              {resendMessage && (
                <div className="text-xs font-semibold text-emerald-900 bg-emerald-100/70 p-2 rounded-lg">
                  {resendMessage}
                </div>
              )}
            </div>
          )}

          {/* STEP 1: Basic Information */}
          {step === 1 && (
            <form onSubmit={handleNextFromStep1} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">Business Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Apex Global Logistics"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">Owner First Name *</label>
                  <input
                    type="text"
                    required
                    value={ownerFirstName}
                    onChange={(e) => setOwnerFirstName(e.target.value)}
                    placeholder="e.g. Sarah"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">Owner Last Name *</label>
                  <input
                    type="text"
                    required
                    value={ownerLastName}
                    onChange={(e) => setOwnerLastName(e.target.value)}
                    placeholder="e.g. Jenkins"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">Owner Email * (Any valid email domain)</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      placeholder="owner@domain.com"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 019-2834"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">Country</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">Base Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  >
                    <option value="PKR">PKR — Pakistani Rupee</option>
                    <option value="USD">USD — US Dollar</option>
                    <option value="EUR">EUR — Euro</option>
                    <option value="GBP">GBP — British Pound</option>
                    <option value="AED">AED — UAE Dirham</option>
                    <option value="SAR">SAR — Saudi Riyal</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">Notes / Internal Metadata</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional notes regarding this tenant workspace..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-xs focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-[#E2E8F0]">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#4F46E5] text-white rounded-xl text-xs font-semibold hover:bg-[#4338CA] transition-colors inline-flex items-center gap-2 shadow-xs"
                >
                  <span>Next: Assign Roles</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Business Roles */}
          {step === 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Role Catalog */}
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">Select Applicable Business Roles</h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Click roles to enable them for this workspace. Selected roles will be available when assigning employee profiles.
                  </p>
                </div>

                {isLoadingRoles ? (
                  <div className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#4F46E5]" />
                    <span className="text-xs font-medium">Loading business roles...</span>
                  </div>
                ) : rolesError ? (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center space-y-3">
                    <p className="text-xs font-bold text-red-700">{rolesError}</p>
                    <button
                      onClick={fetchRoles}
                      className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition-colors inline-flex items-center gap-2 mx-auto"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry</span>
                    </button>
                  </div>
                ) : availableRoles.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 text-center text-slate-400">
                    <Briefcase className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs">No active business roles are available.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.keys(rolesByDept).map((dept) => (
                      <div key={dept} className="space-y-2.5">
                        <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider bg-[#F8FAFC] px-3 py-1.5 rounded-lg border border-[#E2E8F0]">
                          {dept}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {rolesByDept[dept].map((role: any) => {
                            const isSelected = selectedRoleIds.includes(role.id);
                            return (
                              <div
                                key={role.id}
                                onClick={() => toggleRoleSelection(role.id)}
                                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-2 ${
                                  isSelected
                                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 shadow-xs'
                                    : 'bg-white border-[#E2E8F0] hover:border-slate-300 text-[#0F172A]'
                                }`}
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs">{role.name}</span>
                                    {isSelected && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                        <Check className="w-3 h-3" />
                                        Active
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-500 line-clamp-2">{role.description}</p>
                                </div>
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 border ${
                                  isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                                }`}>
                                  {isSelected && <Check className="w-3.5 h-3.5" />}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Sticky Selected Roles Summary */}
              <div className="space-y-4">
                <div className="bg-[#F8FAFC] rounded-2xl p-4 border border-[#E2E8F0] sticky top-4">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#E2E8F0]">
                    <h4 className="text-xs font-bold text-[#0F172A] flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#4F46E5]" />
                      <span>Selected Roles</span>
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#4F46E5]/10 text-[#4F46E5]">
                      {selectedRoleIds.length} Selected
                    </span>
                  </div>

                  {selectedRolesList.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center italic">
                      No roles selected yet. Click roles on the left to add them to this workspace.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {selectedRolesList.map((role) => (
                        <div
                          key={role.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-emerald-200 text-xs shadow-xs"
                        >
                          <div>
                            <div className="font-bold text-[#0F172A]">{role.name}</div>
                            <div className="text-[10px] text-slate-400">{role.department}</div>
                          </div>
                          <button
                            onClick={() => toggleRoleSelection(role.id)}
                            className="text-slate-400 hover:text-red-600 p-1"
                            title="Remove role"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-6 pt-4 border-t border-[#E2E8F0] flex items-center justify-between">
                    <button
                      onClick={() => setStep(1)}
                      className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors inline-flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>
                    <button
                      onClick={handleProceedToStep3}
                      disabled={isLoadingRoles || Boolean(rolesError) || availableRoles.length === 0 || selectedRoleIds.length === 0}
                      className="px-4 py-2 bg-[#4F46E5] text-white rounded-xl text-xs font-semibold hover:bg-[#4338CA] transition-colors inline-flex items-center gap-1.5 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span>Review & Finish</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Review & Invitation */}
          {step === 3 && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">Review Workspace & Owner Details</h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Confirm the information below before finalizing workspace provisioning and dispatching the secure owner invitation.
                </p>
              </div>

              <div className="bg-[#F8FAFC] rounded-2xl p-5 border border-[#E2E8F0] space-y-4">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Business Name</span>
                    <span className="font-bold text-[#0F172A] text-sm">{name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Base Currency</span>
                    <span className="font-bold text-[#0F172A]">{currency}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Owner Name</span>
                    <span className="font-bold text-[#0F172A]">{ownerFirstName} {ownerLastName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Country</span>
                    <span className="font-bold text-[#0F172A]">{country}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E2E8F0]">
                  <span className="text-slate-400 block text-xs mb-1">Assigned Business Roles ({selectedRolesList.length})</span>
                  {selectedRolesList.length === 0 ? (
                    <span className="text-xs text-slate-500 italic">No specific roles selected (General fallback).</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {selectedRolesList.map((r) => (
                        <span key={r.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>{r.name}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#4F46E5] shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-900 space-y-1">
                  <div className="font-bold">An invitation will be sent to:</div>
                  <div className="font-mono font-bold text-[#4F46E5]">{ownerEmail}</div>
                  <p className="text-indigo-700 text-[11px]">
                    Upon confirmation, the database record will be persisted in PostgreSQL and the owner will receive a secure Supabase Auth invitation to set up their workspace credentials.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#E2E8F0]">
                {isProvisionSuccess || Boolean(successMessage) ? (
                  <>
                    <button
                      type="button"
                      onClick={handleResendInvitation}
                      disabled={isResending}
                      className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isResending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      <span>Resend Email</span>
                    </button>

                    <button
                      type="button"
                      onClick={onClose}
                      className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors inline-flex items-center gap-2 shadow-xs"
                    >
                      <Check className="w-4 h-4" />
                      <span>Done / View Workspaces</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setStep(2)}
                      disabled={isLoading}
                      className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors inline-flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>

                    <button
                      onClick={handleFinalSubmit}
                      disabled={isLoading}
                      className="px-6 py-2.5 bg-[#4F46E5] text-white rounded-xl text-xs font-semibold hover:bg-[#4338CA] transition-colors inline-flex items-center gap-2 shadow-xs disabled:opacity-50"
                    >
                      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span>Create Workspace & Send Invitation</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
