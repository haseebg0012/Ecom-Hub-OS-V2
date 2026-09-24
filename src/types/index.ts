/**
 * EcomHub OS — TypeScript Core Definitions
 * Product: EcomHub OS | Brand: EcomHub | Tagline: Your Business, One Hub.
 */

export type BusinessRole =
  | 'Owner'
  | 'Admin'
  | 'Manager'
  | 'Finance'
  | 'Sales'
  | 'Employee'
  | 'Viewer';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  email_confirmed_at?: string | null;
}

export interface Business {
  id: string;
  name: string;
  logo: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  default_currency: string;
  created_at: string;
  updated_at: string;
}

export interface BusinessMember {
  id: string;
  user_id: string;
  business_id: string;
  role: BusinessRole;
  created_at: string;
  profile?: Profile;
}

export interface BusinessWithRole extends Business {
  role: BusinessRole;
  member_count?: number;
}

export interface AuthSession {
  user: Profile;
  accessToken?: string;
}

export type ActiveNavSection =
  | 'dashboard'
  // SALES
  | 'leads'
  | 'clients'
  // OPERATIONS
  | 'projects'
  | 'tasks'
  | 'employees'
  // FINANCE
  | 'finance'
  | 'finance-recurring'
  | 'finance-reports'
  // BUSINESS
  | 'documents'
  | 'analytics'
  | 'notifications'
  // AI
  | 'copilot'
  // SETTINGS
  | 'business-settings'
  | 'team-roles'
  | 'login-history'
  | 'lead-entry-settings'
  | 'lead-agents'
  | 'integrations'
  // ARCHITECTURE & SECURITY
  | 'database-schema';

export interface MetricCardPlaceholder {
  title: string;
  category: string;
  iconName: string;
  description: string;
  moduleTarget: ActiveNavSection;
}

// ==============================================================================
// PHASE 2 CRM TYPES: Leads, Clients, Follow-ups, Activities, Currencies
// ==============================================================================

export type LeadStatus =
  | 'New'
  | 'Contacted'
  | 'Qualified'
  | 'Meeting'
  | 'Proposal'
  | 'Negotiation'
  | 'Won'
  | 'Lost';

export type LeadPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface Lead {
  id: string;
  business_id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  service: string | null;
  message: string | null;
  budget: number | null;
  currency: string; // 'USD' | 'PKR' | etc.
  source: string; // 'Website' | 'Agent' | 'Cold Call' | 'LinkedIn' | 'Referral' | 'Import' | 'Ads' | 'Organic' | 'Other'
  agent_name?: string | null;
  campaign: string | null;
  landing_page: string | null;
  status: LeadStatus;
  priority: LeadPriority;
  assigned_to: string | null;
  assigned_profile?: Profile | null;
  last_contacted_at: string | null;
  next_followup_at: string | null;
  converted_to_client_id: string | null;
  created_at: string;
  updated_at: string;
}

export type ClientStatus = 'Active' | 'Onboarding' | 'Paused' | 'Inactive' | 'Archived' | 'Churned';

export interface Client {
  id: string;
  business_id: string;
  company_name: string;
  logo: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  status: ClientStatus;
  source: string | null;
  assigned_to: string | null;
  assigned_profile?: Profile | null;
  preferred_currency: string; // 'PKR' | 'USD'
  notes: string | null;
  total_revenue?: number;
  outstanding_balance?: number;
  created_at: string;
  updated_at: string;
}

export interface ClientContact {
  id: string;
  business_id: string;
  client_id: string;
  name: string;
  position: string | null;
  email: string | null;
  phone: string | null;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
}

export interface ClientNote {
  id: string;
  business_id: string;
  client_id: string;
  user_id: string;
  user_profile?: Profile | null;
  content: string;
  created_at: string;
  updated_at: string;
}

export type CrmActivityType =
  | 'Note'
  | 'Call'
  | 'Email'
  | 'Meeting'
  | 'Status change'
  | 'Assignment'
  | 'Follow-up'
  | 'Website submission'
  | 'Agent submission'
  | 'Import'
  | 'Converted';

export interface CrmActivity {
  id: string;
  business_id: string;
  lead_id: string | null;
  client_id: string | null;
  user_id: string | null;
  user_profile?: Profile | null;
  activity_type: CrmActivityType;
  title: string;
  description: string | null;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface LeadFollowup {
  id: string;
  business_id: string;
  lead_id: string;
  lead_name?: string;
  lead_company?: string | null;
  assigned_to: string | null;
  assigned_profile?: Profile | null;
  followup_date: string; // YYYY-MM-DD
  followup_time: string | null; // HH:MM
  note: string | null;
  status: 'Pending' | 'Completed' | 'Cancelled';
  created_at: string;
  updated_at: string;
}

export interface ExchangeRate {
  id: string;
  business_id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  effective_date: string;
  created_by: string | null;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  business_id: string;
  user_id: string | null;
  type:
    | 'lead_capture'
    | 'lead_assigned'
    | 'followup_due'
    | 'followup_overdue'
    | 'lead_converted'
    | 'client_created'
    | 'invoice_created'
    | 'invoice_paid'
    | 'invoice_overdue'
    | 'payment_received'
    | 'expense_added'
    | 'user_login'
    | 'audit_action';
  title: string;
  message: string;
  link_section: ActiveNavSection;
  entity_id?: string;
  is_read: boolean;
  created_at: string;
}

// ==============================================================================
// USER SESSION AUDIT & TRACKING TYPES (PHASE 3E)
// ==============================================================================

export type SessionEndReason =
  | 'logout'
  | 'expired'
  | 'inactive'
  | 'session_replaced'
  | 'unknown';

export interface UserSession {
  id: string;
  business_id: string;
  user_id: string;
  user_profile?: Profile | null;
  user_role?: BusinessRole | null;
  session_started_at: string;
  last_seen_at: string;
  session_ended_at: string | null;
  end_reason: SessionEndReason | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
}

// ==============================================================================
// AUDIT LOG & DELETION CONTROL TYPES (PHASE 3E)
// ==============================================================================

export type AuditActionType =
  | 'create'
  | 'edit'
  | 'delete'
  | 'archive'
  | 'cancel'
  | 'deactivate'
  | 'soft_delete'
  | 'restore';

export interface AuditLogEntry {
  id: string;
  business_id: string;
  user_id: string;
  user_profile?: Profile | null;
  user_role?: BusinessRole | null;
  module: string;
  action: AuditActionType;
  record_id: string;
  record_title?: string | null;
  reason?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
}

// ==============================================================================
// PUBLIC LEAD ENTRY & AGENT MANAGEMENT TYPES
// ==============================================================================

export interface LeadAgent {
  id: string;
  business_id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeadEntryForm {
  id: string;
  business_id: string;
  token: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PublicFormConfig {
  form_name: string;
  is_active: boolean;
  business_id: string;
  business_name: string;
  business_logo: string | null;
  agents: { id: string; name: string }[];
}

export interface PublicLeadEntryPayload {
  form_token: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  service?: string;
  agent_name: string;
  notes?: string;
  source_detail?: string;
  honeypot?: string; // Bot trap
}

// Export Phase 3 Finance Types
export * from './finance';
