import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Lead,
  LeadStatus,
  Client,
  ClientContact,
  ClientNote,
  CrmActivity,
  CrmActivityType,
  LeadFollowup,
  ExchangeRate,
  NotificationItem,
} from '../types';
import { useAuth } from './auth-context';
import { getSupabaseClient } from './supabase';
import { BASELINE_USD_RATES, DEFAULT_CURRENCY, resolveCurrency } from './currencies';

interface CrmContextType {
  leads: Lead[];
  clients: Client[];
  contacts: ClientContact[];
  clientContacts: ClientContact[];
  notes: ClientNote[];
  clientNotes: ClientNote[];
  activities: CrmActivity[];
  followups: LeadFollowup[];
  exchangeRates: ExchangeRate[];
  notifications: NotificationItem[];
  unreadNotificationsCount: number;
  isLoading: boolean;
  error: string | null;

  // Leads
  addLead: (data: Partial<Lead>) => Promise<{ success: boolean; lead?: Lead; error?: string }>;
  updateLead: (leadId: string, updates: Partial<Lead>) => Promise<{ success: boolean; error?: string }>;
  deleteLead: (leadId: string) => Promise<{ success: boolean; error?: string }>;
  updateLeadStatus: (leadId: string, newStatus: LeadStatus, note?: string) => Promise<{ success: boolean; error?: string }>;
  addLeadActivity: (leadId: string, activityType: CrmActivityType, title: string, description?: string, metadata?: any) => Promise<{ success: boolean; error?: string }>;
  scheduleFollowup: (data: { leadId: string; date: string; time?: string; note?: string; assignedTo?: string }) => Promise<{ success: boolean; followup?: LeadFollowup; error?: string }>;
  completeFollowup: (followupId: string, outcomeNote?: string) => Promise<{ success: boolean; error?: string }>;
  importLeads: (leadsData: Partial<Lead>[]) => Promise<{ success: boolean; importedCount: number; duplicateCount: number; error?: string }>;
  checkDuplicateLead: (email?: string | null, phone?: string | null, company?: string | null) => { isDuplicate: boolean; matches: Lead[]; reasons: string[] };

  // Clients
  addClient: (data: Partial<Client>) => Promise<{ success: boolean; client?: Client; error?: string }>;
  updateClient: (clientId: string, updates: Partial<Client>) => Promise<{ success: boolean; error?: string }>;
  deleteClient: (clientId: string) => Promise<{ success: boolean; error?: string }>;
  addClientContact: (contact: Omit<ClientContact, 'id' | 'business_id' | 'created_at'>) => Promise<{ success: boolean; contact?: ClientContact; error?: string }>;
  updateClientContact: (contactId: string, updates: Partial<ClientContact>) => Promise<{ success: boolean; error?: string }>;
  deleteClientContact: (contactId: string) => Promise<{ success: boolean; error?: string }>;
  addClientNote: (clientId: string, content: string) => Promise<{ success: boolean; note?: ClientNote; error?: string }>;
  deleteClientNote: (noteId: string) => Promise<{ success: boolean; error?: string }>;

  // Conversion
  convertLeadToClient: (leadId: string, overrides?: Partial<Client>) => Promise<{ success: boolean; client?: Client; error?: string }>;

  // Currency
  getExchangeRate: (from: string, to: string) => number;
  setExchangeRate: (from: string, to: string, rate: number) => Promise<{ success: boolean; error?: string }>;
  convertCurrency: (amount: number, from: string, to: string) => number;

  // Notifications
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  addNotification: (notification: Omit<NotificationItem, 'id' | 'business_id' | 'created_at' | 'is_read'>) => Promise<void>;
  refreshCrmData: () => Promise<void>;
}

const CrmContext = createContext<CrmContextType | undefined>(undefined);

// Local Storage Keys
const LS_LEADS_KEY = 'ecomhub_leads';
const LS_CLIENTS_KEY = 'ecomhub_clients';
const LS_CONTACTS_KEY = 'ecomhub_client_contacts';
const LS_NOTES_KEY = 'ecomhub_client_notes';
const LS_ACTIVITIES_KEY = 'ecomhub_crm_activities';
const LS_FOLLOWUPS_KEY = 'ecomhub_lead_followups';
const LS_RATES_KEY = 'ecomhub_exchange_rates';
const LS_NOTIFICATIONS_KEY = 'ecomhub_notifications';

// Dynamic date generator helpers for realistic seed data relative to current date
const todayStr = new Date().toISOString().split('T')[0];
const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
const nextWeekStr = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

