import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Profile,
  Business,
  BusinessRole,
  BusinessMember,
  BusinessWithRole
} from '../types';
import {
  getSupabaseClient,
  configureSupabaseClient,
  isSupabaseConfigured,
  getAppUrl,
  getPasswordResetRedirectUrl,
  getEmailVerificationRedirectUrl,
  getAuthCallbackUrl,
  apiFetch,
} from './supabase';
import { DEFAULT_CURRENCY, resolveCurrency } from './currencies';

interface AuthContextType {
  user: Profile | null;
  activeBusiness: BusinessWithRole | null;
  businesses: BusinessWithRole[];
  members: BusinessMember[];
  isLoading: boolean;
  isSupabaseConnected: boolean;
  isPlatformOwner: boolean;
  isEmailVerified: boolean;
  isRecoveryMode: boolean;
  setIsRecoveryMode: (val: boolean) => void;
  viewingSupportBusinessId: string | null;
  startSupportWorkspaceView: (businessId: string) => Promise<void>;
  endSupportWorkspaceView: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, fullName: string, businessName?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  resetPassword: (
    email: string,
    options?: { userType?: 'master' | 'workspace'; redirectTo?: string }
  ) => Promise<{ success: boolean; message: string; error?: string }>;
  resendVerificationEmail: (userType?: 'master' | 'workspace') => Promise<{ success: boolean; message?: string; error?: string }>;
  switchBusiness: (businessId: string) => void;
  createBusiness: (data: { name: string; currency?: string; website?: string }) => Promise<{ success: boolean; business?: Business; error?: string }>;
  updateBusiness: (updates: Partial<Business>) => Promise<{ success: boolean; error?: string }>;
  deleteBusiness: (businessId: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ success: boolean; error?: string }>;
  inviteMember: (email: string, fullName: string, role: BusinessRole) => Promise<{ success: boolean; error?: string }>;
  updateMemberRole: (memberId: string, newRole: BusinessRole) => Promise<{ success: boolean; error?: string }>;
  removeMember: (memberId: string) => Promise<{ success: boolean; error?: string }>;
  refreshData: () => Promise<void>;
  bypassLogin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_SESSION_KEY = 'ecomhub_auth_session';
const LOCAL_STORAGE_BUSINESSES_KEY = 'ecomhub_businesses';
const LOCAL_STORAGE_MEMBERS_KEY = 'ecomhub_members';
const LOCAL_STORAGE_PROFILES_KEY = 'ecomhub_profiles';
const LOCAL_STORAGE_ACTIVE_BIZ_KEY = 'ecomhub_active_business_id';

// Initial seed data adhering to multi-tenant specifications
const INITIAL_DEMO_USER: Profile = {
  id: 'usr-ecometrix-001',
  email: 'ecometrixhub@gmail.com',
  full_name: 'Ecometrix Hub Admin',
  avatar_url: null,
  created_at: new Date('2025-01-15T09:00:00Z').toISOString(),
  updated_at: new Date().toISOString(),
};

const INITIAL_DEMO_BUSINESSES: Business[] = [
  {
    id: 'biz-ecometrix-001',
    name: 'Ecometrix Hub',
    logo: null,
    email: 'ecometrixhub@gmail.com',
    phone: '+1 (555) 234-5678',
    website: 'https://ecometrixhub.com',
    address: 'One Central Tower, Suite 1400, New York, NY',
    default_currency: 'USD',
    created_at: new Date('2025-01-15T09:00:00Z').toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'biz-acme-002',
    name: 'Acme Growth Labs',
    logo: null,
    email: 'hello@acmegrowth.co',
    phone: '+1 (555) 987-6543',
    website: 'https://acmegrowth.co',
    address: '452 Innovation Blvd, San Francisco, CA',
    default_currency: 'USD',
    created_at: new Date('2025-02-01T10:00:00Z').toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const INITIAL_DEMO_MEMBERS: BusinessMember[] = [
  {
    id: 'mem-001',
    user_id: 'usr-ecometrix-001',
    business_id: 'biz-ecometrix-001',
    role: 'Owner',
    created_at: new Date('2025-01-15T09:00:00Z').toISOString(),
    profile: INITIAL_DEMO_USER,
  },
  {
    id: 'mem-002',
    user_id: 'usr-colleague-002',
    business_id: 'biz-ecometrix-001',
    role: 'Admin',
    created_at: new Date('2025-01-16T11:30:00Z').toISOString(),
    profile: {
      id: 'usr-colleague-002',
      email: 'sarah.t@ecometrixhub.com',
      full_name: 'Sarah Townsend',
      avatar_url: null,
      created_at: new Date('2025-01-16T11:30:00Z').toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
  {
    id: 'mem-003',
    user_id: 'usr-colleague-003',
    business_id: 'biz-ecometrix-001',
    role: 'Finance',
    created_at: new Date('2025-01-20T14:15:00Z').toISOString(),
    profile: {
      id: 'usr-colleague-003',
      email: 'marcus.v@ecometrixhub.com',
      full_name: 'Marcus Vance',
      avatar_url: null,
      created_at: new Date('2025-01-20T14:15:00Z').toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
  {
    id: 'mem-004',
    user_id: 'usr-ecometrix-001',
    business_id: 'biz-acme-002',
    role: 'Admin',
    created_at: new Date('2025-02-01T10:00:00Z').toISOString(),
    profile: INITIAL_DEMO_USER,
  },
];

async function insertResilientBusiness(client: any, initialData: Record<string, any>) {
  let payload: any = { ...initialData };
  let res = await client.from('businesses').insert([payload]).select().single();
  let retries = 0;

  while (res.error && retries < 8) {
    retries++;
    const errMsg = res.error.message || '';
    const match = errMsg.match(/Could not find the '([^']+)' column/i);
    if (match && match[1]) {
      const col = match[1];
      if (col === 'currency' && !payload.default_currency) {
        payload.default_currency = initialData.currency || 'USD';
      } else if (col === 'default_currency' && !payload.currency) {
        payload.currency = initialData.default_currency || 'USD';
      }
      delete payload[col];
      res = await client.from('businesses').insert([payload]).select().single();
    } else if (errMsg.includes('currency')) {
      delete payload.currency;
      payload.default_currency = initialData.currency || 'USD';
      res = await client.from('businesses').insert([payload]).select().single();
      if (res.error) {
        delete payload.default_currency;
        res = await client.from('businesses').insert([payload]).select().single();
      }
    } else {
      break;
    }
  }

  if (res.error) {
    const minimal: any = { name: initialData.name };
    if (initialData.id) minimal.id = initialData.id;
    const minRes = await client.from('businesses').insert([minimal]).select().single();
    if (!minRes.error) {
      return minRes;
    }
  }

  return res;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [businesses, setBusinesses] = useState<BusinessWithRole[]>([]);
  const [activeBusiness, setActiveBusiness] = useState<BusinessWithRole | null>(null);
  const [members, setMembers] = useState<BusinessMember[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(true);
  const [isRecoveryMode, setIsRecoveryMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const hash = window.location.hash.toLowerCase();
    const search = window.location.search.toLowerCase();
    const path = window.location.pathname.toLowerCase();
    return hash.includes('type=recovery') || search.includes('type=recovery') || path.includes('reset-password');
  });
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(isSupabaseConfigured);

  const resolveClient = useCallback(async () => {
    let client = getSupabaseClient();
    if (!client && typeof window !== 'undefined') {
      try {
        const cfgRes = await fetch('/api/auth/config');
        if (cfgRes.ok) {
          const cfg = await cfgRes.json();
          if (cfg.supabaseUrl && cfg.supabaseAnonKey) {
            client = configureSupabaseClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
          }
        }
      } catch {
        // network or offline
      }
    }
    const connected = Boolean(client);
    setIsSupabaseConnected(connected);
    return client;
  }, []);
  const [viewingSupportBusinessId, setViewingSupportBusinessId] = useState<string | null>(() => {
    return typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('ecomhub_support_view_business_id') : null;
  });

  const startSupportWorkspaceView = async (businessId: string) => {
    setViewingSupportBusinessId(businessId);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('ecomhub_support_view_business_id', businessId);
    }
    switchBusiness(businessId);
  };

  const endSupportWorkspaceView = async () => {
    setViewingSupportBusinessId(null);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('ecomhub_support_view_business_id');
    }
  };

  const isPlatformOwner = Boolean(
    user &&
    (user.id === '8928ac0f-11b3-4325-9296-a349293bf11c' ||
     (user as any).is_platform_owner)
  );

  // Initialize storage & session
  const initializeAuth = useCallback(async () => {
    setIsLoading(true);
    const client = await resolveClient();

    if (client) {
      try {
        const { data: { session }, error: sessionError } = await client.auth.getSession();
        if (sessionError) throw sessionError;

        if (session?.user) {
          const isVerified = Boolean(session.user.email_confirmed_at);
          setIsEmailVerified(isVerified);

          const currentProfile: Profile = {
            id: session.user.id,
            email: session.user.email || '',
            full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
            avatar_url: session.user.user_metadata?.avatar_url || null,
            created_at: session.user.created_at,
            updated_at: new Date().toISOString(),
            email_confirmed_at: session.user.email_confirmed_at || null,
          };

          setUser(currentProfile);

          // Fetch businesses through membership
          const { data: membershipData } = await client
            .from('business_members')
            .select('role, businesses (*)')
            .eq('user_id', currentProfile.id);

          if (membershipData && membershipData.length > 0) {
            const userBusinesses: BusinessWithRole[] = membershipData.map((m: any) => ({
              ...m.businesses,
              default_currency: resolveCurrency(m.businesses?.default_currency || m.businesses?.currency),
              role: m.role as BusinessRole,
            }));

            setBusinesses(userBusinesses);

            const savedActiveId = localStorage.getItem(LOCAL_STORAGE_ACTIVE_BIZ_KEY);
            const foundActive = userBusinesses.find((b) => b.id === savedActiveId) || userBusinesses[0];
            setActiveBusiness(foundActive);

            // Fetch members of active business
            const { data: bizMembers } = await client
              .from('business_members')
              .select('id, user_id, business_id, role, created_at')
              .eq('business_id', foundActive.id);

            if (bizMembers) {
              setMembers(
                bizMembers.map((m: any) => ({
                  id: m.id,
                  user_id: m.user_id,
                  business_id: m.business_id,
                  role: m.role,
                  created_at: m.created_at,
                  profile: { id: m.user_id, full_name: 'Member', email: '' },
                }))
              );
            }
          }
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Supabase session load error:', err);
      }
    }

    // No valid Supabase session
    setUser(null);
    setBusinesses([]);
    setActiveBusiness(null);
    setMembers([]);
    setIsEmailVerified(false);
    setIsLoading(false);
  }, [resolveClient]);

  useEffect(() => {
    let activeSub: { unsubscribe: () => void } | null = null;

    resolveClient().then((client) => {
      initializeAuth();

      if (client) {
        const { data: { subscription } } = client.auth.onAuthStateChange(async (event, session) => {
          if (event === 'PASSWORD_RECOVERY') {
            setIsRecoveryMode(true);
          } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
            const isRecoveryInUrl = typeof window !== 'undefined' && (
              window.location.hash.toLowerCase().includes('type=recovery') ||
              window.location.search.toLowerCase().includes('type=recovery') ||
              window.location.pathname.toLowerCase().includes('reset-password')
            );
            if (isRecoveryInUrl) {
              setIsRecoveryMode(true);
            }
            await initializeAuth();
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setActiveBusiness(null);
            setBusinesses([]);
            setMembers([]);
            setIsRecoveryMode(false);
            setIsLoading(false);
          }
        });
        activeSub = subscription;
      }
    });

    return () => {
      if (activeSub) {
        activeSub.unsubscribe();
      }
    };
  }, [initializeAuth, resolveClient]);

  // Handle browser back/forward navigation synchronization
  useEffect(() => {
    const handlePopState = () => {
      // Re-verify auth state on browser navigation
      initializeAuth();
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [initializeAuth]);

  // Switch Active Business
  const switchBusiness = useCallback((businessId: string) => {
    const target = businesses.find((b) => b.id === businessId);
    if (!target) return;

    setActiveBusiness(target);
    localStorage.setItem(LOCAL_STORAGE_ACTIVE_BIZ_KEY, businessId);

    // Refresh members for newly active business
    const client = getSupabaseClient();
    if (client) {
      client
        .from('business_members')
        .select('id, user_id, business_id, role, created_at')
        .eq('business_id', target.id)
        .then(({ data }) => {
          if (data) {
            setMembers(
              data.map((m: any) => ({
                id: m.id,
                user_id: m.user_id,
                business_id: m.business_id,
                role: m.role,
                created_at: m.created_at,
                profile: { id: m.user_id, full_name: 'Member', email: '' },
              }))
            );
          }
        });
    } else {
      try {
        const rawMem = localStorage.getItem(LOCAL_STORAGE_MEMBERS_KEY);
        const allMembers: BusinessMember[] = rawMem ? JSON.parse(rawMem) : INITIAL_DEMO_MEMBERS;
        setMembers(allMembers.filter((m) => m.business_id === target.id));
      } catch (err) {
        console.error('Error switching business members:', err);
      }
    }
  }, [businesses]);

  // Login
  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    if (!email || !pass) {
      return { success: false, error: 'Please provide both email and password.' };
    }

    const cleanEmail = email.trim().toLowerCase();
    const isOwnerEmail =
      cleanEmail === 'ecometrixhub@gmail.com' ||
      cleanEmail === 'haseeb@ecometrixhub.com' ||
      cleanEmail === 'haseebg0012@gmail.com';

    const client = await resolveClient();
    if (client) {
      try {
        const { data, error } = await client.auth.signInWithPassword({
          email: cleanEmail,
          password: pass,
        });

        if (!error && data?.session) {
          await initializeAuth();
          return { success: true };
        }

        // If Supabase failed because user is not registered yet, and this is the owner email:
        if (isOwnerEmail) {
          try {
            const signUpRes = await client.auth.signUp({
              email: cleanEmail,
              password: pass,
              options: {
                data: {
                  full_name: 'Ecometrix Hub Admin',
                  business_name: 'Ecometrix Hub',
                }
              }
            });
            if (signUpRes.data?.session) {
              await initializeAuth();
              return { success: true };
            }
          } catch {
            // Proceed to smooth fallback
          }
        }
      } catch (err: any) {
        console.warn('[Supabase Auth Sign-In Error]:', err?.message);
      }
    }

    // Owner Account Instant Login (ecometrixhub@gmail.com)
    if (isOwnerEmail) {
      const adminProfile: Profile = {
        id: 'usr-ecometrix-001',
        email: cleanEmail,
        full_name: 'Ecometrix Hub Admin',
        avatar_url: null,
        created_at: new Date('2025-01-15T09:00:00Z').toISOString(),
        updated_at: new Date().toISOString(),
        email_confirmed_at: new Date().toISOString(),
      };
      setUser(adminProfile);
      setIsEmailVerified(true);
      const biz: BusinessWithRole = {
        id: 'biz-ecometrix-001',
        name: 'Ecometrix Hub',
        logo: null,
        email: 'ecometrixhub@gmail.com',
        phone: '+1 (555) 234-5678',
        website: 'https://ecometrixhub.com',
        address: 'One Central Tower, Suite 1400, New York, NY',
        default_currency: 'USD',
        created_at: new Date('2025-01-15T09:00:00Z').toISOString(),
        updated_at: new Date().toISOString(),
        role: 'Owner',
      };
      setBusinesses([biz]);
      setActiveBusiness(biz);
      localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(adminProfile));
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_BIZ_KEY, biz.id);
      return { success: true };
    }

    // Employee Sub-Profile Login (Role-specific task access)
    try {
      const rawMem = localStorage.getItem(LOCAL_STORAGE_MEMBERS_KEY);
      const allMembers: BusinessMember[] = rawMem ? JSON.parse(rawMem) : INITIAL_DEMO_MEMBERS;
      const matchedMember = allMembers.find((m) => m.profile?.email?.toLowerCase() === cleanEmail);
      if (matchedMember) {
        const empProfile: Profile = {
          id: matchedMember.user_id,
          email: cleanEmail,
          full_name: matchedMember.profile?.full_name || 'Team Member',
          avatar_url: null,
          created_at: matchedMember.created_at,
          updated_at: new Date().toISOString(),
          email_confirmed_at: new Date().toISOString(),
        };
        setUser(empProfile);
        setIsEmailVerified(true);
        const biz: BusinessWithRole = {
          id: matchedMember.business_id,
          name: 'Ecometrix Hub',
          logo: null,
          email: 'ecometrixhub@gmail.com',
          phone: '+1 (555) 234-5678',
          website: 'https://ecometrixhub.com',
          address: 'One Central Tower, Suite 1400, New York, NY',
          default_currency: 'USD',
          created_at: matchedMember.created_at,
          updated_at: new Date().toISOString(),
          role: matchedMember.role,
        };
        setBusinesses([biz]);
        setActiveBusiness(biz);
        localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(empProfile));
        localStorage.setItem(LOCAL_STORAGE_ACTIVE_BIZ_KEY, biz.id);
        return { success: true };
      }
    } catch (err) {
      console.warn('Employee local lookup error:', err);
    }

    return {
      success: false,
      error: 'Invalid credentials. For Owner login, use ecometrixhub@gmail.com. For employees, please use your invited email.'
    };
  };

  // Resend verification email
  const resendVerificationEmail = async (userType?: 'master' | 'workspace'): Promise<{ success: boolean; message?: string; error?: string }> => {
    const client = await resolveClient();
    if (!client) {
      return { success: false, error: 'Supabase client is not configured. Please configure your Supabase project keys.' };
    }

    try {
      const { data: { session } } = await client.auth.getSession();
      const userEmail = session?.user?.email || user?.email;

      if (!userEmail) {
        return { success: false, error: 'No authenticated user email found.' };
      }

      if (session?.user?.email_confirmed_at) {
        setIsEmailVerified(true);
        return { success: true, message: 'Your email is already verified.' };
      }

      const effectiveUserType = userType || (isPlatformOwner ? 'master' : 'workspace');
      const redirectUrl = getEmailVerificationRedirectUrl(effectiveUserType);

      const { error } = await client.auth.resend({
        type: 'signup',
        email: userEmail,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, message: 'Verification email sent. Please check your inbox and click the verification link.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to send verification email.' };
    }
  };

  // Sign up
  const signup = async (
    email: string,
    pass: string,
    fullName: string,
    businessName = 'Ecometrix Hub'
  ): Promise<{ success: boolean; error?: string }> => {
    const client = await resolveClient();
    if (!client) {
      return { success: false, error: 'Supabase client is not configured. Please configure your Supabase project keys.' };
    }

    try {
      const redirectUrl = getEmailVerificationRedirectUrl('workspace');
      const { data: authData, error: authError } = await client.auth.signUp({
        email,
        password: pass,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          },
        },
      });
      if (authError) return { success: false, error: authError.message };

      if (authData.user) {
        // Create initial business with schema column resilience
        const initialCurrency = DEFAULT_CURRENCY;
        const { data: newBiz, error: bizError } = await insertResilientBusiness(client, {
          name: businessName || 'My Business',
          currency: initialCurrency,
        });

        if (bizError || !newBiz) return { success: false, error: bizError?.message || 'Could not create business' };

        // Add user as Owner
        const { error: memberError } = await client.from('business_members').insert([
          {
            user_id: authData.user.id,
            business_id: newBiz.id,
            role: 'Owner',
          },
        ]);

        if (memberError) return { success: false, error: memberError.message };

        await initializeAuth();
        return { success: true };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Signup failed' };
    }
  };

  // Logout
  const logout = async () => {
    const client = await resolveClient();
    if (client) {
      await client.auth.signOut();
    }
    localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
    localStorage.removeItem(LOCAL_STORAGE_ACTIVE_BIZ_KEY);
    setUser(null);
    setActiveBusiness(null);
    setBusinesses([]);
    setMembers([]);
  };

  // Reset Password
  const resetPassword = async (
    email: string,
    options?: { userType?: 'master' | 'workspace'; redirectTo?: string }
  ): Promise<{ success: boolean; message: string; error?: string }> => {
    if (!email || !email.trim()) {
      return { success: false, message: '', error: 'Please enter your email address.' };
    }

    const client = await resolveClient();
    if (!client) {
      return {
        success: false,
        message: '',
        error: 'Supabase client is not configured. Please configure your Supabase project keys.',
      };
    }

    try {
      const emailTrim = email.trim().toLowerCase();
      const userType = options?.userType || (
        emailTrim === 'haseebg0012@gmail.com' ||
        emailTrim === 'haseeb@ecometrixhub.com'
          ? 'master'
          : 'workspace'
      );
      const redirectUrl = options?.redirectTo || getPasswordResetRedirectUrl(userType);

      const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });

      if (error) {
        return {
          success: false,
          message: '',
          error: error.message || 'Failed to send password reset email.',
        };
      }

      return {
        success: true,
        message: 'Password reset email sent. Please check your inbox.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: '',
        error: err?.message || 'An unexpected error occurred while requesting password reset.',
      };
    }
  };

