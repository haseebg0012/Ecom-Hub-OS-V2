/**
 * Phase 4 Automated Verification Suite
 * Tests multi-role RBAC, additive union, view-off dependency, module access rule,
 * owner override, route protection, and action-level security.
 */

import { getEffectivePermissions, DEFAULT_ROLE_CRUD_MATRIX, DEFAULT_ROLE_UI_VISIBILITY } from '../src/lib/effective-permissions';
import { resolveRoleDefinition, normalizeRoleList } from '../src/lib/role-normalizer';
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

console.log('\n=== EcomHub OS Phase 4: Multi-Role RBAC & Access Control Test Suite ===\n');

// ---------------------------------------------------------------------------
// Test 1: Role Key Normalization
// ---------------------------------------------------------------------------
console.log('[Test Group 1] Role Key Normalization:');
const salesDef = resolveRoleDefinition('Sales Representative');
assert(salesDef.canonicalKey === 'sales_representative', 'Normalizes "Sales Representative" to canonical key');
assert(salesDef.legacyKey === 'Sales', 'Preserves legacy key "Sales"');

const multiNorm = normalizeRoleList(['Sales', 'marketing_manager', 'Operations Specialist']);
assert(multiNorm.includes('sales_representative') && multiNorm.includes('marketing_manager') && multiNorm.includes('operations_specialist'), 'Normalizes array of mixed role strings');

// ---------------------------------------------------------------------------
// Test 2: Owner Override Rule
// ---------------------------------------------------------------------------
console.log('\n[Test Group 2] Owner Override Rule:');
const ownerUser: any = { id: 'usr-ecometrix-001', email: 'haseebg0012@gmail.com', role: 'Owner' };
const ownerAccess = getEffectivePermissions(ownerUser, { id: 'biz-1', role: 'Owner', roles: ['Owner'] } as any);

assert(ownerAccess.isOwner === true, 'Owner correctly identified');
assert(ownerAccess.can('finance.delete') === true, 'Owner has finance.delete action');
assert(ownerAccess.can('team_roles.delete') === true, 'Owner has team_roles.delete action');
assert(ownerAccess.canAccessModule('finance') === true, 'Owner can access finance module');
assert(ownerAccess.canAccessTab('team-members-roles') === true, 'Owner can access team-members-roles tab');
assert(ownerAccess.canRoute('/finance/expenses') === true, 'Owner can route to /finance/expenses');
assert(ownerAccess.canRoute('/settings/team') === true, 'Owner can route to /settings/team');

// ---------------------------------------------------------------------------
// Test 3: Multi-Role Additive Union
// ---------------------------------------------------------------------------
console.log('\n[Test Group 3] Multi-Role Additive Union:');
// User with Sales only
const salesUser: any = { id: 'usr-sales', email: 'sales@example.com' };
const salesAccess = getEffectivePermissions(salesUser, { id: 'biz-1', role: 'Sales', roles: ['Sales'] } as any);

assert(salesAccess.can('crm.create') === true, 'Sales can crm.create');
assert(salesAccess.can('finance.view') === false, 'Sales CANNOT finance.view');
assert(salesAccess.canAccessTab('finance') === false, 'Sales tab "finance" is NOT visible');
assert(salesAccess.canRoute('/finance') === false, 'Sales CANNOT route to /finance');

// User with Finance only
const financeUser: any = { id: 'usr-fin', email: 'finance@example.com' };
const finAccess = getEffectivePermissions(financeUser, { id: 'biz-1', role: 'Finance', roles: ['Finance'] } as any);

assert(finAccess.can('finance.view') === true, 'Finance can finance.view');
assert(finAccess.can('crm.create') === false, 'Finance CANNOT crm.create');
assert(finAccess.canAccessTab('leads') === false, 'Finance tab "leads" is NOT visible');
assert(finAccess.canRoute('/leads') === false, 'Finance CANNOT route to /leads');

// User with MULTI-ROLE: Sales + Finance combined
const combinedUser: any = { id: 'usr-combo', email: 'combo@example.com' };
const comboAccess = getEffectivePermissions(combinedUser, { id: 'biz-1', role: 'Sales', roles: ['Sales', 'Finance'] } as any);

