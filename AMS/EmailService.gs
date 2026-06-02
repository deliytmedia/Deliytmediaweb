// =============================================================================
// EmailService.gs  —  AMS Mortgage Platform  —  Sprint 3
// =============================================================================
// Outbound email via SendGrid v3 API.
//
// Required Script Properties:
//   SENDGRID_API_KEY              — SendGrid API key (starts with 'SG.')
//   EMAIL_FROM_ADDRESS            — Verified sender address
//   EMAIL_FROM_NAME               — Display name, e.g. 'AMS Mortgage'
//   SENDGRID_UNSUBSCRIBE_GROUP_ID — Numeric group ID for marketing suppression
//
// Do NOT call sendEmail() directly from business logic —
// always route through sendNotification() in NotificationService.gs.
// =============================================================================

/**
 * sendEmail — sends an email via the SendGrid v3 /mail/send endpoint.
 *
 * @param  {string} recipientEmail  Destination email address
 * @param  {string} templateId      Template ID from TEMPLATES constant
 * @param  {Object} variables       Token values passed to buildMessage()
 * @param  {Object} options         { isMarketing: boolean }
 * @return {Object} { messageId: string|null }
 * @throws {Error}  On API error or missing credentials
 */
function sendEmail(recipientEmail, templateId, variables, options) {
  var props       = PropertiesService.getScriptProperties();
  var apiKey      = props.getProperty('SENDGRID_API_KEY');
  var fromAddress = props.getProperty('EMAIL_FROM_ADDRESS');
  var fromName    = props.getProperty('EMAIL_FROM_NAME') || 'AMS Mortgage';

  if (!apiKey)      throw new Error('SENDGRID_API_KEY script property is not set');
  if (!fromAddress) throw new Error('EMAIL_FROM_ADDRESS script property is not set');
  if (!recipientEmail) throw new Error('recipientEmail is required');

  var message = buildMessage(templateId, variables);
  var isMarketing = (options && options.isMarketing === true) || message.isMarketing;

  var url = 'https://api.sendgrid.com/v3/mail/send';

  var payload = {
    personalizations: [
      { to: [{ email: recipientEmail }] }
    ],
    from:    { email: fromAddress, name: fromName },
    subject: message.subject || '(No Subject)',
    content: [
      { type: 'text/plain', value: message.body }
    ]
  };

  if (isMarketing) {
    var groupId = parseInt(props.getProperty('SENDGRID_UNSUBSCRIBE_GROUP_ID') || '0', 10);
    if (groupId) {
      payload.asm = { group_id: groupId };
    }
    payload.tracking_settings = {
      click_tracking: { enable: true,  enable_text: false },
      open_tracking:  { enable: true }
    };
  }

  var requestOptions = {
    method:             'post',
    contentType:        'application/json',
    headers:            { Authorization: 'Bearer ' + apiKey },
    payload:            JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var response   = UrlFetchApp.fetch(url, requestOptions);
  var statusCode = response.getResponseCode();

  // SendGrid returns 202 Accepted on success
  if (statusCode !== 202) {
    var body = response.getContentText();
    throw new Error('SendGrid API error ' + statusCode + ': ' + body);
  }

  var messageId = response.getHeaders()['x-message-id'] || null;
  return { messageId: messageId };
}
