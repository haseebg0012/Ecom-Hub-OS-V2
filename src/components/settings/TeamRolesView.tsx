import React, { useState } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Trash2,
  Check,
  X,
  Loader2,
  Mail,
  User,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { BusinessRole } from '../../types';

const ROLES_LIST: { role: BusinessRole; description: string; badgeColor: string }[] = [
  {
    role: 'Owner',
    description: 'Full organizational authority, billing, deletion, and membership management.',
    badgeColor: 'bg-[#EEF2FF] text-[#4F46E5] border-[#C7D2FE]',
  },
  {
    role: 'Admin',
    description: 'Manage users, projects, leads, clients, and operational settings.',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  {
    role: 'Manager',
    description: 'Lead operational teams, assign projects, tasks, and supervise delivery.',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    role: 'Finance',
    description: 'Access to financial ledger, invoices, expenses, payments, and audits.',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    role: 'Sales',
    description: 'Manage prospect leads, client pipelines, and outbound opportunities.',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    role: 'Employee',
    description: 'Standard operational team member working on assigned tasks and documents.',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  {
    role: 'Viewer',
    description: 'Read-only visibility for external advisors, stakeholders, or auditors.',
    badgeColor: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  },
];

export const TeamRolesView: React.FC = () => {
  const { user, activeBusiness, members, inviteMember, updateMemberRole, removeMember } = useAuth();

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<BusinessRole>('Employee');
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);
  const [statusNotice, setStatusNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const canManageTeam = activeBusiness?.role === 'Owner' || activeBusiness?.role === 'Admin';
  const isOwner = activeBusiness?.role === 'Owner';

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteName.trim()) return;

    setIsSubmittingInvite(true);
    setStatusNotice(null);

    const res = await inviteMember(inviteEmail.trim(), inviteName.trim(), inviteRole);
    setIsSubmittingInvite(false);

    if (res.success) {
      setInviteEmail('');
      setInviteName('');
      setInviteRole('Employee');
      setIsInviteModalOpen(false);
      setStatusNotice({ type: 'success', text: `Successfully invited ${inviteName} as ${inviteRole}.` });
      setTimeout(() => setStatusNotice(null), 3500);
    } else {
      setStatusNotice({ type: 'error', text: res.error || 'Failed to invite team member.' });
    }
  };

  const handleRoleChange = async (memberId: string, newRole: BusinessRole) => {
    if (!canManageTeam) return;
    const res = await updateMemberRole(memberId, newRole);
    if (res.success) {
      setStatusNotice({ type: 'success', text: 'Member role updated.' });
      setTimeout(() => setStatusNotice(null), 2500);
    } else {
      setStatusNotice({ type: 'error', text: res.error || 'Failed to update role.' });
    }
  };

  const handleRemove = async (memberId: string, memberName: string) => {
    if (!canManageTeam) return;
    if (window.confirm(`Are you sure you want to remove ${memberName} from this business?`)) {
      const res = await removeMember(memberId);
      if (res.success) {
        setStatusNotice({ type: 'success', text: `${memberName} was removed from this business.` });
        setTimeout(() => setStatusNotice(null), 2500);
      } else {
        setStatusNotice({ type: 'error', text: res.error || 'Failed to remove member.' });
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">
              Team & Roles
            </h1>
            <p className="text-xs text-[#64748B]">
              Manage members and role permissions for <strong className="text-[#0F172A]">{activeBusiness?.name}</strong>.
            </p>
          </div>
        </div>

        {canManageTeam && (
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-lg shadow-xs transition-colors self-start sm:self-auto"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Invite Team Member</span>
          </button>
        )}
      </div>

      {statusNotice && (
        <div
          className={`p-3.5 rounded-lg text-xs flex items-center gap-2 ${
            statusNotice.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {statusNotice.type === 'success' && <Check className="w-4 h-4 text-green-600" />}
          <span>{statusNotice.text}</span>
        </div>
      )}

      {/* Members Table */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <h2 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
            Active Members ({members.length})
          </h2>
          <span className="text-xs text-[#64748B]">
            Tenant: {activeBusiness?.name}
          </span>
        </div>

        <div className="divide-y divide-[#E2E8F0]">
          {members.map((member) => {
            const isCurrentUser = member.user_id === user?.id;
            const memberRoleConfig = ROLES_LIST.find((r) => r.role === member.role);

            return (
              <div
                key={member.id}
                className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F8FAFC] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center font-medium text-sm shrink-0 border border-[#E2E8F0]">
                    {member.profile?.full_name ? member.profile.full_name.charAt(0).toUpperCase() : 'M'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[#0F172A] truncate">
                        {member.profile?.full_name || 'Team Member'}
                      </p>
                      {isCurrentUser && (
                        <span className="px-1.5 py-0.2 text-[10px] font-medium bg-[#F1F5F9] text-[#64748B] rounded border border-[#E2E8F0]">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#64748B] truncate">
                      {member.profile?.email || 'member@business.com'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  {/* Role Dropdown / Badge */}
                  {canManageTeam && !isCurrentUser ? (
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.id, e.target.value as BusinessRole)}
                      className="px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                    >
                      {ROLES_LIST.map((r) => (
                        <option key={r.role} value={r.role}>
                          {r.role}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${
                        memberRoleConfig?.badgeColor || 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {member.role}
                    </span>
                  )}

                  {/* Remove Button (Only Owner can remove others, or Admins if non-owner) */}
                  {canManageTeam && !isCurrentUser && (
                    <button
                      onClick={() => handleRemove(member.id, member.profile?.full_name || 'Member')}
                      title="Remove member from business"
                      className="p-1.5 text-[#94A3B8] hover:text-[#DC2626] hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Role Hierarchy Reference Card */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-5 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8F0]">
          <Info className="w-4 h-4 text-[#4F46E5]" />
          <h3 className="text-xs font-semibold text-[#0F172A] uppercase tracking-wider">
            EcomHub OS Role Hierarchy & Permissions
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {ROLES_LIST.map((r) => (
            <div key={r.role} className="p-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-[#0F172A]">{r.role}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${r.badgeColor}`}>
                  {r.role}
                </span>
              </div>
              <p className="text-[11px] text-[#64748B] leading-relaxed">
                {r.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#0F172A]">Invite Member</h2>
                  <p className="text-xs text-[#64748B]">Add member to {activeBusiness?.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#0F172A] p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInvite} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Full Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#4F46E5]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Email Address *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="alex@company.com"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#4F46E5]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Assigned Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as BusinessRole)}
                  className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                >
                  {ROLES_LIST.map((r) => (
                    <option key={r.role} value={r.role}>
                      {r.role} — {r.description.slice(0, 45)}...
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingInvite}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-lg shadow-xs transition-colors disabled:opacity-50"
                >
                  {isSubmittingInvite ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Inviting...</span>
                    </>
                  ) : (
                    <span>Add Member</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
