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
  isSales: boolean;
  isEmployee: boolean;
  isViewer: boolean;
  allPermissions: readonly PermissionString[];
}

export function usePermissions(): UsePermissionsReturn {
  const { activeBusiness } = useAuth();
  const role: BusinessRole | null = activeBusiness?.role || null;

  const permissionsList = useMemo(() => {
    if (!role) return [];
    return DEFAULT_ROLE_PERMISSIONS[role] || [];
  }, [role]);

  return {
    role,
    can: (permission: PermissionString) => hasPermission(role, permission),
    canRoute: (routePath: string) => canRoleAccessRoute(role, routePath),
    isOwner: role === 'Owner',
    isAdmin: role === 'Admin',
    isManager: role === 'Manager',
    isFinance: role === 'Finance',
    isSales: role === 'Sales',
    isEmployee: role === 'Employee',
    isViewer: role === 'Viewer',
    allPermissions: permissionsList,
  };
}
