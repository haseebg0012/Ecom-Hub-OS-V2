import React, { useState, useEffect } from 'react';
import { Loader2, ArrowRight, ShieldCheck, Mail, Lock, User, Building2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { getSupabaseConfigStatus, isSupabaseConfigured } from '../../lib/supabase';

type AuthMode = 'login' | 'signup' | 'forgot_password' | 'reset_password';

function getAuthModeFromLocation(): AuthMode {
  if (typeof window === 'undefined') return 'login';
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();

  if (path.includes('signup') || hash.includes('signup')) return 'signup';
  if (path.includes('forgot') || hash.includes('forgot')) return 'forgot_password';
  if (path.includes('reset') || hash.includes('reset')) return 'reset_password';
  return 'login';
}

export const AuthPage: React.FC = () => {
  const { login, signup, resetPassword, bypassLogin } = useAuth();
  const [mode, setMode] = useState<AuthMode>(getAuthModeFromLocation);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('Ecometrix Hub');

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const configStatus = getSupabaseConfigStatus();

  // Sync mode with URL popstate / hashchange for robust back/forward navigation
  useEffect(() => {
    const handleUrlChange = () => {
      setMode(getAuthModeFromLocation());
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setErrorMessage('');
    setSuccessMessage('');
    let targetPath = '/login';
    if (newMode === 'signup') targetPath = '/signup';
    else if (newMode === 'forgot_password') targetPath = '/forgot-password';
    else if (newMode === 'reset_password') targetPath = '/reset-password';

    try {
      window.history.pushState({}, '', targetPath);
    } catch {
      // ignore if cross-origin or sandbox restricted
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (mode === 'login') {
        if (!email.trim() || !password) {
          setErrorMessage('Please provide both email and password.');
          setIsLoading(false);
          return;
        }
        const res = await login(email.trim(), password);
        setIsLoading(false);
        if (!res.success) {
          setErrorMessage(res.error || 'Invalid credentials or login failure.');
        }
      } else if (mode === 'signup') {
        if (!email.trim() || !password || !fullName.trim()) {
          setErrorMessage('Please fill in all required fields.');
          setIsLoading(false);
          return;
        }
        if (password.length < 6) {
          setErrorMessage('Password must be at least 6 characters long.');
          setIsLoading(false);
          return;
        }
        const res = await signup(
          email.trim(),
          password,
          fullName.trim(),
          businessName.trim() || 'Ecometrix Hub'
        );
        setIsLoading(false);
        if (!res.success) {
          setErrorMessage(res.error || 'Failed to create account.');
        }
      } else if (mode === 'forgot_password' || mode === 'reset_password') {
        if (!email.trim()) {
          setErrorMessage('Please enter your account email.');
          setIsLoading(false);
          return;
        }
        const res = await resetPassword(email.trim(), { userType: 'workspace' });
        setIsLoading(false);
        if (res.success) {
          setSuccessMessage(res.message);
        } else {
          setErrorMessage(res.error || 'Could not send reset link.');
        }
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || 'An unexpected error occurred during authentication.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        <div className="inline-flex items-center justify-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-[#4F46E5] flex items-center justify-center text-white font-bold text-base shadow-xs">
            EH
          </div>
          <div className="text-left">
            <h1 className="text-xl font-bold tracking-tight text-[#0F172A] leading-none">
              EcomHub
            </h1>
            <p className="text-[11px] font-semibold text-[#64748B] tracking-wider uppercase mt-0.5">
              Business OS
            </p>
          </div>
        </div>
        <p className="text-sm font-medium text-[#4F46E5]">
          Your Business, One Hub.
        </p>
        <p className="text-xs text-[#64748B] mt-1">
          Unified business management, CRM, finance, operations, and intelligence.
        </p>
      </div>

      {/* Card Container */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-xl border border-[#E2E8F0] shadow-xs">
          {/* Mode Title */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-[#0F172A]">
              {mode === 'login' && 'Sign in to your organization'}
              {mode === 'signup' && 'Create your business account'}
              {mode === 'forgot_password' && 'Reset your account password'}
              {mode === 'reset_password' && 'Set new account password'}
            </h2>
            <p className="text-xs text-[#64748B] mt-1">
              {mode === 'login' && 'Enter your credentials to access your isolated workspace.'}
              {mode === 'signup' && 'Start with your primary business and team workspace.'}
              {mode === 'forgot_password' && 'Enter your email to receive recovery instructions.'}
              {mode === 'reset_password' && 'Enter your email to request a secure password reset link.'}
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-xs text-green-700 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Your Full Name *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Haseeb G."
                      className="block w-full pl-9 pr-3 py-2 border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Initial Business / Organization Name *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Ecometrix Hub"
                      className="block w-full pl-9 pr-3 py-2 border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                    />
                  </div>
                  <p className="text-[11px] text-[#94A3B8] mt-1">
                    You can manage or add multiple businesses later via the switcher.
                  </p>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Business Email Address *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  autoComplete="off"
                  data-lpignore="true"
                  value={email}
                  placeholder="name@company.com"
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                />
              </div>
            </div>

            {mode !== 'forgot_password' && mode !== 'reset_password' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#0F172A]">
                    Password *
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => switchMode('forgot_password')}
                      className="text-[11px] font-medium text-[#4F46E5] hover:text-[#4338CA]"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-9 pr-3 py-2 border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-[#4F46E5] hover:bg-[#4338CA] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4F46E5] transition-colors disabled:opacity-50 mt-2 shadow-xs"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>
                    {mode === 'login' && 'Sign In to EcomHub OS'}
                    {mode === 'signup' && 'Create Account & Business'}
                    {mode === 'forgot_password' && 'Send Reset Instructions'}
                    {mode === 'reset_password' && 'Send Password Reset Link'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Mode Switchers */}
          <div className="mt-6 pt-5 border-t border-[#E2E8F0] text-center">
            {mode === 'login' && (
              <p className="text-xs text-[#64748B]">
                Forgot your password?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('forgot_password')}
                  className="font-semibold text-[#4F46E5] hover:text-[#4338CA]"
                >
                  Reset password
                </button>
              </p>
            )}


            {mode === 'signup' && (
              <p className="text-xs text-[#64748B]">
                Already have an account?{' '}
                <button
                  onClick={() => switchMode('login')}
                  className="font-semibold text-[#4F46E5] hover:text-[#4338CA]"
                >
                  Sign in
                </button>
              </p>
            )}

            {(mode === 'forgot_password' || mode === 'reset_password') && (
              <p className="text-xs text-[#64748B]">
                Remembered your password?{' '}
                <button
                  onClick={() => switchMode('login')}
                  className="font-semibold text-[#4F46E5] hover:text-[#4338CA]"
                >
                  Return to sign in
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Security & Multi-tenancy badge footer */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-1.5 text-xs text-[#64748B]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A]" />
            <span>Supabase Auth & PostgreSQL Row Level Security (RLS) Protected</span>
          </div>
        </div>
      </div>
    </div>
  );
};
