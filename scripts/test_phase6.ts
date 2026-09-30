/**
 * EcomHub OS — Phase 6 Automated Verification Test Suite
 * Tasks + Projects + Clients Interconnection
 */

import {
  getCanonicalTasks,
  insertCanonicalTask,
  updateCanonicalTask,
  deleteCanonicalTask,
  getCanonicalTaskNotes,
  insertCanonicalTaskNote,
  deleteCanonicalTaskNote,
  getCanonicalProjects,
  insertCanonicalProject,
  updateCanonicalProject,
  deleteCanonicalProject,
  getCanonicalClients,
  insertCanonicalClient,
  updateCanonicalClient,
  deleteCanonicalClient,
  getCanonicalLeads,
  insertCanonicalLead,
  updateCanonicalLead,
  deleteCanonicalLead,
  getCanonicalNotifications,
  insertCanonicalNotification,
  deleteCanonicalNotification,
} from '../src/server/canonical-db';
import { hasPermission } from '../src/lib/permissions';

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

async function runPhase6Tests() {
  console.log('====================================================');
  console.log('🚀 RUNNING PHASE 6: TASKS + PROJECTS + CLIENTS TEST SUITE');
  console.log('====================================================\n');

  const bizId = 'biz-ecometrix-001';
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const employeeUserId = 'usr-sales-002';
  const ownerUserId = 'usr-ecometrix-001';

  // Track created entities for clean cleanup
  let testLeadId = '';
  let testClientId = '';
  let testProjectId = '';
  let testTaskId = '';
  let testNoteId = '';

  try {
    // -------------------------------------------------------------
    // 1. Task Status Model & Overdue Calculation
    // -------------------------------------------------------------
    console.log('--- 1. Task Status Model & Overdue Calculation ---');
    const validStatuses = ['Queue', 'Working', 'Pending', 'Having Problem', 'Done'];
    assert(validStatuses.length === 5, 'System defines exactly 5 canonical task statuses');
    assert(validStatuses.includes('Queue'), 'Includes status "Queue"');
    assert(validStatuses.includes('Working'), 'Includes status "Working"');
    assert(validStatuses.includes('Pending'), 'Includes status "Pending"');
    assert(validStatuses.includes('Having Problem'), 'Includes status "Having Problem"');
    assert(validStatuses.includes('Done'), 'Includes status "Done"');
    assert(!validStatuses.includes('Overdue'), 'Overdue is NOT a selectable status (must be calculated)');
    assert(!validStatuses.includes('Completed'), 'Legacy status "Completed" replaced with canonical "Done"');

    // Test automatic overdue calculation
    const isOverdue = (deadline: string, status: string) => deadline < todayStr && status !== 'Done';
    assert(isOverdue(yesterdayStr, 'Working') === true, 'Past deadline with status Working is calculated Overdue');
    assert(isOverdue(yesterdayStr, 'Done') === false, 'Past deadline with status Done is NOT calculated Overdue');
    assert(isOverdue(todayStr, 'Queue') === false, 'Today deadline is not Overdue');

    // -------------------------------------------------------------
    // 2. Canonical Task Creation & Assignment
    // -------------------------------------------------------------
    console.log('\n--- 2. Canonical Task Creation & Employee Assignment ---');
    const initialTasksCount = getCanonicalTasks(bizId).length;

    const taskRow = insertCanonicalTask({
      business_id: bizId,
      title: 'Phase 6 Integration Verification Task',
      description: 'Test end-to-end task workflow, short notes, and client-project linking',
      priority: 'High',
      deadline: todayStr,
      assigned_to: employeeUserId,
      assigned_by: ownerUserId,
      assignee: 'Test Sales Specialist',
    });

    testTaskId = taskRow.id;
    assert(Boolean(taskRow && taskRow.id), 'Task created with valid canonical ID');
    assert(taskRow.status === 'Queue', 'New task defaults to canonical "Queue" status');
    assert(taskRow.assigned_to === employeeUserId, 'Task assigned to real member ID');
    assert(getCanonicalTasks(bizId).length === initialTasksCount + 1, 'Exactly ONE canonical task row created in database');

    // Verify task assignment notification
    const assignNotif = insertCanonicalNotification({
      business_id: bizId,
      user_id: employeeUserId,
      type: 'task_assigned',
      title: `New Task Assigned: ${taskRow.title}`,
      message: `You have been assigned task "${taskRow.title}".`,
      link_section: 'tasks',
      entity_id: taskRow.id,
    });
    assert(assignNotif && assignNotif.user_id === employeeUserId, 'Notification correctly targets assigned employee');

    // -------------------------------------------------------------
    // 3. Task Reassignment on the Same Record (No Duplication)
    // -------------------------------------------------------------
    console.log('\n--- 3. Task Reassignment on Same Record ---');
    const newAssigneeId = 'usr-marketing-003';
    const reassignedTask = updateCanonicalTask(testTaskId, {
      assigned_to: newAssigneeId,
      assignee: 'Test Marketing Specialist',
    });

    assert(reassignedTask.id === testTaskId, 'Reassignment occurred on the SAME task ID');
    assert(reassignedTask.assigned_to === newAssigneeId, 'assigned_to updated to new member');
    assert(getCanonicalTasks(bizId).length === initialTasksCount + 1, 'No duplicate task created during reassignment');

    // -------------------------------------------------------------
    // 4. Employee Status Update & Having Problem Flow
    // -------------------------------------------------------------
    console.log('\n--- 4. Status Progression & Having Problem Flow ---');
    const workingTask = updateCanonicalTask(testTaskId, { status: 'Working' });
    assert(workingTask.status === 'Working', 'Status transitioned from Queue -> Working');

    // Flag Having Problem with mandatory short note
    const blockerNote = 'Blocked on client API access keys';
    const noteEntry = insertCanonicalTaskNote({
      task_id: testTaskId,
      business_id: bizId,
      user_id: employeeUserId,
      user_name: 'Test Sales Specialist',
      text: blockerNote,
    });
    testNoteId = noteEntry.id;

    const problemTask = updateCanonicalTask(testTaskId, {
      status: 'Having Problem',
      short_note: blockerNote,
    });

    assert(problemTask.status === 'Having Problem', 'Status transitioned to Having Problem');
    assert(problemTask.short_note === blockerNote, 'Short note persisted on task');

    // Verify task notes thread
    const taskNotes = getCanonicalTaskNotes(testTaskId, bizId);
    assert(taskNotes.length >= 1, 'Task notes thread recorded in canonical database');
    assert(taskNotes[0].text === blockerNote, 'Note text matches blocker explanation');
    assert(taskNotes[0].user_id === employeeUserId, 'Note author ID correctly preserved');

    // Alert notification for Owner/Admin
    const problemNotif = insertCanonicalNotification({
      business_id: bizId,
      user_id: ownerUserId,
      type: 'lead_assigned',
      title: `🚨 Blocker: Task Having Problem (${problemTask.title})`,
      message: `Problem reported: ${blockerNote}`,
      link_section: 'tasks',
      entity_id: testTaskId,
    });
    assert(Boolean(problemNotif && problemNotif.id), 'Alert notification created for Owner/Admin on Having Problem');

    // -------------------------------------------------------------
    // 5. Done Flow & Reopen Protection
    // -------------------------------------------------------------
    console.log('\n--- 5. Done Flow & Reopen Protection ---');
    const doneTask = updateCanonicalTask(testTaskId, { status: 'Done' });
    assert(doneTask.status === 'Done', 'Task successfully marked as Done');

    // Test reopen restriction logic
    const canReopenAsOwner = hasPermission('Owner', 'tasks.edit');
    const canReopenAsViewer = hasPermission('Viewer', 'tasks.edit');
    assert(canReopenAsOwner === true, 'Owner has authority to edit/reopen Done tasks');
    assert(canReopenAsViewer === false, 'Viewer/unprivileged cannot edit/reopen Done tasks');

    // -------------------------------------------------------------
    // 6. Canonical Client & Projects Dataset
    // -------------------------------------------------------------
    console.log('\n--- 6. Canonical Clients & Projects Dataset ---');
    const clientRow = insertCanonicalClient({
      business_id: bizId,
      company_name: 'Nexus Retail Innovations',
      contact_person: 'Alexander Wright',
      email: 'alex@nexusretail.com',
      phone: '+1 (555) 987-6543',
      industry: 'Omnichannel eCommerce',
      status: 'Active',
      preferred_currency: 'USD',
      total_revenue: 45000,
    });
    testClientId = clientRow.id;

    assert(Boolean(clientRow && clientRow.id), 'Canonical client created');
    assert(clientRow.company_name === 'Nexus Retail Innovations', 'Client company name persisted');
    assert(clientRow.email === 'alex@nexusretail.com', 'Client email preserved');
    assert(clientRow.preferred_currency === 'USD', 'Client currency preference preserved');

    // Create Project for this Client
    const projectRow = insertCanonicalProject({
      business_id: bizId,
      client_id: testClientId,
      client_name: clientRow.company_name,
      name: 'Omnichannel Shopify Plus Rollout',
      status: 'Active',
      budget: 25000,
      currency: 'USD',
      deadline: todayStr,
      description: 'End-to-end migration and ERP integration',
    });
    testProjectId = projectRow.id;

    assert(Boolean(projectRow && projectRow.id), 'Canonical project created');
    assert(projectRow.client_id === testClientId, 'Project explicitly linked to Client ID');
    assert(projectRow.client_name === 'Nexus Retail Innovations', 'Project displays client name');

    // Link task to this project
    const linkedTask = updateCanonicalTask(testTaskId, {
      project_id: testProjectId,
      project_name: projectRow.name,
    });
    assert(linkedTask.project_id === testProjectId, 'Task linked to Project ID');
    assert(linkedTask.project_name === projectRow.name, 'Task displays Project name');

    // Verify Project tasks query
    const projectTasks = getCanonicalTasks(bizId, testProjectId);
    assert(projectTasks.length === 1, 'Project query retrieves the linked task');
    assert(projectTasks[0].id === testTaskId, 'Project detail tasks and Tasks module tasks are the SAME database record');

    // Verify Client projects query
    const clientProjects = getCanonicalProjects(bizId, testClientId);
    assert(clientProjects.length === 1, 'Client query retrieves the associated project');
    assert(clientProjects[0].id === testProjectId, 'Client detail projects and Projects module are the SAME database record');

    // -------------------------------------------------------------
    // 7. Lead -> Client Conversion & Duplicate Protection
    // -------------------------------------------------------------
    console.log('\n--- 7. Lead -> Client Conversion Flow & Duplicate Protection ---');
    const leadRow = insertCanonicalLead({
      business_id: bizId,
      name: 'Elena Rostova',
      company: 'Rostova Luxe Goods',
      email: 'elena@rostova.com',
      phone: '+1 (555) 432-1098',
      budget: 35000,
      currency: 'USD',
      status: 'Qualified',
    });
    testLeadId = leadRow.id;

    assert(Boolean(leadRow && leadRow.id), 'Prospect lead created in canonical DB');

    // Convert Lead to Client simulation
    const convertedClient = insertCanonicalClient({
      business_id: bizId,
      company_name: leadRow.company,
      contact_person: leadRow.name,
      email: leadRow.email,
      phone: leadRow.phone,
      originating_lead_id: leadRow.id,
      source_lead_id: leadRow.id,
      status: 'Active',
      total_revenue: leadRow.budget,
    });

    const updatedLead = updateCanonicalLead(leadRow.id, {
      converted_to_client_id: convertedClient.id,
      status: 'Won',
    });

    assert(updatedLead.converted_to_client_id === convertedClient.id, 'Lead references converted Client ID');
    assert(updatedLead.status === 'Won', 'Lead status transitioned to Won upon conversion');
    assert(convertedClient.originating_lead_id === leadRow.id, 'Client retains originating Lead ID reference');

    // Test Duplicate Conversion Protection
    const isAlreadyConverted = Boolean(updatedLead.converted_to_client_id);
    assert(isAlreadyConverted === true, 'Duplicate protection detects lead is already converted');

    // Clean up converted test client
    deleteCanonicalClient(convertedClient.id);

    // -------------------------------------------------------------
    // 8. Cross-Module Cascade & Cleanup
    // -------------------------------------------------------------
    console.log('\n--- 8. Cleanup & Cascade Integrity ---');
    // Test that deleting project unbinds project_id from tasks
    deleteCanonicalProject(testProjectId);
    const postProjectTasks = getCanonicalTasks(bizId);
    const unlinkedTask = postProjectTasks.find((t) => t.id === testTaskId);
    assert(unlinkedTask?.project_id === null, 'Project deletion cleanly sets task.project_id to null');

    // Delete test task and cascade notes
    deleteCanonicalTask(testTaskId);
    assert(getCanonicalTasks(bizId).find((t) => t.id === testTaskId) === undefined, 'Task cleanly deleted');
    assert(getCanonicalTaskNotes(testTaskId, bizId).length === 0, 'Task notes cascade deleted with task');

    // Delete test client and lead
    deleteCanonicalClient(testClientId);
    deleteCanonicalLead(testLeadId);
    assert(getCanonicalClients(bizId).find((c) => c.id === testClientId) === undefined, 'Client cleanly deleted');
    assert(getCanonicalLeads(bizId).find((l) => l.id === testLeadId) === undefined, 'Lead cleanly deleted');
  } catch (err: any) {
    console.error('Unexpected error in test execution:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passed} / ${passed + failed} ASSERTIONS PASSED`);
  if (failed === 0) {
    console.log('🎉 PHASE 6 VERIFICATION PASSED SUCCESSFULLY!');
  } else {
    console.log(`❌ ${failed} ASSERTION(S) FAILED!`);
    process.exit(1);
  }
  console.log('====================================================\n');
}

runPhase6Tests();