assert(comboAccess.can('crm.create') === true, 'Multi-Role (Sales+Finance) has crm.create from Sales');
assert(comboAccess.can('finance.view') === true, 'Multi-Role (Sales+Finance) has finance.view from Finance');
assert(comboAccess.canAccessTab('leads') === true, 'Multi-Role has "leads" tab visible from Sales');
assert(comboAccess.canAccessTab('finance') === true, 'Multi-Role has "finance" tab visible from Finance');
assert(comboAccess.canRoute('/leads') === true, 'Multi-Role can route to /leads');
assert(comboAccess.canRoute('/finance') === true, 'Multi-Role can route to /finance');

// ---------------------------------------------------------------------------
// Test 4: View-Off Dependency Rule
// ---------------------------------------------------------------------------
console.log('\n[Test Group 4] View-Off Dependency Rule:');
// Create a custom matrix where 'projects.view' is explicitly set to false but 'projects.create' is true
const customMatrix: Record<string, Record<string, boolean>> = {
  Employee: {
    'projects.view': false,
    'projects.create': true,
    'projects.edit': true,
    'projects.delete': true,
  },
};
const empUser: any = { id: 'usr-emp', email: 'emp@example.com' };
const empAccess = getEffectivePermissions(empUser, { id: 'biz-1', role: 'Employee', roles: ['Employee'] } as any, customMatrix);

assert(empAccess.modules.projects.view === false, 'projects.view is false');
assert(empAccess.modules.projects.create === false, 'projects.create forced to FALSE because view is false');
assert(empAccess.modules.projects.edit === false, 'projects.edit forced to FALSE because view is false');
assert(empAccess.can('projects.create') === false, 'can("projects.create") returns false when view is off');

// ---------------------------------------------------------------------------
// Test 5: Module Access Rule (Tab Visible AND View Permitted)
// ---------------------------------------------------------------------------
console.log('\n[Test Group 5] Module Access Rule:');
// Case A: Tab is visible, but View is false
const customUiMap: Record<string, Record<string, boolean>> = {
  Employee: {
    dashboard: true,
    projects: true, // tab visible
  },
};
const customPermMap: Record<string, Record<string, boolean>> = {
  Employee: {
    'projects.view': false, // view OFF
  },
};
const restrictedAccess = getEffectivePermissions(empUser, { id: 'biz-1', role: 'Employee', roles: ['Employee'] } as any, customPermMap, customUiMap);
assert(restrictedAccess.canAccessTab('projects') === false, 'Tab "projects" denied access when linked module view is false');
assert(restrictedAccess.canAccessModule('projects') === false, 'Module "projects" denied access when view is false');
assert(restrictedAccess.canRoute('/projects') === false, 'Route "/projects" blocked when view is false');

// ---------------------------------------------------------------------------
// Test 6: Route Protection & Interception
// ---------------------------------------------------------------------------
console.log('\n[Test Group 6] Route Protection & Interception:');
// Direct unauthorized URL attempt
const routeResUnauthorized = resolveRoute('/finance/expenses', ['Sales'], salesUser);
assert(routeResUnauthorized.isUnauthorized === true, 'Direct URL "/finance/expenses" intercepted for Sales role');
assert(routeResUnauthorized.normalizedPath === '/unauthorized', 'Redirects to /unauthorized');

const routeResAuthorized = resolveRoute('/leads', ['Sales'], salesUser);
assert(routeResAuthorized.isUnauthorized === false, 'Authorized URL "/leads" allowed for Sales role');
assert(routeResAuthorized.section === 'leads', 'Section correctly resolved to "leads"');

const routeResOwner = resolveRoute('/finance/reports/profit-loss', ['Owner'], ownerUser);
assert(routeResOwner.isUnauthorized === false, 'Owner can access all finance subroutes');
assert(routeResOwner.subTab === 'reports-profit-loss', 'SubTab correctly resolved to "reports-profit-loss"');

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n========================================`);
console.log(`Total tests: ${passed + failed}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
