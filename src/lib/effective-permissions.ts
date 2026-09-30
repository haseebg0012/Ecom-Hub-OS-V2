/**
 * EcomHub OS — Central Effective Permissions Engine
 * Phase 4: Multi-Role RBAC + CRUD Permissions + Left Panel Access
 * 
 * Reusable effective-access resolver:
 * 1. Identifies authenticated user.
 * 2. Loads ALL assigned roles from public.business_member_roles.
 * 3. Resolves stable role keys via Role Key Normalization layer.
 * 4. Loads CRUD permissions for every assigned role.
 * 5. Loads Left Panel UI access for every assigned role.
 * 6. Unions all role grants (additive OR).
 * 7. Applies strict View-off dependency rule (if view is OFF, actions are OFF).
 * 8. Enforces Module Access rule (MODULE ACCESS = UI tab visibility AND View permission).
 * 9. Applies Owner override (root platform authority has unrestricted access).
 */

import { Profile, BusinessWithRole, BusinessRole } from '../types';
import { resolveRoleDefinition, getRoleAliases } from './role-normalizer';

export type CrudAction = 'view' | 'create' | 'edit' | 'delete' | 'export';

export interface ModuleCrudPermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  export: boolean;
}

export interface EffectivePermissions {
  userEmail: string;
  isOwner: boolean;
  roles: string[];
  canonicalRoles: string[];
  modules: Record<string, ModuleCrudPermissions>;
  tabs: Record<string, boolean>;
  can: (permissionString: string) => boolean;
  canAccessModule: (moduleKey: string) => boolean;
  canAccessTab: (tabKey: string) => boolean;
  canRoute: (pathname: string) => boolean;
}

export const CRUD_MODULE_KEYS = [
  'crm',
  'tasks',
  'projects',
  'analytics',
  'finance',
  'documents',
  'team_roles',
] as const;

export const UI_TAB_KEYS = [
  'dashboard',
  'leads',
  'clients',
  'projects',
  'tasks',
  'team-members-roles',
  'finance',
  'documents',
  'analytics',
  'notifications',
  'lead-entry-settings',
  'login-history',
  'integrations',
] as const;

// Module to Sidebar Tab correspondence
export const MODULE_TO_TAB_MAP: Record<string, string[]> = {
  crm: ['leads', 'clients'],
  tasks: ['tasks'],
  projects: ['projects'],
  finance: ['finance'],
  documents: ['documents'],
  analytics: ['analytics'],
  team_roles: ['team-members-roles', 'login-history'],
};

// Sidebar Tab to CRUD Module correspondence
export const TAB_TO_MODULE_MAP: Record<string, string> = {
  leads: 'crm',
  clients: 'crm',
  tasks: 'tasks',
  projects: 'projects',
  finance: 'finance',
  documents: 'documents',
  analytics: 'analytics',
  'team-members-roles': 'team_roles',
  'login-history': 'team_roles',
  'lead-entry-settings': 'crm',
  integrations: 'team_roles',
};

