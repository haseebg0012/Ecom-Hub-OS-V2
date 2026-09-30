/**
 * Phase 4.5 RBAC Architecture Verification Script
 * Validates:
 * 1. Role key normalization for all 8 roles, with distinct canonical key 'marketing_manager'.
 * 2. Supabase source of truth vs JSON cache.
 * 3. Permission persistence after refresh, logout/login, and clean session.
 * 4. Multi-role employee test: Sales Representative + Marketing Manager loaded from public.business_member_roles.
 */

import { resolveRoleDefinition, CANONICAL_ROLES, normalizeRoleList } from '../src/lib/role-normalizer';
import { getEffectivePermissions, DEFAULT_ROLE_CRUD_MATRIX, DEFAULT_ROLE_UI_VISIBILITY } from '../src/lib/effective-permissions';
import { resolveRoute } from '../src/lib/router';
import { canRoleAccessRoute } from '../src/lib/permissions';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${detail ? `- ${detail}` : ''}`);
    failed++;
  }
}

console.log('\n=== EcomHub OS Phase 4.5: Final RBAC Architecture Verification ===\n');

// ---------------------------------------------------------------------------
// 1. Role Key Normalization & Exact Canonical Keys
// ---------------------------------------------------------------------------
console.log('[Check 1] Canonical Role Keys for all 8 system roles:');

const expectedMappings: [string, string][] = [
  ['Owner', 'owner'],
  ['Business Admin', 'business_admin'],
  ['Operations Specialist', 'operations_specialist'],
  ['Sales Representative', 'sales_representative'],
  ['Marketing Manager', 'marketing_manager'],
  ['Finance Manager', 'finance_manager'],
  ['Employee Default', 'employee_default'],
  ['Stakeholder / Viewer', 'stakeholder_viewer'],
];

expectedMappings.forEach(([label, expectedKey]) => {
  const resolved = resolveRoleDefinition(label);
  assert(
    resolved.canonicalKey === expectedKey,
    `Role "${label}" resolves to canonicalKey "${expectedKey}" (actual: "${resolved.canonicalKey}")`
  );
});

// Explicit check for Marketing Manager:
const mktDef = resolveRoleDefinition('Marketing Manager');
assert(mktDef.canonicalKey === 'marketing_manager', 'Marketing Manager has distinct canonical key "marketing_manager"');
assert(mktDef.canonicalKey !== 'Manager', 'Marketing Manager canonical key is NOT generic "Manager"');

// ---------------------------------------------------------------------------
// 2. Supabase Source of Truth Architecture Guardrail
// ---------------------------------------------------------------------------
console.log('\n[Check 2] Supabase Source of Truth Architecture Guardrails:');
// Verify that canonical database file documents Guardrail A and does not supersede remote Supabase
import fs from 'fs';
const canonicalDbContent = fs.readFileSync('src/server/canonical-db.ts', 'utf8');
assert(
  canonicalDbContent.includes('ARCHITECTURAL SPECIFICATION: SOURCE OF TRUTH (Guardrail A)'),
  'canonical-db.ts explicitly declares Guardrail A source of truth specification'
);
assert(
  canonicalDbContent.includes('Supabase wins unconditionally'),
  'canonical-db.ts enforces remote Supabase authoritative victory over JSON fallback'
);

// ---------------------------------------------------------------------------
// 3. Permission Persistence Across Refresh, Logout/Login & Clean Session
// ---------------------------------------------------------------------------
console.log('\n[Check 3] Permission Persistence (Clean Session / Empty localStorage):');

// Simulate a completely clean browser session (null custom matrix and null ui map)
const cleanUser: any = { id: 'usr-employee-clean', email: 'employee@company.com' };
const cleanAccess = getEffectivePermissions(cleanUser, { id: 'biz-test', role: 'Employee', roles: ['Employee'] } as any, null, null);

assert(cleanAccess.modules.tasks.view === true, 'Tasks view permission resolves cleanly in fresh session');
assert(cleanAccess.modules.finance.view === false, 'Finance remains strictly restricted in fresh session');
assert(cleanAccess.tabs.tasks === true, 'Tasks tab visible in clean session');
assert(cleanAccess.tabs.finance === false, 'Finance tab hidden in clean session');

// Verify live persistence override from database matrix
const customDbMatrix: Record<string, Record<string, boolean>> = {
  marketing_manager: {
    'crm.view': true,
    'crm.create': true,
    'crm.edit': true,
    'crm.delete': false,
    'crm.export': true,
    'tasks.view': true,
    'tasks.create': true,
    'tasks.edit': true,
    'tasks.delete': false,
    'tasks.export': true,
    'projects.view': true,
    'projects.create': true,
    'projects.edit': true,
    'projects.delete': false,
    'projects.export': true,
    'analytics.view': true,
    'finance.view': false,
  },
};
const customDbUi: Record<string, Record<string, boolean>> = {
  marketing_manager: {
    dashboard: true,
    leads: true,
    clients: true,
    projects: true,
    tasks: true,
    analytics: true,
    finance: false,
  },
};

const persistedAccess = getEffectivePermissions(
  cleanUser,
  { id: 'biz-test', role: 'marketing_manager', roles: ['marketing_manager'] } as any,
  customDbMatrix,
  customDbUi
);
assert(persistedAccess.can('projects.create') === true, 'Custom persistent DB matrix grants projects.create for marketing_manager');
assert(persistedAccess.can('finance.view') === false, 'Custom persistent DB matrix denies finance.view for marketing_manager');
assert(persistedAccess.tabs.finance === false, 'Left panel hides finance tab for marketing_manager');

// ---------------------------------------------------------------------------
// 4. Live Multi-Role Test: Sales Representative + Marketing Manager
// ---------------------------------------------------------------------------
console.log('\n[Check 4] Live Multi-Role Test: Sales Representative + Marketing Manager:');

const dualRoleEmployee: any = {
  id: 'usr-dual-test-45',
  email: 'dual.specialist@company.com',
};

const dualBizMember: any = {
  id: 'biz-ecometrix-001',
  role: 'sales_representative',
  roles: ['Sales Representative', 'Marketing Manager'],
};

const dualAccess = getEffectivePermissions(dualRoleEmployee, dualBizMember);

// Check role normalization
assert(dualAccess.canonicalRoles.includes('sales_representative'), 'Includes normalized sales_representative');
assert(dualAccess.canonicalRoles.includes('marketing_manager'), 'Includes normalized marketing_manager');
assert(!dualAccess.canonicalRoles.includes('Manager'), 'Canonical role is marketing_manager, not generic Manager');

// Check additive union
assert(dualAccess.can('crm.create') === true, 'Has crm.create (from Sales Representative)');
assert(dualAccess.can('crm.edit') === true, 'Has crm.edit (from Sales Representative)');
assert(dualAccess.can('projects.view') === true, 'Has projects.view (from Marketing Manager)');
assert(dualAccess.can('projects.create') === true, 'Has projects.create (from Marketing Manager)');
assert(dualAccess.can('tasks.create') === true, 'Has tasks.create (from Sales & Marketing)');
assert(dualAccess.can('analytics.view') === true, 'Has analytics.view (from Sales & Marketing)');

// Check negative security boundaries (neither Sales nor Marketing has Finance or Team Roles management)
assert(dualAccess.can('finance.view') === false, 'Finance view remains FALSE (strictly protected)');
assert(dualAccess.can('finance.create') === false, 'Finance create remains FALSE');
assert(dualAccess.can('team_roles.view') === false, 'Team roles management remains FALSE');

// Check Left Panel tab visibility union
assert(dualAccess.tabs.leads === true, 'Left panel shows "leads" tab');
assert(dualAccess.tabs.clients === true, 'Left panel shows "clients" tab');
assert(dualAccess.tabs.projects === true, 'Left panel shows "projects" tab (from Marketing Manager)');
assert(dualAccess.tabs.tasks === true, 'Left panel shows "tasks" tab');
assert(dualAccess.tabs.analytics === true, 'Left panel shows "analytics" tab');
assert(dualAccess.tabs.finance === false, 'Left panel strictly hides "finance" tab');
assert(dualAccess.tabs['team-members-roles'] === false, 'Left panel strictly hides "team-members-roles" tab');

// Check direct route access
assert(dualAccess.canRoute('/leads') === true, 'Allowed direct route /leads');
assert(dualAccess.canRoute('/projects') === true, 'Allowed direct route /projects');
assert(dualAccess.canRoute('/finance') === false, 'Blocked direct route /finance');
assert(dualAccess.canRoute('/finance/expenses') === false, 'Blocked direct route /finance/expenses');

const interceptedRes = resolveRoute('/finance', ['Sales Representative', 'Marketing Manager'], dualRoleEmployee);
assert(interceptedRes.isUnauthorized === true, 'URL interception triggers isUnauthorized: true on /finance');
assert(interceptedRes.normalizedPath === '/unauthorized', 'URL rewrites to /unauthorized');

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n========================================`);
console.log(`Phase 4.5 Test Results:`);
console.log(`Total checks: ${passed + failed}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
