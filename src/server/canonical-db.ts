/**
 * =============================================================================
 * EcomHub OS — Canonical Database & Local Mirror Engine
 * =============================================================================
 * 
 * ARCHITECTURAL SPECIFICATION: SOURCE OF TRUTH (Guardrail A)
 * -----------------------------------------------------------------------------
 * 1. Supabase database remains the primary authoritative persistent source of
 *    truth for production business data, employee records, and role assignments.
 * 2. The `data/supabase_canonical_db.json` file is strictly a development and
 *    local server mirror/fallback cache.
 * 3. It must NOT:
 *    - Override newer Supabase records.
 *    - Independently define permissions.
 *    - Become a second conflicting canonical database.
 *    - Restore deleted or stale role assignments.
 *    - Be required for browser/client authorization.
 * 4. If remote Supabase is available and reachable: Supabase wins unconditionally.
 * =============================================================================
 */

import fs from 'fs';
import path from 'path';

export interface CanonicalProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CanonicalBusiness {
  id: string;
  name: string;
  logo?: string | null;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  default_currency: string;
  created_at: string;
  updated_at: string;
}

export interface CanonicalBusinessMember {
  id: string;
  user_id: string;
  business_id: string;
  role: string;
  created_at: string;
}

export interface CanonicalBusinessMemberRole {
  id: string;
  business_member_id?: string;
  user_id: string;
  business_id: string;
  role_key: string;
  created_at: string;
  created_by?: string | null;
}

export interface CanonicalAuthUser {
  id: string;
  email: string;
  password?: string;
  user_metadata?: Record<string, any>;
  app_metadata?: Record<string, any>;
  created_at: string;
  email_confirmed_at?: string | null;
}

export interface CanonicalRolePermission {
  id: string;
  role_key: string;
  module_key: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_export: boolean;
  updated_at: string;
  updated_by?: string | null;
}

export interface CanonicalRoleUiAccess {
  id: string;
  role_key: string;
  tab_key: string;
  visible: boolean;
  updated_at: string;
  updated_by?: string | null;
}

export interface CanonicalDatabase {
  profiles: CanonicalProfile[];
  businesses: CanonicalBusiness[];
  business_members: CanonicalBusinessMember[];
  business_member_roles: CanonicalBusinessMemberRole[];
  auth_users: CanonicalAuthUser[];
  role_permissions?: CanonicalRolePermission[];
  role_ui_access?: CanonicalRoleUiAccess[];
  leads?: any[];
  clients?: any[];
  client_contacts?: any[];
  client_notes?: any[];
  crm_activities?: any[];
  lead_followups?: any[];
  exchange_rates?: any[];
  notifications?: any[];
  tasks?: any[];
  task_notes?: any[];
  projects?: any[];
  invoices?: any[];
  invoice_items?: any[];
  payments?: any[];
  expenses?: any[];
  financial_accounts?: any[];
  financial_categories?: any[];
  financial_settings?: any[];
  income_records?: any[];
  investments?: any[];
  recurring_transactions?: any[];
  recurring_runs?: any[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'supabase_canonical_db.json');

let inMemoryDb: CanonicalDatabase | null = null;

function getInitialBaseline(): CanonicalDatabase {
  const now = new Date('2025-01-15T09:00:00Z').toISOString();
  return {
    businesses: [
      {
        id: 'biz-ecometrix-001',
        name: 'Ecometrix Hub',
        email: 'haseebg0012@gmail.com',
        phone: '+1 (555) 234-5678',
        website: 'https://ecometrixhub.com',
        address: 'One Central Tower, Suite 1400, New York, NY',
        default_currency: 'USD',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'biz-acme-002',
        name: 'Acme Retail Co',
        email: 'admin@acme.com',
        default_currency: 'USD',
        created_at: now,
        updated_at: now,
      },
    ],
    profiles: [
      {
        id: 'usr-ecometrix-001',
        email: 'haseebg0012@gmail.com',
        full_name: 'Haseeb Gul',
        avatar_url: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'usr-colleague-002',
        email: 'colleague@ecomhub.local',
        full_name: 'Sarah Jenkins',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'usr-demo-sales',
        email: 'sales@ecomhub.local',
        full_name: 'David Vance',
        created_at: now,
        updated_at: now,
      }
    ],
    business_members: [
      {
        id: 'bm-owner-001',
        user_id: 'usr-ecometrix-001',
        business_id: 'biz-ecometrix-001',
        role: 'Owner',
        created_at: now,
      },
      {
        id: 'bm-admin-002',
        user_id: 'usr-colleague-002',
        business_id: 'biz-ecometrix-001',
        role: 'Admin',
        created_at: now,
      },
      {
        id: 'bm-sales-003',
        user_id: 'usr-demo-sales',
        business_id: 'biz-ecometrix-001',
        role: 'Sales',
        created_at: now,
      }
    ],
    business_member_roles: [
      {
        id: 'bmr-owner-001',
        business_member_id: 'bm-owner-001',
        user_id: 'usr-ecometrix-001',
        business_id: 'biz-ecometrix-001',
        role_key: 'Owner',
        created_at: now,
        created_by: 'usr-ecometrix-001',
      },
      {
        id: 'bmr-owner-002',
        business_member_id: 'bm-owner-001',
        user_id: 'usr-ecometrix-001',
        business_id: 'biz-ecometrix-001',
        role_key: 'Admin',
        created_at: now,
        created_by: 'usr-ecometrix-001',
      },
      {
        id: 'bmr-admin-001',
        business_member_id: 'bm-admin-002',
        user_id: 'usr-colleague-002',
        business_id: 'biz-ecometrix-001',
        role_key: 'Admin',
        created_at: now,
        created_by: 'usr-ecometrix-001',
      },
      {
        id: 'bmr-sales-001',
        business_member_id: 'bm-sales-003',
        user_id: 'usr-demo-sales',
        business_id: 'biz-ecometrix-001',
        role_key: 'Sales',
        created_at: now,
        created_by: 'usr-ecometrix-001',
      }
    ],
    auth_users: [
      {
        id: 'usr-ecometrix-001',
        email: 'haseebg0012@gmail.com',
        password: 'Password123!',
        user_metadata: { full_name: 'Haseeb Gul', role: 'Owner' },
        app_metadata: { is_platform_owner: true },
        created_at: now,
        email_confirmed_at: now,
      },
      {
        id: 'usr-demo-sales',
        email: 'sales@ecomhub.local',
        password: 'Password123!',
        user_metadata: { full_name: 'David Vance', role: 'Sales' },
        created_at: now,
        email_confirmed_at: now,
      }
    ],
    leads: [],
    clients: [],
    client_contacts: [],
    client_notes: [],
    crm_activities: [],
    lead_followups: [],
    exchange_rates: [],
    notifications: [],
    tasks: [],
    task_notes: [],
    projects: [],
  };
}

export function loadDatabase(): CanonicalDatabase {
  if (inMemoryDb) return inMemoryDb;

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      inMemoryDb = {
        businesses: Array.isArray(parsed.businesses) ? parsed.businesses : [],
        profiles: Array.isArray(parsed.profiles) ? parsed.profiles : [],
        business_members: Array.isArray(parsed.business_members) ? parsed.business_members : [],
        business_member_roles: Array.isArray(parsed.business_member_roles) ? parsed.business_member_roles : [],
        auth_users: Array.isArray(parsed.auth_users) ? parsed.auth_users : [],
        role_permissions: Array.isArray(parsed.role_permissions) ? parsed.role_permissions : [],
        role_ui_access: Array.isArray(parsed.role_ui_access) ? parsed.role_ui_access : [],
        leads: Array.isArray(parsed.leads) ? parsed.leads : [],
        clients: Array.isArray(parsed.clients) ? parsed.clients : [],
        client_contacts: Array.isArray(parsed.client_contacts) ? parsed.client_contacts : [],
        client_notes: Array.isArray(parsed.client_notes) ? parsed.client_notes : [],
        crm_activities: Array.isArray(parsed.crm_activities) ? parsed.crm_activities : [],
        lead_followups: Array.isArray(parsed.lead_followups) ? parsed.lead_followups : [],
        exchange_rates: Array.isArray(parsed.exchange_rates) ? parsed.exchange_rates : [],
        notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
        task_notes: Array.isArray(parsed.task_notes) ? parsed.task_notes : [],
        projects: Array.isArray(parsed.projects) ? parsed.projects : [],
        invoices: Array.isArray(parsed.invoices) ? parsed.invoices : [],
        invoice_items: Array.isArray(parsed.invoice_items) ? parsed.invoice_items : [],
        payments: Array.isArray(parsed.payments) ? parsed.payments : [],
        expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
        financial_accounts: Array.isArray(parsed.financial_accounts) ? parsed.financial_accounts : [],
        financial_categories: Array.isArray(parsed.financial_categories) ? parsed.financial_categories : [],
        financial_settings: Array.isArray(parsed.financial_settings) ? parsed.financial_settings : [],
        income_records: Array.isArray(parsed.income_records) ? parsed.income_records : [],
        investments: Array.isArray(parsed.investments) ? parsed.investments : [],
        recurring_transactions: Array.isArray(parsed.recurring_transactions) ? parsed.recurring_transactions : [],
        recurring_runs: Array.isArray(parsed.recurring_runs) ? parsed.recurring_runs : [],
      };
      seedBaselinePermissionsIfEmpty(inMemoryDb);
      seedBaselineFinanceIfEmpty(inMemoryDb);
    } else {
      inMemoryDb = getInitialBaseline();
      seedBaselinePermissionsIfEmpty(inMemoryDb);
      seedBaselineFinanceIfEmpty(inMemoryDb);
      saveDatabase(inMemoryDb);
    }
  } catch (err) {
    console.warn('[Canonical DB] Error loading file, using baseline:', err);
    inMemoryDb = getInitialBaseline();
    seedBaselinePermissionsIfEmpty(inMemoryDb);
    seedBaselineFinanceIfEmpty(inMemoryDb);
  }

  return inMemoryDb;
}

export function saveDatabase(db: CanonicalDatabase): void {
  inMemoryDb = db;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmp = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tmp, DB_FILE);
  } catch (err) {
    console.error('[Canonical DB] Failed to save database to disk:', err);
  }
}

// -----------------------------------------------------------------------------
// Canonical Normalized Roles Management (public.business_member_roles)
// -----------------------------------------------------------------------------

export function getRolesForMember(userId: string, businessId: string): CanonicalBusinessMemberRole[] {
  const db = loadDatabase();
  return (db.business_member_roles || []).filter(
    (r) => r.user_id === userId && r.business_id === businessId
  );
}

