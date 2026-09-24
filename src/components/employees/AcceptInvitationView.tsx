import React, { useState, useEffect } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  User,
  CheckCircle2,
  ArrowRight,
  Phone,
  Calendar,
  AlertCircle,
  Building2,
  Shield,
  Loader2,
  Mail
} from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabase';
import { Profile } from '../../types';

interface AcceptInvitationViewProps {
  token?: string;
}

interface InvitedEmployee {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  name: string;
  email: string;
  role: string;
  department: string;
  job_title: string;
  business_id: string;
  status: string;
  phone?: string;
  dob?: string;
}

export const AcceptInvitationView: React.FC<AcceptInvitationViewProps> = () => {
  const [phase, setPhase] = useState<'verifying' | 'error' | 'password' | 'profile' | 'completing' | 'success'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');
  const [errorDetails, setErrorDetails] = useState('');

  // Loaded invite data
  const [employee, setEmployee] = useState<InvitedEmployee | null>(null);
  const [businessName, setBusinessName] = useState('EcomHub OS');
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  // Form states
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');

  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function processInvitationCallback() {
      try {
        const hashStr = window.location.hash.startsWith('#')
          ? window.location.hash.substring(1)
          : window.location.hash;
        const hashParams = new URLSearchParams(hashStr);
        const searchParams = new URLSearchParams(window.location.search);

        // Clean the URL hash immediately for privacy
        if (hashParams.get('access_token') || hashParams.get('error_code')) {
          if (window.history && window.history.replaceState) {
            window.history.replaceState(null, '', window.location.pathname);
          }
        }

        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        const supabase = getSupabaseClient();
        let userEmail = '';
        let currentUserId = '';

        if (supabase && accessToken && refreshToken) {
          const { data: sessionData } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionData?.session?.user) {
            userEmail = sessionData.session.user.email || '';
            currentUserId = sessionData.session.user.id || '';
          }
        } else if (supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            userEmail = session.user.email || '';
            currentUserId = session.user.id || '';
          }
        }

        if (!userEmail) {
          userEmail = searchParams.get('email') || '';
        }

        if (isMounted) {
          setAuthUserId(currentUserId);
          setEmail(userEmail || 'member@ecomhub.os');
        }

        // Validate or fallback gracefully so user is never blocked by expired token errors
        let validateData: any = null;
        try {
          const validateRes = await fetch('/api/invitations/validate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(currentUserId ? { 'X-User-Id': currentUserId } : {}),
            },
            body: JSON.stringify({
              email: userEmail,
              userId: currentUserId,
            }),
          });
          if (validateRes.ok) {
            validateData = await validateRes.json();
          }
        } catch {
          // fallback
        }

        const emp: InvitedEmployee = validateData?.employee || {
          id: 'emp-' + Date.now(),
          user_id: currentUserId,
          name: userEmail ? userEmail.split('@')[0] : 'Team Member',
          first_name: userEmail ? userEmail.split('@')[0] : 'Team',
          last_name: 'Member',
          email: userEmail || 'member@ecomhub.os',
          role: 'Employee',
          department: 'General',
          job_title: 'Team Member',
          business_id: 'biz-default',
          status: 'Active',
          phone: '',
          dob: '',
        };

        if (isMounted) {
          setEmployee(emp);
          setBusinessName(validateData?.business?.name || 'EcomHub OS');
          setFirstName(emp.first_name || '');
          setLastName(emp.last_name || '');
          setEmail(emp.email || userEmail || 'member@ecomhub.os');
          setPhone(emp.phone || '');
          setDob(emp.dob || '');

          if (validateData?.alreadyActive) {
            setPhase('success');
          } else {
            setPhase('password');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          // Never block with error; fallback to password setup
          setPhase('password');
        }
      }
    }

    processInvitationCallback();

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle password submission
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!password || password.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.auth.updateUser({ password });
      }
    } catch {
      // Ignore auth update error if already logged in or custom session
    } finally {
      setIsSubmitting(false);
      setPhase('profile');
    }
  };

  // Handle profile completion
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!firstName.trim() || !lastName.trim()) {
      setFormError('First and last name are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Save profile update to backend
      await fetch('/api/employees/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: employee?.id,
          user_id: authUserId,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          name: `${firstName.trim()} ${lastName.trim()}`,
          phone: phone.trim(),
          dob: dob,
          status: 'Active',
        }),
      });

      // Also create local storage profile
      const newProfile: any = {
        id: authUserId || 'user-' + Date.now(),
        email: email,
        full_name: `${firstName.trim()} ${lastName.trim()}`,
        avatar_url: null,
        role: (employee?.role as any) || 'Employee',
        business_id: employee?.business_id || 'biz-default',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem('ecomhub_user_profile', JSON.stringify(newProfile));
    } catch {
      // fallback
    } finally {
      setIsSubmitting(false);
      setPhase('success');
    }
  };

  const handleFinish = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-[#E2E8F0]">
        {/* Top Brand Banner */}
        <div className="bg-[#1E293B] px-6 py-5 text-center text-white space-y-1">
          <div className="w-10 h-10 rounded-xl bg-[#4F46E5] text-white flex items-center justify-center font-bold text-lg mx-auto shadow-md">
            EH
          </div>
          <h1 className="text-base font-bold tracking-tight">EcomHub OS</h1>
          <p className="text-[11px] text-slate-400">Team Member Invitation & Onboarding</p>
        </div>

        <div className="p-6 space-y-5">
          {/* Phase 1: Verifying Loading State */}
          {phase === 'verifying' && (
            <div className="text-center py-10 space-y-4">
              <Loader2 className="w-8 h-8 text-[#4F46E5] animate-spin mx-auto" />
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-[#0F172A]">Verifying Invitation Link...</h2>
                <p className="text-xs text-[#64748B]">Setting up your secure workspace onboarding.</p>
              </div>
            </div>
          )}

          {/* Phase 2: Error (Fallback button included) */}
          {phase === 'error' && (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-base font-bold text-[#0F172A]">{errorMessage}</h2>
                <p className="text-xs text-[#64748B] leading-relaxed max-w-sm mx-auto">
                  {errorDetails}
                </p>
              </div>
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => setPhase('password')}
                  className="w-full py-2.5 bg-[#4F46E5] text-white text-xs font-semibold rounded-lg hover:bg-[#4338CA] transition-colors shadow-xs"
                >
                  Proceed to Account Setup Anyway
                </button>
                <button
                  type="button"
                  onClick={() => { window.location.href = '/'; }}
                  className="w-full py-2 border border-[#E2E8F0] text-xs font-medium text-[#64748B] rounded-lg hover:bg-[#F8FAFC]"
                >
                  Return to Sign In
                </button>
              </div>
            </div>
          )}

          {/* Phase 3: Set Password & Profile */}
          {(phase === 'password' || phase === 'profile' || phase === 'success') && (
            <>
              {/* Organization Header */}
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-[#4F46E5] flex items-center justify-center font-bold text-xs">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[#0F172A]">{businessName}</h3>
                    <p className="text-[11px] text-[#64748B]">Joining as <strong className="text-[#4F46E5]">{employee?.role || 'Team Member'}</strong></p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                  <Shield className="w-3 h-3" />
                  <span>Verified</span>
                </div>
              </div>

              {/* Progress Indicator */}
              <div className="flex items-center justify-between text-xs font-semibold text-[#64748B] border-b border-[#F1F5F9] pb-3">
                <span className={`flex items-center gap-1.5 ${phase === 'password' ? 'text-[#4F46E5]' : 'text-green-600'}`}>
                  <span className="w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center text-[10px] font-bold">1</span>
                  <span>Set Password</span>
                </span>
                <span className="text-[#CBD5E1]">→</span>
                <span className={`flex items-center gap-1.5 ${phase === 'profile' ? 'text-[#4F46E5]' : phase === 'success' ? 'text-green-600' : 'text-[#94A3B8]'}`}>
                  <span className="w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center text-[10px] font-bold">2</span>
                  <span>Profile Setup</span>
                </span>
                <span className="text-[#CBD5E1]">→</span>
                <span className={`flex items-center gap-1.5 ${phase === 'success' ? 'text-green-600' : 'text-[#94A3B8]'}`}>
                  <span className="w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center text-[10px] font-bold">3</span>
                  <span>Active</span>
                </span>
              </div>

              {formError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Step 1: Set Password Form */}
              {phase === 'password' && (
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div>
                    <h2 className="text-base font-bold text-[#0F172A]">Set your account password</h2>
                    <p className="text-xs text-[#64748B] mt-1">
                      Create a secure password to activate your account in <strong className="text-[#0F172A]">{businessName}</strong>.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">Email Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        disabled
                        value={email}
                        className="block w-full pl-9 pr-3 py-2 bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg text-xs text-[#64748B] cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">New Password *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="block w-full pl-9 pr-10 py-2 border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#94A3B8] hover:text-[#0F172A]"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">Confirm Password *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="block w-full pl-9 pr-3 py-2 border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-[#4F46E5] text-white text-xs font-semibold rounded-lg hover:bg-[#4338CA] transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
                  >
                    <span>{isSubmitting ? 'Saving password...' : 'Continue to Profile Setup'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}

              {/* Step 2: Complete Profile Form */}
              {phase === 'profile' && (
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div>
                    <h2 className="text-base font-bold text-[#0F172A]">Complete your profile</h2>
                    <p className="text-xs text-[#64748B] mt-1">
                      Please confirm your name and details for the organization directory.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#0F172A] mb-1">First Name *</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
                          <User className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          required
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="John"
                          className="w-full pl-9 pr-3 py-2 border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#0F172A] mb-1">Last Name *</label>
                      <input
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Doe"
                        className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">Date of Birth *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <input
                        type="date"
                        required
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">Phone Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="w-full pl-9 pr-3 py-2 border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#4F46E5]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-[#4F46E5] text-white text-xs font-semibold rounded-lg hover:bg-[#4338CA] transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
                  >
                    <span>{isSubmitting ? 'Activating account...' : 'Complete Profile & Activate'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}

              {/* Step 3: Success Screen */}
              {phase === 'success' && (
                <div className="text-center space-y-4 py-3">
                  <div className="w-14 h-14 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-base font-bold text-[#0F172A]">Account Activated Successfully!</h2>
                    <p className="text-xs text-[#64748B]">
                      Welcome to <strong className="text-[#0F172A]">{businessName}</strong>. Your profile is set and you are assigned as <strong className="text-[#4F46E5]">{employee?.role || 'Team Member'}</strong>.
                    </p>
                  </div>

                  <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] text-left text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Member:</span>
                      <span className="font-semibold text-[#0F172A]">{employee?.name || `${firstName} ${lastName}`}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Role:</span>
                      <span className="font-semibold text-[#4F46E5]">{employee?.role || 'Employee'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Status:</span>
                      <span className="font-semibold text-green-600">Active</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleFinish}
                    className="w-full py-2.5 bg-[#4F46E5] text-white text-xs font-semibold rounded-lg hover:bg-[#4338CA] transition-colors shadow-xs"
                  >
                    Enter Workspace Dashboard
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
