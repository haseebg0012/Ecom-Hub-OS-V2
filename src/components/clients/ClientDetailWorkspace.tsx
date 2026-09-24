import React, { useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Globe,
  Mail,
  Phone,
  UserCheck,
  Plus,
  Send,
  Trash2,
  Calendar,
  Clock,
  CheckCircle2,
  Tag,
  DollarSign,
  ArrowRightLeft,
  MessageCircle,
  Briefcase,
  AlertCircle,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { useCrm } from '../../lib/crm-context';
import { useAuth } from '../../lib/auth-context';
import { useFinance } from '../../lib/finance-context';
import { Client, ClientStatus, ClientContact, ClientNote } from '../../types';
import { CurrencyConverterModal } from '../common/CurrencyConverterModal';
import { CreateInvoiceModal } from '../finance/modals/CreateInvoiceModal';
import { RecordPaymentModal } from '../finance/modals/RecordPaymentModal';
import { SUPPORTED_CURRENCIES } from '../../lib/currencies';

interface ClientDetailWorkspaceProps {
  clientId: string;
  onBack: () => void;
  onOpenLead?: (leadId: string) => void;
}

export const ClientDetailWorkspace: React.FC<ClientDetailWorkspaceProps> = ({
  clientId,
  onBack,
  onOpenLead,
}) => {
  const {
    clients = [],
    contacts = [],
    clientContacts: rawClientContacts = [],
    notes = [],
    clientNotes: rawClientNotes = [],
    activities = [],
    isLoading,
    updateClient,
    addClientContact,
    deleteClientContact,
    addClientNote,
    addLeadActivity,
    getExchangeRate,
  } = useCrm();
  const { user, members = [] } = useAuth();
  const { invoices = [], payments = [] } = useFinance();

  const [activeTab, setActiveTab] = useState<'overview' | 'contacts' | 'notes' | 'timeline' | 'financials'>('overview');

  // Currency Converter & Finance Modals
  const [showConverter, setShowConverter] = useState(false);
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [selectedInvoiceIdForPayment, setSelectedInvoiceIdForPayment] = useState<string | undefined>(undefined);

  // Add Contact Modal/Inline Form State
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactRole, setContactRole] = useState('');
  const [contactIsPrimary, setContactIsPrimary] = useState(false);

  // New Note Form State
  const [newNoteContent, setNewNoteContent] = useState('');

  // Call / Meeting Logger State
  const [meetingTitle, setMeetingTitle] = useState('Client Strategy Alignment');
  const [meetingSummary, setMeetingSummary] = useState('');
  const [isLoggingMeeting, setIsLoggingMeeting] = useState(false);

  const client = (clients || []).find((c) => c && c.id === clientId);

  if (isLoading && (!clients || clients.length === 0)) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 rounded-xl w-1/3"></div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="h-24 bg-slate-200 rounded-2xl"></div>
          <div className="h-24 bg-slate-200 rounded-2xl"></div>
          <div className="h-24 bg-slate-200 rounded-2xl"></div>
          <div className="h-24 bg-slate-200 rounded-2xl"></div>
        </div>
        <div className="h-64 bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-[#E2E8F0]">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-[#0F172A]">Client record not found</h3>
        <p className="text-xs text-[#64748B] mt-1">The requested client could not be located in this business account.</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-1.5 text-xs font-semibold text-[#4F46E5] bg-[#EEF2FF] hover:bg-[#E0E7FF] rounded-xl transition-colors"
        >
          Return to Clients
        </button>
      </div>
    );
  }

  // Filter contacts, notes, activities for this client safely
  const allContacts = (contacts && contacts.length > 0 ? contacts : rawClientContacts) || [];
  const allNotes = (notes && notes.length > 0 ? notes : rawClientNotes) || [];
  const allActivities = activities || [];

  const clientContacts = allContacts.filter((c) => c && c.client_id === client.id);
  const clientNotes = allNotes.filter((n) => n && n.client_id === client.id);
  const clientActivities = allActivities.filter((a) => a && a.client_id === client.id);

  const getStatusColor = (st: ClientStatus) => {
    switch (st) {
      case 'Active':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Onboarding':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Paused':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Inactive':
      case 'Archived':
      case 'Churned':
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  // Add Contact Handler
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim()) return;

    await addClientContact({
      client_id: client.id,
      name: contactName.trim(),
      email: contactEmail.trim() || null,
      phone: contactPhone.trim() || null,
      role: contactRole.trim() || null,
      is_primary: contactIsPrimary,
    });

    setContactName('');
    setContactEmail('');
    setContactPhone('');
    setContactRole('');
    setContactIsPrimary(false);
    setShowAddContact(false);
  };

  // Add Note Handler
  const handleSaveNote = async () => {
    if (!newNoteContent.trim()) return;

    await addClientNote(client.id, newNoteContent.trim());
    setNewNoteContent('');
  };

  // Log Meeting / Call Handler
  const handleLogMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingSummary.trim()) return;

    setIsLoggingMeeting(true);
    await addLeadActivity(
      null,
      'Meeting',
      meetingTitle,
      meetingSummary.trim(),
      {},
      client.id
    );

    setMeetingSummary('');
    setIsLoggingMeeting(false);
  };

  // Currency calculation
  const totalRev = Number(client.total_revenue) || 0;
  const prefCurr = client.preferred_currency || 'PKR';
  const otherCurrency = prefCurr === 'PKR' ? 'USD' : 'PKR';
  const convertedRev = totalRev * (typeof getExchangeRate === 'function' ? getExchangeRate(prefCurr, otherCurrency) : 1);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-xl transition-colors border border-[#E2E8F0] bg-white shadow-2xs"
            title="Return to clients list"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                Client Workspace
              </span>
              {client.originating_lead_id && (
                <>
                  <span className="text-[#94A3B8]">•</span>
                  <button
                    onClick={() => onOpenLead && onOpenLead(client.originating_lead_id!)}
                    className="text-xs font-semibold text-[#4F46E5] hover:underline flex items-center gap-1"
                  >
                    <span>Converted from Lead</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
            <h1 className="text-xl font-bold text-[#0F172A] tracking-tight mt-0.5 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#4F46E5]" />
              <span>{client.company_name}</span>
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowConverter(true)}
            className="px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-[#4F46E5]" />
            <span>Currency Calculator</span>
          </button>

          {/* Status Dropdown */}
          <select
            value={client.status}
            onChange={(e) => updateClient(client.id, { status: e.target.value as ClientStatus })}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer focus:outline-none ${getStatusColor(
              client.status
            )}`}
          >
            <option value="Active">Active Account</option>
            <option value="Onboarding">Onboarding</option>
            <option value="Paused">Paused</option>
            <option value="Churned">Churned</option>
          </select>
        </div>
      </div>

      {/* Highlights Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Billed Revenue */}
        <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs space-y-1">
          <span className="text-xs text-[#64748B] block">Lifetime Revenue</span>
          <div className="text-lg font-bold text-[#0F172A] tracking-tight">
            {client.preferred_currency} {totalRev.toLocaleString()}
          </div>
          <p className="text-[11px] text-[#64748B]">
            ≈ {otherCurrency} {Math.round(convertedRev).toLocaleString()}
          </p>
        </div>

        {/* Currency Preference */}
        <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs space-y-1">
          <span className="text-xs text-[#64748B] block">Preferred Invoicing Currency</span>
          <select
            value={client.preferred_currency}
            onChange={(e) => updateClient(client.id, { preferred_currency: e.target.value })}
            className="w-full px-2 py-1 text-xs font-bold text-[#0F172A] bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none"
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-[#94A3B8]">Default for invoices & contracts</p>
        </div>

        {/* Account Manager */}
        <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs space-y-1">
          <span className="text-xs text-[#64748B] block">Account Manager</span>
          <select
            value={client.account_manager_id || client.assigned_to || ''}
            onChange={(e) => updateClient(client.id, { account_manager_id: e.target.value || null, assigned_to: e.target.value || null })}
            className="w-full px-2 py-1 text-xs font-medium text-[#0F172A] bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none"
          >
            <option value="">-- Unassigned --</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.profile?.full_name || m.profile?.email}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-[#94A3B8]">Primary client relationship lead</p>
        </div>

        {/* Key Contacts Count */}
        <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs space-y-1">
          <span className="text-xs text-[#64748B] block">Direct Contacts</span>
          <div className="text-lg font-bold text-[#0F172A] tracking-tight">
            {clientContacts.length} Associated
          </div>
          <p className="text-[11px] text-[#4F46E5] font-semibold">
            {clientContacts.find((c) => c.is_primary)?.name || 'No primary contact designated'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#E2E8F0] flex items-center gap-2 overflow-x-auto text-xs font-semibold">
        {[
          { id: 'overview', label: 'Overview & Profile' },
          { id: 'contacts', label: `Stakeholder Contacts (${clientContacts.length})` },
          { id: 'notes', label: `Strategic Notes (${clientNotes.length})` },
          { id: 'timeline', label: `Activity Timeline (${clientActivities.length})` },
          { id: 'financials', label: 'Financials & Multi-Currency' },
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
      {/* 1. OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Account Details Form */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs space-y-4">
              <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                Client Profile & Attributes
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-[#64748B] mb-1">Company Website</label>
                  <input
                    type="text"
                    defaultValue={client.website || ''}
                    onBlur={(e) => updateClient(client.id, { website: e.target.value || null })}
                    placeholder="https://example.com"
                    className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#64748B] mb-1">Industry / Sector</label>
                  <input
                    type="text"
                    defaultValue={client.industry || ''}
                    onBlur={(e) => updateClient(client.id, { industry: e.target.value || null })}
                    placeholder="e.g. Footwear & Apparel"
                    className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#64748B] mb-1">Billing Email</label>
                  <input
                    type="email"
                    defaultValue={client.billing_email || ''}
                    onBlur={(e) => updateClient(client.id, { billing_email: e.target.value || null })}
                    placeholder="billing@company.com"
                    className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#64748B] mb-1">Phone Number</label>
                  <input
                    type="text"
                    defaultValue={client.phone || ''}
                    onBlur={(e) => updateClient(client.id, { phone: e.target.value || null })}
                    placeholder="+92 300 0000000"
                    className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-[#64748B] mb-1">Office / Billing Address</label>
                  <input
                    type="text"
                    defaultValue={client.address || ''}
                    onBlur={(e) => updateClient(client.id, { address: e.target.value || null })}
                    placeholder="Street, Suite, City, Country"
                    className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  />
                </div>
              </div>
            </div>

            {/* Quick Meeting Logger */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#4F46E5]" /> Log Client Strategy Meeting
              </h3>

              <form onSubmit={handleLogMeeting} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-[#64748B] mb-1">Meeting Title</label>
                  <input
                    type="text"
                    value={meetingTitle}
                    onChange={(e) => setMeetingTitle(e.target.value)}
                    className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#64748B] mb-1">Minutes / Summary</label>
                  <textarea
                    rows={2}
                    value={meetingSummary}
                    onChange={(e) => setMeetingSummary(e.target.value)}
                    placeholder="Discussed sprint deliverables, timeline milestones, feedback..."
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isLoggingMeeting || !meetingSummary.trim()}
                    className="px-4 py-1.5 bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50 text-white font-semibold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5"
                  >
                    <span>Log to Client Timeline</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Primary Contact Card */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  Primary Contact
                </h3>
                <button
                  onClick={() => {
                    setActiveTab('contacts');
                    setShowAddContact(true);
                  }}
                  className="text-[11px] font-semibold text-[#4F46E5] hover:underline"
                >
                  + Add Contact
                </button>
              </div>

              {clientContacts.find((c) => c.is_primary) || clientContacts[0] ? (
                (() => {
                  const contact = clientContacts.find((c) => c.is_primary) || clientContacts[0];
                  const rawPhone = contact.phone ? contact.phone.replace(/[^0-9]/g, '') : '';

                  return (
                    <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2 text-xs">
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-[#0F172A]">
                          <span>{contact.name}</span>
                          {contact.is_primary && (
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              Primary
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#64748B]">{contact.role || 'Executive'}</p>
                      </div>

                      {contact.email && (
                        <div className="flex items-center justify-between">
                          <span className="text-[#64748B] truncate">{contact.email}</span>
                          <a
                            href={`mailto:${contact.email}`}
                            className="text-[#4F46E5] font-semibold hover:underline"
                          >
                            Email
                          </a>
                        </div>
                      )}

                      {contact.phone && (
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                          <span className="text-[#64748B] truncate">{contact.phone}</span>
                          <div className="flex items-center gap-2">
                            <a
                              href={`tel:${contact.phone}`}
                              className="text-[#4F46E5] font-semibold hover:underline"
                            >
                              Call
                            </a>
                            {rawPhone && (
                              <a
                                href={`https://wa.me/${rawPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-600 font-semibold hover:underline"
                              >
                                WhatsApp
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="py-6 text-center text-xs text-[#64748B] bg-[#F8FAFC] rounded-xl border border-dashed border-[#E2E8F0]">
                  No contacts registered yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. CONTACTS */}
      {activeTab === 'contacts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                Client Organization Contacts
              </h3>
              <p className="text-[11px] text-[#64748B]">
                Key stakeholders, billing contacts, and project leads
              </p>
            </div>

            <button
              onClick={() => setShowAddContact(!showAddContact)}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-xl shadow-2xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddContact ? 'Close Form' : 'Add Contact'}</span>
            </button>
          </div>

          {/* Add Contact Form */}
          {showAddContact && (
            <form
              onSubmit={handleSaveContact}
              className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm space-y-4 text-xs"
            >
              <h4 className="font-bold text-[#0F172A] uppercase tracking-wider">
                New Contact Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-[#64748B] mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="e.g. Asad Farooq"
                    className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#64748B] mb-1">Role / Designation</label>
                  <input
                    type="text"
                    value={contactRole}
                    onChange={(e) => setContactRole(e.target.value)}
                    placeholder="e.g. Head of eCommerce"
                    className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#64748B] mb-1">Email</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="asad@brand.com"
                    className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#64748B] mb-1">Phone</label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+92 321 0000000"
                    className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-xl font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={contactIsPrimary}
                    onChange={(e) => setContactIsPrimary(e.target.checked)}
                    className="rounded text-[#4F46E5] focus:ring-[#4F46E5]"
                  />
                  <span className="font-semibold text-[#0F172A]">Set as Primary Contact</span>
                </label>

                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-xl shadow-2xs"
                >
                  Save Contact
                </button>
              </div>
            </form>
          )}

          {/* Contacts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientContacts.length === 0 ? (
              <div className="col-span-full py-12 text-center text-xs text-[#64748B] bg-white rounded-2xl border border-[#E2E8F0]">
                No contacts added yet. Click "+ Add Contact" above.
              </div>
            ) : (
              clientContacts.map((contact) => {
                const rawPhone = contact.phone ? contact.phone.replace(/[^0-9]/g, '') : '';

                return (
                  <div
                    key={contact.id}
                    className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs space-y-3 relative group"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-sm text-[#0F172A]">
                          <span>{contact.name}</span>
                          {contact.is_primary && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              Primary
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#64748B]">{contact.role || 'Stakeholder'}</p>
                      </div>

                      <button
                        onClick={() => deleteClientContact(contact.id)}
                        className="p-1 text-[#94A3B8] hover:text-rose-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete contact"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1.5 text-xs text-[#64748B]">
                      {contact.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-[#4F46E5] shrink-0" />
                          <span className="truncate">{contact.email}</span>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-[#4F46E5] shrink-0" />
                          <span>{contact.phone}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                      {contact.phone && (
                        <>
                          <a
                            href={`tel:${contact.phone}`}
                            className="flex-1 text-center py-1 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#EEF2FF] text-[#4F46E5] text-[11px] font-semibold transition-colors"
                          >
                            Call
                          </a>
                          {rawPhone && (
                            <a
                              href={`https://wa.me/${rawPhone}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-1 text-center py-1 rounded-lg bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 text-[11px] font-semibold transition-colors"
                            >
                              WhatsApp
                            </a>
                          )}
                        </>
                      )}
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          className="flex-1 text-center py-1 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#EEF2FF] text-[#4F46E5] text-[11px] font-semibold transition-colors"
                        >
                          Email
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 3. NOTES */}
      {activeTab === 'notes' && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-2xs space-y-6">
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
              Add Strategic Client Note
            </h3>
            <div className="flex gap-2">
              <textarea
                rows={2}
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Record project feedback, billing preferences, executive requests..."
                className="flex-1 px-3.5 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
              />
              <button
                onClick={handleSaveNote}
                disabled={!newNoteContent.trim()}
                className="px-4 py-2 bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-2xs transition-colors shrink-0 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Save Note</span>
              </button>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-[#E2E8F0]">
            <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
              Client Knowledge Repository
            </h4>
            {clientNotes.length === 0 ? (
              <p className="text-xs text-[#64748B]">No internal notes posted for this client yet.</p>
            ) : (
              clientNotes.map((n) => (
                <div key={n.id} className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                    <span className="font-semibold text-[#0F172A]">
                      {n.user_profile?.full_name || 'Team Member'}
                    </span>
                    <span>{new Date(n.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-[#334155] leading-relaxed">{n.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 4. TIMELINE */}
      {activeTab === 'timeline' && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-2xs space-y-4">
          <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
            Interaction & Meeting Log
          </h3>
          <div className="space-y-4 border-l-2 border-[#E2E8F0] ml-3 pl-4">
            {clientActivities.length === 0 ? (
              <p className="text-xs text-[#64748B]">No activities logged yet.</p>
            ) : (
              clientActivities.map((act) => (
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
              ))
            )}
          </div>
        </div>
      )}

      {/* 5. FINANCIALS */}
      {activeTab === 'financials' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  Client Financial Account Health
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Multi-currency billing, ledger receivables, and verified collections
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowConverter(true)}
                  className="px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-semibold text-[#0F172A] rounded-xl hover:bg-[#EEF2FF] transition-colors flex items-center gap-1.5"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-[#4F46E5]" />
                  <span>Currency Converter</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedInvoiceIdForPayment(undefined);
                    setShowRecordPayment(true);
                  }}
                  className="px-3 py-1.5 bg-white border border-[#E2E8F0] text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors shadow-2xs"
                >
                  Record Payment
                </button>
                <button
                  onClick={() => setShowCreateInvoice(true)}
                  className="px-3.5 py-1.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold rounded-xl transition-colors shadow-2xs flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Invoice</span>
                </button>
              </div>
            </div>

            {/* Financial Stats */}
            {(() => {
              const clientInvoices = invoices.filter((i) => i.client_id === client.id);
              const clientPayments = payments.filter((p) => p.client_id === client.id);
              const totalBilled = clientInvoices.reduce((s, i) => s + i.total_amount, 0);
              const totalCollected = clientInvoices.reduce((s, i) => s + i.paid_amount, 0);
              const totalOutstanding = clientInvoices.reduce((s, i) => s + i.balance_due, 0);

              return (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                      <span className="text-xs text-[#64748B]">Total Invoiced</span>
                      <div className="text-xl font-bold text-[#0F172A]">
                        {client.preferred_currency} {totalBilled.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-[#94A3B8]">
                        {clientInvoices.length} issued invoices
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 space-y-1">
                      <span className="text-xs text-emerald-800">Total Collected</span>
                      <div className="text-xl font-bold text-emerald-700">
                        {client.preferred_currency} {totalCollected.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-emerald-600">
                        {clientPayments.length} payment receipts
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                      <span className="text-xs text-[#64748B]">Outstanding Receivables</span>
                      <div
                        className={`text-xl font-bold ${
                          totalOutstanding > 0 ? 'text-amber-600' : 'text-[#0F172A]'
                        }`}
                      >
                        {client.preferred_currency} {totalOutstanding.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-[#94A3B8]">
                        1 USD = {getExchangeRate('USD', 'PKR')} PKR
                      </span>
                    </div>
                  </div>

                  {/* Invoices List */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                        Client Invoices ({clientInvoices.length})
                      </h4>
                    </div>

                    <div className="rounded-xl border border-[#E2E8F0] overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] text-[11px] uppercase tracking-wider">
                          <tr>
                            <th className="py-2.5 px-3.5 font-semibold">Invoice #</th>
                            <th className="py-2.5 px-3.5 font-semibold">Issue Date</th>
                            <th className="py-2.5 px-3.5 font-semibold">Due Date</th>
                            <th className="py-2.5 px-3.5 font-semibold text-right">Amount</th>
                            <th className="py-2.5 px-3.5 font-semibold text-right">Balance Due</th>
                            <th className="py-2.5 px-3.5 font-semibold text-center">Status</th>
                            <th className="py-2.5 px-3.5 font-semibold text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F1F5F9]">
                          {clientInvoices.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-6 text-center text-xs text-[#94A3B8]">
                                No invoices generated for this client yet.
                              </td>
                            </tr>
                          ) : (
                            clientInvoices.map((inv) => (
                              <tr key={inv.id} className="hover:bg-[#F8FAFC]">
                                <td className="py-3 px-3.5 font-bold text-[#0F172A]">
                                  {inv.invoice_number}
                                </td>
                                <td className="py-3 px-3.5 text-[#64748B]">{inv.issue_date}</td>
                                <td className="py-3 px-3.5 text-[#64748B]">{inv.due_date}</td>
                                <td className="py-3 px-3.5 text-right font-medium text-[#0F172A]">
                                  {inv.currency} {(inv.total ?? (inv as any).total_amount ?? 0).toLocaleString()}
                                </td>
                                <td className="py-3 px-3.5 text-right font-bold text-[#4F46E5]">
                                  {inv.currency} {(inv.balance_due || 0).toLocaleString()}
                                </td>
                                <td className="py-3 px-3.5 text-center">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F1F5F9] text-[#0F172A]">
                                    {inv.status}
                                  </span>
                                </td>
                                <td className="py-3 px-3.5 text-right">
                                  {inv.balance_due > 0 && (
                                    <button
                                      onClick={() => {
                                        setSelectedInvoiceIdForPayment(inv.id);
                                        setShowRecordPayment(true);
                                      }}
                                      className="text-xs font-semibold text-[#4F46E5] hover:underline"
                                    >
                                      Record Pay
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Payments List */}
                  <div className="space-y-3 pt-4 border-t border-[#E2E8F0]">
                    <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                      Recorded Payment Receipts ({clientPayments.length})
                    </h4>

                    <div className="rounded-xl border border-[#E2E8F0] overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] text-[11px] uppercase tracking-wider">
                          <tr>
                            <th className="py-2.5 px-3.5 font-semibold">Payment #</th>
                            <th className="py-2.5 px-3.5 font-semibold">Date</th>
                            <th className="py-2.5 px-3.5 font-semibold">Method</th>
                            <th className="py-2.5 px-3.5 font-semibold">Reference</th>
                            <th className="py-2.5 px-3.5 font-semibold text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F1F5F9]">
                          {clientPayments.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-6 text-center text-xs text-[#94A3B8]">
                                No payment records logged for this client yet.
                              </td>
                            </tr>
                          ) : (
                            clientPayments.map((p) => (
                              <tr key={p.id} className="hover:bg-[#F8FAFC]">
                                <td className="py-3 px-3.5 font-bold text-[#0F172A]">
                                  {p.payment_number}
                                </td>
                                <td className="py-3 px-3.5 text-[#64748B]">{p.payment_date}</td>
                                <td className="py-3 px-3.5 text-[#0F172A]">{p.payment_method}</td>
                                <td className="py-3 px-3.5 font-mono text-[11px] text-[#64748B]">
                                  {p.reference || '—'}
                                </td>
                                <td className="py-3 px-3.5 text-right font-bold text-emerald-600">
                                  + {p.currency} {(p.amount || 0).toLocaleString()}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Create Invoice Modal for Client */}
          {showCreateInvoice && (
            <CreateInvoiceModal
              isOpen={showCreateInvoice}
              onClose={() => setShowCreateInvoice(false)}
              defaultClientId={client.id}
            />
          )}

          {/* Record Payment Modal for Client */}
          {showRecordPayment && (
            <RecordPaymentModal
              isOpen={showRecordPayment}
              onClose={() => setShowRecordPayment(false)}
              defaultClientId={client.id}
              defaultInvoiceId={selectedInvoiceIdForPayment}
            />
          )}
        </div>
      )}

      {/* Currency Converter Modal */}
      <CurrencyConverterModal
        isOpen={showConverter}
        onClose={() => setShowConverter(false)}
        initialAmount={totalRev || 5000}
        initialFrom={client.preferred_currency}
        initialTo={otherCurrency}
      />
    </div>
  );
};