export function insertMemberRole(
  userId: string,
  businessId: string,
  roleKey: string,
  createdBy?: string | null,
  businessMemberId?: string
): CanonicalBusinessMemberRole {
  const db = loadDatabase();
  const existing = (db.business_member_roles || []).find(
    (r) => r.user_id === userId && r.business_id === businessId && r.role_key.toLowerCase() === roleKey.toLowerCase()
  );
  if (existing) {
    return existing;
  }

  let bmId = businessMemberId;
  if (!bmId) {
    const member = (db.business_members || []).find(
      (m) => m.user_id === userId && m.business_id === businessId
    );
    bmId = member?.id || `bm-${userId}`;
  }

  const newRoleRow: CanonicalBusinessMemberRole = {
    id: `bmr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    business_member_id: bmId,
    user_id: userId,
    business_id: businessId,
    role_key: roleKey,
    created_at: new Date().toISOString(),
    created_by: createdBy || null,
  };

  db.business_member_roles.push(newRoleRow);
  saveDatabase(db);
  return newRoleRow;
}

export function deleteMemberRole(userId: string, businessId: string, roleKey: string): boolean {
  const db = loadDatabase();
  const prevCount = db.business_member_roles.length;
  db.business_member_roles = (db.business_member_roles || []).filter(
    (r) => !(r.user_id === userId && r.business_id === businessId && r.role_key.toLowerCase() === roleKey.toLowerCase())
  );
  const changed = db.business_member_roles.length !== prevCount;
  if (changed) {
    saveDatabase(db);
  }
  return changed;
}

/**
 * Reconciles role assignments:
 * - Inserts only missing role assignments.
 * - Deletes only removed role assignments.
 * - Does not touch Auth user or business member identity.
 */
export function reconcileMemberRoles(
  userId: string,
  businessId: string,
  targetRoles: string[],
  createdBy?: string | null,
  businessMemberId?: string
): CanonicalBusinessMemberRole[] {
  const db = loadDatabase();
  const currentRoles = getRolesForMember(userId, businessId);
  const currentKeys = currentRoles.map((r) => r.role_key.toLowerCase());
  const targetKeys = targetRoles.map((r) => r.trim()).filter(Boolean);
  const targetLower = targetKeys.map((r) => r.toLowerCase());

  // 1. Delete only removed role assignments
  currentRoles.forEach((cur) => {
    if (!targetLower.includes(cur.role_key.toLowerCase())) {
      deleteMemberRole(userId, businessId, cur.role_key);
    }
  });

  // 2. Insert only missing role assignments
  targetKeys.forEach((key) => {
    if (!currentKeys.includes(key.toLowerCase())) {
      insertMemberRole(userId, businessId, key, createdBy, businessMemberId);
    }
  });

  return getRolesForMember(userId, businessId);
}

// -----------------------------------------------------------------------------
// Profiles & Business Members
// -----------------------------------------------------------------------------

export function upsertProfile(profile: Partial<CanonicalProfile> & { id: string; email: string }): CanonicalProfile {
  const db = loadDatabase();
  const idx = db.profiles.findIndex((p) => p.id === profile.id || p.email.toLowerCase() === profile.email.toLowerCase());
  const now = new Date().toISOString();
  if (idx >= 0) {
    db.profiles[idx] = {
      ...db.profiles[idx],
      ...profile,
      updated_at: now,
    };
    saveDatabase(db);
    return db.profiles[idx];
  } else {
    const newProf: CanonicalProfile = {
      id: profile.id,
      email: profile.email.toLowerCase(),
      full_name: profile.full_name || 'Team Member',
      avatar_url: profile.avatar_url || null,
      created_at: profile.created_at || now,
      updated_at: now,
    };
    db.profiles.push(newProf);
    saveDatabase(db);
    return newProf;
  }
}

export function upsertBusinessMember(member: {
  id?: string;
  user_id: string;
  business_id: string;
  role: string;
}): CanonicalBusinessMember {
  const db = loadDatabase();
  const idx = db.business_members.findIndex(
    (m) => m.user_id === member.user_id && m.business_id === member.business_id
  );
  if (idx >= 0) {
    db.business_members[idx].role = member.role;
    saveDatabase(db);
    return db.business_members[idx];
  } else {
    const newMem: CanonicalBusinessMember = {
      id: member.id || `bm-${member.user_id}`,
      user_id: member.user_id,
      business_id: member.business_id,
      role: member.role,
      created_at: new Date().toISOString(),
    };
    db.business_members.push(newMem);
    saveDatabase(db);
    return newMem;
  }
}

export function deleteBusinessMember(userId: string, businessId: string): void {
  const db = loadDatabase();
  db.business_members = (db.business_members || []).filter(
    (m) => !(m.user_id === userId && m.business_id === businessId)
  );
  db.business_member_roles = (db.business_member_roles || []).filter(
    (r) => !(r.user_id === userId && r.business_id === businessId)
  );
  saveDatabase(db);
}

// -----------------------------------------------------------------------------
// Auth Users
// -----------------------------------------------------------------------------

export function findAuthUser(email: string): CanonicalAuthUser | null {
  const db = loadDatabase();
  const clean = email.trim().toLowerCase();
  return (db.auth_users || []).find((u) => u.email.toLowerCase() === clean) || null;
}

export function createAuthUserRecord(
  email: string,
  password: string,
  metadata?: Record<string, any>,
  forcedId?: string
): CanonicalAuthUser {
  const db = loadDatabase();
  const clean = email.trim().toLowerCase();
  const existing = (db.auth_users || []).find((u) => u.email.toLowerCase() === clean);
  if (existing) {
    existing.password = password;
    if (metadata) existing.user_metadata = { ...existing.user_metadata, ...metadata };
    saveDatabase(db);
    return existing;
  }

  const now = new Date().toISOString();
  const newUser: CanonicalAuthUser = {
    id: forcedId || `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    email: clean,
    password: password,
    user_metadata: metadata || {},
    app_metadata: {},
    created_at: now,
    email_confirmed_at: now,
  };

  db.auth_users.push(newUser);
  saveDatabase(db);
  return newUser;
}

// -----------------------------------------------------------------------------
// Canonical Permissions Matrix (public.role_permissions & public.role_ui_access)
// -----------------------------------------------------------------------------

const DEFAULT_BASELINE_CRUD: Record<string, Record<string, boolean>> = {
  Owner: {
    'crm.view': true, 'crm.create': true, 'crm.edit': true, 'crm.delete': true, 'crm.export': true,
    'tasks.view': true, 'tasks.create': true, 'tasks.edit': true, 'tasks.delete': true, 'tasks.export': true,
    'projects.view': true, 'projects.create': true, 'projects.edit': true, 'projects.delete': true, 'projects.export': true,
    'analytics.view': true, 'analytics.create': true, 'analytics.edit': true, 'analytics.delete': true, 'analytics.export': true,
    'finance.view': true, 'finance.create': true, 'finance.edit': true, 'finance.delete': true, 'finance.export': true,
    'documents.view': true, 'documents.create': true, 'documents.edit': true, 'documents.delete': true, 'documents.export': true,
    'team_roles.view': true, 'team_roles.create': true, 'team_roles.edit': true, 'team_roles.delete': true, 'team_roles.export': true,
  },
  Admin: {
    'crm.view': true, 'crm.create': true, 'crm.edit': true, 'crm.delete': true, 'crm.export': true,
    'tasks.view': true, 'tasks.create': true, 'tasks.edit': true, 'tasks.delete': true, 'tasks.export': true,
    'projects.view': true, 'projects.create': true, 'projects.edit': true, 'projects.delete': true, 'projects.export': true,
    'analytics.view': true, 'analytics.create': true, 'analytics.edit': true, 'analytics.delete': true, 'analytics.export': true,
    'finance.view': true, 'finance.create': true, 'finance.edit': true, 'finance.delete': false, 'finance.export': true,
    'documents.view': true, 'documents.create': true, 'documents.edit': true, 'documents.delete': true, 'documents.export': true,
    'team_roles.view': true, 'team_roles.create': true, 'team_roles.edit': true, 'team_roles.delete': true, 'team_roles.export': true,
  },
  Operations: {
    'crm.view': true, 'crm.create': false, 'crm.edit': true, 'crm.delete': false, 'crm.export': false,
    'tasks.view': true, 'tasks.create': true, 'tasks.edit': true, 'tasks.delete': true, 'tasks.export': true,
    'projects.view': true, 'projects.create': true, 'projects.edit': true, 'projects.delete': false, 'projects.export': true,
    'analytics.view': true, 'analytics.create': false, 'analytics.edit': false, 'analytics.delete': false, 'analytics.export': false,
    'finance.view': false, 'finance.create': false, 'finance.edit': false, 'finance.delete': false, 'finance.export': false,
    'documents.view': true, 'documents.create': true, 'documents.edit': true, 'documents.delete': false, 'documents.export': false,
    'team_roles.view': false, 'team_roles.create': false, 'team_roles.edit': false, 'team_roles.delete': false, 'team_roles.export': false,
  },
  Sales: {
    'crm.view': true, 'crm.create': true, 'crm.edit': true, 'crm.delete': false, 'crm.export': false,
    'tasks.view': true, 'tasks.create': true, 'tasks.edit': true, 'tasks.delete': true, 'tasks.export': false,
    'projects.view': true, 'projects.create': false, 'projects.edit': false, 'projects.delete': false, 'projects.export': false,
    'analytics.view': true, 'analytics.create': false, 'analytics.edit': false, 'analytics.delete': false, 'analytics.export': false,
    'finance.view': false, 'finance.create': false, 'finance.edit': false, 'finance.delete': false, 'finance.export': false,
    'documents.view': true, 'documents.create': false, 'documents.edit': false, 'documents.delete': false, 'documents.export': false,
    'team_roles.view': false, 'team_roles.create': false, 'team_roles.edit': false, 'team_roles.delete': false, 'team_roles.export': false,
  },
  Manager: {
    'crm.view': true, 'crm.create': true, 'crm.edit': true, 'crm.delete': false, 'crm.export': true,
    'tasks.view': true, 'tasks.create': true, 'tasks.edit': true, 'tasks.delete': false, 'tasks.export': true,
    'projects.view': true, 'projects.create': true, 'projects.edit': true, 'projects.delete': false, 'projects.export': true,
    'analytics.view': true, 'analytics.create': false, 'analytics.edit': false, 'analytics.delete': false, 'analytics.export': true,
    'finance.view': false, 'finance.create': false, 'finance.edit': false, 'finance.delete': false, 'finance.export': false,
    'documents.view': true, 'documents.create': true, 'documents.edit': true, 'documents.delete': false, 'documents.export': false,
    'team_roles.view': false, 'team_roles.create': false, 'team_roles.edit': false, 'team_roles.delete': false, 'team_roles.export': false,
  },
  Finance: {
    'crm.view': true, 'crm.create': false, 'crm.edit': false, 'crm.delete': false, 'crm.export': true,
    'tasks.view': true, 'tasks.create': false, 'tasks.edit': false, 'tasks.delete': false, 'tasks.export': false,
    'projects.view': true, 'projects.create': false, 'projects.edit': false, 'projects.delete': false, 'projects.export': false,
    'analytics.view': true, 'analytics.create': true, 'analytics.edit': true, 'analytics.delete': false, 'analytics.export': true,
    'finance.view': true, 'finance.create': true, 'finance.edit': true, 'finance.delete': true, 'finance.export': true,
    'documents.view': true, 'documents.create': true, 'documents.edit': true, 'documents.delete': false, 'documents.export': true,
    'team_roles.view': false, 'team_roles.create': false, 'team_roles.edit': false, 'team_roles.delete': false, 'team_roles.export': false,
  },
  Employee: {
    'crm.view': true, 'crm.create': false, 'crm.edit': false, 'crm.delete': false, 'crm.export': false,
    'tasks.view': true, 'tasks.create': true, 'tasks.edit': true, 'tasks.delete': false, 'tasks.export': false,
    'projects.view': true, 'projects.create': false, 'projects.edit': false, 'projects.delete': false, 'projects.export': false,
    'analytics.view': false, 'analytics.create': false, 'analytics.edit': false, 'analytics.delete': false, 'analytics.export': false,
    'finance.view': false, 'finance.create': false, 'finance.edit': false, 'finance.delete': false, 'finance.export': false,
    'documents.view': true, 'documents.create': false, 'documents.edit': false, 'documents.delete': false, 'documents.export': false,
    'team_roles.view': false, 'team_roles.create': false, 'team_roles.edit': false, 'team_roles.delete': false, 'team_roles.export': false,
  },
  Viewer: {
    'crm.view': true, 'crm.create': false, 'crm.edit': false, 'crm.delete': false, 'crm.export': false,
    'tasks.view': true, 'tasks.create': false, 'tasks.edit': false, 'tasks.delete': false, 'tasks.export': false,
    'projects.view': true, 'projects.create': false, 'projects.edit': false, 'projects.delete': false, 'projects.export': false,
    'analytics.view': true, 'analytics.create': false, 'analytics.edit': false, 'analytics.delete': false, 'analytics.export': false,
    'finance.view': true, 'finance.create': false, 'finance.edit': false, 'finance.delete': false, 'finance.export': false,
    'documents.view': true, 'documents.create': false, 'documents.edit': false, 'documents.delete': false, 'documents.export': false,
    'team_roles.view': false, 'team_roles.create': false, 'team_roles.edit': false, 'team_roles.delete': false, 'team_roles.export': false,
  },
};

