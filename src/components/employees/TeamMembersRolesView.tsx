import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  UserPlus,
  Search,
  Filter,
  Edit,
  Trash2,
  CheckCircle2,
  X,
  Save,
  Shield,
  User,
  Clock,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Layout,
  Lock
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { BusinessRole } from '../../types';

interface RoleConfigItem {
  key: string;
  label: string;
  role: BusinessRole;
}

const SYSTEM_ROLES: RoleConfigItem[] = [
  { key: 'Owner', label: 'Owner / Master', role: 'Owner' },
  { key: 'Admin', label: 'Business Admin', role: 'Admin' },
  { key: 'Operations', label: 'Operations Specialist', role: 'Operations' },
  { key: 'Sales', label: 'Sales Representative', role: 'Sales' },
  { key: 'Manager', label: 'Marketing Manager', role: 'Manager' },
  { key: 'Finance', label: 'Finance Manager', role: 'Finance' },
  { key: 'Employee', label: 'Employee Default', role: 'Employee' },
  { key: 'Viewer', label: 'Stakeholder / Viewer', role: 'Viewer' },
];

const MODULE_LIST = [
  { id: 'crm', label: 'CRM & Pipelines' },
  { id: 'tasks', label: 'Tasks Module' },
  { id: 'projects', label: 'Projects & Operations' },
  { id: 'analytics', label: 'Reporting & Analytics' },
  { id: 'finance', label: 'Finance Dashboard' },
  { id: 'documents', label: 'Documents & Files' },
  { id: 'team_roles', label: 'Team & Settings' },
];

const SIDEBAR_UI_MODULES = [
  { id: 'dashboard', label: 'Dashboard Overview' },
  { id: 'leads', label: 'Leads & Pipelines' },
  { id: 'clients', label: 'Clients Directory' },
  { id: 'projects', label: 'Projects & Operations' },
  { id: 'tasks', label: 'Tasks Module' },
  { id: 'team-members-roles', label: 'Team Members & Roles' },
  { id: 'finance', label: 'Finance Dashboard' },
  { id: 'documents', label: 'Documents & Files' },
  { id: 'analytics', label: 'Reporting & Analytics' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'lead-entry-settings', label: 'Lead Entry & Agents' },
  { id: 'login-history', label: 'Login History' },
  { id: 'integrations', label: 'Integrations' },
];

const ACTIONS = ['view', 'create', 'edit', 'delete', 'export'] as const;

