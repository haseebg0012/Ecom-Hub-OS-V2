import React from 'react';
import {
  Target,
  Users,
  FolderKanban,
  CheckSquare,
  UserCheck,
  Wallet,
  FileText,
  BarChart3,
  Bell,
  Sparkles,
  Boxes,
  ArrowRight,
  Database,
  Layers,
} from 'lucide-react';
import { ActiveNavSection } from '../../types';
import { useAuth } from '../../lib/auth-context';

interface PlaceholderModuleViewProps {
  section: ActiveNavSection;
  onNavigate: (section: ActiveNavSection) => void;
}

interface ModuleInfo {
  title: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  plannedFeatures: string[];
  databaseModel: string;
}

const MODULE_DATA: Record<string, ModuleInfo> = {
  leads: {
    title: 'Leads',
    category: 'SALES',
    icon: Target,
    description: 'Inbound prospect intake, qualification statuses, scoring, and source tracking.',
    plannedFeatures: [
      'Lead capture form webhooks & API intake',
      'Lead qualification pipeline (New, Contacted, Qualified, Lost)',
      'Lead value estimation and conversion to Client',
      'Tenant lead partitioning via active business context',
    ],
    databaseModel: 'leads table (id, business_id, name, email, company, value, status, source)',
  },
  clients: {
    title: 'Clients',
    category: 'SALES',
    icon: Users,
    description: 'Centralized directory of client organizations, primary contacts, and lifetime value.',
    plannedFeatures: [
      'Comprehensive company and contact profiles',
      'Account manager assignments & billing preferences',
      'Associated projects, contracts, and revenue summaries',
      'Client activity timeline and communication history',
    ],
    databaseModel: 'clients table (id, business_id, name, contact_email, phone, address, tier)',
  },
  projects: {
    title: 'Projects',
    category: 'OPERATIONS',
    icon: FolderKanban,
    description: 'Track deliverables, milestones, budgets, and team allocations.',
    plannedFeatures: [
      'Project workspaces linked to specific Clients',
      'Budget tracking against actual operational costs',
      'Milestones, deadlines, and delivery statuses',
      'Role-restricted project access for teams',
    ],
    databaseModel: 'projects table (id, business_id, client_id, name, status, budget, deadline)',
  },
  tasks: {
    title: 'Tasks',
    category: 'OPERATIONS',
    icon: CheckSquare,
    description: 'Daily operational workflow items, priorities, assignees, and kanban boards.',
    plannedFeatures: [
      'Task lists and kanban board views',
      'Direct assignment to business members and contractors',
      'Due date alerts and subtask checklists',
      'Project task aggregation and time tracking',
    ],
    databaseModel: 'tasks table (id, business_id, project_id, assignee_id, title, priority, due_date)',
  },
  employees: {
    title: 'Employees',
    category: 'OPERATIONS',
    icon: UserCheck,
    description: 'Internal organization directory, job titles, departments, and employee records.',
    plannedFeatures: [
      'Employee directory and department hierarchies',
      'Compensation metadata, contracts, and start dates',
      'Role permissions synced with business members',
      'Direct link to project assignments',
    ],
    databaseModel: 'employees table (id, business_id, user_id, title, department, hire_date, status)',
  },
  finance: {
    title: 'Finance',
    category: 'FINANCE',
    icon: Wallet,
    description: 'Cash flow management, income streams, operational expenses, invoices, and ledger.',
    plannedFeatures: [
      'Multi-currency ledger with exchange rate calculations',
      'Invoice creation and payment reconciliation',
      'Operating expenses categorization and receipt storage',
      'Profit & loss balance calculations',
    ],
    databaseModel: 'finance_transactions table (id, business_id, type, amount, currency, category, date)',
  },
  documents: {
    title: 'Documents',
    category: 'BUSINESS',
    icon: FileText,
    description: 'Secure file repository, agreements, brand assets, and proposals.',
    plannedFeatures: [
      'Storage bucket integration with tenant isolation',
      'Client agreements and NDAs with version history',
      'Tax documents, invoices, and internal procedure guides',
      'Granular read/write permissions per user role',
    ],
    databaseModel: 'documents table (id, business_id, title, storage_path, file_size, category, access_role)',
  },
  analytics: {
    title: 'Analytics',
    category: 'BUSINESS',
    icon: BarChart3,
    description: 'Executive reporting, revenue graphs, team productivity, and conversion funnels.',
    plannedFeatures: [
      'Real-time aggregation queries on business tables',
      'Revenue growth and expense velocity charts',
      'Team utilization and task velocity reports',
      'Custom report exporting (CSV/PDF)',
    ],
    databaseModel: 'Aggregates from leads, clients, projects, and finance tables',
  },
  notifications: {
    title: 'Notifications',
    category: 'BUSINESS',
    icon: Bell,
    description: 'System alerts, task assignments, payment notices, and team mentions.',
    plannedFeatures: [
      'In-app notification bell with unread counters',
      'Real-time broadcast via active channels',
      'Email digest configuration per user preferences',
      'Urgent status pings for overdue milestones',
    ],
    databaseModel: 'notifications table (id, user_id, business_id, title, message, read, created_at)',
  },
  copilot: {
    title: 'Business Copilot',
    category: 'AI',
    icon: Sparkles,
    description: 'Intelligent business assistant for revenue insights, proposal drafting, and workflow automation.',
    plannedFeatures: [
      'Context-aware answers referencing your business database',
      'Automated email drafting for client outreach',
      'Financial pattern summaries and cash flow forecasting',
    ],
    databaseModel: 'Secure server-side LLM endpoint with active business context verification',
  },
  integrations: {
    title: 'Integrations',
    category: 'SETTINGS',
    icon: Boxes,
    description: 'Connect third-party accounting, payments, communications, and analytics providers.',
    plannedFeatures: [
      'Stripe & PayPal payment processing sync',
      'Google Sheets two-way financial and lead sync',
      'Slack & Discord operational webhook alerts',
    ],
    databaseModel: 'business_integrations table (id, business_id, provider, config, active)',
  },
};

