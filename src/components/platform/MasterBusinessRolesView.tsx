import React, { useEffect, useState } from 'react';
import { ShieldCheck, Users, Search, Plus, Check, Layers, Briefcase, Filter, Loader2 } from 'lucide-react';
import { apiFetch } from '../../lib/supabase';

export const MasterBusinessRolesView: React.FC = () => {
  const [roles, setRoles] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<any | null>(null);

  const fetchRoles = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch('/api/platform/roles');
      if (res.ok) {
        const data = await res.json();
        setRoles(data.roles || []);
      }
    } catch (err) {
      console.error('Error fetching business roles:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const departments = ['All', ...Array.from(new Set(roles.map((r) => r.department)))];

  const filteredRoles = roles.filter((role) => {
    const matchesSearch = role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          role.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = selectedDept === 'All' || role.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#4F46E5]/30 text-[#818CF8] text-xs font-medium mb-3">
            <Briefcase className="w-3.5 h-3.5" />
            <span>Master Business Role Catalog</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Standardized Work Profiles & Responsibilities</h1>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl">
            Define and maintain global job profiles that can be enabled for customer workspaces and assigned to employee profiles.
          </p>
        </div>
      </div>

      {/* Controls & Search */}
      <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search roles by name or description..."
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

      {/* Roles Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-[#4F46E5]" />
          <span className="text-xs font-medium">Loading standardized business roles...</span>
        </div>
      ) : filteredRoles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 text-center text-slate-400">
          <Briefcase className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-xs">No business roles match your search criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRoles.map((role) => (
            <div
              key={role.id}
              className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 mb-2">
                      {role.department}
                    </span>
                    <h3 className="text-base font-bold text-[#0F172A]">{role.name}</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {role.status || 'Active'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 line-clamp-3">{role.description}</p>
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between">
                <div className="text-[11px] text-slate-500 font-medium">
                  {role.responsibilities?.length || 0} Responsibilities
                </div>
                <button
                  onClick={() => setSelectedRole(role)}
                  className="px-3 py-1.5 bg-[#F8FAFC] hover:bg-indigo-50 text-[#4F46E5] rounded-xl text-xs font-semibold transition-colors border border-[#E2E8F0]"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Role Modal */}
      {selectedRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#4F46E5] block mb-1">
                  {selectedRole.department} Department
                </span>
                <h2 className="text-xl font-bold text-[#0F172A]">{selectedRole.name}</h2>
              </div>
              <button
                onClick={() => setSelectedRole(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <h4 className="font-bold text-[#0F172A] mb-1">Description</h4>
                <p className="text-slate-600 leading-relaxed">{selectedRole.description}</p>
              </div>

              <div>
                <h4 className="font-bold text-[#0F172A] mb-2">Key Responsibilities</h4>
                <ul className="space-y-1.5 pl-1">
                  {(selectedRole.responsibilities || []).map((resp: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-slate-700">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{resp}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-[#0F172A] mb-2">Default Task Templates</h4>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedRole.default_task_templates || []).map((t: string, idx: number) => (
                    <span key={idx} className="px-2.5 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-slate-700 font-medium">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E2E8F0] flex justify-end">
              <button
                onClick={() => setSelectedRole(null)}
                className="px-5 py-2 bg-[#4F46E5] text-white rounded-xl text-xs font-semibold hover:bg-[#4338CA] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