const DEFAULT_BASELINE_UI: Record<string, Record<string, boolean>> = {
  Owner: {
    dashboard: true, leads: true, clients: true, projects: true, tasks: true,
    'team-members-roles': true, finance: true, documents: true, analytics: true,
    notifications: true, 'lead-entry-settings': true, 'login-history': true, integrations: true,
  },
  Admin: {
    dashboard: true, leads: true, clients: true, projects: true, tasks: true,
    'team-members-roles': true, finance: true, documents: true, analytics: true,
    notifications: true, 'lead-entry-settings': true, 'login-history': true, integrations: true,
  },
  Operations: {
    dashboard: true, leads: true, clients: true, projects: true, tasks: true,
    'team-members-roles': false, finance: false, documents: true, analytics: false,
    notifications: true, 'lead-entry-settings': false, 'login-history': false, integrations: false,
  },
  Sales: {
    dashboard: true, leads: true, clients: true, projects: true, tasks: true,
    'team-members-roles': false, finance: false, documents: true, analytics: true,
    notifications: true, 'lead-entry-settings': false, 'login-history': false, integrations: false,
  },
  Manager: {
    dashboard: true, leads: true, clients: true, projects: true, tasks: true,
    'team-members-roles': false, finance: false, documents: true, analytics: true,
    notifications: true, 'lead-entry-settings': true, 'login-history': false, integrations: false,
  },
  Finance: {
    dashboard: true, leads: false, clients: true, projects: false, tasks: false,
    'team-members-roles': false, finance: true, documents: true, analytics: true,
    notifications: true, 'lead-entry-settings': false, 'login-history': true, integrations: false,
  },
  Employee: {
    dashboard: true, leads: false, clients: false, projects: true, tasks: true,
    'team-members-roles': false, finance: false, documents: true, analytics: false,
    notifications: true, 'lead-entry-settings': false, 'login-history': false, integrations: false,
  },
  Viewer: {
    dashboard: true, leads: true, clients: true, projects: true, tasks: true,
    'team-members-roles': false, finance: true, documents: true, analytics: true,
    notifications: true, 'lead-entry-settings': false, 'login-history': false, integrations: false,
  },
};

// Aliases mapping canonical keys
const CANONICAL_ROLE_ALIASES: Record<string, string> = {
  owner: 'Owner',
  business_admin: 'Admin',
  operations_specialist: 'Operations',
  sales_representative: 'Sales',
  marketing_manager: 'Manager',
  finance_manager: 'Finance',
  employee_default: 'Employee',
  stakeholder_viewer: 'Viewer',
};

export function seedBaselinePermissionsIfEmpty(db: CanonicalDatabase): void {
  const now = new Date().toISOString();
  const MODULES = ['crm', 'tasks', 'projects', 'analytics', 'finance', 'documents', 'team_roles'];
  let touched = false;

  if (!db.role_permissions || db.role_permissions.length === 0) {
    db.role_permissions = [];
    const allRoles = [
      ...Object.keys(DEFAULT_BASELINE_CRUD),
      ...Object.keys(CANONICAL_ROLE_ALIASES),
    ];

    allRoles.forEach((rKey) => {
      const sourceKey = CANONICAL_ROLE_ALIASES[rKey] || rKey;
      const sourcePerms = DEFAULT_BASELINE_CRUD[sourceKey] || {};

      MODULES.forEach((mod) => {
        const canView = sourcePerms[`${mod}.view`] === true;
        db.role_permissions!.push({
          id: `rp-${rKey}-${mod}`,
          role_key: rKey,
          module_key: mod,
          can_view: canView,
          can_create: canView && sourcePerms[`${mod}.create`] === true,
          can_edit: canView && sourcePerms[`${mod}.edit`] === true,
          can_delete: canView && sourcePerms[`${mod}.delete`] === true,
          can_export: canView && sourcePerms[`${mod}.export`] === true,
          updated_at: now,
          updated_by: 'system',
        });
      });
    });
    touched = true;
  }

  if (!db.role_ui_access || db.role_ui_access.length === 0) {
    db.role_ui_access = [];
    const allRoles = [
      ...Object.keys(DEFAULT_BASELINE_UI),
      ...Object.keys(CANONICAL_ROLE_ALIASES),
    ];

    allRoles.forEach((rKey) => {
      const sourceKey = CANONICAL_ROLE_ALIASES[rKey] || rKey;
      const sourceTabs = DEFAULT_BASELINE_UI[sourceKey] || {};

      Object.entries(sourceTabs).forEach(([tabKey, visible]) => {
        db.role_ui_access!.push({
          id: `rua-${rKey}-${tabKey}`,
          role_key: rKey,
          tab_key: tabKey,
          visible: visible === true,
          updated_at: now,
          updated_by: 'system',
        });
      });
    });
    touched = true;
  }

  if (touched) {
    saveDatabase(db);
  }
}

export function getRolePermissionsList(): CanonicalRolePermission[] {
  const db = loadDatabase();
  return db.role_permissions || [];
}

export function getRoleUiAccessList(): CanonicalRoleUiAccess[] {
  const db = loadDatabase();
  return db.role_ui_access || [];
}

export function saveRolePermissionsMatrix(
  matrix: Record<string, Record<string, boolean>>,
  updatedBy?: string | null
): CanonicalRolePermission[] {
  const db = loadDatabase();
  if (!db.role_permissions) db.role_permissions = [];

  const now = new Date().toISOString();
  const MODULES = ['crm', 'tasks', 'projects', 'analytics', 'finance', 'documents', 'team_roles'];

  Object.entries(matrix).forEach(([roleKey, perms]) => {
    MODULES.forEach((mod) => {
      const canView = perms[`${mod}.view`] === true;
      const canCreate = canView && perms[`${mod}.create`] === true;
      const canEdit = canView && perms[`${mod}.edit`] === true;
      const canDelete = canView && perms[`${mod}.delete`] === true;
      const canExport = canView && perms[`${mod}.export`] === true;

      const idx = db.role_permissions!.findIndex(
        (rp) => rp.role_key.toLowerCase() === roleKey.toLowerCase() && rp.module_key.toLowerCase() === mod.toLowerCase()
      );

      const record: CanonicalRolePermission = {
        id: idx >= 0 ? db.role_permissions![idx].id : `rp-${roleKey}-${mod}-${Date.now()}`,
        role_key: roleKey,
        module_key: mod,
        can_view: canView,
        can_create: canCreate,
        can_edit: canEdit,
        can_delete: canDelete,
        can_export: canExport,
        updated_at: now,
        updated_by: updatedBy || null,
      };

      if (idx >= 0) {
        db.role_permissions![idx] = record;
      } else {
        db.role_permissions!.push(record);
      }
    });
  });

  saveDatabase(db);
  return db.role_permissions;
}

export function saveRoleUiAccessMap(
  uiMap: Record<string, Record<string, boolean>>,
  updatedBy?: string | null
): CanonicalRoleUiAccess[] {
  const db = loadDatabase();
  if (!db.role_ui_access) db.role_ui_access = [];

  const now = new Date().toISOString();

  Object.entries(uiMap).forEach(([roleKey, tabs]) => {
    Object.entries(tabs).forEach(([tabKey, isVisible]) => {
      const idx = db.role_ui_access!.findIndex(
        (rua) => rua.role_key.toLowerCase() === roleKey.toLowerCase() && rua.tab_key.toLowerCase() === tabKey.toLowerCase()
      );

      const record: CanonicalRoleUiAccess = {
        id: idx >= 0 ? db.role_ui_access![idx].id : `rua-${roleKey}-${tabKey}-${Date.now()}`,
        role_key: roleKey,
        tab_key: tabKey,
        visible: isVisible === true,
        updated_at: now,
        updated_by: updatedBy || null,
      };

      if (idx >= 0) {
        db.role_ui_access![idx] = record;
      } else {
        db.role_ui_access!.push(record);
      }
    });
  });

  saveDatabase(db);
  return db.role_ui_access;
}

export function getRolePermissionsMatrix(): Record<string, Record<string, boolean>> {
  const list = getRolePermissionsList();
  const matrix: Record<string, Record<string, boolean>> = {};

  list.forEach((rp) => {
    if (!matrix[rp.role_key]) matrix[rp.role_key] = {};
    matrix[rp.role_key][`${rp.module_key}.view`] = rp.can_view;
    matrix[rp.role_key][`${rp.module_key}.create`] = rp.can_create;
    matrix[rp.role_key][`${rp.module_key}.edit`] = rp.can_edit;
    matrix[rp.role_key][`${rp.module_key}.delete`] = rp.can_delete;
    matrix[rp.role_key][`${rp.module_key}.export`] = rp.can_export;
  });

  return matrix;
}

export function getRoleUiAccessMap(): Record<string, Record<string, boolean>> {
  const list = getRoleUiAccessList();
  const map: Record<string, Record<string, boolean>> = {};

  list.forEach((rua) => {
    if (!map[rua.role_key]) map[rua.role_key] = {};
    map[rua.role_key][rua.tab_key] = rua.visible;
  });

  return map;
}

