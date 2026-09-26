import React, { useState, useEffect } from 'react';
import { CheckSquare, Plus, CheckCircle2, Clock, AlertTriangle, Calendar, User, Search, Trash2 } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';

interface Task {
  id: string;
  business_id: string;
  title: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  priority: 'High' | 'Medium' | 'Low';
  due_date: string;
  assignee: string;
}

export const TasksView: React.FC = () => {
  const { activeBusiness } = useAuth();
  const businessId = activeBusiness?.id || 'biz-default';

  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem(`ecomhub_tasks_${businessId}`);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [];
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [dueDate, setDueDate] = useState('');
  const [assignee, setAssignee] = useState('Operations Specialist');

  // Live reload tasks if updated elsewhere (e.g. from AddLeadModal)
  useEffect(() => {
    const handleUpdate = () => {
      try {
        const saved = localStorage.getItem(`ecomhub_tasks_${businessId}`);
        if (saved) setTasks(JSON.parse(saved));
      } catch {}
    };
    window.addEventListener('ecomhub_tasks_updated', handleUpdate);
    return () => window.removeEventListener('ecomhub_tasks_updated', handleUpdate);
  }, [businessId]);

  useEffect(() => {
    try {
      localStorage.setItem(`ecomhub_tasks_${businessId}`, JSON.stringify(tasks));
    } catch {
      // ignore
    }
  }, [tasks, businessId]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newTask: Task = {
      id: `task-${Date.now()}`,
      business_id: businessId,
      title: title.trim(),
      status: 'Pending',
      priority,
      due_date: dueDate || new Date().toISOString().split('T')[0],
      assignee: assignee.trim() || 'Unassigned',
    };

    setTasks([newTask, ...tasks]);
    setTitle('');
    setIsModalOpen(false);
  };

  const toggleStatus = (id: string) => {
    setTasks(
      tasks.map((t) => {
        if (t.id === id) {
          const nextStatus =
            t.status === 'Pending' ? 'In Progress' : t.status === 'In Progress' ? 'Completed' : 'Pending';
          return { ...t, status: nextStatus };
        }
        return t;
      })
    );
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter((t) => t.id !== id));
  };

  const filtered = tasks.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || t.assignee.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || t.status.toLowerCase() === filterStatus.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F172A] flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-[#4F46E5]" />
            <span>Operational Tasks</span>
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Manage daily team workflows, priorities, and deadlines for {activeBusiness?.name || 'your business'}.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#4F46E5] text-white text-xs font-semibold rounded-lg hover:bg-[#4338CA] transition-colors shadow-xs self-start"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#64748B]">Pending Tasks</p>
            <p className="text-xl font-bold text-amber-600 mt-1">
              {tasks.filter((t) => t.status === 'Pending').length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#64748B]">In Progress</p>
            <p className="text-xl font-bold text-indigo-600 mt-1">
              {tasks.filter((t) => t.status === 'In Progress').length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-[#64748B]">Completed</p>
            <p className="text-xl font-bold text-green-600 mt-1">
              {tasks.filter((t) => t.status === 'Completed').length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Search className="w-4 h-4 text-[#94A3B8]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tasks or assignees..."
            className="w-full sm:w-72 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['all', 'pending', 'in progress', 'completed'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                filterStatus === st
                  ? 'bg-[#4F46E5] text-white shadow-xs'
                  : 'bg-[#F8FAFC] text-[#64748B] hover:bg-[#F1F5F9]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        <div className="divide-y divide-[#E2E8F0]">
          {filtered.map((task) => (
            <div key={task.id} className="p-4 flex items-center justify-between gap-4 hover:bg-[#F8FAFC] transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => toggleStatus(task.id)}
                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                    task.status === 'Completed'
                      ? 'bg-green-600 border-green-600 text-white'
                      : 'border-[#CBD5E1] hover:border-[#4F46E5]'
                  }`}
                >
                  {task.status === 'Completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>
                <div className="min-w-0">
                  <p
                    className={`text-xs font-semibold text-[#0F172A] truncate ${
                      task.status === 'Completed' ? 'line-through text-[#94A3B8]' : ''
                    }`}
                  >
                    {task.title}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-[#64748B]">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#94A3B8]" />
                      <span>{task.due_date}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-[#94A3B8]" />
                      <span>{task.assignee}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                    task.priority === 'High'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : task.priority === 'Medium'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-slate-50 text-slate-700 border border-slate-200'
                  }`}
                >
                  {task.priority}
                </span>

                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                    task.status === 'Completed'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : task.status === 'In Progress'
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {task.status}
                </span>

                <button
                  onClick={() => deleteTask(task.id)}
                  className="p-1.5 text-[#94A3B8] hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <CheckSquare className="w-10 h-10 text-[#94A3B8] mx-auto mb-2" />
              <p className="text-sm font-medium text-[#0F172A]">No tasks found</p>
              <p className="text-xs text-[#64748B] mt-1">Create a new task to organize your operational workflow.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h2 className="text-base font-bold text-[#0F172A]">Create New Task</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Review Q1 financial reconciliation"
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e: any) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">Assignee</label>
                <input
                  type="text"
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  placeholder="e.g. Haseeb Gul"
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
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
