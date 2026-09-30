/**
 * EcomHub OS — usePermissions React Hook
 * Phase 4: Multi-Role RBAC + CRUD Permissions + Left Panel Access
 */

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from './auth-context';
import {
  getEffectivePermissions,
  EffectivePermissions,
  ModuleCrudPermissions,
} from './effective-permissions';
import { BusinessRole } from '../types';
import { PermissionString } from './permissions';
import { getSupabaseClient } from './supabase';

export interface UsePermissionsReturn {
  role: BusinessRole | null;
  roles: string[];
  effectiveAccess: EffectivePermissions;
  can: (permission: string) => boolean;
  canAccessModule: (moduleKey: string) => boolean;
  canAccessTab: (tabKey: string) => boolean;
  canRoute: (routePath: string) => boolean;
  tabs: Record<string, boolean>;
  modules: Record<string, ModuleCrudPermissions>;
  isOwner: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isFinance: boolean;
  isOperations: boolean;
  isSales: boolean;
  isEmployee: boolean;
  isViewer: boolean;
  allPermissions: readonly string[];
}

export function usePermissions(): UsePermissionsReturn {
  const { user, activeBusiness } = useAuth();
  const [version, setVersion] = useState(0);

  const [dbMatrix, setDbMatrix] = useState<Record<string, Record<string, boolean>> | null>(() => {
    try {
      const stored = localStorage.getItem('ecomhub_role_matrix');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [dbUiMap, setDbUiMap] = useState<Record<string, Record<string, boolean>> | null>(() => {
    try {
      const stored = localStorage.getItem('ecomhub_ui_role_visibility');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Hydrate authoritative persistent permissions from Supabase on mount / session change
  useEffect(() => {
    let isMounted = true;

    async function loadAuthoritativePermissions() {
      try {
        const client = getSupabaseClient();
        let loadedMatrix: Record<string, Record<string, boolean>> | null = null;
        let loadedUi: Record<string, Record<string, boolean>> | null = null;

        if (client) {
          try {
            const { data: dbPerms } = await client.from('role_permissions').select('*');
            if (dbPerms && Array.isArray(dbPerms) && dbPerms.length > 0) {
              loadedMatrix = {};
              dbPerms.forEach((rp: any) => {
                if (!loadedMatrix![rp.role_key]) loadedMatrix![rp.role_key] = {};
                loadedMatrix![rp.role_key][`${rp.module_key}.view`] = rp.can_view;
                loadedMatrix![rp.role_key][`${rp.module_key}.create`] = rp.can_create;
                loadedMatrix![rp.role_key][`${rp.module_key}.edit`] = rp.can_edit;
                loadedMatrix![rp.role_key][`${rp.module_key}.delete`] = rp.can_delete;
                loadedMatrix![rp.role_key][`${rp.module_key}.export`] = rp.can_export;
              });
            }

            const { data: dbUi } = await client.from('role_ui_access').select('*');
            if (dbUi && Array.isArray(dbUi) && dbUi.length > 0) {
              loadedUi = {};
              dbUi.forEach((rua: any) => {
                if (!loadedUi![rua.role_key]) loadedUi![rua.role_key] = {};
                loadedUi![rua.role_key][rua.tab_key] = rua.visible;
              });
            }
          } catch (e) {
            console.warn('[usePermissions] Supabase query notice, falling back to API:', e);
          }
        }

        if (!loadedMatrix) {
          const res = await fetch('/api/permissions/matrix');
          if (res.ok) {
            const data = await res.json();
            if (data && Object.keys(data).length > 0) loadedMatrix = data;
          }
        }

        if (!loadedUi) {
          const uiRes = await fetch('/api/permissions/ui-access');
          if (uiRes.ok) {
            const uiData = await uiRes.json();
            if (uiData && Object.keys(uiData).length > 0) loadedUi = uiData;
          }
        }

        if (isMounted) {
          if (loadedMatrix) {
            setDbMatrix(loadedMatrix);
            try {
              localStorage.setItem('ecomhub_role_matrix', JSON.stringify(loadedMatrix));
            } catch {}
          }
          if (loadedUi) {
            setDbUiMap(loadedUi);
            try {
              localStorage.setItem('ecomhub_ui_role_visibility', JSON.stringify(loadedUi));
            } catch {}
          }
        }
      } catch (err) {
        console.warn('[usePermissions] Error loading permissions from database:', err);
      }
    }

    loadAuthoritativePermissions();

    return () => {
      isMounted = false;
    };
  }, [user?.id, activeBusiness?.id]);

  // Listen for live permission matrix updates and employee role changes
  useEffect(() => {
    const handleUpdate = () => {
      try {
        const storedM = localStorage.getItem('ecomhub_role_matrix');
        if (storedM) setDbMatrix(JSON.parse(storedM));
        const storedU = localStorage.getItem('ecomhub_ui_role_visibility');
        if (storedU) setDbUiMap(JSON.parse(storedU));
      } catch {}
      setVersion((v) => v + 1);
    };

    window.addEventListener('ecomhub_role_matrix_updated', handleUpdate);
    window.addEventListener('ecomhub_ui_role_visibility_updated', handleUpdate);
    window.addEventListener('ecomhub_employees_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('ecomhub_role_matrix_updated', handleUpdate);
      window.removeEventListener('ecomhub_ui_role_visibility_updated', handleUpdate);
      window.removeEventListener('ecomhub_employees_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const effectiveAccess = useMemo(() => {
    return getEffectivePermissions(user, activeBusiness, dbMatrix, dbUiMap);
  }, [user, activeBusiness, dbMatrix, dbUiMap, version]);

  const rawRoles: BusinessRole[] = (activeBusiness?.roles && activeBusiness.roles.length > 0)
    ? activeBusiness.roles as BusinessRole[]
    : (activeBusiness?.role ? [activeBusiness.role] : ['Employee']);
  const primaryRole: BusinessRole | null = rawRoles[0] || null;

  const stringRoles = rawRoles.map(String);

  const permissionsList = useMemo(() => {
    const list: string[] = [];
    Object.entries(effectiveAccess.modules).forEach(([mod, perms]) => {
      const p = perms as import('./effective-permissions').ModuleCrudPermissions;
      if (p.view) list.push(`${mod}.view`);
      if (p.create) list.push(`${mod}.create`);
      if (p.edit) list.push(`${mod}.edit`);
      if (p.delete) list.push(`${mod}.delete`);
      if (p.export) list.push(`${mod}.export`);
    });
    return list;
  }, [effectiveAccess]);

  const isOwner = effectiveAccess.isOwner;

  return {
    role: primaryRole,
    roles: rawRoles,
    effectiveAccess,
    can: (perm: string) => effectiveAccess.can(perm),
    canAccessModule: (mod: string) => effectiveAccess.canAccessModule(mod),
    canAccessTab: (tab: string) => effectiveAccess.canAccessTab(tab),
    canRoute: (routePath: string) => effectiveAccess.canRoute(routePath),
    tabs: effectiveAccess.tabs,
    modules: effectiveAccess.modules,
    isOwner,
    isAdmin: isOwner || stringRoles.includes('Admin') || stringRoles.includes('business_admin'),
    isManager: isOwner || stringRoles.includes('Manager') || stringRoles.includes('marketing_manager'),
    isFinance: isOwner || stringRoles.includes('Finance') || stringRoles.includes('finance_manager'),
    isOperations: isOwner || stringRoles.includes('Operations') || stringRoles.includes('operations_specialist'),
    isSales: isOwner || stringRoles.includes('Sales') || stringRoles.includes('sales_representative'),
    isEmployee: stringRoles.includes('Employee') || stringRoles.includes('employee_default'),
    isViewer: stringRoles.includes('Viewer') || stringRoles.includes('stakeholder_viewer'),
    allPermissions: permissionsList,
  };
}
