// AuditService.gs — AMS Mortgage Platform: Append-only audit log
//
// POLICY: No row is ever updated or deleted in AUDIT_LOG.
// archiveOldEntries copies rows to AUDIT_ARCHIVE and appends a marker record;
// the originals remain intact.

var AuditService = (function () {

  var TAB     = Config.SHEET_TABS.AUDIT_LOG;
  var COLUMNS = Config.AUDIT_COLUMNS;

  var _COMPLIANCE_FLAG = 'COMPLIANCE_FLAG';

  // ── Public API ───────────────────────────────────────────────────────────────

  /**
   * logEvent — append one immutable audit record.
   *
   * Required params: actorEmail, actionType
   * Optional params: actorRole, resourceType, resourceId, actionDetail,
   *                  ipAddress, result, errorDetail
   */
  function logEvent(params) {
    try {
      if (!params || !params.actorEmail || !params.actionType) {
        throw new Error('logEvent requires actorEmail and actionType');
      }
      var record = {
        audit_id:      SheetsService.generateId('AUD'),
        timestamp:     new Date().toISOString(),
        actor_email:   params.actorEmail   || '',
        actor_role:    params.actorRole    || '',
        action_type:   params.actionType   || '',
        resource_type: params.resourceType || '',
        resource_id:   params.resourceId   || '',
        action_detail: params.actionDetail || '',
        ip_address:    params.ipAddress    || '',
        result:        params.result       || 'SUCCESS',
        error_detail:  params.errorDetail  || ''
      };
      SheetsService.appendRow(TAB, record);
      return record.audit_id;
    } catch (e) {
      // Audit failures must surface loudly — never swallow silently
      console.error('AuditService.logEvent failed: ' + e.message);
      throw new Error('AuditService.logEvent failed: ' + e.message);
    }
  }

  /**
   * getAuditLog — return records, optionally filtered.
   *
   * Optional filters: actorEmail, actionType, resourceType, resourceId,
   *                   result, startDate (ISO string), endDate (ISO string)
   */
  function getAuditLog(filters) {
    try {
      var data    = SheetsService.getSheetData(TAB);
      var records = data.rows.map(function (row) {
        return SheetsService.rowToObject(data.headers, row);
      });

      if (!filters) return records;

      return records.filter(function (r) {
        if (filters.actorEmail   && r.actor_email   !== filters.actorEmail)   return false;
        if (filters.actionType   && r.action_type   !== filters.actionType)   return false;
        if (filters.resourceType && r.resource_type !== filters.resourceType) return false;
        if (filters.resourceId   && r.resource_id   !== filters.resourceId)   return false;
        if (filters.result       && r.result        !== filters.result)       return false;
        if (filters.startDate) {
          var ts = new Date(r.timestamp);
          if (isNaN(ts.getTime()) || ts < new Date(filters.startDate)) return false;
        }
        if (filters.endDate) {
          var ts2 = new Date(r.timestamp);
          if (isNaN(ts2.getTime()) || ts2 > new Date(filters.endDate)) return false;
        }
        return true;
      });
    } catch (e) {
      throw new Error('AuditService.getAuditLog failed: ' + e.message);
    }
  }

  /**
   * flagComplianceEvent — appends a COMPLIANCE_FLAG record that references
   * an existing audit_id. Does NOT modify the original record.
   */
  function flagComplianceEvent(auditId, reason) {
    try {
      if (!auditId) throw new Error('flagComplianceEvent requires auditId');
      return logEvent({
        actorEmail:    'system@ams',
        actorRole:     Config.ROLES.ADMIN,
        actionType:    _COMPLIANCE_FLAG,
        resourceType:  'AUDIT_RECORD',
        resourceId:    auditId,
        actionDetail:  reason || 'Compliance flag raised',
        result:        'FLAGGED'
      });
    } catch (e) {
      throw new Error('AuditService.flagComplianceEvent failed: ' + e.message);
    }
  }

  /**
   * archiveOldEntries — copies records older than daysOld into AUDIT_ARCHIVE,
   * then appends a marker event. Source rows are never deleted.
   *
   * @param  {number} daysOld  Must be a positive integer.
   * @return {number}          Count of archived records.
   */
  function archiveOldEntries(daysOld) {
    try {
      if (typeof daysOld !== 'number' || daysOld < 1) {
        throw new Error('archiveOldEntries requires a positive number of days');
      }

      var cutoff    = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
      var toArchive = getAuditLog().filter(function (r) {
        var ts = new Date(r.timestamp);
        return !isNaN(ts.getTime()) && ts < cutoff;
      });

      if (toArchive.length === 0) return 0;

      var ss           = SpreadsheetApp.getActiveSpreadsheet();
      var archiveTab   = 'AUDIT_ARCHIVE';
      var archiveSheet = ss.getSheetByName(archiveTab);
      if (!archiveSheet) {
        archiveSheet = ss.insertSheet(archiveTab);
        archiveSheet.appendRow(COLUMNS);
      }

      toArchive.forEach(function (rec) {
        var row = COLUMNS.map(function (col) { return rec[col] || ''; });
        archiveSheet.appendRow(row);
      });

      logEvent({
        actorEmail:    'system@ams',
        actorRole:     Config.ROLES.ADMIN,
        actionType:    Config.EVENT_IDS.AUDIT_ARCHIVED,
        resourceType:  'AUDIT_LOG',
        actionDetail:  'Archived ' + toArchive.length + ' records older than ' + daysOld + ' days',
        result:        'SUCCESS'
      });

      return toArchive.length;
    } catch (e) {
      throw new Error('AuditService.archiveOldEntries failed: ' + e.message);
    }
  }

  return {
    logEvent:            logEvent,
    getAuditLog:         getAuditLog,
    flagComplianceEvent: flagComplianceEvent,
    archiveOldEntries:   archiveOldEntries
  };

})();