// -----------------------------------------------------------------------------
// Canonical Leads & CRM Storage Helpers
// -----------------------------------------------------------------------------

export function getCanonicalLeads(businessId?: string): any[] {
  const db = loadDatabase();
  let list = db.leads || [];
  if (businessId) {
    list = list.filter((l) => !l.business_id || l.business_id === businessId);
  }
  return [...list];
}

export function insertCanonicalLead(leadData: any): any {
  const db = loadDatabase();
  if (!db.leads) db.leads = [];

  const now = new Date().toISOString();
  const lead = {
    id: leadData.id || `lead-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    business_id: leadData.business_id || 'biz-ecometrix-001',
    name: leadData.name || 'Untitled Lead',
    company: leadData.company || null,
    email: leadData.email || null,
    phone: leadData.phone || null,
    website: leadData.website || null,
    service: leadData.service || null,
    message: leadData.message || null,
    budget: leadData.budget !== undefined && leadData.budget !== null ? Number(leadData.budget) : null,
    currency: leadData.currency || 'USD',
    source: leadData.source || 'Website',
    campaign: leadData.campaign || null,
    landing_page: leadData.landing_page || null,
    status: leadData.status || 'New',
    priority: leadData.priority || 'Medium',
    assigned_to: leadData.assigned_to || null,
    agent_name: leadData.agent_name || null,
    last_contacted_at: leadData.last_contacted_at || null,
    next_followup_at: leadData.next_followup_at || null,
    converted_to_client_id: leadData.converted_to_client_id || null,
    created_at: leadData.created_at || now,
    updated_at: now,
  };

  // Upsert if exists, else unshift
  const idx = db.leads.findIndex((l) => l.id === lead.id);
  if (idx >= 0) {
    db.leads[idx] = { ...db.leads[idx], ...lead };
  } else {
    db.leads.unshift(lead);
  }

  saveDatabase(db);
  return lead;
}

export function updateCanonicalLead(id: string, updates: any): any | null {
  const db = loadDatabase();
  if (!db.leads) db.leads = [];

  const idx = db.leads.findIndex((l) => l.id === id);
  if (idx < 0) return null;

  const now = new Date().toISOString();
  db.leads[idx] = {
    ...db.leads[idx],
    ...updates,
    updated_at: now,
  };

  saveDatabase(db);
  return db.leads[idx];
}

export function deleteCanonicalLead(id: string): boolean {
  const db = loadDatabase();
  if (!db.leads) return false;

  const initialLen = db.leads.length;
  db.leads = db.leads.filter((l) => l.id !== id);

  if (db.leads.length !== initialLen) {
    saveDatabase(db);
    return true;
  }
  return false;
}

export function getCanonicalClients(businessId?: string): any[] {
  const db = loadDatabase();
  let list = db.clients || [];
  if (businessId) {
    list = list.filter((c) => !c.business_id || c.business_id === businessId);
  }
  return [...list];
}

export function insertCanonicalClient(clientData: any): any {
  const db = loadDatabase();
  if (!db.clients) db.clients = [];

  const now = new Date().toISOString();
  const client = {
    id: clientData.id || `client-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    business_id: clientData.business_id || 'biz-ecometrix-001',
    company_name: clientData.company_name || 'New Client Co',
    contact_person: clientData.contact_person || null,
    email: clientData.email || clientData.billing_email || null,
    billing_email: clientData.billing_email || clientData.email || null,
    phone: clientData.phone || null,
    website: clientData.website || null,
    industry: clientData.industry || null,
    address: clientData.address || null,
    city: clientData.city || null,
    country: clientData.country || null,
    status: clientData.status || 'Active',
    source: clientData.source || 'Direct Client',
    assigned_to: clientData.assigned_to || null,
    account_manager_id: clientData.account_manager_id || clientData.assigned_to || null,
    originating_lead_id: clientData.originating_lead_id || clientData.source_lead_id || null,
    source_lead_id: clientData.source_lead_id || clientData.originating_lead_id || null,
    preferred_currency: clientData.preferred_currency || 'USD',
    notes: clientData.notes || null,
    total_revenue: Number(clientData.total_revenue) || 0,
    total_revenue_usd: Number(clientData.total_revenue_usd) || Number(clientData.total_revenue) || 0,
    outstanding_balance: Number(clientData.outstanding_balance) || 0,
    created_at: clientData.created_at || now,
    updated_at: now,
    ...clientData,
  };

  const idx = db.clients.findIndex((c) => c.id === client.id);
  if (idx >= 0) {
    db.clients[idx] = { ...db.clients[idx], ...client };
  } else {
    db.clients.unshift(client);
  }

  saveDatabase(db);
  return client;
}

export function updateCanonicalClient(id: string, updates: any): any | null {
  const db = loadDatabase();
  if (!db.clients) db.clients = [];

  const idx = db.clients.findIndex((c) => c.id === id);
  if (idx < 0) return null;

  db.clients[idx] = { ...db.clients[idx], ...updates, updated_at: new Date().toISOString() };
  saveDatabase(db);
  return db.clients[idx];
}

export function deleteCanonicalClient(id: string): boolean {
  const db = loadDatabase();
  if (!db.clients) return false;
  const initial = db.clients.length;
  db.clients = db.clients.filter((c) => c.id !== id);
  if (db.clients.length !== initial) {
    saveDatabase(db);
    return true;
  }
  return false;
}

export function getCanonicalActivities(businessId?: string, leadId?: string): any[] {
  const db = loadDatabase();
  let list = db.crm_activities || [];
  if (businessId) list = list.filter((a) => !a.business_id || a.business_id === businessId);
  if (leadId) list = list.filter((a) => a.lead_id === leadId);
  return [...list];
}

export function insertCanonicalActivity(actData: any): any {
  const db = loadDatabase();
  if (!db.crm_activities) db.crm_activities = [];

  const activity = {
    id: actData.id || `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    business_id: actData.business_id || 'biz-ecometrix-001',
    lead_id: actData.lead_id || null,
    client_id: actData.client_id || null,
    user_id: actData.user_id || null,
    activity_type: actData.activity_type || 'Note',
    title: actData.title || 'Activity',
    description: actData.description || null,
    metadata: actData.metadata || null,
    created_at: actData.created_at || new Date().toISOString(),
  };

  db.crm_activities.unshift(activity);
  saveDatabase(db);
  return activity;
}

export function getCanonicalFollowups(businessId?: string, leadId?: string): any[] {
  const db = loadDatabase();
  let list = db.lead_followups || [];
  if (businessId) list = list.filter((f) => !f.business_id || f.business_id === businessId);
  if (leadId) list = list.filter((f) => f.lead_id === leadId);
  return [...list];
}

export function insertCanonicalFollowup(fData: any): any {
  const db = loadDatabase();
  if (!db.lead_followups) db.lead_followups = [];

  const followup = {
    id: fData.id || `fu-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    business_id: fData.business_id || 'biz-ecometrix-001',
    lead_id: fData.lead_id,
    followup_date: fData.followup_date,
    followup_time: fData.followup_time || null,
    note: fData.note || null,
    assigned_to: fData.assigned_to || null,
    status: fData.status || 'Pending',
    outcome_note: fData.outcome_note || null,
    created_at: fData.created_at || new Date().toISOString(),
    completed_at: fData.completed_at || null,
  };

  db.lead_followups.push(followup);
  saveDatabase(db);
  return followup;
}

export function updateCanonicalFollowup(id: string, updates: any): any | null {
  const db = loadDatabase();
  if (!db.lead_followups) db.lead_followups = [];
  const idx = db.lead_followups.findIndex((f) => f.id === id);
  if (idx < 0) return null;
  db.lead_followups[idx] = { ...db.lead_followups[idx], ...updates };
  saveDatabase(db);
  return db.lead_followups[idx];
}

export function getCanonicalNotifications(businessId?: string, userId?: string): any[] {
  const db = loadDatabase();
  let list = db.notifications || [];
  if (businessId) list = list.filter((n) => !n.business_id || n.business_id === businessId);
  if (userId) list = list.filter((n) => !n.user_id || n.user_id === userId);
  return [...list];
}

export function insertCanonicalNotification(notifData: any): any {
  const db = loadDatabase();
  if (!db.notifications) db.notifications = [];

  const notif = {
    id: notifData.id || `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    business_id: notifData.business_id || 'biz-ecometrix-001',
    user_id: notifData.user_id || null,
    type: notifData.type || 'lead_assigned',
    title: notifData.title || 'New Notification',
    message: notifData.message || '',
    link_section: notifData.link_section || 'leads',
    entity_id: notifData.entity_id || null,
    is_read: notifData.is_read === true,
    created_at: notifData.created_at || new Date().toISOString(),
  };

  db.notifications.unshift(notif);
  saveDatabase(db);
  return notif;
}

export function updateCanonicalNotification(id: string, updates: any): any | null {
  const db = loadDatabase();
  if (!db.notifications) db.notifications = [];
  const idx = db.notifications.findIndex((n) => n.id === id);
  if (idx < 0) return null;
  db.notifications[idx] = { ...db.notifications[idx], ...updates };
  saveDatabase(db);
  return db.notifications[idx];
}

export function deleteCanonicalNotification(id: string): boolean {
  const db = loadDatabase();
  if (!db.notifications) return false;
  const initial = db.notifications.length;
  db.notifications = db.notifications.filter((n) => n.id !== id);
  if (db.notifications.length !== initial) {
    saveDatabase(db);
    return true;
  }
  return false;
}

export function getCanonicalContacts(businessId?: string, clientId?: string): any[] {
  const db = loadDatabase();
  let list = db.client_contacts || [];
  if (businessId) list = list.filter((c) => !c.business_id || c.business_id === businessId);
  if (clientId) list = list.filter((c) => c.client_id === clientId);
  return [...list];
}

export function insertCanonicalContact(data: any): any {
  const db = loadDatabase();
  if (!db.client_contacts) db.client_contacts = [];
  const contact = {
    id: data.id || `contact-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    business_id: data.business_id || 'biz-ecometrix-001',
    client_id: data.client_id,
    name: data.name || 'Contact',
    position: data.position || null,
    email: data.email || null,
    phone: data.phone || null,
    is_primary: data.is_primary === true,
    notes: data.notes || null,
    created_at: data.created_at || new Date().toISOString(),
  };
  db.client_contacts.push(contact);
  saveDatabase(db);
  return contact;
}

export function updateCanonicalContact(id: string, updates: any): any | null {
  const db = loadDatabase();
  if (!db.client_contacts) db.client_contacts = [];
  const idx = db.client_contacts.findIndex((c) => c.id === id);
  if (idx < 0) return null;
  db.client_contacts[idx] = { ...db.client_contacts[idx], ...updates };
  saveDatabase(db);
  return db.client_contacts[idx];
}

