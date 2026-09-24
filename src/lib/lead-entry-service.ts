/**
 * EcomHub OS — Public Lead Entry & Agent Management Service
 * Multi-tenant, secure token resolution, duplicate checking, rate limiting & CRM dispatch.
 */

import {
  Lead,
  LeadAgent,
  LeadEntryForm,
  PublicFormConfig,
  PublicLeadEntryPayload,
  CrmActivity,
  NotificationItem,
  Business
} from '../types';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

// Local storage persistence keys for offline / preview resilience
const LS_AGENTS_KEY = 'ecomhub_lead_agents';
const LS_FORMS_KEY = 'ecomhub_lead_entry_forms';
const LS_LEADS_KEY = 'ecomhub_leads';
const LS_ACTIVITIES_KEY = 'ecomhub_crm_activities';
const LS_NOTIFICATIONS_KEY = 'ecomhub_notifications';
const LS_BUSINESSES_KEY = 'ecomhub_businesses';

// Rate limiting state: map of token -> timestamps of submissions
const rateLimitMap: Record<string, number[]> = {};
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_SUBMISSIONS_PER_WINDOW = 20; // 20 per minute per token is plenty for an agent, blocks spam bots

// Initial seed data
const INITIAL_DEMO_AGENTS: LeadAgent[] = [
  {
    id: 'agent-001',
    business_id: 'biz-ecometrix-001',
    name: 'Ali Raza',
    phone: '+92 300 1122334',
    email: 'ali.raza@ecometrixhub.com',
    is_active: true,
    created_at: new Date('2025-01-16T10:00:00Z').toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'agent-002',
    business_id: 'biz-ecometrix-001',
    name: 'Usman Tariq',
    phone: '+92 321 5566778',
    email: 'usman.t@ecometrixhub.com',
    is_active: true,
    created_at: new Date('2025-01-18T11:00:00Z').toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'agent-003',
    business_id: 'biz-ecometrix-001',
    name: 'Hamza Malik',
    phone: '+92 333 9988776',
    email: 'hamza.m@ecometrixhub.com',
    is_active: true,
    created_at: new Date('2025-01-20T09:30:00Z').toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'agent-004',
    business_id: 'biz-ecometrix-001',
    name: 'Bilal Ahmed',
    phone: '+92 345 4433221',
    email: 'bilal.a@ecometrixhub.com',
    is_active: false,
    created_at: new Date('2025-01-22T14:00:00Z').toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'agent-acme-001',
    business_id: 'biz-acme-002',
    name: 'Carlos Gomez',
    phone: '+1 (555) 432-1098',
    email: 'carlos@acmegrowth.co',
    is_active: true,
    created_at: new Date('2025-02-02T10:00:00Z').toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'agent-acme-002',
    business_id: 'biz-acme-002',
    name: 'Maya Patel',
    phone: '+1 (555) 876-5432',
    email: 'maya@acmegrowth.co',
    is_active: true,
    created_at: new Date('2025-02-03T11:30:00Z').toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const INITIAL_DEMO_FORMS: LeadEntryForm[] = [
  {
    id: 'form-ecometrix-001',
    business_id: 'biz-ecometrix-001',
    token: 'ecom-agent-leads-2025',
    name: 'Main Lead Generation Team',
    is_active: true,
    created_at: new Date('2025-01-16T10:00:00Z').toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'form-acme-002',
    business_id: 'biz-acme-002',
    token: 'acme-growth-leads-889',
    name: 'Acme Field Outreach',
    is_active: true,
    created_at: new Date('2025-02-02T10:00:00Z').toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Helper to generate cryptographically random token
export function generateFormToken(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let token = '';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < 16; i++) {
      token += chars[bytes[i] % chars.length];
    }
  } else {
    for (let i = 0; i < 16; i++) {
      token += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return token;
}

// Ensure localStorage seeded
function getLocalAgents(): LeadAgent[] {
  if (typeof window === 'undefined') return INITIAL_DEMO_AGENTS;
  try {
    const raw = localStorage.getItem(LS_AGENTS_KEY);
    if (!raw) {
      localStorage.setItem(LS_AGENTS_KEY, JSON.stringify(INITIAL_DEMO_AGENTS));
      return INITIAL_DEMO_AGENTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_AGENTS;
  }
}

function saveLocalAgents(agents: LeadAgent[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LS_AGENTS_KEY, JSON.stringify(agents));
  }
}

function getLocalForms(): LeadEntryForm[] {
  if (typeof window === 'undefined') return INITIAL_DEMO_FORMS;
  try {
    const raw = localStorage.getItem(LS_FORMS_KEY);
    if (!raw) {
      localStorage.setItem(LS_FORMS_KEY, JSON.stringify(INITIAL_DEMO_FORMS));
      return INITIAL_DEMO_FORMS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_FORMS;
  }
}

function saveLocalForms(forms: LeadEntryForm[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LS_FORMS_KEY, JSON.stringify(forms));
  }
}

// ==============================================================================
// AGENT MANAGEMENT
// ==============================================================================

export async function fetchLeadAgents(businessId: string): Promise<LeadAgent[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('lead_agents')
        .select('*')
        .eq('business_id', businessId)
        .order('name', { ascending: true });
      if (!error && data && data.length > 0) {
        return data as LeadAgent[];
      }
    } catch {
      // Fallback
    }
  }

  const all = getLocalAgents();
  return all.filter((a) => a.business_id === businessId);
}

export async function createLeadAgent(
  businessId: string,
  data: { name: string; phone?: string; email?: string }
): Promise<{ success: boolean; agent?: LeadAgent; error?: string }> {
  if (!data.name.trim()) {
    return { success: false, error: 'Agent name is required.' };
  }

  const newAgent: LeadAgent = {
    id: `agent-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    business_id: businessId,
    name: data.name.trim(),
    phone: data.phone?.trim() || null,
    email: data.email?.trim() || null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const client = getSupabaseClient();
  if (client) {
    try {
      const { data: inserted, error } = await client
        .from('lead_agents')
        .insert({
          business_id: businessId,
          name: newAgent.name,
          phone: newAgent.phone,
          email: newAgent.email,
          is_active: true,
        })
        .select()
        .single();
      if (!error && inserted) {
        newAgent.id = inserted.id;
      }
    } catch {
      // Fallback to local
    }
  }

  const all = getLocalAgents();
  all.push(newAgent);
  saveLocalAgents(all);

  return { success: true, agent: newAgent };
}

export async function updateLeadAgent(
  agentId: string,
  updates: Partial<LeadAgent>
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (client) {
    try {
      await client
        .from('lead_agents')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', agentId);
    } catch {
      // Ignore
    }
  }

  const all = getLocalAgents();
  const idx = all.findIndex((a) => a.id === agentId);
  if (idx !== -1) {
    all[idx] = {
      ...all[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    saveLocalAgents(all);
    return { success: true };
  }
  return { success: false, error: 'Agent not found' };
}

export async function deleteLeadAgent(agentId: string): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('lead_agents').delete().eq('id', agentId);
    } catch {
      // Ignore
    }
  }

  const all = getLocalAgents();
  const filtered = all.filter((a) => a.id !== agentId);
  saveLocalAgents(filtered);
  return { success: true };
}

// ==============================================================================
// FORM TOKEN MANAGEMENT (For Business Admin)
// ==============================================================================

export async function getLeadEntryForm(businessId: string): Promise<LeadEntryForm> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('lead_entry_forms')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (!error && data) {
        return data as LeadEntryForm;
      }
    } catch {
      // Fallback
    }
  }

  const forms = getLocalForms();
  let found = forms.find((f) => f.business_id === businessId);
  if (!found) {
    // Auto-create initial form for this business
    found = {
      id: `form-${Date.now()}`,
      business_id: businessId,
      token: generateFormToken(),
      name: 'Main Lead Generation Team',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    forms.push(found);
    saveLocalForms(forms);
  }
  return found;
}

export async function regenerateFormToken(businessId: string): Promise<LeadEntryForm> {
  const newToken = generateFormToken();
  const client = getSupabaseClient();
  let updatedForm: LeadEntryForm | null = null;

  if (client) {
    try {
      const { data, error } = await client
        .from('lead_entry_forms')
        .update({
          token: newToken,
          updated_at: new Date().toISOString(),
        })
        .eq('business_id', businessId)
        .select()
        .single();
      if (!error && data) {
        updatedForm = data as LeadEntryForm;
      }
    } catch {
      // Fallback
    }
  }

  const forms = getLocalForms();
  const idx = forms.findIndex((f) => f.business_id === businessId);
  if (idx !== -1) {
    forms[idx] = {
      ...forms[idx],
      token: newToken,
      updated_at: new Date().toISOString(),
    };
    updatedForm = forms[idx];
  } else {
    updatedForm = {
      id: `form-${Date.now()}`,
      business_id: businessId,
      token: newToken,
      name: 'Main Lead Generation Team',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    forms.push(updatedForm);
  }
  saveLocalForms(forms);
  return updatedForm;
}

export async function toggleLeadFormActive(businessId: string, isActive: boolean): Promise<LeadEntryForm> {
  const client = getSupabaseClient();
  let updatedForm: LeadEntryForm | null = null;

  if (client) {
    try {
      const { data } = await client
        .from('lead_entry_forms')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('business_id', businessId)
        .select()
        .single();
      if (data) updatedForm = data as LeadEntryForm;
    } catch {
      // Fallback
    }
  }

  const forms = getLocalForms();
  const idx = forms.findIndex((f) => f.business_id === businessId);
  if (idx !== -1) {
    forms[idx] = {
      ...forms[idx],
      is_active: isActive,
      updated_at: new Date().toISOString(),
    };
    updatedForm = forms[idx];
  }
  saveLocalForms(forms);
  return updatedForm || (await getLeadEntryForm(businessId));
}

// ==============================================================================
// PUBLIC FORM VERIFICATION & SECURE SUBMISSION
// ==============================================================================

/**
 * Validates a public form token. Never exposes internal DB credentials or foreign IDs.
 */
export async function verifyPublicFormToken(token: string): Promise<{
  valid: boolean;
  status: 'active' | 'inactive' | 'invalid';
  config?: PublicFormConfig;
  error?: string;
}> {
  if (!token || typeof token !== 'string') {
    return { valid: false, status: 'invalid', error: 'This lead form is unavailable.' };
  }

  const cleanToken = token.trim();
  let formRecord: LeadEntryForm | null = null;

  // 1. Try Supabase
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('lead_entry_forms')
        .select('*')
        .eq('token', cleanToken)
        .single();
      if (!error && data) {
        formRecord = data as LeadEntryForm;
      }
    } catch {
      // Fallback to local
    }
  }

  // 2. Fallback to LocalStorage
  if (!formRecord) {
    const forms = getLocalForms();
    formRecord = forms.find((f) => f.token.toLowerCase() === cleanToken.toLowerCase()) || null;
  }

  if (!formRecord) {
    return {
      valid: false,
      status: 'invalid',
      error: 'This lead form is unavailable. Please verify your link.',
    };
  }

  if (!formRecord.is_active) {
    return {
      valid: false,
      status: 'inactive',
      error: 'This lead form has been disabled by the business administrator.',
    };
  }

  // Retrieve Business Name & Logo (safely, without secrets)
  let businessName = 'EcomHub Business';
  let businessLogo: string | null = null;
  if (typeof window !== 'undefined') {
    try {
      const rawBiz = localStorage.getItem(LS_BUSINESSES_KEY);
      if (rawBiz) {
        const businesses: Business[] = JSON.parse(rawBiz);
        const match = businesses.find((b) => b.id === formRecord!.business_id);
        if (match) {
          businessName = match.name;
          businessLogo = match.logo;
        }
      }
    } catch {
      // ignore
    }
  }

  // Retrieve active agents belonging strictly to this business
  const agents = await fetchLeadAgents(formRecord.business_id);
  const activeAgents = agents
    .filter((a) => a.is_active)
    .map((a) => ({ id: a.id, name: a.name }));

  return {
    valid: true,
    status: 'active',
    config: {
      form_name: formRecord.name,
      is_active: formRecord.is_active,
      business_id: formRecord.business_id,
      business_name: businessName,
      business_logo: businessLogo,
      agents: activeAgents,
    },
  };
}

/**
 * Handle public lead submission with server-grade security rules:
 * - Rate limit verification
 * - Honeypot anti-spam check
 * - Business ID resolution from token ONLY
 * - Input validation & sanitization
 * - Duplicate lead detection
 * - Lead, activity, and notification creation
 */
export async function submitPublicLead(
  payload: PublicLeadEntryPayload & { force_duplicate_submit?: boolean }
): Promise<{
  success: boolean;
  isDuplicate?: boolean;
  duplicateMatches?: string[];
  lead?: { id: string; name: string; agent_name: string };
  error?: string;
}> {
  // 1. Honeypot check: Bots usually fill hidden fields
  if (payload.honeypot && payload.honeypot.trim().length > 0) {
    // Silently reject or simulate success to trap bot
    return {
      success: true,
      lead: { id: 'lead-bot', name: payload.name, agent_name: payload.agent_name },
    };
  }

  // 2. Validate token & resolve business
  const verification = await verifyPublicFormToken(payload.form_token);
  if (!verification.valid || !verification.config) {
    return {
      success: false,
      error: verification.error || 'This lead form is unavailable.',
    };
  }

  const businessId = verification.config.business_id;

  // 3. Rate limiting check
  const now = Date.now();
  const tokenKey = payload.form_token;
  if (!rateLimitMap[tokenKey]) {
    rateLimitMap[tokenKey] = [];
  }
  // Filter out older timestamps
  rateLimitMap[tokenKey] = rateLimitMap[tokenKey].filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );

  if (rateLimitMap[tokenKey].length >= MAX_SUBMISSIONS_PER_WINDOW) {
    return {
      success: false,
      error: 'Submission rate limit reached. Please wait a minute before submitting again.',
    };
  }
  rateLimitMap[tokenKey].push(now);

  // 4. Validate required fields
  const trimmedName = (payload.name || '').trim();
  const trimmedPhone = (payload.phone || '').trim();
  const trimmedAgent = (payload.agent_name || '').trim();

  if (!trimmedName) {
    return { success: false, error: 'Please enter the lead name.' };
  }
  if (!trimmedPhone) {
    return { success: false, error: 'Please enter a valid contact phone number.' };
  }
  if (!trimmedAgent) {
    return { success: false, error: 'Please select or enter your agent name.' };
  }

  // Optional email format validation
  const trimmedEmail = (payload.email || '').trim();
  if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return { success: false, error: 'Please provide a valid email address or leave it blank.' };
  }

  // 5. Duplicate Detection Check
  if (!payload.force_duplicate_submit) {
    let existingLeads: Lead[] = [];
    if (typeof window !== 'undefined') {
      try {
        const rawLeads = localStorage.getItem(LS_LEADS_KEY);
        if (rawLeads) existingLeads = JSON.parse(rawLeads);
      } catch {
        // ignore
      }
    }

    const businessLeads = existingLeads.filter((l) => l.business_id === businessId);
    const cleanSubmittedPhone = trimmedPhone.replace(/[\s\-\(\)\+]/g, '');

    const duplicateReasons: string[] = [];
    for (const lead of businessLeads) {
      if (trimmedEmail && lead.email && lead.email.toLowerCase() === trimmedEmail.toLowerCase()) {
        duplicateReasons.push(`A lead with email "${lead.email}" already exists (${lead.name}).`);
      }
      if (lead.phone) {
        const cleanLeadPhone = lead.phone.replace(/[\s\-\(\)\+]/g, '');
        if (cleanSubmittedPhone && cleanLeadPhone && cleanSubmittedPhone.length >= 7) {
          if (
            cleanSubmittedPhone === cleanLeadPhone ||
            cleanSubmittedPhone.endsWith(cleanLeadPhone) ||
            cleanLeadPhone.endsWith(cleanSubmittedPhone)
          ) {
            duplicateReasons.push(`A lead with phone "${lead.phone}" already exists (${lead.name}).`);
          }
        }
      }
      if (
        payload.company &&
        payload.company.trim() &&
        lead.company &&
        lead.company.toLowerCase() === payload.company.trim().toLowerCase()
      ) {
        if (trimmedEmail && lead.email && lead.email.toLowerCase() === trimmedEmail.toLowerCase()) {
          duplicateReasons.push(`Matching company "${lead.company}" and email.`);
        }
      }
    }

    if (duplicateReasons.length > 0) {
      return {
        success: false,
        isDuplicate: true,
        duplicateMatches: Array.from(new Set(duplicateReasons)),
        error: 'This lead may already exist in the system.',
      };
    }
  }

  // 6. Create Lead
  const leadId = `lead-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const fullNotes = [
    payload.notes?.trim(),
    payload.source_detail ? `Source detail: ${payload.source_detail.trim()}` : null,
    `Submitted by Lead Agent: ${trimmedAgent}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const newLead: Lead = {
    id: leadId,
    business_id: businessId,
    name: trimmedName,
    company: payload.company?.trim() || null,
    email: trimmedEmail || null,
    phone: trimmedPhone,
    website: null,
    service: payload.service || 'General Inbound',
    message: fullNotes || null,
    budget: null,
    currency: 'USD',
    source: 'Agent',
    agent_name: trimmedAgent,
    campaign: `Agent Form: ${verification.config.form_name}`,
    landing_page: `/lead-entry/${payload.form_token}`,
    status: 'New',
    priority: 'Medium',
    assigned_to: null,
    last_contacted_at: null,
    next_followup_at: null,
    converted_to_client_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Try Supabase insert
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data: dbLead, error } = await client
        .from('leads')
        .insert({
          business_id: businessId,
          name: newLead.name,
          company: newLead.company,
          email: newLead.email,
          phone: newLead.phone,
          service: newLead.service,
          message: newLead.message,
          source: 'Agent',
          agent_name: trimmedAgent,
          campaign: newLead.campaign,
          landing_page: newLead.landing_page,
          status: 'New',
          priority: 'Medium',
        })
        .select()
        .single();
      if (!error && dbLead) {
        newLead.id = dbLead.id;
      }
    } catch {
      // Fallback
    }
  }

  // 7. Create Activity Log
  const newActivity: CrmActivity = {
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    business_id: businessId,
    lead_id: newLead.id,
    client_id: null,
    user_id: null,
    activity_type: 'Agent submission',
    title: `Lead submitted by agent: ${trimmedAgent}`,
    description: `${trimmedName} (${payload.service || 'Inquiry'}) was submitted via the public lead-entry link by agent ${trimmedAgent}.`,
    created_at: new Date().toISOString(),
  };

  // 8. Create In-App Notification
  const newNotification: NotificationItem = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    business_id: businessId,
    user_id: null,
    type: 'lead_capture',
    title: 'New Lead Received',
    message: `${trimmedName} was submitted by agent ${trimmedAgent}.`,
    link_section: 'leads',
    entity_id: newLead.id,
    is_read: false,
    created_at: new Date().toISOString(),
  };

  // 9. Persist into LocalStorage
  if (typeof window !== 'undefined') {
    try {
      // Leads
      const rawLeads = localStorage.getItem(LS_LEADS_KEY);
      const leadsList: Lead[] = rawLeads ? JSON.parse(rawLeads) : [];
      leadsList.unshift(newLead);
      localStorage.setItem(LS_LEADS_KEY, JSON.stringify(leadsList));

      // Activities
      const rawActs = localStorage.getItem(LS_ACTIVITIES_KEY);
      const actsList: CrmActivity[] = rawActs ? JSON.parse(rawActs) : [];
      actsList.unshift(newActivity);
      localStorage.setItem(LS_ACTIVITIES_KEY, JSON.stringify(actsList));

      // Notifications
      const rawNotifs = localStorage.getItem(LS_NOTIFICATIONS_KEY);
      const notifsList: NotificationItem[] = rawNotifs ? JSON.parse(rawNotifs) : [];
      notifsList.unshift(newNotification);
      localStorage.setItem(LS_NOTIFICATIONS_KEY, JSON.stringify(notifsList));

      // Notify CRM Context in any open tab
      window.dispatchEvent(
        new CustomEvent('ecomhub_lead_submitted', {
          detail: { lead: newLead, activity: newActivity, notification: newNotification },
        })
      );
    } catch {
      // Local storage failed
    }
  }

  return {
    success: true,
    lead: {
      id: newLead.id,
      name: newLead.name,
      agent_name: trimmedAgent,
    },
  };
}
