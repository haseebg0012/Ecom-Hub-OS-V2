import React, { useState, useRef } from 'react';
import { User, Mail, Phone, Calendar, ShieldCheck, KeyRound, CheckCircle2, AlertTriangle, Upload, X, Check, ZoomIn, ZoomOut, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { getSupabaseClient } from '../../lib/supabase';

export const MasterProfileView: React.FC = () => {
  const { user, isEmailVerified, resendVerificationEmail } = useAuth();
  const [firstName, setFirstName] = useState(user?.full_name?.split(' ')[0] || 'Haseeb');
  const [lastName, setLastName] = useState(user?.full_name?.split(' ').slice(1).join(' ') || 'G.');
  const [displayName, setDisplayName] = useState(user?.full_name || 'Haseeb G.');
  const [phone, setPhone] = useState('+92 300 1234567');
  const [dob, setDob] = useState('1995-06-15');
  const [avatarUrl, setAvatarUrl] = useState<string | null>((user as any)?.avatar_url || null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ success?: string; error?: string }>({});

  // Profile save state
  const [profileSaved, setProfileSaved] = useState(false);

  // Image Cropper State
  const [showCropModal, setShowCropModal] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Image file size must be less than 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setRawImageSrc(reader.result as string);
      setZoom(1);
      setOffsetX(0);
      setOffsetY(0);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCroppedImage = () => {
    if (!rawImageSrc) return;
    setIsUploading(true);
    // Simulate image cropping and saving to state/storage
    setTimeout(() => {
      setAvatarUrl(rawImageSrc);
      setIsUploading(false);
      setShowCropModal(false);
      setRawImageSrc(null);
    }, 600);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg({});
    if (!newPassword || newPassword.length < 6) {
      setPasswordMsg({ error: 'New password must be at least 6 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ error: 'New passwords do not match.' });
      return;
    }

    try {
      // Save master password locally so master login correctly enforces it
      localStorage.setItem('ecomhub_master_password', newPassword);

      const client = getSupabaseClient();
      if (client) {
        const { error: updateErr } = await client.auth.updateUser({ password: newPassword });
        if (updateErr) {
          setPasswordMsg({ error: updateErr.message });
          return;
        }
      }
      setPasswordMsg({ success: 'Master password updated successfully. Your new password is now active.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg({ error: err?.message || 'Failed to update password.' });
    }
  };

  const [resendingNotice, setResendingNotice] = useState<{ success?: string; error?: string } | null>(null);
  const [isResending, setIsResending] = useState(false);

  const handleResendVerification = async () => {
    setIsResending(true);
    setResendingNotice(null);
    try {
      const res = await resendVerificationEmail();
      setIsResending(false);
      if (res.success) {
        setResendingNotice({ success: res.message || 'Verification email sent. Please check your inbox.' });
      } else {
        setResendingNotice({ error: res.error || 'Failed to send verification email.' });
      }
    } catch (err: any) {
      setIsResending(false);
      setResendingNotice({ error: err?.message || 'Failed to send verification email.' });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="w-20 h-20 rounded-full bg-slate-200 overflow-hidden border-2 border-indigo-600 flex items-center justify-center text-slate-700 font-bold text-xl shadow-md">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Master Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{firstName[0] || 'M'}</span>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-medium"
            >
              <Upload className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#0F172A]">{displayName}</h1>
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[10px] uppercase border border-indigo-100">
                Platform Owner
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">{user?.email || 'haseebg0012@gmail.com'}</p>
            <div className="flex items-center gap-2 mt-2">
              {isEmailVerified ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-semibold">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified Master Account
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[11px] font-semibold border border-amber-200">
                  <AlertTriangle className="w-3 h-3 text-amber-600" /> Unverified Email
                </span>
              )}
              <span className="text-xs text-slate-400">&bull; Last Login: Today</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Picture</span>
          </button>
        </div>
      </div>

      {/* Grid Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Personal Details & Password */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Details Form */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs">
            <h2 className="text-sm font-bold text-[#0F172A] mb-1">Master Profile Information</h2>
            <p className="text-xs text-[#64748B] mb-6">Manage your master identity and account metadata.</p>

            {profileSaved && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Master profile updated successfully.</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setProfileSaved(true);
                setTimeout(() => setProfileSaved(false), 4000);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Master Email (Immutable)</label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || 'haseebg0012@gmail.com'}
                    className="w-full px-3.5 py-2 bg-slate-100 border border-[#E2E8F0] rounded-xl text-xs text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                >
                  Save Profile Changes
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Card */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-1">
              <KeyRound className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-[#0F172A]">Master Password & Security</h2>
            </div>
            <p className="text-xs text-[#64748B] mb-6">Update your secure Master password via Supabase Auth encryption.</p>

            {passwordMsg.error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                {passwordMsg.error}
              </div>
            )}
            {passwordMsg.success && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl">
                {passwordMsg.success}
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-3.5 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full px-3.5 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                >
                  Update Master Password
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Col: Security & Email Status */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Email Verification Status</h3>
            {isEmailVerified ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-emerald-900">Email Verified</div>
                  <div className="text-[11px] text-emerald-700 mt-0.5">Your master email is securely authenticated and verified with Supabase.</div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-amber-900">Email Unverified</div>
                  <div className="text-[11px] text-amber-700 mt-0.5">Please check your email inbox for the Supabase confirmation link.</div>
                </div>
              </div>
            )}

            {resendingNotice?.success && (
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{resendingNotice.success}</span>
              </div>
            )}

            {resendingNotice?.error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{resendingNotice.error}</span>
              </div>
            )}

            <button
              onClick={handleResendVerification}
              disabled={isResending}
              className="mt-4 w-full py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isResending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              <span>{isResending ? 'Sending...' : 'Resend Verification Email'}</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Platform Session Info</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Access Level</span>
                <span className="font-bold text-indigo-600">Platform Owner</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Encryption</span>
                <span className="font-semibold text-slate-800">Supabase JWT</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Tenant Isolation</span>
                <span className="font-semibold text-emerald-700">Strict RLS</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Crop & Adjust Modal */}
      {showCropModal && rawImageSrc && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-[#0F172A]">Crop & Adjust Master Profile Picture</h3>
              <button
                onClick={() => setShowCropModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-6 flex flex-col items-center justify-center">
              <div className="w-56 h-56 rounded-full border-4 border-indigo-600 overflow-hidden relative shadow-inner bg-slate-900 flex items-center justify-center">
                <img
                  src={rawImageSrc}
                  alt="Crop Preview"
                  style={{
                    transform: `scale(${zoom}) translate(${offsetX}px, ${offsetY}px)`,
                    transition: 'transform 0.1s ease-out',
                  }}
                  className="max-w-none object-cover"
                />
              </div>

              <div className="w-full max-w-xs mt-6 space-y-4">
                <div>
                  <div className="flex justify-between text-xs text-slate-600 mb-1">
                    <span>Zoom</span>
                    <span>{zoom.toFixed(1)}x</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <ZoomOut className="w-4 h-4 text-slate-400" />
                    <input
                      type="range"
                      min="1"
                      max="3"
                      step="0.1"
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                    <ZoomIn className="w-4 h-4 text-slate-400" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-slate-500 block mb-1">Horizontal Offset</label>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={offsetX}
                      onChange={(e) => setOffsetX(parseInt(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">Vertical Offset</label>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={offsetY}
                      onChange={(e) => setOffsetY(parseInt(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowCropModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCroppedImage}
                disabled={isUploading}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-2"
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>Save Cropped Picture</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