export function deleteCanonicalContact(id: string): boolean {
  const db = loadDatabase();
  if (!db.client_contacts) return false;
  const initial = db.client_contacts.length;
  db.client_contacts = db.client_contacts.filter((c) => c.id !== id);
  if (db.client_contacts.length !== initial) {
    saveDatabase(db);
    return true;
  }
  return false;
}

export function getCanonicalNotes(businessId?: string, clientId?: string): any[] {
  const db = loadDatabase();
  let list = db.client_notes || [];
  if (businessId) list = list.filter((n) => !n.business_id || n.business_id === businessId);
  if (clientId) list = list.filter((n) => n.client_id === clientId);
  return [...list];
}

export function insertCanonicalNote(data: any): any {
  const db = loadDatabase();
  if (!db.client_notes) db.client_notes = [];
  const note = {
    id: data.id || `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    business_id: data.business_id || 'biz-ecometrix-001',
    client_id: data.client_id,
    user_id: data.user_id || null,
    content: data.content || '',
    created_at: data.created_at || new Date().toISOString(),
    updated_at: data.updated_at || new Date().toISOString(),
  };
  db.client_notes.unshift(note);
  saveDatabase(db);
  return note;
}

export function deleteCanonicalNote(id: string): boolean {
  const db = loadDatabase();
  if (!db.client_notes) return false;
  const initial = db.client_notes.length;
  db.client_notes = db.client_notes.filter((n) => n.id !== id);
  if (db.client_notes.length !== initial) {
    saveDatabase(db);
    return true;
  }
  return false;
}

export function getCanonicalExchangeRates(businessId?: string): any[] {
  const db = loadDatabase();
  let list = db.exchange_rates || [];
  if (businessId) list = list.filter((r) => !r.business_id || r.business_id === businessId);
  return [...list];
}

export function insertCanonicalExchangeRate(data: any): any {
  const db = loadDatabase();
  if (!db.exchange_rates) db.exchange_rates = [];
  const rate = {
    id: data.id || `rate-${Date.now()}`,
    business_id: data.business_id || 'biz-ecometrix-001',
    from_currency: (data.from_currency || 'USD').toUpperCase(),
    to_currency: (data.to_currency || 'PKR').toUpperCase(),
    rate: Number(data.rate) || 1.0,
    effective_date: data.effective_date || new Date().toISOString().split('T')[0],
    created_by: data.created_by || null,
    created_at: data.created_at || new Date().toISOString(),
  };
  db.exchange_rates.push(rate);
  saveDatabase(db);
  return rate;
}

// ==============================================================================
// CANONICAL TASKS & TASK NOTES CRUD ENGINE
// ==============================================================================

export function getCanonicalTasks(businessId?: string, projectId?: string, assignedTo?: string): any[] {
  const db = loadDatabase();
  let list = db.tasks || [];
  if (businessId) list = list.filter((t) => !t.business_id || t.business_id === businessId);
  if (projectId) list = list.filter((t) => t.project_id === projectId);
  if (assignedTo) list = list.filter((t) => t.assigned_to === assignedTo);
  return [...list];
}

export function insertCanonicalTask(taskData: any): any {
  const db = loadDatabase();
  if (!db.tasks) db.tasks = [];

  const now = new Date().toISOString();
  const task = {
    id: taskData.id || `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    business_id: taskData.business_id || 'biz-ecometrix-001',
    project_id: taskData.project_id || null,
    title: taskData.title || 'Untitled Task',
    description: taskData.description || null,
    status: taskData.status || 'Queue',
    priority: taskData.priority || 'Medium',
    deadline: taskData.deadline || taskData.due_date || now.split('T')[0],
    due_date: taskData.due_date || taskData.deadline || now.split('T')[0],
    assigned_to: taskData.assigned_to || null,
    assigned_by: taskData.assigned_by || null,
    assignee: taskData.assignee || 'Unassigned',
    short_note: taskData.short_note || null,
    created_at: taskData.created_at || now,
    updated_at: now,
  };

  const idx = db.tasks.findIndex((t) => t.id === task.id);
  if (idx >= 0) {
    db.tasks[idx] = { ...db.tasks[idx], ...task };
  } else {
    db.tasks.unshift(task);
  }

  saveDatabase(db);
  return task;
}

export function updateCanonicalTask(id: string, updates: any): any | null {
  const db = loadDatabase();
  if (!db.tasks) db.tasks = [];

  const idx = db.tasks.findIndex((t) => t.id === id);
  if (idx < 0) return null;

  const now = new Date().toISOString();
  db.tasks[idx] = {
    ...db.tasks[idx],
    ...updates,
    updated_at: now,
  };

  if (updates.deadline && !updates.due_date) {
    db.tasks[idx].due_date = updates.deadline;
  }
  if (updates.due_date && !updates.deadline) {
    db.tasks[idx].deadline = updates.due_date;
  }

  saveDatabase(db);
  return db.tasks[idx];
}

export function deleteCanonicalTask(id: string): boolean {
  const db = loadDatabase();
  if (!db.tasks) return false;

  const initialLen = db.tasks.length;
  db.tasks = db.tasks.filter((t) => t.id !== id);

  if (db.tasks.length !== initialLen) {
    // Cascade delete task notes
    if (db.task_notes) {
      db.task_notes = db.task_notes.filter((tn) => tn.task_id !== id);
    }
    saveDatabase(db);
    return true;
  }
  return false;
}

export function getCanonicalTaskNotes(taskId?: string, businessId?: string): any[] {
  const db = loadDatabase();
  let list = db.task_notes || [];
  if (businessId) list = list.filter((n) => !n.business_id || n.business_id === businessId);
  if (taskId) list = list.filter((n) => n.task_id === taskId);
  return [...list];
}

export function insertCanonicalTaskNote(noteData: any): any {
  const db = loadDatabase();
  if (!db.task_notes) db.task_notes = [];

  const note = {
    id: noteData.id || `tn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    task_id: noteData.task_id,
    business_id: noteData.business_id || 'biz-ecometrix-001',
    user_id: noteData.user_id || 'usr-ecometrix-001',
    user_name: noteData.user_name || 'Team Member',
    text: String(noteData.text || '').substring(0, 250),
    created_at: noteData.created_at || new Date().toISOString(),
  };

  db.task_notes.unshift(note);

  // Also update latest short_note on the task itself
  if (note.task_id) {
    updateCanonicalTask(note.task_id, { short_note: note.text });
  }

  saveDatabase(db);
  return note;
}

export function deleteCanonicalTaskNote(id: string): boolean {
  const db = loadDatabase();
  if (!db.task_notes) return false;

  const initialLen = db.task_notes.length;
  db.task_notes = db.task_notes.filter((tn) => tn.id !== id);

  if (db.task_notes.length !== initialLen) {
    saveDatabase(db);
    return true;
  }
  return false;
}

// ==============================================================================
// CANONICAL PROJECTS CRUD ENGINE
// ==============================================================================

export function getCanonicalProjects(businessId?: string, clientId?: string): any[] {
  const db = loadDatabase();
  let list = db.projects || [];
  if (businessId) list = list.filter((p) => !p.business_id || p.business_id === businessId);
  if (clientId) list = list.filter((p) => p.client_id === clientId);
  return [...list];
}

export function insertCanonicalProject(projData: any): any {
  const db = loadDatabase();
  if (!db.projects) db.projects = [];

  const now = new Date().toISOString();
  const project = {
    id: projData.id || `proj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    business_id: projData.business_id || 'biz-ecometrix-001',
    client_id: projData.client_id || null,
    client_name: projData.client_name || 'Direct Client',
    name: projData.name || 'Untitled Project',
    description: projData.description || '',
    status: projData.status || 'Active',
    budget: Number(projData.budget) || 0,
    currency: projData.currency || 'USD',
    deadline: projData.deadline || now.split('T')[0],
    created_at: projData.created_at || now,
    updated_at: now,
  };

  const idx = db.projects.findIndex((p) => p.id === project.id);
  if (idx >= 0) {
    db.projects[idx] = { ...db.projects[idx], ...project };
  } else {
    db.projects.unshift(project);
  }

  saveDatabase(db);
  return project;
}

export function updateCanonicalProject(id: string, updates: any): any | null {
  const db = loadDatabase();
  if (!db.projects) db.projects = [];

  const idx = db.projects.findIndex((p) => p.id === id);
  if (idx < 0) return null;

  const now = new Date().toISOString();
  db.projects[idx] = {
    ...db.projects[idx],
    ...updates,
    updated_at: now,
  };

  saveDatabase(db);
  return db.projects[idx];
}

export function deleteCanonicalProject(id: string): boolean {
  const db = loadDatabase();
  if (!db.projects) return false;

  const initialLen = db.projects.length;
  db.projects = db.projects.filter((p) => p.id !== id);

  if (db.projects.length !== initialLen) {
    if (db.tasks) {
      db.tasks.forEach((t) => {
        if (t.project_id === id) {
          t.project_id = null;
          t.project_name = null;
        }
      });
    }
    saveDatabase(db);
    return true;
  }
  return false;
}

// ==========================================
// CANONICAL FINANCE OPERATIONS (PHASE 7A)
// ==========================================

