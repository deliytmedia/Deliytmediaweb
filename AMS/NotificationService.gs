// =============================================================================
// NotificationService.gs  —  AMS Mortgage Platform  —  Sprint 3
// =============================================================================
// Central orchestration layer. ALL outbound messages must enter via
// sendNotification() — no exceptions.
//
// Compliance gate order (runComplianceGate):
//   1. isOptedOut()          → ABORT  → BLOCKED_OPTOUT
//   2. hasTCPAConsent()      → ABORT  → BLOCKED_TCPA   (WHATSAPP + EMAIL)
//   3. isWithinBusinessHours → QUEUE  → BLOCKED_HOURS  (WHATSAPP + EMAIL)
//   4. Marketing email       → ABORT  → FAILED         (missing UNSUBSCRIBE_URL)
//
// NOTIFICATION_LOG columns (order matches appendRow calls):
//   log_id | event_id | recipient_id | recipient_type | channel |
//   template_id | status | attempt_count | sent_at | error_message |
//   variables_json
//
// Required Script Properties:
//   AMS_SPREADSHEET_ID, NOTIFICATION_LOG_SHEET (default: NOTIFICATION_LOG),
//   LEADS_SHEET (default: LEADS), OPT_OUTS_SHEET (default: OPT_OUTS)
// =============================================================================

// ── Configuration ─────────────────────────────────────────────────────────────

function getNotificationConfig_() {
  var props = PropertiesService.getScriptProperties();
  return {
    SPREADSHEET_ID:          props.getProperty('AMS_SPREADSHEET_ID'),
    NOTIFICATION_LOG_SHEET:  props.getProperty('NOTIFICATION_LOG_SHEET') || 'NOTIFICATION_LOG',
    LEADS_SHEET:             props.getProperty('LEADS_SHEET')            || 'LEADS',
    OPT_OUTS_SHEET:          props.getProperty('OPT_OUTS_SHEET')         || 'OPT_OUTS',
    TIMEZONE:                'America/New_York',
    BUSINESS_HOURS_START:    8,
    BUSINESS_HOURS_END:      20,
    RETRY_CONFIG: {
      WHATSAPP: { maxAttempts: 3, retryDelays: [5, 15]  },
      EMAIL:    { maxAttempts: 3, retryDelays: [10, 30] },
      SLACK:    { maxAttempts: 2, retryDelays: [5]      }
    }
  };
}

function getSpreadsheet_() {
  var cfg = getNotificationConfig_();
  if (!cfg.SPREADSHEET_ID) {
    throw new Error('AMS_SPREADSHEET_ID script property is not set');
  }
  return SpreadsheetApp.openById(cfg.SPREADSHEET_ID);
}

// ── Public entry point ────────────────────────────────────────────────────────

/**
 * sendNotification — the single entry point for every outbound message.
 *
 * @param {Object} params
 *   recipientId    {string}  Lead / staff ID used for compliance lookups
 *   recipientType  {string}  e.g. 'LEAD', 'STAFF'
 *   channel        {string}  'WHATSAPP' | 'EMAIL' | 'SLACK'
 *   templateId     {string}  e.g. 'TMPL-WA-001'
 *   variables      {Object}  Token values for buildMessage()
 *   eventId        {string}  Caller's event / transaction reference
 *   attemptCount   {number}  Defaults to 1; incremented by retryFailed()
 *   recipientPhone {string}  Required for WHATSAPP
 *   recipientEmail {string}  Required for EMAIL
 *   slackChannel   {string}  Required for SLACK
 */
