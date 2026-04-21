/**
 * ============================================================
 *  Auth Event Emitter
 *  Built on Node.js core EventEmitter.
 *  Raises typed events throughout the authentication lifecycle
 *  so other modules can react without tight coupling.
 * ============================================================
 */

'use strict';

const { EventEmitter } = require('events');

class AuthEventEmitter extends EventEmitter {
  /**
   * Emit a structured event with a consistent payload shape.
   *
   * @param {string} event   - Event name (e.g. 'user:login')
   * @param {object} payload - Arbitrary context data
   */
  emit(event, payload = {}) {
    const enrichedPayload = {
      ...payload,
      event,
      timestamp: Date.now(),
    };
    super.emit(event, enrichedPayload);
  }

  // ── Typed helper methods ─────────────────────────────────

  /** Fires when a new account is created */
  userRegistered(username, extra = {}) {
    this.emit('user:registered', { username, ...extra });
  }

  /** Fires on every successful login */
  userLoggedIn(username, ip = 'unknown') {
    this.emit('user:login', { username, ip });
  }

  /** Fires on every logout */
  userLoggedOut(username) {
    this.emit('user:logout', { username });
  }

  /** Fires on failed login attempt (wrong password / unknown user) */
  loginFailed(username, ip = 'unknown') {
    this.emit('user:loginFailed', { username, ip });
  }

  /** Fires after a successful password change */
  passwordChanged(username) {
    this.emit('user:passwordChanged', { username });
  }
}

// Singleton – shared across the whole application
const authEmitter = new AuthEventEmitter();

// Increase the default listener limit slightly (we have ~5 registered)
authEmitter.setMaxListeners(15);

module.exports = { authEmitter, AuthEventEmitter };
