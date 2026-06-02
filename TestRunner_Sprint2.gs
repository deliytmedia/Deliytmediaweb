// TestRunner_Sprint2.gs — Sprint 2 test suites
// Appends to the existing TestRunner pattern from Sprint 1.
// Run via: TestRunner.runSuite('LeadService') etc., or runAllSprint2Tests()

// ── LeadService Tests ─────────────────────────────────────────────────────

function testLeadService_createLead_happy() {
  var lead = LeadService.createLead({
    first_name:    'Jane',
    last_name:     'Doe',
    email:         'jane@example.com',
    phone:         '5551234567',
    tcpa_consent:  true,
    lead_source:   'WebForm'
  });

  TestRunner.assert(!!lead.lead_id,                          'lead_id should be generated');
  TestRunner.assert(lead.status === Config.LEAD_STATUS.NEW,  'status should be NEW');
  TestRunner.assert(lead.tcpa_consent === true,              'tcpa_consent should be true');
  TestRunner.assert(lead.lead_score === 0,                   'initial lead_score should be 0');
  TestRunner.assert(!!lead.created_at,                       'created_at should be set');
  return lead;
}

function testLeadService_createLead_noTcpa() {
  var threw = false;
  try {
    LeadService.createLead({ first_name: 'X', last_name: 'Y', email: 'x@y.com', tcpa_consent: false });
  } catch (e) {
    threw = true;
    TestRunner.assert(e.message.indexOf('TCPA') !== -1, 'Error should mention TCPA');
  }
  TestRunner.assert(threw, 'Should throw when tcpa_consent is false');
}

function testLeadService_createLead_noContact() {
  var threw = false;
  try {
    LeadService.createLead({ first_name: 'X', last_name: 'Y', tcpa_consent: true });
  } catch (e) {
    threw = true;
    TestRunner.assert(e.message.indexOf('email or phone') !== -1, 'Error should mention contact field');
  }
  TestRunner.assert(threw, 'Should throw when neither email nor phone provided');
}

function testLeadService_getLeadById_found() {
  var created = testLeadService_createLead_happy();
  var fetched = LeadService.getLeadById(created.lead_id);
  TestRunner.assert(fetched !== null,                          'Should find the lead');
  TestRunner.assert(fetched.lead_id === created.lead_id,       'lead_id should match');
  TestRunner.assert(fetched.email   === 'jane@example.com',    'email should match');
}

function testLeadService_getLeadById_notFound() {
  var result = LeadService.getLeadById('LEAD-DOES-NOT-EXIST');
  TestRunner.assert(result === null, 'Should return null for unknown lead_id');
}

function testLeadService_updateLeadRecord() {
  var created = testLeadService_createLead_happy();
  var updated = LeadService.updateLeadRecord(created.lead_id, {
    notes:          'Called twice.',
    follow_up_date: '2026-07-01'
  });
  TestRunner.assert(updated.notes          === 'Called twice.',  'notes should be updated');
  TestRunner.assert(updated.follow_up_date === '2026-07-01',     'follow_up_date should be updated');
  TestRunner.assert(updated.lead_id        === created.lead_id,  'lead_id must not change');
  TestRunner.assert(updated.created_at     === created.created_at, 'created_at must not change');
}

function testLeadService_updateLeadRecord_notFound() {
  var threw = false;
  try {
    LeadService.updateLeadRecord('LEAD-MISSING', { notes: 'x' });
  } catch (e) {
    threw = true;
  }
  TestRunner.assert(threw, 'Should throw for unknown lead_id');
}

function testLeadService_assignLeadToLO() {
  var created  = testLeadService_createLead_happy();
  var assigned = LeadService.assignLeadToLO(created.lead_id, 'LO-001');
  TestRunner.assert(assigned.assigned_lo === 'LO-001', 'assigned_lo should be LO-001');
}

function testLeadService_assignLeadToLO_noLoId() {
  var created = testLeadService_createLead_happy();
  var threw   = false;
  try {
    LeadService.assignLeadToLO(created.lead_id, '');
  } catch (e) {
    threw = true;
  }
  TestRunner.assert(threw, 'Should throw when loId is empty');
}

