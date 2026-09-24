import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { getSupabaseClient, sanitizeRedirectPath } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';

export const AuthCallback: React.FC = () => {
  const { setIsRecoveryMode } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'redirecting'>('loading');
  const [title, setTitle] = useState('Verifying Authentication...');
  const [message, setMessage] = useState('Please wait while we authenticate your session.');
  const [actionButton, setActionButton] = useState<{ label: string; href: string } | null>(null);
  const [isMasterFlow, setIsMasterFlow] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function handleAuthCallback() {
      const client = getSupabaseClient();
      if (!client) {
        if (isMounted) {
          setStatus('error');
          setTitle('Configuration Error');
          setMessage('Supabase client is not configured.');
        }
        return;
      }

      const searchParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash;
      const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.substring(1) : hash);

      // Check for error parameters in query or hash
      const error = searchParams.get('error') || hashParams.get('error');
      const errorCode = searchParams.get('error_code') || hashParams.get('error_code');
      const errorDescription = searchParams.get('error_description') || hashParams.get('error_description');

      const userTypeParam = searchParams.get('user_type') || hashParams.get('user_type');
      const isMaster = userTypeParam === 'master' || window.location.pathname.includes('master');
      if (isMounted) {
        setIsMasterFlow(isMaster);
      }

      if (error || errorCode) {
        if (isMounted) {
          setStatus('error');
          setTitle('Authentication Failed');
          if (errorCode === 'otp_expired') {
            setMessage('This verification or password reset link has expired. Please request a new one.');
          } else {
            setMessage(
              errorDescription
                ? decodeURIComponent(errorDescription.replace(/\+/g, ' '))
                : 'Authentication link is invalid or has expired.'
            );
          }
          setActionButton({
            label: isMaster ? 'Return to Master Sign In' : 'Return to Sign In',
            href: isMaster ? '/masterlogin' : '/login',
          });
        }
        return;
      }

      // Check for PKCE exchange code
      const code = searchParams.get('code');
      if (code) {
        try {
          const { error: exchangeError } = await client.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            if (isMounted) {
              setStatus('error');
              setTitle('Authentication Code Invalid');
              setMessage(exchangeError.message || 'Failed to exchange authorization code.');
              setActionButton({
                label: isMaster ? 'Return to Master Sign In' : 'Return to Sign In',
                href: isMaster ? '/masterlogin' : '/login',
              });
            }
            return;
          }
        } catch (err: any) {
          if (isMounted) {
            setStatus('error');
            setTitle('Session Exchange Error');
            setMessage(err?.message || 'Failed to establish authentication session.');
          }
          return;
        }
      }

      // Determine auth callback action type
      const type = searchParams.get('type') || hashParams.get('type');

      // 1. Password Recovery Flow
      if (type === 'recovery' || hash.includes('type=recovery')) {
        setIsRecoveryMode(true);
        setStatus('redirecting');
        setTitle('Redirecting to Password Reset...');
        setMessage('Redirecting to secure password reset screen...');

        // If access token is present in hash, set session explicitly
        const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.substring(1) : hash);
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        if (accessToken && refreshToken) {
          try {
            await client.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
          } catch (sessionErr) {
            console.warn('Could not set session in AuthCallback:', sessionErr);
          }
        }

        // Delay slightly for session persistence, then navigate to reset password page with target user_type
        setTimeout(() => {
          window.location.href = `/reset-password?user_type=${isMaster ? 'master' : 'workspace'}${hash ? hash : ''}`;
        }, 300);
        return;
      }

      // 2. Invitation Flow
      if (type === 'invite' || hash.includes('type=invite')) {
        setStatus('redirecting');
        setTitle('Accepting Invitation...');
        setMessage('Redirecting to employee onboarding...');

        try {
          window.history.replaceState(null, '', '/accept-invitation');
        } catch {
          // Ignore
        }

        setTimeout(() => {
          window.location.href = '/accept-invitation';
        }, 300);
        return;
      }

      // 3. Email Verification / Confirmation / Signup
      if (type === 'signup' || type === 'email_verification' || type === 'email_change' || hash.includes('access_token')) {
        // Clean URL hash
        try {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        } catch {
          // Ignore
        }

        // Get confirmed user details
        const { data: { user: verifiedUser } } = await client.auth.getUser();

        if (isMounted) {
          setStatus('success');
          setTitle('Email Verified Successfully!');
          setMessage(
            verifiedUser?.email
              ? `Your email (${verifiedUser.email}) has been verified. You can now access your workspace.`
              : 'Your email address has been confirmed and verified.'
          );
          setActionButton({
            label: isMaster ? 'Go to Master Control Center' : 'Proceed to Workspace',
            href: isMaster ? '/master' : '/login',
          });
        }
        return;
      }

      // 4. Default fallback: check if user is now authenticated
      const { data: { session } } = await client.auth.getSession();
      if (session) {
        if (isMounted) {
          setStatus('success');
          setTitle('Authentication Successful');
          setMessage('You have been authenticated successfully.');
          setActionButton({
            label: isMaster ? 'Open Master Console' : 'Open Workspace',
            href: isMaster ? '/master' : '/',
          });
        }
      } else {
        if (isMounted) {
          setStatus('error');
          setTitle('Session Not Found');
          setMessage('No valid authentication token was provided.');
          setActionButton({
            label: isMaster ? 'Go to Master Sign In' : 'Go to Sign In',
            href: isMaster ? '/masterlogin' : '/login',
          });
        }
      }
    }

    handleAuthCallback();

    return () => {
      isMounted = false;
    };
  }, [setIsRecoveryMode]);

  return (
    <div
      className={`min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-[#4F46E5] selection:text-white ${
        isMasterFlow ? 'bg-[#0B0F19] text-slate-100' : 'bg-[#F8FAFC] text-[#0F172A]'
      }`}
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        <div className="inline-flex items-center justify-center gap-3 mb-4">
          {isMasterFlow ? (
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4F46E5] to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-[#4F46E5] flex items-center justify-center text-white font-bold text-base shadow-xs">
              EH
            </div>
          )}
          <div className="text-left">
            <h1 className={`text-xl font-bold tracking-tight leading-none ${isMasterFlow ? 'text-white' : 'text-[#0F172A]'}`}>
              {isMasterFlow ? 'EcomHub OS' : 'EcomHub'}
            </h1>
            <span className={`text-[11px] font-semibold tracking-widest uppercase mt-1 block ${isMasterFlow ? 'text-indigo-400' : 'text-[#64748B]'}`}>
              {isMasterFlow ? 'Control Center' : 'Business OS'}
            </span>
          </div>
        </div>

        <div
          className={`rounded-2xl p-8 shadow-2xl backdrop-blur-xl border ${
            isMasterFlow
              ? 'bg-slate-900/80 border-slate-800 text-slate-100'
              : 'bg-white border-[#E2E8F0] shadow-xs text-[#0F172A]'
          }`}
        >
          {status === 'loading' || status === 'redirecting' ? (
            <div className="flex flex-col items-center justify-center py-6 space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-[#4F46E5]" />
              <div>
                <h2 className={`text-lg font-bold ${isMasterFlow ? 'text-white' : 'text-[#0F172A]'}`}>
                  {title}
                </h2>
                <p className={`text-xs mt-1 ${isMasterFlow ? 'text-slate-400' : 'text-[#64748B]'}`}>
                  {message}
                </p>
              </div>
            </div>
          ) : status === 'success' ? (
            <div className="space-y-5 text-center py-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 mb-1">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${isMasterFlow ? 'text-white' : 'text-[#0F172A]'}`}>
                  {title}
                </h2>
                <p className={`text-xs mt-2 ${isMasterFlow ? 'text-slate-300' : 'text-[#64748B]'}`}>
                  {message}
                </p>
              </div>

              {actionButton && (
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = sanitizeRedirectPath(actionButton.href, isMasterFlow ? '/masterlogin' : '/login');
                  }}
                  className={`w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    isMasterFlow
                      ? 'bg-[#4F46E5] hover:bg-[#4338CA] text-white shadow-lg shadow-indigo-600/20'
                      : 'bg-[#4F46E5] hover:bg-[#4338CA] text-white shadow-xs'
                  }`}
                >
                  <span>{actionButton.label}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-5 text-center py-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-500/10 text-red-500 mb-1">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${isMasterFlow ? 'text-white' : 'text-[#0F172A]'}`}>
                  {title}
                </h2>
                <p className={`text-xs mt-2 ${isMasterFlow ? 'text-slate-300' : 'text-[#64748B]'}`}>
                  {message}
                </p>
              </div>

              {actionButton ? (
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = sanitizeRedirectPath(actionButton.href, isMasterFlow ? '/masterlogin' : '/login');
                  }}
                  className={`w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    isMasterFlow
                      ? 'bg-slate-800 hover:bg-slate-700 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>{actionButton.label}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = '/login';
                    }}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = '/masterlogin';
                    }}
                    className="flex-1 py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-xl text-xs font-semibold"
                  >
                    Master Sign In
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
