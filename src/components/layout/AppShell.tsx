import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { ActiveNavSection } from '../../types';
import { DashboardView } from '../dashboard/DashboardView';
import { LeadsModuleView } from '../leads/LeadsModuleView';
import { ClientsModuleView } from '../clients/ClientsModuleView';
import { FinanceModuleView } from '../finance/FinanceModuleView';
import { ProjectsView } from '../projects/ProjectsView';
import { TasksView } from '../tasks/TasksView';
import { TeamMembersRolesView } from '../employees/TeamMembersRolesView';
import { DocumentsView } from '../documents/DocumentsView';
import { AnalyticsView } from '../analytics/AnalyticsView';
import { NotificationsView } from '../notifications/NotificationsView';
import { PlaceholderModuleView } from '../dashboard/PlaceholderModuleView';
import { BusinessSettingsView } from '../settings/BusinessSettingsView';
import { TeamRolesView } from '../settings/TeamRolesView';
import { LeadEntrySettingsView } from '../settings/LeadEntrySettingsView';
import { DatabaseSchemaView } from '../settings/DatabaseSchemaView';
import { LoginHistoryView } from '../settings/LoginHistoryView';
import { AiCopilotView } from '../ai/AiCopilotView';
import { UnauthorizedView } from '../unauthorized/UnauthorizedView';
import { usePermissions } from '../../lib/use-permissions';
import { useAuth } from '../../lib/auth-context';
import { resolveRoute, getPathForSection } from '../../lib/router';