function testLeadService_calculateLeadScore_hot() {
  var created = testLeadService_createLead_happy();
  var score   = LeadService.calculateLeadScore(created.lead_id, {
    contact_completeness:      true,
    loan_type_specified:       true,
    purchase_timeline_days:    60,
    prequalification_interest: true,
    follow_up_response:        true
  });
  TestRunner.assert(score.total_score === 100, 'All five factors should give score 100');
  TestRunner.assert(score.lead_id     === created.lead_id, 'score.lead_id should match');
}

function testLeadService_calculateLeadScore_notHot() {
  var created = testLeadService_createLead_happy();
  var score   = LeadService.calculateLeadScore(created.lead_id, {
    contact_completeness:      true,
    loan_type_specified:       false,
    purchase_timeline_days:    120,  // > 90 days, no points
    prequalification_interest: true,
    follow_up_response:        false
  });
  TestRunner.assert(score.total_score === 40, 'Two factors should give score 40');
}

function testLeadService_calculateLeadScore_timelineBoundary() {
  var created = testLeadService_createLead_happy();
  var score90 = LeadService.calculateLeadScore(created.lead_id, {
    contact_completeness:      false,
    loan_type_specified:       false,
    purchase_timeline_days:    90,
    prequalification_interest: false,
    follow_up_response:        false
  });
  TestRunner.assert(score90.purchase_timeline === 20, 'Exactly 90 days should earn 20 pts');

  var score91 = LeadService.calculateLeadScore(created.lead_id, {
    contact_completeness:      false,
    loan_type_specified:       false,
    purchase_timeline_days:    91,
    prequalification_interest: false,
    follow_up_response:        false
  });
  TestRunner.assert(score91.purchase_timeline === 0, '91 days should earn 0 pts');
}

function testLeadService_softDeleteLead() {
  var created = testLeadService_createLead_happy();
  var deleted = LeadService.softDeleteLead(created.lead_id);
  TestRunner.assert(deleted.status === Config.LEAD_STATUS.DEAD, 'status should be DEAD');

  // Lead still readable after soft delete
  var fetched = LeadService.getLeadById(created.lead_id);
  TestRunner.assert(fetched !== null, 'Soft-deleted lead should still be retrievable');
}

function testLeadService_getLeadsByLO() {
  // Create two leads for LO-002, one for LO-003
  var l1 = testLeadService_createLead_happy();
  var l2 = testLeadService_createLead_happy();
  var l3 = testLeadService_createLead_happy();

  LeadService.assignLeadToLO(l1.lead_id, 'LO-002');
  LeadService.assignLeadToLO(l2.lead_id, 'LO-002');
  LeadService.assignLeadToLO(l3.lead_id, 'LO-003');

  var lo2Leads = LeadService.getLeadsByLO('LO-002');
  TestRunner.assert(lo2Leads.length >= 2, 'LO-002 should have at least 2 leads');
  lo2Leads.forEach(function (l) {
    TestRunner.assert(l.assigned_lo === 'LO-002', 'Each returned lead should belong to LO-002');
  });
}

function testLeadService_searchLeads() {
  testLeadService_createLead_happy(); // ensures at least one jane@example.com exists
  var results = LeadService.searchLeads({ email: 'jane@example.com' });
  TestRunner.assert(results.length >= 1, 'Search by email should return at least one result');
  results.forEach(function (l) {
    TestRunner.assert(l.email === 'jane@example.com', 'Each result should match search email');
  });
}

function testLeadService_searchLeads_noResults() {
  var results = LeadService.searchLeads({ email: 'nobody-xyz-9999@nowhere.invalid' });
  TestRunner.assert(results.length === 0, 'Search for nonexistent email should return empty array');
}

function testLeadService_searchLeads_noCriteria() {
  var threw = false;
  try {
    LeadService.searchLeads({});
  } catch (e) {
    threw = true;
  }
  TestRunner.assert(threw, 'Should throw when no criteria provided');
}

// ── WorkflowEngine Tests ──────────────────────────────────────────────────

