import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckSquare,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  User,
  Search,
  Trash2,
  FolderKanban,
  MessageSquare,
  Send,
  AlertOctagon,
  ChevronDown,
  X,
  ExternalLink,
  ShieldAlert,
  Pencil,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { usePermissions } from '../../lib/use-permissions';
import { getSupabaseClient } from '../../lib/supabase';
import { useCrm } from '../../lib/crm-context';

export type TaskStatus = 'Queue' | 'Working' | 'Pending' | 'Having Problem' | 'Done';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface TasksViewProps {
  initialTaskId?: string | null;
}

export interface TaskItem {
  id: string;
  business_id: string;
  project_id?: string | null;
  project_name?: string | null;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: string;
  due_date?: string;
  assigned_to?: string | null;
  assigned_by?: string | null;
  assignee: string;
  short_note?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskNote {
  id: string;
  task_id: string;
  business_id: string;
  user_id: string;
  user_name?: string;
  text: string;
  created_at: string;
}

export const TasksView: React.FC<TasksViewProps> = ({ initialTaskId }) => {
  const { activeBusiness, members, user } = useAuth();
  const { can, isOwner } = usePermissions();
  const { addNotification } = useCrm();

  const canCreate = isOwner || can('tasks.create');
  const canEdit = isOwner || can('tasks.edit');
  const canDelete = isOwner || can('tasks.delete');

  const businessId = activeBusiness?.id || 'biz-ecometrix-001';
  const todayStr = new Date().toISOString().split('T')[0];

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [notesMap, setNotesMap] = useState<Record<string, TaskNote[]>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterScope, setFilterScope] = useState<'ALL' | 'MY_TASKS' | 'UNASSIGNED'>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [filterProject, setFilterProject] = useState<string>('ALL');

  // Modals: Create
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [deadline, setDeadline] = useState(todayStr);
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [initialShortNote, setInitialShortNote] = useState<string>('');

  // Modals: Edit & Reassign
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState<TaskPriority>('Medium');
  const [editDeadline, setEditDeadline] = useState(todayStr);
  const [editAssignedTo, setEditAssignedTo] = useState<string>('');
  const [editProjectId, setEditProjectId] = useState<string>('');

  // Having Problem Modal
  const [problemTask, setProblemTask] = useState<TaskItem | null>(null);
  const [problemReason, setProblemReason] = useState('');

  // Active Task Detail / Notes Drawer
  const [activeTaskForNotes, setActiveTaskForNotes] = useState<TaskItem | null>(null);
  const [newNoteText, setNewNoteText] = useState('');

  // Fetch canonical tasks and projects
  const fetchTasksData = async () => {
    setIsLoading(true);
    const client = getSupabaseClient();
    try {
      if (client) {
        const [{ data: taskRows }, { data: projRows }] = await Promise.all([
          client.from('tasks').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
          client.from('projects').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
        ]);

        if (Array.isArray(taskRows)) {
          setTasks(taskRows as TaskItem[]);
          try {
            localStorage.setItem(`ecomhub_tasks_${businessId}`, JSON.stringify(taskRows));
          } catch {}
        }
        if (Array.isArray(projRows)) {
          setProjects(projRows);
          try {
            localStorage.setItem(`ecomhub_projects_${businessId}`, JSON.stringify(projRows));
          } catch {}
        }
        setIsLoading(false);
        return;
      }
    } catch (err) {
      console.warn('Supabase task fetch fallback:', err);
    }

    // Local storage fallback
    try {
      const rawT = localStorage.getItem(`ecomhub_tasks_${businessId}`);
      if (rawT) setTasks(JSON.parse(rawT));
      const rawP = localStorage.getItem(`ecomhub_projects_${businessId}`);
      if (rawP) setProjects(JSON.parse(rawP));
    } catch {}
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTasksData();

    const handleSync = () => fetchTasksData();
    window.addEventListener('ecomhub_tasks_updated', handleSync);
    window.addEventListener('ecomhub_projects_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('ecomhub_tasks_updated', handleSync);
      window.removeEventListener('ecomhub_projects_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [businessId]);

  // Fetch task notes when active task selected
  const fetchNotesForTask = async (taskId: string) => {
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data } = await client.from('task_notes').select('*').eq('task_id', taskId).order('created_at', { ascending: false });
        if (Array.isArray(data)) {
          setNotesMap((prev) => ({ ...prev, [taskId]: data as TaskNote[] }));
          return;
        }
      } catch {}
    }

    try {
      const raw = localStorage.getItem(`ecomhub_task_notes_${taskId}`);
      if (raw) {
        setNotesMap((prev) => ({ ...prev, [taskId]: JSON.parse(raw) }));
      }
    } catch {}
  };

