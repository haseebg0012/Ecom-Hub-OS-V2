import React, { useState, useEffect, useMemo } from 'react';
import {
  FolderKanban,
  Plus,
  DollarSign,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Building2,
  Search,
  Pencil,
  Trash2,
  CheckSquare,
  X,
  ChevronDown,
  Clock,
  AlertTriangle,
  ExternalLink,
  Users,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { usePermissions } from '../../lib/use-permissions';
import { useCrm } from '../../lib/crm-context';
import { getSupabaseClient } from '../../lib/supabase';
import { TaskItem, TaskStatus, TaskPriority } from '../tasks/TasksView';

export interface Project {
  id: string;
  business_id: string;
  client_id?: string | null;
  client_name: string;
  name: string;
  status: 'Active' | 'On Hold' | 'Completed' | 'Planning';
  budget: number;
  currency: string;
  deadline: string;
  description: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectsViewProps {
  onOpenClient?: (clientId: string) => void;
  onOpenTask?: (taskId: string) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({ onOpenClient, onOpenTask }) => {
  const { activeBusiness, members, user } = useAuth();
  const { can, isOwner } = usePermissions();
  const { clients = [] } = useCrm();

  const canCreate = isOwner || can('projects.create');
  const canEdit = isOwner || can('projects.edit');
  const canDelete = isOwner || can('projects.delete');
  const canCreateTask = isOwner || can('tasks.create');

  const businessId = activeBusiness?.id || 'biz-ecometrix-001';
  const todayStr = new Date().toISOString().split('T')[0];

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Selected Project for Detail Drawer
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  // Create Project modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [manualClientName, setManualClientName] = useState('');
  const [status, setStatus] = useState<'Active' | 'On Hold' | 'Completed' | 'Planning'>('Active');
  const [budget, setBudget] = useState('100000');
  const [currency, setCurrency] = useState('PKR');
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');

  // Edit Project modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editClientId, setEditClientId] = useState<string>('');
  const [editManualClientName, setEditManualClientName] = useState('');
  const [editStatus, setEditStatus] = useState<'Active' | 'On Hold' | 'Completed' | 'Planning'>('Active');
  const [editBudget, setEditBudget] = useState('0');
  const [editCurrency, setEditCurrency] = useState('PKR');
  const [editDeadline, setEditDeadline] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Quick Add Task inside Project Detail state
  const [showQuickAddTask, setShowQuickAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('Medium');
  const [newTaskDeadline, setNewTaskDeadline] = useState(todayStr);
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState('');

  // Fetch canonical projects & tasks
  const loadData = async () => {
    setIsLoading(true);
    const client = getSupabaseClient();
    try {
      if (client) {
        const [{ data: projRows }, { data: taskRows }] = await Promise.all([
          client.from('projects').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
          client.from('tasks').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
        ]);

        if (Array.isArray(projRows)) {
          setProjects(projRows as Project[]);
          try {
            localStorage.setItem(`ecomhub_projects_${businessId}`, JSON.stringify(projRows));
          } catch {}
        }
        if (Array.isArray(taskRows)) {
          setTasks(taskRows as TaskItem[]);
          try {
            localStorage.setItem(`ecomhub_tasks_${businessId}`, JSON.stringify(taskRows));
          } catch {}
        }
        setIsLoading(false);
        return;
      }
    } catch (err) {
      console.warn('Supabase projects fetch fallback:', err);
    }

    // LocalStorage fallback
    try {
      const rawP = localStorage.getItem(`ecomhub_projects_${businessId}`);
      if (rawP) setProjects(JSON.parse(rawP));
      const rawT = localStorage.getItem(`ecomhub_tasks_${businessId}`);
      if (rawT) setTasks(JSON.parse(rawT));
    } catch {}
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();

    const handleSync = () => loadData();
    window.addEventListener('ecomhub_projects_updated', handleSync);
    window.addEventListener('ecomhub_tasks_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('ecomhub_projects_updated', handleSync);
      window.removeEventListener('ecomhub_tasks_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [businessId]);

  // Keep activeProject in sync with updated projects list
  useEffect(() => {
    if (activeProject) {
      const fresh = projects.find((p) => p.id === activeProject.id);
      if (fresh) setActiveProject(fresh);
    }
  }, [projects]);

  // Create Project
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let finalClientName = 'Direct Client';
    let finalClientId: string | null = null;

    if (selectedClientId) {
      const matched = clients.find((c) => c.id === selectedClientId);
      if (matched) {
        finalClientName = matched.company_name;
        finalClientId = matched.id;
      }
    } else if (manualClientName.trim()) {
      finalClientName = manualClientName.trim();
    }

    const newProj: Project = {
      id: `proj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      business_id: businessId,
      client_id: finalClientId,
      client_name: finalClientName,
      name: name.trim(),
      status,
      budget: Number(budget) || 0,
      currency,
      deadline: deadline || todayStr,
      description: description.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('projects').insert([newProj]);
      } catch (err) {
        console.warn('Error inserting project to canonical DB:', err);
      }
    }

    const updatedList = [newProj, ...projects];
    setProjects(updatedList);
    try {
      localStorage.setItem(`ecomhub_projects_${businessId}`, JSON.stringify(updatedList));
    } catch {}

    window.dispatchEvent(new Event('ecomhub_projects_updated'));
    setName('');
    setSelectedClientId('');
    setManualClientName('');
    setDescription('');
    setDeadline('');
    setIsModalOpen(false);
  };

  // Open Edit Modal
  const handleOpenEdit = (proj: Project, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingId(proj.id);
    setEditName(proj.name);
    setEditClientId(proj.client_id || '');
    setEditManualClientName(proj.client_name);
    setEditStatus(proj.status);
    setEditBudget(String(proj.budget));
    setEditCurrency(proj.currency);
    setEditDeadline(proj.deadline);
    setEditDescription(proj.description);
    setIsEditModalOpen(true);
  };

  // Update Project
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editName.trim()) return;

    let finalClientName = 'Direct Client';
    let finalClientId: string | null = null;

    if (editClientId) {
      const matched = clients.find((c) => c.id === editClientId);
      if (matched) {
        finalClientName = matched.company_name;
        finalClientId = matched.id;
      }
    } else if (editManualClientName.trim()) {
      finalClientName = editManualClientName.trim();
    }

    const updatedFields = {
      name: editName.trim(),
      client_id: finalClientId,
      client_name: finalClientName,
      status: editStatus,
      budget: Number(editBudget) || 0,
      currency: editCurrency,
      deadline: editDeadline,
      description: editDescription.trim(),
      updated_at: new Date().toISOString(),
    };

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('projects').update(updatedFields).eq('id', editingId);
      } catch (err) {
        console.warn('Error updating project in canonical DB:', err);
      }
    }

    const updatedList = projects.map((p) => (p.id === editingId ? { ...p, ...updatedFields } : p));
    setProjects(updatedList);
    try {
      localStorage.setItem(`ecomhub_projects_${businessId}`, JSON.stringify(updatedList));
    } catch {}

    window.dispatchEvent(new Event('ecomhub_projects_updated'));
    setIsEditModalOpen(false);
    setEditingId(null);
  };

  // Delete Project
  const handleDelete = async (id: string, projectName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!canDelete) return;
    if (!window.confirm(`Are you sure you want to delete project "${projectName}"? Linked tasks will be unlinked.`)) return;

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('projects').delete().eq('id', id);
        // Unlink tasks in canonical DB
        await client.from('tasks').update({ project_id: null, project_name: null }).eq('project_id', id);
      } catch (err) {
        console.warn('Error deleting project in canonical DB:', err);
      }
    }

    const remaining = projects.filter((p) => p.id !== id);
    setProjects(remaining);
    try {
      localStorage.setItem(`ecomhub_projects_${businessId}`, JSON.stringify(remaining));
    } catch {}

    // Also update tasks in state
    setTasks((prev) => prev.map((t) => (t.project_id === id ? { ...t, project_id: null, project_name: null } : t)));

    window.dispatchEvent(new Event('ecomhub_projects_updated'));
    window.dispatchEvent(new Event('ecomhub_tasks_updated'));
    if (activeProject?.id === id) setActiveProject(null);
  };

  // Quick Add Task to Project
  const handleQuickAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !newTaskTitle.trim()) return;

    const assignedMember = members.find((m) => m.user_id === newTaskAssignedTo);
    const assigneeName = assignedMember?.profile?.full_name || assignedMember?.profile?.email || 'Unassigned';

    const newTask: TaskItem = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      business_id: businessId,
      project_id: activeProject.id,
      project_name: activeProject.name,
      title: newTaskTitle.trim(),
      description: `Deliverable milestone for project "${activeProject.name}"`,
      status: 'Queue',
      priority: newTaskPriority,
      deadline: newTaskDeadline || todayStr,
      due_date: newTaskDeadline || todayStr,
      assigned_to: newTaskAssignedTo || null,
      assigned_by: user?.id || null,
      assignee: assigneeName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('tasks').insert([newTask]);
      } catch (err) {
        console.warn('Error inserting project task:', err);
      }
    }

    const updatedTasks = [newTask, ...tasks];
    setTasks(updatedTasks);
    try {
      localStorage.setItem(`ecomhub_tasks_${businessId}`, JSON.stringify(updatedTasks));
    } catch {}

    window.dispatchEvent(new Event('ecomhub_tasks_updated'));
    setNewTaskTitle('');
    setNewTaskAssignedTo('');
    setShowQuickAddTask(false);
  };

  // Quick inline status change on project task
  const handleTaskStatusChange = async (task: TaskItem, newStatus: TaskStatus) => {
    const updated = {
      ...task,
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('tasks').update({ status: newStatus, updated_at: updated.updated_at }).eq('id', task.id);
      } catch (err) {
        console.warn('Error updating task status:', err);
      }
    }

    const updatedTasks = tasks.map((t) => (t.id === task.id ? updated : t));
    setTasks(updatedTasks);
    try {
      localStorage.setItem(`ecomhub_tasks_${businessId}`, JSON.stringify(updatedTasks));
    } catch {}

    window.dispatchEvent(new Event('ecomhub_tasks_updated'));
  };

  // Tasks belonging to active project
  const activeProjectTasks = useMemo(() => {
    if (!activeProject) return [];
    return tasks.filter((t) => t.project_id === activeProject.id);
  }, [activeProject, tasks]);

  // Filtered Projects
  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.client_name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q));

      const matchesStatus = filterStatus === 'ALL' || p.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [projects, searchTerm, filterStatus]);

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'Active':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Completed':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'On Hold':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Planning':
      default:
        return 'bg-indigo-50 text-[#4F46E5] border-indigo-200';
    }
  };

  const getTaskStatusDot = (st: TaskStatus) => {
    switch (st) {
      case 'Queue':
        return 'bg-slate-500';
      case 'Working':
        return 'bg-blue-500';
      case 'Pending':
        return 'bg-amber-500';
      case 'Having Problem':
        return 'bg-red-500';
      case 'Done':
        return 'bg-emerald-500';
      default:
        return 'bg-slate-400';
    }
  };

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
            Interconnected project workspaces, client milestones, budgets, and operational task deliverables for {activeBusiness?.name || 'your business'}.
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#4F46E5] text-white text-xs font-semibold rounded-lg hover:bg-[#4338CA] transition-colors shadow-xs self-start"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        )}
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <p className="text-xs font-medium text-emerald-600">Active Workspaces</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">
              {projects.filter((p) => p.status === 'Active').length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-amber-600">Planning / On Hold</p>
            <p className="text-xl font-bold text-amber-600 mt-1">
              {projects.filter((p) => p.status === 'Planning' || p.status === 'On Hold').length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-blue-600">Completed Projects</p>
            <p className="text-xl font-bold text-blue-600 mt-1">
              {projects.filter((p) => p.status === 'Completed').length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <CheckSquare className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search projects by name, client, or deliverables..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#4F46E5]"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#64748B] font-medium">Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Planning">Planning</option>
            <option value="On Hold">On Hold</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((proj) => {
          const projectTasks = tasks.filter((t) => t.project_id === proj.id);
          const doneTasksCount = projectTasks.filter((t) => t.status === 'Done').length;
          const openTasksCount = projectTasks.filter((t) => t.status !== 'Done').length;

          return (
            <div
              key={proj.id}
              onClick={() => setActiveProject(proj)}
              className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col justify-between space-y-4 hover:border-[#4F46E5] hover:shadow-sm transition-all cursor-pointer relative group"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-[#0F172A] group-hover:text-[#4F46E5] transition-colors">
                    {proj.name}
                  </h3>
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${getStatusBadge(
                        proj.status
                      )}`}
                    >
                      {proj.status}
                    </span>
                    {canEdit && (
                      <button
                        onClick={(e) => handleOpenEdit(proj, e)}
                        title="Edit Project"
                        className="p-1 rounded-md text-slate-400 hover:text-[#4F46E5] hover:bg-indigo-50 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={(e) => handleDelete(proj.id, proj.name, e)}
                        title="Delete Project"
                        className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Client Link */}
                <p className="text-xs text-[#64748B] flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#94A3B8]" />
                  {proj.client_id ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenClient) onOpenClient(proj.client_id!);
                      }}
                      className="text-[#4F46E5] hover:underline font-semibold flex items-center gap-1 text-left"
                    >
                      <span>{proj.client_name}</span>
                      <ExternalLink className="w-3 h-3 inline" />
                    </button>
                  ) : (
                    <span>{proj.client_name}</span>
                  )}
                </p>

                {proj.description && (
                  <p className="text-xs text-[#475569] line-clamp-2">{proj.description}</p>
                )}

                {/* Connected Tasks Badge */}
                <div className="pt-2 flex items-center gap-2 text-[11px] text-[#64748B]">
                  <CheckSquare className="w-3.5 h-3.5 text-[#4F46E5]" />
                  <span>
                    <strong className="text-[#0F172A]">{projectTasks.length}</strong> tasks (
                    <span className="text-emerald-600 font-semibold">{doneTasksCount} done</span>
                    {openTasksCount > 0 && <span className="text-blue-600 ml-1 font-semibold">{openTasksCount} open</span>}
                    )
                  </span>
                </div>
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
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-xl border border-[#E2E8F0]">
            <FolderKanban className="w-10 h-10 text-[#94A3B8] mx-auto mb-2" />
            <p className="text-sm font-medium text-[#0F172A]">No projects found</p>
            <p className="text-xs text-[#64748B] mt-1">Get started by creating a new project workspace.</p>
          </div>
        )}
      </div>

      {/* Project Detail Drawer / Modal with Linked Tasks */}
      {activeProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-[#E2E8F0] space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between pb-3 border-b border-[#E2E8F0] shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${getStatusBadge(
                      activeProject.status
                    )}`}
                  >
                    {activeProject.status}
                  </span>
                  <span className="text-[#94A3B8]">•</span>
                  <span className="text-xs font-semibold text-[#64748B] flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-[#94A3B8]" />
                    {activeProject.client_id ? (
                      <button
                        onClick={() => {
                          if (onOpenClient) onOpenClient(activeProject.client_id!);
                        }}
                        className="text-[#4F46E5] hover:underline"
                      >
                        {activeProject.client_name}
                      </button>
                    ) : (
                      <span>{activeProject.client_name}</span>
                    )}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-[#0F172A] mt-1">{activeProject.name}</h2>
              </div>
              <button
                onClick={() => setActiveProject(null)}
                className="p-1 text-[#94A3B8] hover:text-[#0F172A] rounded-lg hover:bg-[#F8FAFC]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {/* Project Specs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[#64748B] block text-[11px]">Budget</span>
                  <strong className="text-[#0F172A] text-xs">
                    {activeProject.currency} {activeProject.budget.toLocaleString()}
                  </strong>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[11px]">Deadline</span>
                  <strong className="text-[#0F172A] text-xs">{activeProject.deadline}</strong>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[11px]">Deliverables</span>
                  <strong className="text-[#0F172A] text-xs">{activeProjectTasks.length} Tasks</strong>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[11px]">Progress</span>
                  <strong className="text-emerald-600 text-xs">
                    {activeProjectTasks.length > 0
                      ? `${Math.round(
                          (activeProjectTasks.filter((t) => t.status === 'Done').length /
                            activeProjectTasks.length) *
                            100
                        )}%`
                      : '0%'}
                  </strong>
                </div>
              </div>

              {activeProject.description && (
                <div className="space-y-1">
                  <h4 className="font-bold text-[#0F172A]">Project Scope & Description</h4>
                  <p className="text-[#475569] bg-white p-3 rounded-xl border border-[#E2E8F0]">
                    {activeProject.description}
                  </p>
                </div>
              )}

              {/* Linked Tasks Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-[#0F172A] flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-[#4F46E5]" />
                    <span>Project Tasks ({activeProjectTasks.length})</span>
                  </h4>
                  {canCreateTask && !showQuickAddTask && (
                    <button
                      onClick={() => setShowQuickAddTask(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#EEF2FF] hover:bg-[#E0E7FF] text-[#4F46E5] rounded-lg font-semibold transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Task</span>
                    </button>
                  )}
                </div>

                {/* Inline Quick Add Task Form */}
                {showQuickAddTask && (
                  <form
                    onSubmit={handleQuickAddTask}
                    className="p-3 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#4F46E5]">New Project Task</span>
                      <button
                        type="button"
                        onClick={() => setShowQuickAddTask(false)}
                        className="text-[#64748B] hover:text-[#0F172A]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
                      <input
                        type="text"
                        required
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="Task title (e.g. Implement Shopify inventory webhook)"
                        className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <select
                        value={newTaskAssignedTo}
                        onChange={(e) => setNewTaskAssignedTo(e.target.value)}
                        className="px-2 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#0F172A] focus:outline-none"
                      >
                        <option value="">Unassigned</option>
                        {members.map((m) => (
                          <option key={m.user_id} value={m.user_id}>
                            {m.profile?.full_name || m.profile?.email}
                          </option>
                        ))}
                      </select>

                      <select
                        value={newTaskPriority}
                        onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
                        className="px-2 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#0F172A] focus:outline-none"
                      >
                        <option value="Low">Low Priority</option>
                        <option value="Medium">Medium Priority</option>
                        <option value="High">High Priority</option>
                        <option value="Urgent">Urgent Priority</option>
                      </select>

                      <input
                        type="date"
                        value={newTaskDeadline}
                        onChange={(e) => setNewTaskDeadline(e.target.value)}
                        className="px-2 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#0F172A] focus:outline-none"
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowQuickAddTask(false)}
                        className="px-3 py-1 text-[#64748B] hover:text-[#0F172A]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-lg font-semibold"
                      >
                        Create Task
                      </button>
                    </div>
                  </form>
                )}

                {/* Tasks List */}
                {activeProjectTasks.length === 0 ? (
                  <div className="py-8 text-center text-[#94A3B8] bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No tasks linked to this project yet. Add deliverables above or link existing tasks from the Tasks module.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeProjectTasks.map((task) => (
                      <div
                        key={task.id}
                        className="p-3 bg-white border border-[#E2E8F0] rounded-xl flex items-center justify-between gap-3 hover:border-[#4F46E5] transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${getTaskStatusDot(task.status)}`} />
                          <div className="min-w-0">
                            <p className="font-bold text-[#0F172A] truncate">{task.title}</p>
                            <p className="text-[11px] text-[#64748B] flex items-center gap-2 mt-0.5">
                              <span>Assignee: {task.assignee || 'Unassigned'}</span>
                              <span>•</span>
                              <span>Due: {task.deadline}</span>
                            </p>
                          </div>
                        </div>

                        {/* Inline Status Dropdown */}
                        <div className="shrink-0">
                          <select
                            value={task.status}
                            onChange={(e) => handleTaskStatusChange(task, e.target.value as TaskStatus)}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold border border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] focus:outline-none cursor-pointer"
                          >
                            <option value="Queue">🔘 Queue</option>
                            <option value="Working">🔵 Working</option>
                            <option value="Pending">🟡 Pending</option>
                            <option value="Having Problem">🔴 Having Problem</option>
                            <option value="Done">🟢 Done</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                {canEdit && (
                  <button
                    onClick={() => {
                      const p = activeProject;
                      setActiveProject(null);
                      handleOpenEdit(p);
                    }}
                    className="px-3 py-1.5 border border-[#E2E8F0] hover:bg-slate-50 text-xs font-semibold rounded-lg text-[#0F172A] flex items-center gap-1.5"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit Project</span>
                  </button>
                )}
              </div>
              <button
                onClick={() => setActiveProject(null)}
                className="px-4 py-1.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold rounded-lg shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <h2 className="text-base font-bold text-[#0F172A]">Create New Project</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#94A3B8] hover:text-[#0F172A]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Q2 Global Expansion"
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Associate Client</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => {
                    setSelectedClientId(e.target.value);
                    if (e.target.value) setManualClientName('');
                  }}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                >
                  <option value="">-- Choose Existing Client or Direct --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name} ({c.contact_person || 'Client'})
                    </option>
                  ))}
                </select>
              </div>

              {!selectedClientId && (
                <div>
                  <label className="block font-semibold text-[#64748B] mb-1">
                    Or Enter Direct Client / Account Name
                  </label>
                  <input
                    type="text"
                    value={manualClientName}
                    onChange={(e) => setManualClientName(e.target.value)}
                    placeholder="e.g. Direct Client"
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  >
                    <option value="Active">Active</option>
                    <option value="Planning">Planning</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Deadline</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Budget</label>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  >
                    <option value="PKR">PKR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Project scope and deliverables..."
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-[#E2E8F0] text-xs font-semibold text-[#64748B] rounded-lg hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#4F46E5] text-white text-xs font-semibold rounded-lg hover:bg-[#4338CA] shadow-xs"
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
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <h2 className="text-base font-bold text-[#0F172A]">Edit Project</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-[#94A3B8] hover:text-[#0F172A]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Associate Client</label>
                <select
                  value={editClientId}
                  onChange={(e) => {
                    setEditClientId(e.target.value);
                    if (e.target.value) setEditManualClientName('');
                  }}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                >
                  <option value="">-- Choose Existing Client or Direct --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name} ({c.contact_person || 'Client'})
                    </option>
                  ))}
                </select>
              </div>

              {!editClientId && (
                <div>
                  <label className="block font-semibold text-[#64748B] mb-1">
                    Or Enter Direct Client Name
                  </label>
                  <input
                    type="text"
                    value={editManualClientName}
                    onChange={(e) => setEditManualClientName(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e: any) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  >
                    <option value="Active">Active</option>
                    <option value="Planning">Planning</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Deadline</label>
                  <input
                    type="date"
                    value={editDeadline}
                    onChange={(e) => setEditDeadline(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Budget</label>
                  <input
                    type="number"
                    value={editBudget}
                    onChange={(e) => setEditBudget(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Currency</label>
                  <select
                    value={editCurrency}
                    onChange={(e) => setEditCurrency(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  >
                    <option value="PKR">PKR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-[#E2E8F0] text-xs font-semibold text-[#64748B] rounded-lg hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#4F46E5] text-white text-xs font-semibold rounded-lg hover:bg-[#4338CA] shadow-xs"
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
