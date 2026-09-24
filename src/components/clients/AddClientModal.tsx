import React, { useState } from 'react';
import { X, Building2, User, Mail, Phone, Globe } from 'lucide-react';
import { useCrm } from '../../lib/crm-context';
import { useAuth } from '../../lib/auth-context';
import { ClientStatus } from '../../types';
import { SUPPORTED_CURRENCIES, resolveCurrency } from '../../lib/currencies';

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientAdded?: (clientId: string) => void;
}

export const AddClientModal: React.FC<AddClientModalProps> = ({
  isOpen,
  onClose,
  onClientAdded,
}) => {
  const { addClient, addClientContact } = useCrm();
  const { activeBusiness, members, user } = useAuth();

  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState('');
  const [preferredCurrency, setPreferredCurrency] = useState(resolveCurrency(activeBusiness?.default_currency));
  const [status, setStatus] = useState<ClientStatus>('Active');
  const [accountManagerId, setAccountManagerId] = useState(user?.id || '');

  // Primary Contact
  const [primaryContactName, setPrimaryContactName] = useState('');
  const [primaryContactEmail, setPrimaryContactEmail] = useState('');
  const [primaryContactPhone, setPrimaryContactPhone] = useState('');
  const [primaryContactRole, setPrimaryContactRole] = useState('Primary Stakeholder');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setErrorMsg('Company name is required');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const res = await addClient({
      company_name: companyName.trim(),
      website: website.trim() || null,
      industry: industry.trim() || null,
      billing_email: primaryContactEmail.trim() || null,
      phone: primaryContactPhone.trim() || null,
      preferred_currency: preferredCurrency,
      status,
      account_manager_id: accountManagerId || null,
      total_revenue: 0,
    });

    if (res.success && res.client) {
      // If contact name provided, attach primary contact
      if (primaryContactName.trim()) {
        await addClientContact({
          client_id: res.client.id,
          name: primaryContactName.trim(),
          email: primaryContactEmail.trim() || null,
          phone: primaryContactPhone.trim() || null,
          role: primaryContactRole.trim() || null,
          is_primary: true,
        });
      }

      setIsSubmitting(false);
      onClose();
      if (onClientAdded) onClientAdded(res.client.id);
    } else {
      setIsSubmitting(false);
      setErrorMsg(res.error || 'Failed to create client.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">Add New Client Account</h3>
              <p className="text-[11px] text-[#64748B]">Enroll an active client organization</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#64748B] hover:text-[#0F172A] rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          <div className="space-y-3">
            <h4 className="font-bold text-[#0F172A] uppercase tracking-wider text-[11px]">
              Company Information
            </h4>

            <div>
              <label className="block font-semibold text-[#0F172A] mb-1">
                Company Name *
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Brands International"
                className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Website</label>
                <input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://brand.com"
                  className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Industry</label>
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. eCommerce Fashion"
                  className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">
                  Preferred Currency
                </label>
                <select
                  value={preferredCurrency}
                  onChange={(e) => setPreferredCurrency(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl font-semibold text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Account Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ClientStatus)}
                  className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl font-semibold text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                >
                  <option value="Active">Active</option>
                  <option value="Onboarding">Onboarding</option>
                  <option value="Paused">Paused</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#0F172A] mb-1">Account Manager</label>
              <select
                value={accountManagerId}
                onChange={(e) => setAccountManagerId(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
              >
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.profile?.full_name || m.profile?.email}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-[#E2E8F0]">
            <h4 className="font-bold text-[#0F172A] uppercase tracking-wider text-[11px]">
              Primary Contact Person (Optional)
            </h4>

            <div>
              <label className="block font-semibold text-[#0F172A] mb-1">Contact Name</label>
              <input
                type="text"
                value={primaryContactName}
                onChange={(e) => setPrimaryContactName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Email</label>
                <input
                  type="email"
                  value={primaryContactEmail}
                  onChange={(e) => setPrimaryContactEmail(e.target.value)}
                  placeholder="john@brand.com"
                  className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Phone</label>
                <input
                  type="text"
                  value={primaryContactPhone}
                  onChange={(e) => setPrimaryContactPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                />
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl">
              {errorMsg}
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 font-medium text-[#64748B] hover:text-[#0F172A] rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-60 rounded-xl transition-colors shadow-2xs"
            >
              {isSubmitting ? 'Creating...' : 'Create Client Workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
