/**
 * ============================================================
 *  JWT Authentication Middleware
 *  Verifies the Authorization: Bearer <token> header on
 *  every protected route.
 * ============================================================
 */

'use strict';

const { verifyAccessToken } = require('../modules/authService');

/**
 * requireAuth – attach decoded JWT payload to req.user.
 * Returns 401 if token is missing, expired, or tampered.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Access token required.' });
  }

  const token = authHeader.slice(7);
  try {
    req.user = verifyAccessToken(token);
    return next();
  } catch (err) {
    const isExpired = err.name === 'TokenExpiredError';
    return res.status(401).json({
      success: false,
      message: isExpired ? 'Access token expired. Please refresh.' : 'Invalid access token.',
      code   : isExpired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
    });
  }
}

/**
 * requireRole – restricts access to users with the given role.
 * Must be used AFTER requireAuth.
 *
 * @param {...string} roles - Allowed roles (e.g. 'admin')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${roles.join(', ')}.`,
      });
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };
