// TestRunner.gs — AMS Mortgage Platform: Test framework + full suite
//
// Entry point: TestRunner.runAllTests()
// Output goes to Apps Script console (View → Logs).

var TestRunner = (function () {

  var _results    = [];
  var _suiteName  = '';

  // ── Framework primitives ─────────────────────────────────────────────────────

  function assert(condition, message) {
    if (!condition) {
      throw new Error('Assertion failed: ' + (message || 'expected truthy value'));
    }
    return true;
  }

  function assertEqual(actual, expected, message) {
    var a = JSON.stringify(actual);
    var e = JSON.stringify(expected);
    if (a !== e) {
      throw new Error(
        (message || 'assertEqual') + ' — expected ' + e + ' but got ' + a
      );
    }
    return true;
  }

  function assertThrows(fn, message) {
    var sentinel = '__DID_NOT_THROW__';
    try {
      fn();
      throw new Error(sentinel);
    } catch (e) {
      if (e.message === sentinel) {
        throw new Error((message || 'assertThrows') + ' — expected an error but none was thrown');
      }
      return true;
    }
  }

  // ── Internal runner ──────────────────────────────────────────────────────────

  function _run(name, fn) {
    var start = Date.now();
    try {
      fn();
      _results.push({ suite: _suiteName, name: name, status: 'PASS', ms: Date.now() - start });
    } catch (e) {
      _results.push({ suite: _suiteName, name: name, status: 'FAIL', error: e.message, ms: Date.now() - start });
    }
  }

  function logTestResults(results) {
    var passed = results.filter(function (r) { return r.status === 'PASS'; }).length;
    var failed = results.filter(function (r) { return r.status === 'FAIL'; }).length;

    var lines = [
      '═══════════════════════════════════════════════════════',
      ' AMS TEST RESULTS — ' + new Date().toISOString(),
      '═══════════════════════════════════════════════════════',
      ' PASSED: ' + passed + '   FAILED: ' + failed + '   TOTAL: ' + results.length,
      '───────────────────────────────────────────────────────'
    ];

    var lastSuite = '';
    results.forEach(function (r) {
      if (r.suite !== lastSuite) {
        lines.push('\n  [' + r.suite + ']');
        lastSuite = r.suite;
      }
      var icon = r.status === 'PASS' ? '✓' : '✗';
      lines.push('    ' + icon + ' ' + r.name + ' (' + r.ms + 'ms)');
      if (r.status === 'FAIL') lines.push('      ↳ ' + r.error);
    });

    lines.push('═══════════════════════════════════════════════════════');
    var output = lines.join('\n');
    console.log(output);
    return output;
  }

  // ── Config tests ─────────────────────────────────────────────────────────────

  function _testConfig() {
    _suiteName = 'Config';

    _run('ROLES has all four values', function () {
      assertEqual(Config.ROLES.ADMIN,        'ADMIN');
      assertEqual(Config.ROLES.MANAGER,      'MANAGER');
      assertEqual(Config.ROLES.LOAN_OFFICER, 'LOAN_OFFICER');
      assertEqual(Config.ROLES.VIEWER,       'VIEWER');
    });

    _run('PERMISSION_MAP has all six actions', function () {
      var required = [
        'view_all_leads', 'edit_lead', 'export_data',
        'manage_staff', 'access_settings', 'view_audit_log'
      ];
      required.forEach(function (a) {
        assert(Array.isArray(Config.PERMISSION_MAP[a]), 'Missing action: ' + a);
      });
    });

    _run('manage_staff is ADMIN only', function () {
      assertEqual(Config.PERMISSION_MAP.manage_staff, ['ADMIN']);
    });

    _run('access_settings is ADMIN only', function () {
      assertEqual(Config.PERMISSION_MAP.access_settings, ['ADMIN']);
    });

    _run('view_all_leads excludes LOAN_OFFICER and VIEWER', function () {
      var p = Config.PERMISSION_MAP.view_all_leads;
      assert(p.indexOf('ADMIN')        !== -1, 'must include ADMIN');
      assert(p.indexOf('MANAGER')      !== -1, 'must include MANAGER');
      assert(p.indexOf('LOAN_OFFICER') === -1, 'must exclude LOAN_OFFICER');
      assert(p.indexOf('VIEWER')       === -1, 'must exclude VIEWER');
    });

    _run('edit_lead includes LOAN_OFFICER', function () {
      assert(Config.PERMISSION_MAP.edit_lead.indexOf('LOAN_OFFICER') !== -1);
    });

    _run('OWNERSHIP_REQUIRED_ACTIONS includes edit_lead', function () {
      assert(Config.OWNERSHIP_REQUIRED_ACTIONS.indexOf('edit_lead') !== -1);
    });

    _run('ALLOWED_DOMAINS contains all five required domains', function () {
      var required = [
        'api.openai.com', 'graph.facebook.com', 'api.sendgrid.com',
        'slack.com', 'hooks.slack.com'
      ];
      required.forEach(function (d) {
        assert(Config.ALLOWED_DOMAINS.indexOf(d) !== -1, 'Missing domain: ' + d);
      });
    });

    _run('STATUS has ACTIVE and INACTIVE', function () {
      assertEqual(Config.STATUS.ACTIVE,   'ACTIVE');
      assertEqual(Config.STATUS.INACTIVE, 'INACTIVE');
    });

    _run('LOAN_TYPES has eight expected types', function () {
      ['CONVENTIONAL', 'FHA', 'VA', 'USDA', 'JUMBO', 'REVERSE', 'HELOC', 'REFINANCE']
        .forEach(function (t) {
          assertEqual(Config.LOAN_TYPES[t], t);
        });
    });

    _run('RETRY_CONFIG has all four numeric fields', function () {
      assert(typeof Config.RETRY_CONFIG.MAX_ATTEMPTS   === 'number');
      assert(typeof Config.RETRY_CONFIG.BASE_DELAY_MS  === 'number');
      assert(typeof Config.RETRY_CONFIG.MAX_DELAY_MS   === 'number');
      assert(typeof Config.RETRY_CONFIG.BACKOFF_FACTOR === 'number');
    });

    _run('RETRY_CONFIG.MAX_ATTEMPTS is 3', function () {
      assertEqual(Config.RETRY_CONFIG.MAX_ATTEMPTS, 3);
    });

    _run('EVENT_IDS has required events', function () {
      ['STAFF_CREATED', 'LEAD_CREATED', 'PERMISSION_DENIED', 'AUDIT_ARCHIVED']
        .forEach(function (e) {
          assert(!!Config.EVENT_IDS[e], 'Missing event id: ' + e);
        });
    });

    _run('STAFF_COLUMNS matches schema (7 columns)', function () {
      assertEqual(Config.STAFF_COLUMNS, [
        'staff_id', 'email', 'first_name', 'last_name',
        'role', 'status', 'created_at'
      ]);
    });

    _run('AUDIT_COLUMNS matches schema (11 columns)', function () {
      assertEqual(Config.AUDIT_COLUMNS, [
        'audit_id', 'timestamp', 'actor_email', 'actor_role',
        'action_type', 'resource_type', 'resource_id',
        'action_detail', 'ip_address', 'result', 'error_detail'
      ]);
    });
  }

  // ── SheetsService tests ───────────────────────────────────────────────────────

  function _testSheetsService() {
    _suiteName = 'SheetsService';

    _run('rowToObject maps headers to row values', function () {
      var obj = SheetsService.rowToObject(['id', 'name', 'role'], ['123', 'Alice', 'ADMIN']);
      assertEqual(obj, { id: '123', name: 'Alice', role: 'ADMIN' });
    });

    _run('rowToObject fills short row with empty strings', function () {
      var obj = SheetsService.rowToObject(['id', 'name', 'role'], ['123']);
      assertEqual(obj.name, '');
      assertEqual(obj.role, '');
    });

    _run('objectToRow writes values in header order', function () {
      var row = SheetsService.objectToRow(
        ['id', 'name', 'role'],
        { role: 'ADMIN', id: '123', name: 'Alice' }
      );
      assertEqual(row, ['123', 'Alice', 'ADMIN']);
    });

    _run('objectToRow fills missing fields with empty string', function () {
      var row = SheetsService.objectToRow(['id', 'name', 'role'], { id: '123' });
      assertEqual(row[1], '');
      assertEqual(row[2], '');
    });

    _run('objectToRow treats null field value as empty string', function () {
      var row = SheetsService.objectToRow(['id', 'name'], { id: '1', name: null });
      assertEqual(row[1], '');
    });

    _run('rowToObject and objectToRow are inverse operations', function () {
      var headers  = ['audit_id', 'timestamp', 'actor_email'];
      var original = { audit_id: 'AUD_1', timestamp: '2025-01-01T00:00:00Z', actor_email: 'a@b.com' };
      var row      = SheetsService.objectToRow(headers, original);
      var restored = SheetsService.rowToObject(headers, row);
      assertEqual(restored, original);
    });

    _run('generateId returns a string starting with the given prefix', function () {
      var id = SheetsService.generateId('TST');
      assert(typeof id === 'string', 'id must be a string');
      assert(id.indexOf('TST_') === 0, 'id must start with TST_');
    });

    _run('generateId uses ID as default prefix', function () {
      var id = SheetsService.generateId();
      assert(id.indexOf('ID_') === 0);
    });

    _run('generateId produces unique values on successive calls', function () {
      var ids = {};
      for (var i = 0; i < 20; i++) {
        var id = SheetsService.generateId('U');
        assert(!ids[id], 'Duplicate id: ' + id);
        ids[id] = true;
      }
    });

    _run('rowToObject with empty headers returns empty object', function () {
      var obj = SheetsService.rowToObject([], []);
      assertEqual(obj, {});
    });

    _run('objectToRow with empty headers returns empty array', function () {
      var row = SheetsService.objectToRow([], { id: '1' });
      assertEqual(row, []);
    });
  }

  // ── AuditService tests ────────────────────────────────────────────────────────

  function _testAuditService() {
    _suiteName = 'AuditService';

    _run('logEvent throws when params is null', function () {
      assertThrows(function () { AuditService.logEvent(null); });
    });

    _run('logEvent throws when actorEmail is missing', function () {
      assertThrows(function () { AuditService.logEvent({ actionType: 'TEST' }); });
    });

    _run('logEvent throws when actionType is missing', function () {
      assertThrows(function () { AuditService.logEvent({ actorEmail: 'test@test.com' }); });
    });

    _run('logEvent throws when both required fields are absent', function () {
      assertThrows(function () { AuditService.logEvent({}); });
    });

    _run('flagComplianceEvent throws when auditId is null', function () {
      assertThrows(function () { AuditService.flagComplianceEvent(null, 'reason'); });
    });

    _run('flagComplianceEvent throws when auditId is empty string', function () {
      assertThrows(function () { AuditService.flagComplianceEvent('', 'reason'); });
    });

    _run('archiveOldEntries throws when daysOld is a string', function () {
      assertThrows(function () { AuditService.archiveOldEntries('thirty'); });
    });

    _run('archiveOldEntries throws when daysOld is 0', function () {
      assertThrows(function () { AuditService.archiveOldEntries(0); });
    });

    _run('archiveOldEntries throws when daysOld is negative', function () {
      assertThrows(function () { AuditService.archiveOldEntries(-5); });
    });

    _run('archiveOldEntries throws when daysOld is undefined', function () {
      assertThrows(function () { AuditService.archiveOldEntries(); });
    });

    _run('getAuditLog with null filter returns an array', function () {
      var result = AuditService.getAuditLog(null);
      assert(Array.isArray(result), 'getAuditLog must return an array');
    });

    _run('getAuditLog with no argument returns an array', function () {
      var result = AuditService.getAuditLog();
      assert(Array.isArray(result));
    });
  }

  // ── SecurityService tests ─────────────────────────────────────────────────────

  function _testSecurityService() {
    _suiteName = 'SecurityService';

    // validateDomain
    _run('validateDomain accepts https://api.openai.com/v1/chat', function () {
      assert(SecurityService.validateDomain('https://api.openai.com/v1/chat'));
    });

    _run('validateDomain accepts https://hooks.slack.com/services/xxx', function () {
      assert(SecurityService.validateDomain('https://hooks.slack.com/services/xxx'));
    });

    _run('validateDomain accepts https://graph.facebook.com/me', function () {
      assert(SecurityService.validateDomain('https://graph.facebook.com/me'));
    });

    _run('validateDomain accepts subdomain of slack.com', function () {
      assert(SecurityService.validateDomain('https://app.slack.com/path'));
    });

    _run('validateDomain rejects unknown domain', function () {
      assertEqual(SecurityService.validateDomain('https://evil.com/steal'), false);
    });

    _run('validateDomain rejects fake subdomain attack (openai.com.evil.com)', function () {
      assertEqual(SecurityService.validateDomain('https://api.openai.com.evil.com/x'), false);
    });

    _run('validateDomain rejects domain with allowed name embedded in path', function () {
      assertEqual(SecurityService.validateDomain('https://evil.com/api.openai.com'), false);
    });

    _run('validateDomain throws on empty string', function () {
      assertThrows(function () { SecurityService.validateDomain(''); });
    });

    _run('validateDomain throws on null', function () {
      assertThrows(function () { SecurityService.validateDomain(null); });
    });

    // isResourceOwner
    _run('isResourceOwner returns true for identical email', function () {
      assertEqual(SecurityService.isResourceOwner('alice@test.com', 'alice@test.com'), true);
    });

    _run('isResourceOwner returns false for different emails', function () {
      assertEqual(SecurityService.isResourceOwner('alice@test.com', 'bob@test.com'), false);
    });

    _run('isResourceOwner returns false when userEmail is null', function () {
      assertEqual(SecurityService.isResourceOwner(null, 'owner@test.com'), false);
    });

    _run('isResourceOwner returns false when resourceOwnerId is null', function () {
      assertEqual(SecurityService.isResourceOwner('user@test.com', null), false);
    });

    _run('isResourceOwner returns false when both args are null', function () {
      assertEqual(SecurityService.isResourceOwner(null, null), false);
    });

    // checkPermission — input validation (no sheet required)
    _run('checkPermission throws when userEmail is empty', function () {
      assertThrows(function () { SecurityService.checkPermission('', 'view_all_leads'); });
    });

    _run('checkPermission throws when action is empty', function () {
      assertThrows(function () { SecurityService.checkPermission('admin@test.com', ''); });
    });

    _run('checkPermission throws for unknown action', function () {
      assertThrows(function () {
        SecurityService.checkPermission('admin@test.com', 'nonexistent_action_xyz');
      });
    });

    // getUserRole — graceful handling when sheet may be absent
    _run('getUserRole throws when userEmail is empty', function () {
      assertThrows(function () { SecurityService.getUserRole(''); });
    });

    _run('getUserRole returns null or throws for unknown email', function () {
      try {
        var role = SecurityService.getUserRole('nobody_xyz_9999@nowhere.com');
        assertEqual(role, null);
      } catch (e) {
        // Acceptable: sheet may not exist in test environment
        assert(
          e.message.indexOf('getUserRole') !== -1 ||
          e.message.indexOf('Sheet not found') !== -1,
          'Unexpected error: ' + e.message
        );
      }
    });

    // verifyStaffActive — graceful handling when sheet may be absent
    _run('verifyStaffActive returns false for empty email', function () {
      assertEqual(SecurityService.verifyStaffActive(''), false);
    });

    _run('verifyStaffActive returns false or throws for unknown email', function () {
      try {
        var result = SecurityService.verifyStaffActive('nobody_xyz_9999@nowhere.com');
        assertEqual(result, false);
      } catch (e) {
        assert(
          e.message.indexOf('verifyStaffActive') !== -1 ||
          e.message.indexOf('Sheet not found') !== -1,
          'Unexpected error: ' + e.message
        );
      }
    });
  }

  // ── Public entry point ────────────────────────────────────────────────────────

  function runAllTests() {
    _results = [];
    _testConfig();
    _testSheetsService();
    _testAuditService();
    _testSecurityService();
    return logTestResults(_results);
  }

  return {
    runAllTests:    runAllTests,
    assert:         assert,
    assertEqual:    assertEqual,
    assertThrows:   assertThrows,
    logTestResults: logTestResults
  };

})();
