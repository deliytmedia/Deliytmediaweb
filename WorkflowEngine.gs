// WorkflowEngine.gs — Sprint 2: Lead Layer
// Depends on: Config.gs, AuditService.gs, SecurityService.gs, SheetsService.gs

var WorkflowEngine = (function () {

  // ── Automation rule registry ──────────────────────────────────────────────
  // Each rule: { id, eventId, condition(context)->bool, action(context)->void }

  var _rules = [
    {
      id:      'RULE-EVT001-NEW-LEAD-LOG',
      eventId: 'EVT-001',
      condition: function (ctx) { return !!ctx.lead_id; },
      action: function (ctx) {
        // Placeholder: notify admin channel or trigger external webhook
        _log('New lead received', ctx);
      }
    },
    {
      id:      'RULE-EVT002-ASSIGN-NOTIFY',
      eventId: 'EVT-002',
      condition: function (ctx) { return !!(ctx.lead_id && ctx.lo_id); },
      action: function (ctx) {
        _log('Lead assigned to LO: ' + ctx.lo_id, ctx);
      }
    },
    {
      id:      'RULE-EVT003-HOT-LEAD-ALERT',
      eventId: 'EVT-003',
      condition: function (ctx) { return ctx.score !== undefined && ctx.score >= 80; },
      action: function (ctx) {
        _log('HOT lead alert — score ' + ctx.score, ctx);
        // Extend here: send email/SMS via notification service
      }
    },
    {
      id:      'RULE-EVT004-FOLLOWUP-DUE',
      eventId: 'EVT-004',
      condition: function (ctx) { return !!ctx.lead_id; },
      action: function (ctx) {
        _log('Follow-up due', ctx);
      }
    },
    {
      id:      'RULE-EVT005-UNRESPONSIVE',
      eventId: 'EVT-005',
      condition: function (ctx) { return !!ctx.lead_id; },
      action: function (ctx) {
        _log('Lead marked unresponsive', ctx);
      }
    },
    {
      id:      'RULE-EVT007-REACTIVATED',
      eventId: 'EVT-007',
      condition: function (ctx) { return !!ctx.lead_id; },
      action: function (ctx) {
        _log('Lead reactivated', ctx);
      }
    }
  ];

  // ── Private helpers ───────────────────────────────────────────────────────

  function _log(message, ctx) {
    Logger.log('[WorkflowEngine] ' + message + ' | context: ' + JSON.stringify(ctx));
  }

  function _validateEventId(eventId) {
    var valid = Object.keys(Config.EVENTS).map(function (k) { return Config.EVENTS[k]; });
    if (valid.indexOf(eventId) === -1) {
      throw new Error('Unknown eventId: ' + eventId);
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * processWorkflowEvent(eventId, payload)
   * Main entry point. Validates the event, evaluates rules, routes, and logs result.
   */
  function processWorkflowEvent(eventId, payload) {
    _validateEventId(eventId);

    var context = payload || {};
    context.eventId    = eventId;
    context.processedAt = new Date().toISOString();

    var matchedRules = evaluateAutomationRules(eventId, context);
    var result       = routeEvent(eventId, context, matchedRules);
    logWorkflowResult(eventId, result, context);

    return result;
  }

  /**
   * evaluateAutomationRules(eventId, context)
   * Returns the subset of rules whose condition passes for this event + context.
   */
  function evaluateAutomationRules(eventId, context) {
    var matched = [];
    for (var i = 0; i < _rules.length; i++) {
      var rule = _rules[i];
      if (rule.eventId !== eventId) continue;
      try {
        if (rule.condition(context)) matched.push(rule);
      } catch (e) {
        _log('Rule condition error [' + rule.id + ']: ' + e.message, context);
      }
    }
    return matched;
  }

  /**
   * routeEvent(eventId, context, matchedRules)
   * Executes each matched rule's action. Returns a result summary.
   */
  function routeEvent(eventId, context, matchedRules) {
    var executed = [];
    var errors   = [];

    for (var i = 0; i < matchedRules.length; i++) {
      var rule = matchedRules[i];
      try {
        rule.action(context);
        executed.push(rule.id);
      } catch (e) {
        errors.push({ ruleId: rule.id, error: e.message });
        _log('Rule action error [' + rule.id + ']: ' + e.message, context);
      }
    }

    return {
      eventId:       eventId,
      rulesExecuted: executed,
      errors:        errors,
      success:       errors.length === 0
    };
  }

  /**
   * logWorkflowResult(eventId, result, context)
   * Persists the workflow outcome via AuditService.
   */
  function logWorkflowResult(eventId, result, context) {
    AuditService.logEvent('WORKFLOW_RESULT', {
      eventId:       eventId,
      rulesExecuted: result.rulesExecuted,
      errors:        result.errors,
      success:       result.success,
      lead_id:       context.lead_id || null
    });
  }

  // ── Exports ───────────────────────────────────────────────────────────────
  return {
    processWorkflowEvent:    processWorkflowEvent,
    evaluateAutomationRules: evaluateAutomationRules,
    routeEvent:              routeEvent,
    logWorkflowResult:       logWorkflowResult
  };

})();

// Top-level alias so LeadService can call processWorkflowEvent() directly
// (GAS loads all .gs files into one scope)
function processWorkflowEvent(eventId, payload) {
  return WorkflowEngine.processWorkflowEvent(eventId, payload);
}
