// LeadService.gs — Sprint 2: Lead Layer
// Depends on: Config.gs, SheetsService.gs, AuditService.gs, SecurityService.gs, WorkflowEngine.gs, RateLimiter.gs

var LeadService = (function () {

  // ── Private helpers ──────────────────────────────────────────────────────

  function _generateLeadId() {
    return 'LEAD-' + new Date().getTime() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
  }

  function _now() {
    return new Date().toISOString();
  }

  /**
   * Map a LEADS row array to a plain object using the column order defined in Config.
   */
  function _rowToLead(row) {
    var c = Config.LEADS_COLUMNS;
    return {
      lead_id:                     row[c.LEAD_ID],
      first_name:                  row[c.FIRST_NAME],
      last_name:                   row[c.LAST_NAME],
      email:                       row[c.EMAIL],
      phone:                       row[c.PHONE],
      lead_source:                 row[c.LEAD_SOURCE],
      assigned_lo:                 row[c.ASSIGNED_LO],
      status:                      row[c.STATUS],
      lead_score:                  row[c.LEAD_SCORE],
      tcpa_consent:                row[c.TCPA_CONSENT],
      tcpa_consent_date:           row[c.TCPA_CONSENT_DATE],
      first_contact_initiated_by:  row[c.FIRST_CONTACT_INITIATED_BY],
      whatsapp_opt_out:            row[c.WHATSAPP_OPT_OUT],
      email_opt_in:                row[c.EMAIL_OPT_IN],
      email_opt_out:               row[c.EMAIL_OPT_OUT],
      opt_out_date:                row[c.OPT_OUT_DATE],
      opt_out_channel:             row[c.OPT_OUT_CHANNEL],
      follow_up_date:              row[c.FOLLOW_UP_DATE],
      notes:                       row[c.NOTES],
      created_at:                  row[c.CREATED_AT],
      updated_at:                  row[c.UPDATED_AT]
    };
  }

  /**
   * Find the 1-based sheet row index for a given lead_id. Returns -1 if not found.
   */
  function _findLeadRow(leadId) {
    var data = SheetsService.getSheetData(Config.SHEETS.LEADS);
    var col  = Config.LEADS_COLUMNS.LEAD_ID;
    for (var i = 1; i < data.length; i++) { // skip header row at index 0
      if (data[i][col] === leadId) return i + 1; // +1 because sheet rows are 1-based
    }
    return -1;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * createLead(leadData)
   * Required fields: first_name, last_name, email OR phone, tcpa_consent
   * Returns the newly created lead object.
   */
  function createLead(leadData) {
    checkPermission('LEAD_CREATE');

    if (!leadData.tcpa_consent) {
      throw new Error('TCPA consent is required to create a lead.');
    }
    if (!leadData.email && !leadData.phone) {
      throw new Error('At least one of email or phone is required.');
    }
    if (!leadData.first_name || !leadData.last_name) {
      throw new Error('first_name and last_name are required.');
    }

    var now    = _now();
    var leadId = _generateLeadId();

    var c = Config.LEADS_COLUMNS;
    var row = [];
    row[c.LEAD_ID]                    = leadId;
    row[c.FIRST_NAME]                 = leadData.first_name || '';
    row[c.LAST_NAME]                  = leadData.last_name  || '';
    row[c.EMAIL]                      = leadData.email      || '';
    row[c.PHONE]                      = leadData.phone      || '';
    row[c.LEAD_SOURCE]                = leadData.lead_source || '';
    row[c.ASSIGNED_LO]                = leadData.assigned_lo || '';
    row[c.STATUS]                     = Config.LEAD_STATUS.NEW;
    row[c.LEAD_SCORE]                 = 0;
    row[c.TCPA_CONSENT]               = true;
    row[c.TCPA_CONSENT_DATE]          = now;
    row[c.FIRST_CONTACT_INITIATED_BY] = leadData.first_contact_initiated_by || '';
    row[c.WHATSAPP_OPT_OUT]           = leadData.whatsapp_opt_out || false;
    row[c.EMAIL_OPT_IN]               = leadData.email_opt_in  || false;
    row[c.EMAIL_OPT_OUT]              = leadData.email_opt_out || false;
    row[c.OPT_OUT_DATE]               = '';
    row[c.OPT_OUT_CHANNEL]            = '';
    row[c.FOLLOW_UP_DATE]             = leadData.follow_up_date || '';
    row[c.NOTES]                      = leadData.notes || '';
    row[c.CREATED_AT]                 = now;
    row[c.UPDATED_AT]                 = now;

    AuditService.logEvent('LEAD_CREATE', { lead_id: leadId, data: leadData });
    SheetsService.appendRow(Config.SHEETS.LEADS, row);

    processWorkflowEvent(Config.EVENTS.EVT_001, { lead_id: leadId });

    return _rowToLead(row);
  }

  /**
   * getLeadById(leadId)
   * Returns lead object or null.
   */
  function getLeadById(leadId) {
    checkPermission('LEAD_READ');

    var data   = SheetsService.getSheetData(Config.SHEETS.LEADS);
    var col    = Config.LEADS_COLUMNS.LEAD_ID;
    for (var i = 1; i < data.length; i++) {
      if (data[i][col] === leadId) return _rowToLead(data[i]);
    }
    return null;
  }

  /**
   * updateLeadRecord(leadId, updates)
   * Merges updates into the existing row. Stamps updated_at.
   * Returns the updated lead object.
   */
  function updateLeadRecord(leadId, updates) {
    checkPermission('LEAD_UPDATE');

    var rowIndex = _findLeadRow(leadId);
    if (rowIndex === -1) throw new Error('Lead not found: ' + leadId);

    // Disallow overwriting immutable fields
    var immutable = ['lead_id', 'created_at', 'tcpa_consent_date'];
    immutable.forEach(function (f) { delete updates[f]; });

    updates.updated_at = _now();

    AuditService.logEvent('LEAD_UPDATE', { lead_id: leadId, updates: updates });
    SheetsService.updateRowByIndex(Config.SHEETS.LEADS, rowIndex, updates, Config.LEADS_COLUMNS);

    return getLeadById(leadId);
  }

  /**
   * assignLeadToLO(leadId, loId)
   * Sets assigned_lo, fires EVT-002.
   */
  function assignLeadToLO(leadId, loId) {
    checkPermission('LEAD_ASSIGN');

    if (!loId) throw new Error('loId is required.');

    var lead = getLeadById(leadId);
    if (!lead) throw new Error('Lead not found: ' + leadId);

    AuditService.logEvent('LEAD_ASSIGN', { lead_id: leadId, lo_id: loId });
    SheetsService.updateRowByIndex(
      Config.SHEETS.LEADS,
      _findLeadRow(leadId),
      { assigned_lo: loId, updated_at: _now() },
      Config.LEADS_COLUMNS
    );

    processWorkflowEvent(Config.EVENTS.EVT_002, { lead_id: leadId, lo_id: loId });

    return getLeadById(leadId);
  }

  /**
   * calculateLeadScore(leadId, scoreData)
   * scoreData keys: contact_completeness, loan_type_specified,
   *                 purchase_timeline_days, prequalification_interest,
   *                 follow_up_response  (all boolean except purchase_timeline_days)
   * Each factor is worth 20 pts. Total max = 100.
   * Writes to LEAD_SCORE tab. Fires EVT-003 if score >= 80.
   * Returns the score record.
   */
  function calculateLeadScore(leadId, scoreData) {
    checkPermission('LEAD_SCORE');

    var lead = getLeadById(leadId);
    if (!lead) throw new Error('Lead not found: ' + leadId);

    var contact_completeness      = scoreData.contact_completeness      ? 20 : 0;
    var loan_type_specified       = scoreData.loan_type_specified        ? 20 : 0;
    var purchase_timeline         = (scoreData.purchase_timeline_days !== undefined &&
                                     scoreData.purchase_timeline_days <= 90)        ? 20 : 0;
    var prequalification_interest = scoreData.prequalification_interest  ? 20 : 0;
    var follow_up_response        = scoreData.follow_up_response         ? 20 : 0;

    var total = contact_completeness + loan_type_specified + purchase_timeline +
                prequalification_interest + follow_up_response;

    var now      = _now();
    var scoreId  = 'SCORE-' + new Date().getTime();

    var sc = Config.LEAD_SCORE_COLUMNS;
    var scoreRow = [];
    scoreRow[sc.SCORE_ID]                  = scoreId;
    scoreRow[sc.LEAD_ID]                   = leadId;
    scoreRow[sc.TOTAL_SCORE]               = total;
    scoreRow[sc.CONTACT_COMPLETENESS]      = contact_completeness;
    scoreRow[sc.LOAN_TYPE_SPECIFIED]       = loan_type_specified;
    scoreRow[sc.PURCHASE_TIMELINE]         = purchase_timeline;
    scoreRow[sc.PREQUALIFICATION_INTEREST] = prequalification_interest;
    scoreRow[sc.FOLLOW_UP_RESPONSE]        = follow_up_response;
    scoreRow[sc.SCORED_AT]                 = now;

    AuditService.logEvent('LEAD_SCORE', { lead_id: leadId, total_score: total });
    SheetsService.appendRow(Config.SHEETS.LEAD_SCORE, scoreRow);

    // Keep lead_score in LEADS tab in sync
    SheetsService.updateRowByIndex(
      Config.SHEETS.LEADS,
      _findLeadRow(leadId),
      { lead_score: total, updated_at: now },
      Config.LEADS_COLUMNS
    );

    if (total >= 80) {
      processWorkflowEvent(Config.EVENTS.EVT_003, { lead_id: leadId, score: total });
    }

    return {
      score_id:                scoreId,
      lead_id:                 leadId,
      total_score:             total,
      contact_completeness:    contact_completeness,
      loan_type_specified:     loan_type_specified,
      purchase_timeline:       purchase_timeline,
      prequalification_interest: prequalification_interest,
      follow_up_response:      follow_up_response,
      scored_at:               now
    };
  }

  /**
   * softDeleteLead(leadId)
   * Sets status to DEAD. No hard delete ever.
   */
  function softDeleteLead(leadId) {
    checkPermission('LEAD_DELETE');

    var rowIndex = _findLeadRow(leadId);
    if (rowIndex === -1) throw new Error('Lead not found: ' + leadId);

    AuditService.logEvent('LEAD_DELETE', { lead_id: leadId });
    SheetsService.updateRowByIndex(
      Config.SHEETS.LEADS,
      rowIndex,
      { status: Config.LEAD_STATUS.DEAD, updated_at: _now() },
      Config.LEADS_COLUMNS
    );

    return getLeadById(leadId);
  }

  /**
   * getLeadsByLO(loId)
   * Returns array of lead objects assigned to the given loan officer.
   */
  function getLeadsByLO(loId) {
    checkPermission('LEAD_READ');

    var data   = SheetsService.getSheetData(Config.SHEETS.LEADS);
    var col    = Config.LEADS_COLUMNS.ASSIGNED_LO;
    var result = [];
    for (var i = 1; i < data.length; i++) {
      if (data[i][col] === loId) result.push(_rowToLead(data[i]));
    }
    return result;
  }

  /**
   * searchLeads(criteria)
   * criteria: plain object with any LEADS field keys.
   * Returns all leads where every provided criterion matches (case-insensitive string match).
   */
  function searchLeads(criteria) {
    checkPermission('LEAD_READ');

    if (!criteria || Object.keys(criteria).length === 0) {
      throw new Error('At least one search criterion is required.');
    }

    var data   = SheetsService.getSheetData(Config.SHEETS.LEADS);
    var result = [];

    for (var i = 1; i < data.length; i++) {
      var lead  = _rowToLead(data[i]);
      var match = true;

      for (var key in criteria) {
        if (!criteria.hasOwnProperty(key)) continue;
        var leadVal     = (lead[key] !== undefined && lead[key] !== null) ? String(lead[key]).toLowerCase() : '';
        var searchVal   = String(criteria[key]).toLowerCase();
        if (leadVal.indexOf(searchVal) === -1) {
          match = false;
          break;
        }
      }

      if (match) result.push(lead);
    }

    return result;
  }

  // ── Exports ───────────────────────────────────────────────────────────────
  return {
    createLead:         createLead,
    getLeadById:        getLeadById,
    updateLeadRecord:   updateLeadRecord,
    assignLeadToLO:     assignLeadToLO,
    calculateLeadScore: calculateLeadScore,
    softDeleteLead:     softDeleteLead,
    getLeadsByLO:       getLeadsByLO,
    searchLeads:        searchLeads
  };

})();