function sendNotification(params) {
  var attempt = params.attemptCount || 1;

  // ── Compliance gate ──────────────────────────────────────────────────────
  var gate = runComplianceGate(params);

  if (gate.blocked) {
    logNotification_({
      eventId:       params.eventId,
      recipientId:   params.recipientId,
      recipientType: params.recipientType,
      channel:       params.channel,
      templateId:    params.templateId,
      status:        gate.status,
      attemptCount:  attempt,
      errorMessage:  gate.reason,
      variables:     params.variables
    });

    if (gate.queue) {
      queueForBusinessHours(params);
    }

    return { success: false, status: gate.status };
  }

  // ── Build & validate message ─────────────────────────────────────────────
  var message;
  try {
    message = buildMessage(params.templateId, params.variables);
  } catch (e) {
    logNotification_({
      eventId:       params.eventId,
      recipientId:   params.recipientId,
      recipientType: params.recipientType,
      channel:       params.channel,
      templateId:    params.templateId,
      status:        'FAILED',
      attemptCount:  attempt,
      errorMessage:  e.message,
      variables:     params.variables
    });
    return { success: false, status: 'FAILED', error: e.message };
  }

  // ── Route to channel service ─────────────────────────────────────────────
  try {
    var result;
    if (params.channel === 'WHATSAPP') {
      result = sendWhatsAppMessage(params.recipientPhone, params.templateId, params.variables);
    } else if (params.channel === 'EMAIL') {
      result = sendEmail(params.recipientEmail, params.templateId, params.variables,
                        { isMarketing: message.isMarketing });
    } else if (params.channel === 'SLACK') {
      result = sendSlackMessage(params.slackChannel, params.templateId, params.variables);
    } else {
      throw new Error('Unknown channel: ' + params.channel);
    }

    logNotification_({
      eventId:       params.eventId,
      recipientId:   params.recipientId,
      recipientType: params.recipientType,
      channel:       params.channel,
      templateId:    params.templateId,
      status:        'SENT',
      attemptCount:  attempt,
      variables:     params.variables
    });

    return { success: true, status: 'SENT', result: result };

  } catch (e) {
    logNotification_({
      eventId:       params.eventId,
      recipientId:   params.recipientId,
      recipientType: params.recipientType,
      channel:       params.channel,
      templateId:    params.templateId,
      status:        'FAILED',
      attemptCount:  attempt,
      errorMessage:  e.message,
      variables:     params.variables
    });

    scheduleRetry_(params, attempt);

    return { success: false, status: 'FAILED', error: e.message };
  }
}

// ── Compliance gate ────────────────────────────────────────────────────────────

/**
 * runComplianceGate — enforces gates in the mandated order.
 * Returns { blocked: false } on pass.
 * Returns { blocked: true, status, reason, queue? } on fail.
 */
function runComplianceGate(params) {
  var channel    = params.channel;
  var isExternal = (channel === 'WHATSAPP' || channel === 'EMAIL');
  var isSlack    = (channel === 'SLACK');

  // Gate 1 — Opt-out (all channels)
  if (isOptedOut(params.recipientId, channel)) {
    return { blocked: true, status: 'BLOCKED_OPTOUT', reason: 'Recipient has opted out' };
  }

  // Gate 2 — TCPA consent (external channels only)
  if (isExternal && !hasTCPAConsent(params.recipientId)) {
    return { blocked: true, status: 'BLOCKED_TCPA', reason: 'TCPA consent not verified' };
  }

  // Gate 3 — Business hours (WhatsApp + Email; Slack is exempt)
  if (!isSlack && !isWithinBusinessHours()) {
    return {
      blocked: true,
      status:  'BLOCKED_HOURS',
      reason:  'Outside business hours (8AM–8PM EST)',
      queue:   true
    };
  }

  // Gate 4 — Marketing email must carry an unsubscribe link
  if (channel === 'EMAIL') {
    var tmpl = TEMPLATES[params.templateId];
    if (tmpl && tmpl.isMarketing) {
      if (!params.variables || !params.variables.UNSUBSCRIBE_URL) {
        return {
          blocked: true,
          status:  'FAILED',
          reason:  'Marketing email requires UNSUBSCRIBE_URL variable'
        };
      }
    }
  }

  return { blocked: false };
}

// ── Compliance helpers ────────────────────────────────────────────────────────

/**
 * isWithinBusinessHours — returns true if current EST time is 8AM–8PM.
 */
function isWithinBusinessHours() {
  var cfg  = getNotificationConfig_();
  var now  = new Date();
  var hour = parseInt(Utilities.formatDate(now, cfg.TIMEZONE, 'H'), 10);
  return hour >= cfg.BUSINESS_HOURS_START && hour < cfg.BUSINESS_HOURS_END;
}

/**
 * hasTCPAConsent — all three conditions must be true:
 *   tcpa_consent = TRUE
 *   tcpa_consent_date IS NOT NULL
 *   first_contact_initiated_by = 'LEAD'
 */
