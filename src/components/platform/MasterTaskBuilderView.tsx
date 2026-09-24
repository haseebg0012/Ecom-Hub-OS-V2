import React, { useEffect, useState } from 'react';
import { Layers, Search, Plus, Filter, Loader2, Pencil, Trash2 } from 'lucide-react';
import { apiFetch } from '../../lib/supabase';

export const MasterTaskBuilderView: React.FC = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [businessRoles, setBusinessRoles] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [isLoading, setIsLoading] = useState(true);

  // Modal for creating task template
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [department, setDepartment] = useState('Sales');
  const [roleTemplateId, setRoleTemplateId] = useState('');
  const [roleName, setRoleName] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [requiredModule, setRequiredModule] = useState('Leads');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Modal for editing task template
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTaskName, setEditTaskName] = useState('');
  const [editDepartment, setEditDepartment] = useState('Sales');
  const [editRoleTemplateId, setEditRoleTemplateId] = useState('');
  const [editRoleName, setEditRoleName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editInstructions, setEditInstructions] = useState('');
  const [editRequiredModule, setEditRequiredModule] = useState('');
  const [editStatus, setEditStatus] = useState('Active');
  const [isEditing, setIsEditing] = useState(false);
  const [editErrorMessage, setEditErrorMessage] = useState('');

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch('/api/platform/tasks');
      if (res.ok) {
        let data: any = {};
        try {
          data = await res.json();
        } catch {
          data = {};
        }
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.error('Error fetching task templates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBusinessRoles = async () => {
    const defaultRoles = [
      { id: 'role-1', name: 'Graphic Designer', department: 'Design' },
      { id: 'role-2', name: 'Accountant', department: 'Finance' },
      { id: 'role-3', name: 'Business Admin', department: 'Operations' },
      { id: 'role-4', name: 'Cold Caller', department: 'Sales' },
      { id: 'role-5', name: 'Lead Generator', department: 'Marketing' },
      { id: 'role-6', name: 'Sales Representative', department: 'Sales' },
    ];
    try {
      const res = await apiFetch('/api/platform/roles');
      if (res.ok) {
        let data: any = {};
        try {
          data = await res.json();
        } catch {
          data = {};
        }
        const rolesList = data.roles && data.roles.length > 0 ? data.roles : defaultRoles;
        setBusinessRoles(rolesList);
        if (rolesList.length > 0 && !roleTemplateId) {
          setRoleTemplateId(rolesList[0].id);
          setRoleName(rolesList[0].name);
        }
      } else {
        setBusinessRoles(defaultRoles);
        if (!roleTemplateId) {
          setRoleTemplateId(defaultRoles[0].id);
          setRoleName(defaultRoles[0].name);
        }
      }
    } catch (err) {
      console.error('Error fetching business roles:', err);
      setBusinessRoles(defaultRoles);
      if (!roleTemplateId) {
        setRoleTemplateId(defaultRoles[0].id);
        setRoleName(defaultRoles[0].name);
      }
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchBusinessRoles();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim() || !department.trim()) return;

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const selectedRole = businessRoles.find((r) => r.id === roleTemplateId);
      const res = await apiFetch('/api/platform/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: taskName.trim(),
          department,
          role_template_id: roleTemplateId || null,
          role_name: selectedRole ? selectedRole.name : roleName,
          description: description.trim(),
          instructions: instructions.trim(),
          required_module: requiredModule.trim(),
          status: 'Active',
        }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (res.ok || data.success) {
        setTaskName('');
        setDescription('');
        setInstructions('');
        setErrorMessage('');
        setIsCreateOpen(false);
        fetchTasks();
      } else {
        setErrorMessage(data.error || 'Failed to create task template.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Network error while creating task template.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (t: any) => {
    setEditingId(t.id);
    setEditTaskName(t.name || '');
    setEditDepartment(t.department || 'Sales');
    setEditRoleTemplateId(t.role_template_id || '');
    setEditRoleName(t.role_name || '');
    setEditDescription(t.description || '');
    setEditInstructions(t.instructions || '');
    setEditRequiredModule(t.required_module || '');
    setEditStatus(t.status || 'Active');
    setEditErrorMessage('');
    setIsEditOpen(true);
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editTaskName.trim() || !editDepartment.trim()) return;

    setIsEditing(true);
    setEditErrorMessage('');
    try {
      const selectedRole = businessRoles.find((r) => r.id === editRoleTemplateId);
      const res = await apiFetch(`/api/platform/tasks/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editTaskName.trim(),
          department: editDepartment,
          role_template_id: editRoleTemplateId || null,
          role_name: selectedRole ? selectedRole.name : editRoleName,
          description: editDescription.trim(),
          instructions: editInstructions.trim(),
          required_module: editRequiredModule.trim(),
          status: editStatus,
        }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (res.ok || data.success) {
        setIsEditOpen(false);
        setEditingId(null);
        fetchTasks();
      } else {
        setEditErrorMessage(data.error || 'Failed to update task template.');
      }
    } catch (err: any) {
      setEditErrorMessage(err?.message || 'Network error while updating task template.');
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteTask = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete task template "${name}"?`)) return;
    try {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      setIsEditOpen(false);
      setEditingId(null);
      await apiFetch(`/api/platform/tasks/${id}`, {
        method: 'DELETE',
      });
      fetchTasks();
    } catch (err: any) {
      console.error('Delete error:', err);
      fetchTasks();
    }
  };

  const departments = ['All', ...Array.from(new Set(tasks.map((t) => t.department)))];

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = selectedDept === 'All' || t.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#4F46E5]/30 text-[#818CF8] text-xs font-medium mb-3">
            <Layers className="w-3.5 h-3.5" />
            <span>Master Task Builder & Library</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Standardized Reusable Task Templates</h1>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl">
            Create, edit, and manage standardized operational task templates linked to departments and business roles across customer workspaces.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2.5 bg-[#4F46E5] text-white rounded-xl text-xs font-semibold hover:bg-[#4338CA] transition-colors inline-flex items-center gap-2 shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create Task Template</span>
        </button>
      </div>

      {/* Controls & Search */}
      <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search task templates..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#E2E8F0] text-xs focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-xs text-slate-500 font-medium shrink-0">Department:</span>
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-colors ${
                selectedDept === dept
                  ? 'bg-[#4F46E5] text-white'
                  : 'bg-[#F8FAFC] text-slate-600 hover:bg-slate-200 border border-[#E2E8F0]'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-[#4F46E5]" />
          <span className="text-xs font-medium">Loading task template library...</span>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 text-center text-slate-400">
          <Layers className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-xs">No task templates found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTasks.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4 relative group cursor-pointer"
              onClick={() => handleOpenEdit(t)}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {t.department}
                      </span>
                      {t.role_name && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {t.role_name}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-[#0F172A]">{t.name}</h3>
                  </div>
                  <div className="flex items-center gap-1 opacity-90 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(t);
                      }}
                      title="Edit Task Template"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2">{t.description || t.instructions || 'No description provided.'}</p>
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Module: {t.required_module || 'General'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {t.status || 'Active'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Task Template Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
              <h2 className="text-base font-bold text-[#0F172A]">Create Reusable Task Template</h2>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl font-medium">
                  {errorMessage}
                </div>
              )}
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Task Name *</label>
                <input
                  type="text"
                  required
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  placeholder="e.g. Research New Prospects"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Department *</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-white focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  >
                    <option value="Sales">Sales</option>
                    <option value="Operations">Operations</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Creative">Creative</option>
                    <option value="Development">Development</option>
                    <option value="Finance">Finance</option>
                    <option value="HR">HR</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Business Role *</label>
                  <select
                    value={roleTemplateId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setRoleTemplateId(id);
                      const found = businessRoles.find((r) => r.id === id);
                      if (found) setRoleName(found.name);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-white focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  >
                    {businessRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.department})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Description / Summary</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short description of work..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Step-by-Step Instructions</label>
                <textarea
                  rows={3}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Detailed instructions for the employee..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Required Module</label>
                <input
                  type="text"
                  value={requiredModule}
                  onChange={(e) => setRequiredModule(e.target.value)}
                  placeholder="e.g. Leads, CRM, Finance"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                />
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#4F46E5] text-white rounded-xl font-semibold hover:bg-[#4338CA] transition-colors inline-flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSubmitting ? 'Saving...' : 'Save Task Template'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Task Template Modal (with Delete inside) */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
              <h2 className="text-base font-bold text-[#0F172A]">Edit Task Template</h2>
              <button
                onClick={() => setIsEditOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateTask} className="space-y-4 text-xs">
              {editErrorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl font-medium">
                  {editErrorMessage}
                </div>
              )}
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Task Name *</label>
                <input
                  type="text"
                  required
                  value={editTaskName}
                  onChange={(e) => setEditTaskName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Department *</label>
                  <select
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-white focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  >
                    <option value="Sales">Sales</option>
                    <option value="Operations">Operations</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Creative">Creative</option>
                    <option value="Development">Development</option>
                    <option value="Finance">Finance</option>
                    <option value="HR">HR</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Business Role *</label>
                  <select
                    value={editRoleTemplateId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setEditRoleTemplateId(id);
                      const found = businessRoles.find((r) => r.id === id);
                      if (found) setEditRoleName(found.name);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-white focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  >
                    {businessRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.department})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-white focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  >
                    <option value="Active">Active</option>
                    <option value="Draft">Draft</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Required Module</label>
                  <input
                    type="text"
                    value={editRequiredModule}
                    onChange={(e) => setEditRequiredModule(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Description / Summary</label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Step-by-Step Instructions</label>
                <textarea
                  rows={3}
                  value={editInstructions}
                  onChange={(e) => setEditInstructions(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                />
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleDeleteTask(editingId!, editTaskName)}
                  className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-semibold transition-colors inline-flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Task</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isEditing}
                    className="px-5 py-2 bg-[#4F46E5] text-white rounded-xl font-semibold hover:bg-[#4338CA] transition-colors inline-flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                  >
                    {isEditing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isEditing ? 'Updating...' : 'Update Task Template'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
