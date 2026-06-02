// =============================================================================
// WhatsAppService.gs  —  AMS Mortgage Platform  —  Sprint 3
// =============================================================================
// Outbound: sendWhatsAppMessage() via Meta Cloud API
// Inbound:  handleInboundMessage() — detects opt-out keywords, routes replies
//
// Required Script Properties:
//   WHATSAPP_PHONE_NUMBER_ID  — Meta Business phone number ID
//   WHATSAPP_ACCESS_TOKEN     — Permanent or system-user access token
//   WHATSAPP_API_VERSION      — e.g. 'v19.0' (default: 'v19.0')
//
// Do NOT call sendWhatsAppMessage() directly from business logic —
// always route through sendNotification() in NotificationService.gs.
// =============================================================================

const OPTOUT_KEYWORDS = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'QUIT', 'END', 'OPTOUT'];

// ── Outbound ──────────────────────────────────────────────────────────────────

/**
 * sendWhatsAppMessage — sends a text message via the Meta Cloud API.
 *
 * @param  {string} recipientPhone  E.164 phone number, e.g. '+15551234567'
 * @param  {string} templateId      Template ID from TEMPLATES constant
 * @param  {Object} variables       Token values passed to buildMessage()
 * @return {Object} Parsed Meta API response body
 * @throws {Error}  On API error or missing credentials
 */
function sendWhatsAppMessage(recipientPhone, templateId, variables) {
  var props      = PropertiesService.getScriptProperties();
  var phoneId    = props.getProperty('WHATSAPP_PHONE_NUMBER_ID');
  var token      = props.getProperty('WHATSAPP_ACCESS_TOKEN');
  var apiVersion = props.getProperty('WHATSAPP_API_VERSION') || 'v19.0';

  if (!phoneId) throw new Error('WHATSAPP_PHONE_NUMBER_ID script property is not set');
  if (!token)   throw new Error('WHATSAPP_ACCESS_TOKEN script property is not set');
  if (!recipientPhone) throw new Error('recipientPhone is required');

  var message = buildMessage(templateId, variables);

  var url     = 'https://graph.facebook.com/' + apiVersion + '/' + phoneId + '/messages';
  var payload = {
    messaging_product: 'whatsapp',
    recipient_type:    'individual',
    to:                recipientPhone,
    type:              'text',
    text: {
      body:        message.body,
      preview_url: false
    }
  };

  var options = {
    method:           'post',
    contentType:      'application/json',
    headers:          { Authorization: 'Bearer ' + token },
    payload:          JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var response     = UrlFetchApp.fetch(url, options);
  var statusCode   = response.getResponseCode();
  var responseBody = response.getContentText();

  if (statusCode !== 200) {
    throw new Error('WhatsApp API error ' + statusCode + ': ' + responseBody);
  }

  return JSON.parse(responseBody);
}

// ── Inbound ───────────────────────────────────────────────────────────────────

/**
 * handleInboundMessage — processes a Meta Webhook payload.
 * Detects opt-out keywords (case-insensitive) and calls processOptOut().
 * Returns an array of processed message objects for caller inspection.
 *
 * @param  {Object} webhookPayload  Parsed JSON from Meta webhook POST
 * @return {Array}  Array of { from, body, action } objects
 */
function handleInboundMessage(webhookPayload) {
  var processed = [];

  var entries = (webhookPayload && webhookPayload.entry) ? webhookPayload.entry : [];

  entries.forEach(function (entry) {
    var changes = entry.changes || [];
    changes.forEach(function (change) {
      var value    = change.value || {};
      var messages = value.messages || [];

      messages.forEach(function (msg) {
        if (msg.type !== 'text') return;

        var from    = msg.from;
        var rawBody = (msg.text && msg.text.body) ? msg.text.body : '';
        var keyword = rawBody.trim().toUpperCase();

        if (OPTOUT_KEYWORDS.indexOf(keyword) !== -1) {
          processOptOut(from, 'WHATSAPP', keyword);
          sendWhatsAppOptOutConfirmation_(from);
          processed.push({ from: from, body: rawBody, action: 'OPT_OUT' });
        } else {
          processed.push({ from: from, body: rawBody, action: 'NONE' });
        }
      });
    });
  });

  return processed;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * sendWhatsAppOptOutConfirmation_ — sends a plain-text opt-out confirmation.
 * Bypasses sendNotification() because the recipient is already opted-out
 * at this point; we still need to deliver the confirmation.
 */
function sendWhatsAppOptOutConfirmation_(recipientPhone) {
  var props      = PropertiesService.getScriptProperties();
  var phoneId    = props.getProperty('WHATSAPP_PHONE_NUMBER_ID');
  var token      = props.getProperty('WHATSAPP_ACCESS_TOKEN');
  var apiVersion = props.getProperty('WHATSAPP_API_VERSION') || 'v19.0';

  if (!phoneId || !token) return; // silently skip if not configured

  var url     = 'https://graph.facebook.com/' + apiVersion + '/' + phoneId + '/messages';
  var payload = {
    messaging_product: 'whatsapp',
    recipient_type:    'individual',
    to:                recipientPhone,
    type:              'text',
    text: {
      body: 'You have been unsubscribed from all WhatsApp messages. ' +
            'Reply START to re-subscribe.',
      preview_url: false
    }
  };

  UrlFetchApp.fetch(url, {
    method:             'post',
    contentType:        'application/json',
    headers:            { Authorization: 'Bearer ' + token },
    payload:            JSON.stringify(payload),
    muteHttpExceptions: true
  });
}
