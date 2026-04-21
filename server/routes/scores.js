/**
 * ============================================================
 *  Scores Routes  (/api/scores/*)
 *  Demonstrates a protected route that uses both JWT auth
 *  and the Express session.
 * ============================================================
 */

'use strict';

const express    = require('express');
const router     = express.Router();
const authService = require('../modules/authService');
const { requireAuth } = require('../middleware/authMiddleware');

// ─── POST /api/scores/submit ─────────────────────────────────
// Protected – must have a valid JWT access token
router.post('/submit', requireAuth, (req, res, next) => {
  try {
    const { score } = req.body;
    if (typeof score !== 'number' || score < 0) {
      return res.status(400).json({ success: false, message: 'Invalid score value.' });
    }

    const updatedUser = authService.updateHighScore(req.user.username, score);

    return res.json({
      success  : true,
      message  : score > updatedUser.highScore ? 'New high score!' : 'Score recorded.',
      highScore: updatedUser.highScore,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/scores/me ──────────────────────────────────────
router.get('/me', requireAuth, (req, res, next) => {
  try {
    const user = authService.getUser(req.user.username);
    return res.json({ success: true, highScore: user.highScore });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
