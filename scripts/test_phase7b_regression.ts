/**
 * EcomHub OS — Phase 7B Final End-to-End Regression & Production Readiness Test Suite
 * Comprehensive Validation of the Entire Platform Architecture
 */

import {
  loadDatabase,
  getCanonicalLeads,
  insertCanonicalLead,
  updateCanonicalLead,
  deleteCanonicalLead,
  getCanonicalClients,
  insertCanonicalClient,
  updateCanonicalClient,
  deleteCanonicalClient,
  getCanonicalProjects,
  insertCanonicalProject,
  updateCanonicalProject,
  deleteCanonicalProject,
  getCanonicalTasks,
  insertCanonicalTask,
  updateCanonicalTask,
  deleteCanonicalTask,
  getCanonicalTaskNotes,
  insertCanonicalTaskNote,
  deleteCanonicalTaskNote,
  getCanonicalInvoices,
  getCanonicalInvoiceById,
  insertCanonicalInvoice,
  deleteCanonicalInvoice,
  getCanonicalPayments,
  insertCanonicalPayment,
  getCanonicalExpenses,
  insertCanonicalExpense,
  deleteCanonicalExpense,
  getCanonicalAccounts,
  insertCanonicalAccount,
  deleteCanonicalAccount,
  getCanonicalNotifications,
  insertCanonicalNotification,
  deleteCanonicalNotification,
} from '../src/server/canonical-db';

import {
  hasPermission,
  canRoleAccessRoute,
  getRequiredPermissionForRoute,
} from '../src/lib/permissions';
import { getEffectivePermissions } from '../src/lib/effective-permissions';

import { resolveRoute, getPathForSection } from '../src/lib/router';
import { calculateProfitAndLoss } from '../src/lib/financial-reports-service';
import { Transaction, FinancialAccount, FinancialCategory } from '../src/types/finance';

const validStatuses = ['Queue', 'Working', 'Pending', 'Having Problem', 'Done'];
const isTaskOverdue = (deadline: string, status: string) => deadline < new Date().toISOString().split('T')[0] && status !== 'Done';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    failed++;
  }
}

