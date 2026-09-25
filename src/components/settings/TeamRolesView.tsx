import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Trash2,
  Check,
  X,
  Shield,
  User,
  Save,
  Lock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { BusinessRole, BusinessMember } from '../../types';

interface RoleConfigItem {
  key: string;
  label: string;
  role: BusinessRole;
}

const SYSTEM_ROLES: RoleConfigItem[] = [
  { key: 'Owner', label: 'Owner / Master', role: 'Owner' },
  { key: 'Admin', label: 'Business Admin', role: 'Admin' },
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

const ACTIONS = ['view', 'create', 'edit', 'delete', 'export'] as const;

export const TeamRolesView: React.FC = () => {
  const { user, activeBusiness, members, inviteMember, updateMemberRole, removeMember } = useAuth();
  
  const [selectedRoleKey, setSelectedRoleKey] = useState<string>('Sales');
  const [rolePermissions, setRolePermissions] = useState<Record<string, Record<string, boolean>>>({
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

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ecomhub_role_matrix');
      if (saved) {
        setRolePermissions(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  const handleTogglePermission = (modId: string, action: string) => {
    const key = `${modId}.${action}`;
    setRolePermissions((prev) => {
      const currentRolePerms = prev[selectedRoleKey] || {};
      const updated = {
        ...prev,
        [selectedRoleKey]: {
          ...currentRolePerms,
          [key]: !currentRolePerms[key],
        },
      };
      return updated;
    });
  };

  const handleSaveMatrix = () => {
    try {
      localStorage.setItem('ecomhub_role_matrix', JSON.stringify(rolePermissions));
      setStatusMessage(`Permissions matrix saved successfully for ${selectedRoleKey}!`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (e: any) {
      setStatusMessage('Error saving matrix.');
    }
  };

  const currentRoleObj = SYSTEM_ROLES.find((r) => r.key === selectedRoleKey) || SYSTEM_ROLES[2];
  const assignedMembers = members.filter((m) => m.role === currentRoleObj.role);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#2D3748]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Roles & Access Management
            </h1>
            <p className="text-xs text-slate-400">
              Customize module permissions and assign operational rules for <strong className="text-white">{activeBusiness?.name}</strong>.
            </p>
          </div>
        </div>

        {statusMessage && (
          <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Vertical Role Selector */}
        <div className="lg:col-span-4 bg-[#141B2D] border border-slate-800 rounded-xl p-4 space-y-2 shadow-sm">
          <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
            Select System Role
          </div>
          <div className="space-y-1">
            {SYSTEM_ROLES.map((r) => {
              const isSelected = selectedRoleKey === r.key;
              const count = members.filter((m) => m.role === r.role).length;
              return (
                <button
                  key={r.key}
                  onClick={() => setSelectedRoleKey(r.key)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Shield className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                    <span>{r.label}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Permissions Matrix & Assigned Members */}
        <div className="lg:col-span-8 space-y-6">
          {/* Permissions Matrix Box */}
          <div className="bg-[#141B2D] border border-slate-800 rounded-xl p-6 space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white">
                  Permissions for '{currentRoleObj.label}'
                </h2>
                <p className="text-xs text-slate-400">
                  Customize operational access rules and feature buttons for this role.
                </p>
              </div>
              <button
                onClick={handleSaveMatrix}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors self-start sm:self-auto"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Matrix</span>
              </button>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold tracking-wider uppercase">
                    <th className="py-3 px-4">Module</th>
                    <th className="py-3 px-3 text-center">View</th>
                    <th className="py-3 px-3 text-center">Create</th>
                    <th className="py-3 px-3 text-center">Edit</th>
                    <th className="py-3 px-3 text-center">Delete</th>
                    <th className="py-3 px-3 text-center">Export</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {MODULE_LIST.map((mod) => {
                    const currentPerms = rolePermissions[selectedRoleKey] || {};
                    return (
                      <tr key={mod.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-slate-200">
                          {mod.label}
                        </td>
                        {ACTIONS.map((action) => {
                          const permKey = `${mod.id}.${action}`;
                          const isActive = !!currentPerms[permKey];
                          return (
                            <td key={action} className="py-3.5 px-3 text-center">
                              <label className="relative inline-flex items-center cursor-pointer justify-center">
                                <input
                                  type="checkbox"
                                  checked={isActive}
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

          {/* Assigned Team Members Box */}
          <div className="bg-[#141B2D] border border-slate-800 rounded-xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">
                Assigned Team Members ({assignedMembers.length})
              </h3>
              <span className="text-xs text-slate-400">
                Active in {currentRoleObj.label}
              </span>
            </div>

            {assignedMembers.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                No team members currently assigned to this role. Add members via Employees panel.
              </div>
            ) : (
              <div className="space-y-3">
                {assignedMembers.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center text-sm border border-indigo-500/30">
                        {m.profile?.full_name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">
                          {m.profile?.full_name || 'Team Member'}
                        </h4>
                        <p className="text-xs text-slate-400">{m.profile?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold rounded-md uppercase tracking-wider">
                        Active
                      </span>
                      {activeBusiness?.role === 'Owner' && m.user_id !== user?.id && (
                        <button
                          onClick={() => removeMember(m.id)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Remove member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