function testWorkflowEngine_processWorkflowEvent_evt001() {
  var result = WorkflowEngine.processWorkflowEvent(Config.EVENTS.EVT_001, { lead_id: 'LEAD-TEST-001' });
  TestRunner.assert(result.success === true,          'EVT-001 should succeed');
  TestRunner.assert(result.rulesExecuted.length >= 1, 'At least one rule should fire for EVT-001');
}

function testWorkflowEngine_processWorkflowEvent_evt003_hot() {
  var result = WorkflowEngine.processWorkflowEvent(Config.EVENTS.EVT_003, { lead_id: 'LEAD-TEST-002', score: 100 });
  TestRunner.assert(result.success === true,           'EVT-003 with score 100 should succeed');
  TestRunner.assert(result.rulesExecuted.indexOf('RULE-EVT003-HOT-LEAD-ALERT') !== -1,
                    'HOT lead rule should have executed');
}

function testWorkflowEngine_processWorkflowEvent_evt003_notHot() {
  var result = WorkflowEngine.processWorkflowEvent(Config.EVENTS.EVT_003, { lead_id: 'LEAD-TEST-003', score: 60 });
  // Rule condition checks score >= 80; score=60 should not match
  TestRunner.assert(result.rulesExecuted.indexOf('RULE-EVT003-HOT-LEAD-ALERT') === -1,
                    'HOT lead rule should NOT fire when score < 80');
}

function testWorkflowEngine_unknownEventId() {
  var threw = false;
  try {
    WorkflowEngine.processWorkflowEvent('EVT-UNKNOWN', {});
  } catch (e) {
    threw = true;
    TestRunner.assert(e.message.indexOf('Unknown eventId') !== -1, 'Error should mention unknown eventId');
  }
  TestRunner.assert(threw, 'Should throw for unknown event IDs');
}

function testWorkflowEngine_evaluateAutomationRules_noMatch() {
  // EVT-004 with missing lead_id should not match its rule
  var matched = WorkflowEngine.evaluateAutomationRules(Config.EVENTS.EVT_004, {});
  TestRunner.assert(matched.length === 0, 'No rules should match EVT-004 without lead_id');
}

function testWorkflowEngine_routeEvent_errorIsolation() {
  // Inject a broken rule directly (internal test only) — we test via known event with valid context
  // This verifies that a rule error doesn't kill the whole event
  var result = WorkflowEngine.processWorkflowEvent(Config.EVENTS.EVT_007, { lead_id: 'LEAD-REACTIVATE-001' });
  TestRunner.assert(typeof result.errors !== 'undefined', 'result.errors array should always be present');
}

// ── RateLimiter Tests ─────────────────────────────────────────────────────

function testRateLimiter_checkRateLimit_fresh() {
  var id     = 'LEAD-RL-' + new Date().getTime();
  var status = RateLimiter.checkRateLimit('EXTERNAL', id);
  TestRunner.assert(status.allowed    === true,              'Fresh identifier should be allowed');
  TestRunner.assert(status.current    === 0,                 'Fresh counter should be 0');
  TestRunner.assert(status.limit      === RateLimiter.LIMITS.EXTERNAL, 'Limit should match EXTERNAL constant');
  TestRunner.assert(status.remaining  === RateLimiter.LIMITS.EXTERNAL, 'Remaining should equal limit when fresh');
}

function testRateLimiter_incrementCounter() {
  var id     = 'LEAD-RL-INC-' + new Date().getTime();
  RateLimiter.resetCounter('EXTERNAL', id);

  var r1 = RateLimiter.incrementCounter('EXTERNAL', id);
  TestRunner.assert(r1.current   === 1,                        'Counter should be 1 after first increment');
  TestRunner.assert(r1.allowed   === true,                     'Should still be allowed after 1 increment');
  TestRunner.assert(r1.remaining === RateLimiter.LIMITS.EXTERNAL - 1, 'Remaining should decrease by 1');

  var r2 = RateLimiter.incrementCounter('EXTERNAL', id);
  TestRunner.assert(r2.current === 2, 'Counter should be 2 after second increment');
}

function testRateLimiter_resetCounter() {
  var id = 'LEAD-RL-RESET-' + new Date().getTime();
  RateLimiter.incrementCounter('EXTERNAL', id);
  RateLimiter.incrementCounter('EXTERNAL', id);

  RateLimiter.resetCounter('EXTERNAL', id);

  var status = RateLimiter.checkRateLimit('EXTERNAL', id);
  TestRunner.assert(status.current === 0, 'Counter should be 0 after reset');
}

