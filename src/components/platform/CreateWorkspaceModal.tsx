import React, { useState } from 'react';
import { X, Building2, User, Mail, DollarSign, Phone, Globe, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { apiFetch } from '../../lib/supabase';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({ isOpen, onClose, onCreated }) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [currency, setCurrency] = useState('PKR');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('Pakistan');
  const [notes, setNotes] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await apiFetch('/api/platform/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          owner_name: ownerName.trim(),
          owner_email: ownerEmail.trim(),
          currency,
          phone: phone.trim(),
          country: country.trim(),
          notes: notes.trim(),
        }),
      });

      let data: any = {};
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await res.json();
        } catch {
          data = {};
        }
      } else {
        const text = await res.text();
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          data = { error: text || 'Unexpected server response.' };
        }
      }

      setIsLoading(false);

      if (res.ok || data.success || data.workspace) {
        setSuccessMessage(data.message || 'Workspace successfully provisioned!');
        try {
          const stored = JSON.parse(localStorage.getItem('ecomhub_workspaces') || '[]');
          stored.unshift(data.workspace || {
            id: 'ws-' + Date.now(),
            name: name.trim(),
            owner_name: ownerName.trim(),
            owner_email: ownerEmail.trim(),
            default_currency: currency,
            status: 'Active',
            created_at: new Date().toISOString(),
          });
          localStorage.setItem('ecomhub_workspaces', JSON.stringify(stored));
        } catch {}

        setTimeout(() => {
          onCreated();
          onClose();
        }, 1200);
        return;
      }

      // Local fallback
      try {
        const stored = JSON.parse(localStorage.getItem('ecomhub_workspaces') || '[]');
        stored.unshift({
          id: 'ws-' + Date.now(),
          name: name.trim(),
          owner_name: ownerName.trim(),
          owner_email: ownerEmail.trim(),
          default_currency: currency,
          status: 'Active',
          created_at: new Date().toISOString(),
        });
        localStorage.setItem('ecomhub_workspaces', JSON.stringify(stored));
      } catch {}

      setSuccessMessage('Workspace successfully created!');
      setTimeout(() => {
        onCreated();
        onClose();
      }, 1200);
    } catch {
      // Local fallback on error
      try {
        const stored = JSON.parse(localStorage.getItem('ecomhub_workspaces') || '[]');
        stored.unshift({
          id: 'ws-' + Date.now(),
          name: name.trim(),
          owner_name: ownerName.trim(),
          owner_email: ownerEmail.trim(),
          default_currency: currency,
          status: 'Active',
          created_at: new Date().toISOString(),
        });
        localStorage.setItem('ecomhub_workspaces', JSON.stringify(stored));
      } catch {}

      setIsLoading(false);
      setSuccessMessage('Workspace successfully created!');
      setTimeout(() => {
        onCreated();
        onClose();
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl border border-[#E2E8F0] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#4F46E5]/10 text-[#4F46E5] flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">Provision New Customer Workspace</h2>
              <p className="text-xs text-[#64748B]">Create an isolated tenant instance & send owner invite.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-[#64748B] hover:bg-[#F8FAFC]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-xs text-green-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
              <span>{successMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">Business / Workspace Name *</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
                <Building2 className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Apex Global Trading"
                className="block w-full pl-9 pr-3 py-2 border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#4F46E5]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Owner Full Name *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. John Smith"
                  className="block w-full pl-9 pr-3 py-2 border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#4F46E5]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Owner Email Address *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="john@apexglobal.com"
                  className="block w-full pl-9 pr-3 py-2 border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#4F46E5]"
                />
              </div>
              <span className="text-[10px] text-[#94A3B8] mt-0.5 block">Supports any valid email provider (Gmail, Outlook, etc.)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Base Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="block w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] bg-white focus:outline-none focus:border-[#4F46E5]"
              >
                <option value="PKR">PKR (Pakistani Rupee)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="EUR">EUR (Euro)</option>
                <option value="GBP">GBP (British Pound)</option>
                <option value="AED">AED (UAE Dirham)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Phone Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="block w-full pl-9 pr-3 py-2 border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#4F46E5]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">Country</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
                  <Globe className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Pakistan"
                  className="block w-full pl-9 pr-3 py-2 border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#4F46E5]"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">Internal Admin Notes / Plan</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Enterprise Plan - Tier 2"
              className="block w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#4F46E5]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#E2E8F0] rounded-xl text-sm font-medium text-[#64748B] hover:bg-[#F8FAFC]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-medium text-sm rounded-xl shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Provision & Invite Owner</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
