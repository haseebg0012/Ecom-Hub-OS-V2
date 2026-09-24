import React from 'react';
import {
  LayoutDashboard,
  Users,
  Target,
  FolderKanban,
  CheckSquare,
  UserCheck,
  Wallet,
  FileText,
  BarChart3,
  Bell,
  Sparkles,
  Building2,
  ShieldCheck,
  Boxes,
  Database,
  ChevronRight,
  LogOut,
  Smartphone,
  FileSpreadsheet,
  History,
} from 'lucide-react';
import { ActiveNavSection } from '../../types';
import { useAuth } from '../../lib/auth-context';
import { usePermissions } from '../../lib/use-permissions';
import { PermissionString } from '../../lib/permissions';
import { getPathForSection } from '../../lib/router';
import { BrandLogo } from '../common/BrandLogo';

interface SidebarProps {
  activeSection: ActiveNavSection;
  onSelectSection: (section: ActiveNavSection) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: ActiveNavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  requiredPermission?: PermissionString;
}

interface NavGroup {
  groupTitle?: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { user, activeBusiness, logout } = useAuth();
  const { can } = usePermissions();

  const allNavigationGroups: NavGroup[] = [
    {
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          requiredPermission: 'dashboard.view',
        },
      ],
    },
    {
      groupTitle: 'SALES',
      items: [
        {
          id: 'leads',
          label: 'Leads',
          icon: Target,
          requiredPermission: 'leads.view',
        },
        {
          id: 'clients',
          label: 'Clients',
          icon: Users,
          requiredPermission: 'clients.view',
        },
      ],
    },
    {
      groupTitle: 'OPERATIONS',
      items: [
        {
          id: 'projects',
          label: 'Projects',
          icon: FolderKanban,
          requiredPermission: 'projects.view',
        },
        {
          id: 'tasks',
          label: 'Tasks',
          icon: CheckSquare,
          requiredPermission: 'tasks.view',
        },
        {
          id: 'employees',
          label: 'Employees',
          icon: UserCheck,
          requiredPermission: 'employees.view',
        },
      ],
    },
    {
      groupTitle: 'FINANCE',
      items: [
        {
          id: 'finance',
          label: 'Finance',
          icon: Wallet,
          requiredPermission: 'finance.view',
        },
        {
          id: 'finance-reports',
          label: 'Profit & Loss',
          icon: FileSpreadsheet,
          requiredPermission: 'finance.view',
        },
      ],
    },
    {
      groupTitle: 'BUSINESS',
      items: [
        {
          id: 'documents',
          label: 'Documents',
          icon: FileText,
          requiredPermission: 'documents.view',
        },
        {
          id: 'analytics',
          label: 'Analytics',
          icon: BarChart3,
          requiredPermission: 'analytics.view',
        },
        {
          id: 'notifications',
          label: 'Notifications',
          icon: Bell,
          requiredPermission: 'notifications.view',
        },
      ],
    },
    {
      groupTitle: 'AI',
      items: [
        {
          id: 'copilot',
          label: 'Business Copilot',
          icon: Sparkles,
          badge: 'AI',
          requiredPermission: 'ai_copilot.view',
        },
      ],
    },
    {
      groupTitle: 'SETTINGS',
      items: [
        {
          id: 'business-settings',
          label: 'Business Settings',
          icon: Building2,
          requiredPermission: 'business_settings.view',
        },
        {
          id: 'lead-entry-settings',
          label: 'Lead Entry & Agents',
          icon: Smartphone,
          badge: 'Public',
          requiredPermission: 'leads.view',
        },
        {
          id: 'team-roles',
          label: 'Team & Roles',
          icon: ShieldCheck,
          requiredPermission: 'team_roles.view',
        },
        {
          id: 'login-history',
          label: 'Login History',
          icon: History,
          requiredPermission: 'team_roles.view',
        },
        {
          id: 'integrations',
          label: 'Integrations',
          icon: Boxes,
          requiredPermission: 'integrations.view',
        },
      ],
    },
  ];

  // Dynamically filter navigation items based on the active user's permissions (Layer 1)
  const navigationGroups = allNavigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        item.requiredPermission ? can(item.requiredPermission) : true
      ),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          id="sidebar-mobile-backdrop"
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="app-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-[#E2E8F0] flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-[#E2E8F0]">
          <BrandLogo variant="compact" size="md" />
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin">
          {navigationGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="space-y-1">
              {group.groupTitle && (
                <div className="px-3 pb-1 text-[11px] font-semibold text-[#94A3B8] tracking-wider uppercase">
                  {group.groupTitle}
                </div>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isReportsPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/finance/reports');
                const isActive =
                  (item.id === 'finance-reports' && (activeSection === 'finance-reports' || (activeSection === 'finance' && isReportsPath))) ||
                  (item.id === 'finance' && activeSection === 'finance' && !isReportsPath) ||
                  (item.id !== 'finance' && item.id !== 'finance-reports' && activeSection === item.id);
                const href = getPathForSection(item.id);
                return (
                  <a
                    key={item.id}
                    id={`nav-item-${item.id}`}
                    href={href}
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                      e.preventDefault();
                      onSelectSection(item.id);
                      onCloseMobile();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#EEF2FF] text-[#4F46E5] font-semibold'
                        : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-[#4F46E5]' : 'text-[#64748B]'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                          isActive
                            ? 'bg-[#4F46E5] text-white'
                            : 'bg-[#EEF2FF] text-[#4F46E5]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </a>
                );
              })}
            </div>
          ))}
        </div>

        {/* Current Active Business & User Footer */}
        <div className="p-3 border-t border-[#E2E8F0] bg-[#F8FAFC]">
          <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-[#E2E8F0]">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#0F172A] truncate">
                {activeBusiness?.name || 'No business selected'}
              </p>
              <p className="text-[11px] text-[#64748B] flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#16A34A]"></span>
                <span>Role: {activeBusiness?.role || 'Viewer'}</span>
              </p>
            </div>
            <button
              id="sidebar-logout-btn"
              onClick={() => logout()}
              title="Sign out"
              className="p-1.5 text-[#64748B] hover:text-[#DC2626] hover:bg-red-50 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