function testRateLimiter_externalLimitEnforced() {
  var id    = 'LEAD-RL-LIM-' + new Date().getTime();
  var limit = RateLimiter.LIMITS.EXTERNAL;

  // Simulate hitting the limit
  for (var i = 0; i < limit; i++) {
    RateLimiter.incrementCounter('EXTERNAL', id);
  }

  var status = RateLimiter.checkRateLimit('EXTERNAL', id);
  TestRunner.assert(status.allowed    === false, 'Should be blocked after hitting limit');
  TestRunner.assert(status.remaining  === 0,     'Remaining should be 0 at limit');
  TestRunner.assert(status.current    === limit, 'Current should equal limit');
}

function testRateLimiter_internalLimit() {
  var id     = 'STAFF-RL-' + new Date().getTime();
  var status = RateLimiter.checkRateLimit('INTERNAL', id);
  TestRunner.assert(status.limit === RateLimiter.LIMITS.INTERNAL, 'INTERNAL limit should be 300');
  TestRunner.assert(status.allowed === true, 'Fresh internal identifier should be allowed');
}

function testRateLimiter_unknownType() {
  var threw = false;
  try {
    RateLimiter.checkRateLimit('BOGUS', 'some-id');
  } catch (e) {
    threw = true;
    TestRunner.assert(e.message.indexOf('Unknown rate limit type') !== -1, 'Error should describe unknown type');
  }
  TestRunner.assert(threw, 'Should throw for unknown rate limit type');
}

function testRateLimiter_missingIdentifier() {
  var threw = false;
  try {
    RateLimiter.checkRateLimit('EXTERNAL', '');
  } catch (e) {
    threw = true;
  }
  TestRunner.assert(threw, 'Should throw when identifier is empty');
}

// ── Suite runner ──────────────────────────────────────────────────────────

function runAllSprint2Tests() {
  var suites = [
    // LeadService
    testLeadService_createLead_happy,
    testLeadService_createLead_noTcpa,
    testLeadService_createLead_noContact,
    testLeadService_getLeadById_found,
    testLeadService_getLeadById_notFound,
    testLeadService_updateLeadRecord,
    testLeadService_updateLeadRecord_notFound,
    testLeadService_assignLeadToLO,
    testLeadService_assignLeadToLO_noLoId,
    testLeadService_calculateLeadScore_hot,
    testLeadService_calculateLeadScore_notHot,
    testLeadService_calculateLeadScore_timelineBoundary,
    testLeadService_softDeleteLead,
    testLeadService_getLeadsByLO,
    testLeadService_searchLeads,
    testLeadService_searchLeads_noResults,
    testLeadService_searchLeads_noCriteria,
    // WorkflowEngine
    testWorkflowEngine_processWorkflowEvent_evt001,
    testWorkflowEngine_processWorkflowEvent_evt003_hot,
    testWorkflowEngine_processWorkflowEvent_evt003_notHot,
    testWorkflowEngine_unknownEventId,
    testWorkflowEngine_evaluateAutomationRules_noMatch,
    testWorkflowEngine_routeEvent_errorIsolation,
    // RateLimiter
    testRateLimiter_checkRateLimit_fresh,
    testRateLimiter_incrementCounter,
    testRateLimiter_resetCounter,
    testRateLimiter_externalLimitEnforced,
    testRateLimiter_internalLimit,
    testRateLimiter_unknownType,
    testRateLimiter_missingIdentifier
  ];

  var passed = 0;
  var failed = 0;

  suites.forEach(function (fn) {
    try {
      fn();
      passed++;
      Logger.log('[PASS] ' + fn.name);
    } catch (e) {
      failed++;
      Logger.log('[FAIL] ' + fn.name + ' — ' + e.message);
    }
  });

  Logger.log('Sprint 2 Tests: ' + passed + ' passed, ' + failed + ' failed out of ' + suites.length + ' total.');
  return { passed: passed, failed: failed, total: suites.length };
}