// Default baseline CRUD permissions per role (used if custom DB matrix is not yet initialized)
export const DEFAULT_ROLE_CRUD_MATRIX: Record<string, Record<string, boolean>> = {
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
  Operations: {
    'crm.view': true, 'crm.create': false, 'crm.edit': true, 'crm.delete': false, 'crm.export': false,
    'tasks.view': true, 'tasks.create': true, 'tasks.edit': true, 'tasks.delete': true, 'tasks.export': true,
    'projects.view': true, 'projects.create': true, 'projects.edit': true, 'projects.delete': false, 'projects.export': true,
    'analytics.view': true, 'analytics.create': false, 'analytics.edit': false, 'analytics.delete': false, 'analytics.export': false,
    'finance.view': false, 'finance.create': false, 'finance.edit': false, 'finance.delete': false, 'finance.export': false,
    'documents.view': true, 'documents.create': true, 'documents.edit': true, 'documents.delete': false, 'documents.export': false,
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

// Default Left Panel UI tab visibility per role
export const DEFAULT_ROLE_UI_VISIBILITY: Record<string, Record<string, boolean>> = {
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
  Operations: {
    dashboard: true, leads: true, clients: true, projects: true, tasks: true,
    'team-members-roles': false, finance: false, documents: true, analytics: false,
    notifications: true, 'lead-entry-settings': false, 'login-history': false, integrations: false,
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
DEFAULT_ROLE_CRUD_MATRIX.owner = DEFAULT_ROLE_CRUD_MATRIX.Owner;
DEFAULT_ROLE_CRUD_MATRIX.business_admin = DEFAULT_ROLE_CRUD_MATRIX.Admin;
DEFAULT_ROLE_CRUD_MATRIX.operations_specialist = DEFAULT_ROLE_CRUD_MATRIX.Operations;
DEFAULT_ROLE_CRUD_MATRIX.sales_representative = DEFAULT_ROLE_CRUD_MATRIX.Sales;
DEFAULT_ROLE_CRUD_MATRIX.marketing_manager = DEFAULT_ROLE_CRUD_MATRIX.Manager;
DEFAULT_ROLE_CRUD_MATRIX.finance_manager = DEFAULT_ROLE_CRUD_MATRIX.Finance;
DEFAULT_ROLE_CRUD_MATRIX.employee_default = DEFAULT_ROLE_CRUD_MATRIX.Employee;
DEFAULT_ROLE_CRUD_MATRIX.stakeholder_viewer = DEFAULT_ROLE_CRUD_MATRIX.Viewer;

DEFAULT_ROLE_UI_VISIBILITY.owner = DEFAULT_ROLE_UI_VISIBILITY.Owner;
DEFAULT_ROLE_UI_VISIBILITY.business_admin = DEFAULT_ROLE_UI_VISIBILITY.Admin;
DEFAULT_ROLE_UI_VISIBILITY.operations_specialist = DEFAULT_ROLE_UI_VISIBILITY.Operations;
DEFAULT_ROLE_UI_VISIBILITY.sales_representative = DEFAULT_ROLE_UI_VISIBILITY.Sales;
DEFAULT_ROLE_UI_VISIBILITY.marketing_manager = DEFAULT_ROLE_UI_VISIBILITY.Manager;
DEFAULT_ROLE_UI_VISIBILITY.finance_manager = DEFAULT_ROLE_UI_VISIBILITY.Finance;
DEFAULT_ROLE_UI_VISIBILITY.employee_default = DEFAULT_ROLE_UI_VISIBILITY.Employee;
DEFAULT_ROLE_UI_VISIBILITY.stakeholder_viewer = DEFAULT_ROLE_UI_VISIBILITY.Viewer;

/**
 * Calculates effective permissions for a user across all assigned roles.
 */
export function getEffectivePermissions(
  user: Profile | null | undefined,
  activeBusiness: BusinessWithRole | null | undefined,
  customMatrix?: Record<string, Record<string, boolean>> | null,
  customUiVis?: Record<string, Record<string, boolean>> | null
): EffectivePermissions {
  const cleanEmail = (user?.email || '').trim().toLowerCase();

  let rawRoles: string[] = [];
  if (activeBusiness?.roles && activeBusiness.roles.length > 0) {
    rawRoles = activeBusiness.roles;
  } else if (activeBusiness?.role) {
    rawRoles = [activeBusiness.role];
  } else if ((user as any)?.roles && Array.isArray((user as any).roles) && (user as any).roles.length > 0) {
    rawRoles = (user as any).roles;
  } else if ((user as any)?.role) {
    rawRoles = [(user as any).role];
  } else {
    try {
      const stored = localStorage.getItem('ecomhub_user_roles');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          rawRoles = parsed;
        }
      }
    } catch {}
  }

  if (rawRoles.length === 0) {
    rawRoles = ['Employee'];
  }

  const isOwner = (
    cleanEmail === 'haseebg0012@gmail.com' ||
    user?.id === 'usr-ecometrix-001' ||
    rawRoles.includes('Owner') ||
    rawRoles.includes('owner') ||
    (user as any)?.is_platform_owner === true ||
    (user as any)?.app_metadata?.is_platform_owner === true
  );

  // Load configured matrix and UI map with fallback to defaults
  let matrix = customMatrix;
  if (!matrix) {
    try {
      const stored = localStorage.getItem('ecomhub_role_matrix');
      if (stored) matrix = JSON.parse(stored);
    } catch {}
  }
  const effectiveMatrix = matrix || DEFAULT_ROLE_CRUD_MATRIX;

  let uiMap = customUiVis;
  if (!uiMap) {
    try {
      const stored = localStorage.getItem('ecomhub_ui_role_visibility');
      if (stored) uiMap = JSON.parse(stored);
    } catch {}
  }
  const effectiveUiMap = uiMap || DEFAULT_ROLE_UI_VISIBILITY;

  // 1. OWNER OVERRIDE: Root platform authority has unrestricted access to everything
  if (isOwner) {
    const ownerModules: Record<string, ModuleCrudPermissions> = {};
    CRUD_MODULE_KEYS.forEach((mod) => {
      ownerModules[mod] = {
        view: true,
        create: true,
        edit: true,
        delete: true,
        export: true,
      };
    });

    const ownerTabs: Record<string, boolean> = {};
    UI_TAB_KEYS.forEach((tab) => {
      ownerTabs[tab] = true;
    });

    return {
      userEmail: cleanEmail,
      isOwner: true,
      roles: rawRoles,
      canonicalRoles: ['owner'],
      modules: ownerModules,
      tabs: ownerTabs,
      can: () => true,
      canAccessModule: () => true,
      canAccessTab: () => true,
      canRoute: () => true,
    };
  }

  // 2. NORMAL EMPLOYEE: Additive UNION across ALL assigned roles
  const canonicalRoleList: string[] = [];
  const allRoleAliases: string[][] = rawRoles.map((r) => {
    const def = resolveRoleDefinition(r);
    canonicalRoleList.push(def.canonicalKey);
    return getRoleAliases(r);
  });

  // Calculate Union for CRUD Permissions
  const calculatedModules: Record<string, ModuleCrudPermissions> = {};
  CRUD_MODULE_KEYS.forEach((mod) => {
    let unionView = false;
    let unionCreate = false;
    let unionEdit = false;
    let unionDelete = false;
    let unionExport = false;

    // Check every assigned role
    allRoleAliases.forEach((aliases) => {
      let roleMatrixPerms: Record<string, boolean> | null = null;
      for (const alias of aliases) {
        if (effectiveMatrix[alias]) {
          roleMatrixPerms = effectiveMatrix[alias];
          break;
        }
      }

      if (!roleMatrixPerms) {
        for (const alias of aliases) {
          if (DEFAULT_ROLE_CRUD_MATRIX[alias]) {
            roleMatrixPerms = DEFAULT_ROLE_CRUD_MATRIX[alias];
            break;
          }
        }
      }

      if (roleMatrixPerms) {
        if (roleMatrixPerms[`${mod}.view`] === true) unionView = true;
        if (roleMatrixPerms[`${mod}.create`] === true) unionCreate = true;
        if (roleMatrixPerms[`${mod}.edit`] === true) unionEdit = true;
        if (roleMatrixPerms[`${mod}.delete`] === true) unionDelete = true;
        if (roleMatrixPerms[`${mod}.export`] === true) unionExport = true;
      }
    });

    // View-Off Dependency Rule:
    // If View is disabled for a module, Create, Edit, Delete, Export MUST be false
    calculatedModules[mod] = {
      view: unionView,
      create: unionView && unionCreate,
      edit: unionView && unionEdit,
      delete: unionView && unionDelete,
      export: unionView && unionExport,
    };
  });

  // Calculate Union for Left Panel UI Tabs
  const calculatedTabs: Record<string, boolean> = {};
  UI_TAB_KEYS.forEach((tab) => {
    let unionVisible = false;

    allRoleAliases.forEach((aliases) => {
      let roleUiTabs: Record<string, boolean> | null = null;
      for (const alias of aliases) {
        if (effectiveUiMap[alias]) {
          roleUiTabs = effectiveUiMap[alias];
          break;
        }
      }

      if (!roleUiTabs) {
        for (const alias of aliases) {
          if (DEFAULT_ROLE_UI_VISIBILITY[alias]) {
            roleUiTabs = DEFAULT_ROLE_UI_VISIBILITY[alias];
            break;
          }
        }
      }

      if (roleUiTabs && roleUiTabs[tab] === true) {
        unionVisible = true;
      }
    });

    // Default dashboard to visible for authenticated users
    if (tab === 'dashboard') {
      unionVisible = true;
    }

    calculatedTabs[tab] = unionVisible;
  });

  // Check action permission string: e.g. "crm.create", "finance.view"
  const can = (permissionString: string): boolean => {
    if (isOwner) return true;
    const parts = permissionString.split('.');
    if (parts.length < 2) return false;
    let [mod, act] = parts;

    // Normalize module key
    if (mod === 'leads' || mod === 'clients') mod = 'crm';
    if (mod === 'employees') mod = 'team_roles';

    const modPerms = calculatedModules[mod];
    if (!modPerms) return false;

    // If View is OFF, all actions for this module are blocked
    if (!modPerms.view) return false;

    if (act === 'view') return modPerms.view;
    if (act === 'create') return modPerms.create;
    if (act === 'edit') return modPerms.edit;
    if (act === 'delete') return modPerms.delete;
    if (act === 'export') return modPerms.export;
    if (act === 'manage' || act === '*') return modPerms.edit || modPerms.create;

    return false;
  };

  // Section 8 Rule: MODULE ACCESS = UI tab visibility AND View permission
  const canAccessModule = (moduleKey: string): boolean => {
    if (isOwner) return true;

    // Check CRUD view permission
    const modPerms = calculatedModules[moduleKey];
    if (!modPerms || !modPerms.view) {
      return false;
    }

    // Check corresponding UI tab visibility
    const relatedTabs = MODULE_TO_TAB_MAP[moduleKey] || [moduleKey];
    const anyTabVisible = relatedTabs.some((t) => calculatedTabs[t] === true);

    return anyTabVisible;
  };

  const canAccessTab = (tabKey: string): boolean => {
    if (isOwner) return true;
    if (!calculatedTabs[tabKey]) return false;

    // For CRUD-linked tabs, also enforce View permission
    const linkedModule = TAB_TO_MODULE_MAP[tabKey];
    if (linkedModule && calculatedModules[linkedModule]) {
      return calculatedModules[linkedModule].view === true;
    }

    return true;
  };

  // Layer 2: Route Protection Check
  const canRoute = (pathname: string): boolean => {
    if (isOwner) return true;
    const clean = pathname.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';

    if (clean === '/' || clean === '/dashboard' || clean === '/unauthorized') {
      return true;
    }

    if (clean.startsWith('/lead-entry')) {
      return true;
    }

    if (clean.startsWith('/finance')) {
      return calculatedTabs['finance'] === true && calculatedModules['finance'].view === true;
    }

    if (clean.startsWith('/leads')) {
      return calculatedTabs['leads'] === true && calculatedModules['crm'].view === true;
    }

    if (clean.startsWith('/clients')) {
      return calculatedTabs['clients'] === true && calculatedModules['crm'].view === true;
    }

    if (clean.startsWith('/projects')) {
      return calculatedTabs['projects'] === true && calculatedModules['projects'].view === true;
    }

    if (clean.startsWith('/tasks')) {
      return calculatedTabs['tasks'] === true && calculatedModules['tasks'].view === true;
    }

    if (clean.startsWith('/team') || clean.startsWith('/employees') || clean.startsWith('/settings/team')) {
      return calculatedTabs['team-members-roles'] === true && calculatedModules['team_roles'].view === true;
    }

    if (clean.startsWith('/documents')) {
      return calculatedTabs['documents'] === true && calculatedModules['documents'].view === true;
    }

    if (clean.startsWith('/analytics')) {
      return calculatedTabs['analytics'] === true && calculatedModules['analytics'].view === true;
    }

    if (clean.startsWith('/notifications')) {
      return calculatedTabs['notifications'] === true;
    }

    if (clean.startsWith('/settings/login-history') || clean.startsWith('/login-history')) {
      return calculatedTabs['login-history'] === true && calculatedModules['team_roles'].view === true;
    }

    if (clean.startsWith('/settings/integrations') || clean.startsWith('/integrations')) {
      return calculatedTabs['integrations'] === true;
    }

    if (clean.startsWith('/settings/business') || clean.startsWith('/business-settings')) {
      return calculatedTabs['team-members-roles'] === true && calculatedModules['team_roles'].view === true;
    }

    return true;
  };

  return {
    userEmail: cleanEmail,
    isOwner: false,
    roles: rawRoles,
    canonicalRoles: Array.from(new Set(canonicalRoleList)),
    modules: calculatedModules,
    tabs: calculatedTabs,
    can,
    canAccessModule,
    canAccessTab,
    canRoute,
  };
}
