/**
 * EcomHub OS — Central Role-Based Access Control (RBAC) System
 * Product: EcomHub OS | Tagline: Your Business, One Hub.
 *
 * Implements Layer 1 (UI Visibility & Action-Level Helpers) & Layer 2/3 (Route & API Authorization Checks)
 */

import { BusinessRole } from '../types';
import { getEffectivePermissions } from './effective-permissions';

// Central Module List
export type AppModule =
  | 'dashboard'
  | 'leads'
  | 'clients'
  | 'projects'
  | 'tasks'
  | 'employees'
  | 'finance'
  | 'documents'
  | 'analytics'
  | 'notifications'
  | 'business_settings'
  | 'team_roles'
  | 'integrations'
  | 'ai_copilot';

// Permission Actions
export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'manage';

// Permission String format: "<module>.<action>"
export type PermissionString = `${AppModule}.${PermissionAction}` | `${AppModule}.*` | '*.*';

/**
 * DEFAULT ROLE PERMISSIONS
 *
 * OWNER: Full access to all modules, all actions.
 * ADMIN: Full operational access to all modules. Finance view/create/edit/manage (delete restricted). Cannot transfer ownership.
 * MANAGER: Operational modules (leads, clients, projects, tasks, employees). Finance VIEW ONLY by default. No settings/team management.
 * FINANCE: Finance (view/create/edit/manage), relevant client info, financial documents, notifications. No leads, no settings.
 * SALES: Dashboard, Leads, Clients, Notifications. NO Finance access whatsoever. No settings.
 * EMPLOYEE: Dashboard, assigned tasks/projects, notifications. NO Finance access. No settings.
 * VIEWER: Read-only (view) across operational & finance (if policy allows). NO create, edit, delete, manage.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<BusinessRole, readonly PermissionString[]> = {
  Owner: [
    // Owner has wildcard full access to all modules and actions
    '*.*',
    'dashboard.view', 'dashboard.manage',
    'leads.view', 'leads.create', 'leads.edit', 'leads.delete', 'leads.manage',
    'clients.view', 'clients.create', 'clients.edit', 'clients.delete', 'clients.manage',
    'projects.view', 'projects.create', 'projects.edit', 'projects.delete', 'projects.manage',
    'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.delete', 'tasks.manage',
    'employees.view', 'employees.create', 'employees.edit', 'employees.delete', 'employees.manage',
    'finance.view', 'finance.create', 'finance.edit', 'finance.delete', 'finance.manage',
    'documents.view', 'documents.create', 'documents.edit', 'documents.delete', 'documents.manage',
    'analytics.view', 'analytics.manage',
    'notifications.view', 'notifications.manage',
    'business_settings.view', 'business_settings.edit', 'business_settings.manage',
    'team_roles.view', 'team_roles.create', 'team_roles.edit', 'team_roles.delete', 'team_roles.manage',
    'integrations.view', 'integrations.edit', 'integrations.manage',
    'ai_copilot.view', 'ai_copilot.manage',
  ],

  Admin: [
    'dashboard.view', 'dashboard.manage',
    'leads.view', 'leads.create', 'leads.edit', 'leads.delete', 'leads.manage',
    'clients.view', 'clients.create', 'clients.edit', 'clients.delete', 'clients.manage',
    'projects.view', 'projects.create', 'projects.edit', 'projects.delete', 'projects.manage',
    'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.delete', 'tasks.manage',
    'employees.view', 'employees.create', 'employees.edit', 'employees.manage',
    // Finance: View, Create, Edit, Manage (Delete requires Owner)
    'finance.view', 'finance.create', 'finance.edit', 'finance.manage',
    'documents.view', 'documents.create', 'documents.edit', 'documents.delete', 'documents.manage',
    'analytics.view', 'analytics.manage',
    'notifications.view', 'notifications.manage',
    'business_settings.view', 'business_settings.edit', 'business_settings.manage',
    'team_roles.view', 'team_roles.create', 'team_roles.edit', 'team_roles.manage',
    'integrations.view', 'integrations.edit', 'integrations.manage',
    'ai_copilot.view', 'ai_copilot.manage',
  ],

  Manager: [
    'dashboard.view',
    'leads.view', 'leads.create', 'leads.edit', 'leads.manage',
    'clients.view', 'clients.create', 'clients.edit', 'clients.manage',
    'projects.view', 'projects.create', 'projects.edit', 'projects.manage',
    'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.manage',
    'employees.view', 'employees.manage',
    'analytics.view',
    'notifications.view',
    // Finance: VIEW ONLY by default (no create, no edit, no delete, no manage)
    'finance.view',
    'documents.view', 'documents.create',
  ],

  Finance: [
    'dashboard.view',
    // Full operational finance access
    'finance.view', 'finance.create', 'finance.edit', 'finance.manage',
    // Relevant client financial data
    'clients.view',
    // Relevant financial documents
    'documents.view', 'documents.create',
    'notifications.view',
  ],

  Sales: [
    'dashboard.view',
    'leads.view', 'leads.create', 'leads.edit', 'leads.manage',
    'clients.view', 'clients.create', 'clients.edit',
    'notifications.view',
    // STRICT: NO Finance, NO Settings, NO Team Roles, NO Employees
  ],

  Operations: [
    'dashboard.view',
    'leads.view', 'leads.edit',
    'clients.view',
    'projects.view', 'projects.create', 'projects.edit', 'projects.manage',
    'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.delete', 'tasks.manage',
    'documents.view', 'documents.create',
    'notifications.view',
  ],

  Employee: [
    'dashboard.view',
    'tasks.view', 'tasks.edit',
    'projects.view',
    'documents.view',
    'notifications.view',
    // STRICT: NO Finance, NO Settings, NO Team Roles
  ],

  Viewer: [
    'dashboard.view',
    'leads.view',
    'clients.view',
    'projects.view',
    'tasks.view',
    'finance.view', // Read-only overview
    'analytics.view',
    'documents.view',
    'notifications.view',
    // STRICT: NO create, edit, delete, or manage anywhere
  ],
};

/**
 * Helper to get corresponding keys between UI permission matrix (e.g. crm.view)
 * and route/component permissions (e.g. leads.view, clients.view).
 */
