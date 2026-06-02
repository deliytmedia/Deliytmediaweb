// =============================================================================
// SlackService.gs  —  AMS Mortgage Platform  —  Sprint 3
// =============================================================================
// Internal staff notifications via Slack Web API (chat.postMessage).
//
// Rules enforced here:
//   • Internal channels only — all targets must start with '#ams-' or be in
//     the SLACK_ALLOWED_CHANNELS script property (comma-separated).
//   • No PII in message body — Slack templates (TMPL-SL-*) must not contain
//     personal data. Enforced by design of the template bodies.
//
// Required Script Properties:
//   SLACK_BOT_TOKEN        — Bot User OAuth Token (xoxb-...)
//   SLACK_ALLOWED_CHANNELS — Optional comma-separated whitelist, e.g.
//                            '#ams-leads,#ams-ops,#ams-escalations'
//
// Do NOT call sendSlackMessage() directly from business logic —
// always route through sendNotification() in NotificationService.gs.
// =============================================================================

/**
 * sendSlackMessage — posts a message to an internal Slack channel.
 *
 * @param  {string} channel     Slack channel ID or name, e.g. '#ams-ops' / 'C01234'
 * @param  {string} templateId  Template ID from TEMPLATES constant (TMPL-SL-*)
 * @param  {Object} variables   Token values passed to buildMessage()
 * @return {Object} { ts: string, channel: string }
 * @throws {Error}  On API error, disallowed channel, or missing credentials
 */
function sendSlackMessage(channel, templateId, variables) {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('SLACK_BOT_TOKEN');

  if (!token)   throw new Error('SLACK_BOT_TOKEN script property is not set');
  if (!channel) throw new Error('channel is required');

  validateSlackChannel_(channel, props);

  var message = buildMessage(templateId, variables);

  var url = 'https://slack.com/api/chat.postMessage';

  var requestPayload = {
    channel: channel,
    text:    message.body,
    mrkdwn:  true
  };

  var options = {
    method:             'post',
    contentType:        'application/json; charset=utf-8',
    headers:            { Authorization: 'Bearer ' + token },
    payload:            JSON.stringify(requestPayload),
    muteHttpExceptions: true
  };

  var response   = UrlFetchApp.fetch(url, options);
  var statusCode = response.getResponseCode();
  var parsed     = JSON.parse(response.getContentText());

  if (statusCode !== 200 || !parsed.ok) {
    throw new Error('Slack API error: ' + (parsed.error || 'HTTP ' + statusCode));
  }

  return { ts: parsed.ts, channel: parsed.channel };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * validateSlackChannel_ — throws if the channel is not on the internal
 * allowlist.  Falls back to a prefix check (#ams-) when no property is set.
 */
function validateSlackChannel_(channel, props) {
  var allowedProp = props.getProperty('SLACK_ALLOWED_CHANNELS');

  if (allowedProp) {
    var allowed = allowedProp.split(',').map(function (s) { return s.trim(); });
    if (allowed.indexOf(channel) === -1) {
      throw new Error('Slack channel not allowed: ' + channel);
    }
    return;
  }

  // Default: require '#ams-' prefix to enforce internal-only rule
  if (channel.indexOf('#ams-') !== 0 && channel.indexOf('ams-') !== 0) {
    throw new Error(
      'Slack channel \'' + channel + '\' is not an internal AMS channel. ' +
      'Set SLACK_ALLOWED_CHANNELS to override the default prefix check.'
    );
  }
}
