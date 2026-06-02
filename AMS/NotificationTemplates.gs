// =============================================================================
// NotificationTemplates.gs  —  AMS Mortgage Platform  —  Sprint 3
// =============================================================================
// All 18 notification templates: WA-001–006, EM-001–009, SL-001–003
// Public API: buildMessage(templateId, variables) → { body, subject?, channel,
//             templateId, isMarketing }
// Throws Error if templateId unknown or any {{VARIABLE}} token is missing.
// =============================================================================

const TEMPLATES = {

  // ── WhatsApp ──────────────────────────────────────────────────────────────

  'TMPL-WA-001': {
    id: 'TMPL-WA-001',
    channel: 'WHATSAPP',
    name: 'application_received',
    body:
      'Hi {{FIRST_NAME}}, we\'ve received your mortgage application ' +
      '(#{{APPLICATION_ID}}) for {{PROPERTY_ADDRESS}}. Your loan officer ' +
      '{{LOAN_OFFICER_NAME}} will be in touch within 1 business day. ' +
      'Questions? Reply to this message.'
  },

  'TMPL-WA-002': {
    id: 'TMPL-WA-002',
    channel: 'WHATSAPP',
    name: 'document_request',
    body:
      'Hi {{FIRST_NAME}}, to continue processing application #{{APPLICATION_ID}} ' +
      'we need: {{DOCUMENT_LIST}}. Please upload by {{DUE_DATE}}: {{UPLOAD_URL}}'
  },

  'TMPL-WA-003': {
    id: 'TMPL-WA-003',
    channel: 'WHATSAPP',
    name: 'application_approved',
    body:
      'Congratulations {{FIRST_NAME}}! Application #{{APPLICATION_ID}} is approved ' +
      'for {{LOAN_AMOUNT}} at {{INTEREST_RATE}}% ({{LOAN_TYPE}}). ' +
      '{{LOAN_OFFICER_NAME}} will contact you to discuss next steps.'
  },

  'TMPL-WA-004': {
    id: 'TMPL-WA-004',
    channel: 'WHATSAPP',
    name: 'application_denied',
    body:
      'Hi {{FIRST_NAME}}, after careful review we\'re unable to approve ' +
      'application #{{APPLICATION_ID}} at this time. {{LOAN_OFFICER_NAME}} will ' +
      'call you at {{CALLBACK_TIME}} to discuss options. A written explanation ' +
      'will arrive within 30 days.'
  },

  'TMPL-WA-005': {
    id: 'TMPL-WA-005',
    channel: 'WHATSAPP',
    name: 'rate_lock_confirmation',
    body:
      'Hi {{FIRST_NAME}}, your rate of {{INTEREST_RATE}}% is locked for ' +
      '{{LOCK_PERIOD}} days (expires {{LOCK_EXPIRY_DATE}}) on ' +
      'application #{{APPLICATION_ID}}. Contact {{LOAN_OFFICER_NAME}} ' +
      'with any questions.'
  },

  'TMPL-WA-006': {
    id: 'TMPL-WA-006',
    channel: 'WHATSAPP',
    name: 'closing_date_reminder',
    body:
      'Hi {{FIRST_NAME}}, reminder: closing is {{CLOSING_DATE}} at ' +
      '{{CLOSING_TIME}}, {{CLOSING_LOCATION}} (app #{{APPLICATION_ID}}). ' +
      'Bring photo ID and certified funds for {{CASH_TO_CLOSE}}. ' +
      'Questions? Contact {{LOAN_OFFICER_NAME}}.'
  },

  // ── Email ─────────────────────────────────────────────────────────────────

  'TMPL-EM-001': {
    id: 'TMPL-EM-001',
    channel: 'EMAIL',
    name: 'application_received_email',
    subject: 'Application Received — #{{APPLICATION_ID}}',
    body:
      'Dear {{FIRST_NAME}} {{LAST_NAME}},\n\n' +
      'Thank you for submitting your mortgage application (#{{APPLICATION_ID}}) ' +
      'for {{PROPERTY_ADDRESS}}.\n\n' +
      'Your loan officer: {{LOAN_OFFICER_NAME}}\n' +
      'Email: {{LOAN_OFFICER_EMAIL}}  |  Phone: {{LOAN_OFFICER_PHONE}}\n\n' +
      'Expected review timeline: {{REVIEW_TIMELINE}}\n' +
      'Track your application: {{PORTAL_URL}}\n\n' +
      'Best regards,\nThe {{COMPANY_NAME}} Team'
  },

  'TMPL-EM-002': {
    id: 'TMPL-EM-002',
    channel: 'EMAIL',
    name: 'document_request_email',
    subject: 'Action Required: Documents Needed for Application #{{APPLICATION_ID}}',
    body:
      'Dear {{FIRST_NAME}} {{LAST_NAME}},\n\n' +
      'To continue processing application #{{APPLICATION_ID}}, we need:\n\n' +
      '{{DOCUMENT_LIST}}\n\n' +
      'Please upload by {{DUE_DATE}}: {{UPLOAD_URL}}\n\n' +
      'Questions? Contact {{LOAN_OFFICER_NAME}} at {{LOAN_OFFICER_EMAIL}}.\n\n' +
      'Best regards,\nThe {{COMPANY_NAME}} Team'
  },

  'TMPL-EM-003': {
    id: 'TMPL-EM-003',
    channel: 'EMAIL',
    name: 'application_approved_email',
    subject: 'Congratulations! Your Mortgage is Approved — #{{APPLICATION_ID}}',
    body:
      'Dear {{FIRST_NAME}} {{LAST_NAME}},\n\n' +
      'Your mortgage application (#{{APPLICATION_ID}}) has been approved!\n\n' +
      'Loan Amount:       {{LOAN_AMOUNT}}\n' +
      'Interest Rate:     {{INTEREST_RATE}}%\n' +
      'Loan Type:         {{LOAN_TYPE}}\n' +
      'Term:              {{LOAN_TERM}} years\n' +
      'Monthly Payment:   {{MONTHLY_PAYMENT}}\n\n' +
      '{{LOAN_OFFICER_NAME}} will contact you within 1 business day.\n\n' +
      'Congratulations,\nThe {{COMPANY_NAME}} Team'
  },

  'TMPL-EM-004': {
    id: 'TMPL-EM-004',
    channel: 'EMAIL',
    name: 'application_denied_email',
    subject: 'Update on Your Mortgage Application #{{APPLICATION_ID}}',
    body:
      'Dear {{FIRST_NAME}} {{LAST_NAME}},\n\n' +
      'After careful review we are unable to approve application ' +
      '#{{APPLICATION_ID}} at this time.\n\n' +
      'A written explanation will be mailed to {{MAILING_ADDRESS}} within 30 days ' +
      'as required by law.\n\n' +
      '{{LOAN_OFFICER_NAME}} will contact you at {{CALLBACK_TIME}} to discuss options.\n\n' +
      'Thank you for considering {{COMPANY_NAME}}.\n\nBest regards,\nThe {{COMPANY_NAME}} Team'
  },

  'TMPL-EM-005': {
    id: 'TMPL-EM-005',
    channel: 'EMAIL',
    name: 'rate_lock_confirmation_email',
    subject: 'Rate Lock Confirmed — Application #{{APPLICATION_ID}}',
    body:
      'Dear {{FIRST_NAME}} {{LAST_NAME}},\n\n' +
      'Your interest rate has been locked for application #{{APPLICATION_ID}}.\n\n' +
      'Interest Rate:      {{INTEREST_RATE}}%\n' +
      'Lock Period:        {{LOCK_PERIOD}} days\n' +
      'Lock Expires:       {{LOCK_EXPIRY_DATE}}\n\n' +
      'If closing cannot occur by {{LOCK_EXPIRY_DATE}}, contact ' +
      '{{LOAN_OFFICER_NAME}} at {{LOAN_OFFICER_EMAIL}} immediately.\n\n' +
      'Best regards,\nThe {{COMPANY_NAME}} Team'
  },

  'TMPL-EM-006': {
    id: 'TMPL-EM-006',
    channel: 'EMAIL',
    name: 'closing_date_reminder_email',
    subject: 'Closing Reminder — {{CLOSING_DATE}} | Application #{{APPLICATION_ID}}',
    body:
      'Dear {{FIRST_NAME}} {{LAST_NAME}},\n\n' +
      'Closing: {{CLOSING_DATE}} at {{CLOSING_TIME}}\n' +
      'Location: {{CLOSING_LOCATION}}\n' +
      'Cash to Close: {{CASH_TO_CLOSE}}\n\n' +
      'Please bring:\n' +
      '  • Government-issued photo ID\n' +
      '  • Certified funds or wire confirmation for {{CASH_TO_CLOSE}}\n' +
      '  • Any outstanding documents\n\n' +
      'Questions? {{LOAN_OFFICER_NAME}} | {{LOAN_OFFICER_EMAIL}} | {{LOAN_OFFICER_PHONE}}\n\n' +
      'Best regards,\nThe {{COMPANY_NAME}} Team'
  },

  'TMPL-EM-007': {
    id: 'TMPL-EM-007',
    channel: 'EMAIL',
    isMarketing: true,
    name: 'marketing_new_rates',
    subject: 'Today\'s Mortgage Rates — {{RATE_DATE}}',
    body:
      'Hi {{FIRST_NAME}},\n\n' +
      'Today\'s featured rates from {{COMPANY_NAME}}:\n\n' +
      '{{RATE_TABLE}}\n\n' +
      'Rates available through {{OFFER_EXPIRY_DATE}} to qualified borrowers.\n\n' +
      'Ready to lock in? Contact us:\n' +
      '{{LOAN_OFFICER_NAME}} | {{LOAN_OFFICER_EMAIL}} | {{LOAN_OFFICER_PHONE}}\n\n' +
      'Best regards,\nThe {{COMPANY_NAME}} Team\n\n' +
      '---\n' +
      'To unsubscribe: {{UNSUBSCRIBE_URL}}\n{{COMPANY_ADDRESS}}'
  },

  'TMPL-EM-008': {
    id: 'TMPL-EM-008',
    channel: 'EMAIL',
    name: 'preapproval_letter_ready',
    subject: 'Your Pre-Approval Letter is Ready — {{COMPANY_NAME}}',
    body:
      'Dear {{FIRST_NAME}} {{LAST_NAME}},\n\n' +
      'Your mortgage pre-approval letter is ready.\n\n' +
      'Maximum Loan Amount: {{MAX_LOAN_AMOUNT}}\n' +
      'Valid Through:       {{EXPIRY_DATE}}\n' +
      'Reference:           #{{APPLICATION_ID}}\n\n' +
      'Download: {{LETTER_URL}}\n\n' +
      'This pre-approval is subject to final underwriting and does not constitute ' +
      'a commitment to lend.\n\n' +
      'Best regards,\n{{LOAN_OFFICER_NAME}}\n{{COMPANY_NAME}}'
  },

  'TMPL-EM-009': {
    id: 'TMPL-EM-009',
    channel: 'EMAIL',
    name: 'monthly_payment_reminder',
    subject: 'Payment Reminder — Due {{DUE_DATE}}',
    body:
      'Dear {{FIRST_NAME}} {{LAST_NAME}},\n\n' +
      'A friendly reminder that your mortgage payment is due:\n\n' +
      'Loan #:          {{LOAN_NUMBER}}\n' +
      'Amount Due:      {{PAYMENT_AMOUNT}}\n' +
      'Due Date:        {{DUE_DATE}}\n\n' +
      'Make a payment: {{PAYMENT_URL}}\n\n' +
      'If you\'ve already paid, please disregard this notice.\n\n' +
      'Best regards,\nThe {{COMPANY_NAME}} Team'
  },

  // ── Slack (internal staff — no PII in body) ────────────────────────────────

  'TMPL-SL-001': {
    id: 'TMPL-SL-001',
    channel: 'SLACK',
    name: 'new_lead_alert',
    body:
      ':new: *New Lead* | ID: {{LEAD_ID}} | Source: {{LEAD_SOURCE}} | ' +
      'LO: {{LOAN_OFFICER_NAME}} | Stage: {{LEAD_STAGE}} | ' +
      'Created: {{CREATED_AT}}'
  },

  'TMPL-SL-002': {
    id: 'TMPL-SL-002',
    channel: 'SLACK',
    name: 'application_status_change',
    body:
      ':arrows_counterclockwise: *Status Change* | App: #{{APPLICATION_ID}} | ' +
      '{{PREVIOUS_STATUS}} → {{NEW_STATUS}} | LO: {{LOAN_OFFICER_NAME}} | ' +
      'Updated: {{UPDATED_AT}}'
  },

  'TMPL-SL-003': {
    id: 'TMPL-SL-003',
    channel: 'SLACK',
    name: 'escalation_alert',
    body:
      ':rotating_light: *ESCALATION* | App: #{{APPLICATION_ID}} | ' +
      'Reason: {{ESCALATION_REASON}} | Priority: {{PRIORITY_LEVEL}} | ' +
      'LO: {{LOAN_OFFICER_NAME}} | By: {{ESCALATED_BY}} | ' +
      'Deadline: {{ACTION_DEADLINE}}'
  }

};