const INITIAL_DEMO_LEADS: Lead[] = [
  {
    id: 'lead-001',
    business_id: 'biz-ecometrix-001',
    name: 'Zainab Qureshi',
    company: 'Apex Apparel Co.',
    email: 'zainab@apexapparel.pk',
    phone: '+92 300 1234567',
    website: 'https://apexapparel.pk',
    service: 'Shopify Plus Replatform & ERP',
    message: 'We are expanding to the GCC market and require an automated multi-currency Shopify Plus migration.',
    budget: 15000,
    currency: 'USD',
    source: 'Website',
    campaign: 'Q1 Enterprise Scale',
    landing_page: '/enterprise-ecommerce',
    status: 'Qualified',
    priority: 'High',
    assigned_to: 'usr-ecometrix-001',
    last_contacted_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    next_followup_at: `${todayStr}T15:00:00Z`,
    converted_to_client_id: null,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'lead-002',
    business_id: 'biz-ecometrix-001',
    name: 'David Sterling',
    company: 'Lumina Home Living',
    email: 'david@luminahome.com',
    phone: '+1 (555) 349-2810',
    website: 'https://luminahome.com',
    service: 'Headless Storefront & AI Search',
    message: 'Need to increase mobile checkout conversion and integrate smart merchandising.',
    budget: 8500,
    currency: 'USD',
    source: 'LinkedIn',
    campaign: 'Founder Outreach',
    landing_page: null,
    status: 'Proposal',
    priority: 'Urgent',
    assigned_to: 'usr-colleague-002',
    last_contacted_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    next_followup_at: `${tomorrowStr}T11:00:00Z`,
    converted_to_client_id: null,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'lead-003',
    business_id: 'biz-ecometrix-001',
    name: 'Hamza Tariq',
    company: 'Saffron & Silk Boutique',
    email: 'hamza@saffronandsilk.com',
    phone: '+92 321 8899770',
    website: 'https://saffronandsilk.com',
    service: 'Marketing Automation & Checkout',
    message: 'Looking for a dedicated agency to optimize our retention loops and WhatsApp abandoned carts.',
    budget: 850000,
    currency: 'PKR',
    source: 'Referral',
    campaign: 'Partner Network',
    landing_page: null,
    status: 'Meeting',
    priority: 'Medium',
    assigned_to: 'usr-ecometrix-001',
    last_contacted_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    next_followup_at: `${todayStr}T17:30:00Z`,
    converted_to_client_id: null,
    created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'lead-004',
    business_id: 'biz-ecometrix-001',
    name: 'Omer Farooq',
    company: 'Karakoram Provisions',
    email: 'omer@karakoramprovisions.com',
    phone: '+92 333 4445556',
    website: 'https://karakoramprovisions.com',
    service: 'B2B Wholesale Portal',
    message: 'Submitted inquiry via website request form. We distribute dried fruits and need wholesale customer pricing tiers.',
    budget: 12000,
    currency: 'USD',
    source: 'Website',
    campaign: 'Inbound Organic',
    landing_page: '/b2b-ecommerce',
    status: 'New',
    priority: 'High',
    assigned_to: 'usr-ecometrix-001',
    last_contacted_at: null,
    next_followup_at: `${todayStr}T12:00:00Z`,
    converted_to_client_id: null,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'lead-005',
    business_id: 'biz-ecometrix-001',
    name: 'Bilal Mirza',
    company: 'Zenith Activewear',
    email: 'bilal@zenithfit.pk',
    phone: '+92 345 5566778',
    website: 'https://zenithfit.pk',
    service: 'Conversion Rate Optimization Audit',
    message: 'Cold called prospect expressed interest in our performance audit package.',
    budget: 450000,
    currency: 'PKR',
    source: 'Cold Call',
    campaign: 'Direct Calling Q1',
    landing_page: null,
    status: 'Contacted',
    priority: 'Low',
    assigned_to: 'usr-colleague-002',
    last_contacted_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    next_followup_at: `${yesterdayStr}T14:00:00Z`, // Overdue follow-up for demonstration
    converted_to_client_id: null,
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'lead-006',
    business_id: 'biz-ecometrix-001',
    name: 'Elena Rostova',
    company: 'Velvet Rose Cosmetics',
    email: 'elena@velvetrose.co',
    phone: '+1 (555) 782-9011',
    website: 'https://velvetrose.co',
    service: 'Custom Subscription Engine',
    message: 'Contract finalized and signed. Lead converted into full client workspace.',
    budget: 24000,
    currency: 'USD',
    source: 'Referral',
    campaign: 'Executive Client Intro',
    landing_page: null,
    status: 'Won',
    priority: 'High',
    assigned_to: 'usr-ecometrix-001',
    last_contacted_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    next_followup_at: null,
    converted_to_client_id: 'client-001',
    created_at: new Date(Date.now() - 86400000 * 25).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
];

const INITIAL_DEMO_CLIENTS: Client[] = [
  {
    id: 'client-001',
    business_id: 'biz-ecometrix-001',
    company_name: 'Velvet Rose Cosmetics',
    logo: null,
    contact_person: 'Elena Rostova',
    email: 'elena@velvetrose.co',
    phone: '+1 (555) 782-9011',
    website: 'https://velvetrose.co',
    industry: 'Cosmetics & Beauty',
    address: '880 Broadway, 12th Floor',
    city: 'New York',
    country: 'United States',
    status: 'Active',
    source: 'Lead Conversion',
    assigned_to: 'usr-ecometrix-001',
    preferred_currency: 'USD',
    notes: 'Premium cosmetics retailer. Fast-growing recurring subscription model with multi-region warehouse routing.',
    total_revenue: 24000,
    outstanding_balance: 4500,
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'client-002',
    business_id: 'biz-ecometrix-001',
    company_name: 'Horizon Logistics Global',
    logo: null,
    contact_person: 'Julian Ward',
    email: 'ward@horizonlogistics.co',
    phone: '+44 20 7946 0991',
    website: 'https://horizonlogistics.co',
    industry: 'Freight & Supply Chain',
    address: '45 St Mary Axe',
    city: 'London',
    country: 'United Kingdom',
    status: 'Active',
    source: 'Direct Business Outreach',
    assigned_to: 'usr-colleague-002',
    preferred_currency: 'USD',
    notes: 'Enterprise tracking portal. Monthly retainer agreement for continuous portal enhancements.',
    total_revenue: 42000,
    outstanding_balance: 0,
    created_at: new Date(Date.now() - 86400000 * 45).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'client-003',
    business_id: 'biz-ecometrix-001',
    company_name: 'Natura Botanicals',
    logo: null,
    contact_person: 'Amina Baig',
    email: 'amina@naturabotanicals.pk',
    phone: '+92 42 35789012',
    website: 'https://naturabotanicals.pk',
    industry: 'Organic Health & Wellness',
    address: 'Plot 18, Block H, Gulberg III',
    city: 'Lahore',
    country: 'Pakistan',
    status: 'Onboarding',
    source: 'Inbound Website Inquiry',
    assigned_to: 'usr-ecometrix-001',
    preferred_currency: 'PKR',
    notes: 'Local organic skincare brand establishing nationwide D2C fulfillment and cash-on-delivery tracking.',
    total_revenue: 1850000,
    outstanding_balance: 600000,
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
];

const INITIAL_DEMO_CONTACTS: ClientContact[] = [
  {
    id: 'contact-001',
    business_id: 'biz-ecometrix-001',
    client_id: 'client-001',
    name: 'Elena Rostova',
    position: 'Chief Executive Officer',
    email: 'elena@velvetrose.co',
    phone: '+1 (555) 782-9011',
    is_primary: true,
    notes: 'Primary executive signatory.',
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
  {
    id: 'contact-002',
    business_id: 'biz-ecometrix-001',
    client_id: 'client-001',
    name: 'Marcus Chen',
    position: 'VP of Digital Growth',
    email: 'marcus@velvetrose.co',
    phone: '+1 (555) 782-9014',
    is_primary: false,
    notes: 'Day-to-day product manager for sprint reviews.',
    created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
  },
  {
    id: 'contact-003',
    business_id: 'biz-ecometrix-001',
    client_id: 'client-002',
    name: 'Julian Ward',
    position: 'Operations Director',
    email: 'ward@horizonlogistics.co',
    phone: '+44 20 7946 0991',
    is_primary: true,
    notes: 'Lead point of contact.',
    created_at: new Date(Date.now() - 86400000 * 45).toISOString(),
  },
  {
    id: 'contact-004',
    business_id: 'biz-ecometrix-001',
    client_id: 'client-003',
    name: 'Amina Baig',
    position: 'Managing Partner',
    email: 'amina@naturabotanicals.pk',
    phone: '+92 42 35789012',
    is_primary: true,
    notes: 'Founder and managing director.',
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
];

const INITIAL_DEMO_NOTES: ClientNote[] = [
  {
    id: 'note-001',
    business_id: 'biz-ecometrix-001',
    client_id: 'client-001',
    user_id: 'usr-ecometrix-001',
    content: 'Kickoff call completed successfully. Delivered architecture diagram for automated subscription billing. Sprint 1 starts next Monday.',
    created_at: new Date(Date.now() - 86400000 * 9).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 9).toISOString(),
  },
  {
    id: 'note-002',
    business_id: 'biz-ecometrix-001',
    client_id: 'client-001',
    user_id: 'usr-colleague-002',
    content: 'Client requested multi-warehouse routing integration with ShipBob. Added to project scope document.',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'note-003',
    business_id: 'biz-ecometrix-001',
    client_id: 'client-003',
    user_id: 'usr-ecometrix-001',
    content: 'Payment terms agreed in PKR (50% upfront, 50% upon deployment). Cash-on-Delivery reconciliation API will be prioritized.',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

const INITIAL_DEMO_ACTIVITIES: CrmActivity[] = [
  {
    id: 'act-001',
    business_id: 'biz-ecometrix-001',
    lead_id: 'lead-004',
    client_id: null,
    user_id: null,
    activity_type: 'Website submission',
    title: 'Inbound Lead Captured from Website',
    description: 'Submitted request form on /b2b-ecommerce for B2B Wholesale Portal. Budget indicated: $12,000 USD.',
    metadata: { source: 'Website', landing_page: '/b2b-ecommerce' },
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'act-002',
    business_id: 'biz-ecometrix-001',
    lead_id: 'lead-001',
    client_id: null,
    user_id: 'usr-ecometrix-001',
    activity_type: 'Call',
    title: 'Discovery Phone Consultation',
    description: '45-minute phone call with Zainab. Discussed Shopify Plus store architecture and GCC regional payment gateways.',
    metadata: { duration_minutes: 45, outcome: 'Qualified' },
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'act-003',
    business_id: 'biz-ecometrix-001',
    lead_id: 'lead-001',
    client_id: null,
    user_id: 'usr-ecometrix-001',
    activity_type: 'Status change',
    title: 'Lead Status Updated to Qualified',
    description: 'Moved from Contacted to Qualified following technical requirement validation.',
    metadata: { previous: 'Contacted', next: 'Qualified' },
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'act-004',
    business_id: 'biz-ecometrix-001',
    lead_id: 'lead-002',
    client_id: null,
    user_id: 'usr-colleague-002',
    activity_type: 'Meeting',
    title: 'Proposal Presentation & Architecture Review',
    description: 'Presented scope proposal via Google Meet. David liked the custom AI search module; review pending board sign-off.',
    metadata: { duration_minutes: 60, outcome: 'Proposal Delivered' },
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'act-005',
    business_id: 'biz-ecometrix-001',
    lead_id: 'lead-006',
    client_id: 'client-001',
    user_id: 'usr-ecometrix-001',
    activity_type: 'Converted',
    title: 'Lead Converted to Active Client',
    description: 'Lead converted into Client record "Velvet Rose Cosmetics" following contract agreement of $24,000 USD.',
    metadata: { lead_id: 'lead-006', client_id: 'client-001' },
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
];

const INITIAL_DEMO_FOLLOWUPS: LeadFollowup[] = [
  {
    id: 'flw-001',
    business_id: 'biz-ecometrix-001',
    lead_id: 'lead-004',
    lead_name: 'Omer Farooq',
    lead_company: 'Karakoram Provisions',
    assigned_to: 'usr-ecometrix-001',
    followup_date: todayStr,
    followup_time: '12:00',
    note: 'Initial qualification call for wholesale catalog size and ERP requirements.',
    status: 'Pending',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'flw-002',
    business_id: 'biz-ecometrix-001',
    lead_id: 'lead-001',
    lead_name: 'Zainab Qureshi',
    lead_company: 'Apex Apparel Co.',
    assigned_to: 'usr-ecometrix-001',
    followup_date: todayStr,
    followup_time: '15:00',
    note: 'Send technical statement of work and review timeline estimation.',
    status: 'Pending',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'flw-003',
    business_id: 'biz-ecometrix-001',
    lead_id: 'lead-003',
    lead_name: 'Hamza Tariq',
    lead_company: 'Saffron & Silk Boutique',
    assigned_to: 'usr-ecometrix-001',
    followup_date: todayStr,
    followup_time: '17:30',
    note: 'Follow up on WhatsApp automation demo and multi-currency pricing questions.',
    status: 'Pending',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'flw-004',
    business_id: 'biz-ecometrix-001',
    lead_id: 'lead-005',
    lead_name: 'Bilal Mirza',
    lead_company: 'Zenith Activewear',
    assigned_to: 'usr-colleague-002',
    followup_date: yesterdayStr,
    followup_time: '14:00',
    note: 'Overdue follow-up check after cold calling to confirm whether CRO sample audit was reviewed.',
    status: 'Pending',
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: 'flw-005',
    business_id: 'biz-ecometrix-001',
    lead_id: 'lead-002',
    lead_name: 'David Sterling',
    lead_company: 'Lumina Home Living',
    assigned_to: 'usr-colleague-002',
    followup_date: tomorrowStr,
    followup_time: '11:00',
    note: 'Touch base with David after their board executive meeting regarding the $8,500 proposal.',
    status: 'Pending',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

const INITIAL_DEMO_RATES: ExchangeRate[] = [
  {
    id: 'rate-001',
    business_id: 'biz-ecometrix-001',
    from_currency: 'USD',
    to_currency: 'PKR',
    rate: 280.0,
    effective_date: todayStr,
    created_by: 'usr-ecometrix-001',
    created_at: new Date().toISOString(),
  },
  {
    id: 'rate-002',
    business_id: 'biz-ecometrix-001',
    from_currency: 'PKR',
    to_currency: 'USD',
    rate: 1 / 280.0,
    effective_date: todayStr,
    created_by: 'usr-ecometrix-001',
    created_at: new Date().toISOString(),
  },
];

const INITIAL_DEMO_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-001',
    business_id: 'biz-ecometrix-001',
    user_id: 'usr-ecometrix-001',
    type: 'lead_capture',
    title: 'New Inbound Lead via Website',
    message: 'Omer Farooq from Karakoram Provisions submitted a consultation request for B2B Wholesale Portal ($12,000 USD).',
    link_section: 'leads',
    entity_id: 'lead-004',
    is_read: false,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'notif-002',
    business_id: 'biz-ecometrix-001',
    user_id: 'usr-ecometrix-001',
    type: 'followup_due',
    title: 'Follow-up Due Today',
    message: 'You have a scheduled qualification call with Zainab Qureshi (Apex Apparel Co.) today at 15:00.',
    link_section: 'leads',
    entity_id: 'lead-001',
    is_read: false,
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'notif-003',
    business_id: 'biz-ecometrix-001',
    user_id: 'usr-ecometrix-001',
    type: 'followup_overdue',
    title: 'Overdue Follow-up Notice',
    message: 'Follow-up with Bilal Mirza (Zenith Activewear) was scheduled for yesterday and is pending completion.',
    link_section: 'leads',
    entity_id: 'lead-005',
    is_read: false,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const CrmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeBusiness, user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientContacts, setClientContacts] = useState<ClientContact[]>([]);
  const [clientNotes, setClientNotes] = useState<ClientNote[]>([]);
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [followups, setFollowups] = useState<LeadFollowup[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [crmError, setCrmError] = useState<string | null>(null);

  // Load data scoped to activeBusiness
  const loadCrmData = useCallback(async () => {
    if (!activeBusiness) {
      setLeads([]);
      setClients([]);
      setClientContacts([]);
      setClientNotes([]);
      setActivities([]);
      setFollowups([]);
      setExchangeRates([]);
      setNotifications([]);
      setCrmError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setCrmError(null);
    const client = getSupabaseClient();

    if (client) {
      try {
        const [
          { data: lData, error: lErr },
          { data: cData, error: cErr },
          { data: cntData },
          { data: nData },
          { data: actData },
          { data: fData },
          { data: rData },
          { data: notifData },
        ] = await Promise.all([
          client.from('leads').select('*').eq('business_id', activeBusiness.id).order('created_at', { ascending: false }),
          client.from('clients').select('*').eq('business_id', activeBusiness.id).order('created_at', { ascending: false }),
          client.from('client_contacts').select('*').eq('business_id', activeBusiness.id),
          client.from('client_notes').select('*').eq('business_id', activeBusiness.id).order('created_at', { ascending: false }),
          client.from('crm_activities').select('*').eq('business_id', activeBusiness.id).order('created_at', { ascending: false }),
          client.from('lead_followups').select('*').eq('business_id', activeBusiness.id).order('followup_date', { ascending: true }),
          client.from('exchange_rates').select('*').eq('business_id', activeBusiness.id),
          client.from('notifications').select('*').eq('business_id', activeBusiness.id).order('created_at', { ascending: false }),
        ]);

        if (!lErr && !cErr) {
          setLeads((lData || []) as Lead[]);
          setClients((cData || []) as Client[]);
          setClientContacts((cntData || []) as ClientContact[]);
          setClientNotes((nData || []) as ClientNote[]);
          setActivities((actData || []) as CrmActivity[]);
          setFollowups((fData || []) as LeadFollowup[]);
          setExchangeRates((rData || []) as ExchangeRate[]);
          setNotifications((notifData || []) as NotificationItem[]);
          setCrmError(null);
          setIsLoading(false);
          return;
        }
      } catch (err: any) {
        console.warn('Supabase CRM query fallback to localStorage:', err);
      }
    }

    // Local Storage Fallback Engine
    try {
      const getStored = <T,>(key: string, defaultVal: T[]): T[] => {
        try {
          const raw = localStorage.getItem(key);
          return raw ? JSON.parse(raw) : defaultVal;
        } catch {
          return defaultVal;
        }
      };

      const allLeads = getStored<Lead>(LS_LEADS_KEY, INITIAL_DEMO_LEADS);
      const allClients = getStored<Client>(LS_CLIENTS_KEY, INITIAL_DEMO_CLIENTS);
      const allContacts = getStored<ClientContact>(LS_CONTACTS_KEY, INITIAL_DEMO_CONTACTS);
      const allNotes = getStored<ClientNote>(LS_NOTES_KEY, INITIAL_DEMO_NOTES);
      const allActivities = getStored<CrmActivity>(LS_ACTIVITIES_KEY, INITIAL_DEMO_ACTIVITIES);
      const allFollowups = getStored<LeadFollowup>(LS_FOLLOWUPS_KEY, INITIAL_DEMO_FOLLOWUPS);
      const allRates = getStored<ExchangeRate>(LS_RATES_KEY, INITIAL_DEMO_RATES);
      const allNotifications = getStored<NotificationItem>(LS_NOTIFICATIONS_KEY, INITIAL_DEMO_NOTIFICATIONS);

      // Filter by active tenant
      setLeads((allLeads || []).filter((l) => l && l.business_id === activeBusiness.id));
      setClients((allClients || []).filter((c) => c && c.business_id === activeBusiness.id));
      setClientContacts((allContacts || []).filter((ct) => ct && ct.business_id === activeBusiness.id));
      setClientNotes((allNotes || []).filter((n) => n && n.business_id === activeBusiness.id));
      setActivities((allActivities || []).filter((a) => a && a.business_id === activeBusiness.id));
      setFollowups((allFollowups || []).filter((f) => f && f.business_id === activeBusiness.id));
      setExchangeRates((allRates || []).filter((r) => r && r.business_id === activeBusiness.id));
      setNotifications((allNotifications || []).filter((nt) => nt && nt.business_id === activeBusiness.id));
      setCrmError(null);
    } catch (e: any) {
      console.error('Error loading CRM local data:', e);
      setCrmError(e?.message || 'Error loading CRM local data');
    } finally {
      setIsLoading(false);
    }
  }, [activeBusiness]);

  useEffect(() => {
    loadCrmData();
  }, [loadCrmData]);

  // Unread notifications count
  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((n) => !n.is_read).length;
  }, [notifications]);

  // Currency helpers
  const getExchangeRate = useCallback((from: string, to: string): number => {
    const fromUpper = from.toUpperCase();
    const toUpper = to.toUpperCase();
    if (fromUpper === toUpper) return 1.0;

    const match = exchangeRates.find(
      (r) => r.from_currency.toUpperCase() === fromUpper && r.to_currency.toUpperCase() === toUpper
    );
    if (match) return Number(match.rate);

    // Inverse check
    const inverse = exchangeRates.find(
      (r) => r.from_currency.toUpperCase() === toUpper && r.to_currency.toUpperCase() === fromUpper
    );
    if (inverse && Number(inverse.rate) > 0) return 1.0 / Number(inverse.rate);

    // Baseline fallbacks
    const fromRate = BASELINE_USD_RATES[fromUpper];
    const toRate = BASELINE_USD_RATES[toUpper];
    if (fromRate && toRate && fromRate > 0) {
      return toRate / fromRate;
    }

    if (fromUpper === 'USD' && toUpper === 'PKR') return 280.0;
    if (fromUpper === 'PKR' && toUpper === 'USD') return 1.0 / 280.0;
    return 1.0;
  }, [exchangeRates]);

  const convertCurrency = useCallback((amount: number, from: string, to: string): number => {
    const rate = getExchangeRate(from, to);
    return Math.round(amount * rate * 100) / 100;
  }, [getExchangeRate]);

  const setExchangeRate = async (from: string, to: string, rate: number) => {
    if (!activeBusiness) return { success: false, error: 'No active business' };

    const newRate: ExchangeRate = {
      id: `rate-${Date.now()}`,
      business_id: activeBusiness.id,
      from_currency: from.toUpperCase(),
      to_currency: to.toUpperCase(),
      rate,
      effective_date: new Date().toISOString().split('T')[0],
      created_by: user?.id || null,
      created_at: new Date().toISOString(),
    };

    const client = getSupabaseClient();
    if (client) {
      try {
        const { error } = await client.from('exchange_rates').insert([newRate]);
        if (error) throw error;
        await loadCrmData();
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    try {
      const raw = localStorage.getItem(LS_RATES_KEY);
      const all: ExchangeRate[] = raw ? JSON.parse(raw) : INITIAL_DEMO_RATES;
      const filtered = all.filter(
        (r) => !(r.business_id === activeBusiness.id && r.from_currency === from && r.to_currency === to)
      );
      filtered.push(newRate);
      localStorage.setItem(LS_RATES_KEY, JSON.stringify(filtered));
      setExchangeRates((prev) => [...prev.filter((r) => !(r.from_currency === from && r.to_currency === to)), newRate]);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // Duplicate Lead Detection
  const checkDuplicateLead = useCallback(
    (email?: string | null, phone?: string | null, company?: string | null) => {
      const matches: Lead[] = [];
      const reasons: string[] = [];

      const cleanEmail = email?.trim().toLowerCase();
      const cleanPhone = phone?.replace(/\D/g, '');
      const cleanCompany = company?.trim().toLowerCase();

      leads.forEach((l) => {
        let matched = false;
        if (cleanEmail && l.email && l.email.trim().toLowerCase() === cleanEmail) {
          reasons.push(`Email match (${cleanEmail}) with existing lead "${l.name}"`);
          matched = true;
        }
        if (cleanPhone && l.phone) {
          const lPhone = l.phone.replace(/\D/g, '');
          if (lPhone.length > 5 && lPhone === cleanPhone) {
            reasons.push(`Phone match (${cleanPhone}) with existing lead "${l.name}"`);
            matched = true;
          }
        }
        if (cleanCompany && l.company && l.company.trim().toLowerCase() === cleanCompany) {
          if (cleanEmail && l.email && l.email.trim().toLowerCase() === cleanEmail) {
            reasons.push(`Company + Email match with existing lead "${l.name}"`);
            matched = true;
          }
        }
        if (matched && !matches.some((m) => m.id === l.id)) {
          matches.push(l);
        }
      });

      return {
        isDuplicate: matches.length > 0,
        matches,
        reasons,
      };
    },
    [leads]
  );

  // Add Lead
  const addLead = async (data: Partial<Lead>) => {
    if (!activeBusiness) return { success: false, error: 'No active business selected' };

    const newLead: Lead = {
      id: `lead-${Date.now()}`,
      business_id: activeBusiness.id,
      name: data.name || 'Untitled Lead',
      company: data.company || null,
      email: data.email || null,
      phone: data.phone || null,
      website: data.website || null,
      service: data.service || null,
      message: data.message || null,
      budget: data.budget !== undefined ? Number(data.budget) : null,
      currency: data.currency || (activeBusiness ? resolveCurrency(activeBusiness.default_currency) : DEFAULT_CURRENCY),
      source: data.source || 'Website',
      campaign: data.campaign || null,
      landing_page: data.landing_page || null,
      status: data.status || 'New',
      priority: data.priority || 'Medium',
      assigned_to: data.assigned_to || user?.id || null,
      last_contacted_at: null,
      next_followup_at: data.next_followup_at || null,
      converted_to_client_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const client = getSupabaseClient();
    if (client) {
      try {
        const { data: inserted, error } = await client.from('leads').insert([newLead]).select().single();
        if (error) throw error;

        // Add activity
        await client.from('crm_activities').insert([
          {
            business_id: activeBusiness.id,
            lead_id: inserted.id,
            user_id: user?.id || null,
            activity_type: newLead.source === 'Website' ? 'Website submission' : 'Note',
            title: `Lead Created: ${newLead.name}`,
            description: `Lead added to pipeline with initial status "${newLead.status}".`,
          },
        ]);

        await loadCrmData();
        return { success: true, lead: inserted };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    try {
      const raw = localStorage.getItem(LS_LEADS_KEY);
      const all: Lead[] = raw ? JSON.parse(raw) : INITIAL_DEMO_LEADS;
      all.unshift(newLead);
      localStorage.setItem(LS_LEADS_KEY, JSON.stringify(all));
      setLeads((prev) => [newLead, ...prev]);

      // Create activity
      const activity: CrmActivity = {
        id: `act-${Date.now()}`,
        business_id: activeBusiness.id,
        lead_id: newLead.id,
        client_id: null,
        user_id: user?.id || null,
        activity_type: newLead.source === 'Website' ? 'Website submission' : 'Note',
        title: `Lead Created: ${newLead.name}`,
        description: `Lead added to pipeline with initial status "${newLead.status}".`,
        created_at: new Date().toISOString(),
      };
      const rawAct = localStorage.getItem(LS_ACTIVITIES_KEY);
      const allAct: CrmActivity[] = rawAct ? JSON.parse(rawAct) : INITIAL_DEMO_ACTIVITIES;
      allAct.unshift(activity);
      localStorage.setItem(LS_ACTIVITIES_KEY, JSON.stringify(allAct));
      setActivities((prev) => [activity, ...prev]);

      // Add Notification
      await addNotification({
        title: `New Lead: ${newLead.name}`,
        message: `${newLead.name}${newLead.company ? ` from ${newLead.company}` : ''} added to pipeline via ${newLead.source}.`,
        link_section: 'leads',
        entity_id: newLead.id,
        type: 'lead_capture',
        user_id: user?.id || null,
      });

      return { success: true, lead: newLead };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // Update Lead
  const updateLead = async (leadId: string, updates: Partial<Lead>) => {
    if (!activeBusiness) return { success: false, error: 'No active business' };

    const client = getSupabaseClient();
    if (client) {
      try {
        const { error } = await client
          .from('leads')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', leadId)
          .eq('business_id', activeBusiness.id);
        if (error) throw error;
        await loadCrmData();
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    try {
      const raw = localStorage.getItem(LS_LEADS_KEY);
      const all: Lead[] = raw ? JSON.parse(raw) : INITIAL_DEMO_LEADS;
      const updated = all.map((l) =>
        l.id === leadId ? { ...l, ...updates, updated_at: new Date().toISOString() } : l
      );
      localStorage.setItem(LS_LEADS_KEY, JSON.stringify(updated));
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, ...updates, updated_at: new Date().toISOString() } : l)));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // Delete Lead
  const deleteLead = async (leadId: string) => {
    if (!activeBusiness) return { success: false, error: 'No active business' };

    const client = getSupabaseClient();
    if (client) {
      try {
        const { error } = await client.from('leads').delete().eq('id', leadId).eq('business_id', activeBusiness.id);
        if (error) throw error;
        await loadCrmData();
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    try {
      const raw = localStorage.getItem(LS_LEADS_KEY);
      const all: Lead[] = raw ? JSON.parse(raw) : INITIAL_DEMO_LEADS;
      const filtered = all.filter((l) => l.id !== leadId);
      localStorage.setItem(LS_LEADS_KEY, JSON.stringify(filtered));
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // Update Lead Status
  const updateLeadStatus = async (leadId: string, newStatus: LeadStatus, note?: string) => {
    const targetLead = leads.find((l) => l.id === leadId);
    if (!targetLead) return { success: false, error: 'Lead not found' };

    const prevStatus = targetLead.status;
    const res = await updateLead(leadId, { status: newStatus });
    if (!res.success) return res;

    // Log status change activity
    await addLeadActivity(
      leadId,
      'Status change',
      `Pipeline Stage: ${prevStatus} → ${newStatus}`,
      note || `Lead moved from "${prevStatus}" to "${newStatus}".`,
      { previous: prevStatus, current: newStatus }
    );

    return { success: true };
  };

  // Add Lead Activity
  const addLeadActivity = async (
    leadId: string,
    activityType: CrmActivityType,
    title: string,
    description?: string,
    metadata?: any
  ) => {
    if (!activeBusiness) return { success: false, error: 'No active business' };

    const newAct: CrmActivity = {
      id: `act-${Date.now()}`,
      business_id: activeBusiness.id,
      lead_id: leadId,
      client_id: null,
      user_id: user?.id || null,
      user_profile: user,
      activity_type: activityType,
      title,
      description: description || null,
      metadata: metadata || {},
      created_at: new Date().toISOString(),
    };

    const client = getSupabaseClient();
    if (client) {
      try {
        const { error } = await client.from('crm_activities').insert([newAct]);
        if (error) throw error;
        await loadCrmData();
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    try {
      const raw = localStorage.getItem(LS_ACTIVITIES_KEY);
      const all: CrmActivity[] = raw ? JSON.parse(raw) : INITIAL_DEMO_ACTIVITIES;
      all.unshift(newAct);
      localStorage.setItem(LS_ACTIVITIES_KEY, JSON.stringify(all));
      setActivities((prev) => [newAct, ...prev]);

      // If it's a Call, update last_contacted_at on lead
      if (activityType === 'Call' || activityType === 'Meeting') {
        updateLead(leadId, { last_contacted_at: new Date().toISOString() });
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // Schedule Followup
  const scheduleFollowup = async (data: {
    leadId: string;
    date: string;
    time?: string;
    note?: string;
    assignedTo?: string;
  }) => {
    if (!activeBusiness) return { success: false, error: 'No active business' };
    const lead = leads.find((l) => l.id === data.leadId);

    const newFollowup: LeadFollowup = {
      id: `flw-${Date.now()}`,
      business_id: activeBusiness.id,
      lead_id: data.leadId,
      lead_name: lead?.name || 'Lead',
      lead_company: lead?.company || null,
      assigned_to: data.assignedTo || user?.id || null,
      followup_date: data.date,
      followup_time: data.time || '10:00',
      note: data.note || null,
      status: 'Pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const client = getSupabaseClient();
    if (client) {
      try {
        const { data: inserted, error } = await client.from('lead_followups').insert([newFollowup]).select().single();
        if (error) throw error;

        // Also update next_followup_at on lead
        await client
          .from('leads')
          .update({ next_followup_at: `${data.date}T${data.time || '10:00'}:00Z` })
          .eq('id', data.leadId);

        await loadCrmData();
        return { success: true, followup: inserted };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    try {
      const raw = localStorage.getItem(LS_FOLLOWUPS_KEY);
      const all: LeadFollowup[] = raw ? JSON.parse(raw) : INITIAL_DEMO_FOLLOWUPS;
      all.unshift(newFollowup);
      localStorage.setItem(LS_FOLLOWUPS_KEY, JSON.stringify(all));
      setFollowups((prev) => [newFollowup, ...prev]);

      // Update lead
      updateLead(data.leadId, { next_followup_at: `${data.date}T${data.time || '10:00'}:00Z` });

      // Log activity
      addLeadActivity(
        data.leadId,
        'Follow-up',
        `Follow-up Scheduled for ${data.date}${data.time ? ` at ${data.time}` : ''}`,
        data.note || 'Follow-up task scheduled.'
      );

      return { success: true, followup: newFollowup };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // Complete Followup
  const completeFollowup = async (followupId: string, outcomeNote?: string) => {
    if (!activeBusiness) return { success: false, error: 'No active business' };

    const target = followups.find((f) => f.id === followupId);
    if (!target) return { success: false, error: 'Follow-up not found' };

    const client = getSupabaseClient();
    if (client) {
      try {
        const { error } = await client
          .from('lead_followups')
          .update({ status: 'Completed', updated_at: new Date().toISOString() })
          .eq('id', followupId);
        if (error) throw error;
        await loadCrmData();
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    try {
      const raw = localStorage.getItem(LS_FOLLOWUPS_KEY);
      const all: LeadFollowup[] = raw ? JSON.parse(raw) : INITIAL_DEMO_FOLLOWUPS;
      const updated = all.map((f) =>
        f.id === followupId ? { ...f, status: 'Completed' as const, updated_at: new Date().toISOString() } : f
      );
      localStorage.setItem(LS_FOLLOWUPS_KEY, JSON.stringify(updated));
      setFollowups((prev) =>
        prev.map((f) => (f.id === followupId ? { ...f, status: 'Completed', updated_at: new Date().toISOString() } : f))
      );

      // Log activity
      if (target.lead_id) {
        addLeadActivity(
          target.lead_id,
          'Follow-up',
          'Follow-up Completed',
          outcomeNote || 'Scheduled follow-up completed successfully.'
        );
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // Bulk CSV Import
  const importLeads = async (leadsData: Partial<Lead>[]) => {
    if (!activeBusiness) return { success: false, importedCount: 0, duplicateCount: 0, error: 'No active business' };

    let importedCount = 0;
    let duplicateCount = 0;

    const preparedLeads: Lead[] = [];

    leadsData.forEach((row, idx) => {
      const isDup = checkDuplicateLead(row.email, row.phone, row.company).isDuplicate;
      if (isDup) {
        duplicateCount++;
      }

      const lead: Lead = {
        id: `lead-imp-${Date.now()}-${idx}`,
        business_id: activeBusiness.id,
        name: row.name || 'Imported Prospect',
        company: row.company || null,
        email: row.email || null,
        phone: row.phone || null,
        website: row.website || null,
        service: row.service || 'Consulting',
        message: row.message || null,
        budget: row.budget ? Number(row.budget) : null,
        currency: row.currency || (activeBusiness ? resolveCurrency(activeBusiness.default_currency) : DEFAULT_CURRENCY),
        source: row.source || 'Import',
        campaign: row.campaign || 'CSV Bulk Import',
        landing_page: null,
        status: row.status || 'New',
        priority: row.priority || 'Medium',
        assigned_to: row.assigned_to || user?.id || null,
        last_contacted_at: null,
        next_followup_at: null,
        converted_to_client_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      preparedLeads.push(lead);
      importedCount++;
    });

    const client = getSupabaseClient();
    if (client) {
      try {
        const { error } = await client.from('leads').insert(preparedLeads);
        if (error) throw error;
        await loadCrmData();
      } catch (err: any) {
        return { success: false, importedCount: 0, duplicateCount, error: err.message };
      }
    } else {
      const raw = localStorage.getItem(LS_LEADS_KEY);
      const all: Lead[] = raw ? JSON.parse(raw) : INITIAL_DEMO_LEADS;
      const combined = [...preparedLeads, ...all];
      localStorage.setItem(LS_LEADS_KEY, JSON.stringify(combined));
      setLeads((prev) => [...preparedLeads, ...prev]);
    }

    // Add activity and notification
    const act: CrmActivity = {
      id: `act-imp-${Date.now()}`,
      business_id: activeBusiness.id,
      lead_id: null,
      client_id: null,
      user_id: user?.id || null,
      activity_type: 'Import',
      title: `CSV Lead Batch Import`,
      description: `Successfully imported ${importedCount} leads (${duplicateCount} duplicate warnings flagged).`,
      created_at: new Date().toISOString(),
    };
    const rawAct = localStorage.getItem(LS_ACTIVITIES_KEY);
    const allAct: CrmActivity[] = rawAct ? JSON.parse(rawAct) : INITIAL_DEMO_ACTIVITIES;
    allAct.unshift(act);
    localStorage.setItem(LS_ACTIVITIES_KEY, JSON.stringify(allAct));
    setActivities((prev) => [act, ...prev]);

    await addNotification({
      title: 'Batch Leads Imported',
      message: `${importedCount} leads added to ${activeBusiness.name} pipeline via CSV import.`,
      link_section: 'leads',
      type: 'lead_capture',
      user_id: user?.id || null,
    });

    return { success: true, importedCount, duplicateCount };
  };

  // Add Client
  const addClient = async (data: Partial<Client>) => {
    if (!activeBusiness) return { success: false, error: 'No active business' };

    const newClient: Client = {
      id: `client-${Date.now()}`,
      business_id: activeBusiness.id,
      company_name: data.company_name || 'Untitled Client',
      logo: data.logo || null,
      contact_person: data.contact_person || null,
      email: data.email || (data as any).billing_email || null,
      phone: data.phone || null,
      website: data.website || null,
      industry: data.industry || 'Business Services',
      address: data.address || null,
      city: data.city || null,
      country: data.country || null,
      status: data.status || 'Active',
      source: data.source || 'Direct Client',
      assigned_to: data.assigned_to || (data as any).account_manager_id || user?.id || null,
      preferred_currency: data.preferred_currency || (activeBusiness ? resolveCurrency(activeBusiness.default_currency) : DEFAULT_CURRENCY),
      notes: data.notes || null,
      total_revenue: data.total_revenue || 0,
      outstanding_balance: data.outstanding_balance || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const client = getSupabaseClient();
    if (client) {
      try {
        const { data: inserted, error } = await client.from('clients').insert([newClient]).select().single();
        if (error) throw error;
        await loadCrmData();
        return { success: true, client: inserted };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    try {
      const raw = localStorage.getItem(LS_CLIENTS_KEY);
      const all: Client[] = raw ? JSON.parse(raw) : INITIAL_DEMO_CLIENTS;
      all.unshift(newClient);
      localStorage.setItem(LS_CLIENTS_KEY, JSON.stringify(all));
      setClients((prev) => [newClient, ...prev]);

      // If primary contact was supplied, create contact record
      if (newClient.contact_person) {
        addClientContact({
          client_id: newClient.id,
          name: newClient.contact_person,
          email: newClient.email,
          phone: newClient.phone,
          position: 'Primary Contact',
          is_primary: true,
          notes: 'Initial primary contact person.',
        });
      }

      // Add Notification
      addNotification({
        title: `Client Created: ${newClient.company_name}`,
        message: `${newClient.company_name} enrolled as an active client organization.`,
        link_section: 'clients',
        entity_id: newClient.id,
        type: 'client_created',
        user_id: user?.id || null,
      });

      return { success: true, client: newClient };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // Update Client
  const updateClient = async (clientId: string, updates: Partial<Client>) => {
    if (!activeBusiness) return { success: false, error: 'No active business' };

    const client = getSupabaseClient();
    if (client) {
      try {
        const { error } = await client
          .from('clients')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', clientId)
          .eq('business_id', activeBusiness.id);
        if (error) throw error;
        await loadCrmData();
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    try {
      const raw = localStorage.getItem(LS_CLIENTS_KEY);
      const all: Client[] = raw ? JSON.parse(raw) : INITIAL_DEMO_CLIENTS;
      const updated = all.map((c) =>
        c.id === clientId ? { ...c, ...updates, updated_at: new Date().toISOString() } : c
      );
      localStorage.setItem(LS_CLIENTS_KEY, JSON.stringify(updated));
      setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, ...updates, updated_at: new Date().toISOString() } : c)));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // Delete Client
  const deleteClient = async (clientId: string) => {
    if (!activeBusiness) return { success: false, error: 'No active business' };

    const client = getSupabaseClient();
    if (client) {
      try {
        const { error } = await client.from('clients').delete().eq('id', clientId).eq('business_id', activeBusiness.id);
        if (error) throw error;
        await loadCrmData();
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    try {
      const raw = localStorage.getItem(LS_CLIENTS_KEY);
      const all: Client[] = raw ? JSON.parse(raw) : INITIAL_DEMO_CLIENTS;
      const filtered = all.filter((c) => c.id !== clientId);
      localStorage.setItem(LS_CLIENTS_KEY, JSON.stringify(filtered));
      setClients((prev) => prev.filter((c) => c.id !== clientId));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // Client Contacts CRUD
  const addClientContact = async (contact: Omit<ClientContact, 'id' | 'business_id' | 'created_at'>) => {
    if (!activeBusiness) return { success: false, error: 'No active business' };

    const newContact: ClientContact = {
      id: `contact-${Date.now()}`,
      business_id: activeBusiness.id,
      client_id: contact.client_id,
      name: contact.name,
      position: contact.position || (contact as any).role || null,
      email: contact.email || null,
      phone: contact.phone || null,
      is_primary: !!contact.is_primary,
      notes: contact.notes || null,
      created_at: new Date().toISOString(),
    };

    const client = getSupabaseClient();
    if (client) {
      try {
        const { data: inserted, error } = await client.from('client_contacts').insert([newContact]).select().single();
        if (error) throw error;
        await loadCrmData();
        return { success: true, contact: inserted };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    try {
      const raw = localStorage.getItem(LS_CONTACTS_KEY);
      const all: ClientContact[] = raw ? JSON.parse(raw) : INITIAL_DEMO_CONTACTS;
      // If setting as primary, unset others for this client
      let updatedAll = all;
      if (newContact.is_primary) {
        updatedAll = all.map((ct) => (ct.client_id === contact.client_id ? { ...ct, is_primary: false } : ct));
      }
      updatedAll.unshift(newContact);
      localStorage.setItem(LS_CONTACTS_KEY, JSON.stringify(updatedAll));
      setClientContacts(updatedAll.filter((ct) => ct.business_id === activeBusiness.id));
      return { success: true, contact: newContact };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const updateClientContact = async (contactId: string, updates: Partial<ClientContact>) => {
    if (!activeBusiness) return { success: false, error: 'No active business' };

    const raw = localStorage.getItem(LS_CONTACTS_KEY);
    const all: ClientContact[] = raw ? JSON.parse(raw) : INITIAL_DEMO_CONTACTS;
    const target = all.find((ct) => ct.id === contactId);

    let updatedAll = all;
    if (updates.is_primary && target) {
      updatedAll = all.map((ct) => (ct.client_id === target.client_id ? { ...ct, is_primary: false } : ct));
    }

    updatedAll = updatedAll.map((ct) => (ct.id === contactId ? { ...ct, ...updates } : ct));
    localStorage.setItem(LS_CONTACTS_KEY, JSON.stringify(updatedAll));
    setClientContacts(updatedAll.filter((ct) => ct.business_id === activeBusiness.id));
    return { success: true };
  };

  const deleteClientContact = async (contactId: string) => {
    if (!activeBusiness) return { success: false, error: 'No active business' };

    const raw = localStorage.getItem(LS_CONTACTS_KEY);
    const all: ClientContact[] = raw ? JSON.parse(raw) : INITIAL_DEMO_CONTACTS;
    const filtered = all.filter((ct) => ct.id !== contactId);
    localStorage.setItem(LS_CONTACTS_KEY, JSON.stringify(filtered));
    setClientContacts(filtered.filter((ct) => ct.business_id === activeBusiness.id));
    return { success: true };
  };

  // Client Notes
  const addClientNote = async (clientId: string, content: string) => {
    if (!activeBusiness) return { success: false, error: 'No active business' };

    const newNote: ClientNote = {
      id: `note-${Date.now()}`,
      business_id: activeBusiness.id,
      client_id: clientId,
      user_id: user?.id || 'usr-anon',
      user_profile: user,
      content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const client = getSupabaseClient();
    if (client) {
      try {
        const { data: inserted, error } = await client.from('client_notes').insert([newNote]).select().single();
        if (error) throw error;
        await loadCrmData();
        return { success: true, note: inserted };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    try {
      const raw = localStorage.getItem(LS_NOTES_KEY);
      const all: ClientNote[] = raw ? JSON.parse(raw) : INITIAL_DEMO_NOTES;
      all.unshift(newNote);
      localStorage.setItem(LS_NOTES_KEY, JSON.stringify(all));
      setClientNotes((prev) => [newNote, ...prev]);
      return { success: true, note: newNote };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const deleteClientNote = async (noteId: string) => {
    if (!activeBusiness) return { success: false, error: 'No active business' };

    const raw = localStorage.getItem(LS_NOTES_KEY);
    const all: ClientNote[] = raw ? JSON.parse(raw) : INITIAL_DEMO_NOTES;
    const filtered = all.filter((n) => n.id !== noteId);
    localStorage.setItem(LS_NOTES_KEY, JSON.stringify(filtered));
    setClientNotes((prev) => prev.filter((n) => n.id !== noteId));
    return { success: true };
  };

  // Convert Lead to Client Workflow
  const convertLeadToClient = async (leadId: string, overrides?: Partial<Client>) => {
    if (!activeBusiness) return { success: false, error: 'No active business' };

    const targetLead = leads.find((l) => l.id === leadId);
    if (!targetLead) return { success: false, error: 'Lead record not found' };

    if (targetLead.converted_to_client_id) {
      return { success: false, error: 'This lead has already been converted to a client.' };
    }

    // 1. Create client record
    const clientData: Partial<Client> = {
      company_name: overrides?.company_name || targetLead.company || targetLead.name,
      contact_person: overrides?.contact_person || targetLead.name,
      email: overrides?.email || targetLead.email,
      phone: overrides?.phone || targetLead.phone,
      website: overrides?.website || targetLead.website,
      industry: overrides?.industry || 'eCommerce & Retail',
      preferred_currency: overrides?.preferred_currency || targetLead.currency || 'USD',
      source: `Converted Lead (${targetLead.source})`,
      assigned_to: targetLead.assigned_to || user?.id || null,
      notes: `Converted from lead: ${targetLead.name}. Original inquiry: "${targetLead.message || 'None'}"`,
      total_revenue: targetLead.budget ? Number(targetLead.budget) : 0,
      outstanding_balance: 0,
    };

    const clientRes = await addClient(clientData);
    if (!clientRes.success || !clientRes.client) {
      return { success: false, error: clientRes.error || 'Failed to create client' };
    }

    const newClientId = clientRes.client.id;

    // 2. Link lead to client and set status to 'Won'
    await updateLead(leadId, {
      converted_to_client_id: newClientId,
      status: 'Won',
    });

    // 3. Create conversion activities for both Lead and Client
    const conversionActivity: CrmActivity = {
      id: `act-conv-${Date.now()}`,
      business_id: activeBusiness.id,
      lead_id: leadId,
      client_id: newClientId,
      user_id: user?.id || null,
      activity_type: 'Converted',
      title: `Lead Successfully Converted to Client`,
      description: `Prospect ${targetLead.name} (${targetLead.company || 'Private'}) was converted to Client "${clientRes.client.company_name}". Original lead history preserved.`,
      metadata: { lead_id: leadId, client_id: newClientId },
      created_at: new Date().toISOString(),
    };

    const rawAct = localStorage.getItem(LS_ACTIVITIES_KEY);
    const allAct: CrmActivity[] = rawAct ? JSON.parse(rawAct) : INITIAL_DEMO_ACTIVITIES;
    allAct.unshift(conversionActivity);
    localStorage.setItem(LS_ACTIVITIES_KEY, JSON.stringify(allAct));
    setActivities((prev) => [conversionActivity, ...prev]);

    // 4. Create primary contact
    await addClientContact({
      client_id: newClientId,
      name: targetLead.name,
      email: targetLead.email,
      phone: targetLead.phone,
      position: 'Primary Contact (From Lead)',
      is_primary: true,
      notes: `Converted lead contact. Source: ${targetLead.source}`,
    });

    // 5. Notify
    await addNotification({
      title: 'Lead Won & Converted',
      message: `Lead ${targetLead.name} has been converted into active client ${clientRes.client.company_name}.`,
      link_section: 'clients',
      entity_id: newClientId,
      type: 'lead_converted',
      user_id: user?.id || null,
    });

    return { success: true, client: clientRes.client };
  };

  // Notifications CRUD
  const addNotification = async (item: Omit<NotificationItem, 'id' | 'business_id' | 'created_at' | 'is_read'>) => {
    if (!activeBusiness) return;

    const notif: NotificationItem = {
      id: `notif-${Date.now()}`,
      business_id: activeBusiness.id,
      user_id: item.user_id || null,
      type: item.type,
      title: item.title,
      message: item.message,
      link_section: item.link_section,
      entity_id: item.entity_id,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    const client = getSupabaseClient();
    if (client) {
      client.from('notifications').insert([notif]).then();
    }

    try {
      const raw = localStorage.getItem(LS_NOTIFICATIONS_KEY);
      const all: NotificationItem[] = raw ? JSON.parse(raw) : INITIAL_DEMO_NOTIFICATIONS;
      all.unshift(notif);
      localStorage.setItem(LS_NOTIFICATIONS_KEY, JSON.stringify(all));
      setNotifications((prev) => [notif, ...prev]);
    } catch (err) {
      console.error('Error adding notification:', err);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    const client = getSupabaseClient();
    if (client) {
      client.from('notifications').update({ is_read: true }).eq('id', notificationId).then();
    }

    try {
      const raw = localStorage.getItem(LS_NOTIFICATIONS_KEY);
      const all: NotificationItem[] = raw ? JSON.parse(raw) : INITIAL_DEMO_NOTIFICATIONS;
      const updated = all.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n));
      localStorage.setItem(LS_NOTIFICATIONS_KEY, JSON.stringify(updated));
      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)));
    } catch (err) {
      console.error('Error updating notification:', err);
    }
  };

  const markAllNotificationsAsRead = async () => {
    if (!activeBusiness) return;

    const client = getSupabaseClient();
    if (client) {
      client.from('notifications').update({ is_read: true }).eq('business_id', activeBusiness.id).then();
    }

    try {
      const raw = localStorage.getItem(LS_NOTIFICATIONS_KEY);
      const all: NotificationItem[] = raw ? JSON.parse(raw) : INITIAL_DEMO_NOTIFICATIONS;
      const updated = all.map((n) => (n.business_id === activeBusiness.id ? { ...n, is_read: true } : n));
      localStorage.setItem(LS_NOTIFICATIONS_KEY, JSON.stringify(updated));
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  return (
    <CrmContext.Provider
      value={{
        leads,
        clients,
        contacts: clientContacts,
        clientContacts,
        notes: clientNotes,
        clientNotes,
        activities,
        followups,
        exchangeRates,
        notifications,
        unreadNotificationsCount,
        isLoading,
        error: crmError,
        addLead,
        updateLead,
        deleteLead,
        updateLeadStatus,
        addLeadActivity,
        scheduleFollowup,
        completeFollowup,
        importLeads,
        checkDuplicateLead,
        addClient,
        updateClient,
        deleteClient,
        addClientContact,
        updateClientContact,
        deleteClientContact,
        addClientNote,
        deleteClientNote,
        convertLeadToClient,
        getExchangeRate,
        setExchangeRate,
        convertCurrency,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        addNotification,
        refreshCrmData: loadCrmData,
      }}
    >
      {children}
    </CrmContext.Provider>
  );
};

export const useCrm = () => {
  const context = useContext(CrmContext);
  if (!context) {
    throw new Error('useCrm must be used within a CrmProvider');
  }
  return context;
};
