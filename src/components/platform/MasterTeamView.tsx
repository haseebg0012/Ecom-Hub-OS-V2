import React, { useState } from 'react';
import { Users, Shield, Plus, Mail, Check, X, Lock, Key, Trash2, Edit } from 'lucide-react';

interface MasterMember {
  id: string;
  name: string;
  email: string;
  role: 'Platform Owner' | 'Platform Admin' | 'Platform Support' | 'Platform Viewer';
  status: 'Active' | 'Suspended';
  permissions: string[];
  joinedAt: string;
}

const AVAILABLE_PERMISSIONS = [
  { id: 'workspaces.view', label: 'View Workspaces', category: 'Workspaces' },
  { id: 'workspaces.create', label: 'Create Workspaces', category: 'Workspaces' },
  { id: 'workspaces.edit', label: 'Edit Workspaces', category: 'Workspaces' },
  { id: 'workspaces.suspend', label: 'Suspend / Archive Workspaces', category: 'Workspaces' },
  { id: 'master_team.view', label: 'View Master Team', category: 'Master Team' },
  { id: 'master_team.invite', label: 'Invite Master Members', category: 'Master Team' },
  { id: 'platform_activity.view', label: 'View Security Audit Logs', category: 'Security' },
  { id: 'platform_settings.edit', label: 'Edit Platform Settings', category: 'Settings' },
];

export const MasterTeamView: React.FC = () => {
  const [teamMembers, setTeamMembers] = useState<MasterMember[]>([
    {
      id: 'm-1',
      name: 'Haseeb G.',
      email: 'haseebg0012@gmail.com',
      role: 'Platform Owner',
      status: 'Active',
      permissions: AVAILABLE_PERMISSIONS.map((p) => p.id),
      joinedAt: '2025-01-15',
    },
    {
      id: 'm-2',
      name: 'Support Lead',
      email: 'support@ecomhub.io',
      role: 'Platform Support',
      status: 'Active',
      permissions: ['workspaces.view', 'platform_activity.view'],
      joinedAt: '2025-03-01',
    },
  ]);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<MasterMember['role']>('Platform Admin');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([
    'workspaces.view',
    'workspaces.create',
    'master_team.view',
  ]);

  const handleInviteMaster = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteName.trim()) return;

    const newMember: MasterMember = {
      id: `m-${Date.now()}`,
      name: inviteName.trim(),
      email: inviteEmail.trim(),
      role: inviteRole,
      status: 'Active',
      permissions: selectedPermissions,
      joinedAt: new Date().toISOString().split('T')[0],
    };

    setTeamMembers([newMember, ...teamMembers]);
    setShowInviteModal(false);
    setInviteEmail('');
    setInviteName('');
  };

  const togglePermission = (permId: string) => {
    if (selectedPermissions.includes(permId)) {
      setSelectedPermissions(selectedPermissions.filter((id) => id !== permId));
    } else {
      setSelectedPermissions([...selectedPermissions, permId]);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F172A]">Master Team & Roles</h1>
          <p className="text-xs text-[#64748B]">Manage platform administrators, support personnel, and granular permissions.</p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-2 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Invite Master Admin</span>
        </button>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-6">Member Name & Email</th>
                <th className="py-3.5 px-6">Platform Role</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Permissions</th>
                <th className="py-3.5 px-6">Joined</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs text-[#0F172A]">
              {teamMembers.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-4 px-6">
                    <div className="font-semibold text-[#0F172A]">{member.name}</div>
                    <div className="text-slate-500 text-[11px]">{member.email}</div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[10px] uppercase border border-indigo-100">
                      {member.role}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold text-[10px] ${
                      member.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${member.status === 'Active' ? 'bg-emerald-600' : 'bg-amber-600'}`} />
                      {member.status}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-slate-600 font-medium">
                      {member.permissions.length} granular permissions
                    </span>
                  </td>
                  <td className="py-4 px-6 text-slate-500">{member.joinedAt}</td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800">
                        <Edit className="w-4 h-4" />
                      </button>
                      {member.role !== 'Platform Owner' && (
                        <button
                          onClick={() => setTeamMembers(teamMembers.filter((m) => m.id !== member.id))}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600"
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
      </div>

      {/* Invite Master Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-[#0F172A]">Invite New Master Administrator</h3>
              <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInviteMaster} className="py-4 space-y-4 overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Sarah Connor"
                  className="w-full px-3.5 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="sarah@ecomhub.io"
                  className="w-full px-3.5 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Platform Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full px-3.5 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-indigo-600"
                >
                  <option value="Platform Admin">Platform Admin</option>
                  <option value="Platform Support">Platform Support</option>
                  <option value="Platform Viewer">Platform Viewer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">Granular Platform Permissions</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {AVAILABLE_PERMISSIONS.map((perm) => (
                    <label
                      key={perm.id}
                      onClick={() => togglePermission(perm.id)}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                        selectedPermissions.includes(perm.id)
                          ? 'bg-indigo-50/60 border-indigo-200 text-indigo-900 font-medium'
                          : 'bg-[#F8FAFC] border-[#E2E8F0] text-slate-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(perm.id)}
                        onChange={() => {}}
                        className="rounded accent-indigo-600"
                      />
                      <span className="text-[11px]">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm"
                >
                  Send Secure Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
