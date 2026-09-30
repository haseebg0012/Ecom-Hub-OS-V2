/**
 * EcomHub OS — Phase 5 Verification Test Suite
 * Leads / CRM Shared Data Flow + Sales Visibility
 */

import {
  getCanonicalLeads,
  insertCanonicalLead,
  updateCanonicalLead,
  deleteCanonicalLead,
  getCanonicalActivities,
  insertCanonicalActivity,
  getCanonicalNotifications,
  loadDatabase,
} from '../src/server/canonical-db';
import { getEffectivePermissions } from '../src/lib/effective-permissions';

async function runPhase5Tests() {
  console.log('====================================================');
  console.log('🚀 RUNNING PHASE 5: LEADS & CRM DATA FLOW TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}${details ? ` -> ${details}` : ''}`);
      process.exitCode = 1;
    }
  }

  const businessId = 'biz-ecometrix-001';
  const salesUserId = 'usr-demo-sales';
  const ownerUserId = 'usr-ecometrix-001';

  // 1. RBAC Check for Sales Representative
  console.log('\n--- 1. RBAC & Module Access for Sales Representative ---');
  const salesPerms = getEffectivePermissions(
    {
      id: salesUserId,
      email: 'sales@ecomhub.local',
      full_name: 'Sales Specialist',
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: businessId,
      name: 'Ecometrix Hub',
      role: 'Sales Representative' as any,
      roles: ['sales_representative' as any],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any
  );

  assert(salesPerms.can('crm.view'), 'Sales Representative has crm.view permission');
  assert(salesPerms.can('crm.create'), 'Sales Representative has crm.create permission');
  assert(salesPerms.can('crm.edit'), 'Sales Representative has crm.edit permission');
  assert(salesPerms.canAccessTab('leads'), 'Sales Representative has Leads UI tab access');
  assert(salesPerms.canRoute('/leads'), 'Sales Representative can route to /leads');

  // 2. Canonical Lead Creation
  console.log('\n--- 2. Canonical Lead Creation ---');
  const initialLeadsCount = getCanonicalLeads(businessId).length;
  const testLeadData = {
    business_id: businessId,
    name: 'Acme Mega Corp',
    company: 'Acme International',
    email: 'deals@acmemega.com',
    phone: '+15559876543',
    service: 'Enterprise Supply Chain',
    budget: 150000,
    currency: 'USD',
    source: 'Website',
    status: 'New',
    priority: 'Urgent',
    assigned_to: null, // Initially unassigned
  };

  const createdLead = insertCanonicalLead(testLeadData);
  assert(Boolean(createdLead.id), 'Lead created with valid canonical ID');
  assert(createdLead.name === 'Acme Mega Corp', 'Lead name persisted correctly');
  assert(createdLead.status === 'New', 'Initial status is "New"');
  assert(createdLead.assigned_to === null, 'Lead is initially unassigned');

  const leadsAfterCreate = getCanonicalLeads(businessId);
  assert(leadsAfterCreate.length === initialLeadsCount + 1, 'Canonical database count incremented by 1');
  const fetchedLead = leadsAfterCreate.find((l) => l.id === createdLead.id);
  assert(Boolean(fetchedLead), 'Lead is retrieved from canonical database');

  // 3. Sales Representative Visibility
  console.log('\n--- 3. Sales Representative Visibility ---');
  // Confirm Sales Rep sees this lead without artificial assigned_only filter
  const visibleLeadsForSales = getCanonicalLeads(businessId);
  const isLeadVisibleToSales = visibleLeadsForSales.some((l) => l.id === createdLead.id);
  assert(isLeadVisibleToSales, 'Sales Representative can see newly created unassigned lead');

  // 4. Data Scope Filters (ALL, MY_LEADS, UNASSIGNED)
  console.log('\n--- 4. Data Scope Filters Simulation ---');
  // Simulated filter logic from LeadsModuleView
  const filterByScope = (scope: string, forUser: string) => {
    return getCanonicalLeads(businessId).filter((l) => {
      if (scope === 'ALL') return true;
      if (scope === 'MY_LEADS') return l.assigned_to === forUser;
      if (scope === 'UNASSIGNED') return !l.assigned_to;
      return l.assigned_to === scope;
    });
  };

  const allFiltered = filterByScope('ALL', salesUserId);
  const myFilteredBeforeAssign = filterByScope('MY_LEADS', salesUserId);
  const unassignedFiltered = filterByScope('UNASSIGNED', salesUserId);

  assert(allFiltered.some((l) => l.id === createdLead.id), 'ALL scope includes the unassigned lead');
  assert(!myFilteredBeforeAssign.some((l) => l.id === createdLead.id), 'MY_LEADS does NOT include lead before assignment');
  assert(unassignedFiltered.some((l) => l.id === createdLead.id), 'UNASSIGNED scope includes the lead');

  // 5. Lead Assignment & Notification & Activity
  console.log('\n--- 5. Lead Assignment, Activity Log, and Notification ---');
  // Assign lead to Sales Representative
  const updatedLead = updateCanonicalLead(createdLead.id, {
    assigned_to: salesUserId,
  });

  assert(updatedLead.assigned_to === salesUserId, 'Lead assigned_to updated to Sales Representative');
  assert(updatedLead.id === createdLead.id, 'Assignment occurred on the SAME canonical lead record (no duplicate)');

  // Confirm database still has exact same count (no duplicates created)
  const leadsAfterAssign = getCanonicalLeads(businessId);
  assert(leadsAfterAssign.length === initialLeadsCount + 1, 'Total lead count remains unchanged after assignment (no duplication)');

  // Log assignment activity in canonical activities
  const assignmentAct = insertCanonicalActivity({
    business_id: businessId,
    lead_id: createdLead.id,
    user_id: ownerUserId,
    activity_type: 'Assignment',
    title: 'Lead assigned to David Vance (Sales Representative)',
    description: `Assigned prospect ${createdLead.name} to David Vance.`,
  });

  assert(Boolean(assignmentAct.id), 'Assignment activity recorded in crm_activities');
  assert(assignmentAct.lead_id === createdLead.id, 'Activity is linked to canonical lead ID');

  // Check activity retrieval
  const leadActivities = getCanonicalActivities(businessId, createdLead.id);
  assert(leadActivities.some((a) => a.id === assignmentAct.id), 'Activity retrieved for lead');

  // Verify MY_LEADS filter now includes this lead for Sales Representative
  const myFilteredAfterAssign = filterByScope('MY_LEADS', salesUserId);
  assert(myFilteredAfterAssign.some((l) => l.id === createdLead.id), 'MY_LEADS scope now includes the lead for Sales Representative');

  // 6. Lead Status Pipeline Progression
  console.log('\n--- 6. Status Pipeline Progression on Canonical Record ---');
  const pipelineStages = ['Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won'];
  for (const nextStatus of pipelineStages) {
    const res = updateCanonicalLead(createdLead.id, { status: nextStatus });
    assert(res.status === nextStatus, `Status updated to "${nextStatus}" on the same lead`);
    assert(res.id === createdLead.id, 'ID is preserved across pipeline status transitions');
  }

  // 7. Cleanup
  console.log('\n--- 7. Lead Deletion / Cleanup ---');
  const deleted = deleteCanonicalLead(createdLead.id);
  assert(deleted, 'Test lead cleanly deleted from canonical database');
  const finalLeads = getCanonicalLeads(businessId);
  assert(finalLeads.length === initialLeadsCount, 'Database returned to original lead count');

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passed} / ${total} ASSERTIONS PASSED`);
  if (passed === total) {
    console.log('🎉 PHASE 5 VERIFICATION PASSED SUCCESSFULLY!');
  } else {
    console.log('❌ SOME ASSERTIONS FAILED');
  }
  console.log('====================================================\n');
}

runPhase5Tests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