function hasTCPAConsent(recipientId) {
  var cfg   = getNotificationConfig_();
  var sheet = getSpreadsheet_().getSheetByName(cfg.LEADS_SHEET);
  if (!sheet) throw new Error('Sheet not found: ' + cfg.LEADS_SHEET);

  var data    = sheet.getDataRange().getValues();
  var headers = data[0].map(function (h) { return String(h).toLowerCase(); });

  var idCol      = headers.indexOf('lead_id');
  var consentCol = headers.indexOf('tcpa_consent');
  var dateCol    = headers.indexOf('tcpa_consent_date');
  var initCol    = headers.indexOf('first_contact_initiated_by');

  if (idCol === -1 || consentCol === -1 || dateCol === -1 || initCol === -1) {
    throw new Error('LEADS sheet missing required TCPA columns');
  }

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) !== String(recipientId)) continue;

    var consent     = data[i][consentCol];
    var consentDate = data[i][dateCol];
    var initiatedBy = String(data[i][initCol]).toUpperCase();

    return consent === true &&
           consentDate !== null && consentDate !== '' &&
           initiatedBy === 'LEAD';
  }

  return false;
}

/**
 * isOptedOut — returns true if recipientId has opted out of the given channel
 * (or 'ALL' channels).
 */
function isOptedOut(recipientId, channel) {
  var cfg   = getNotificationConfig_();
  var sheet = getSpreadsheet_().getSheetByName(cfg.OPT_OUTS_SHEET);
  if (!sheet) throw new Error('Sheet not found: ' + cfg.OPT_OUTS_SHEET);

  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    var rowId  = String(data[i][0]);
    var rowCh  = String(data[i][1]).toUpperCase();
    if (rowId === String(recipientId) && (rowCh === channel || rowCh === 'ALL')) {
      return true;
    }
  }

  return false;
}

/**
 * processOptOut — records a channel-level opt-out for a recipient.
 * Called by WhatsApp inbound handler and any manual opt-out flow.
 */
function processOptOut(recipientId, channel, keyword) {
  var cfg   = getNotificationConfig_();
  var sheet = getSpreadsheet_().getSheetByName(cfg.OPT_OUTS_SHEET);
  if (!sheet) throw new Error('Sheet not found: ' + cfg.OPT_OUTS_SHEET);

  // Idempotent: skip if already opted out
  if (isOptedOut(recipientId, channel)) return;

  sheet.appendRow([
    String(recipientId),
    channel,
    new Date(),
    keyword || ''
  ]);
}

// ── Logging ───────────────────────────────────────────────────────────────────

/**
 * logNotification — writes one row to NOTIFICATION_LOG.
 * Column order: log_id | event_id | recipient_id | recipient_type | channel |
 *               template_id | status | attempt_count | sent_at |
 *               error_message | variables_json
 */
function logNotification_(entry) {
  var cfg   = getNotificationConfig_();
  var sheet = getSpreadsheet_().getSheetByName(cfg.NOTIFICATION_LOG_SHEET);
  if (!sheet) throw new Error('Sheet not found: ' + cfg.NOTIFICATION_LOG_SHEET);

  sheet.appendRow([
    'LOG-' + Utilities.getUuid(),
    entry.eventId        || '',
    entry.recipientId    || '',
    entry.recipientType  || '',
    entry.channel        || '',
    entry.templateId     || '',
    entry.status         || '',
    entry.attemptCount   || 1,
    new Date(),
    entry.errorMessage   || '',
    entry.variables ? JSON.stringify(entry.variables) : ''
  ]);
}

// ── Queue helpers ─────────────────────────────────────────────────────────────

/**
 * queueForBusinessHours — persists params and schedules a trigger at the next
 * 8AM EST open.  Trigger calls processBusinessHoursQueue().
 */
function queueForBusinessHours(params) {
  var props     = PropertiesService.getScriptProperties();
  var rawQueue  = props.getProperty('AMS_BH_QUEUE');
  var queue     = rawQueue ? JSON.parse(rawQueue) : [];

  params = JSON.parse(JSON.stringify(params));
  params.queuedAt = new Date().toISOString();
  queue.push(params);
  props.setProperty('AMS_BH_QUEUE', JSON.stringify(queue));

  // Only create a new trigger if none already exists for this function
  var triggers = ScriptApp.getProjectTriggers();
  var exists   = triggers.some(function (t) {
    return t.getHandlerFunction() === 'processBusinessHoursQueue';
  });

  if (!exists) {
    var openAt = getNextBusinessHoursOpen_();
    ScriptApp.newTrigger('processBusinessHoursQueue')
      .timeBased()
      .at(openAt)
      .create();
  }
}

