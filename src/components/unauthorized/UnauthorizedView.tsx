import React from 'react';
import { ShieldAlert, ArrowLeft, Home, Building2, UserCheck } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';

interface UnauthorizedViewProps {
  onBackToDashboard?: () => void;
  attemptedPath?: string;
}

export const UnauthorizedView: React.FC<UnauthorizedViewProps> = ({
  onBackToDashboard,
  attemptedPath,
}) => {
  const { activeBusiness, user } = useAuth();

  const handleReturn = () => {
    if (onBackToDashboard) {
      onBackToDashboard();
    } else {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <div
      id="unauthorized-access-container"
      className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6"
    >
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-8 text-center animate-in fade-in zoom-in-95 duration-200">
        {/* Security Shield Icon */}
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[#FEF2F2] border border-[#FEE2E2] flex items-center justify-center text-[#DC2626] mb-5 shadow-2xs">
          <ShieldAlert className="w-7 h-7" />
        </div>

        {/* Header & Clean Message */}
        <h1
          id="unauthorized-title"
          className="text-xl font-bold text-[#0F172A] tracking-tight"
        >
          Access Restricted
        </h1>
        <p
          id="unauthorized-message"
          className="text-sm text-[#64748B] mt-2 leading-relaxed"
        >
          You don't have permission to access this section.
        </p>

        {/* Current Context (Non-leaking, human-friendly) */}
        {activeBusiness && (
          <div className="mt-5 p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-left flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#64748B]" />
              <span className="font-medium text-[#0F172A] truncate max-w-[160px]">
                {activeBusiness.name}
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-semibold text-[#475569] bg-[#FFFFFF] px-2 py-0.5 rounded-md border border-[#E2E8F0]">
              <UserCheck className="w-3.5 h-3.5 text-[#4F46E5]" />
              <span>Role: {activeBusiness.role}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-2.5">
          <button
            id="back-to-dashboard-btn"
            onClick={handleReturn}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>

          <p className="text-[11px] text-[#94A3B8] mt-1">
            If you require access, please contact your workspace Owner or Administrator.
          </p>
        </div>
      </div>
    </div>
  );
};
