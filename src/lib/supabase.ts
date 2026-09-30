import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Resolve environment variables supporting Vite (import.meta.env) and Node/define (process.env)
function getEnvValue(key: string): string {
  try {
    const metaObj = typeof import.meta !== 'undefined' ? (import.meta as any) : null;
    const metaEnv = metaObj?.env;
    if (metaEnv) {
      if (key === 'VITE_SUPABASE_URL' && metaEnv.VITE_SUPABASE_URL) return String(metaEnv.VITE_SUPABASE_URL);
      if (key === 'VITE_SUPABASE_PUBLISHABLE_KEY' && metaEnv.VITE_SUPABASE_PUBLISHABLE_KEY) return String(metaEnv.VITE_SUPABASE_PUBLISHABLE_KEY);
      if (key === 'SUPABASE_URL' && metaEnv.SUPABASE_URL) return String(metaEnv.SUPABASE_URL);
      if (key === 'VITE_APP_URL' && metaEnv.VITE_APP_URL) return String(metaEnv.VITE_APP_URL);
      const dynamicVal = metaEnv[key];
      if (dynamicVal && typeof dynamicVal === 'string') return dynamicVal;
    }
  } catch {}

  try {
    if (typeof process !== 'undefined' && process.env) {
      const val = (process.env as Record<string, string | undefined>)[key];
      if (typeof val === 'string' && val.trim()) return val;
    }
  } catch {}

  return '';
}

/**
 * Normalizes and validates any raw string into a clean, canonical HTTP/HTTPS Supabase URL origin.
 * Prevents throwing "Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL."
 * Returns empty string "" if the input cannot be parsed into a valid HTTP/HTTPS URL.
 */
export function normalizeSupabaseUrl(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return '';

  let trimmed = raw.trim();

  // Strip wrapping single/double quotes or backticks if pasted with quotes
  trimmed = trimmed.replace(/^["'`]+/, '').replace(/["'`]+$/, '').trim();

  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') {
    return '';
  }

  // Reject PostgreSQL connection strings if user pasted DB credentials by mistake
  if (trimmed.startsWith('postgres://') || trimmed.startsWith('postgresql://')) {
    console.warn('[Supabase Init] Detected PostgreSQL connection string instead of Supabase API URL.');
    return '';
  }

  // Remove common API path suffixes like /rest/v1 or trailing slashes
  trimmed = trimmed.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '').trim();

  // If protocol is missing, auto-prepend https:// (or http:// for localhost)
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    if (trimmed.startsWith('//')) {
      trimmed = 'https:' + trimmed;
    } else if (
      trimmed.includes('.supabase.') ||
      trimmed.startsWith('localhost') ||
      trimmed.startsWith('127.0.0.1') ||
      /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(:\d+)?(\/.*)?$/.test(trimmed)
    ) {
      const isLocal = trimmed.startsWith('localhost') || trimmed.startsWith('127.0.0.1');
      trimmed = (isLocal ? 'http://' : 'https://') + trimmed;
    } else {
      return '';
    }
  }

  try {
    const parsed = new URL(trimmed);

    // Protocol must strictly be http: or https:
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }

    // Hostname must be valid
    if (!parsed.hostname || parsed.hostname.length < 3) {
      return '';
    }

    // Check placeholder domains
    if (
      parsed.hostname === 'your-project.supabase.co' ||
      parsed.hostname.includes('your-project') ||
      parsed.hostname === 'example.com'
    ) {
      return '';
    }

    return parsed.origin;
  } catch {
    return '';
  }
}

/**
 * Normalizes and cleans a Supabase Anon / Publishable key.
 */
