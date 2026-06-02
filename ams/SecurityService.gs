// SecurityService.gs — AMS Mortgage Platform: Auth & permission enforcement

var SecurityService = (function () {

  // ── Public API ───────────────────────────────────────────────────────────────

  /**
   * checkPermission — verifies the actor may perform `action`.
   *
   * Throws PERMISSION_DENIED on any failure and logs the denial to the audit log.
   * For LOAN_OFFICER on ownership-gated actions, resourceOwnerId must resolve
   * to the actor (by email or staff_id).
   *
   * @param  {string} userEmail
   * @param  {string} action           Key in Config.PERMISSION_MAP
   * @param  {string} [resourceOwnerId]  email or staff_id of resource owner
   * @return {true}
   */
  function checkPermission(userEmail, action, resourceOwnerId) {
    try {
      if (!userEmail) throw new Error('checkPermission: userEmail is required');
      if (!action)    throw new Error('checkPermission: action is required');

      var allowed = Config.PERMISSION_MAP[action];
      if (!allowed) {
        _denyAndThrow(userEmail, action, 'Unknown action: ' + action);
      }

      if (!verifyStaffActive(userEmail)) {
        _denyAndThrow(userEmail, action, 'Staff account is not active');
      }

      var role = getUserRole(userEmail);
      if (!role) {
        _denyAndThrow(userEmail, action, 'No role found for user');
      }

      if (allowed.indexOf(role) === -1) {
        _denyAndThrow(userEmail, action, 'Role ' + role + ' not permitted for action');
      }

      // Ownership gate: LOAN_OFFICER may only act on resources they own
      if (
        role === Config.ROLES.LOAN_OFFICER &&
        Config.OWNERSHIP_REQUIRED_ACTIONS.indexOf(action) !== -1
      ) {
        if (!isResourceOwner(userEmail, resourceOwnerId)) {
          _denyAndThrow(userEmail, action, 'LOAN_OFFICER does not own this resource');
        }
      }

      return true;
    } catch (e) {
      throw new Error(e.message);
    }
  }

  /**
   * getUserRole — looks up the actor's role from the STAFF sheet.
   * Returns the role string, or null if the email is not found.
   */
  function getUserRole(userEmail) {
    try {
      if (!userEmail) throw new Error('getUserRole: userEmail is required');
      var results = SheetsService.findRowsByField(
        Config.SHEET_TABS.STAFF, 'email', userEmail
      );
      if (results.length === 0) return null;
      return results[0].data.role || null;
    } catch (e) {
      throw new Error('SecurityService.getUserRole failed: ' + e.message);
    }
  }

  /**
   * validateDomain — returns true only if the URL's hostname (or a parent)
   * appears in Config.ALLOWED_DOMAINS.
   */
  function validateDomain(url) {
    try {
      if (!url) throw new Error('validateDomain: url is required');
      var host = url
        .replace(/^https?:\/\//i, '')
        .split('/')[0]
        .split(':')[0]
        .toLowerCase();
      var allowed = Config.ALLOWED_DOMAINS;
      for (var i = 0; i < allowed.length; i++) {
        if (host === allowed[i] || host.endsWith('.' + allowed[i])) return true;
      }
      return false;
    } catch (e) {
      throw new Error('SecurityService.validateDomain failed: ' + e.message);
    }
  }

  /**
   * isResourceOwner — returns true if userEmail matches resourceOwnerId,
   * either as a direct email match or via a STAFF sheet lookup by staff_id.
   */
  function isResourceOwner(userEmail, resourceOwnerId) {
    try {
      if (!userEmail || !resourceOwnerId) return false;
      if (userEmail === resourceOwnerId) return true;
      // Treat resourceOwnerId as a staff_id and resolve to email
      var staffRecord = SheetsService.findRowById(
        Config.SHEET_TABS.STAFF, resourceOwnerId
      );
      return !!(staffRecord && staffRecord.data.email === userEmail);
    } catch (e) {
      throw new Error('SecurityService.isResourceOwner failed: ' + e.message);
    }
  }

  /**
   * verifyStaffActive — returns true only when the staff record exists
   * and its status is ACTIVE.
   */
  function verifyStaffActive(userEmail) {
    try {
      if (!userEmail) return false;
      var results = SheetsService.findRowsByField(
        Config.SHEET_TABS.STAFF, 'email', userEmail
      );
      if (results.length === 0) return false;
      return results[0].data.status === Config.STATUS.ACTIVE;
    } catch (e) {
      throw new Error('SecurityService.verifyStaffActive failed: ' + e.message);
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  function _denyAndThrow(userEmail, action, reason) {
    try {
      AuditService.logEvent({
        actorEmail:    userEmail,
        actorRole:     '',
        actionType:    Config.EVENT_IDS.PERMISSION_DENIED,
        resourceType:  'PERMISSION',
        resourceId:    action,
        actionDetail:  reason,
        result:        'DENIED',
        errorDetail:   reason
      });
    } catch (auditErr) {
      // Audit write failure must not suppress the denial itself
      console.error('Failed to log permission denial: ' + auditErr.message);
    }
    throw new Error('PERMISSION_DENIED [' + action + ']: ' + reason);
  }

  return {
    checkPermission:  checkPermission,
    getUserRole:      getUserRole,
    validateDomain:   validateDomain,
    isResourceOwner:  isResourceOwner,
    verifyStaffActive: verifyStaffActive
  };

})();