export function seedBaselineFinanceIfEmpty(db: CanonicalDatabase): void {
  if (!db.financial_accounts) db.financial_accounts = [];
  if (!db.financial_categories) db.financial_categories = [];
  if (!db.financial_settings) db.financial_settings = [];
  if (!db.invoices) db.invoices = [];
  if (!db.invoice_items) db.invoice_items = [];
  if (!db.payments) db.payments = [];
  if (!db.expenses) db.expenses = [];
  if (!db.income_records) db.income_records = [];
  if (!db.investments) db.investments = [];
  if (!db.recurring_transactions) db.recurring_transactions = [];
  if (!db.recurring_runs) db.recurring_runs = [];

  const now = new Date().toISOString();

  // For each registered business, ensure default accounts, categories, and settings exist
  const businesses = db.businesses && db.businesses.length > 0 ? db.businesses : [{ id: 'biz-ecometrix-001', name: 'Ecometrix Hub' }];

  businesses.forEach((biz) => {
    const bizId = biz.id;

    // 1. Accounts: Default clean zero-balance accounts
    const hasAccounts = db.financial_accounts!.some((a) => a.business_id === bizId);
    if (!hasAccounts) {
      db.financial_accounts!.push(
        {
          id: `acc-${bizId}-001`,
          business_id: bizId,
          name: 'Meezan Bank - Corporate PKR',
          type: 'Bank',
          currency: 'PKR',
          opening_balance: 0,
          current_balance: 0,
          description: 'Primary corporate operational checking account for local payroll and vendor payments.',
          is_active: true,
          created_at: now,
          updated_at: now,
        },
        {
          id: `acc-${bizId}-002`,
          business_id: bizId,
          name: 'Standard Chartered - USD Inward',
          type: 'Bank',
          currency: 'USD',
          opening_balance: 0,
          current_balance: 0,
          description: 'Foreign currency account receiving overseas client retainer wire transfers.',
          is_active: true,
          created_at: now,
          updated_at: now,
        },
        {
          id: `acc-${bizId}-003`,
          business_id: bizId,
          name: 'Wise Business Global Multi-Currency',
          type: 'Digital Wallet',
          currency: 'USD',
          opening_balance: 0,
          current_balance: 0,
          description: 'Used for paying global SaaS tools and contractor disbursements.',
          is_active: true,
          created_at: now,
          updated_at: now,
        },
        {
          id: `acc-${bizId}-004`,
          business_id: bizId,
          name: 'Office Petty Cash Vault',
          type: 'Cash',
          currency: 'PKR',
          opening_balance: 0,
          current_balance: 0,
          description: 'Daily office supplies, refreshments, courier delivery charges, and local errands.',
          is_active: true,
          created_at: now,
          updated_at: now,
        }
      );
    }

    // 2. Categories
    const hasCats = db.financial_categories!.some((c) => c.business_id === bizId);
    if (!hasCats) {
      db.financial_categories!.push(
        // Income
        { id: `cat-${bizId}-001`, business_id: bizId, name: 'Client Payment', type: 'Income', color: '#10B981', is_default: true, is_active: true, created_at: now, updated_at: now },
        { id: `cat-${bizId}-002`, business_id: bizId, name: 'Service Retainer', type: 'Income', color: '#059669', is_default: true, is_active: true, created_at: now, updated_at: now },
        { id: `cat-${bizId}-003`, business_id: bizId, name: 'Consulting & Architecture', type: 'Income', color: '#34D399', is_default: true, is_active: true, created_at: now, updated_at: now },
        { id: `cat-${bizId}-004`, business_id: bizId, name: 'Other Income', type: 'Income', color: '#6EE7B7', is_default: true, is_active: true, created_at: now, updated_at: now },
        // Expense
        { id: `cat-${bizId}-005`, business_id: bizId, name: 'Software & Subscriptions', type: 'Expense', color: '#6366F1', is_default: true, is_active: true, created_at: now, updated_at: now },
        { id: `cat-${bizId}-006`, business_id: bizId, name: 'Cloud Hosting & Servers', type: 'Expense', color: '#8B5CF6', is_default: true, is_active: true, created_at: now, updated_at: now },
        { id: `cat-${bizId}-007`, business_id: bizId, name: 'Salaries & Payroll', type: 'Expense', color: '#EF4444', is_default: true, is_active: true, created_at: now, updated_at: now },
        { id: `cat-${bizId}-008`, business_id: bizId, name: 'Freelancers & Contractors', type: 'Expense', color: '#F97316', is_default: true, is_active: true, created_at: now, updated_at: now },
        { id: `cat-${bizId}-009`, business_id: bizId, name: 'Office Rent & Facilities', type: 'Expense', color: '#EC4899', is_default: true, is_active: true, created_at: now, updated_at: now },
        { id: `cat-${bizId}-010`, business_id: bizId, name: 'Internet & Communications', type: 'Expense', color: '#3B82F6', is_default: true, is_active: true, created_at: now, updated_at: now },
        { id: `cat-${bizId}-011`, business_id: bizId, name: 'Advertising & Marketing', type: 'Expense', color: '#F59E0B', is_default: true, is_active: true, created_at: now, updated_at: now },
        { id: `cat-${bizId}-012`, business_id: bizId, name: 'Equipment & Maintenance', type: 'Expense', color: '#64748B', is_default: true, is_active: true, created_at: now, updated_at: now },
        { id: `cat-${bizId}-013`, business_id: bizId, name: 'Taxes & Compliance', type: 'Expense', color: '#94A3B8', is_default: true, is_active: true, created_at: now, updated_at: now },
        { id: `cat-${bizId}-014`, business_id: bizId, name: 'Utilities & Power', type: 'Expense', color: '#A855F7', is_default: true, is_active: true, created_at: now, updated_at: now },
        // Investment
        { id: `cat-${bizId}-015`, business_id: bizId, name: 'Hardware & Workstations', type: 'Investment', color: '#0EA5E9', is_default: true, is_active: true, created_at: now, updated_at: now },
        { id: `cat-${bizId}-016`, business_id: bizId, name: 'Studio & Video Equipment', type: 'Investment', color: '#14B8A6', is_default: true, is_active: true, created_at: now, updated_at: now },
        { id: `cat-${bizId}-017`, business_id: bizId, name: 'Strategic Marketing Capital', type: 'Investment', color: '#84CC16', is_default: true, is_active: true, created_at: now, updated_at: now },
        { id: `cat-${bizId}-018`, business_id: bizId, name: 'Business Expansion', type: 'Investment', color: '#EAB308', is_default: true, is_active: true, created_at: now, updated_at: now }
      );
    }

    // 3. Settings
    const hasSettings = db.financial_settings!.some((s) => s.business_id === bizId);
    if (!hasSettings) {
      db.financial_settings!.push({
        id: `set-${bizId}-001`,
        business_id: bizId,
        base_currency: 'PKR',
        default_invoice_currency: 'USD',
        default_payment_terms: 'Net 15',
        default_tax_rate: 0,
        invoice_prefix: 'INV-',
        next_invoice_number: 1,
        payment_prefix: 'PAY-',
        next_payment_number: 1,
        default_account_id: `acc-${bizId}-001`,
        financial_year_start: '07-01',
        updated_at: now,
      });
    }
  });
}

// INVOICES
export function getCanonicalInvoices(businessId?: string, clientId?: string): any[] {
  const db = loadDatabase();
  let list = db.invoices || [];
  if (businessId) list = list.filter((i) => i.business_id === businessId);
  if (clientId) list = list.filter((i) => i.client_id === clientId);
  return list;
}

export function getCanonicalInvoiceById(id: string): any | null {
  const db = loadDatabase();
  const list = db.invoices || [];
  return list.find((i) => i.id === id) || null;
}

export function insertCanonicalInvoice(invoiceData: any): any {
  const db = loadDatabase();
  if (!db.invoices) db.invoices = [];
  if (!db.invoice_items) db.invoice_items = [];

  const now = new Date().toISOString();
  const id = invoiceData.id || `inv-${invoiceData.business_id || 'biz'}-${Date.now()}`;
  const subtotal = Number(invoiceData.subtotal) || 0;
  const tax = Number(invoiceData.tax) || 0;
  const discount = Number(invoiceData.discount) || 0;
  const total = invoiceData.total !== undefined ? Number(invoiceData.total) : Math.max(0, subtotal + tax - discount);
  const paid = Number(invoiceData.paid_amount) || 0;
  const balance = Math.max(0, total - paid);

  let status = invoiceData.status || 'Draft';
  if (paid >= total && total > 0) status = 'Paid';
  else if (paid > 0) status = 'Partially Paid';

  const invoice = {
    id,
    business_id: invoiceData.business_id || 'biz-ecometrix-001',
    client_id: invoiceData.client_id,
    client: invoiceData.client || null,
    invoice_number: invoiceData.invoice_number || `INV-${String(db.invoices.length + 1).padStart(4, '0')}`,
    issue_date: invoiceData.issue_date || now.split('T')[0],
    due_date: invoiceData.due_date || now.split('T')[0],
    status,
    subtotal,
    tax,
    discount,
    total,
    paid_amount: paid,
    balance_due: balance,
    currency: invoiceData.currency || 'USD',
    exchange_rate: Number(invoiceData.exchange_rate) || 1,
    base_total: Number(invoiceData.base_total) || (total * (Number(invoiceData.exchange_rate) || 1)),
    base_currency: invoiceData.base_currency || 'PKR',
    notes: invoiceData.notes || null,
    terms: invoiceData.terms || 'Net 15',
    items: invoiceData.items || [],
    created_by: invoiceData.created_by || null,
    created_at: invoiceData.created_at || now,
    updated_at: now,
  };

  // If items included, save line items
  if (Array.isArray(invoiceData.items)) {
    invoiceData.items.forEach((item: any, idx: number) => {
      const lineAmt = Number(item.quantity) * Number(item.unit_price);
      db.invoice_items!.push({
        id: item.id || `item-${id}-${idx + 1}`,
        business_id: invoice.business_id,
        invoice_id: id,
        description: item.description,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        amount: lineAmt,
        created_at: now,
      });
    });
  }

  db.invoices.unshift(invoice);

  // Update client outstanding_balance
  if (db.clients && invoice.client_id) {
    const cl = db.clients.find((c) => c.id === invoice.client_id);
    if (cl) {
      cl.outstanding_balance = (Number(cl.outstanding_balance) || 0) + balance;
      cl.updated_at = now;
    }
  }

  saveDatabase(db);
  return invoice;
}

export function updateCanonicalInvoice(id: string, updates: any): any | null {
  const db = loadDatabase();
  if (!db.invoices) db.invoices = [];

  const idx = db.invoices.findIndex((i) => i.id === id);
  if (idx < 0) return null;

  const existing = db.invoices[idx];
  const now = new Date().toISOString();

  const subtotal = updates.subtotal !== undefined ? Number(updates.subtotal) : existing.subtotal;
  const tax = updates.tax !== undefined ? Number(updates.tax) : existing.tax;
  const discount = updates.discount !== undefined ? Number(updates.discount) : existing.discount;
  const total = updates.total !== undefined ? Number(updates.total) : Math.max(0, subtotal + tax - discount);
  const paid = updates.paid_amount !== undefined ? Number(updates.paid_amount) : existing.paid_amount;
  const balance = Math.max(0, total - paid);

  let status = updates.status !== undefined ? updates.status : existing.status;
  if (status !== 'Cancelled') {
    if (balance <= 0.01 && total > 0) status = 'Paid';
    else if (paid > 0) status = 'Partially Paid';
  }

  db.invoices[idx] = {
    ...existing,
    ...updates,
    subtotal,
    tax,
    discount,
    total,
    paid_amount: paid,
    balance_due: balance,
    status,
    updated_at: now,
  };

  saveDatabase(db);
  return db.invoices[idx];
}

export function deleteCanonicalInvoice(id: string): boolean {
  const db = loadDatabase();
  if (!db.invoices) return false;

  const initialLen = db.invoices.length;
  const inv = db.invoices.find((i) => i.id === id);
  db.invoices = db.invoices.filter((i) => i.id !== id);

  if (db.invoices.length !== initialLen) {
    if (db.invoice_items) {
      db.invoice_items = db.invoice_items.filter((item) => item.invoice_id !== id);
    }
    // Also adjust client outstanding balance
    if (inv && db.clients && inv.client_id) {
      const cl = db.clients.find((c) => c.id === inv.client_id);
      if (cl) {
        cl.outstanding_balance = Math.max(0, (Number(cl.outstanding_balance) || 0) - (Number(inv.balance_due) || 0));
        cl.updated_at = new Date().toISOString();
      }
    }
    saveDatabase(db);
    return true;
  }
  return false;
}

// INVOICE ITEMS
export function getCanonicalInvoiceItems(invoiceId?: string, businessId?: string): any[] {
  const db = loadDatabase();
  let list = db.invoice_items || [];
  if (businessId) list = list.filter((i) => i.business_id === businessId);
  if (invoiceId) list = list.filter((i) => i.invoice_id === invoiceId);
  return list;
}