// =============================================================================
// buildMessage
// =============================================================================
// Returns { body, subject?, channel, templateId, isMarketing }
// Throws if templateId unknown or any {{TOKEN}} is absent from variables.
// =============================================================================
function buildMessage(templateId, variables) {
  var tmpl = TEMPLATES[templateId];
  if (!tmpl) {
    throw new Error('Unknown template: ' + templateId);
  }

  var allText = tmpl.body + (tmpl.subject || '');
  var tokenRe = /\{\{([A-Z0-9_]+)\}\}/g;
  var match;
  var seen = {};
  var missing = [];

  while ((match = tokenRe.exec(allText)) !== null) {
    var token = match[1];
    if (!seen[token]) {
      seen[token] = true;
      if (variables === undefined || variables === null ||
          variables[token] === undefined || variables[token] === null) {
        missing.push(token);
      }
    }
  }

  if (missing.length > 0) {
    throw new Error(
      'Missing variables for ' + templateId + ': ' + missing.join(', ')
    );
  }

  var replaceTokens = function (str) {
    return str.replace(/\{\{([A-Z0-9_]+)\}\}/g, function (_, t) {
      return variables[t];
    });
  };

  var result = {
    templateId:  templateId,
    channel:     tmpl.channel,
    isMarketing: tmpl.isMarketing === true,
    body:        replaceTokens(tmpl.body)
  };

  if (tmpl.subject) {
    result.subject = replaceTokens(tmpl.subject);
  }

  return result;
}