export const AppShell: React.FC = () => {
  const { role } = usePermissions();
  const { viewingSupportBusinessId, endSupportWorkspaceView, activeBusiness } = useAuth();

  const [activeSection, setActiveSection] = useState<ActiveNavSection>('dashboard');
  const [financeSubTab, setFinanceSubTab] = useState<string>('overview');
  const [isUnauthorized, setIsUnauthorized] = useState<boolean>(false);
  const [attemptedPath, setAttemptedPath] = useState<string>('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [targetLeadId, setTargetLeadId] = useState<string | null>(null);
  const [targetClientId, setTargetClientId] = useState<string | null>(null);

  // Apply route resolution given current browser pathname and user's role
  const applyRoute = useCallback((pathname: string, userRole: typeof role) => {
    const res = resolveRoute(pathname, userRole);
    if (res.isUnauthorized) {
      setIsUnauthorized(true);
      setAttemptedPath(res.attemptedPath);
      // Synchronize URL bar to /unauthorized if not already
      if (window.location.pathname !== '/unauthorized') {
        window.history.replaceState({ path: '/unauthorized' }, '', '/unauthorized');
      }
    } else {
      setIsUnauthorized(false);
      setActiveSection(res.section);
      if (res.section === 'clients') {
        setTargetClientId(res.entityId || null);
      } else {
        setTargetClientId(null);
      }
      if (res.section === 'leads') {
        setTargetLeadId(res.entityId || null);
      } else {
        setTargetLeadId(null);
      }
      if (res.subTab) {
        setFinanceSubTab(res.subTab);
      }
    }
  }, []);

  // Listen to browser popstate (Back/Forward navigation) & initial mount
  useEffect(() => {
    applyRoute(window.location.pathname, role);

    const handlePopState = () => {
      applyRoute(window.location.pathname, role);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [role, applyRoute]);

  // Handle direct navigation to any path
  const handleNavigatePath = (path: string, replace = false) => {
    if (replace) {
      window.history.replaceState({}, '', path);
    } else {
      window.history.pushState({}, '', path);
    }
    applyRoute(path, role);
  };

  const handleOpenLead = (leadId: string) => {
    setTargetLeadId(leadId);
    handleSelectSection('leads');
  };

  const handleOpenClient = (clientId: string) => {
    setTargetClientId(clientId);
    handleNavigatePath(`/clients/${clientId}`);
  };

  const handleSelectSection = (section: ActiveNavSection) => {
    if (section === 'leads') setTargetLeadId(null);
    if (section === 'clients') setTargetClientId(null);
    if (section !== 'leads' && section !== 'clients') {
      setTargetLeadId(null);
      setTargetClientId(null);
    }

    let subTab: string | undefined = undefined;
    let targetSection = section;
    if (targetSection === 'finance') {
      subTab = 'overview';
      setFinanceSubTab('overview');
    } else if (targetSection === 'finance-reports') {
      subTab = 'reports-profit-loss';
      setFinanceSubTab('reports-profit-loss');
      targetSection = 'finance';
    }

    const path = getPathForSection(targetSection, subTab);
    handleNavigatePath(path);
  };

  const handleFinanceSubTabChange = (subTab: string) => {
    setFinanceSubTab(subTab);
    const path =
      subTab === 'overview'
        ? '/finance'
        : subTab === 'reports-profit-loss'
        ? '/finance/reports/profit-loss'
        : `/finance/${subTab}`;
    handleNavigatePath(path);
  };

  const renderActiveContent = () => {
    // If Layer 2 route guard flagged unauthorized, strictly render UnauthorizedView
    if (isUnauthorized) {
      return (
        <UnauthorizedView
          attemptedPath={attemptedPath}
          onBackToDashboard={() => handleNavigatePath('/', false)}
        />
      );
    }

    switch (activeSection) {
      case 'dashboard':
        return (
          <DashboardView
            onNavigate={handleSelectSection}
            onOpenLead={handleOpenLead}
            onOpenClient={handleOpenClient}
          />
        );
      case 'leads':
        return (
          <LeadsModuleView
            initialLeadId={targetLeadId}
            onOpenClient={handleOpenClient}
            onOpenLeadSettings={() => handleSelectSection('lead-entry-settings')}
          />
        );
      case 'clients':
        return (
          <ClientsModuleView
            initialClientId={targetClientId}
            onSelectClient={(clientId) => {
              setTargetClientId(clientId);
              handleNavigatePath(clientId ? `/clients/${clientId}` : '/clients');
            }}
            onOpenLead={handleOpenLead}
          />
        );
      case 'finance':
        return (
          <FinanceModuleView
            initialSubTab={financeSubTab}
            onSubTabChange={handleFinanceSubTabChange}
          />
        );
      case 'projects':
        return <ProjectsView />;
      case 'tasks':
        return <TasksView />;
      case 'team-members-roles':
        return <TeamMembersRolesView />;
      case 'documents':
        return <DocumentsView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'notifications':
        return <NotificationsView />;
      case 'business-settings':
        return <BusinessSettingsView onNavigate={handleSelectSection} />;
      case 'login-history':
        return <LoginHistoryView onNavigate={handleSelectSection} />;
      case 'copilot':
        return <AiCopilotView onNavigate={handleSelectSection} />;
      case 'lead-entry-settings':
      case 'lead-agents':
        return <LeadEntrySettingsView />;
      case 'database-schema':
        return <DatabaseSchemaView />;
      default:
        return (
          <PlaceholderModuleView
            section={activeSection}
            onNavigate={handleSelectSection}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans antialiased text-[#0F172A]">
      {viewingSupportBusinessId && (
        <div className="bg-amber-600 text-white px-4 py-2.5 text-xs font-medium flex items-center justify-between shrink-0 z-50 shadow-sm sticky top-0">
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-800 rounded-md text-[10px]">Support Mode</span>
            <span>Viewing Tenant Workspace: <strong className="font-bold underline">{activeBusiness?.name || viewingSupportBusinessId}</strong></span>
          </div>
          <button
            onClick={async () => {
              await endSupportWorkspaceView();
              window.location.href = '/master#workspaces';
            }}
            className="px-3 py-1 bg-white text-amber-900 rounded-lg text-xs font-bold hover:bg-amber-50 transition-colors shadow-2xs"
          >
            Exit Support Mode & Return
          </button>
        </div>
      )}
      {/* Sidebar */}
      <Sidebar
        activeSection={isUnauthorized ? 'dashboard' : activeSection}
        onSelectSection={handleSelectSection}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Body with Left Margin for Desktop Sidebar */}
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        {/* Top Navigation */}
        <TopNav
          activeSection={isUnauthorized ? 'dashboard' : activeSection}
          onSelectSection={handleSelectSection}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        />

        {/* Content Area */}
        <main className={`flex-1 ${activeSection === 'copilot' ? 'p-0 overflow-hidden flex flex-col' : 'p-4 sm:p-6 lg:p-8 overflow-y-auto'}`}>
          {renderActiveContent()}
        </main>
      </div>
    </div>
  );
};

