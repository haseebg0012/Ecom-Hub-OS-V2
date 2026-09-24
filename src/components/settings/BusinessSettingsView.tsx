import React, { useState, useEffect } from 'react';
import { Building2, Check, Loader2, Globe, Mail, Phone, MapPin, DollarSign, ShieldAlert, Smartphone, ArrowRight, Trash2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { SUPPORTED_CURRENCIES, resolveCurrency } from '../../lib/currencies';

interface BusinessSettingsViewProps {
  onNavigate?: (section: string) => void;
}

export const BusinessSettingsView: React.FC<BusinessSettingsViewProps> = ({ onNavigate }) => {
  const { activeBusiness, updateBusiness, deleteBusiness } = useAuth();

  const [name, setName] = useState(activeBusiness?.name || '');
  const [email, setEmail] = useState(activeBusiness?.email || '');
  const [phone, setPhone] = useState(activeBusiness?.phone || '');
  const [website, setWebsite] = useState(activeBusiness?.website || '');
  const [address, setAddress] = useState(activeBusiness?.address || '');
  const [currency, setCurrency] = useState(resolveCurrency(activeBusiness?.default_currency));
  const [logo, setLogo] = useState(activeBusiness?.logo || '');

  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmNameInput, setConfirmNameInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const canEdit = activeBusiness?.role === 'Owner' || activeBusiness?.role === 'Admin';
  const isOwner = activeBusiness?.role === 'Owner';

  // Sync state if active business changes
  useEffect(() => {
    if (activeBusiness) {
      setName(activeBusiness.name || '');
      setEmail(activeBusiness.email || '');
      setPhone(activeBusiness.phone || '');
      setWebsite(activeBusiness.website || '');
      setAddress(activeBusiness.address || '');
      setCurrency(resolveCurrency(activeBusiness.default_currency));
      setLogo(activeBusiness.logo || '');
    }
  }, [activeBusiness]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      setStatusMessage({ type: 'error', text: 'You need an Owner or Admin role to edit business settings.' });
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    const res = await updateBusiness({
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      website: website.trim() || null,
      address: address.trim() || null,
      default_currency: currency,
      logo: logo.trim() || null,
    });

    setIsSaving(false);
    if (res.success) {
      setStatusMessage({ type: 'success', text: 'Business settings updated successfully!' });
      setTimeout(() => setStatusMessage(null), 3000);
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Failed to update settings.' });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">
              Business Settings
            </h1>
            <p className="text-xs text-[#64748B]">
              Configure organization profile, contact metadata, and default currency.
            </p>
          </div>
        </div>
      </div>

      {onNavigate && (
        <div className="bg-[#EEF2FF]/60 p-4 rounded-2xl border border-[#C7D2FE] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#4F46E5] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#0F172A]">Public Lead Entry & Agent Gateway</h3>
              <p className="text-[11px] text-[#64748B]">
                Configure secure mobile links for lead-generation agents and manage agent names.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('lead-entry-settings')}
            className="px-3.5 py-1.5 bg-white border border-[#C7D2FE] text-[#4F46E5] hover:bg-[#EEF2FF] text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-2xs whitespace-nowrap"
          >
            <span>Manage Lead Form</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {!canEdit && (
        <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            You are currently viewing this business with the <strong className="font-semibold">{activeBusiness?.role}</strong> role. Only Owners and Admins have permission to modify organizational settings.
          </span>
        </div>
      )}

      {statusMessage && (
        <div
          className={`p-3.5 rounded-lg text-xs flex items-center gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {statusMessage.type === 'success' && <Check className="w-4 h-4 text-green-600" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSave} className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
              Business Name *
            </label>
            <input
              type="text"
              required
              disabled={!canEdit}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:border-[#4F46E5] disabled:bg-[#F8FAFC] disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
              Default Currency
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
                <DollarSign className="w-4 h-4" />
              </div>
              <select
                disabled={!canEdit}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:border-[#4F46E5] disabled:bg-[#F8FAFC] disabled:cursor-not-allowed"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
              Business Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                disabled={!canEdit}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@business.com"
                className="w-full pl-9 pr-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#4F46E5] disabled:bg-[#F8FAFC] disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
              Business Phone
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="tel"
                disabled={!canEdit}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full pl-9 pr-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#4F46E5] disabled:bg-[#F8FAFC] disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
              Website URL
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
                <Globe className="w-4 h-4" />
              </div>
              <input
                type="url"
                disabled={!canEdit}
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://business.com"
                className="w-full pl-9 pr-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#4F46E5] disabled:bg-[#F8FAFC] disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
              Logo Asset URL
            </label>
            <input
              type="url"
              disabled={!canEdit}
              value={logo}
              onChange={(e) => setLogo(e.target.value)}
              placeholder="https://domain.com/logo.png"
              className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#4F46E5] disabled:bg-[#F8FAFC] disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
            Physical / Office Address
          </label>
          <div className="relative">
            <div className="absolute top-2.5 left-3 pointer-events-none text-[#94A3B8]">
              <MapPin className="w-4 h-4" />
            </div>
            <textarea
              rows={2}
              disabled={!canEdit}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Suite, Street, City, State, Country"
              className="w-full pl-9 pr-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#4F46E5] disabled:bg-[#F8FAFC] disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Database Identity Metadata */}
        <div className="pt-2 border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[#94A3B8] gap-2">
          <span>Tenant UUID: <code className="font-mono text-[#0F172A]">{activeBusiness?.id}</code></span>
          <span>Created: {new Date(activeBusiness?.created_at || Date.now()).toLocaleDateString()}</span>
        </div>

        {canEdit && (
          <div className="pt-3 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <span>Save Business Profile</span>
              )}
            </button>
          </div>
        )}
      </form>

      {/* Danger Zone for Owners */}
      {isOwner && activeBusiness && (
        <div className="bg-white rounded-xl border border-rose-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-rose-100 bg-rose-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-rose-900">Danger Zone: Delete Workspace</h3>
                <p className="text-xs text-rose-700">Irreversible workspace termination and tenant data purging.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setConfirmNameInput('');
                setShowDeleteModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-rose-700 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-300 rounded-lg transition-colors shadow-2xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete This Workspace</span>
            </button>
          </div>
          <div className="p-5 text-xs text-slate-600 leading-relaxed">
            Deleting this workspace will permanently erase its isolated database records, transactions, invoices, client leads, and team access.
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && activeBusiness && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm Permanent Deletion</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              To confirm deletion, please type the business name <strong className="text-slate-900 underline font-bold">{activeBusiness.name}</strong> below:
            </p>

            <input
              type="text"
              value={confirmNameInput}
              onChange={(e) => setConfirmNameInput(e.target.value)}
              placeholder={activeBusiness.name}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-rose-500"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting || confirmNameInput.trim().toLowerCase() !== activeBusiness.name.trim().toLowerCase()}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    const res = await deleteBusiness(activeBusiness.id);
                    if (res.success) {
                      window.location.href = '/dashboard';
                    } else {
                      alert(res.error || 'Failed to delete workspace.');
                    }
                  } catch (e: any) {
                    alert(e.message || 'Failed to delete workspace.');
                  } finally {
                    setIsDeleting(false);
                    setShowDeleteModal(false);
                  }
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Permanently Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
