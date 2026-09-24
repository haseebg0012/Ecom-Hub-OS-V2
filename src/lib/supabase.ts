import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Resolve environment variables supporting both Vite and Next.js / standard Node formats
const metaEnv = typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env : {};
const procEnv = typeof process !== 'undefined' && process.env ? process.env : {};

function normalizeSupabaseUrl(raw: string): string {
  if (!raw) return '';
  try {
    const trimmed = raw.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const parsed = new URL(trimmed);
      return parsed.origin;
    }
    return trimmed;
  } catch {
    return raw.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '').trim();
  }
}

function resolveInitialUrl(): string {
  const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
  const procEnv = typeof process !== 'undefined' ? process.env : undefined;
  const candidate =
    metaEnv?.NEXT_PUBLIC_SUPABASE_URL ||
    metaEnv?.VITE_SUPABASE_URL ||
    procEnv?.NEXT_PUBLIC_SUPABASE_URL ||
    procEnv?.VITE_SUPABASE_URL ||
    procEnv?.SUPABASE_URL ||
    '';
  return normalizeSupabaseUrl(typeof candidate === 'string' ? candidate : '');
}

function resolveInitialKey(): string {
  const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
  const procEnv = typeof process !== 'undefined' ? process.env : undefined;
  const candidate =
    metaEnv?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    metaEnv?.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    metaEnv?.VITE_SUPABASE_ANON_KEY ||
    procEnv?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    procEnv?.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    procEnv?.VITE_SUPABASE_ANON_KEY ||
    '';
  return typeof candidate === 'string' ? candidate.trim() : '';
}

export let SUPABASE_URL = resolveInitialUrl();
export let SUPABASE_ANON_KEY = resolveInitialKey();

export let isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  !SUPABASE_URL.includes('your-project.supabase.co') &&
  !SUPABASE_ANON_KEY.includes('your-supabase-')
);

export function getAppUrl(): string {
  // 1. Check configured NEXT_PUBLIC_APP_URL or APP_URL
  const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
  const procEnv = typeof process !== 'undefined' ? process.env : undefined;
  const configured =
    metaEnv?.NEXT_PUBLIC_APP_URL ||
    metaEnv?.VITE_APP_URL ||
    procEnv?.NEXT_PUBLIC_APP_URL ||
    procEnv?.APP_URL ||
    '';

  if (configured && configured !== 'MY_APP_URL' && typeof configured === 'string' && configured.trim()) {
    const trimmed = configured.trim().replace(/\/+$/, '');
    // In production or when explicitly configured, use this canonical domain
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
  }

  // 2. Derive dynamically from browser origin if available
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    const origin = window.location.origin.replace(/\/+$/, '');
    return origin;
  }

  return 'http://localhost:3000';
}

/**
 * Build centralized auth callback URL for Supabase redirects
 */
export function getAuthCallbackUrl(
  type: 'recovery' | 'signup' | 'email_verification' | 'invite' = 'recovery',
  userType: 'master' | 'workspace' = 'workspace'
): string {
  const appUrl = getAppUrl();
  return `${appUrl}/auth/callback?type=${encodeURIComponent(type)}&user_type=${encodeURIComponent(userType)}`;
}

/**
 * Build centralized password reset redirect URL
 */
export function getPasswordResetRedirectUrl(
  userType: 'master' | 'workspace' = 'workspace'
): string {
  const appUrl = getAppUrl();
  return `${appUrl}/auth/callback?type=recovery&user_type=${encodeURIComponent(userType)}`;
}

/**
 * Build centralized email verification redirect URL
 */
export function getEmailVerificationRedirectUrl(
  userType: 'master' | 'workspace' = 'workspace'
): string {
  const appUrl = getAppUrl();
  return `${appUrl}/auth/callback?type=email_verification&user_type=${encodeURIComponent(userType)}`;
}

/**
 * Build employee / workspace invitation redirect URL
 */
export function getInvitationRedirectUrl(): string {
  const appUrl = getAppUrl();
  return `${appUrl}/accept-invitation`;
}

/**
 * Sanitize internal redirect paths to prevent open redirect vulnerabilities
 */
export function sanitizeRedirectPath(path: string | null | undefined, fallback = '/'): string {
  if (!path || typeof path !== 'string') return fallback;
  const trimmed = path.trim();
  // Must start with / and not //, and must not contain protocol prefixes
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes(':') || trimmed.includes('\\')) {
    return fallback;
  }
  return trimmed;
}

// Create real client if credentials exist
let supabaseInstance: SupabaseClient | null = null;

export function configureSupabaseClient(url: string, anonKey: string): SupabaseClient | null {
  const cleanUrl = normalizeSupabaseUrl(url);
  const cleanKey = typeof anonKey === 'string' ? anonKey.trim() : '';
  if (!cleanUrl || !cleanKey || cleanUrl.includes('your-project') || cleanKey.includes('your-supabase-')) {
    return null;
  }
  SUPABASE_URL = cleanUrl;
  SUPABASE_ANON_KEY = cleanKey;
  isSupabaseConfigured = true;
  supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  if (typeof window !== 'undefined') {
    (window as any).supabase = supabaseInstance;
  }
  return supabaseInstance;
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    return null;
  }
  if (!supabaseInstance) {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    if (typeof window !== 'undefined') {
      (window as any).supabase = supabaseInstance;
    }
  }
  return supabaseInstance;
}

export const supabase = isSupabaseConfigured ? getSupabaseClient() : null;
if (typeof window !== 'undefined' && supabase) {
  (window as any).supabase = supabase;
}

/**
 * Centralized authenticated API fetch helper.
 * Retrieves the current Supabase session access token and attaches:
 * Authorization: Bearer <supabase_access_token>
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const client = getSupabaseClient();
  let token: string | null = null;
  if (client) {
    try {
      const { data } = await client.auth.getSession();
      let session = data?.session;
      if (session && session.expires_at && session.expires_at * 1000 < Date.now()) {
        try {
          const { data: refreshData } = await client.auth.refreshSession();
          session = refreshData.session;
        } catch {}
      }
      token = session?.access_token || null;
    } catch {
      token = null;
    }
  }

  const headers = new Headers(init?.headers || {});
  headers.set('Cache-Control', 'no-cache');
  headers.set('Pragma', 'no-cache');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(input, {
      ...init,
      headers,
    });
  } catch (netErr) {
    // Retry once after a brief delay if server was momentarily restarting or network dropped
    await new Promise((resolve) => setTimeout(resolve, 500));
    response = await fetch(input, {
      ...init,
      headers,
    });
  }

  if (response.status === 401 && client) {
    try {
      const { data: refreshData } = await client.auth.refreshSession();
      if (refreshData?.session?.access_token) {
        headers.set('Authorization', `Bearer ${refreshData.session.access_token}`);
        response = await fetch(input, {
          ...init,
          headers,
        });
      }
    } catch {
      // Return original 401 on refresh failure
    }
  }

  return response;
}
