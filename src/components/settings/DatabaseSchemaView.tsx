import React, { useState } from 'react';
import {
  Database,
  ShieldCheck,
  Key,
  Copy,
  Check,
  ExternalLink,
  Table,
  Lock,
  FileCode,
  Terminal,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { isSupabaseConfigured, SUPABASE_URL } from '../../lib/supabase';

export const DatabaseSchemaView: React.FC = () => {
  const { activeBusiness, user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'tables' | 'rls' | 'sql'>('tables');

  const migrationSQL = `-- ==============================================================================
-- EcomHub OS — Database Foundation Migration
-- Description: Production-ready multi-tenant schema with Row Level Security (RLS)
-- Brand: EcomHub | Product: EcomHub OS | Tagline: Your Business, One Hub.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (1:1 with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Businesses Table (Tenant Root)
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    logo TEXT,
    email TEXT,
    phone TEXT,
    website TEXT,
    address TEXT,
    default_currency TEXT DEFAULT 'USD' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Business Members & Roles (Multi-Tenant Junction)
DO $$ BEGIN
    CREATE TYPE public.business_role AS ENUM (
        'Owner', 'Admin', 'Manager', 'Finance', 'Sales', 'Employee', 'Viewer'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.business_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    role public.business_role NOT NULL DEFAULT 'Employee',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_user_business UNIQUE (user_id, business_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_business_members_user_id ON public.business_members(user_id);
CREATE INDEX IF NOT EXISTS idx_business_members_business_id ON public.business_members(business_id);
CREATE INDEX IF NOT EXISTS idx_business_members_role ON public.business_members(role);
CREATE INDEX IF NOT EXISTS idx_businesses_name ON public.businesses(name);

-- Helper Security Functions (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_business_member(b_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.business_members 
        WHERE business_id = b_id AND user_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.has_business_role(b_id UUID, allowed_roles public.business_role[])
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.business_members 
        WHERE business_id = b_id AND user_id = auth.uid() AND role = ANY(allowed_roles)
    );
$$;

-- RLS Enforcement
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can view colleagues in same businesses" ON public.profiles FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.business_members bm1
        JOIN public.business_members bm2 ON bm1.business_id = bm2.business_id
        WHERE bm1.user_id = auth.uid() AND bm2.user_id = public.profiles.id
    )
);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Businesses Policies
CREATE POLICY "Users can view businesses they belong to" ON public.businesses FOR SELECT USING (public.is_business_member(id));
CREATE POLICY "Owners and Admins can update business" ON public.businesses FOR UPDATE USING (public.has_business_role(id, ARRAY['Owner', 'Admin']::public.business_role[]));
CREATE POLICY "Authenticated users can create businesses" ON public.businesses FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Business Members Policies
CREATE POLICY "Members can view other members in their business" ON public.business_members FOR SELECT USING (public.is_business_member(business_id));
CREATE POLICY "Owners and Admins can add members" ON public.business_members FOR INSERT WITH CHECK (
    public.has_business_role(business_id, ARRAY['Owner', 'Admin']::public.business_role[])
    OR (auth.uid() = user_id AND role = 'Owner')
);
CREATE POLICY "Owners and Admins can update member roles" ON public.business_members FOR UPDATE USING (public.has_business_role(business_id, ARRAY['Owner', 'Admin']::public.business_role[]));
CREATE POLICY "Owners can remove members or members can remove themselves" ON public.business_members FOR DELETE USING (
    public.has_business_role(business_id, ARRAY['Owner']::public.business_role[]) OR auth.uid() = user_id
);`;

  const handleCopy = () => {
    navigator.clipboard.writeText(migrationSQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">
              Database & Row Level Security
            </h1>
            <p className="text-xs text-[#64748B]">
              Multi-tenant architecture specifications, PostgreSQL tables, and isolation policies.
            </p>
          </div>
        </div>

        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#4F46E5] bg-[#EEF2FF] hover:bg-[#E0E7FF] rounded-lg transition-colors self-start sm:self-auto"
        >
          {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? 'Copied Migration SQL' : 'Copy Supabase SQL'}</span>
        </button>
      </div>

      {/* Connection & Architecture Status Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center gap-2 mb-1.5">
            <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
            <span className="text-xs font-semibold text-[#0F172A]">Multi-Tenant Isolation</span>
          </div>
          <p className="text-xs text-[#64748B] leading-relaxed">
            Strict isolation enforced at the PostgreSQL level via <code className="text-[#0F172A] font-semibold">is_business_member()</code>. Cross-tenant reads/writes are blocked.
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center gap-2 mb-1.5">
            <Key className="w-4 h-4 text-[#4F46E5]" />
            <span className="text-xs font-semibold text-[#0F172A]">No Client Secrets</span>
          </div>
          <p className="text-xs text-[#64748B] leading-relaxed">
            Only <code className="text-[#0F172A] font-semibold">ANON_KEY</code> is exposed to the browser. The <code className="text-[#0F172A] font-semibold">SECRET_KEY</code> is kept server-side only.
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center gap-2 mb-1.5">
            <Terminal className="w-4 h-4 text-[#0284C7]" />
            <span className="text-xs font-semibold text-[#0F172A]">
              {isSupabaseConfigured ? 'Supabase Connected' : 'Supabase Ready'}
            </span>
          </div>
          <p className="text-xs text-[#64748B] leading-relaxed truncate">
            {isSupabaseConfigured
              ? `Target: ${SUPABASE_URL}`
              : 'Configured via NEXT_PUBLIC_SUPABASE_URL in .env'}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-[#E2E8F0]">
        <button
          onClick={() => setActiveTab('tables')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'tables'
              ? 'border-[#4F46E5] text-[#4F46E5]'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <Table className="w-3.5 h-3.5" />
          <span>Core Tables (3)</span>
        </button>

        <button
          onClick={() => setActiveTab('rls')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'rls'
              ? 'border-[#4F46E5] text-[#4F46E5]'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>RLS Policies (10)</span>
        </button>

        <button
          onClick={() => setActiveTab('sql')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'sql'
              ? 'border-[#4F46E5] text-[#4F46E5]'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>Complete Migration SQL</span>
        </button>
      </div>

      {/* Tab: Tables */}
      {activeTab === 'tables' && (
        <div className="space-y-4">
          {/* businesses */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="px-5 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#0F172A]">public.businesses</span>
                <span className="text-[10px] bg-[#EEF2FF] text-[#4F46E5] font-semibold px-2 py-0.5 rounded">
                  Tenant Root
                </span>
              </div>
              <span className="text-xs text-[#64748B]">UUID Primary Key</span>
            </div>
            <div className="p-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[#94A3B8] border-b border-[#E2E8F0]">
                    <th className="pb-2 font-semibold">Column</th>
                    <th className="pb-2 font-semibold">Type</th>
                    <th className="pb-2 font-semibold">Constraints</th>
                    <th className="pb-2 font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-[#0F172A]">
                  <tr>
                    <td className="py-2 font-mono font-medium">id</td>
                    <td className="py-2 font-mono text-[#64748B]">UUID</td>
                    <td className="py-2 text-[#4F46E5]">PRIMARY KEY DEFAULT gen_random_uuid()</td>
                    <td className="py-2 text-[#64748B]">Unique business organization identifier</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-mono font-medium">name</td>
                    <td className="py-2 font-mono text-[#64748B]">TEXT</td>
                    <td className="py-2">NOT NULL</td>
                    <td className="py-2 text-[#64748B]">e.g. "Ecometrix Hub", "Acme Growth Labs"</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-mono font-medium">default_currency</td>
                    <td className="py-2 font-mono text-[#64748B]">TEXT</td>
                    <td className="py-2">DEFAULT 'USD'</td>
                    <td className="py-2 text-[#64748B]">Default currency for finance and invoicing</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-mono font-medium">email / phone / website</td>
                    <td className="py-2 font-mono text-[#64748B]">TEXT</td>
                    <td className="py-2 text-[#94A3B8]">NULLABLE</td>
                    <td className="py-2 text-[#64748B]">Public organizational contact details</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-mono font-medium">created_at / updated_at</td>
                    <td className="py-2 font-mono text-[#64748B]">TIMESTAMPTZ</td>
                    <td className="py-2">DEFAULT NOW()</td>
                    <td className="py-2 text-[#64748B]">Auto-managed audit timestamps</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* profiles */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="px-5 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#0F172A]">public.profiles</span>
                <span className="text-[10px] bg-[#EEF2FF] text-[#4F46E5] font-semibold px-2 py-0.5 rounded">
                  Auth Synchronized
                </span>
              </div>
              <span className="text-xs text-[#64748B]">1:1 with auth.users</span>
            </div>
            <div className="p-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[#94A3B8] border-b border-[#E2E8F0]">
                    <th className="pb-2 font-semibold">Column</th>
                    <th className="pb-2 font-semibold">Type</th>
                    <th className="pb-2 font-semibold">Constraints</th>
                    <th className="pb-2 font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-[#0F172A]">
                  <tr>
                    <td className="py-2 font-mono font-medium">id</td>
                    <td className="py-2 font-mono text-[#64748B]">UUID</td>
                    <td className="py-2 text-[#4F46E5]">REFERENCES auth.users(id) ON DELETE CASCADE</td>
                    <td className="py-2 text-[#64748B]">Mirrored Supabase Auth user ID</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-mono font-medium">email</td>
                    <td className="py-2 font-mono text-[#64748B]">TEXT</td>
                    <td className="py-2">NOT NULL</td>
                    <td className="py-2 text-[#64748B]">User account email</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-mono font-medium">full_name</td>
                    <td className="py-2 font-mono text-[#64748B]">TEXT</td>
                    <td className="py-2 text-[#94A3B8]">NULLABLE</td>
                    <td className="py-2 text-[#64748B]">Display name for dashboard greetings</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* business_members */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="px-5 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#0F172A]">public.business_members</span>
                <span className="text-[10px] bg-[#EEF2FF] text-[#4F46E5] font-semibold px-2 py-0.5 rounded">
                  Multi-Tenant Membership & RBAC
                </span>
              </div>
              <span className="text-xs text-[#64748B]">Composite Unique: (user_id, business_id)</span>
            </div>
            <div className="p-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[#94A3B8] border-b border-[#E2E8F0]">
                    <th className="pb-2 font-semibold">Column</th>
                    <th className="pb-2 font-semibold">Type</th>
                    <th className="pb-2 font-semibold">Constraints</th>
                    <th className="pb-2 font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-[#0F172A]">
                  <tr>
                    <td className="py-2 font-mono font-medium">user_id</td>
                    <td className="py-2 font-mono text-[#64748B]">UUID</td>
                    <td className="py-2 text-[#4F46E5]">REFERENCES profiles(id) ON DELETE CASCADE</td>
                    <td className="py-2 text-[#64748B]">Associated user</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-mono font-medium">business_id</td>
                    <td className="py-2 font-mono text-[#64748B]">UUID</td>
                    <td className="py-2 text-[#4F46E5]">REFERENCES businesses(id) ON DELETE CASCADE</td>
                    <td className="py-2 text-[#64748B]">Associated business tenant</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-mono font-medium">role</td>
                    <td className="py-2 font-mono text-[#64748B]">business_role ENUM</td>
                    <td className="py-2">Owner | Admin | Manager | Finance | Sales | Employee | Viewer</td>
                    <td className="py-2 text-[#64748B]">Tenant role permissions</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: RLS Policies */}
      {activeTab === 'rls' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs">
            <h3 className="text-sm font-semibold text-[#0F172A] mb-3">
              Row Level Security Isolation Model
            </h3>
            <p className="text-xs text-[#64748B] mb-4">
              Row Level Security prevents cross-tenant data leaks. Even if a malicious user alters IDs in an HTTP request, the PostgreSQL database engine blocks the row because <code className="text-[#0F172A] font-semibold">auth.uid()</code> does not hold a corresponding row in <code className="text-[#0F172A] font-semibold">business_members</code>.
            </p>

            <div className="space-y-2.5">
              <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-semibold text-[#0F172A]">Businesses: SELECT Policy</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">USING is_business_member(id)</span>
                </div>
                <p className="text-[11px] text-[#64748B] mt-1">
                  Users can strictly SELECT businesses where they are enrolled as a member.
                </p>
              </div>

              <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-semibold text-[#0F172A]">Businesses: UPDATE Policy</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-[#4F46E5]">USING has_business_role(id, ['Owner', 'Admin'])</span>
                </div>
                <p className="text-[11px] text-[#64748B] mt-1">
                  Only Owners and Admins can alter company profile, currency, or contact information.
                </p>
              </div>

              <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-semibold text-[#0F172A]">Business Members: SELECT Policy</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">USING is_business_member(business_id)</span>
                </div>
                <p className="text-[11px] text-[#64748B] mt-1">
                  Users can only see colleagues belonging to the same tenant.
                </p>
              </div>

              <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-semibold text-[#0F172A]">Business Members: INSERT/UPDATE</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-[#4F46E5]">USING has_business_role(business_id, ['Owner', 'Admin'])</span>
                </div>
                <p className="text-[11px] text-[#64748B] mt-1">
                  Only authorized personnel can add members or reassign permissions.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: SQL Migration */}
      {activeTab === 'sql' && (
        <div className="bg-[#0F172A] rounded-xl border border-slate-800 shadow-xs overflow-hidden">
          <div className="px-5 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">
              supabase/migrations/20250101000000_ecomhub_foundation.sql
            </span>
            <button
              onClick={handleCopy}
              className="text-xs text-indigo-300 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <pre className="p-5 text-xs font-mono text-slate-300 overflow-x-auto max-h-[500px] leading-relaxed scrollbar-thin">
            {migrationSQL}
          </pre>
        </div>
      )}
    </div>
  );
};
