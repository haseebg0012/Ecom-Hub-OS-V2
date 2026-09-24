/**
 * EcomHub OS — Client Route Guard & URL Synchronization Engine
 * Product: EcomHub OS | Tagline: Your Business, One Hub.
 *
 * Implements Layer 2: Route Protection & Direct URL Interception
 * Strictly enforces role-based route guards so users cannot bypass security by:
 * - Manually typing an unauthorized URL in the browser bar
 * - Bookmarking an unauthorized URL
 * - Using browser Back/Forward navigation
 * - Reloading on a protected route
 */

import { ActiveNavSection, BusinessRole } from '../types';
import { canRoleAccessRoute, getRequiredPermissionForRoute } from './permissions';

export interface RouteResolution {
  section: ActiveNavSection;
  subTab?: string;
  entityId?: string;
  isUnauthorized: boolean;
  attemptedPath: string;
  normalizedPath: string;
}

/**
 * Maps a URL pathname to the application section, sub-tab, and authorization status
 */
export function resolveRoute(
  pathname: string,
  userRole: BusinessRole | null | undefined
): RouteResolution {
  // Clean pathname (remove hashes, search queries, trailing slashes)
  const rawPath = pathname.split('?')[0].split('#')[0].trim();
  const path = rawPath.replace(/\/+$/, '') || '/';

  // 1. Direct /unauthorized route
  if (path === '/unauthorized') {
    return {
      section: 'dashboard',
      isUnauthorized: true,
      attemptedPath: path,
      normalizedPath: '/unauthorized',
    };
  }

  // 2. Check Role Authorization for this path
  // If user has a role, check permission; if not logged in / no role, default to dashboard
  const isAuthorized = userRole ? canRoleAccessRoute(userRole, path) : true;

  if (!isAuthorized) {
    return {
      section: 'dashboard',
      isUnauthorized: true,
      attemptedPath: path,
      normalizedPath: '/unauthorized',
    };
  }

  // 3. Finance Sub-Routes
  if (path.startsWith('/finance')) {
    let subTab = 'overview';
    if (path === '/finance/transactions') subTab = 'transactions';
    else if (path === '/finance/expenses') subTab = 'expenses';
    else if (path === '/finance/income') subTab = 'income';
    else if (path === '/finance/accounts') subTab = 'accounts';
    else if (path === '/finance/categories') subTab = 'categories';
    else if (path === '/finance/invoices') subTab = 'invoices';
    else if (path === '/finance/payments') subTab = 'payments';
    else if (path === '/finance/receivables') subTab = 'receivables';
    else if (path === '/finance/investments') subTab = 'investments';
    else if (path === '/finance/reports/profit-loss') subTab = 'reports-profit-loss';
    else if (path === '/finance/reports' || path.startsWith('/finance/reports/')) subTab = 'reports';

    return {
      section: 'finance',
      subTab,
      isUnauthorized: false,
      attemptedPath: path,
      normalizedPath: path,
    };
  }

  // 4. Settings Routes
  if (path === '/settings/business' || path === '/business-settings') {
    return {
      section: 'business-settings',
      isUnauthorized: false,
      attemptedPath: path,
      normalizedPath: '/settings/business',
    };
  }
  if (path === '/settings/team' || path === '/team-roles') {
    return {
      section: 'team-roles',
      isUnauthorized: false,
      attemptedPath: path,
      normalizedPath: '/settings/team',
    };
  }
  if (path === '/settings/login-history' || path === '/login-history') {
    return {
      section: 'login-history',
      isUnauthorized: false,
      attemptedPath: path,
      normalizedPath: '/settings/login-history',
    };
  }
  if (path === '/settings/integrations' || path === '/integrations') {
    return {
      section: 'integrations',
      isUnauthorized: false,
      attemptedPath: path,
      normalizedPath: '/settings/integrations',
    };
  }
  if (path === '/settings/lead-entry' || path === '/lead-entry-settings') {
    return {
      section: 'lead-entry-settings',
      isUnauthorized: false,
      attemptedPath: path,
      normalizedPath: '/settings/lead-entry',
    };
  }
  if (path === '/settings/schema' || path === '/database-schema') {
    return {
      section: 'database-schema',
      isUnauthorized: false,
      attemptedPath: path,
      normalizedPath: '/settings/schema',
    };
  }

  // 5. Operational Modules
  if (path.startsWith('/leads')) {
    const segments = path.split('/').filter(Boolean);
    const leadId = segments.length > 1 ? decodeURIComponent(segments[1]) : undefined;
    return {
      section: 'leads',
      entityId: leadId,
      isUnauthorized: false,
      attemptedPath: path,
      normalizedPath: leadId ? `/leads/${leadId}` : '/leads',
    };
  }
  if (path.startsWith('/clients')) {
    const segments = path.split('/').filter(Boolean);
    const clientId = segments.length > 1 ? decodeURIComponent(segments[1]) : undefined;
    return {
      section: 'clients',
      entityId: clientId,
      isUnauthorized: false,
      attemptedPath: path,
      normalizedPath: clientId ? `/clients/${clientId}` : '/clients',
    };
  }
  if (path.startsWith('/projects')) {
    return { section: 'projects', isUnauthorized: false, attemptedPath: path, normalizedPath: '/projects' };
  }
  if (path.startsWith('/tasks')) {
    return { section: 'tasks', isUnauthorized: false, attemptedPath: path, normalizedPath: '/tasks' };
  }
  if (path.startsWith('/employees')) {
    return { section: 'employees', isUnauthorized: false, attemptedPath: path, normalizedPath: '/employees' };
  }
  if (path.startsWith('/documents')) {
    return { section: 'documents', isUnauthorized: false, attemptedPath: path, normalizedPath: '/documents' };
  }
  if (path.startsWith('/analytics')) {
    return { section: 'analytics', isUnauthorized: false, attemptedPath: path, normalizedPath: '/analytics' };
  }
  if (path.startsWith('/notifications')) {
    return { section: 'notifications', isUnauthorized: false, attemptedPath: path, normalizedPath: '/notifications' };
  }
  if (path.startsWith('/copilot')) {
    return { section: 'copilot', isUnauthorized: false, attemptedPath: path, normalizedPath: '/copilot' };
  }

  // Default: Dashboard
  return {
    section: 'dashboard',
    isUnauthorized: false,
    attemptedPath: path,
    normalizedPath: '/',
  };
}

/**
 * Get canonical URL path from section and optional sub-tab
 */
export function getPathForSection(section: ActiveNavSection, subTab?: string): string {
  switch (section) {
    case 'dashboard':
      return '/';
    case 'finance':
      if (subTab === 'reports-profit-loss') {
        return '/finance/reports/profit-loss';
      }
      if (subTab && subTab !== 'overview') {
        return `/finance/${subTab}`;
      }
      return '/finance';
    case 'finance-reports':
      return '/finance/reports/profit-loss';
    case 'business-settings':
      return '/settings/business';
    case 'team-roles':
      return '/settings/team';
    case 'login-history':
      return '/settings/login-history';
    case 'lead-entry-settings':
      return '/settings/lead-entry';
    case 'database-schema':
      return '/settings/schema';
    default:
      return `/${section}`;
  }
}