export function insertCanonicalInvoiceItem(itemData: any): any {
  const db = loadDatabase();
  if (!db.invoice_items) db.invoice_items = [];
  const now = new Date().toISOString();
  const item = {
    id: itemData.id || `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    business_id: itemData.business_id,
    invoice_id: itemData.invoice_id,
    description: itemData.description,
    quantity: Number(itemData.quantity) || 1,
    unit_price: Number(itemData.unit_price) || 0,
    amount: (Number(itemData.quantity) || 1) * (Number(itemData.unit_price) || 0),
    created_at: now,
  };
  db.invoice_items.push(item);
  saveDatabase(db);
  return item;
}

export function deleteCanonicalInvoiceItems(invoiceId: string): boolean {
  const db = loadDatabase();
  if (!db.invoice_items) return false;
  db.invoice_items = db.invoice_items.filter((i) => i.invoice_id !== invoiceId);
  saveDatabase(db);
  return true;
}

// PAYMENTS
export function getCanonicalPayments(businessId?: string, invoiceId?: string): any[] {
  const db = loadDatabase();
  let list = db.payments || [];
  if (businessId) list = list.filter((p) => p.business_id === businessId);
  if (invoiceId) list = list.filter((p) => p.invoice_id === invoiceId);
  return list;
}

export function insertCanonicalPayment(paymentData: any): any {
  const db = loadDatabase();
  if (!db.payments) db.payments = [];
  const now = new Date().toISOString();

  const id = paymentData.id || `pay-${paymentData.business_id || 'biz'}-${Date.now()}`;
  const amount = Number(paymentData.amount) || 0;
  const exchangeRate = Number(paymentData.exchange_rate) || 1;
  const baseAmount = paymentData.base_amount !== undefined ? Number(paymentData.base_amount) : amount * exchangeRate;

  const payment = {
    id,
    business_id: paymentData.business_id || 'biz-ecometrix-001',
    invoice_id: paymentData.invoice_id || null,
    client_id: paymentData.client_id,
    account_id: paymentData.account_id,
    payment_number: paymentData.payment_number || `PAY-${String(db.payments.length + 1).padStart(4, '0')}`,
    amount,
    currency: paymentData.currency || 'USD',
    exchange_rate: exchangeRate,
    base_amount: baseAmount,
    base_currency: paymentData.base_currency || 'PKR',
    payment_date: paymentData.payment_date || now.split('T')[0],
    payment_method: paymentData.payment_method || 'Bank Transfer',
    reference: paymentData.reference || null,
    transaction_id: paymentData.transaction_id || `trx-${id}`,
    status: paymentData.status || 'Completed',
    notes: paymentData.notes || null,
    created_by: paymentData.created_by || null,
    created_at: paymentData.created_at || now,
    updated_at: now,
  };

  db.payments.unshift(payment);

  // Update target Invoice if attached
  if (payment.invoice_id && db.invoices) {
    const inv = db.invoices.find((i) => i.id === payment.invoice_id);
    if (inv) {
      inv.paid_amount = (Number(inv.paid_amount) || 0) + amount;
      inv.balance_due = Math.max(0, (Number(inv.total) || 0) - inv.paid_amount);
      if (inv.balance_due <= 0.01) {
        inv.status = 'Paid';
      } else if (inv.paid_amount > 0) {
        inv.status = 'Partially Paid';
      }
      inv.updated_at = now;
    }
  }

  // Update account balance
  if (payment.account_id && db.financial_accounts && (payment.status === 'Completed' || payment.status === 'completed')) {
    const acc = db.financial_accounts.find((a) => a.id === payment.account_id);
    if (acc) {
      acc.current_balance = (Number(acc.current_balance) || 0) + amount;
      acc.updated_at = now;
    }
  }

  // Update client lifetime revenue and outstanding balance
  if (payment.client_id && db.clients) {
    const cl = db.clients.find((c) => c.id === payment.client_id);
    if (cl) {
      cl.total_revenue = (Number(cl.total_revenue) || 0) + (cl.preferred_currency === payment.currency ? amount : baseAmount);
      cl.outstanding_balance = Math.max(0, (Number(cl.outstanding_balance) || 0) - amount);
      cl.updated_at = now;
    }
  }

  saveDatabase(db);
  return payment;
}

export function cancelCanonicalPayment(paymentId: string, reason?: string): any | null {
  const db = loadDatabase();
  if (!db.payments) return null;

  const payment = db.payments.find((p) => p.id === paymentId);
  if (!payment) return null;
  if (payment.status === 'Cancelled' || payment.status === 'cancelled') return payment;

  const now = new Date().toISOString();
  payment.status = 'Cancelled';
  payment.cancellation_reason = reason || null;
  payment.updated_at = now;

  // Reverse invoice paid_amount & balance_due
  if (payment.invoice_id && db.invoices) {
    const inv = db.invoices.find((i) => i.id === payment.invoice_id);
    if (inv) {
      inv.paid_amount = Math.max(0, (Number(inv.paid_amount) || 0) - Number(payment.amount));
      inv.balance_due = Math.max(0, (Number(inv.total) || 0) - inv.paid_amount);
      if (inv.balance_due <= 0.01) {
        inv.status = 'Paid';
      } else if (inv.paid_amount > 0) {
        inv.status = 'Partially Paid';
      } else {
        const today = now.split('T')[0];
        inv.status = inv.due_date < today ? 'Overdue' : 'Sent';
      }
      inv.updated_at = now;
    }
  }

  // Reverse account current_balance
  if (payment.account_id && db.financial_accounts) {
    const acc = db.financial_accounts.find((a) => a.id === payment.account_id);
    if (acc) {
      acc.current_balance = (Number(acc.current_balance) || 0) - Number(payment.amount);
      acc.updated_at = now;
    }
  }

  // Reverse client stats
  if (payment.client_id && db.clients) {
    const cl = db.clients.find((c) => c.id === payment.client_id);
    if (cl) {
      const pAmt = Number(payment.amount);
      const pBase = Number(payment.base_amount) || pAmt;
      cl.total_revenue = Math.max(0, (Number(cl.total_revenue) || 0) - (cl.preferred_currency === payment.currency ? pAmt : pBase));
      cl.outstanding_balance = (Number(cl.outstanding_balance) || 0) + pAmt;
      cl.updated_at = now;
    }
  }

  saveDatabase(db);
  return payment;
}

export function deleteCanonicalPayment(paymentId: string): boolean {
  const db = loadDatabase();
  if (!db.payments) return false;

  const initialLen = db.payments.length;
  const p = db.payments.find((item) => item.id === paymentId);
  db.payments = db.payments.filter((item) => item.id !== paymentId);

  if (db.payments.length !== initialLen) {
    // If not already cancelled, reverse balances
    if (p && p.status !== 'Cancelled' && p.status !== 'cancelled') {
      if (p.invoice_id && db.invoices) {
        const inv = db.invoices.find((i) => i.id === p.invoice_id);
        if (inv) {
          inv.paid_amount = Math.max(0, (Number(inv.paid_amount) || 0) - Number(p.amount));
          inv.balance_due = Math.max(0, (Number(inv.total) || 0) - inv.paid_amount);
          inv.status = inv.balance_due <= 0.01 ? 'Paid' : inv.paid_amount > 0 ? 'Partially Paid' : 'Sent';
        }
      }
      if (p.account_id && db.financial_accounts) {
        const acc = db.financial_accounts.find((a) => a.id === p.account_id);
        if (acc) {
          acc.current_balance = (Number(acc.current_balance) || 0) - Number(p.amount);
        }
      }
    }
    saveDatabase(db);
    return true;
  }
  return false;
}

// EXPENSES
export function getCanonicalExpenses(businessId?: string): any[] {
  const db = loadDatabase();
  let list = db.expenses || [];
  if (businessId) list = list.filter((e) => e.business_id === businessId);
  return list;
}

export function insertCanonicalExpense(expenseData: any): any {
  const db = loadDatabase();
  if (!db.expenses) db.expenses = [];
  const now = new Date().toISOString();

  const id = expenseData.id || `exp-${expenseData.business_id || 'biz'}-${Date.now()}`;
  const amount = Number(expenseData.amount) || 0;
  const exchangeRate = Number(expenseData.exchange_rate) || 1;
  const baseAmount = expenseData.base_amount !== undefined ? Number(expenseData.base_amount) : amount * exchangeRate;

  const expense = {
    id,
    business_id: expenseData.business_id || 'biz-ecometrix-001',
    category_id: expenseData.category_id || null,
    account_id: expenseData.account_id,
    transaction_id: expenseData.transaction_id || `trx-${id}`,
    amount,
    currency: expenseData.currency || 'PKR',
    exchange_rate: exchangeRate,
    base_amount: baseAmount,
    base_currency: expenseData.base_currency || 'PKR',
    vendor: expenseData.vendor || 'Vendor',
    description: expenseData.description || '',
    expense_date: expenseData.expense_date || now.split('T')[0],
    payment_method: expenseData.payment_method || 'Bank Transfer',
    reference: expenseData.reference || null,
    notes: expenseData.notes || null,
    attachment_url: expenseData.attachment_url || null,
    created_by: expenseData.created_by || null,
    created_at: expenseData.created_at || now,
    updated_at: now,
  };

  db.expenses.unshift(expense);

  // Update account balance
  if (expense.account_id && db.financial_accounts) {
    const acc = db.financial_accounts.find((a) => a.id === expense.account_id);
    if (acc) {
      acc.current_balance = (Number(acc.current_balance) || 0) - amount;
      acc.updated_at = now;
    }
  }

  saveDatabase(db);
  return expense;
}

export function updateCanonicalExpense(id: string, updates: any): any | null {
  const db = loadDatabase();
  if (!db.expenses) return null;

  const idx = db.expenses.findIndex((e) => e.id === id);
  if (idx < 0) return null;

  const existing = db.expenses[idx];
  const oldAmt = Number(existing.amount) || 0;
  const newAmt = updates.amount !== undefined ? Number(updates.amount) : oldAmt;
  const diff = newAmt - oldAmt;

  const now = new Date().toISOString();
  db.expenses[idx] = {
    ...existing,
    ...updates,
    amount: newAmt,
    updated_at: now,
  };

  // Adjust account balance if amount changed
  if (diff !== 0 && existing.account_id && db.financial_accounts) {
    const acc = db.financial_accounts.find((a) => a.id === existing.account_id);
    if (acc) {
      acc.current_balance = (Number(acc.current_balance) || 0) - diff;
      acc.updated_at = now;
    }
  }

  saveDatabase(db);
  return db.expenses[idx];
}

export function deleteCanonicalExpense(id: string): boolean {
  const db = loadDatabase();
  if (!db.expenses) return false;

  const initialLen = db.expenses.length;
  const exp = db.expenses.find((e) => e.id === id);
  db.expenses = db.expenses.filter((e) => e.id !== id);

  if (db.expenses.length !== initialLen) {
    if (exp && exp.account_id && db.financial_accounts) {
      const acc = db.financial_accounts.find((a) => a.id === exp.account_id);
      if (acc) {
        acc.current_balance = (Number(acc.current_balance) || 0) + Number(exp.amount);
        acc.updated_at = new Date().toISOString();
      }
    }
    saveDatabase(db);
    return true;
  }
  return false;
}

// ACCOUNTS
export function getCanonicalAccounts(businessId?: string): any[] {
  const db = loadDatabase();
  let list = db.financial_accounts || [];
  if (businessId) list = list.filter((a) => a.business_id === businessId);
  return list;
}

export function insertCanonicalAccount(accountData: any): any {
  const db = loadDatabase();
  if (!db.financial_accounts) db.financial_accounts = [];
  const now = new Date().toISOString();

  const id = accountData.id || `acc-${accountData.business_id || 'biz'}-${Date.now()}`;
  const opBal = Number(accountData.opening_balance) || 0;
  const curBal = accountData.current_balance !== undefined ? Number(accountData.current_balance) : opBal;

  const account = {
    id,
    business_id: accountData.business_id || 'biz-ecometrix-001',
    name: accountData.name || 'New Account',
    type: accountData.type || 'Bank',
    currency: accountData.currency || 'PKR',
    opening_balance: opBal,
    current_balance: curBal,
    description: accountData.description || '',
    is_active: accountData.is_active !== undefined ? accountData.is_active : true,
    created_at: now,
    updated_at: now,
  };

  db.financial_accounts.push(account);
  saveDatabase(db);
  return account;
}

export function updateCanonicalAccount(id: string, updates: any): any | null {
  const db = loadDatabase();
  if (!db.financial_accounts) return null;

  const idx = db.financial_accounts.findIndex((a) => a.id === id);
  if (idx < 0) return null;

  db.financial_accounts[idx] = {
    ...db.financial_accounts[idx],
    ...updates,
    updated_at: new Date().toISOString(),
  };

  saveDatabase(db);
  return db.financial_accounts[idx];
}

export function deleteCanonicalAccount(id: string): boolean {
  const db = loadDatabase();
  if (!db.financial_accounts) return false;
  const initialLen = db.financial_accounts.length;
  db.financial_accounts = db.financial_accounts.filter((a) => a.id !== id);
  if (db.financial_accounts.length !== initialLen) {
    saveDatabase(db);
    return true;
  }
  return false;
}

// CATEGORIES
export function getCanonicalCategories(businessId?: string): any[] {
  const db = loadDatabase();
  let list = db.financial_categories || [];
  if (businessId) list = list.filter((c) => c.business_id === businessId);
  return list;
}

export function insertCanonicalCategory(categoryData: any): any {
  const db = loadDatabase();
  if (!db.financial_categories) db.financial_categories = [];
  const now = new Date().toISOString();

  const id = categoryData.id || `cat-${categoryData.business_id || 'biz'}-${Date.now()}`;
  const category = {
    id,
    business_id: categoryData.business_id || 'biz-ecometrix-001',
    name: categoryData.name,
    type: categoryData.type || 'Expense',
    color: categoryData.color || '#64748B',
    is_default: !!categoryData.is_default,
    is_active: categoryData.is_active !== undefined ? categoryData.is_active : true,
    created_at: now,
    updated_at: now,
  };

  db.financial_categories.push(category);
  saveDatabase(db);
  return category;
}

export function updateCanonicalCategory(id: string, updates: any): any | null {
  const db = loadDatabase();
  if (!db.financial_categories) return null;

  const idx = db.financial_categories.findIndex((c) => c.id === id);
  if (idx < 0) return null;

  db.financial_categories[idx] = {
    ...db.financial_categories[idx],
    ...updates,
    updated_at: new Date().toISOString(),
  };

  saveDatabase(db);
  return db.financial_categories[idx];
}

// SETTINGS
export function getCanonicalFinanceSettings(businessId: string): any | null {
  const db = loadDatabase();
  const list = db.financial_settings || [];
  return list.find((s) => s.business_id === businessId) || null;
}

export function updateCanonicalFinanceSettings(businessId: string, updates: any): any {
  const db = loadDatabase();
  if (!db.financial_settings) db.financial_settings = [];

  const idx = db.financial_settings.findIndex((s) => s.business_id === businessId);
  const now = new Date().toISOString();

  if (idx >= 0) {
    db.financial_settings[idx] = {
      ...db.financial_settings[idx],
      ...updates,
      updated_at: now,
    };
    saveDatabase(db);
    return db.financial_settings[idx];
  } else {
    const newSettings = {
      id: `set-${businessId}-001`,
      business_id: businessId,
      base_currency: 'PKR',
      default_invoice_currency: 'USD',
      default_payment_terms: 'Net 15',
      default_tax_rate: 0,
      invoice_prefix: 'INV-',
      next_invoice_number: 1,
      payment_prefix: 'PAY-',
      next_payment_number: 1,
      default_account_id: null,
      financial_year_start: '07-01',
      ...updates,
      updated_at: now,
    };
    db.financial_settings.push(newSettings);
    saveDatabase(db);
    return newSettings;
  }
}

// INCOME (Direct non-invoice)
export function getCanonicalIncomeRecords(businessId?: string): any[] {
  const db = loadDatabase();
  let list = db.income_records || [];
  if (businessId) list = list.filter((i) => i.business_id === businessId);
  return list;
}

export function insertCanonicalIncomeRecord(incomeData: any): any {
  const db = loadDatabase();
  if (!db.income_records) db.income_records = [];
  const now = new Date().toISOString();

  const id = incomeData.id || `inc-${Date.now()}`;
  const amount = Number(incomeData.amount) || 0;
  const rate = Number(incomeData.exchange_rate) || 1;
  const baseAmount = incomeData.base_amount !== undefined ? Number(incomeData.base_amount) : amount * rate;

  const item = {
    id,
    business_id: incomeData.business_id,
    client_id: incomeData.client_id || null,
    category_id: incomeData.category_id,
    account_id: incomeData.account_id,
    amount,
    currency: incomeData.currency || 'PKR',
    exchange_rate: rate,
    base_amount: baseAmount,
    base_currency: incomeData.base_currency || 'PKR',
    source: incomeData.source || 'Other Income',
    income_date: incomeData.income_date || now.split('T')[0],
    payment_method: incomeData.payment_method || 'Bank Transfer',
    reference: incomeData.reference || null,
    notes: incomeData.notes || null,
    created_at: now,
    updated_at: now,
  };

  db.income_records.unshift(item);

  if (item.account_id && db.financial_accounts) {
    const acc = db.financial_accounts.find((a) => a.id === item.account_id);
    if (acc) {
      acc.current_balance = (Number(acc.current_balance) || 0) + amount;
      acc.updated_at = now;
    }
  }

  saveDatabase(db);
  return item;
}

// INVESTMENTS
export function getCanonicalInvestments(businessId?: string): any[] {
  const db = loadDatabase();
  let list = db.investments || [];
  if (businessId) list = list.filter((inv) => inv.business_id === businessId);
  return list;
}

export function insertCanonicalInvestment(data: any): any {
  const db = loadDatabase();
  if (!db.investments) db.investments = [];
  const now = new Date().toISOString();

  const id = data.id || `inv-${Date.now()}`;
  const amount = Number(data.amount) || 0;
  const rate = Number(data.exchange_rate) || 1;
  const baseAmount = data.base_amount !== undefined ? Number(data.base_amount) : amount * rate;

  const item = {
    id,
    business_id: data.business_id,
    category_id: data.category_id || null,
    account_id: data.account_id,
    name: data.name,
    amount,
    currency: data.currency || 'PKR',
    exchange_rate: rate,
    base_amount: baseAmount,
    base_currency: data.base_currency || 'PKR',
    investment_date: data.investment_date || now.split('T')[0],
    expected_return: data.expected_return || null,
    notes: data.notes || null,
    created_at: now,
    updated_at: now,
  };

  db.investments.unshift(item);

  if (item.account_id && db.financial_accounts) {
    const acc = db.financial_accounts.find((a) => a.id === item.account_id);
    if (acc) {
      acc.current_balance = (Number(acc.current_balance) || 0) - amount;
      acc.updated_at = now;
    }
  }

  saveDatabase(db);
  return item;
}

export function deleteCanonicalInvestment(id: string): boolean {
  const db = loadDatabase();
  if (!db.investments) return false;
  const initialLen = db.investments.length;
  const item = db.investments.find((i) => i.id === id);
  db.investments = db.investments.filter((i) => i.id !== id);
  if (db.investments.length !== initialLen) {
    if (item && item.account_id && db.financial_accounts) {
      const acc = db.financial_accounts.find((a) => a.id === item.account_id);
      if (acc) {
        acc.current_balance = (Number(acc.current_balance) || 0) + Number(item.amount);
        acc.updated_at = new Date().toISOString();
      }
    }
    saveDatabase(db);
    return true;
  }
  return false;
}

// RECURRING TRANSACTIONS
export function getCanonicalRecurringTransactions(businessId?: string): any[] {
  const db = loadDatabase();
  let list = db.recurring_transactions || [];
  if (businessId) list = list.filter((r) => r.business_id === businessId);
  return list;
}

export function insertCanonicalRecurringTransaction(data: any): any {
  const db = loadDatabase();
  if (!db.recurring_transactions) db.recurring_transactions = [];
  const now = new Date().toISOString();
  const id = data.id || `rec-${Date.now()}`;
  const item = {
    ...data,
    id,
    created_at: data.created_at || now,
    updated_at: now,
  };
  db.recurring_transactions.unshift(item);
  saveDatabase(db);
  return item;
}

export function updateCanonicalRecurringTransaction(id: string, updates: any): any | null {
  const db = loadDatabase();
  if (!db.recurring_transactions) return null;
  const idx = db.recurring_transactions.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  db.recurring_transactions[idx] = {
    ...db.recurring_transactions[idx],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  saveDatabase(db);
  return db.recurring_transactions[idx];
}

export function deleteCanonicalRecurringTransaction(id: string): boolean {
  const db = loadDatabase();
  if (!db.recurring_transactions) return false;
  const initialLen = db.recurring_transactions.length;
  db.recurring_transactions = db.recurring_transactions.filter((r) => r.id !== id);
  if (db.recurring_transactions.length !== initialLen) {
    saveDatabase(db);
    return true;
  }
  return false;
}

export function getCanonicalRecurringRuns(businessId?: string): any[] {
  const db = loadDatabase();
  let list = db.recurring_runs || [];
  if (businessId) list = list.filter((r) => r.business_id === businessId);
  return list;
}

export function insertCanonicalRecurringRun(data: any): any {
  const db = loadDatabase();
  if (!db.recurring_runs) db.recurring_runs = [];
  const item = {
    ...data,
    id: data.id || `run-${Date.now()}`,
    executed_at: data.executed_at || new Date().toISOString(),
  };
  db.recurring_runs.unshift(item);
  saveDatabase(db);
  return item;
}