export const TeamMembersRolesView: React.FC = () => {
  const { activeBusiness, inviteMember } = useAuth();

  // Local employees state
  const [employees, setEmployees] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Selected horizontal role for permissions matrix
  const [selectedRoleKey, setSelectedRoleKey] = useState<string>('Sales');

  // Matrix sub-tab: 'crud' vs 'uiview'
  const [matrixSubTab, setMatrixSubTab] = useState<'crud' | 'uiview'>('crud');

  // Save Matrix Dirty State
  const [isMatrixDirty, setIsMatrixDirty] = useState(false);

  // Collapsible sections state
  const [isRolesSectionOpen, setIsRolesSectionOpen] = useState(true);
  const [isMembersSectionOpen, setIsMembersSectionOpen] = useState(true);

  // Role permissions matrix
  const [rolePermissions, setRolePermissions] = useState<Record<string, Record<string, boolean>>>({
    Operations: {
      'crm.view': true, 'crm.create': false, 'crm.edit': true, 'crm.delete': false, 'crm.export': false,
      'tasks.view': true, 'tasks.create': true, 'tasks.edit': true, 'tasks.delete': true, 'tasks.export': true,
      'projects.view': true, 'projects.create': true, 'projects.edit': true, 'projects.delete': false, 'projects.export': true,
      'analytics.view': true, 'analytics.create': false, 'analytics.edit': false, 'analytics.delete': false, 'analytics.export': false,
      'finance.view': false, 'finance.create': false, 'finance.edit': false, 'finance.delete': false, 'finance.export': false,
      'documents.view': true, 'documents.create': true, 'documents.edit': true, 'documents.delete': false, 'documents.export': false,
      'team_roles.view': false, 'team_roles.create': false, 'team_roles.edit': false, 'team_roles.delete': false, 'team_roles.export': false,
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
    Admin: {
      'crm.view': true, 'crm.create': true, 'crm.edit': true, 'crm.delete': true, 'crm.export': true,
      'tasks.view': true, 'tasks.create': true, 'tasks.edit': true, 'tasks.delete': true, 'tasks.export': true,
      'projects.view': true, 'projects.create': true, 'projects.edit': true, 'projects.delete': true, 'projects.export': true,
      'analytics.view': true, 'analytics.create': true, 'analytics.edit': true, 'analytics.delete': true, 'analytics.export': true,
      'finance.view': true, 'finance.create': true, 'finance.edit': true, 'finance.delete': false, 'finance.export': true,
      'documents.view': true, 'documents.create': true, 'documents.edit': true, 'documents.delete': true, 'documents.export': true,
      'team_roles.view': true, 'team_roles.create': true, 'team_roles.edit': true, 'team_roles.delete': true, 'team_roles.export': true,
    },
    Manager: {
      'crm.view': true, 'crm.create': true, 'crm.edit': true, 'crm.delete': false, 'crm.export': true,
      'tasks.view': true, 'tasks.create': true, 'tasks.edit': true, 'tasks.delete': false, 'tasks.export': true,
      'projects.view': true, 'projects.create': true, 'projects.edit': true, 'projects.delete': false, 'projects.export': true,
      'analytics.view': true, 'analytics.create': false, 'analytics.edit': false, 'analytics.delete': false, 'analytics.export': true,
      'finance.view': true, 'finance.create': false, 'finance.edit': false, 'finance.delete': false, 'finance.export': false,
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
    Employee: {
      'crm.view': true, 'crm.create': false, 'crm.edit': false, 'crm.delete': false, 'crm.export': false,
      'tasks.view': true, 'tasks.create': true, 'tasks.edit': true, 'tasks.delete': false, 'tasks.export': false,
      'projects.view': true, 'projects.create': false, 'projects.edit': false, 'projects.delete': false, 'projects.export': false,
      'analytics.view': false, 'analytics.create': false, 'analytics.edit': false, 'analytics.delete': false, 'analytics.export': false,
      'finance.view': false, 'finance.create': false, 'finance.edit': false, 'finance.delete': false, 'finance.export': false,
      'documents.view': true, 'documents.create': false, 'documents.edit': false, 'documents.delete': false, 'documents.export': false,
      'team_roles.view': false, 'team_roles.create': false, 'team_roles.edit': false, 'team_roles.delete': false, 'team_roles.export': false,
    },
    Owner: {
      'crm.view': true, 'crm.create': true, 'crm.edit': true, 'crm.delete': true, 'crm.export': true,
      'tasks.view': true, 'tasks.create': true, 'tasks.edit': true, 'tasks.delete': true, 'tasks.export': true,
      'projects.view': true, 'projects.create': true, 'projects.edit': true, 'projects.delete': true, 'projects.export': true,
      'analytics.view': true, 'analytics.create': true, 'analytics.edit': true, 'analytics.delete': true, 'analytics.export': true,
      'finance.view': true, 'finance.create': true, 'finance.edit': true, 'finance.delete': true, 'finance.export': true,
      'documents.view': true, 'documents.create': true, 'documents.edit': true, 'documents.delete': true, 'documents.export': true,
      'team_roles.view': true, 'team_roles.create': true, 'team_roles.edit': true, 'team_roles.delete': true, 'team_roles.export': true,
    },
    Viewer: {
      'crm.view': true, 'crm.create': false, 'crm.edit': false, 'crm.delete': false, 'crm.export': false,
      'tasks.view': true, 'tasks.create': false, 'tasks.edit': false, 'tasks.delete': false, 'tasks.export': false,
      'projects.view': true, 'projects.create': false, 'projects.edit': false, 'projects.delete': false, 'projects.export': false,
      'analytics.view': true, 'analytics.create': false, 'analytics.edit': false, 'analytics.delete': false, 'analytics.export': false,
      'finance.view': true, 'finance.create': false, 'finance.edit': false, 'finance.delete': false, 'finance.export': false,
      'documents.view': true, 'documents.create': false, 'documents.edit': false, 'documents.delete': false, 'documents.export': false,
      'team_roles.view': false, 'team_roles.create': false, 'team_roles.edit': false, 'team_roles.delete': false, 'team_roles.export': false,
    }
  });

  // UI Visibility per role
  const [uiVisibilityMap, setUiVisibilityMap] = useState<Record<string, Record<string, boolean>>>({
    Operations: {
      dashboard: true, leads: true, clients: true, projects: true, tasks: true,
      'team-members-roles': false, finance: false, documents: true, analytics: false,
      notifications: true, 'lead-entry-settings': false, 'login-history': false, integrations: false
    },
    Sales: {
      dashboard: true, leads: true, clients: true, projects: true, tasks: true,
      'team-members-roles': false, finance: false, documents: true, analytics: true,
      notifications: true, 'lead-entry-settings': false, 'login-history': false, integrations: false
    },
    Employee: {
      dashboard: true, leads: false, clients: false, projects: true, tasks: true,
      'team-members-roles': false, finance: false, documents: true, analytics: false,
      notifications: true, 'lead-entry-settings': false, 'login-history': false, integrations: false
    },
    Manager: {
      dashboard: true, leads: true, clients: true, projects: true, tasks: true,
      'team-members-roles': false, finance: false, documents: true, analytics: true,
      notifications: true, 'lead-entry-settings': true, 'login-history': false, integrations: false
    },
    Finance: {
      dashboard: true, leads: false, clients: true, projects: false, tasks: false,
      'team-members-roles': false, finance: true, documents: true, analytics: true,
      notifications: true, 'lead-entry-settings': false, 'login-history': true, integrations: false
    },
    Admin: {
      dashboard: true, leads: true, clients: true, projects: true, tasks: true,
      'team-members-roles': true, finance: true, documents: true, analytics: true,
      notifications: true, 'lead-entry-settings': true, 'login-history': true, integrations: true
    },
    Owner: {
      dashboard: true, leads: true, clients: true, projects: true, tasks: true,
      'team-members-roles': true, finance: true, documents: true, analytics: true,
      notifications: true, 'lead-entry-settings': true, 'login-history': true, integrations: true
    },
    Viewer: {
      dashboard: true, leads: true, clients: true, projects: true, tasks: true,
      'team-members-roles': false, finance: true, documents: true, analytics: true,
      notifications: true, 'lead-entry-settings': false, 'login-history': false, integrations: false
    }
  });

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);

  // Add Employee Form State
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    password: 'Password123!',
    role: 'Sales' as BusinessRole,
    roles: ['Sales'] as string[],
    jobTitle: 'Sales Associate',
    department: 'Sales & Growth',
    phone: '+1 (555) 019-2834'
  });

  // Edit Employee Form State
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: 'Sales' as BusinessRole,
    roles: ['Sales'] as string[],
    jobTitle: '',
    phone: '',
    status: 'Active',
    performedTasksCount: 14,
    showAddRoles: false
  });

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Load employees & matrices from localStorage
  useEffect(() => {
    try {
      const savedMatrix = localStorage.getItem('ecomhub_role_matrix');
      if (savedMatrix) {
        setRolePermissions(JSON.parse(savedMatrix));
      }
      const savedUiVis = localStorage.getItem('ecomhub_ui_role_visibility');
      if (savedUiVis) {
        setUiVisibilityMap(JSON.parse(savedUiVis));
      }
      const savedEmps = localStorage.getItem('ecomhub_employees');
      if (savedEmps) {
        setEmployees(JSON.parse(savedEmps));
      } else {
        const initial: any[] = [];
        setEmployees(initial);
        localStorage.setItem('ecomhub_employees', JSON.stringify(initial));
      }
    } catch {
      // ignore
    }
  }, []);

  const saveEmployeesToStorage = (updated: any[]) => {
    setEmployees(updated);
    localStorage.setItem('ecomhub_employees', JSON.stringify(updated));
    window.dispatchEvent(new Event('ecomhub_employees_updated'));
  };

  // Sync employees on external updates (e.g. login/logout)
  useEffect(() => {
    const handleSync = () => {
      try {
        const raw = localStorage.getItem('ecomhub_employees');
        if (raw) setEmployees(JSON.parse(raw));
      } catch {}
    };
    window.addEventListener('ecomhub_employees_updated', handleSync);
    return () => window.removeEventListener('ecomhub_employees_updated', handleSync);
  }, []);

  const handleTogglePermission = (modId: string, action: string) => {
    setIsMatrixDirty(false);
    const key = `${modId}.${action}`;
    setRolePermissions((prev) => {
      const currentRolePerms = prev[selectedRoleKey] || {};
      const updatedPerms = { ...currentRolePerms };
      const newValue = !currentRolePerms[key];
      updatedPerms[key] = newValue;

      // View dependency rule: if view is turned OFF, turn off all actions for this module
      if (action === 'view' && !newValue) {
        ACTIONS.forEach((act) => {
          updatedPerms[`${modId}.${act}`] = false;
        });
      }

      const nextState = {
        ...prev,
        [selectedRoleKey]: updatedPerms,
      };

      try {
        localStorage.setItem('ecomhub_role_matrix', JSON.stringify(nextState));
        window.dispatchEvent(new Event('ecomhub_role_matrix_updated'));
      } catch {}

      return nextState;
    });
  };

  const handleToggleUiVisibility = (modId: string) => {
    setIsMatrixDirty(false);
    setUiVisibilityMap((prev) => {
      const currentRoleMap = prev[selectedRoleKey] || {};
      const currentVal = currentRoleMap[modId] !== false; // defaults to true
      const nextMap = {
        ...prev,
        [selectedRoleKey]: {
          ...currentRoleMap,
          [modId]: !currentVal,
        },
      };
      try {
        localStorage.setItem('ecomhub_ui_role_visibility', JSON.stringify(nextMap));
        window.dispatchEvent(new Event('ecomhub_ui_role_visibility_updated'));
      } catch {}
      return nextMap;
    });
  };

  const handleSaveMatrix = () => {
    try {
      localStorage.setItem('ecomhub_role_matrix', JSON.stringify(rolePermissions));
      localStorage.setItem('ecomhub_ui_role_visibility', JSON.stringify(uiVisibilityMap));
      window.dispatchEvent(new Event('ecomhub_ui_role_visibility_updated'));
      setIsMatrixDirty(false);
      setStatusMessage(`Permissions & UI View configuration saved successfully for ${selectedRoleKey}!`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch {
      setStatusMessage('Error saving configuration.');
    }
  };

  const handleAddEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name || !addForm.email) return;

    const assignedRoles = addForm.roles.includes(addForm.role) ? addForm.roles : [addForm.role, ...addForm.roles];

    const newEmp = {
      id: `emp-${Date.now()}`,
      business_id: activeBusiness?.id || 'biz-ecometrix-001',
      name: addForm.name,
      email: addForm.email,
      role: addForm.role,
      roles: assignedRoles,
      jobTitle: addForm.jobTitle,
      department: addForm.department,
      phone: addForm.phone,
      status: 'Added',
      lastLogin: 'Never',
      performedTasksCount: 0,
      created_at: new Date().toISOString()
    };

    const updated = [newEmp, ...employees];
    saveEmployeesToStorage(updated);

    try {
      inviteMember(addForm.email, addForm.name, addForm.role);
    } catch {
      // ignore
    }

    setIsAddModalOpen(false);
    setAddForm({
      name: '',
      email: '',
      password: 'Password123!',
      role: 'Sales',
      roles: ['Sales'],
      jobTitle: 'Sales Associate',
      department: 'Sales & Growth',
      phone: '+1 (555) 019-2834'
    });
    setStatusMessage(`Employee ${newEmp.name} added successfully!`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleOpenEdit = (emp: any) => {
    // When profile is opened, transition from 'Added' (Yellow) to 'Profile Active' (Orange)
    let effectiveStatus = emp.status || 'Added';
    if (effectiveStatus === 'Added') {
      effectiveStatus = 'Profile Active';
      const updated = employees.map((e) => (e.id === emp.id ? { ...e, status: 'Profile Active' } : e));
      saveEmployeesToStorage(updated);
    }

    setEditingEmployee(emp);
    const empRoles = emp.roles || [emp.role || 'Sales'];
    setEditForm({
      name: emp.name || '',
      email: emp.email || '',
      role: emp.role || empRoles[0] || 'Sales',
      roles: empRoles,
      jobTitle: emp.jobTitle || emp.department || '',
      phone: emp.phone || '',
      status: effectiveStatus,
      performedTasksCount: emp.performedTasksCount || 10,
      showAddRoles: false
    });
  };

  const handleEditEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    const assignedRoles = editForm.roles.includes(editForm.role) ? editForm.roles : [editForm.role, ...editForm.roles];

    const updated = employees.map((emp) => {
      if (emp.id === editingEmployee.id) {
        return {
          ...emp,
          name: editForm.name,
          email: editForm.email,
          role: editForm.role,
          roles: assignedRoles,
          jobTitle: editForm.jobTitle,
          phone: editForm.phone,
          status: editForm.status,
          performedTasksCount: editForm.performedTasksCount
        };
      }
      return emp;
    });

    saveEmployeesToStorage(updated);
    setEditingEmployee(null);
    setStatusMessage('Employee updated successfully with assigned roles!');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleDeleteEmployee = (id: string, email?: string) => {
    const updated = employees.filter((e) => e.id !== id && e.email !== email);
    saveEmployeesToStorage(updated);

    try {
      const rawMem = localStorage.getItem('ecomhub_members');
      if (rawMem) {
        const members = JSON.parse(rawMem);
        const updatedMem = members.filter((m: any) => m.id !== id && m.user_id !== id && m.profile?.email !== email);
        localStorage.setItem('ecomhub_members', JSON.stringify(updatedMem));
      }
    } catch {
      // ignore
    }

    setStatusMessage('Employee removed successfully.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleFactoryReset = () => {
    if (window.confirm('Are you sure you want to perform a Fresh Start / Factory Reset? This will wipe all dummy employees, projects, tasks, and data for a 100% clean slate.')) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('ecomhub_') && key !== 'ecomhub_session' && key !== 'ecomhub_active_business_id') {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      window.location.reload();
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const empRolesStr = (emp.roles || [emp.role]).join(' ').toLowerCase();
    const matchesSearch =
      emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      empRolesStr.includes(searchTerm.toLowerCase()) ||
      emp.department?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'active') return matchesSearch && emp.status === 'Active';
    if (statusFilter === 'inactive') return matchesSearch && emp.status !== 'Active';
    return matchesSearch;
  });

  const currentRoleObj = SYSTEM_ROLES.find((r) => r.key === selectedRoleKey) || SYSTEM_ROLES[2];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#2D3748]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Team Members & Roles
            </h1>
            <p className="text-xs text-slate-400">
              Manage organization members, custom multiple system roles, and operational privileges for <strong className="text-white">{activeBusiness?.name}</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {statusMessage && (
            <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{statusMessage}</span>
            </div>
          )}
          <button
            onClick={handleFactoryReset}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-slate-700 transition-all"
            title="Wipe all dummy data and start fresh"
          >
            <span>🧹 Fresh Start</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/30 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* Search & Status Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#141B2D] border border-slate-800 p-4 rounded-xl shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search team members by name, email, role, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-400 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* SECTION 1: Select System Role & Permissions Matrix (Collapsible) */}
      <div className="bg-[#141B2D] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div
          onClick={() => setIsRolesSectionOpen(!isRolesSectionOpen)}
          className="flex items-center justify-between p-4 cursor-pointer bg-slate-900/60 hover:bg-slate-900/90 transition-colors border-b border-slate-800"
        >
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-sm font-bold text-white">Select System Role & Permissions Matrix</h2>
              <p className="text-xs text-slate-400">Click horizontal role tabs to customize module privileges and left panel UI view access</p>
            </div>
          </div>
          <button className="text-slate-400 hover:text-white p-1">
            {isRolesSectionOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {isRolesSectionOpen && (
          <div className="p-6 space-y-6">
            {/* Horizontal System Role Tabs */}
            <div className="flex flex-wrap gap-2 pb-4 border-b border-slate-800">
              {SYSTEM_ROLES.map((r) => {
                const isSelected = selectedRoleKey === r.key;
                const count = employees.filter((e) => (e.roles || [e.role]).includes(r.key)).length;
                return (
                  <button
                    key={r.key}
                    onClick={() => setSelectedRoleKey(r.key)}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400/30'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
                    }`}
                  >
                    <Shield className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                    <span>{r.label}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                      isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Matrix Sub-Tabs & Save Action Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMatrixSubTab('crud')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    matrixSubTab === 'crud'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>CRUD Permissions Matrix</span>
                </button>
                <button
                  onClick={() => setMatrixSubTab('uiview')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    matrixSubTab === 'uiview'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Layout className="w-3.5 h-3.5" />
                  <span>Left Panel UI View Access</span>
                </button>
              </div>

              {/* Dynamic Save Matrix Button: Blue when dirty, Grey when saved */}
              <button
                onClick={handleSaveMatrix}
                className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                  isMatrixDirty
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 cursor-default'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isMatrixDirty ? 'Save Matrix' : 'Saved'}</span>
              </button>
            </div>

            {/* TAB 1: CRUD Permissions Matrix with View Dependency */}
            {matrixSubTab === 'crud' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Permissions for '{currentRoleObj.label}'
                  </h3>
                  <p className="text-xs text-slate-400">
                    If 'View' is OFF for a module, all associated action permissions (Create, Edit, Delete, Export) are automatically closed and disabled.
                  </p>
                </div>

                <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-900/50">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold tracking-wider uppercase bg-slate-900/80">
                        <th className="py-3.5 px-4">Module</th>
                        <th className="py-3.5 px-3 text-center">View</th>
                        <th className="py-3.5 px-3 text-center">Create</th>
                        <th className="py-3.5 px-3 text-center">Edit</th>
                        <th className="py-3.5 px-3 text-center">Delete</th>
                        <th className="py-3.5 px-3 text-center">Export</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {MODULE_LIST.map((mod) => {
                        const currentPerms = rolePermissions[selectedRoleKey] || {};
                        const isViewActive = currentPerms[`${mod.id}.view`] !== false;
                        return (
                          <tr key={mod.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-3.5 px-4 font-medium text-slate-200">
                              {mod.label}
                            </td>
                            {ACTIONS.map((action) => {
                              const permKey = `${mod.id}.${action}`;
                              const isActive = !!currentPerms[permKey];
                              const isActionDisabled = action !== 'view' && !isViewActive;

                              return (
                                <td key={action} className="py-3.5 px-3 text-center">
                                  <label className={`relative inline-flex items-center justify-center ${isActionDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
                                    <input
                                      type="checkbox"
                                      disabled={isActionDisabled}
                                      checked={isActionDisabled ? false : isActive}
                                      onChange={() => handleTogglePermission(mod.id, action)}
                                      className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                  </label>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 2: Left Panel UI View Access */}
            {matrixSubTab === 'uiview' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Left Panel UI Tab Visibility for '{currentRoleObj.label}'
                  </h3>
                  <p className="text-xs text-slate-400">
                    Toggle ON or OFF specific sidebar navigation modules for this role (e.g., hiding Dashboard or Finance from standard employees).
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {SIDEBAR_UI_MODULES.map((uiMod) => {
                    const roleUiMap = uiVisibilityMap[selectedRoleKey] || {};
                    const isVisible = roleUiMap[uiMod.id] !== false; // defaults to true
                    return (
                      <div
                        key={uiMod.id}
                        onClick={() => handleToggleUiVisibility(uiMod.id)}
                        className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isVisible
                            ? 'bg-indigo-600/15 border-indigo-500/40 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Layout className={`w-4 h-4 ${isVisible ? 'text-indigo-400' : 'text-slate-500'}`} />
                          <span className="text-xs font-semibold">{uiMod.label}</span>
                        </div>
                        <div className={`w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${isVisible ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                          <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isVisible ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 2: Assigned Team Members (Collapsible) */}
      <div className="bg-[#141B2D] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div
          onClick={() => setIsMembersSectionOpen(!isMembersSectionOpen)}
          className="flex items-center justify-between p-4 cursor-pointer bg-slate-900/60 hover:bg-slate-900/90 transition-colors border-b border-slate-800"
        >
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-sm font-bold text-white">Assigned Team Members ({filteredEmployees.length})</h2>
              <p className="text-xs text-slate-400">View status, multi-role assignments, login history, and performed tasks</p>
            </div>
          </div>
          <button className="text-slate-400 hover:text-white p-1">
            {isMembersSectionOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {isMembersSectionOpen && (
          <div className="p-6">
            {filteredEmployees.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No team members found matching your search criteria.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-900/50">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold tracking-wider uppercase bg-slate-900/80">
                      <th className="py-3 px-4">Employee Name</th>
                      <th className="py-3 px-4">Assigned Roles & Dept</th>
                      <th className="py-3 px-4">Current Status</th>
                      <th className="py-3 px-4">Last Login</th>
                      <th className="py-3 px-4">Performed Tasks</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredEmployees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center text-sm border border-indigo-500/30">
                              {emp.name?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <div className="font-semibold text-white">{emp.name}</div>
                              <div className="text-slate-400 text-[11px]">{emp.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {(emp.roles || [emp.role]).map((rKey: string) => {
                              const rObj = SYSTEM_ROLES.find(r => r.key === rKey);
                              return (
                                <span key={rKey} className="px-2 py-0.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-md font-semibold text-[10px]">
                                  {rObj?.label || rKey}
                                </span>
                              );
                            })}
                          </div>
                          <div className="text-slate-400 text-[11px] mt-1">{emp.department || emp.jobTitle}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          {(() => {
                            const st = emp.status || 'Added';
                            if (st === 'Online' || st === 'Logged In') {
                              return (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                  Active
                                </span>
                              );
                            }
                            if (st === 'Profile Active' || st === 'Profile Opened' || st === 'Active') {
                              return (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-400 border border-orange-500/30">
                                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                                  Active
                                </span>
                              );
                            }
                            if (st === 'Offline' || st === 'Logged Out') {
                              return (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-800/80 text-slate-400 border border-slate-700/60">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                                  {emp.lastLogin && emp.lastLogin !== 'Never' ? `Last: ${emp.lastLogin}` : 'Offline'}
                                </span>
                              );
                            }
                            // Default: 'Added' (Yellow)
                            return (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                Added
                              </span>
                            );
                          })()}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            <span>{emp.lastLogin ? emp.lastLogin : 'Never logged in'}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-indigo-300">
                          {emp.performedTasksCount || 0} Tasks
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEdit(emp)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            {emp.role !== 'Owner' && (
                              <button
                                onClick={() => handleDeleteEmployee(emp.id, emp.email)}
                                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Remove employee"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ADD EMPLOYEE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#141B2D] border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Add New Team Employee</h3>
                  <p className="text-xs text-slate-400">Instantly register employee and assign system role</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddEmployeeSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Morgan"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="alex@company.com"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Initial Password</label>
                  <input
                    type="text"
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">System Role Assignment *</label>
                  <select
                    value={addForm.role}
                    onChange={(e: any) => setAddForm({ ...addForm, role: e.target.value, roles: [e.target.value] })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-hidden focus:border-indigo-500"
                  >
                    {SYSTEM_ROLES.map((r) => (
                      <option key={r.key} value={r.key}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Job Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Sales Specialist"
                    value={addForm.jobTitle}
                    onChange={(e) => setAddForm({ ...addForm, jobTitle: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Department</label>
                  <input
                    type="text"
                    placeholder="e.g. Sales & Growth"
                    value={addForm.department}
                    onChange={(e) => setAddForm({ ...addForm, department: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-800 text-xs font-medium text-slate-300 rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add Employee</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT EMPLOYEE MODAL (Divider separated: Personal Info, Status & Performance, Multiple Roles) */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#141B2D] border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Edit Employee & Multi-Role Assignment</h3>
                  <p className="text-xs text-slate-400">Modify personal details, status, tasks, and custom multiple system roles</p>
                </div>
              </div>
              <button
                onClick={() => setEditingEmployee(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditEmployeeSubmit} className="space-y-6">
              {/* DIVIDER 1: Personal Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider border-b border-slate-800 pb-2">
                  <User className="w-4 h-4" />
                  <span>Personal Information</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name</label>
                    <input
                      type="text"
                      required
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
                    <input
                      type="email"
                      required
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Job Title</label>
                    <input
                      type="text"
                      value={editForm.jobTitle}
                      onChange={(e) => setEditForm({ ...editForm, jobTitle: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Phone Number</label>
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* DIVIDER 2: Status & Work Performance */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider border-b border-slate-800 pb-2">
                  <CheckSquare className="w-4 h-4" />
                  <span>Status & Performed Tasks</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Account Status</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-hidden focus:border-indigo-500"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">Performed Tasks Completed</label>
                    <input
                      type="number"
                      value={editForm.performedTasksCount}
                      onChange={(e) => setEditForm({ ...editForm, performedTasksCount: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* DIVIDER 3: Multiple Roles & Permissions Assignment */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4" />
                    <span>System Roles & Access Rights</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, showAddRoles: !editForm.showAddRoles })}
                    className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-[11px] font-semibold rounded-lg border border-indigo-500/30 transition-colors flex items-center gap-1"
                  >
                    <span>{editForm.showAddRoles ? 'Hide Role Selector' : '+ Add More Roles'}</span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Primary System Role *</label>
                  <select
                    value={editForm.role}
                    onChange={(e: any) => {
                      const newRole = e.target.value;
                      const currentRoles = editForm.roles.includes(newRole) ? editForm.roles : [newRole, ...editForm.roles];
                      setEditForm({ ...editForm, role: newRole, roles: currentRoles });
                    }}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-hidden focus:border-indigo-500"
                  >
                    {SYSTEM_ROLES.map((r) => (
                      <option key={r.key} value={r.key}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Assigned Roles Badges */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Currently Assigned Roles ({editForm.roles.length})</label>
                  <div className="flex flex-wrap gap-1.5 p-3 bg-slate-900 border border-slate-800 rounded-lg">
                    {editForm.roles.map((rKey) => {
                      const rObj = SYSTEM_ROLES.find(r => r.key === rKey);
                      return (
                        <span key={rKey} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold rounded-md">
                          <Shield className="w-3 h-3 text-indigo-400" />
                          <span>{rObj?.label || rKey}</span>
                          {editForm.roles.length > 1 && rKey !== editForm.role && (
                            <button
                              type="button"
                              onClick={() => setEditForm({ ...editForm, roles: editForm.roles.filter(x => x !== rKey) })}
                              className="text-slate-400 hover:text-red-400 ml-1"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Toggle Panel for Adding More Roles */}
                {editForm.showAddRoles && (
                  <div className="p-4 bg-slate-900/90 border border-indigo-500/30 rounded-xl space-y-3">
                    <div className="text-xs font-bold text-white flex items-center justify-between">
                      <span>Select additional custom roles to assign:</span>
                      <span className="text-[10px] text-slate-400">Toggle ON / OFF</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {SYSTEM_ROLES.map((r) => {
                        const isActive = editForm.roles.includes(r.key);
                        return (
                          <div
                            key={r.key}
                            onClick={() => {
                              if (isActive) {
                                if (editForm.roles.length > 1 && r.key !== editForm.role) {
                                  setEditForm({ ...editForm, roles: editForm.roles.filter(x => x !== r.key) });
                                }
                              } else {
                                setEditForm({ ...editForm, roles: [...editForm.roles, r.key] });
                              }
                            }}
                            className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                              isActive
                                ? 'bg-indigo-600/20 border-indigo-500/50 text-white'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Shield className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                              <span className="text-xs font-medium">{r.label}</span>
                            </div>
                            <div className={`w-8 h-4.5 rounded-full transition-colors relative flex items-center px-0.5 ${isActive ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                              <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${isActive ? 'translate-x-3.5' : 'translate-x-0'}`} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Enabling multiple roles unlocks all tabs and permissions associated with each assigned role in the left navigation panel.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="px-4 py-2 border border-slate-800 text-xs font-medium text-slate-300 rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
