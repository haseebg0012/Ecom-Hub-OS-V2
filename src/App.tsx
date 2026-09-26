/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * EcomHub OS — Your Business, One Hub.
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/auth-context';
import { CrmProvider } from './lib/crm-context';
import { FinanceProvider } from './lib/finance-context';
import { AuthPage } from './components/auth/AuthPage';
import { MasterLoginPage } from './components/auth/MasterLoginPage';
import { ResetPasswordPage } from './components/auth/ResetPasswordPage';
import { AuthCallback } from './components/auth/AuthCallback';
import { AppShell } from './components/layout/AppShell';
import { PublicLeadEntryForm } from './components/public/PublicLeadEntryForm';
import { AcceptInvitationView } from './components/employees/AcceptInvitationView';
import { PlatformAdminShell } from './components/platform/PlatformAdminShell';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Loader2, ShieldAlert } from 'lucide-react';

function getPublicLeadEntryToken(): string | null {
  if (typeof window === 'undefined') return null;
  const path = window.location.pathname;
  const hash = window.location.hash;
  const search = window.location.search;

  // 1. Pathname: /lead-entry/abc123xyz
  const matchPath = path.match(/\/lead-entry\/([a-zA-Z0-9_\-]+)/);
  if (matchPath && matchPath[1]) return matchPath[1];

  // 2. Hash: #/lead-entry/abc123xyz or #lead-entry/abc123xyz
  const matchHash = hash.match(/lead-entry\/([a-zA-Z0-9_\-]+)/);
  if (matchHash && matchHash[1]) return matchHash[1];

  // 3. Query string fallback: ?token=... or ?form_token=...
  if (path.includes('lead-entry') || hash.includes('lead-entry')) {
    const params = new URLSearchParams(search);
    const qToken = params.get('token') || params.get('form_token');
    if (qToken) return qToken;
  }

  return null;
}

function checkIsAcceptInvitation(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname;
  const hash = window.location.hash;
  const search = window.location.search;

  // 1. Direct route /accept-invitation or hash routing #/accept-invitation
  if (path.includes('accept-invitation') || hash.includes('accept-invitation')) {
    return true;
  }

  // 2. Supabase invitation redirect payload in hash (#access_token=...&type=invite)
  if (hash.includes('type=invite') || search.includes('type=invite')) {
    return true;
  }

  // 3. Supabase Auth error on invite verification (#error=access_denied&error_code=otp_expired)
  if (
    hash.includes('error_code=otp_expired') ||
    search.includes('error_code=otp_expired') ||
    (hash.includes('error=') && (hash.includes('invite') || hash.includes('token') || hash.includes('otp')))
  ) {
    return true;
  }

  return false;
}

function checkIsAuthCallback(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  return path.includes('/auth/callback') || hash.includes('/auth/callback');
}

function checkIsPasswordReset(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  const search = window.location.search.toLowerCase();

  if (path.includes('reset-password') || hash.includes('reset-password')) return true;
  if (hash.includes('type=recovery') || search.includes('type=recovery')) return true;

  return false;
}

function AppContent() {
  const { user, isLoading, isPlatformOwner, isRecoveryMode } = useAuth();
  const [pathname, setPathname] = useState(() => window.location.pathname + window.location.hash);

  useEffect(() => {
    const handleLocation = () => setPathname(window.location.pathname + window.location.hash);
    window.addEventListener('popstate', handleLocation);
    window.addEventListener('hashchange', handleLocation);
    return () => {
      window.removeEventListener('popstate', handleLocation);
      window.removeEventListener('hashchange', handleLocation);
    };
  }, []);

  // Dedicated Password Recovery / Reset View
  if (isRecoveryMode || checkIsPasswordReset()) {
    return <ResetPasswordPage />;
  }

  // Master Portal Sign In
  if (pathname.includes('masterlogin')) {
    return <MasterLoginPage />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#4F46E5] flex items-center justify-center text-white font-bold text-base shadow-xs animate-pulse">
            EH
          </div>
          <div className="text-center">
            <h1 className="text-base font-bold text-[#0F172A]">EcomHub OS</h1>
            <p className="text-xs text-[#64748B]">Your Business, One Hub.</p>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-[#94A3B8]">
            <Loader2 className="w-4 h-4 animate-spin text-[#4F46E5]" />
            <span>Initializing tenant workspace...</span>
          </div>
        </div>
      </div>
    );
  }

  // Master Platform Admin Shell
  if (pathname.includes('/master') || pathname.includes('platform')) {
    if (!user) {
      return <MasterLoginPage />;
    }
    if (!isPlatformOwner) {
      return (
        <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-xs text-slate-400 mb-6">
              Your account ({user.email}) is not authorized to access the Master Platform Control Center.
            </p>
            <div className="flex gap-3">
              <a
                href="/"
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold transition-colors"
              >
                Return to Workspace
              </a>
              <a
                href="/masterlogin"
                className="flex-1 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-xs font-semibold transition-colors"
              >
                Master Sign In
              </a>
            </div>
          </div>
        </div>
      );
    }
    return <PlatformAdminShell />;
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <CrmProvider>
      <FinanceProvider>
        <AppShell />
      </FinanceProvider>
    </CrmProvider>
  );
}