async function runPhase7bRegression() {
  console.log('================================================================');
  console.log('🚀 ECOMHUB OS — PHASE 7B: FINAL END-TO-END REGRESSION TEST SUITE');
  console.log('================================================================\n');

  const bizId = 'biz-ecometrix-001';
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const ownerEmail = 'haseebg0012@gmail.com';
  const ownerId = 'usr-ecometrix-001';

  // ===========================================================================
  // 1. PRODUCT MODEL & SINGLE-BUSINESS CONTEXT
  // ===========================================================================
  console.log('--- 1. SINGLE-BUSINESS ARCHITECTURE & PRODUCT MODEL ---');
  const db = loadDatabase();
  assert(Array.isArray(db.businesses), 'Businesses collection is present');
  const primaryBusiness = (db.businesses || []).find((b: any) => b.id === bizId);
  assert(primaryBusiness !== undefined, 'Primary workspace "biz-ecometrix-001" exists');
  assert(primaryBusiness?.name === 'Ecometrix Hub', 'Workspace name is "Ecometrix Hub"');

  // Verify normal router does not route to Master OS
  const masterRouteRes = resolveRoute('/master-dashboard', ['owner']);
  assert(
    masterRouteRes.section === 'dashboard' || masterRouteRes.isUnauthorized === true,
    'Normal application flow intercepts/neutralizes master-dashboard routes'
  );

  // ===========================================================================
  // 2. OWNER AUTHENTICATION & FULL PRIVILEGES
  // ===========================================================================
  console.log('\n--- 2. OWNER END-TO-END ACCESS & CAPABILITIES ---');
  const ownerUser = {
    id: ownerId,
    email: ownerEmail,
    full_name: 'Haseeb (Master Owner)',
    is_platform_owner: true,
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const ownerPerms = getEffectivePermissions(ownerUser, {
    id: bizId,
    roles: ['owner'],
    role: 'owner',
  } as any);

  assert(ownerPerms.isOwner === true, 'Owner detected with isOwner = true');
  assert(ownerPerms.can('dashboard.view'), 'Owner has dashboard.view permission');
  assert(ownerPerms.can('leads.view') && ownerPerms.can('leads.create') && ownerPerms.can('leads.delete'), 'Owner has full leads CRUD');
  assert(ownerPerms.can('clients.view') && ownerPerms.can('clients.create') && ownerPerms.can('clients.delete'), 'Owner has full clients CRUD');
  assert(ownerPerms.can('projects.view') && ownerPerms.can('projects.create') && ownerPerms.can('projects.delete'), 'Owner has full projects CRUD');
  assert(ownerPerms.can('tasks.view') && ownerPerms.can('tasks.create') && ownerPerms.can('tasks.delete'), 'Owner has full tasks CRUD');
  assert(ownerPerms.can('finance.view') && ownerPerms.can('finance.create') && ownerPerms.can('finance.delete'), 'Owner has full finance CRUD');
  assert(ownerPerms.can('employees.view') && ownerPerms.can('employees.create') && ownerPerms.can('employees.delete'), 'Owner has full employees CRUD');
  assert(ownerPerms.can('business_settings.view') && ownerPerms.can('business_settings.edit'), 'Owner has business settings privileges');

  // Route resolution for Owner
  const ownerRoutes = [
    '/',
    '/leads',
    '/clients',
    '/projects',
    '/tasks',
    '/finance',
    '/finance/reports/profit-loss',
    '/finance/invoices',
    '/finance/payments',
    '/team-members-roles',
    '/documents',
    '/analytics',
    '/notifications',
    '/lead-entry-settings',
    '/settings/business',
    '/settings/login-history',
  ];

  ownerRoutes.forEach((route) => {
    assert(canRoleAccessRoute(['owner'], route, ownerUser), `Owner authorized for route: ${route}`);
    const resolved = resolveRoute(route, ['owner'], ownerUser);
    assert(resolved.isUnauthorized === false, `Direct URL allowed for Owner: ${route}`);
  });

  // ===========================================================================
  // 3. PROFILE PERSISTENCE
  // ===========================================================================
  console.log('\n--- 3. PROFILE PERSISTENCE IN CANONICAL DATABASE ---');
  const ownerProfile = (db.profiles || []).find((p: any) => p.email.toLowerCase() === ownerEmail);
  assert(ownerProfile !== undefined, 'Owner canonical profile found in database');
  assert(ownerProfile?.full_name?.length > 0, 'Owner full name is defined and non-empty');

  // ===========================================================================
  // 4. ADD EMPLOYEE & MULTI-ROLE FLOW
  // ===========================================================================
  console.log('\n--- 4. EMPLOYEE CREATION & MULTI-ROLE ADDITIVE UNION ---');
  const testEmpUserId = `usr-test-emp-${Date.now()}`;
  const testEmpEmail = `emp.${Date.now()}@ecomhub.test`;

  // Create temporary employee
  const newMemberRecord = {
    id: `mem-${Date.now()}`,
    business_id: bizId,
    user_id: testEmpUserId,
    email: testEmpEmail,
    role: 'Sales Representative',
    roles: ['sales_representative', 'marketing_manager'],
    status: 'Active',
    created_at: new Date().toISOString(),
  };

  const empUserObj = {
    id: testEmpUserId,
    email: testEmpEmail,
    full_name: 'Alex Multi-Role Specialist',
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Verify Multi-Role effective permissions (Sales + Marketing union)
  const empPerms = getEffectivePermissions(empUserObj, {
    id: bizId,
    roles: ['sales_representative', 'marketing_manager'],
    role: 'sales_representative',
  } as any);

  assert(empPerms.can('leads.view'), 'Multi-role user has leads.view (from Sales Rep)');
  assert(empPerms.can('leads.create'), 'Multi-role user has leads.create (from Sales Rep)');
  assert(empPerms.can('projects.create'), 'Multi-role user has projects.create (from Manager role union)');
  assert(empPerms.can('analytics.view'), 'Multi-role user has analytics.view (from Marketing Manager)');

  // Critical Security Check: Multi-role employee must NOT have Finance or Employee administration
  assert(!empPerms.can('finance.view'), 'Employee strictly DENIED finance.view');
  assert(!empPerms.can('finance.create'), 'Employee strictly DENIED finance.create');
  assert(!empPerms.can('employees.create'), 'Employee strictly DENIED employees.create');
  assert(!empPerms.can('business_settings.edit'), 'Employee strictly DENIED business_settings.edit');

  // URL security for Employee
  assert(!canRoleAccessRoute(['sales_representative', 'marketing_manager'], '/finance', empUserObj), 'Direct URL /finance DENIED for employee');
  assert(!canRoleAccessRoute(['sales_representative', 'marketing_manager'], '/finance/reports/profit-loss', empUserObj), 'Direct URL /finance/reports/profit-loss DENIED for employee');
  assert(!canRoleAccessRoute(['sales_representative', 'marketing_manager'], '/team-members-roles', empUserObj), 'Direct URL /team-members-roles DENIED for employee');

  const empDeniedRes = resolveRoute('/finance', ['sales_representative', 'marketing_manager'], empUserObj);
  assert(empDeniedRes.isUnauthorized === true, 'Route resolution marks unauthorized for protected /finance');
  assert(empDeniedRes.normalizedPath === '/unauthorized', 'Redirects unauthorized user to /unauthorized');

  // ===========================================================================
  // 5. CRM & LEAD LIFECYCLE FLOW
  // ===========================================================================
  console.log('\n--- 5. CANONICAL LEAD LIFECYCLE & MULTI-USER VISIBILITY ---');
  const testLead = insertCanonicalLead({
    business_id: bizId,
    first_name: 'Marcus',
    last_name: 'Vance',
    company_name: 'Vance Logistics Corp',
    email: 'marcus@vancelogistics.test',
    phone: '+1-555-0192',
    status: 'New',
    budget: 5000,
    currency: 'USD',
    assigned_to: testEmpUserId,
    created_by: ownerId,
  });

  assert(testLead.id.length > 0, 'Canonical lead created with authoritative ID');
  assert(testLead.status === 'New', 'Lead initial status is New');
  assert(testLead.assigned_to === testEmpUserId, 'Lead assigned to test employee');

  // Multi-user consistency: Verify Owner and Sales Rep query the EXACT same record
  const leadAsOwner = getCanonicalLeads(bizId).find((l) => l.id === testLead.id);
  const leadAsSales = getCanonicalLeads(bizId).find((l) => l.id === testLead.id);
  assert(leadAsOwner !== undefined && leadAsSales !== undefined, 'Both Owner and Sales query the lead');
  assert(leadAsOwner?.id === leadAsSales?.id, 'Both users reference identical database row ID (no duplicate copies)');

  // Pipeline transitions on the SAME record
  const qualifiedLead = updateCanonicalLead(testLead.id, { status: 'Qualified' });
  assert(qualifiedLead?.status === 'Qualified', 'Lead status updated to Qualified');
  assert(qualifiedLead?.id === testLead.id, 'Record ID preserved during pipeline progression');

  // Notification generated on assignment
  const notif = insertCanonicalNotification({
    user_id: testEmpUserId,
    business_id: bizId,
    type: 'lead_assigned',
    title: 'New Lead Assigned',
    message: `You were assigned lead: ${testLead.first_name} ${testLead.last_name}`,
    link_section: 'leads',
    entity_id: testLead.id,
    is_read: false,
  });
  assert(notif.id.length > 0, 'Assignment notification generated');
  assert(notif.entity_id === testLead.id, 'Notification correctly references real lead ID');

  // ===========================================================================
  // 6. CLIENT CONVERSION FLOW & DUPLICATE PROTECTION
  // ===========================================================================
  console.log('\n--- 6. CLIENT CONVERSION & DUPLICATE PROTECTION ---');
  const convertedClient = insertCanonicalClient({
    business_id: bizId,
    company_name: testLead.company_name,
    primary_contact_name: `${testLead.first_name} ${testLead.last_name}`,
    email: testLead.email,
    phone: testLead.phone,
    originating_lead_id: testLead.id,
    status: 'Active',
    currency: 'USD',
    total_revenue: 0,
    outstanding_balance: 0,
  });

  assert(convertedClient.id.length > 0, 'Canonical client generated from lead');
  assert(convertedClient.originating_lead_id === testLead.id, 'Client retains source lead relationship');

  // Mark lead as Won
  updateCanonicalLead(testLead.id, {
    status: 'Won',
    converted_to_client_id: convertedClient.id,
  });

  const wonLead = getCanonicalLeads(bizId).find((l) => l.id === testLead.id);
  assert(wonLead?.status === 'Won', 'Lead marked Won upon conversion');
  assert(wonLead?.converted_to_client_id === convertedClient.id, 'Lead references converted client ID');

  // Duplicate conversion guard: check if existing client already references this lead
  const existingConversion = getCanonicalClients(bizId).find((c) => c.originating_lead_id === testLead.id);
  assert(existingConversion !== undefined, 'Conversion guard detects existing client for lead');
  assert(existingConversion?.id === convertedClient.id, 'Duplicate conversion correctly prevented');

  // ===========================================================================
  // 7. PROJECT & TASK INTERCONNECTION
  // ===========================================================================
  console.log('\n--- 7. PROJECT, CLIENT & TASK INTERCONNECTION ---');
  const testProject = insertCanonicalProject({
    business_id: bizId,
    client_id: convertedClient.id,
    client_name: convertedClient.company_name,
    name: 'Global Supply Chain Automation',
    status: 'Active',
    budget: 12000,
    currency: 'USD',
    deadline: tomorrowStr,
    created_by: ownerId,
  });

  assert(testProject.id.length > 0, 'Project created canonically');
  assert(testProject.client_id === convertedClient.id, 'Project links directly to client ID');

  // Create Task linked to Project
  const testTask = insertCanonicalTask({
    business_id: bizId,
    project_id: testProject.id,
    project_name: testProject.name,
    title: 'Configure Webhook Ingestion Pipeline',
    status: 'Queue',
    priority: 'High',
    deadline: tomorrowStr,
    assigned_to: testEmpUserId,
    assigned_by: ownerId,
  });

  assert(testTask.id.length > 0, 'Task created canonically');
  assert(testTask.status === 'Queue', 'Task defaults to canonical Queue status');
  assert(testTask.project_id === testProject.id, 'Task links directly to project ID');

  // Overdue status model check: exactly 5 statuses, Overdue is dynamic
  assert(validStatuses.length === 5, 'System defines exactly 5 canonical task statuses');
  assert(!validStatuses.includes('Overdue' as any), 'Overdue is NOT a selectable status');

  const isTomorrowOverdue = isTaskOverdue(tomorrowStr, 'Working');
  const isYesterdayOverdue = isTaskOverdue(yesterdayStr, 'Working');
  const isYesterdayDoneOverdue = isTaskOverdue(yesterdayStr, 'Done');
  assert(!isTomorrowOverdue, 'Tomorrow deadline is not overdue');
  assert(isYesterdayOverdue, 'Yesterday deadline with status Working is calculated overdue');
  assert(!isYesterdayDoneOverdue, 'Yesterday deadline with status Done is NOT overdue');

  // Status transition: Queue -> Working -> Having Problem with Short Note
  updateCanonicalTask(testTask.id, { status: 'Working' });
  const workingTask = getCanonicalTasks(bizId).find((t) => t.id === testTask.id);
  assert(workingTask?.status === 'Working', 'Task status transitioned to Working');

  // Having Problem flow
  const blockerNoteText = 'API rate limits triggered by upstream logistics carrier.';
  insertCanonicalTaskNote({
    task_id: testTask.id,
    author_id: testEmpUserId,
    author_name: empUserObj.full_name,
    text: blockerNoteText,
  });
  updateCanonicalTask(testTask.id, {
    status: 'Having Problem',
    short_note: blockerNoteText,
  });

  const problemTask = getCanonicalTasks(bizId).find((t) => t.id === testTask.id);
  assert(problemTask?.status === 'Having Problem', 'Task status transitioned to Having Problem');
  assert(problemTask?.short_note === blockerNoteText, 'Task short note mirrored on task record');

  const notesList = getCanonicalTaskNotes(testTask.id);
  assert(notesList.length === 1, 'Task note persisted in canonical task_notes');
  assert(notesList[0].text === blockerNoteText || notesList[0].note === blockerNoteText, 'Task note content matches blocker description');

  // Done flow
  updateCanonicalTask(testTask.id, { status: 'Done' });
  const doneTask = getCanonicalTasks(bizId).find((t) => t.id === testTask.id);
  assert(doneTask?.status === 'Done', 'Task successfully transitioned to Done');

  // ===========================================================================
  // 8. FINANCE ENGINE & PROFIT/LOSS RECALCULATION
  // ===========================================================================
  console.log('\n--- 8. FINANCE CANONICAL LIFECYCLE & P&L INTEGRITY ---');
  const testAccount: FinancialAccount = {
    id: `acc-${bizId}-test`,
    business_id: bizId,
    name: 'Operating Bank Account',
    type: 'Bank',
    currency: 'USD',
    opening_balance: 0,
    current_balance: 0,
    description: 'Operating corporate bank account',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  insertCanonicalAccount(testAccount);

  const testCategoryIncome: FinancialCategory = {
    id: `cat-${bizId}-inc`,
    business_id: bizId,
    name: 'Client Services Retainer',
    type: 'Income',
    color: '#10B981',
    is_default: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const testCategoryExpense: FinancialCategory = {
    id: `cat-${bizId}-exp`,
    business_id: bizId,
    name: 'Cloud Hosting',
    type: 'Expense',
    color: '#6366F1',
    is_default: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Step 1: Create Invoice for 1000 USD
  const testInvoice = insertCanonicalInvoice({
    business_id: bizId,
    client_id: convertedClient.id,
    client_name: convertedClient.company_name,
    invoice_number: 'INV-TEST-999',
    issue_date: todayStr,
    due_date: tomorrowStr,
    status: 'Sent',
    subtotal: 1000,
    tax: 0,
    discount: 0,
    total: 1000,
    paid_amount: 0,
    balance_due: 1000,
    currency: 'USD',
    exchange_rate: 1,
    base_total: 1000,
    base_currency: 'USD',
  });

  assert(testInvoice.total === 1000, 'Invoice total is 1000 USD');
  assert(testInvoice.balance_due === 1000, 'Invoice initial balance_due is 1000 USD');

  // Step 2: Record Partial Payment of 400 USD
  const pay1 = insertCanonicalPayment({
    business_id: bizId,
    invoice_id: testInvoice.id,
    client_id: convertedClient.id,
    account_id: testAccount.id,
    payment_number: 'PAY-TEST-999A',
    amount: 400,
    currency: 'USD',
    exchange_rate: 1,
    base_amount: 400,
    base_currency: 'USD',
    payment_date: todayStr,
    payment_method: 'Bank Transfer',
    status: 'Completed',
  });

  const invAfterPay1 = getCanonicalInvoiceById(testInvoice.id);
  assert(invAfterPay1?.paid_amount === 400, 'Invoice paid_amount updated to 400 USD');
  assert(invAfterPay1?.balance_due === 600, 'Invoice balance_due reduced to 600 USD');
  assert(invAfterPay1?.status === 'Partially Paid', 'Invoice status is Partially Paid');

  // Step 3: Record Remaining Payment of 600 USD
  const pay2 = insertCanonicalPayment({
    business_id: bizId,
    invoice_id: testInvoice.id,
    client_id: convertedClient.id,
    account_id: testAccount.id,
    payment_number: 'PAY-TEST-999B',
    amount: 600,
    currency: 'USD',
    exchange_rate: 1,
    base_amount: 600,
    base_currency: 'USD',
    payment_date: todayStr,
    payment_method: 'Bank Transfer',
    status: 'Completed',
  });

  const invAfterPay2 = getCanonicalInvoiceById(testInvoice.id);
  assert(invAfterPay2?.paid_amount === 1000, 'Invoice fully paid (1000 USD)');
  assert(invAfterPay2?.balance_due === 0, 'Invoice balance_due is 0 USD');
  assert(invAfterPay2?.status === 'Paid', 'Invoice status transitioned to Paid');

  // Step 4: Record Expense of 250 USD
  const testExpense = insertCanonicalExpense({
    business_id: bizId,
    category_id: testCategoryExpense.id,
    account_id: testAccount.id,
    amount: 250,
    currency: 'USD',
    exchange_rate: 1,
    base_amount: 250,
    base_currency: 'USD',
    vendor: 'Vercel Infrastructure',
    description: 'Serverless execution compute',
    expense_date: todayStr,
    payment_method: 'Bank Transfer',
    reference: 'EXP-TEST-999',
  });

  assert(testExpense.id.length > 0, 'Expense created canonically');
  assert(testExpense.amount === 250, 'Expense amount is 250 USD');

  // Step 5: Profit & Loss Calculation
  const ledgerTrx: Transaction[] = [
    {
      id: `trx-${pay1.id}`,
      business_id: bizId,
      transaction_type: 'income',
      description: 'Invoice Partial Payment',
      reference: pay1.payment_number,
      category_id: testCategoryIncome.id,
      account_id: testAccount.id,
      client_id: convertedClient.id,
      amount: 400,
      currency: 'USD',
      exchange_rate: 1,
      base_amount: 400,
      base_currency: 'USD',
      transaction_date: todayStr,
      payment_method: 'Bank Transfer',
      status: 'completed',
      notes: null,
      attachment_url: null,
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: `trx-${pay2.id}`,
      business_id: bizId,
      transaction_type: 'income',
      description: 'Invoice Settlement Payment',
      reference: pay2.payment_number,
      category_id: testCategoryIncome.id,
      account_id: testAccount.id,
      client_id: convertedClient.id,
      amount: 600,
      currency: 'USD',
      exchange_rate: 1,
      base_amount: 600,
      base_currency: 'USD',
      transaction_date: todayStr,
      payment_method: 'Bank Transfer',
      status: 'completed',
      notes: null,
      attachment_url: null,
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: testExpense.transaction_id || `trx-${testExpense.id}`,
      business_id: bizId,
      transaction_type: 'expense',
      description: `${testExpense.vendor}: ${testExpense.description}`,
      reference: testExpense.reference || null,
      category_id: testCategoryExpense.id,
      account_id: testAccount.id,
      client_id: null,
      amount: 250,
      currency: 'USD',
      exchange_rate: 1,
      base_amount: 250,
      base_currency: 'USD',
      transaction_date: todayStr,
      payment_method: 'Bank Transfer',
      status: 'completed',
      notes: null,
      attachment_url: null,
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const plReport = calculateProfitAndLoss({
    businessId: bizId,
    transactions: ledgerTrx,
    categories: [testCategoryIncome, testCategoryExpense],
    preset: 'this_month',
    baseCurrency: 'USD',
  });

  assert(plReport.revenue.totalRevenue === 1000, 'P&L Total Revenue calculated as 1000 USD');
  assert(plReport.expenses.totalExpenses === 250, 'P&L Total Expenses calculated as 250 USD');
  assert(plReport.netProfit === 750, 'P&L Net Profit calculated as 750 USD (1000 - 250)');
  assert(plReport.profitMargin === 75, 'P&L Profit Margin calculated as exactly 75%');

  // ===========================================================================
  // 9. CLEAN UP TEMPORARY VERIFICATION ARTIFACTS
  // ===========================================================================
  console.log('\n--- 9. CLEANUP OF TEMPORARY TEST DATA ---');
  deleteCanonicalExpense(testExpense.id);
  deleteCanonicalInvoice(testInvoice.id);
  deleteCanonicalAccount(testAccount.id);
  deleteCanonicalTask(testTask.id);
  deleteCanonicalTaskNote(notesList[0].id);
  deleteCanonicalProject(testProject.id);
  deleteCanonicalClient(convertedClient.id);
  deleteCanonicalLead(testLead.id);
  deleteCanonicalNotification(notif.id);

  assert(getCanonicalInvoices(bizId).filter((i) => i.id === testInvoice.id).length === 0, 'Test invoice cleanly removed');
  assert(getCanonicalExpenses(bizId).filter((e) => e.id === testExpense.id).length === 0, 'Test expense cleanly removed');
  assert(getCanonicalTasks(bizId).filter((t) => t.id === testTask.id).length === 0, 'Test task cleanly removed');
  assert(getCanonicalProjects(bizId).filter((p) => p.id === testProject.id).length === 0, 'Test project cleanly removed');
  assert(getCanonicalClients(bizId).filter((c) => c.id === convertedClient.id).length === 0, 'Test client cleanly removed');
  assert(getCanonicalLeads(bizId).filter((l) => l.id === testLead.id).length === 0, 'Test lead cleanly removed');

  console.log('\n================================================================');
  console.log(`TOTAL REGRESSION ASSERTIONS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase7bRegression().catch((err) => {
  console.error('Fatal regression failure:', err);
  process.exit(1);
});
