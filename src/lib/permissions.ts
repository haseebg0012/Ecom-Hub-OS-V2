/**
 * EcomHub OS — Central Role-Based Access Control (RBAC) System
 * Product: EcomHub OS | Tagline: Your Business, One Hub.
 *
 * Implements Layer 1 (UI Visibility & Action-Level Helpers) & Layer 2/3 (Route & API Authorization Checks)
 */

import { BusinessRole } from '../types';

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
 * Check if a role possesses a specific permission string
 */
export function hasPermission(role: BusinessRole | undefined | null, permission: PermissionString): boolean {
  if (!role) return false;

  const permissions = DEFAULT_ROLE_PERMISSIONS[role];
  if (!permissions) return false;

  // Wildcard full access
  if (permissions.includes('*.*')) return true;

  // Direct match
  if (permissions.includes(permission)) return true;

  // Module wildcard match (e.g. "finance.*")
  const [module] = permission.split('.');
  if (permissions.includes(`${module as AppModule}.*`)) return true;

  return false;
}

/**
 * Route to Required Permission Mapping
 */
export interface RoutePermissionRule {
  pattern: RegExp;
  module: AppModule;
  action: PermissionAction;
  requiredPermission: PermissionString;
}

export const ROUTE_PERMISSION_RULES: RoutePermissionRule[] = [
  // Finance Sub-routes
  { pattern: /^\/finance\/expenses\/new/, module: 'finance', action: 'create', requiredPermission: 'finance.create' },
  { pattern: /^\/finance\/income\/new/, module: 'finance', action: 'create', requiredPermission: 'finance.create' },
  { pattern: /^\/finance\/transactions\/new/, module: 'finance', action: 'create', requiredPermission: 'finance.create' },
  { pattern: /^\/finance\/accounts\/new/, module: 'finance', action: 'create', requiredPermission: 'finance.create' },
  { pattern: /^\/finance\/categories\/new/, module: 'finance', action: 'create', requiredPermission: 'finance.create' },
  { pattern: /^\/finance(\/.*)?$/, module: 'finance', action: 'view', requiredPermission: 'finance.view' },

  // Settings & Team
  { pattern: /^\/settings\/business(\/.*)?$/, module: 'business_settings', action: 'view', requiredPermission: 'business_settings.view' },
  { pattern: /^\/business-settings(\/.*)?$/, module: 'business_settings', action: 'view', requiredPermission: 'business_settings.view' },
  { pattern: /^\/settings\/team(\/.*)?$/, module: 'team_roles', action: 'view', requiredPermission: 'team_roles.view' },
  { pattern: /^\/team-roles(\/.*)?$/, module: 'team_roles', action: 'view', requiredPermission: 'team_roles.view' },
  { pattern: /^\/settings\/login-history(\/.*)?$/, module: 'team_roles', action: 'view', requiredPermission: 'team_roles.view' },
  { pattern: /^\/login-history(\/.*)?$/, module: 'team_roles', action: 'view', requiredPermission: 'team_roles.view' },
  { pattern: /^\/settings\/integrations(\/.*)?$/, module: 'integrations', action: 'view', requiredPermission: 'integrations.view' },
  { pattern: /^\/integrations(\/.*)?$/, module: 'integrations', action: 'view', requiredPermission: 'integrations.view' },

  // Operational Modules
  { pattern: /^\/leads(\/.*)?$/, module: 'leads', action: 'view', requiredPermission: 'leads.view' },
  { pattern: /^\/clients(\/.*)?$/, module: 'clients', action: 'view', requiredPermission: 'clients.view' },
  { pattern: /^\/projects(\/.*)?$/, module: 'projects', action: 'view', requiredPermission: 'projects.view' },
  { pattern: /^\/tasks(\/.*)?$/, module: 'tasks', action: 'view', requiredPermission: 'tasks.view' },
  { pattern: /^\/employees(\/.*)?$/, module: 'employees', action: 'view', requiredPermission: 'employees.view' },
  { pattern: /^\/documents(\/.*)?$/, module: 'documents', action: 'view', requiredPermission: 'documents.view' },
  { pattern: /^\/analytics(\/.*)?$/, module: 'analytics', action: 'view', requiredPermission: 'analytics.view' },
  { pattern: /^\/notifications(\/.*)?$/, module: 'notifications', action: 'view', requiredPermission: 'notifications.view' },
  { pattern: /^\/copilot(\/.*)?$/, module: 'ai_copilot', action: 'view', requiredPermission: 'ai_copilot.view' },
  { pattern: /^\/(dashboard)?$/, module: 'dashboard', action: 'view', requiredPermission: 'dashboard.view' },
];

/**
 * Check if a role is authorized to access a given URL route path
 */
export function canRoleAccessRoute(role: BusinessRole | undefined | null, pathname: string): boolean {
  if (!role) return false;

  // Clean path (strip trailing slashes, hashes, queries)
  const cleanPath = pathname.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';

  // Public/always allowed paths
  if (cleanPath === '/unauthorized' || cleanPath.startsWith('/lead-entry')) {
    return true;
  }

  for (const rule of ROUTE_PERMISSION_RULES) {
    if (rule.pattern.test(cleanPath)) {
      return hasPermission(role, rule.requiredPermission);
    }
  }

  // Default allow dashboard / general
  return true;
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
