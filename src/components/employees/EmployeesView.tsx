import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Plus,
  Mail,
  Shield,
  Building,
  Search,
  Trash2,
  MoreVertical,
  Edit,
  Send,
  UserX,
  UserCheck2,
  Briefcase,
  Phone,
  Calendar,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { usePermissions } from '../../lib/use-permissions';
import { logAuditEvent } from '../../lib/audit-service';

export interface Employee {
  id: string;
  business_id: string;
  first_name: string;
  last_name: string;
  name: string;
  email: string;
  role: string;
  department: string;
  job_title: string;
  employment_type: string;
  phone: string;
  notes: string;
  status: 'Invited' | 'Email Verified' | 'Profile Pending' | 'Active' | 'Suspended';
  created_at: string;
  last_login?: string | null;
}

export const EmployeesView: React.FC = () => {
  const { user, activeBusiness } = useAuth();
  const { can } = usePermissions();
  const businessId = activeBusiness?.id || 'biz-default';

  const isOwnerOrAdmin = activeBusiness?.role === 'Owner' || activeBusiness?.role === 'Admin' || can('team_roles.manage');

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [confirmDeleteEmployee, setConfirmDeleteEmployee] = useState<Employee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [lastCreatedEmployee, setLastCreatedEmployee] = useState<Employee | null>(null);
  const [loginLinkUrl, setLoginLinkUrl] = useState('https://ecomhubsystem.vercel.app/login');

  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Employee');
  const [department, setDepartment] = useState('Operations');
  const [jobTitle, setJobTitle] = useState('');
  const [employmentType, setEmploymentType] = useState('Full-Time');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchEmployees();
  }, [businessId]);

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees', {
        headers: {
          'Authorization': `Bearer user:${user?.id || 'usr-ecometrix-001'}`,
          'x-business-id': businessId,
          'x-user-id': user?.id || 'usr-ecometrix-001',
          'x-user-role': activeBusiness?.role || 'Owner',
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setEmployees(data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    }
  };

  const showNotice = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 6000);
  };

  const handleOpenAddModal = () => {
    setEditingEmployee(null);
    setFormError(null);
    setFirstName('');
    setLastName('');
    setEmail('');
    setRole('Employee');
    setDepartment('Operations');
    setJobTitle('');
    setEmploymentType('Full-Time');
    setPhone('');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormError(null);
    setFirstName(emp.first_name || emp.name.split(' ')[0] || '');
    setLastName(emp.last_name || emp.name.split(' ').slice(1).join(' ') || '');
    setEmail(emp.email);
    setRole(emp.role);
    setDepartment(emp.department);
    setJobTitle(emp.job_title || '');
    setEmploymentType(emp.employment_type || 'Full-Time');
    setPhone(emp.phone || '');
    setNotes(emp.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const fnTrim = firstName.trim();
    const lnTrim = lastName.trim();
    const emailTrim = email.trim().toLowerCase();

    if (!fnTrim || !lnTrim || !emailTrim) {
      setFormError('First name, last name, and email are required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrim)) {
      setFormError('Please enter a valid email address (e.g. employee@gmail.com).');
      return;
    }

    const fullName = `${fnTrim} ${lnTrim}`;
    setIsSubmitting(true);

    if (editingEmployee) {
      try {
        const res = await fetch(`/api/employees/${editingEmployee.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer user:${user?.id || 'usr-ecometrix-001'}`,
            'x-business-id': businessId,
            'x-user-id': user?.id || 'usr-ecometrix-001',
            'x-user-role': activeBusiness?.role || 'Owner',
          },
          body: JSON.stringify({
            first_name: fnTrim,
            last_name: lnTrim,
            email: emailTrim,
            role,
            department,
            job_title: jobTitle.trim(),
            employment_type: employmentType,
            phone: phone.trim(),
            notes: notes.trim(),
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to update employee details.');
        }

        setEmployees((prev) =>
          prev.map((emp) => (emp.id === editingEmployee.id ? { ...emp, ...data.employee } : emp))
        );
        showNotice(`Successfully updated employee ${fullName}`, 'success');
        setIsModalOpen(false);

        await logAuditEvent({
          businessId,
          userId: user?.id || 'usr-system',
          userProfile: user,
          userRole: activeBusiness?.role,
          module: 'employees',
          action: 'edit',
          recordId: editingEmployee.id,
          recordTitle: fullName,
        });
      } catch (err: any) {
        setFormError(err.message || 'Error updating employee');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      try {
        const res = await fetch('/api/employees/invite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer user:${user?.id || 'usr-ecometrix-001'}`,
            'x-business-id': businessId,
            'x-user-id': user?.id || 'usr-ecometrix-001',
            'x-user-role': activeBusiness?.role || 'Owner',
          },
          body: JSON.stringify({
            first_name: fnTrim,
            last_name: lnTrim,
            email: emailTrim,
            role,
            department,
            job_title: jobTitle.trim() || 'Team Member',
            employment_type: employmentType,
            phone: phone.trim(),
            notes: notes.trim(),
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to send Supabase Auth invitation email.');
        }

        if (data.employee) {
          setEmployees((prev) => [data.employee, ...prev]);
          setLastCreatedEmployee(data.employee);
          const currentOrigin = window.location.origin;
          const defaultBase = currentOrigin.includes('run.app') || currentOrigin.includes('localhost')
            ? 'https://ecomhubsystem.vercel.app'
            : currentOrigin;
          setLoginLinkUrl(`${defaultBase}/login`);
          try {
            const rawMem = localStorage.getItem('ecomhub_members');
            const allMem = rawMem ? JSON.parse(rawMem) : [];
            const newMem = {
              id: `mem-${data.employee.id}`,
              user_id: data.employee.user_id || data.employee.id,
              business_id: businessId,
              role: data.employee.role,
              created_at: new Date().toISOString(),
              profile: {
                id: data.employee.user_id || data.employee.id,
                email: data.employee.email,
                full_name: `${data.employee.first_name} ${data.employee.last_name}`,
              }
            };
            allMem.push(newMem);
            localStorage.setItem('ecomhub_members', JSON.stringify(allMem));
          } catch (e) {
            console.warn('Member storage sync warning:', e);
          }
        }
        showNotice(data.message || `Invitation successfully dispatched to ${emailTrim}`, 'success');
        setIsModalOpen(false);

        await logAuditEvent({
          businessId,
          userId: user?.id || 'usr-system',
          userProfile: user,
          userRole: activeBusiness?.role,
          module: 'employees',
          action: 'create',
          recordId: data.employee?.id || `emp-${Date.now()}`,
          recordTitle: fullName,
          metadata: { role, department, email: emailTrim },
        });
      } catch (err: any) {
        setFormError(err.message || 'Invitation error');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleResendInvite = async (emp: Employee) => {
    try {
      const res = await fetch(`/api/employees/${emp.id}/resend`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer user:${user?.id || 'usr-ecometrix-001'}`,
          'x-business-id': businessId,
          'x-user-id': user?.id || 'usr-ecometrix-001',
          'x-user-role': activeBusiness?.role || 'Owner',
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to resend invitation');
      }
      showNotice(data.message || `Secure invitation resent to ${emp.email}`, 'success');
      await logAuditEvent({
        businessId,
        userId: user?.id || 'usr-system',
        userProfile: user,
        userRole: activeBusiness?.role,
        module: 'employees',
        action: 'edit',
        recordId: emp.id,
        recordTitle: emp.name,
        reason: 'Resent invitation',
      });
    } catch (err: any) {
      showNotice(`Resend Error: ${err.message}`, 'error');
    }
  };

  const handleToggleSuspend = async (emp: Employee) => {
    if (emp.role === 'Owner') {
      showNotice('Cannot suspend the organization Owner.', 'error');
      return;
    }
    try {
      const res = await fetch(`/api/employees/${emp.id}/suspend`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer user:${user?.id || 'usr-ecometrix-001'}`,
          'x-business-id': businessId,
          'x-user-id': user?.id || 'usr-ecometrix-001',
          'x-user-role': activeBusiness?.role || 'Owner',
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update employee status');
      }
      setEmployees((prev) =>
        prev.map((e) => (e.id === emp.id ? { ...e, status: data.employee.status } : e))
      );
      showNotice(data.message || `Employee ${emp.name} is now ${data.employee.status.toLowerCase()}`, 'success');
      await logAuditEvent({
        businessId,
        userId: user?.id || 'usr-system',
        userProfile: user,
        userRole: activeBusiness?.role,
        module: 'employees',
        action: data.employee.status === 'Suspended' ? 'deactivate' : 'edit',
        recordId: emp.id,
        recordTitle: emp.name,
        reason: `Status changed to ${data.employee.status}`,
      });
    } catch (err: any) {
      showNotice(`Status Error: ${err.message}`, 'error');
    }
  };

  const handleExecuteDelete = async () => {
    if (!confirmDeleteEmployee) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/employees/${confirmDeleteEmployee.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer user:${user?.id || 'usr-ecometrix-001'}`,
          'x-business-id': businessId,
          'x-user-id': user?.id || 'usr-ecometrix-001',
          'x-user-role': activeBusiness?.role || 'Owner',
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete employee');
      }
      setEmployees((prev) => prev.filter((e) => e.id !== confirmDeleteEmployee.id));
      showNotice(data.message || `Removed ${confirmDeleteEmployee.name} from team directory.`, 'success');
      await logAuditEvent({
        businessId,
        userId: user?.id || 'usr-system',
        userProfile: user,
        userRole: activeBusiness?.role,
        module: 'employees',
        action: 'delete',
        recordId: confirmDeleteEmployee.id,
        recordTitle: confirmDeleteEmployee.name,
      });
      setConfirmDeleteEmployee(null);
    } catch (err: any) {
      showNotice(`Delete Error: ${err.message}`, 'error');
      setConfirmDeleteEmployee(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = employees.filter((e) => {
    const matchesSearch =
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: Employee['status']) => {
    switch (status) {
      case 'Active':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'Invited':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Email Verified':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Profile Pending':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Suspended':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F172A] flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-[#4F46E5]" />
            <span>Team & Employees</span>
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Manage organization members, secure invitations, system roles, and department permissions for {activeBusiness?.name || 'your business'}.
          </p>
        </div>
        {isOwnerOrAdmin && (
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#4F46E5] text-white text-xs font-semibold rounded-lg hover:bg-[#4338CA] transition-colors shadow-xs self-start"
          >
            <Plus className="w-4 h-4" />
            <span>Add Employee</span>
          </button>
        )}
      </div>

      {notification && (
        <div
          className={`p-3 rounded-lg flex items-center justify-between text-xs border ${
            notification.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-indigo-50 border-indigo-200 text-indigo-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-[#4F46E5] shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-[#64748B] hover:text-[#0F172A] p-1 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="flex items-center gap-3 w-full sm:flex-1">
          <Search className="w-4 h-4 text-[#94A3B8] shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search team members by name, email, department, or role..."
            className="w-full text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-[#F1F5F9]">
          <span className="text-[11px] font-medium text-[#64748B]">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5] bg-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Invited">Invited</option>
            <option value="Email Verified">Email Verified</option>
            <option value="Profile Pending">Profile Pending</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Employees Grid / Empty State */}
      {filtered.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-[#E2E8F0] text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-[#4F46E5] flex items-center justify-center mx-auto">
            <UserCheck className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#0F172A]">No employees yet</h3>
            <p className="text-xs text-[#64748B] max-w-sm mx-auto">
              Add your first team member to start managing your team and secure permissions.
            </p>
          </div>
          {isOwnerOrAdmin && (
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#4F46E5] text-white text-xs font-semibold rounded-lg hover:bg-[#4338CA] transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Employee</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((emp) => (
            <div
              key={emp.id}
              className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs space-y-4 flex flex-col justify-between hover:border-[#4F46E5]/40 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 text-[#4F46E5] font-bold flex items-center justify-center text-sm shrink-0">
                      {emp.first_name ? emp.first_name.charAt(0) : emp.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-[#0F172A] truncate">{emp.name}</h3>
                      <p className="text-[11px] text-[#64748B] truncate">{emp.job_title || emp.role}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${getStatusBadge(emp.status)}`}>
                    {emp.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-[#475569]">
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                    <span className="truncate">{emp.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                    <span>{emp.department} • {emp.employment_type || 'Full-Time'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1 font-semibold text-[#4F46E5]">
                  <Shield className="w-3.5 h-3.5" />
                  <span>{emp.role}</span>
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setViewingEmployee(emp)}
                    title="View Profile"
                    className="p-1.5 text-[#64748B] hover:text-[#4F46E5] hover:bg-[#EEF2FF] rounded transition-colors"
                  >
                    <UserCheck className="w-4 h-4" />
                  </button>
                  {isOwnerOrAdmin && (
                    <>
                      <button
                        onClick={() => handleOpenEditModal(emp)}
                        title="Edit Employee"
                        className="p-1.5 text-[#64748B] hover:text-[#4F46E5] hover:bg-[#EEF2FF] rounded transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {emp.role !== 'Owner' && (
                        <>
                          {(emp.status === 'Invited' || emp.status === 'Profile Pending') && (
                            <button
                              onClick={() => handleResendInvite(emp)}
                              title="Resend Invitation"
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleToggleSuspend(emp)}
                            title={emp.status === 'Suspended' ? 'Activate Account' : 'Suspend Account'}
                            className={`p-1.5 rounded transition-colors ${
                              emp.status === 'Suspended' ? 'text-green-600 hover:bg-green-50' : 'text-amber-600 hover:bg-amber-50'
                            }`}
                          >
                            {emp.status === 'Suspended' ? <UserCheck2 className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteEmployee(emp)}
                            title="Remove Employee"
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-bold text-[#0F172A]">
              {editingEmployee ? 'Edit Team Member' : 'Invite Team Member'}
            </h2>
            {!editingEmployee && (
              <p className="text-xs text-[#64748B]">
                An invitation will be sent to this email address with secure onboarding instructions.
              </p>
            )}

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEmployee} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Ali"
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Khan"
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. employee@gmail.com"
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">System Role *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5] bg-white"
                  >
                    <option value="Owner">Owner</option>
                    <option value="Admin">Admin</option>
                    <option value="Manager">Manager</option>
                    <option value="Finance">Finance</option>
                    <option value="Sales">Sales</option>
                    <option value="Employee">Employee</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5] bg-white"
                  >
                    <option value="Customer Support">Customer Support</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Executive">Executive</option>
                    <option value="Finance">Finance</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Legal">Legal</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Operations">Operations</option>
                    <option value="Sales & CRM">Sales & CRM</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Job Title</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Account Executive"
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">Employment Type</label>
                  <select
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5] bg-white"
                  >
                    <option value="Full-Time">Full-Time</option>
                    <option value="Part-Time">Part-Time</option>
                    <option value="Contractor">Contractor</option>
                    <option value="Intern">Intern</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">Notes / Internal Memo</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional onboarding notes..."
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-[#E2E8F0] text-xs font-medium text-[#64748B] rounded-lg hover:bg-[#F8FAFC] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#4F46E5] text-white text-xs font-medium rounded-lg hover:bg-[#4338CA] shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <span>{editingEmployee ? 'Saving Changes...' : 'Sending Invitation...'}</span>
                  ) : (
                    <span>{editingEmployee ? 'Save Changes' : 'Send Invitation'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Employee Detail Modal */}
      {viewingEmployee && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-indigo-50 text-[#4F46E5] font-bold flex items-center justify-center text-base">
                  {viewingEmployee.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#0F172A]">{viewingEmployee.name}</h2>
                  <p className="text-xs text-[#64748B]">{viewingEmployee.job_title || viewingEmployee.role}</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadge(viewingEmployee.status)}`}>
                {viewingEmployee.status}
              </span>
            </div>

            <div className="space-y-3 pt-2 text-xs border-t border-[#F1F5F9]">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Email Address:</span>
                <span className="font-semibold text-[#0F172A]">{viewingEmployee.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">System Role:</span>
                <span className="font-semibold text-[#4F46E5]">{viewingEmployee.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Department:</span>
                <span className="font-semibold text-[#0F172A]">{viewingEmployee.department}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Employment Type:</span>
                <span className="font-semibold text-[#0F172A]">{viewingEmployee.employment_type || 'Full-Time'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Phone:</span>
                <span className="font-semibold text-[#0F172A]">{viewingEmployee.phone || 'Not provided'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Invited / Created:</span>
                <span className="text-[#0F172A]">{new Date(viewingEmployee.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Last Login:</span>
                <span className="text-[#0F172A]">
                  {viewingEmployee.last_login ? new Date(viewingEmployee.last_login).toLocaleString() : 'Never logged in'}
                </span>
              </div>
              {viewingEmployee.notes && (
                <div className="pt-2 border-t border-[#F1F5F9]">
                  <span className="block text-[#64748B] mb-1">Notes:</span>
                  <p className="text-[#0F172A] bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E2E8F0]">
                    {viewingEmployee.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-[#E2E8F0]">
              <button
                onClick={() => setViewingEmployee(null)}
                className="px-4 py-2 bg-[#4F46E5] text-white text-xs font-semibold rounded-lg hover:bg-[#4338CA]"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Employee Confirmation Modal */}
      {confirmDeleteEmployee && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">Remove Team Member</h3>
                <p className="text-xs text-[#64748B]">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-xs text-[#334155] leading-relaxed">
              Are you sure you want to remove <strong className="text-[#0F172A]">{confirmDeleteEmployee.name}</strong> ({confirmDeleteEmployee.email}) from <strong className="text-[#0F172A]">{activeBusiness?.name || 'this organization'}</strong>?
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[11px] text-amber-800">
              Their access to this business workspace will be revoked immediately. Audit trails and past business activity records will be preserved.
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setConfirmDeleteEmployee(null)}
                className="px-4 py-2 border border-[#E2E8F0] text-xs font-medium text-[#64748B] rounded-lg hover:bg-[#F8FAFC] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleExecuteDelete}
                className="px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? 'Removing...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success & Direct Access Link Modal */}
      {lastCreatedEmployee && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">Employee Sub-Profile Ready!</h3>
                <p className="text-xs text-[#64748B]">Ready for immediate login and task execution</p>
              </div>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3.5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Name:</span>
                <span className="font-semibold text-[#0F172A]">{lastCreatedEmployee.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Email ID:</span>
                <span className="font-mono text-[#0F172A] font-semibold">{lastCreatedEmployee.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Assigned Role:</span>
                <span className="font-semibold text-[#4F46E5]">{lastCreatedEmployee.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Department:</span>
                <span className="font-medium text-[#0F172A]">{lastCreatedEmployee.department}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#0F172A]">Direct Employee Login Link:</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={loginLinkUrl}
                  onChange={(e) => setLoginLinkUrl(e.target.value)}
                  className="block w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-xs font-mono text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(loginLinkUrl);
                    showNotice(`Copied login link for ${lastCreatedEmployee.email}!`, 'success');
                  }}
                  className="px-3 py-2 bg-[#4F46E5] text-white text-xs font-semibold rounded-lg hover:bg-[#4338CA] shrink-0"
                >
                  Copy Link
                </button>
              </div>
              <p className="text-[11px] text-[#64748B] mt-1">
                Share this login URL and email with the employee. They can sign in instantly with their email and perform tasks specific to their assigned role.
              </p>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-[#E2E8F0]">
              <button
                onClick={() => setLastCreatedEmployee(null)}
                className="px-4 py-2 bg-[#4F46E5] text-white text-xs font-semibold rounded-lg hover:bg-[#4338CA]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
