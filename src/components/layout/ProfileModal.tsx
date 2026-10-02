import React, { useState } from 'react';
import { X, User, Check, Loader2, AlertCircle, ShieldCheck, Lock, Phone, Bell } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { getSupabaseClient } from '../../lib/supabase';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, activeBusiness, updateProfile, isEmailVerified, resendVerificationEmail } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [phone, setPhone] = useState((user as any)?.phone || '');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [verificationNotice, setVerificationNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordNotice, setPasswordNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Sync state whenever modal opens or user updates
  React.useEffect(() => {
    if (isOpen && user) {
      setFullName(user.full_name || '');
      setAvatarUrl(user.avatar_url || '');
      setPhone((user as any)?.phone || '');
      setErrorMsg('');
      setSuccessNotice(false);
    }
  }, [isOpen, user]);

  // Transition employee status from 'Added' to 'Profile Active' when opening profile
  React.useEffect(() => {
    if (isOpen && user?.email) {
      try {
        const rawEmps = localStorage.getItem('ecomhub_employees');
        if (rawEmps) {
          const emps = JSON.parse(rawEmps);
          let changed = false;
          const updated = emps.map((e: any) => {
            if (e.email?.toLowerCase() === user.email.toLowerCase() && e.status === 'Added') {
              changed = true;
              return { ...e, status: 'Profile Active' };
            }
            return e;
          });
          if (changed) {
            localStorage.setItem('ecomhub_employees', JSON.stringify(updated));
            window.dispatchEvent(new Event('ecomhub_employees_updated'));
          }
        }
      } catch {}
    }
  }, [isOpen, user?.email]);

  if (!isOpen) return null;

  const handlePasswordChange = async () => {
    if (!newPassword || newPassword.length < 6) {
      setPasswordNotice({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordNotice({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    setIsChangingPassword(true);
    setPasswordNotice(null);
    try {
      const email = user?.email?.trim().toLowerCase();
      // 1. Authoritative Supabase Auth password update
      const client = getSupabaseClient();
      if (client) {
        const { error: sbErr } = await client.auth.updateUser({
          password: newPassword,
        });
        if (sbErr) throw sbErr;
      }

      if (email) {
        // Update ecomhub_employees cache
        try {
          const rawEmps = localStorage.getItem('ecomhub_employees');
          if (rawEmps) {
            const emps = JSON.parse(rawEmps);
            const updated = emps.map((e: any) =>
              e.email?.trim().toLowerCase() === email
                ? { ...e, password: newPassword, temp_password: newPassword }
                : e
            );
            localStorage.setItem('ecomhub_employees', JSON.stringify(updated));
            window.dispatchEvent(new Event('ecomhub_employees_updated'));
          }
        } catch {}

        // Update ecomhub_members cache
        try {
          const rawMem = localStorage.getItem('ecomhub_members');
          if (rawMem) {
            const members = JSON.parse(rawMem);
            const updatedM = members.map((m: any) =>
              m.profile?.email?.trim().toLowerCase() === email
                ? { ...m, password: newPassword, temp_password: newPassword }
                : m
            );
            localStorage.setItem('ecomhub_members', JSON.stringify(updatedM));
          }
        } catch {}
      }

      setPasswordNotice({ type: 'success', text: 'Password successfully updated! Your new password is now active.' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordNotice({ type: 'error', text: err.message || 'Failed to update password.' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setVerificationNotice(null);
    const res = await resendVerificationEmail();
    setIsResending(false);
    if (res.success) {
      setVerificationNotice({ type: 'success', text: res.message || 'Verification email sent. Please check your inbox.' });
    } else {
      setVerificationNotice({ type: 'error', text: res.error || 'Failed to send verification email.' });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg('');
    setSuccessNotice(false);

    const res = await updateProfile({
      full_name: fullName.trim(),
      avatar_url: avatarUrl.trim() || null,
    });

    setIsSaving(false);
    if (res.success) {
      setSuccessNotice(true);
      setTimeout(() => {
        setSuccessNotice(false);
        onClose();
      }, 1000);
    } else {
      setErrorMsg(res.error || 'Failed to update profile');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs">
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#0F172A]">User Profile</h2>
              <p className="text-xs text-[#64748B]">Personal details and identity</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#94A3B8] hover:text-[#0F172A] p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {errorMsg}
            </div>
          )}

          {successNotice && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-xs rounded-lg flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>Profile updated successfully!</span>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-[#0F172A]">
                Email Address & Verification
              </label>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${isEmailVerified ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isEmailVerified ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                {isEmailVerified ? 'Verified' : 'Unverified'}
              </span>
            </div>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="w-full px-3 py-2 bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg text-sm text-[#64748B] cursor-not-allowed mb-2"
            />
            {!isEmailVerified && (
              <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-800">
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>Email confirmation required.</span>
                </span>
                <button
                  type="button"
                  disabled={isResending}
                  onClick={handleResend}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-medium transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                >
                  {isResending && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Send Email to Verify</span>
                </button>
              </div>
            )}
            {verificationNotice && (
              <div className={`mt-2 p-2.5 rounded-lg text-xs ${verificationNotice.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                {verificationNotice.text}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Haseeb G."
              className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
              Avatar URL (Optional)
            </label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-[#64748B]" />
              <span>Contact Phone</span>
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
            />
          </div>

          {/* Preferences */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#4F46E5]" />
              <div>
                <p className="text-xs font-semibold text-[#0F172A]">Email Notifications</p>
                <p className="text-[11px] text-[#64748B]">Receive task assignments & system updates</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={emailNotifications}
              onChange={(e) => setEmailNotifications(e.target.checked)}
              className="rounded border-[#CBD5E1] text-[#4F46E5] focus:ring-[#4F46E5] cursor-pointer"
            />
          </div>

          {/* Read-Only System Roles & Organization (Owner Controlled) */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#0F172A] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#4F46E5]" />
                <span>Assigned System Roles</span>
              </span>
              <span className="text-[10px] text-[#64748B] flex items-center gap-1 bg-white px-2 py-0.5 rounded-full border border-[#E2E8F0]">
                <Lock className="w-3 h-3 text-[#94A3B8]" />
                <span>Owner Controlled</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(activeBusiness?.roles && activeBusiness.roles.length > 0 ? activeBusiness.roles : [activeBusiness?.role || 'Employee']).map((r, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE]">
                  {r}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-[#64748B]">
              Department access and system permissions cannot be modified by employees. Contact your organization Owner to request role changes.
            </p>
          </div>

          <div className="border-t border-[#E2E8F0] pt-4 mt-4">
            <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-2">
              Security & Password Change
            </h3>
            <div className="space-y-3 bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0]">
              <div>
                <label className="block text-[11px] font-semibold text-[#334155] mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#334155] mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                />
              </div>
              <button
                type="button"
                onClick={handlePasswordChange}
                disabled={isChangingPassword || !newPassword}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                {isChangingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Update Password</span>
              </button>
              {passwordNotice && (
                <div className={`p-2 rounded text-[11px] ${passwordNotice.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                  {passwordNotice.text}
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
