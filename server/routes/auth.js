/**
 * ============================================================
 *  Auth Routes  (/api/auth/*)
 * ============================================================
 */

'use strict';

const express      = require('express');
const router       = express.Router();
const authService  = require('../modules/authService');
const { requireAuth } = require('../middleware/authMiddleware');

// Helper to send refresh token as a HttpOnly cookie
function setRefreshCookie(res, token) {
  res.cookie('mc_refresh', token, {
    httpOnly: true,
    secure  : process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge  : 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

// ─── POST /api/auth/register ─────────────────────────────────
router.post('/register', async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    const result = await authService.register({ username, email, password });

    // Store user info in server-side session so other SSR pages know who's logged in
    req.session.user = { username: result.user.username, role: result.user.role };

    setRefreshCookie(res, result.refreshToken);

    return res.status(201).json({
      success    : true,
      message    : 'Registration successful!',
      user       : result.user,
      accessToken: result.accessToken,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/login ────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const ip     = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const result = await authService.login({ username, password, ip });

    // Set server-side session
    req.session.user = { username: result.user.username, role: result.user.role };

    // Cookie-session: store last login time (visible to client-side JS via signed cookie)
    req.session.lastLogin = new Date().toISOString();

    setRefreshCookie(res, result.refreshToken);

    return res.json({
      success    : true,
      message    : 'Login successful!',
      user       : result.user,
      accessToken: result.accessToken,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/auth/refresh ──────────────────────────────────
router.post('/refresh', (req, res, next) => {
  try {
    // Get refresh token from HttpOnly cookie
    const refreshToken = req.cookies.mc_refresh;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'No refresh token.' });
    }

    const result = authService.refreshAccess(refreshToken);
    return res.json({ success: true, accessToken: result.accessToken });
  } catch (err) {
    err.status = 401;
    next(err);
  }
});

// ─── POST /api/auth/logout ───────────────────────────────────
router.post('/logout', requireAuth, (req, res, next) => {
  try {
    const refreshToken = req.cookies.mc_refresh;
    authService.logout({ username: req.user.username, refreshToken });

    // Destroy server-side session
    req.session.destroy(() => {});

    // Clear cookies
    res.clearCookie('mc_refresh');
    res.clearCookie('mc_sess');

    return res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/auth/me ────────────────────────────────────────
router.get('/me', requireAuth, (req, res, next) => {
  try {
    const user = authService.getUser(req.user.username);
    return res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/auth/change-password ───────────────────────────
router.put('/change-password', requireAuth, async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    await authService.changePassword({
      username   : req.user.username,
      oldPassword,
      newPassword,
    });

    // Force re-login after password change
    req.session.destroy(() => {});
    res.clearCookie('mc_refresh');
    res.clearCookie('mc_sess');

    return res.json({
      success: true,
      message: 'Password changed. Please log in again.',
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/auth/session ───────────────────────────────────
// For server-rendered pages that read session directly (no JWT)
router.get('/session', (req, res) => {
  if (req.session && req.session.user) {
    return res.json({ success: true, loggedIn: true, user: req.session.user });
  }
  return res.json({ success: true, loggedIn: false });
});

module.exports = router;
