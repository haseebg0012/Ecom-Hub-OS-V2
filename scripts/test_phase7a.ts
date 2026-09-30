/**
 * EcomHub OS — Phase 7A Automated Verification Test Suite
 * Finance + Invoices + Payments + Expenses + Profit & Loss Canonical Engine
 */

import {
  getCanonicalInvoices,
  getCanonicalInvoiceById,
  insertCanonicalInvoice,
  updateCanonicalInvoice,
  deleteCanonicalInvoice,
  getCanonicalInvoiceItems,
  getCanonicalPayments,
  insertCanonicalPayment,
  getCanonicalExpenses,
  insertCanonicalExpense,
  updateCanonicalExpense,
  deleteCanonicalExpense,
  getCanonicalAccounts,
  insertCanonicalAccount,
  updateCanonicalAccount,
  deleteCanonicalAccount,
  getCanonicalCategories,
  getCanonicalFinanceSettings,
  updateCanonicalFinanceSettings,
  getCanonicalClients,
  insertCanonicalClient,
  deleteCanonicalClient,
} from '../src/server/canonical-db';

import { calculateProfitAndLoss } from '../src/lib/financial-reports-service';
import { canRoleAccessRoute } from '../src/lib/permissions';
import { resolveRoute } from '../src/lib/router';
import { Transaction, FinancialAccount, FinancialCategory } from '../src/types/finance';

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