export default function App() {
  // Fresh start wipe of dummy records across finances, leads, projects, clients, tasks, and employees
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && !localStorage.getItem('ecomhub_fresh_clean_v4_all')) {
        localStorage.setItem('ecomhub_leads', JSON.stringify([]));
        localStorage.setItem('ecomhub_clients', JSON.stringify([]));
        localStorage.setItem('ecomhub_client_contacts', JSON.stringify([]));
        localStorage.setItem('ecomhub_client_notes', JSON.stringify([]));
        localStorage.setItem('ecomhub_crm_activities', JSON.stringify([]));
        localStorage.setItem('ecomhub_lead_followups', JSON.stringify([]));
        localStorage.setItem('ecomhub_notifications', JSON.stringify([]));
        localStorage.setItem('ecomhub_employees', JSON.stringify([]));
        localStorage.setItem('ecomhub_members', JSON.stringify([]));

        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (
            k &&
            (k.startsWith('ecomhub_invoices_') ||
              k.startsWith('ecomhub_invoice_items_') ||
              k.startsWith('ecomhub_payments_') ||
              k.startsWith('ecomhub_expenses_') ||
              k.startsWith('ecomhub_incomes_') ||
              k.startsWith('ecomhub_investments_') ||
              k.startsWith('ecomhub_recurring_') ||
              k.startsWith('ecomhub_transactions_') ||
              k.startsWith('ecomhub_tasks_') ||
              k.startsWith('ecomhub_projects_'))
          ) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
        localStorage.setItem('ecomhub_fresh_clean_v4_all', 'true');

        window.dispatchEvent(new Event('ecomhub_leads_updated'));
        window.dispatchEvent(new Event('ecomhub_employees_updated'));
        window.dispatchEvent(new Event('ecomhub_tasks_updated'));
      }
    } catch {}
  }, []);

  const [publicFormToken, setPublicFormToken] = useState<string | null>(() => getPublicLeadEntryToken());
  const [isAcceptInvite, setIsAcceptInvite] = useState<boolean>(() => checkIsAcceptInvitation());
  const [isAuthCallback, setIsAuthCallback] = useState<boolean>(() => checkIsAuthCallback());
  const [isPasswordReset, setIsPasswordReset] = useState<boolean>(() => checkIsPasswordReset());

  useEffect(() => {
    const handleLocationChange = () => {
      setPublicFormToken(getPublicLeadEntryToken());
      setIsAcceptInvite(checkIsAcceptInvitation());
      setIsAuthCallback(checkIsAuthCallback());
      setIsPasswordReset(checkIsPasswordReset());
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // If visiting public lead entry URL, isolate and serve public form directly
  if (publicFormToken) {
    return (
      <ErrorBoundary fallbackTitle="Public Form Error">
        <PublicLeadEntryForm token={publicFormToken} />
      </ErrorBoundary>
    );
  }

  // If visiting central auth callback
  if (isAuthCallback) {
    return (
      <ErrorBoundary fallbackTitle="Authentication Callback Error">
        <AuthProvider>
          <AuthCallback />
        </AuthProvider>
      </ErrorBoundary>
    );
  }

  // If visiting reset password page directly
  if (isPasswordReset) {
    return (
      <ErrorBoundary fallbackTitle="Password Reset Error">
        <AuthProvider>
          <ResetPasswordPage />
        </AuthProvider>
      </ErrorBoundary>
    );
  }

  // If visiting accept invitation URL or callback, isolate and serve AcceptInvitationView
  if (isAcceptInvite) {
    return (
      <ErrorBoundary fallbackTitle="Invitation Error">
        <AuthProvider>
          <AcceptInvitationView />
        </AuthProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary fallbackTitle="EcomHub OS Application Error">
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
