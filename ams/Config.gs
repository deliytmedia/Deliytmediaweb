// Config.gs — AMS Mortgage Platform: Global Constants

var Config = (function () {

  var ROLES = {
    ADMIN:        'ADMIN',
    MANAGER:      'MANAGER',
    LOAN_OFFICER: 'LOAN_OFFICER',
    VIEWER:       'VIEWER'
  };

  // Actions that require an ownership check when the actor is LOAN_OFFICER
  var OWNERSHIP_REQUIRED_ACTIONS = ['edit_lead'];

  var PERMISSION_MAP = {
    view_all_leads:  ['ADMIN', 'MANAGER'],
    edit_lead:       ['ADMIN', 'MANAGER', 'LOAN_OFFICER'],
    export_data:     ['ADMIN', 'MANAGER'],
    manage_staff:    ['ADMIN'],
    access_settings: ['ADMIN'],
    view_audit_log:  ['ADMIN', 'MANAGER']
  };

  var EVENT_IDS = {
    // Staff
    STAFF_CREATED:      'EVT_STAFF_001',
    STAFF_UPDATED:      'EVT_STAFF_002',
    STAFF_DEACTIVATED:  'EVT_STAFF_003',
    // Lead
    LEAD_CREATED:       'EVT_LEAD_001',
    LEAD_UPDATED:       'EVT_LEAD_002',
    LEAD_EXPORTED:      'EVT_LEAD_003',
    // Auth
    PERMISSION_DENIED:  'EVT_AUTH_001',
    LOGIN_SUCCESS:      'EVT_AUTH_002',
    LOGIN_FAILED:       'EVT_AUTH_003',
    // Audit
    AUDIT_ARCHIVED:     'EVT_AUDIT_001',
    COMPLIANCE_FLAGGED: 'EVT_AUDIT_002',
    // Settings
    SETTINGS_CHANGED:   'EVT_SET_001'
  };

  var ALLOWED_DOMAINS = [
    'api.openai.com',
    'graph.facebook.com',
    'api.sendgrid.com',
    'slack.com',
    'hooks.slack.com'
  ];

  var STATUS = {
    // Staff statuses
    ACTIVE:      'ACTIVE',
    INACTIVE:    'INACTIVE',
    PENDING:     'PENDING',
    ARCHIVED:    'ARCHIVED',
    // Lead statuses
    NEW:         'NEW',
    CONTACTED:   'CONTACTED',
    QUALIFIED:   'QUALIFIED',
    CLOSED_WON:  'CLOSED_WON',
    CLOSED_LOST: 'CLOSED_LOST'
  };

  var LOAN_TYPES = {
    CONVENTIONAL: 'CONVENTIONAL',
    FHA:          'FHA',
    VA:           'VA',
    USDA:         'USDA',
    JUMBO:        'JUMBO',
    REVERSE:      'REVERSE',
    HELOC:        'HELOC',
    REFINANCE:    'REFINANCE'
  };

  var RETRY_CONFIG = {
    MAX_ATTEMPTS:   3,
    BASE_DELAY_MS:  500,
    MAX_DELAY_MS:   5000,
    BACKOFF_FACTOR: 2
  };

  var SHEET_TABS = {
    STAFF:     'STAFF',
    AUDIT_LOG: 'AUDIT_LOG',
    LEADS:     'LEADS',
    SETTINGS:  'SETTINGS'
  };

  // Column order must match the physical sheet exactly
  var STAFF_COLUMNS = [
    'staff_id', 'email', 'first_name', 'last_name',
    'role', 'status', 'created_at'
  ];

  var AUDIT_COLUMNS = [
    'audit_id', 'timestamp', 'actor_email', 'actor_role',
    'action_type', 'resource_type', 'resource_id',
    'action_detail', 'ip_address', 'result', 'error_detail'
  ];

  return {
    ROLES:                      ROLES,
    OWNERSHIP_REQUIRED_ACTIONS: OWNERSHIP_REQUIRED_ACTIONS,
    PERMISSION_MAP:             PERMISSION_MAP,
    EVENT_IDS:                  EVENT_IDS,
    ALLOWED_DOMAINS:            ALLOWED_DOMAINS,
    STATUS:                     STATUS,
    LOAN_TYPES:                 LOAN_TYPES,
    RETRY_CONFIG:               RETRY_CONFIG,
    SHEET_TABS:                 SHEET_TABS,
    STAFF_COLUMNS:              STAFF_COLUMNS,
    AUDIT_COLUMNS:              AUDIT_COLUMNS
  };

})();