  // Create Task
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const assignedMember = members.find((m) => m.user_id === assignedTo);
    const assigneeName = assignedMember?.profile?.full_name || assignedMember?.profile?.email || 'Unassigned';

    const selectedProj = projects.find((p) => p.id === selectedProjectId);

    const newTask: TaskItem = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      business_id: businessId,
      project_id: selectedProjectId || null,
      project_name: selectedProj?.name || null,
      title: title.trim(),
      description: description.trim() || null,
      status: 'Queue',
      priority,
      deadline: deadline || todayStr,
      due_date: deadline || todayStr,
      assigned_to: assignedTo || null,
      assigned_by: user?.id || null,
      assignee: assigneeName,
      short_note: initialShortNote.trim() || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('tasks').insert([newTask]);
        if (initialShortNote.trim()) {
          await client.from('task_notes').insert([
            {
              task_id: newTask.id,
              business_id: businessId,
              user_id: user?.id || 'usr-ecometrix-001',
              user_name: user?.full_name || 'Admin',
              text: initialShortNote.trim().substring(0, 250),
            },
          ]);
        }
      } catch (err) {
        console.warn('Error inserting task to canonical DB:', err);
      }
    }

    // Notification to assignee
    if (assignedTo && assignedTo !== user?.id) {
      try {
        await addNotification({
          user_id: assignedTo,
          type: 'task_assigned',
          title: `New Task Assigned: ${newTask.title}`,
          message: `You have been assigned task "${newTask.title}". Deadline: ${newTask.deadline}.`,
          link_section: 'tasks',
          entity_id: newTask.id,
        });
      } catch {}
    }

    setTasks((prev) => [newTask, ...prev]);
    try {
      localStorage.setItem(`ecomhub_tasks_${businessId}`, JSON.stringify([newTask, ...tasks]));
    } catch {}

    window.dispatchEvent(new Event('ecomhub_tasks_updated'));
    setTitle('');
    setDescription('');
    setAssignedTo('');
    setSelectedProjectId('');
    setInitialShortNote('');
    setIsModalOpen(false);
  };

  // Focus on initialTaskId if requested
  useEffect(() => {
    if (initialTaskId && tasks.length > 0) {
      const target = tasks.find((t) => t.id === initialTaskId);
      if (target) {
        setActiveTaskForNotes(target);
        fetchNotesForTask(target.id);
      }
    }
  }, [initialTaskId, tasks]);

  // Open Edit & Reassign Modal
  const handleOpenEdit = (task: TaskItem) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setEditPriority(task.priority);
    setEditDeadline(task.deadline || todayStr);
    setEditAssignedTo(task.assigned_to || '');
    setEditProjectId(task.project_id || '');
  };

  // Submit Edit & Reassign
  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editTitle.trim()) return;

    const assignedMember = members.find((m) => m.user_id === editAssignedTo);
    const assigneeName = assignedMember?.profile?.full_name || assignedMember?.profile?.email || 'Unassigned';
    const selectedProj = projects.find((p) => p.id === editProjectId);

    const isReassigned = editAssignedTo !== editingTask.assigned_to;

    const updated: TaskItem = {
      ...editingTask,
      title: editTitle.trim(),
      description: editDescription.trim() || null,
      priority: editPriority,
      deadline: editDeadline,
      due_date: editDeadline,
      assigned_to: editAssignedTo || null,
      assignee: assigneeName,
      project_id: editProjectId || null,
      project_name: selectedProj?.name || null,
      updated_at: new Date().toISOString(),
    };

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('tasks').update({
          title: updated.title,
          description: updated.description,
          priority: updated.priority,
          deadline: updated.deadline,
          due_date: updated.due_date,
          assigned_to: updated.assigned_to,
          assignee: updated.assignee,
          project_id: updated.project_id,
          project_name: updated.project_name,
          updated_at: updated.updated_at,
        }).eq('id', editingTask.id);
      } catch (err) {
        console.warn('Error updating task in canonical DB:', err);
      }
    }

    if (isReassigned && editAssignedTo && editAssignedTo !== user?.id) {
      try {
        await addNotification({
          user_id: editAssignedTo,
          type: 'task_assigned',
          title: `Task Reassigned: ${updated.title}`,
          message: `You have been reassigned task "${updated.title}". Deadline: ${updated.deadline}.`,
          link_section: 'tasks',
          entity_id: updated.id,
        });
      } catch {}
    }

    setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? updated : t)));
    try {
      localStorage.setItem(`ecomhub_tasks_${businessId}`, JSON.stringify(tasks.map((t) => (t.id === editingTask.id ? updated : t))));
    } catch {}

    window.dispatchEvent(new Event('ecomhub_tasks_updated'));
    setEditingTask(null);
  };

  // Change Task Status
  const handleStatusChange = async (task: TaskItem, newStatus: TaskStatus) => {
    // Reopen protection: if currently Done, only Owner/Admin can reopen
    if (task.status === 'Done' && newStatus !== 'Done' && !canEdit && !isOwner) {
      return;
    }

    // If Changing to "Having Problem", trigger short note prompt
    if (newStatus === 'Having Problem') {
      setProblemTask(task);
      setProblemReason('');
      return;
    }

    await applyStatusUpdate(task, newStatus);
  };

  const applyStatusUpdate = async (task: TaskItem, newStatus: TaskStatus, note?: string) => {
    const updated = {
      ...task,
      status: newStatus,
      short_note: note || task.short_note,
      updated_at: new Date().toISOString(),
    };

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('tasks').update({ status: newStatus, short_note: updated.short_note, updated_at: updated.updated_at }).eq('id', task.id);
        if (note) {
          await client.from('task_notes').insert([
            {
              task_id: task.id,
              business_id: businessId,
              user_id: user?.id || 'usr-ecometrix-001',
              user_name: user?.full_name || 'Team Member',
              text: note.substring(0, 250),
            },
          ]);
        }
      } catch (err) {
        console.warn('Error updating task in canonical DB:', err);
      }
    }

    // Having Problem alert notification to Owner / Admin
    if (newStatus === 'Having Problem') {
      try {
        await addNotification({
          type: 'lead_assigned',
          title: `🚨 Blocker: Task Having Problem (${task.title})`,
          message: `${user?.full_name || 'Team member'} reported a problem on task "${task.title}": ${note || 'Needs admin assistance'}`,
          link_section: 'tasks',
          entity_id: task.id,
        });
      } catch {}
    }

    // Done notification
    if (newStatus === 'Done') {
      try {
        await addNotification({
          type: 'lead_capture',
          title: `Task Completed: ${task.title}`,
          message: `Task "${task.title}" has been marked Done by ${user?.full_name || 'Team Member'}.`,
          link_section: 'tasks',
          entity_id: task.id,
        });
      } catch {}
    }

    setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    try {
      localStorage.setItem(`ecomhub_tasks_${businessId}`, JSON.stringify(tasks.map((t) => (t.id === task.id ? updated : t))));
    } catch {}

    window.dispatchEvent(new Event('ecomhub_tasks_updated'));
  };

  // Submit Having Problem
  const submitHavingProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemTask) return;
    const noteText = problemReason.trim() || 'Blocker encountered, admin assistance required.';
    await applyStatusUpdate(problemTask, 'Having Problem', noteText);
    setProblemTask(null);
    setProblemReason('');
  };

  // Add Short Note to active task
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTaskForNotes || !newNoteText.trim()) return;

    const newNote: TaskNote = {
      id: `tn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      task_id: activeTaskForNotes.id,
      business_id: businessId,
      user_id: user?.id || 'usr-ecometrix-001',
      user_name: user?.full_name || 'Team Member',
      text: newNoteText.trim().substring(0, 250),
      created_at: new Date().toISOString(),
    };

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('task_notes').insert([newNote]);
        await client.from('tasks').update({ short_note: newNote.text }).eq('id', activeTaskForNotes.id);
      } catch {}
    }

    setNotesMap((prev) => ({
      ...prev,
      [activeTaskForNotes.id]: [newNote, ...(prev[activeTaskForNotes.id] || [])],
    }));

    // Update in tasks array
    setTasks((prev) =>
      prev.map((t) => (t.id === activeTaskForNotes.id ? { ...t, short_note: newNote.text } : t))
    );

    setNewNoteText('');
  };

  // Delete Task
  const deleteTask = async (id: string) => {
    if (!canDelete) return;
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('tasks').delete().eq('id', id);
      } catch {}
    }
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      localStorage.setItem(`ecomhub_tasks_${businessId}`, JSON.stringify(tasks.filter((t) => t.id !== id)));
    } catch {}
    window.dispatchEvent(new Event('ecomhub_tasks_updated'));
  };

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        t.assignee.toLowerCase().includes(q) ||
        (t.short_note && t.short_note.toLowerCase().includes(q));

      // Scope
      let matchesScope = true;
      if (filterScope === 'MY_TASKS') {
        matchesScope = Boolean(user?.id && t.assigned_to === user.id);
      } else if (filterScope === 'UNASSIGNED') {
        matchesScope = !t.assigned_to;
      }

      // Status
      let matchesStatus = true;
      if (filterStatus === 'OVERDUE') {
        matchesStatus = Boolean(t.deadline && t.deadline < todayStr && t.status !== 'Done');
      } else if (filterStatus !== 'ALL') {
        matchesStatus = t.status.toLowerCase() === filterStatus.toLowerCase();
      }

      // Priority
      const matchesPriority = filterPriority === 'ALL' || t.priority.toLowerCase() === filterPriority.toLowerCase();

      // Project
      const matchesProject = filterProject === 'ALL' || t.project_id === filterProject;

      return matchesSearch && matchesScope && matchesStatus && matchesPriority && matchesProject;
    });
  }, [tasks, searchTerm, filterScope, filterStatus, filterPriority, filterProject, user?.id, todayStr]);

  // Status Styling Helpers
  const getStatusBadge = (st: TaskStatus) => {
    switch (st) {
      case 'Queue':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'Working':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Having Problem':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Done':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusDot = (st: TaskStatus) => {
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

  const getPriorityBadge = (pr: TaskPriority) => {
    switch (pr) {
      case 'Urgent':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'High':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Medium':
        return 'bg-indigo-50 text-[#4F46E5] border-indigo-200';
      case 'Low':
        return 'bg-slate-50 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F172A] flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-[#4F46E5]" />
            <span>Operational Tasks & Delegation</span>
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Role-gated task delegation, status lifecycle, short notes, and deadline management for {activeBusiness?.name || 'your business'}.
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#4F46E5] text-white text-xs font-semibold rounded-lg hover:bg-[#4338CA] transition-colors shadow-xs self-start"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs">
          <p className="text-xs font-medium text-[#64748B]">Total Tasks</p>
          <p className="text-xl font-bold text-[#0F172A] mt-1">{tasks.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs">
          <p className="text-xs font-medium text-blue-600">Working</p>
          <p className="text-xl font-bold text-blue-600 mt-1">
            {tasks.filter((t) => t.status === 'Working').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs">
          <p className="text-xs font-medium text-amber-600">Pending</p>
          <p className="text-xl font-bold text-amber-600 mt-1">
            {tasks.filter((t) => t.status === 'Pending').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs">
          <p className="text-xs font-medium text-rose-600">Having Problem</p>
          <p className="text-xl font-bold text-rose-600 mt-1">
            {tasks.filter((t) => t.status === 'Having Problem').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs">
          <p className="text-xs font-medium text-emerald-600">Done</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">
            {tasks.filter((t) => t.status === 'Done').length}
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Scope Buttons */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setFilterScope('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterScope === 'ALL' ? 'bg-white text-[#0F172A] shadow-xs' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              All Tasks
            </button>
            <button
              onClick={() => setFilterScope('MY_TASKS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterScope === 'MY_TASKS' ? 'bg-white text-[#0F172A] shadow-xs' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              My Tasks
            </button>
            <button
              onClick={() => setFilterScope('UNASSIGNED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterScope === 'UNASSIGNED' ? 'bg-white text-[#0F172A] shadow-xs' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Unassigned
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tasks, notes, or assignees..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#4F46E5]"
            />
          </div>
        </div>

        {/* Detailed Filters */}
        <div className="flex items-center gap-2 flex-wrap text-xs pt-2 border-t border-slate-100">
          <span className="text-[11px] font-semibold text-[#64748B]">Filters:</span>

          {/* Status */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1 bg-white border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#0F172A] focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="Queue">🔘 Queue</option>
            <option value="Working">🔵 Working</option>
            <option value="Pending">🟡 Pending</option>
            <option value="Having Problem">🔴 Having Problem</option>
            <option value="Done">🟢 Done</option>
            <option value="OVERDUE">⚠️ Overdue</option>
          </select>

          {/* Priority */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-2.5 py-1 bg-white border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#0F172A] focus:outline-none"
          >
            <option value="ALL">All Priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {/* Project */}
          {projects.length > 0 && (
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="px-2.5 py-1 bg-white border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#0F172A] focus:outline-none"
            >
              <option value="ALL">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  Project: {p.name}
                </option>
              ))}
            </select>
          )}

          {(filterStatus !== 'ALL' || filterPriority !== 'ALL' || filterProject !== 'ALL' || filterScope !== 'ALL' || searchTerm) && (
            <button
              onClick={() => {
                setFilterStatus('ALL');
                setFilterPriority('ALL');
                setFilterProject('ALL');
                setFilterScope('ALL');
                setSearchTerm('');
              }}
              className="text-[11px] text-[#4F46E5] hover:underline ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Task Details</th>
                <th className="py-3 px-4">Project</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status Dropdown</th>
                <th className="py-3 px-4">Assignee</th>
                <th className="py-3 px-4">Deadline</th>
                <th className="py-3 px-4">Latest Short Note</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-[#64748B]">
                    No tasks found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => {
                  const isOverdue = Boolean(task.deadline && task.deadline < todayStr && task.status !== 'Done');
                  const isAssignedToUser = Boolean(user?.id && task.assigned_to === user.id);
                  const canChangeStatus = canEdit || isOwner || isAssignedToUser;

                  return (
                    <tr key={task.id} className="hover:bg-[#F8FAFC] transition-colors">
                      {/* Title & Description */}
                      <td className="py-3 px-4 max-w-xs">
                        <p className="font-bold text-[#0F172A]">{task.title}</p>
                        {task.description && (
                          <p className="text-[11px] text-[#64748B] line-clamp-1 mt-0.5">{task.description}</p>
                        )}
                      </td>

                      {/* Project */}
                      <td className="py-3 px-4">
                        {task.project_id ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-[#4F46E5] border border-indigo-200">
                            <FolderKanban className="w-3 h-3" />
                            <span className="truncate max-w-[120px]">
                              {projects.find((p) => p.id === task.project_id)?.name || 'Linked Project'}
                            </span>
                          </span>
                        ) : (
                          <span className="text-[#94A3B8] text-[11px]">—</span>
                        )}
                      </td>

                      {/* Priority */}
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${getPriorityBadge(task.priority)}`}>
                          {task.priority}
                        </span>
                      </td>

                      {/* Status Dropdown */}
                      <td className="py-3 px-4">
                        <div className="relative inline-block">
                          <select
                            value={task.status}
                            disabled={!canChangeStatus}
                            onChange={(e) => handleStatusChange(task, e.target.value as TaskStatus)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border focus:outline-none appearance-none pr-6 cursor-pointer ${getStatusBadge(
                              task.status
                            )} ${!canChangeStatus ? 'opacity-70 cursor-not-allowed' : ''}`}
                          >
                            <option value="Queue">🔘 Queue</option>
                            <option value="Working">🔵 Working</option>
                            <option value="Pending">🟡 Pending</option>
                            <option value="Having Problem">🔴 Having Problem</option>
                            <option value="Done">🟢 Done</option>
                          </select>
                          <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                        </div>
                      </td>

                      {/* Assignee */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-[#EEF2FF] text-[#4F46E5] text-[10px] font-bold flex items-center justify-center border border-[#C7D2FE]">
                            {task.assignee ? task.assignee.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <span className="text-xs text-[#0F172A] truncate max-w-[120px]">
                            {task.assignee || 'Unassigned'}
                          </span>
                        </div>
                      </td>

                      {/* Deadline & Overdue Tag */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
                          <span className="text-xs text-[#0F172A]">{task.deadline}</span>
                        </div>
                        {isOverdue && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700 border border-red-300 mt-1">
                            <AlertTriangle className="w-2.5 h-2.5" /> Overdue
                          </span>
                        )}
                      </td>

                      {/* Latest Short Note */}
                      <td className="py-3 px-4 max-w-xs">
                        {task.short_note ? (
                          <div
                            onClick={() => {
                              setActiveTaskForNotes(task);
                              fetchNotesForTask(task.id);
                            }}
                            className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-[#0F172A] hover:bg-slate-100 cursor-pointer group"
                            title="Click to view notes thread"
                          >
                            <p className="line-clamp-2 italic">"{task.short_note}"</p>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setActiveTaskForNotes(task);
                              fetchNotesForTask(task.id);
                            }}
                            className="text-[11px] text-[#4F46E5] hover:underline flex items-center gap-1"
                          >
                            <MessageSquare className="w-3 h-3" /> Add note
                          </button>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canEdit && (
                            <button
                              onClick={() => handleOpenEdit(task)}
                              className="p-1.5 rounded-lg border border-[#E2E8F0] hover:bg-indigo-50 text-[#64748B] hover:text-[#4F46E5] transition-colors"
                              title="Edit & Reassign Task"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setActiveTaskForNotes(task);
                              fetchNotesForTask(task.id);
                            }}
                            className="p-1.5 rounded-lg border border-[#E2E8F0] hover:bg-slate-50 text-[#64748B] hover:text-[#0F172A] transition-colors"
                            title="Task notes and history"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => deleteTask(task.id)}
                              className="p-1.5 rounded-lg border border-[#E2E8F0] hover:bg-red-50 text-[#94A3B8] hover:text-red-600 transition-colors"
                              title="Delete Task"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Task */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-[#E2E8F0] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-[#4F46E5]" />
                <span>Create New Task</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-[#94A3B8] hover:text-[#0F172A] rounded-lg hover:bg-[#F8FAFC]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Audit Q1 Shopify Returns and Warehousing"
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed task instructions and acceptance criteria..."
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Assign To *</label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.profile?.full_name || m.profile?.email} ({m.role || 'Member'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Link to Project</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  >
                    <option value="">None (Independent Task)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Deadline Date *</label>
                  <input
                    type="date"
                    required
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">
                  Initial Short Note (max 250 chars)
                </label>
                <input
                  type="text"
                  maxLength={250}
                  value={initialShortNote}
                  onChange={(e) => setInitialShortNote(e.target.value)}
                  placeholder="e.g. Priority focus on warehouse reconciliation before Friday"
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                />
                <span className="text-[10px] text-[#94A3B8] float-right mt-0.5">
                  {initialShortNote.length}/250 chars
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold rounded-xl shadow-xs"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit & Reassign Task */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-[#E2E8F0] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <Pencil className="w-5 h-5 text-[#4F46E5]" />
                <span>Edit & Reassign Task</span>
              </h3>
              <button
                onClick={() => setEditingTask(null)}
                className="p-1 text-[#94A3B8] hover:text-[#0F172A] rounded-lg hover:bg-[#F8FAFC]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateTask} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Task title"
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Task details and instructions..."
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Reassign To</label>
                  <select
                    value={editAssignedTo}
                    onChange={(e) => setEditAssignedTo(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.profile?.full_name || m.profile?.email} ({m.role || 'Member'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Link to Project</label>
                  <select
                    value={editProjectId}
                    onChange={(e) => setEditProjectId(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  >
                    <option value="">None (Independent Task)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Priority</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Deadline Date *</label>
                  <input
                    type="date"
                    required
                    value={editDeadline}
                    onChange={(e) => setEditDeadline(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-2 border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold rounded-xl shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Having Problem Reason */}
      {problemTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-red-200 space-y-4">
            <div className="flex items-center gap-2 text-rose-600">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold text-[#0F172A]">Flag Task: Having Problem</h3>
            </div>
            <p className="text-xs text-[#64748B]">
              Please describe the blocker or issue preventing you from completing "
              <strong className="text-[#0F172A]">{problemTask.title}</strong>". An alert will be sent to the Owner and Admins.
            </p>

            <form onSubmit={submitHavingProblem} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Blocker Explanation / Note * (max 250 chars)
                </label>
                <textarea
                  required
                  maxLength={250}
                  rows={3}
                  value={problemReason}
                  onChange={(e) => setProblemReason(e.target.value)}
                  placeholder="e.g. Waiting on client API keys to complete connection..."
                  className="w-full px-3 py-2 border border-red-200 rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-red-500 bg-red-50/20"
                />
                <span className="text-[10px] text-[#94A3B8] float-right mt-0.5">
                  {problemReason.length}/250 chars
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setProblemTask(null)}
                  className="px-3 py-1.5 border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs"
                >
                  Confirm & Notify Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drawer / Modal: Task Notes Thread */}
      {activeTaskForNotes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-[#E2E8F0] space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] shrink-0">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">{activeTaskForNotes.title}</h3>
                <p className="text-[11px] text-[#64748B] flex items-center gap-2 mt-0.5">
                  <span>Assignee: {activeTaskForNotes.assignee}</span>
                  <span>•</span>
                  <span>Deadline: {activeTaskForNotes.deadline}</span>
                </p>
              </div>
              <button
                onClick={() => setActiveTaskForNotes(null)}
                className="p-1 text-[#94A3B8] hover:text-[#0F172A] rounded-lg hover:bg-[#F8FAFC]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Notes List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
                Notes & Activity Timeline
              </h4>

              {(!notesMap[activeTaskForNotes.id] || notesMap[activeTaskForNotes.id].length === 0) ? (
                <div className="py-8 text-center text-xs text-[#94A3B8] bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No notes recorded yet for this task.
                </div>
              ) : (
                notesMap[activeTaskForNotes.id].map((note) => (
                  <div key={note.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-[#0F172A]">{note.user_name || 'Team Member'}</span>
                      <span className="text-[#94A3B8]">{new Date(note.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-[#334155]">{note.text}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add Note Form */}
            <form onSubmit={handleAddNote} className="pt-3 border-t border-[#E2E8F0] space-y-2 shrink-0">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={250}
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Add a short note or update (max 250 chars)..."
                  className="flex-1 px-3 py-2 border border-[#E2E8F0] rounded-xl text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                />
                <button
                  type="submit"
                  disabled={!newNoteText.trim()}
                  className="px-3.5 py-2 bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Post</span>
                </button>
              </div>
              <span className="text-[10px] text-[#94A3B8] block text-right">
                {newNoteText.length}/250 chars
              </span>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
