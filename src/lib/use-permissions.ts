/**
 * EcomHub OS — usePermissions React Hook
 * Product: EcomHub OS | Tagline: Your Business, One Hub.
 */

import { useMemo } from 'react';
import { useAuth } from './auth-context';
import {
  PermissionString,
  hasPermission,
  canRoleAccessRoute,
  DEFAULT_ROLE_PERMISSIONS,
} from './permissions';
import { BusinessRole } from '../types';

export interface UsePermissionsReturn {
  role: BusinessRole | null;
  can: (permission: PermissionString) => boolean;
  canRoute: (routePath: string) => boolean;
  isOwner: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isFinance: boolean;
  isOperations: boolean;
  isSales: boolean;
  isEmployee: boolean;
  isViewer: boolean;
  allPermissions: readonly PermissionString[];
}

export function usePermissions(): UsePermissionsReturn {
  const { activeBusiness } = useAuth();
  const roles: BusinessRole[] = activeBusiness?.roles || (activeBusiness?.role ? [activeBusiness.role] : []);
  const role: BusinessRole | null = roles[0] || null;

  const permissionsList = useMemo(() => {
    if (!roles || roles.length === 0) return [];
    const set = new Set<PermissionString>();
    for (const r of roles) {
      const perms = DEFAULT_ROLE_PERMISSIONS[r] || [];
      perms.forEach((p) => set.add(p as PermissionString));
    }
    return Array.from(set);
  }, [roles]);

  return {
    role,
    can: (permission: PermissionString) => hasPermission(roles, permission),
    canRoute: (routePath: string) => canRoleAccessRoute(roles, routePath),
    isOwner: roles.includes('Owner'),
    isAdmin: roles.includes('Admin'),
    isManager: roles.includes('Manager'),
    isFinance: roles.includes('Finance'),
    isOperations: roles.includes('Operations'),
    isSales: roles.includes('Sales'),
    isEmployee: roles.includes('Employee'),
    isViewer: roles.includes('Viewer'),
    allPermissions: permissionsList,
  };
}