function getEquivalentPermissionKeys(permission: string): string[] {
  const keys = [permission];
  const [mod, act] = permission.split('.');
  if (mod === 'leads' || mod === 'clients') {
    keys.push(`crm.${act}`);
  } else if (mod === 'crm') {
    keys.push(`leads.${act}`, `clients.${act}`);
  }

  if (mod === 'employees' || mod === 'team_roles') {
    keys.push(`team_roles.${act}`, `employees.${act}`);
  }

  return keys;
}

export interface RoutePermissionRule {
  pattern: RegExp;
  requiredPermission: PermissionString;
}

export const ROUTE_PERMISSION_RULES: RoutePermissionRule[] = [
  { pattern: /^\/finance(\/.*)?$/, requiredPermission: 'finance.view' },
  { pattern: /^\/leads(\/.*)?$/, requiredPermission: 'leads.view' },
  { pattern: /^\/clients(\/.*)?$/, requiredPermission: 'clients.view' },
  { pattern: /^\/projects(\/.*)?$/, requiredPermission: 'projects.view' },
  { pattern: /^\/tasks(\/.*)?$/, requiredPermission: 'tasks.view' },
  { pattern: /^\/team-members-roles(\/.*)?$/, requiredPermission: 'team_roles.view' },
  { pattern: /^\/settings\/team(\/.*)?$/, requiredPermission: 'team_roles.view' },
  { pattern: /^\/documents(\/.*)?$/, requiredPermission: 'documents.view' },
  { pattern: /^\/analytics(\/.*)?$/, requiredPermission: 'analytics.view' },
  { pattern: /^\/notifications(\/.*)?$/, requiredPermission: 'notifications.view' },
  { pattern: /^\/settings\/business(\/.*)?$/, requiredPermission: 'business_settings.view' },
  { pattern: /^\/settings\/login-history(\/.*)?$/, requiredPermission: 'team_roles.view' },
  { pattern: /^\/settings\/integrations(\/.*)?$/, requiredPermission: 'integrations.view' },
];

/**
 * Check if a role possesses a specific permission string
 */
export function hasPermission(
  role: BusinessRole | BusinessRole[] | string | string[] | undefined | null,
  permission: PermissionString | string,
  user?: any
): boolean {
  if (!role && !user) return false;
  const rawRoles = Array.isArray(role) ? role.map(String) : role ? [String(role)] : [];

  const cleanEmail = (user?.email || '').trim().toLowerCase();
  // Owner always has full access
  if (
    cleanEmail === 'haseebg0012@gmail.com' ||
    user?.id === 'usr-ecometrix-001' ||
    user?.is_platform_owner === true ||
    rawRoles.includes('Owner') ||
    rawRoles.includes('owner')
  ) {
    return true;
  }

  const dummyBiz: any = { roles: rawRoles, role: rawRoles[0] };
  const effective = getEffectivePermissions(user, dummyBiz);
  return effective.can(permission);
}

/**
 * Check if a role is authorized to access a given URL route path
 */
export function canRoleAccessRoute(
  role: BusinessRole | BusinessRole[] | string | string[] | undefined | null,
  pathname: string,
  user?: any
): boolean {
  const cleanEmail = (user?.email || '').trim().toLowerCase();
  // Owner always has full access
  if (
    cleanEmail === 'haseebg0012@gmail.com' ||
    user?.id === 'usr-ecometrix-001' ||
    user?.is_platform_owner === true
  ) {
    return true;
  }

  if (!role) return false;
  const rawRoles = Array.isArray(role) ? role.map(String) : [String(role)];

  if (rawRoles.includes('Owner') || rawRoles.includes('owner')) {
    return true;
  }

  // Clean path (strip trailing slashes, hashes, queries)
  const cleanPath = pathname.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';

  // Public/always allowed paths
  if (cleanPath === '/unauthorized' || cleanPath.startsWith('/lead-entry')) {
    return true;
  }

  const dummyBiz: any = { roles: rawRoles, role: rawRoles[0] };
  const effective = getEffectivePermissions(user, dummyBiz);
  return effective.canRoute(cleanPath);
}

/**
 * Get the specific required permission for a path
 */
export function getRequiredPermissionForRoute(pathname: string): PermissionString | null {
  const cleanPath = pathname.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
  for (const rule of ROUTE_PERMISSION_RULES) {
    if (rule.pattern.test(cleanPath)) {
      return rule.requiredPermission;
    }
  }
  return null;
}
