import React, { useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import { Lock, Eye, EyeOff, CheckCircle2, ArrowRight, ShieldCheck, Loader2, AlertCircle, LogOut } from 'lucide-react';

interface ForceChangePasswordViewProps {
  onComplete?: () => void;
}

export const ForceChangePasswordView: React.FC<ForceChangePasswordViewProps> = ({ onComplete }) => {
  const { user, activeBusiness, completePasswordChange, logout } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);

  // Validation rules
  const hasMinLength = newPassword.length >= 6;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isFormValid = hasMinLength && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!hasMinLength) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage('New passwords do not match. Please verify.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await completePasswordChange(newPassword);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to update password. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Password successfully updated, show welcome state
      setIsSubmitting(false);
      setShowWelcome(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleContinueToDashboard = () => {
    if (onComplete) {
      onComplete();
    }
  };

  // 1. Welcome Screen after successful password change
  if (showWelcome) {
    const assignedRoles = activeBusiness?.roles && activeBusiness.roles.length > 0
      ? activeBusiness.roles
      : [activeBusiness?.role || 'Employee'];
    const departmentName = (user as any)?.department || 'Team Member';

    return (
      <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative z-10 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              Account Activated
            </span>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Welcome to EcomHub OS
            </h1>
            <p className="text-xs text-slate-400">
              Your permanent password is now set. Your role-based workspace is configured and ready.
            </p>
          </div>

          {/* Employee Info Card */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 text-left space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs text-slate-400">Employee Name</span>
              <span className="text-xs font-semibold text-white">{user?.full_name || 'Team Member'}</span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs text-slate-400">Email Address</span>
              <span className="text-xs font-mono text-slate-300">{user?.email}</span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs text-slate-400">Department</span>
              <span className="text-xs font-semibold text-indigo-300">{departmentName}</span>
            </div>

            <div className="space-y-1.5 pt-0.5">
              <span className="text-xs text-slate-400 block">Assigned Role(s)</span>
              <div className="flex flex-wrap gap-1.5">
                {assignedRoles.map((r, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{r}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleContinueToDashboard}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer group"
          >
            <span>Continue to Dashboard</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    );
  }

  // 2. Change Password Screen
  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative z-10 space-y-6">
        {/* Brand & Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/10 mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Choose a Permanent Password
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Welcome to EcomHub OS! Because your account was provisioned with a temporary password, you must set a secure permanent password to continue.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              New Password *
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new permanent password"
                className="w-full px-3.5 py-2.5 pr-10 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 transition-colors font-mono"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Confirm New Password *
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full px-3.5 py-2.5 pr-10 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 transition-colors font-mono"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Password Validation Checklist */}
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 space-y-1.5 text-[11px]">
            <div className="flex items-center gap-2">
              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                hasMinLength ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'
              }`}>
                ✓
              </div>
              <span className={hasMinLength ? 'text-slate-300 font-medium' : 'text-slate-500'}>
                At least 6 characters long
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                passwordsMatch ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'
              }`}>
                ✓
              </div>
              <span className={passwordsMatch ? 'text-slate-300 font-medium' : 'text-slate-500'}>
                Both passwords match
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving permanent password...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Set Permanent Password & Activate</span>
              </>
            )}
          </button>
        </form>

        {/* Logout Fallback */}
        <div className="pt-2 border-t border-slate-800 text-center">
          <button
            type="button"
            onClick={() => logout()}
            className="text-xs text-slate-400 hover:text-slate-300 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cancel and sign out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
