import React, { useState, useEffect } from 'react';
import { FolderKanban, Plus, DollarSign, Calendar, CheckCircle2, AlertCircle, Building2, Search, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';

interface Project {
  id: string;
  business_id: string;
  name: string;
  client_name: string;
  status: 'Active' | 'On Hold' | 'Completed' | 'Planning';
  budget: number;
  currency: string;
  deadline: string;
  description: string;
}

export const ProjectsView: React.FC = () => {
  const { activeBusiness } = useAuth();
  const businessId = activeBusiness?.id || 'biz-default';

  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem(`ecomhub_projects_${businessId}`);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [
      {
        id: 'proj-001',
        business_id: businessId,
        name: 'Q1 Omnichannel Growth Strategy',
        client_name: 'North Star Apparel Ltd.',
        status: 'Active',
        budget: 1500000,
        currency: 'PKR',
        deadline: '2026-03-31',
        description: 'Complete multi-marketplace inventory sync and WhatsApp CRM automation.',
      },
      {
        id: 'proj-002',
        business_id: businessId,
        name: 'Headless Shopify Plus Replatform',
        client_name: 'Velocity D2C Brands',
        status: 'Planning',
        budget: 8500,
        currency: 'USD',
        deadline: '2026-05-15',
        description: 'High-performance React storefront with instant server-side page loads.',
      },
    ];
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [status, setStatus] = useState<'Active' | 'On Hold' | 'Completed' | 'Planning'>('Active');
  const [budget, setBudget] = useState('100000');
  const [currency, setCurrency] = useState('PKR');
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');

  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [editStatus, setEditStatus] = useState<'Active' | 'On Hold' | 'Completed' | 'Planning'>('Active');
  const [editBudget, setEditBudget] = useState('0');
  const [editCurrency, setEditCurrency] = useState('PKR');
  const [editDeadline, setEditDeadline] = useState('');
  const [editDescription, setEditDescription] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(`ecomhub_projects_${businessId}`, JSON.stringify(projects));
    } catch {
      // ignore
    }
  }, [projects, businessId]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newProj: Project = {
      id: `proj-${Date.now()}`,
      business_id: businessId,
      name: name.trim(),
      client_name: clientName.trim() || 'Direct Client',
      status,
      budget: Number(budget) || 0,
      currency,
      deadline: deadline || new Date().toISOString().split('T')[0],
      description: description.trim(),
    };

    setProjects([newProj, ...projects]);
    setName('');
    setClientName('');
    setDescription('');
    setDeadline('');
    setIsModalOpen(false);
  };

  const handleOpenEdit = (proj: Project) => {
    setEditingId(proj.id);
    setEditName(proj.name);
    setEditClientName(proj.client_name);
    setEditStatus(proj.status);
    setEditBudget(String(proj.budget));
    setEditCurrency(proj.currency);
    setEditDeadline(proj.deadline);
    setEditDescription(proj.description);
    setIsEditModalOpen(true);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editName.trim()) return;

    setProjects(
      projects.map((p) =>
        p.id === editingId
          ? {
              ...p,
              name: editName.trim(),
              client_name: editClientName.trim() || 'Direct Client',
              status: editStatus,
              budget: Number(editBudget) || 0,
              currency: editCurrency,
              deadline: editDeadline || p.deadline,
              description: editDescription.trim(),
            }
          : p
      )
    );
    setIsEditModalOpen(false);
    setEditingId(null);
  };

  const handleDelete = (id: string, projectName: string) => {
    if (!window.confirm(`Are you sure you want to delete project "${projectName}"?`)) return;
    setProjects(projects.filter((p) => p.id !== id));
  };

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.client_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F172A] flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-[#4F46E5]" />
            <span>Projects & Deliverables</span>
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Manage client milestones, budgets, and operational workflows for {activeBusiness?.name || 'your business'}.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#4F46E5] text-white text-xs font-semibold rounded-lg hover:bg-[#4338CA] transition-colors shadow-xs self-start"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* Search & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#64748B]">Total Projects</p>
            <p className="text-xl font-bold text-[#0F172A] mt-1">{projects.length}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-[#4F46E5] flex items-center justify-center">
            <FolderKanban className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#64748B]">Active Workspaces</p>
            <p className="text-xl font-bold text-green-600 mt-1">
              {projects.filter((p) => p.status === 'Active').length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#64748B]">Planning / On Hold</p>
            <p className="text-xl font-bold text-amber-600 mt-1">
              {projects.filter((p) => p.status !== 'Active' && p.status !== 'Completed').length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs flex items-center gap-3">
        <Search className="w-4 h-4 text-[#94A3B8]" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search projects by name or client..."
          className="w-full text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none"
        />
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((proj) => (
          <div
            key={proj.id}
            className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col justify-between space-y-4 hover:border-[#4F46E5] transition-colors relative group"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-bold text-[#0F172A]">{proj.name}</h3>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                      proj.status === 'Active'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : proj.status === 'Completed'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {proj.status}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(proj)}
                      title="Edit Project"
                      className="p-1 rounded-md text-slate-400 hover:text-[#4F46E5] hover:bg-indigo-50 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(proj.id, proj.name)}
                      title="Delete Project"
                      className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-xs text-[#64748B] flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#94A3B8]" />
                <span>{proj.client_name}</span>
              </p>
              <p className="text-xs text-[#475569] line-clamp-2">{proj.description}</p>
            </div>

            <div className="pt-4 border-t border-[#F1F5F9] flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 text-[#64748B]">
                <DollarSign className="w-3.5 h-3.5 text-[#94A3B8]" />
                <span className="font-semibold text-[#0F172A]">
                  {proj.currency} {proj.budget.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[#64748B]">
                <Calendar className="w-3.5 h-3.5 text-[#94A3B8]" />
                <span>{proj.deadline}</span>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-xl border border-[#E2E8F0]">
            <FolderKanban className="w-10 h-10 text-[#94A3B8] mx-auto mb-2" />
            <p className="text-sm font-medium text-[#0F172A]">No projects found</p>
            <p className="text-xs text-[#64748B] mt-1">Get started by creating a new project workspace.</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h2 className="text-base font-bold text-[#0F172A]">Create New Project</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Q2 Global Expansion"
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">Client Name</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Apex Apparel Co."
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  >
                    <option value="Active">Active</option>
                    <option value="Planning">Planning</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Deadline</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Budget</label>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  >
                    <option value="PKR">PKR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Project scope and deliverables..."
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-[#E2E8F0] text-xs font-medium text-[#64748B] rounded-lg hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#4F46E5] text-white text-xs font-medium rounded-lg hover:bg-[#4338CA]"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h2 className="text-base font-bold text-[#0F172A]">Edit Project</h2>
            <form onSubmit={handleUpdate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">Client Name</label>
                <input
                  type="text"
                  value={editClientName}
                  onChange={(e) => setEditClientName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e: any) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  >
                    <option value="Active">Active</option>
                    <option value="Planning">Planning</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Deadline</label>
                  <input
                    type="date"
                    value={editDeadline}
                    onChange={(e) => setEditDeadline(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Budget</label>
                  <input
                    type="number"
                    value={editBudget}
                    onChange={(e) => setEditBudget(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Currency</label>
                  <select
                    value={editCurrency}
                    onChange={(e) => setEditCurrency(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  >
                    <option value="PKR">PKR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-[#E2E8F0] text-xs font-medium text-[#64748B] rounded-lg hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#4F46E5] text-white text-xs font-medium rounded-lg hover:bg-[#4338CA]"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
