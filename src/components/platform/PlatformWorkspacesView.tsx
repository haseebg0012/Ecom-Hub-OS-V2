import React, { useEffect, useState } from 'react';
import { Building2, Search, Plus, ExternalLink, ShieldAlert, CheckCircle2, RefreshCw, Trash2, Globe, Copy, Check, Mail } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { apiFetch, getSupabaseClient } from '../../lib/supabase';
import { CreateWorkspaceWizardModal } from './CreateWorkspaceWizardModal';

export const PlatformWorkspacesView: React.FC = () => {
  const { user, startSupportWorkspaceView, deleteBusiness, refreshData } = useAuth();
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingWorkspace, setDeletingWorkspace] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchWorkspaces = async () => {
    setIsLoading(true);
    try {
      let list: any[] = [];
      const res = await apiFetch('/api/platform/workspaces');
      if (res.ok) {
        const data = await res.json();
        list = data.workspaces || [];
        // Keep local cache synced with authoritative server list
        try {
          localStorage.setItem('ecomhub_workspaces', JSON.stringify(list));
        } catch {}
      } else {
        const client = getSupabaseClient();
        if (client) {
          const { data: bList } = await client.from('businesses').select('*').order('created_at', { ascending: false });
          if (bList) {
            list = bList.map((b: any) => ({
              id: b.id,
              name: b.name,
              default_currency: b.currency || b.default_currency || 'PKR',
              email: b.email || '',
              status: 'Active',
              created_at: b.created_at,
            }));
          }
        }
      }
      setWorkspaces(list);
    } catch (err) {
      console.warn('Notice fetching workspaces, checking fallback:', err);
      try {
        const client = getSupabaseClient();
        if (client) {
          const { data: bList } = await client.from('businesses').select('*').order('created_at', { ascending: false });
          if (bList && bList.length > 0) {
            const mapped = bList.map((b: any) => ({
              id: b.id,
              name: b.name,
              default_currency: b.currency || b.default_currency || 'PKR',
              email: b.email || '',
              status: 'Active',
              created_at: b.created_at,
            }));
            setWorkspaces(mapped);
            return;
          }
        }
      } catch {}

      try {
        const localWs = JSON.parse(localStorage.getItem('ecomhub_workspaces') || '[]');
        if (Array.isArray(localWs)) setWorkspaces(localWs);
      } catch {}
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, [user]);

  const handleToggleStatus = async (workspaceId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    try {
      const res = await apiFetch(`/api/platform/workspaces/${workspaceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setActionMessage(`Workspace status updated to ${newStatus}`);
        fetchWorkspaces();
        setTimeout(() => setActionMessage(''), 3000);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update workspace status');
    }
  };

  const handleOpenSupportMode = async (businessId: string) => {
    await startSupportWorkspaceView(businessId);
    window.location.href = '/dashboard';
  };

  const handleCopyInviteLink = async (ws: any) => {
    const ownerEmail = ws.owner_email || ws.email || '';
    let link = `${window.location.origin}/accept-invitation?email=${encodeURIComponent(ownerEmail)}&workspace=${ws.id}&role=Owner`;
    try {
      const res = await apiFetch(`/api/platform/workspaces/${ws.id}/invite-link`);
      if (res.ok) {
        const data = await res.json();
        if (data.inviteUrl) link = data.inviteUrl;
      }
    } catch {}

    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(ws.id);
      setActionMessage(`Direct invitation link copied for ${ws.name} (${ownerEmail})!`);
      setTimeout(() => {
        setCopiedId(null);
        setActionMessage('');
      }, 4000);
    } catch {
      alert(`Invitation Link: ${link}`);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingWorkspace) return;
    const targetId = deletingWorkspace.id;
    const targetName = deletingWorkspace.name;
    setIsDeleting(true);

    try {
      // 1. Immediately remove from local UI state for instant responsiveness
      setWorkspaces((prev) => prev.filter((w) => w.id !== targetId));

      // 2. Call server platform delete endpoint
      const res = await apiFetch(`/api/platform/workspaces/${targetId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to delete workspace.');
      }

      // 3. Delete from AuthContext and localStorage
      if (deleteBusiness) {
        await deleteBusiness(targetId);
      }

      // Clear all local caches
      try {
        const localWs = JSON.parse(localStorage.getItem('ecomhub_workspaces') || '[]');
        if (Array.isArray(localWs)) {
          const filtered = localWs.filter((w: any) => w.id !== targetId);
          localStorage.setItem('ecomhub_workspaces', JSON.stringify(filtered));
        }
        const rawBiz = localStorage.getItem('ecomhub_businesses');
        if (rawBiz) {
          const parsed = JSON.parse(rawBiz);
          if (Array.isArray(parsed)) {
            localStorage.setItem('ecomhub_businesses', JSON.stringify(parsed.filter((b: any) => b.id !== targetId)));
          }
        }
        if (localStorage.getItem('ecomhub_active_business_id') === targetId) {
          localStorage.removeItem('ecomhub_active_business_id');
        }
      } catch {}

      setActionMessage(`Workspace "${targetName}" deleted successfully.`);
      setDeletingWorkspace(null);
      if (refreshData) await refreshData();
      await fetchWorkspaces();
      setTimeout(() => setActionMessage(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Error occurred while deleting workspace.');
      // Re-fetch to restore accurate state if failed
      await fetchWorkspaces();
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredWorkspaces = workspaces.filter(
    (w) =>
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.email && w.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F172A]">Workspace Governance & Tenant Isolation</h1>
          <p className="text-xs text-[#64748B]">Manage customer tenants, audit access, and inspect isolated databases.</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-medium text-sm rounded-xl shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Provision New Workspace</span>
        </button>
      </div>

      {actionMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Search Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search workspaces by name, ID, or owner email..."
            className="block w-full pl-9 pr-3 py-2 border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#4F46E5]"
          />
        </div>
        <button
          onClick={fetchWorkspaces}
          className="p-2 border border-[#E2E8F0] rounded-lg text-[#64748B] hover:bg-[#F8FAFC]"
          title="Refresh list"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Workspaces Table */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                <th className="py-3 px-5">Workspace Name & ID</th>
                <th className="py-3 px-5">Primary Owner</th>
                <th className="py-3 px-5">Currency</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5">Created</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs text-[#0F172A]">
              {filteredWorkspaces.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#64748B]">
                    No customer workspaces have been provisioned yet.
                  </td>
                </tr>
              ) : (
                filteredWorkspaces.map((ws: any) => (
                <tr key={ws.id} className="hover:bg-[#F8FAFC]/50 transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[#4F46E5]/10 text-[#4F46E5] flex items-center justify-center font-bold text-xs shrink-0">
                        {ws.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-[#0F172A]">{ws.name}</div>
                        <div className="font-mono text-[10px] text-[#64748B]">{ws.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-5">
                    <div className="font-medium">{ws.owner_name || 'Haseeb G.'}</div>
                    <div className="text-[11px] text-[#64748B]">{ws.email || ws.owner_email || 'contact@ecometrixhub.com'}</div>
                  </td>
                  <td className="py-3.5 px-5 font-medium">{ws.default_currency || 'PKR'}</td>
                  <td className="py-3.5 px-5">
                    {(ws.status || 'Active') === 'Active' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span>Suspended</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-5 text-[#64748B] text-xs">{new Date(ws.created_at || Date.now()).toLocaleDateString()}</td>
                  <td className="py-3.5 px-5 text-right space-x-2">
                    <button
                      onClick={() => handleCopyInviteLink(ws)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 font-medium rounded-lg text-xs transition-colors border shadow-xs ${
                        copiedId === ws.id
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-bold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                      title="Copy onboarding & invitation link for owner"
                    >
                      {copiedId === ws.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#4F46E5]" />}
                      <span>{copiedId === ws.id ? 'Copied Link!' : 'Invite Link'}</span>
                    </button>
                    <button
                      onClick={() => handleOpenSupportMode(ws.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#4F46E5]/10 text-[#4F46E5] hover:bg-[#4F46E5]/20 font-medium rounded-lg text-xs transition-colors"
                      title="Open tenant workspace in support mode"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Support Mode</span>
                    </button>
                    {(ws.status || 'Active') === 'Active' ? (
                      <button
                        onClick={() => handleToggleStatus(ws.id, 'Active')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-500 hover:text-amber-700 hover:bg-amber-50 font-medium rounded-lg text-xs transition-colors border border-slate-200 hover:border-amber-300"
                        title="Click to temporarily pause or suspend this workspace"
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
                        <span>Pause</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleToggleStatus(ws.id, 'Suspended')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold rounded-lg text-xs transition-colors border border-emerald-200"
                        title="Click to reactivate this workspace"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Activate</span>
                      </button>
                    )}
                    <button
                      onClick={() => setDeletingWorkspace(ws)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-medium rounded-lg text-xs transition-colors border border-rose-200 hover:border-rose-300 shadow-2xs"
                      title="Permanently delete this workspace"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      <span>Delete</span>
                    </button>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Workspace Confirmation Modal */}
      {deletingWorkspace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Workspace?</h3>
                <p className="text-xs text-slate-500">This action is permanent and cannot be undone.</p>
              </div>
            </div>

            <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3.5 space-y-2 text-xs text-rose-800">
              <p className="font-semibold text-rose-900">
                Are you sure you want to permanently delete:
              </p>
              <div className="font-bold text-sm text-slate-900 bg-white p-2.5 rounded-lg border border-rose-200">
                {deletingWorkspace.name}
              </div>
              <p className="text-[11px] text-rose-700 leading-relaxed">
                All isolated tenant data, business members, invoices, leads, and clients associated with this workspace will be deleted from the database.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingWorkspace(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-60"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete Workspace</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <CreateWorkspaceWizardModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={fetchWorkspaces}
      />
    </div>
  );
};