export const PlaceholderModuleView: React.FC<PlaceholderModuleViewProps> = ({
  section,
  onNavigate,
}) => {
  const { activeBusiness } = useAuth();
  const info = MODULE_DATA[section] || {
    title: 'Module',
    category: 'OPERATIONS',
    icon: Layers,
    description: 'Business module workspace.',
    plannedFeatures: [],
    databaseModel: '',
  };

  const Icon = info.icon;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center shadow-xs">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                {info.category}
              </span>
              <span className="text-[#94A3B8]">•</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#EEF2FF] text-[#4F46E5]">
                Active Module
              </span>
            </div>
            <h1 className="text-xl font-bold text-[#0F172A] tracking-tight mt-0.5">
              {info.title}
            </h1>
          </div>
        </div>

        <div className="text-xs text-[#64748B] bg-white border border-[#E2E8F0] px-3 py-1.5 rounded-lg flex items-center gap-2">
          <span>Active Scope:</span>
          <span className="font-semibold text-[#0F172A]">
            {activeBusiness?.name || 'Current Business'}
          </span>
        </div>
      </div>

      {/* Description Banner */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs">
        <h2 className="text-sm font-semibold text-[#0F172A] mb-1">
          Module Workspace
        </h2>
        <p className="text-sm text-[#64748B] leading-relaxed">
          {info.description}
        </p>
      </div>

      {/* Feature Capabilities */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-semibold text-[#0F172A]">
          Key Capabilities
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {info.plannedFeatures.map((feat, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-lg border border-[#E2E8F0] bg-white flex items-start gap-2.5"
            >
              <div className="w-5 h-5 rounded-full bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5">
                {idx + 1}
              </div>
              <span className="text-xs text-[#0F172A] font-medium leading-normal">
                {feat}
              </span>
            </div>
          ))}
        </div>

        {info.databaseModel && (
          <div className="pt-3 border-t border-[#E2E8F0] mt-4 flex items-center justify-between text-xs text-[#64748B]">
            <div className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-[#4F46E5]" />
              <span>Data Schema:</span>
              <code className="font-mono text-[11px] text-[#0F172A] bg-[#F1F5F9] px-2 py-0.5 rounded">
                {info.databaseModel}
              </code>
            </div>
          </div>
        )}
      </div>

      {/* Quick Navigation Footer */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => onNavigate('dashboard')}
          className="text-xs font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
        >
          ← Return to Dashboard
        </button>

        <button
          onClick={() => onNavigate('database-schema')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4F46E5] hover:text-[#4338CA] transition-colors"
        >
          <span>View Database RLS Foundation</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