export function normalizeSupabaseKey(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return '';
  let trimmed = raw.trim().replace(/^["'`]+/, '').replace(/["'`]+$/, '').trim();
  if (
    !trimmed ||
    trimmed === 'undefined' ||
    trimmed === 'null' ||
    trimmed.includes('your-supabase-') ||
    trimmed === 'ecomhub-canonical-anon-key'
  ) {
    return '';
  }
  return trimmed;
}

export const CANONICAL_SUPABASE_PROJECT_URL = 'https://qmzvvuvlvjlykbxmybrd.supabase.co';
export const CANONICAL_SUPABASE_PROJECT_REF = 'qmzvvuvlvjlykbxmybrd';

function resolveInitialUrl(): string {
  const candidate =
    getEnvValue('VITE_SUPABASE_URL') ||
    getEnvValue('SUPABASE_URL') ||
    CANONICAL_SUPABASE_PROJECT_URL;
  const clean = normalizeSupabaseUrl(candidate);
  return clean || CANONICAL_SUPABASE_PROJECT_URL;
}

function resolveInitialKey(): string {
  const candidate =
    getEnvValue('VITE_SUPABASE_PUBLISHABLE_KEY') ||
    '';
  return normalizeSupabaseKey(candidate);
}

export let SUPABASE_URL = resolveInitialUrl();
export let SUPABASE_ANON_KEY = resolveInitialKey();

// Only considered configured when real, non-placeholder credentials exist
export let isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export interface SupabaseConfigStatus {
  isConfigured: boolean;
  hasValidUrl: boolean;
  hasValidKey: boolean;
  url: string;
  error: string | null;
  rawUrl: string;
  projectRef: string;
}

/**
 * Provides diagnostic information about Supabase environment configuration.
 * Useful for development error boundaries and configuration help UI.
 */
export function getSupabaseConfigStatus(): SupabaseConfigStatus {
  const rawUrl =
    getEnvValue('VITE_SUPABASE_URL') ||
    getEnvValue('SUPABASE_URL') ||
    CANONICAL_SUPABASE_PROJECT_URL;
  const rawKey =
    getEnvValue('VITE_SUPABASE_PUBLISHABLE_KEY') ||
    '';
  const cleanUrl = normalizeSupabaseUrl(rawUrl) || CANONICAL_SUPABASE_PROJECT_URL;
  const cleanKey = normalizeSupabaseKey(rawKey);
  const configured = Boolean(cleanUrl && cleanKey);

  return {
    isConfigured: configured,
    hasValidUrl: Boolean(cleanUrl),
    hasValidKey: Boolean(cleanKey),
    url: cleanUrl,
    error: configured
      ? null
      : 'Supabase authentication service is not fully configured. Missing VITE_SUPABASE_PUBLISHABLE_KEY for project qmzvvuvlvjlykbxmybrd.',
    rawUrl,
    projectRef: CANONICAL_SUPABASE_PROJECT_REF,
  };
}

export function getAppUrl(): string {
  // 1. Derive dynamically from browser origin if available
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    const origin = window.location.origin.replace(/\/+$/, '');
    return origin;
  }

  // 2. Check configured VITE_APP_URL or APP_URL
  const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
  const procEnv = typeof process !== 'undefined' ? process.env : undefined;
  const configured =
    metaEnv?.VITE_APP_URL ||
    procEnv?.APP_URL ||
    '';

  if (configured && configured !== 'MY_APP_URL' && typeof configured === 'string' && configured.trim()) {
    const trimmed = configured.trim().replace(/\/+$/, '');
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
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
  const cleanKey = normalizeSupabaseKey(anonKey);
  if (!cleanUrl || !cleanKey) {
    return null;
  }
  try {
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
  } catch (err) {
    console.error('[Supabase Init Error] Failed to dynamically configure Supabase client:', err);
    return null;
  }
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null;
  }
  if (!supabaseInstance) {
    try {
      if (!SUPABASE_URL.startsWith('http://') && !SUPABASE_URL.startsWith('https://')) {
        console.warn('[Supabase Init Warning] Aborting client creation: Invalid URL protocol:', SUPABASE_URL);
        return null;
      }
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
    } catch (err) {
      console.error('[Supabase Init Error] Failed to create Supabase client:', err);
      supabaseInstance = null;
      isSupabaseConfigured = false;
      return null;
    }
  }
  return supabaseInstance;
}

export const supabase: SupabaseClient | null = isSupabaseConfigured ? getSupabaseClient() : null;
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