/**
 * processBusinessHoursQueue — fired by the time trigger at 8AM EST.
 * Drains the queue by calling sendNotification() for each entry.
 */
function processBusinessHoursQueue() {
  var props = PropertiesService.getScriptProperties();
  var queue = JSON.parse(props.getProperty('AMS_BH_QUEUE') || '[]');

  props.setProperty('AMS_BH_QUEUE', '[]');

  queue.forEach(function (params) {
    delete params.queuedAt;
    sendNotification(params);
  });

  // Delete this trigger so a fresh one is created next time
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'processBusinessHoursQueue') {
      ScriptApp.deleteTrigger(t);
    }
  });
}

// ── Retry ─────────────────────────────────────────────────────────────────────

/**
 * retryFailed — time-triggered; processes the retry queue and re-attempts any
 * notifications whose back-off window has elapsed.
 */
function retryFailed() {
  var props     = PropertiesService.getScriptProperties();
  var rawQueue  = props.getProperty('AMS_RETRY_QUEUE');
  var queue     = rawQueue ? JSON.parse(rawQueue) : [];
  var now       = Date.now();
  var remaining = [];

  queue.forEach(function (entry) {
    if (now >= new Date(entry.retryAfter).getTime()) {
      var retryParams         = JSON.parse(JSON.stringify(entry));
      retryParams.attemptCount = entry.attemptCount;
      delete retryParams.retryAfter;
      sendNotification(retryParams);
    } else {
      remaining.push(entry);
    }
  });

  props.setProperty('AMS_RETRY_QUEUE', JSON.stringify(remaining));
}

/**
 * scheduleRetry_ — adds params to the retry queue and creates a one-off
 * trigger if more attempts remain.
 */
function scheduleRetry_(params, currentAttempt) {
  var cfg   = getNotificationConfig_();
  var retryCfg = cfg.RETRY_CONFIG[params.channel];
  if (!retryCfg) return;

  var delayIndex = currentAttempt - 1; // 0-based index into retryDelays
  if (delayIndex >= retryCfg.retryDelays.length) return; // exhausted

  var delayMs  = retryCfg.retryDelays[delayIndex] * 60 * 1000;
  var retryAt  = new Date(Date.now() + delayMs);

  var entry        = JSON.parse(JSON.stringify(params));
  entry.attemptCount = currentAttempt + 1;
  entry.retryAfter   = retryAt.toISOString();

  var props = PropertiesService.getScriptProperties();
  var queue = JSON.parse(props.getProperty('AMS_RETRY_QUEUE') || '[]');
  queue.push(entry);
  props.setProperty('AMS_RETRY_QUEUE', JSON.stringify(queue));

  ScriptApp.newTrigger('retryFailed')
    .timeBased()
    .at(retryAt)
    .create();
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Returns a Date object representing the next 8AM EST open.
 * Handles both EST (UTC-5) and EDT (UTC-4) automatically.
 */
function getNextBusinessHoursOpen_() {
  var tz      = 'America/New_York';
  var now     = new Date();
  var estHour = parseInt(Utilities.formatDate(now, tz, 'H'), 10);
  var addDays = (estHour >= 8) ? 1 : 0;

  var target    = new Date(now.getTime() + addDays * 86400000);
  var dateStr   = Utilities.formatDate(target, tz, 'yyyy-MM-dd');

  // Derive the current UTC offset for that date's timezone
  var utcNoon   = new Date(dateStr + 'T12:00:00Z');
  var estAtNoon = parseInt(Utilities.formatDate(utcNoon, tz, 'H'), 10);
  var utcOffset = 12 - estAtNoon; // e.g. 5 for EST, 4 for EDT

  var openHour  = 8 + utcOffset;
  return new Date(dateStr + 'T' + ('0' + openHour).slice(-2) + ':00:00Z');
}