async function runPhase7aTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING PHASE 7A: FINANCE & P&L REPAIR TEST SUITE');
  console.log('====================================================\n');

  const bizId = `biz-test-fin-${Date.now()}`;
  const todayStr = new Date().toISOString().split('T')[0];

  // Helper dummy accounts & categories
  const testAccount: FinancialAccount = {
    id: `acc-${bizId}-bank`,
    business_id: bizId,
    name: 'Test Operating Bank',
    type: 'Bank',
    currency: 'USD',
    opening_balance: 0,
    current_balance: 0,
    description: 'Test Operating Bank Account',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const testCategoryIncome: FinancialCategory = {
    id: `cat-${bizId}-rev`,
    business_id: bizId,
    name: 'Client Payment',
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
    name: 'Software & Cloud',
    type: 'Expense',
    color: '#6366F1',
    is_default: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  insertCanonicalAccount(testAccount);

  // Setup a test client
  const testClient = insertCanonicalClient({
    business_id: bizId,
    company_name: 'Apex Global Enterprises',
    primary_contact_name: 'Sarah Connor',
    email: 'sarah@apexglobal.test',
    status: 'Active',
    total_revenue: 0,
    outstanding_balance: 0,
  });

  // =========================================================================
  // 1. ZERO STATE AUDIT
  // =========================================================================
  console.log('--- 1. ZERO STATE VERIFICATION ---');
  const zeroInvoices = getCanonicalInvoices(bizId);
  const zeroPayments = getCanonicalPayments(bizId);
  const zeroExpenses = getCanonicalExpenses(bizId);

  assert(zeroInvoices.length === 0, 'Zero state: Initial invoices count is 0');
  assert(zeroPayments.length === 0, 'Zero state: Initial payments count is 0');
  assert(zeroExpenses.length === 0, 'Zero state: Initial expenses count is 0');

  // Verify initial P&L calculation on empty dataset
  const zeroPL = calculateProfitAndLoss({
    businessId: bizId,
    transactions: [],
    categories: [testCategoryIncome, testCategoryExpense],
    preset: 'this_month',
    baseCurrency: 'USD',
  });

  assert(zeroPL.revenue.totalRevenue === 0, 'Zero state P&L: Total Revenue is exactly 0');
  assert(zeroPL.expenses.totalExpenses === 0, 'Zero state P&L: Total Expenses is exactly 0');
  assert(zeroPL.netProfit === 0, 'Zero state P&L: Net Profit is exactly 0');
  assert(zeroPL.profitMargin === null, 'Zero state P&L: Profit Margin is null (no fabricated percentage)');
  assert(zeroPL.revenueByCategory.length === 0, 'Zero state P&L: Revenue by category is empty array');
  assert(zeroPL.expensesByCategory.length === 0, 'Zero state P&L: Expenses by category is empty array');

  // =========================================================================
  // 2. INVOICE CREATION & OUTSTANDING FLOW
  // =========================================================================
  console.log('\n--- 2. CANONICAL INVOICE CREATION FLOW ---');
  const createdInvoice = insertCanonicalInvoice({
    business_id: bizId,
    client_id: testClient.id,
    client_name: testClient.company_name,
    invoice_number: 'INV-TEST-0001',
    issue_date: todayStr,
    due_date: todayStr,
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
    items: [
      {
        id: `item-${Date.now()}`,
        business_id: bizId,
        invoice_id: 'temp',
        description: 'E-commerce Architecture Retainer',
        quantity: 1,
        unit_price: 1000,
        amount: 1000,
        created_at: new Date().toISOString(),
      },
    ],
  });

  assert(createdInvoice.id.length > 0, 'Canonical invoice created with authoritative ID');
  assert(createdInvoice.total === 1000, 'Invoice total is 1000 USD');
  assert(createdInvoice.paid_amount === 0, 'Invoice paid amount initialized to 0');
  assert(createdInvoice.balance_due === 1000, 'Invoice balance due initialized to 1000');
  assert(createdInvoice.status === 'Sent', 'Invoice status is Sent');

  // Verify client outstanding updated
  const updatedClient1 = getCanonicalClients(bizId).find((c) => c.id === testClient.id)!;
  assert(Number(updatedClient1.outstanding_balance) === 1000, 'Client outstanding balance updated to 1000');

  // Verify invoice items persisted
  const invoiceItems = getCanonicalInvoiceItems(createdInvoice.id);
  assert(invoiceItems.length === 1, 'Invoice line items persisted canonically');
  assert(invoiceItems[0].amount === 1000, 'Invoice line item amount is 1000');

  // =========================================================================
  // 3. PAYMENT RECORDING & AUTOMATIC BALANCE RECALCULATION
  // =========================================================================
  console.log('\n--- 3. PAYMENT FLOW & REVENUE RECALCULATION ---');
  // Record Partial Payment of 400 USD
  const payment1 = insertCanonicalPayment({
    business_id: bizId,
    invoice_id: createdInvoice.id,
    client_id: testClient.id,
    account_id: testAccount.id,
    payment_number: 'PAY-TEST-0001',
    amount: 400,
    currency: 'USD',
    exchange_rate: 1,
    base_amount: 400,
    base_currency: 'USD',
    payment_date: todayStr,
    payment_method: 'Bank Transfer',
    status: 'Completed',
  });

  assert(payment1.id.length > 0, 'Payment 1 inserted canonically');

  // Verify invoice balance due and status automatically updated in canonical database
  const invoiceAfterPay1 = getCanonicalInvoiceById(createdInvoice.id);
  assert(invoiceAfterPay1 !== null, 'Invoice retrieved from canonical database');
  assert(invoiceAfterPay1?.paid_amount === 400, 'Invoice paid_amount recalculated to 400');
  assert(invoiceAfterPay1?.balance_due === 600, 'Invoice balance_due recalculated to 600');
  assert(invoiceAfterPay1?.status === 'Partially Paid', 'Invoice status transitioned to Partially Paid');

  // Verify client balances updated
  const updatedClient2 = getCanonicalClients(bizId).find((c) => c.id === testClient.id)!;
  assert(Number(updatedClient2.outstanding_balance) === 600, 'Client outstanding balance reduced to 600');
  assert(Number(updatedClient2.total_revenue) === 400, 'Client lifetime revenue increased to 400');

  // Verify Account balance updated
  const updatedAccount1 = getCanonicalAccounts(bizId).find((a) => a.id === testAccount.id);
  assert(Number(updatedAccount1?.current_balance) === 400, 'Bank account balance increased by payment (+400)');

  // Build ledger transactions from payment 1
  const ledgerTransactionsPay1: Transaction[] = [
    {
      id: `trx-${payment1.id}`,
      business_id: bizId,
      transaction_type: 'income',
      description: `Invoice Payment: ${createdInvoice.invoice_number}`,
      reference: payment1.payment_number,
      category_id: testCategoryIncome.id,
      account_id: testAccount.id,
      client_id: testClient.id,
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
  ];

  // Verify P&L after Payment 1
  const plAfterPay1 = calculateProfitAndLoss({
    businessId: bizId,
    transactions: ledgerTransactionsPay1,
    categories: [testCategoryIncome, testCategoryExpense],
    preset: 'this_month',
    baseCurrency: 'USD',
  });

  assert(plAfterPay1.revenue.totalRevenue === 400, 'P&L after partial payment: Total Revenue is 400 USD');
  assert(plAfterPay1.expenses.totalExpenses === 0, 'P&L after partial payment: Total Expenses is 0 USD');
  assert(plAfterPay1.netProfit === 400, 'P&L after partial payment: Net Profit is 400 USD');
  assert(plAfterPay1.profitMargin === 100, 'P&L after partial payment: Profit Margin is 100%');

  // Record Remaining Payment of 600 USD
  const payment2 = insertCanonicalPayment({
    business_id: bizId,
    invoice_id: createdInvoice.id,
    client_id: testClient.id,
    account_id: testAccount.id,
    payment_number: 'PAY-TEST-0002',
    amount: 600,
    currency: 'USD',
    exchange_rate: 1,
    base_amount: 600,
    base_currency: 'USD',
    payment_date: todayStr,
    payment_method: 'Bank Transfer',
    status: 'Completed',
  });

  const invoiceAfterPay2 = getCanonicalInvoiceById(createdInvoice.id);
  assert(invoiceAfterPay2?.paid_amount === 1000, 'Invoice paid_amount recalculated to 1000');
  assert(invoiceAfterPay2?.balance_due === 0, 'Invoice balance_due recalculated to 0');
  assert(invoiceAfterPay2?.status === 'Paid', 'Invoice status transitioned to Paid');

  const updatedClient3 = getCanonicalClients(bizId).find((c) => c.id === testClient.id)!;
  assert(Number(updatedClient3.outstanding_balance) === 0, 'Client outstanding balance cleared to 0');
  assert(Number(updatedClient3.total_revenue) === 1000, 'Client lifetime revenue increased to 1000');

  const updatedAccount2 = getCanonicalAccounts(bizId).find((a) => a.id === testAccount.id);
  assert(Number(updatedAccount2?.current_balance) === 1000, 'Bank account balance increased to 1000');

  // =========================================================================
  // 4. EXPENSE FLOW & P&L NET RECALCULATION
  // =========================================================================
  console.log('\n--- 4. EXPENSE FLOW & NET PROFIT/LOSS RECALCULATION ---');
  const createdExpense = insertCanonicalExpense({
    business_id: bizId,
    category_id: testCategoryExpense.id,
    account_id: testAccount.id,
    amount: 250,
    currency: 'USD',
    exchange_rate: 1,
    base_amount: 250,
    base_currency: 'USD',
    vendor: 'Vercel / AWS Cloud',
    description: 'Production infrastructure and API gateways',
    expense_date: todayStr,
    payment_method: 'Bank Transfer',
    reference: 'REF-EXP-001',
  });

  assert(createdExpense.id.length > 0, 'Expense inserted canonically');
  assert(createdExpense.amount === 250, 'Expense amount is 250 USD');

  // Verify Account balance automatically deducted
  const updatedAccount3 = getCanonicalAccounts(bizId).find((a) => a.id === testAccount.id);
  assert(Number(updatedAccount3?.current_balance) === 750, 'Bank account balance deducted to 750 (1000 - 250)');

  // Verify P&L calculation with Revenue and Expenses
  const fullLedgerTransactions: Transaction[] = [
    ...ledgerTransactionsPay1,
    {
      id: `trx-${payment2.id}`,
      business_id: bizId,
      transaction_type: 'income',
      description: `Invoice Payment: ${createdInvoice.invoice_number}`,
      reference: payment2.payment_number,
      category_id: testCategoryIncome.id,
      account_id: testAccount.id,
      client_id: testClient.id,
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
      id: createdExpense.transaction_id || `trx-${createdExpense.id}`,
      business_id: bizId,
      transaction_type: 'expense',
      description: `${createdExpense.vendor}: ${createdExpense.description}`,
      reference: createdExpense.reference || null,
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

  const fullPL = calculateProfitAndLoss({
    businessId: bizId,
    transactions: fullLedgerTransactions,
    categories: [testCategoryIncome, testCategoryExpense],
    preset: 'this_month',
    baseCurrency: 'USD',
  });

  assert(fullPL.revenue.totalRevenue === 1000, 'Full P&L: Total Revenue is 1000 USD');
  assert(fullPL.expenses.totalExpenses === 250, 'Full P&L: Total Expenses is 250 USD');
  assert(fullPL.netProfit === 750, 'Full P&L: Net Profit is 750 USD (1000 - 250)');
  assert(fullPL.profitMargin === 75, 'Full P&L: Profit Margin is exactly 75%');
  assert(fullPL.expensesByCategory.length === 1, 'Full P&L: Expenses categorized correctly');
  assert(fullPL.expensesByCategory[0].amount === 250, 'Full P&L: Category amount is 250');

  // Verify monthly trend bucket calculation
  assert(fullPL.monthlyTrend.length > 0, 'Full P&L: Monthly trend calculated from real data');
  const activeBucket = fullPL.monthlyTrend.find((b) => b.revenue > 0 || b.expenses > 0);
  assert(activeBucket !== undefined, 'Trend contains bucket with real activity');
  assert(activeBucket?.revenue === 1000, 'Trend bucket revenue matches recorded payments');
  assert(activeBucket?.expenses === 250, 'Trend bucket expenses match recorded expenses');

  // =========================================================================
  // 5. EXPENSE DELETION RECOVERY
  // =========================================================================
  console.log('\n--- 5. EXPENSE DELETION & BALANCE RECOVERY ---');
  const deleteExpenseSuccess = deleteCanonicalExpense(createdExpense.id);
  assert(deleteExpenseSuccess === true, 'Expense deleted canonically');

  const afterDeleteExpenses = getCanonicalExpenses(bizId);
  assert(afterDeleteExpenses.length === 0, 'Canonical expenses count is back to 0');

  const accountAfterExpDelete = getCanonicalAccounts(bizId).find((a) => a.id === testAccount.id);
  assert(Number(accountAfterExpDelete?.current_balance) === 1000, 'Bank account balance restored to 1000 upon expense deletion');

  // =========================================================================
  // 6. MULTI-CURRENCY CONVERSION TEST
  // =========================================================================
  console.log('\n--- 6. MULTI-CURRENCY HANDLING ---');
  // Record PKR payment with exchange rate 280 PKR = 1 USD
  const pkrPayment = insertCanonicalPayment({
    business_id: bizId,
    client_id: testClient.id,
    account_id: testAccount.id,
    payment_number: 'PAY-PKR-0001',
    amount: 280000,
    currency: 'PKR',
    exchange_rate: 1 / 280,
    base_amount: 1000,
    base_currency: 'USD',
    payment_date: todayStr,
    payment_method: 'Wire Transfer',
    status: 'Completed',
  });

  assert(pkrPayment.base_amount === 1000, 'Multi-currency payment base_amount converted to 1000 USD');
  assert(pkrPayment.currency === 'PKR', 'Original currency PKR preserved');

  // =========================================================================
  // 7. FINANCE RBAC VERIFICATION
  // =========================================================================
  console.log('\n--- 7. FINANCE RBAC & ROUTE ACCESS GUARD ---');
  const ownerUser = {
    id: 'usr-ecometrix-001',
    email: 'haseebg0012@gmail.com',
    full_name: 'Master Platform Owner',
    is_platform_owner: true,
  };

  const financeManagerUser = {
    id: 'usr-fin-001',
    email: 'finance@ecomhub.test',
    full_name: 'Finance Controller',
  };

  const salesUser = {
    id: 'usr-sales-001',
    email: 'sales@ecomhub.test',
    full_name: 'Sales Specialist',
  };

  const coldCallerUser = {
    id: 'usr-caller-001',
    email: 'caller@ecomhub.test',
    full_name: 'Cold Outreach Agent',
  };

  // Test Owner access
  assert(canRoleAccessRoute(['owner'], '/finance', ownerUser), 'Owner has access to /finance');
  assert(canRoleAccessRoute(['owner'], '/finance/reports/profit-loss', ownerUser), 'Owner has access to /finance/reports/profit-loss');
  assert(canRoleAccessRoute(['owner'], '/finance/invoices', ownerUser), 'Owner has access to /finance/invoices');

  // Test Finance Manager access
  assert(canRoleAccessRoute(['finance_manager'], '/finance', financeManagerUser), 'Finance Manager has access to /finance');
  assert(canRoleAccessRoute(['finance_manager'], '/finance/reports/profit-loss', financeManagerUser), 'Finance Manager has access to /finance/reports/profit-loss');

  // Test Sales Rep access (MUST BE REJECTED)
  assert(!canRoleAccessRoute(['sales_representative'], '/finance', salesUser), 'Sales Rep access to /finance is DENIED');
  assert(!canRoleAccessRoute(['sales_representative'], '/finance/reports/profit-loss', salesUser), 'Sales Rep access to /finance/reports/profit-loss is DENIED');

  // Test Cold Caller access (MUST BE REJECTED)
  assert(!canRoleAccessRoute(['cold_caller'], '/finance', coldCallerUser), 'Cold Caller access to /finance is DENIED');

  // Test Route Resolver unauthorized redirection
  const unauthorizedRes = resolveRoute('/finance/reports/profit-loss', ['sales_representative'], salesUser);
  assert(unauthorizedRes.isUnauthorized === true, 'Direct URL interception flags unauthorized for Sales Rep');
  assert(unauthorizedRes.normalizedPath === '/unauthorized', 'Direct URL routes to /unauthorized for Sales Rep');

  const authorizedRes = resolveRoute('/finance/reports/profit-loss', ['owner'], ownerUser);
  assert(authorizedRes.isUnauthorized === false, 'Direct URL permitted for Owner');
  assert(authorizedRes.section === 'finance', 'Direct URL sets section to finance for Owner');
  assert(authorizedRes.subTab === 'reports-profit-loss', 'Direct URL sets subTab to reports-profit-loss for Owner');

  // =========================================================================
  // CLEANUP TEST DATA
  // =========================================================================
  console.log('\n--- CLEANING UP TEST ARTIFACTS ---');
  deleteCanonicalInvoice(createdInvoice.id);
  deleteCanonicalAccount(testAccount.id);
  deleteCanonicalClient(testClient.id);

  console.log('\n====================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase7aTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
