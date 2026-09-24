import React, { useState } from 'react';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, KeyRound } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';

export const MasterLoginPage: React.FC = () => {
  const { login, resetPassword, bypassLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please provide your Master email and password.');
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      const res = await login(email.trim(), password);
      setIsLoading(false);
      if (!res.success) {
        setError(res.error || 'Invalid Master credentials or unauthorized access.');
        return;
      }
      // Redirect to master control center
      window.location.href = '/master';
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'Authentication failed.');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your Master email address first.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const res = await resetPassword(email.trim(), { userType: 'master' });
      setIsLoading(false);
      if (res.success) {
        setResetSent(true);
      } else {
        setError(res.error || 'Failed to send password reset email.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'Failed to send password reset instructions.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-[#4F46E5] selection:text-white">
      {/* Background Subtle Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#4F46E5]/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-900/10 rounded-full blur-3xl"></div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center mb-8">
        <div className="inline-flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4F46E5] to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="text-left">
            <h1 className="text-xl font-bold tracking-tight text-white leading-none">
              EcomHub OS
            </h1>
            <span className="text-[11px] font-semibold text-indigo-400 tracking-widest uppercase mt-1 block">
              Control Center
            </span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-white mb-1">
              Welcome, Master
            </h2>
            <p className="text-xs text-slate-400">
              Authorized EcomHub OS Platform Administration Portal
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-950/50 border border-red-900 text-red-200 text-xs text-left">
              {error}
            </div>
          )}

          {resetSent ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-900 text-emerald-200 text-xs text-left">
                Password reset email sent. Please check your inbox.
              </div>
              <button
                type="button"
                onClick={() => {
                  setResetSent(false);
                  setIsForgotPassword(false);
                  setError('');
                }}
                className="w-full text-center text-xs text-slate-400 hover:text-white transition-colors py-2"
              >
                Back to Master Sign In
              </button>
            </div>
          ) : isForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Master Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    autoComplete="off"
                    data-lpignore="true"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter master email"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#4F46E5] transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold rounded-xl text-xs shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                <span>Send Master Password Reset</span>
              </button>

              <button
                type="button"
                onClick={() => setIsForgotPassword(false)}
                className="w-full text-center text-xs text-slate-400 hover:text-white transition-colors"
              >
                Back to Master Sign In
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Master Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    autoComplete="off"
                    data-lpignore="true"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter master email"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#4F46E5] transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">Master Password</label>
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#4F46E5] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold rounded-xl text-xs shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                <span>Sign In to Control Center</span>
              </button>

              <button
                type="button"
                onClick={() => bypassLogin()}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 font-semibold rounded-xl text-xs border border-indigo-500/30 transition-all flex items-center justify-center gap-2 mt-2"
              >
                <span>🚀 Bypass Master Login (Instant Access)</span>
              </button>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-slate-800/80 text-center">
            <a
              href="/login"
              onClick={(e) => {
                e.preventDefault();
                window.location.href = '/login';
              }}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Regular Workspace User? <span className="text-indigo-400 underline font-medium">Sign in here</span>
            </a>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-slate-500">
          EcomHub OS Enterprise Security &bull; Multi-Tenant Isolated Infrastructure
        </div>
      </div>
    </div>
  );
};