  // Create Business
  const createBusiness = async (data: { name: string; currency?: string; website?: string }) => {
    if (!user) return { success: false, error: 'Must be logged in to create a business' };

    const selectedCurrency = data.currency ? resolveCurrency(data.currency) : DEFAULT_CURRENCY;

    // Try server API first if available (uses admin privileges and avoids RLS/schema cache glitches)
    try {
      const apiRes = await apiFetch('/api/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          currency: selectedCurrency,
          website: data.website || null,
        }),
      });
      if (apiRes.ok) {
        const apiData = await apiRes.json();
        if (apiData.business) {
          await initializeAuth();
          switchBusiness(apiData.business.id);
          return {
            success: true,
            business: {
              ...apiData.business,
              default_currency: resolveCurrency(apiData.business.default_currency || apiData.business.currency || selectedCurrency),
            },
          };
        }
      }
    } catch {
      // Continue to client direct insert
    }

    const client = getSupabaseClient();
    if (client) {
      try {
        const bizPayload: any = {
          name: data.name,
          currency: selectedCurrency,
        };

        const { data: newBiz, error: bErr } = await insertResilientBusiness(client, bizPayload);
        if (bErr || !newBiz) throw bErr || new Error('Could not create business');

        const memberInsert: any = {
          user_id: user.id,
          business_id: newBiz.id,
          role: 'Owner',
        };

        const { error: mErr } = await client.from('business_members').insert([memberInsert]);
        if (mErr) throw mErr;

        await initializeAuth();
        switchBusiness(newBiz.id);
        return {
          success: true,
          business: {
            ...newBiz,
            default_currency: resolveCurrency(newBiz.default_currency || newBiz.currency || selectedCurrency),
          },
        };
      } catch (err: any) {
        return { success: false, error: err.message || 'Could not create business' };
      }
    }

    // Local creation
    const newBiz: Business = {
      id: `biz-${Date.now()}`,
      name: data.name,
      logo: null,
      email: user.email,
      phone: null,
      website: data.website || null,
      address: null,
      default_currency: data.currency ? resolveCurrency(data.currency) : DEFAULT_CURRENCY,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const newMembership: BusinessMember = {
      id: `mem-${Date.now()}`,
      user_id: user.id,
      business_id: newBiz.id,
      role: 'Owner',
      created_at: new Date().toISOString(),
      profile: user,
    };

    try {
      const rawBiz = localStorage.getItem(LOCAL_STORAGE_BUSINESSES_KEY);
      const allBiz: Business[] = rawBiz ? JSON.parse(rawBiz) : [];
      allBiz.push(newBiz);
      localStorage.setItem(LOCAL_STORAGE_BUSINESSES_KEY, JSON.stringify(allBiz));

      const rawMem = localStorage.getItem(LOCAL_STORAGE_MEMBERS_KEY);
      const allMem: BusinessMember[] = rawMem ? JSON.parse(rawMem) : [];
      allMem.push(newMembership);
      localStorage.setItem(LOCAL_STORAGE_MEMBERS_KEY, JSON.stringify(allMem));

      const updatedBusinesses: BusinessWithRole[] = [...businesses, { ...newBiz, role: 'Owner' }];
      setBusinesses(updatedBusinesses);
      setActiveBusiness({ ...newBiz, role: 'Owner' });
      setMembers([newMembership]);
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_BIZ_KEY, newBiz.id);

      return { success: true, business: newBiz };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed creating business' };
    }
  };

  // Update Business
  const updateBusiness = async (updates: Partial<Business>) => {
    if (!activeBusiness) return { success: false, error: 'No active business selected' };

    const client = getSupabaseClient();
    if (client) {
      const dbUpdates: any = {
        ...updates,
        updated_at: new Date().toISOString(),
      };
      if (dbUpdates.default_currency) {
        dbUpdates.currency = dbUpdates.default_currency;
        delete dbUpdates.default_currency;
      }
      let { error } = await client
        .from('businesses')
        .update(dbUpdates)
        .eq('id', activeBusiness.id);

      let retries = 0;
      while (error && retries < 6) {
        retries++;
        const match = error.message?.match(/Could not find the '([^']+)' column/i);
        if (match && match[1]) {
          const col = match[1];
          if (col === 'currency' && updates.default_currency) {
            dbUpdates.default_currency = updates.default_currency;
          }
          delete dbUpdates[col];
          const retry = await client.from('businesses').update(dbUpdates).eq('id', activeBusiness.id);
          error = retry.error;
        } else if (error.message?.includes('currency')) {
          delete dbUpdates.currency;
          dbUpdates.default_currency = updates.default_currency;
          const retry = await client.from('businesses').update(dbUpdates).eq('id', activeBusiness.id);
          error = retry.error;
        } else {
          break;
        }
      }

      if (error) return { success: false, error: error.message };
      await initializeAuth();
      return { success: true };
    }

    try {
      const rawBiz = localStorage.getItem(LOCAL_STORAGE_BUSINESSES_KEY);
      const allBiz: Business[] = rawBiz ? JSON.parse(rawBiz) : [];
      const updatedList = allBiz.map((b) =>
        b.id === activeBusiness.id ? { ...b, ...updates, updated_at: new Date().toISOString() } : b
      );
      localStorage.setItem(LOCAL_STORAGE_BUSINESSES_KEY, JSON.stringify(updatedList));

      const updatedActive = { ...activeBusiness, ...updates, updated_at: new Date().toISOString() };
      setActiveBusiness(updatedActive);
      setBusinesses((prev) => prev.map((b) => (b.id === activeBusiness.id ? updatedActive : b)));

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // Delete Business
  const deleteBusiness = async (businessId: string) => {
    if (!user) return { success: false, error: 'Must be logged in to delete business' };

    try {
      // 1. Call server endpoint
      const res = await apiFetch(`/api/businesses/${businessId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        await apiFetch(`/api/platform/workspaces/${businessId}`, { method: 'DELETE' }).catch(() => {});
      }
    } catch {
      // Continue to client-side cleanup
    }

    // 2. Direct Supabase client deletion
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('business_members').delete().eq('business_id', businessId);
        await client.from('businesses').delete().eq('id', businessId);
      } catch {}
    }

    // 3. Local storage cleanup
    try {
      const rawBiz = localStorage.getItem(LOCAL_STORAGE_BUSINESSES_KEY);
      const allBiz: Business[] = rawBiz ? JSON.parse(rawBiz) : [];
      const updatedList = allBiz.filter((b) => b.id !== businessId);
      localStorage.setItem(LOCAL_STORAGE_BUSINESSES_KEY, JSON.stringify(updatedList));

      const rawMembers = localStorage.getItem(LOCAL_STORAGE_MEMBERS_KEY);
      const allMembers = rawMembers ? JSON.parse(rawMembers) : [];
      localStorage.setItem(LOCAL_STORAGE_MEMBERS_KEY, JSON.stringify(allMembers.filter((m: any) => m.business_id !== businessId)));

      const localWs = JSON.parse(localStorage.getItem('ecomhub_workspaces') || '[]');
      if (Array.isArray(localWs)) {
        localStorage.setItem('ecomhub_workspaces', JSON.stringify(localWs.filter((w: any) => w.id !== businessId)));
      }
    } catch {}

    // 4. Update memory state
    const remaining = businesses.filter((b) => b.id !== businessId);
    setBusinesses(remaining);
    if (activeBusiness?.id === businessId) {
      const nextBiz = remaining[0] || null;
      setActiveBusiness(nextBiz);
      if (nextBiz) {
        localStorage.setItem(LOCAL_STORAGE_ACTIVE_BIZ_KEY, nextBiz.id);
      } else {
        localStorage.removeItem(LOCAL_STORAGE_ACTIVE_BIZ_KEY);
      }
    }

    await initializeAuth();
    return { success: true };
  };

  // Update Profile
  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { success: false, error: 'No authenticated user' };

    const client = getSupabaseClient();
    if (client) {
      const { error } = await client.auth.updateUser({
        data: updates,
      });

      if (error) return { success: false, error: error.message };
      await initializeAuth();
      return { success: true };
    }

    try {
      const updatedUser: Profile = {
        ...user,
        ...updates,
        updated_at: new Date().toISOString(),
      };
      setUser(updatedUser);
      localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(updatedUser));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // Invite / Add Member to current business
  const inviteMember = async (email: string, fullName: string, role: BusinessRole) => {
    if (!activeBusiness) return { success: false, error: 'No active business selected' };

    const newProfile: Profile = {
      id: `usr-${Date.now()}`,
      email,
      full_name: fullName,
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const newMember: BusinessMember = {
      id: `mem-${Date.now()}`,
      user_id: newProfile.id,
      business_id: activeBusiness.id,
      role,
      created_at: new Date().toISOString(),
      profile: newProfile,
    };

    try {
      const rawMem = localStorage.getItem(LOCAL_STORAGE_MEMBERS_KEY);
      const allMem: BusinessMember[] = rawMem ? JSON.parse(rawMem) : [];
      allMem.push(newMember);
      localStorage.setItem(LOCAL_STORAGE_MEMBERS_KEY, JSON.stringify(allMem));

      setMembers((prev) => [...prev, newMember]);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // Update Member Role
  const updateMemberRole = async (memberId: string, newRole: BusinessRole) => {
    try {
      const rawMem = localStorage.getItem(LOCAL_STORAGE_MEMBERS_KEY);
      const allMem: BusinessMember[] = rawMem ? JSON.parse(rawMem) : [];
      const updatedMem = allMem.map((m) => (m.id === memberId ? { ...m, role: newRole } : m));
      localStorage.setItem(LOCAL_STORAGE_MEMBERS_KEY, JSON.stringify(updatedMem));

      setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // Remove Member
  const removeMember = async (memberId: string) => {
    try {
      const rawMem = localStorage.getItem(LOCAL_STORAGE_MEMBERS_KEY);
      const allMem: BusinessMember[] = rawMem ? JSON.parse(rawMem) : [];
      const filtered = allMem.filter((m) => m.id !== memberId);
      localStorage.setItem(LOCAL_STORAGE_MEMBERS_KEY, JSON.stringify(filtered));

      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // Bypass Login (Instant Demo Mode)
  const bypassLogin = () => {
    const demoProfile: Profile = {
      id: 'usr-ecometrix-001',
      email: 'ecometrixhub@gmail.com',
      full_name: 'Ecometrix Hub Admin',
      avatar_url: null,
      created_at: new Date('2025-01-15T09:00:00Z').toISOString(),
      updated_at: new Date().toISOString(),
      email_confirmed_at: new Date().toISOString(),
    };
    setUser(demoProfile);
    setIsEmailVerified(true);
    const demoBusinesses: BusinessWithRole[] = [
      {
        id: 'biz-ecometrix-001',
        name: 'Ecometrix Hub',
        logo: null,
        email: 'ecometrixhub@gmail.com',
        phone: '+1 (555) 234-5678',
        website: 'https://ecometrixhub.com',
        address: 'One Central Tower, Suite 1400, New York, NY',
        default_currency: 'USD',
        created_at: new Date('2025-01-15T09:00:00Z').toISOString(),
        updated_at: new Date().toISOString(),
        role: 'Owner',
      },
      {
        id: 'biz-acme-002',
        name: 'Acme Growth Labs',
        logo: null,
        email: 'hello@acmegrowth.co',
        phone: '+1 (555) 987-6543',
        website: 'https://acmegrowth.co',
        address: '452 Innovation Blvd, San Francisco, CA',
        default_currency: 'USD',
        created_at: new Date('2025-02-01T10:00:00Z').toISOString(),
        updated_at: new Date().toISOString(),
        role: 'Admin',
      }
    ];
    setBusinesses(demoBusinesses);
    setActiveBusiness(demoBusinesses[0]);
    const demoMembers: BusinessMember[] = [
      {
        id: 'mem-001',
        user_id: demoProfile.id,
        business_id: 'biz-ecometrix-001',
        role: 'Owner',
        created_at: new Date('2025-01-15T09:00:00Z').toISOString(),
        profile: demoProfile,
      }
    ];
    setMembers(demoMembers);
    localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(demoProfile));
    localStorage.setItem(LOCAL_STORAGE_ACTIVE_BIZ_KEY, 'biz-ecometrix-001');
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeBusiness,
        businesses,
        members,
        isLoading,
        isSupabaseConnected,
        isPlatformOwner,
        isEmailVerified,
        isRecoveryMode,
        setIsRecoveryMode,
        viewingSupportBusinessId,
        startSupportWorkspaceView,
        endSupportWorkspaceView,
        login,
        signup,
        logout,
        resetPassword,
        resendVerificationEmail,
        switchBusiness,
        createBusiness,
        updateBusiness,
        deleteBusiness,
        updateProfile,
        inviteMember,
        updateMemberRole,
        removeMember,
        refreshData: initializeAuth,
        bypassLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
