import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, ShieldCheck, ArrowRight } from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';

interface ResetPasswordPageProps {
  forcedUserType?: 'master' | 'workspace';
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ forcedUserType }) => {
  const { setIsRecoveryMode } = useAuth();
  const [userType, setUserType] = useState<'master' | 'workspace'>(() => {
    if (forcedUserType) return forcedUserType;
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const ut = searchParams.get('user_type');
      if (ut === 'master') return 'master';
      if (ut === 'workspace') return 'workspace';
      if (window.location.pathname.includes('master') || window.location.hash.includes('master')) return 'master';
    }
    return 'workspace';
  });

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifyingSession, setIsVerifyingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      const client = getSupabaseClient();
      if (!client) {
        if (isMounted) {
          setError('Authentication service is not configured.');
          setIsVerifyingSession(false);
        }
        return;
      }

      try {
        // 1. If hash contains access_token from Supabase recovery redirect, explicitly set session first
        if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
          const hashParams = new URLSearchParams(
            window.location.hash.startsWith('#') ? window.location.hash.substring(1) : window.location.hash
          );
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          if (accessToken && refreshToken) {
            try {
              await client.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
            } catch (setErr) {
              console.warn('Set session error in ResetPasswordPage:', setErr);
            }
          }
          try {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          } catch {
            // Ignore
          }
        }

        // Allow Supabase client to parse URL tokens
        let sessionRes = await client.auth.getSession();
        let session = sessionRes.data.session;

        // Give Supabase an extra tick if session is processing
        if (!session) {
          await new Promise((r) => setTimeout(r, 400));
          sessionRes = await client.auth.getSession();
          session = sessionRes.data.session;
        }

        if (!isMounted) return;

        if (session && session.user) {
          setHasValidSession(true);
          const email = session.user.email || '';
          setUserEmail(email);

          // If email is master email, prioritize master mode
          if (email.toLowerCase() === 'haseebg0012@gmail.com' || email.toLowerCase() === 'haseeb@ecometrixhub.com') {
            setUserType('master');
          }
        } else {
          setHasValidSession(false);
          setError('This password reset link is invalid or has expired. Please request a new link.');
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Failed to verify password reset authorization.');
        }
      } finally {
        if (isMounted) {
          setIsVerifyingSession(false);
        }
      }
    }

    checkSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      setError('Authentication client is unavailable.');
      return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await client.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setIsLoading(false);
        setError(updateError.message || 'Failed to update password.');
        return;
      }

      // Password successfully updated in Supabase Auth
      if (userType === 'master') {
        localStorage.setItem('ecomhub_master_password', password);
      }

      // Clear recovery mode and sign out so user signs in cleanly with their newly established password
      setIsRecoveryMode(false);
      await client.auth.signOut();

      setIsLoading(false);
      setSuccess(true);

      // Smooth automated redirect
      setTimeout(() => {
        if (userType === 'master') {
          window.location.href = '/masterlogin';
        } else {
          window.location.href = '/login';
        }
      }, 2000);
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'An unexpected error occurred while resetting your password.');
    }
  };

  const isMaster = userType === 'master';

  if (isVerifyingSession) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${isMaster ? 'bg-[#0B0F19] text-white' : 'bg-[#F8FAFC] text-[#0F172A]'}`}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#4F46E5]" />
          <p className="text-xs font-medium text-slate-500">Validating password recovery authorization...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-[#4F46E5] selection:text-white ${
        isMaster ? 'bg-[#0B0F19] text-slate-100' : 'bg-[#F8FAFC] text-[#0F172A]'
      }`}
    >
      {/* Background decoration for master */}
      {isMaster && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#4F46E5]/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-900/10 rounded-full blur-3xl"></div>
        </div>
      )}

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center mb-8">
        {/* Brand Header */}
        <div className="inline-flex items-center justify-center gap-3 mb-4">
          {isMaster ? (
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4F46E5] to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-[#4F46E5] flex items-center justify-center text-white font-bold text-base shadow-xs">
              EH
            </div>
          )}
          <div className="text-left">
            <h1 className={`text-xl font-bold tracking-tight leading-none ${isMaster ? 'text-white' : 'text-[#0F172A]'}`}>
              {isMaster ? 'EcomHub OS' : 'EcomHub'}
            </h1>
            <span className={`text-[11px] font-semibold tracking-widest uppercase mt-1 block ${isMaster ? 'text-indigo-400' : 'text-[#64748B]'}`}>
              {isMaster ? 'Control Center Security' : 'Business OS'}
            </span>
          </div>
        </div>

        {/* Card */}
        <div
          className={`rounded-2xl p-8 shadow-2xl backdrop-blur-xl border ${
            isMaster
              ? 'bg-slate-900/80 border-slate-800 text-slate-100'
              : 'bg-white border-[#E2E8F0] shadow-xs text-[#0F172A]'
          }`}
        >
          <div className="mb-6 text-center">
            <h2 className={`text-2xl font-bold tracking-tight mb-1 ${isMaster ? 'text-white' : 'text-[#0F172A]'}`}>
              {isMaster ? 'Reset Master Password' : 'Set New Password'}
            </h2>
            <p className={`text-xs ${isMaster ? 'text-slate-400' : 'text-[#64748B]'}`}>
              {isMaster
                ? 'Create a secure new password for the Master Administrator Portal.'
                : userEmail
                ? `Enter a secure new password for ${userEmail}`
                : 'Create a new password to access your isolated workspace.'}
            </p>
          </div>

          {error && (
            <div
              className={`mb-5 p-3.5 rounded-xl border flex items-start gap-2.5 text-xs text-left ${
                isMaster
                  ? 'bg-red-950/50 border-red-900 text-red-200'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="space-y-4 text-center">
              <div
                className={`p-5 rounded-xl border flex flex-col items-center justify-center gap-2 text-xs ${
                  isMaster
                    ? 'bg-emerald-950/50 border-emerald-900 text-emerald-200'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                <p className="font-semibold text-sm">Password Updated Successfully!</p>
                <p className="text-[11px] opacity-90">
                  {isMaster
                    ? 'Redirecting to Master Sign In...'
                    : 'Redirecting to workspace sign in...'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  window.location.href = isMaster ? '/masterlogin' : '/login';
                }}
                className={`w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  isMaster
                    ? 'bg-[#4F46E5] hover:bg-[#4338CA] text-white shadow-lg shadow-indigo-600/20'
                    : 'bg-[#4F46E5] hover:bg-[#4338CA] text-white shadow-xs'
                }`}
              >
                <span>Proceed to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : hasValidSession ? (
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${isMaster ? 'text-slate-300' : 'text-[#334155]'}`}>
                  New Password
                </label>
                <div className="relative">
                  <Lock className={`absolute left-3.5 top-3 w-4 h-4 ${isMaster ? 'text-slate-500' : 'text-slate-400'}`} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-xs focus:outline-none transition-colors ${
                      isMaster
                        ? 'bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:border-[#4F46E5]'
                        : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[#4F46E5] focus:bg-white'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-3.5 top-3 transition-colors ${
                      isMaster ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className={`block text-xs font-medium mb-1.5 ${isMaster ? 'text-slate-300' : 'text-[#334155]'}`}>
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className={`absolute left-3.5 top-3 w-4 h-4 ${isMaster ? 'text-slate-500' : 'text-slate-400'}`} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-xs focus:outline-none transition-colors ${
                      isMaster
                        ? 'bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:border-[#4F46E5]'
                        : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[#4F46E5] focus:bg-white'
                    }`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 text-white font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-2 mt-2 ${
                  isMaster
                    ? 'bg-[#4F46E5] hover:bg-[#4338CA] shadow-lg shadow-indigo-600/20'
                    : 'bg-[#4F46E5] hover:bg-[#4338CA] shadow-xs'
                }`}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                <span>{isMaster ? 'Update Master Password' : 'Save New Password'}</span>
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = isMaster ? '/masterlogin' : '/login';
                  }}
                  className={`text-xs transition-colors ${
                    isMaster ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Cancel and return to sign in
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 text-center">
              <p className={`text-xs ${isMaster ? 'text-slate-400' : 'text-slate-600'}`}>
                The password reset session has expired or is invalid. Please request a new recovery link.
              </p>
              <button
                type="button"
                onClick={() => {
                  window.location.href = isMaster ? '/masterlogin' : '/login';
                }}
                className={`w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  isMaster
                    ? 'bg-slate-800 hover:bg-slate-700 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>Request New Reset Link</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
