/**
 * ============================================================
 *  Math Castle - Backend Server
 *  Modules: cookie-parser, cookie-session, express-session,
 *           EventEmitter, advanced JWT user authentication
 * ============================================================
 */

'use strict';

const express       = require('express');
const cookieParser  = require('cookie-parser');
const cookieSession = require('cookie-session');
const session       = require('express-session');
const path          = require('path');
const cors          = require('cors');

const authRouter      = require('./routes/auth');
const scoresRouter    = require('./routes/scores');
const { authEmitter } = require('./modules/authEventEmitter');

// ─── App Setup ───────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───────────────────────────────────────────────

// Parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie-Parser middleware – signs cookies with a secret
app.use(cookieParser(process.env.COOKIE_SECRET || 'mathcastle-cookie-secret'));

// Cookie-Session middleware – lightweight client-side session stored in cookies
// Used for ephemeral UI state (e.g., last-seen page, flash messages)
app.use(
  cookieSession({
    name  : 'mc_ui_session',
    keys  : [
      process.env.COOKIE_SESSION_KEY1 || 'cs-key-one',
      process.env.COOKIE_SESSION_KEY2 || 'cs-key-two',
    ],
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure  : process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  })
);

// Express-Session middleware – server-side session (stores in memory by default)
// Used for authenticated user state across requests
app.use(
  session({
    secret           : process.env.SESSION_SECRET || 'mathcastle-session-secret',
    name             : 'mc_sess',
    resave           : false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure  : process.env.NODE_ENV === 'production',
      maxAge  : 2 * 60 * 60 * 1000, // 2 hours
      sameSite: 'strict',
    },
  })
);

// CORS – allow frontend dev server
app.use(
  cors({
    origin     : ['http://localhost:8080', 'http://localhost:3000'],
    credentials: true,
  })
);

// Serve static frontend build
app.use(express.static(path.join(__dirname, '..', 'dist')));

// ─── Auth Event-Emitter Listeners ────────────────────────────
authEmitter.on('user:registered', (data) => {
  console.log(`[EVENT] New user registered: ${data.username} at ${new Date(data.timestamp).toISOString()}`);
});

authEmitter.on('user:login', (data) => {
  console.log(`[EVENT] User login: ${data.username} | IP: ${data.ip}`);
});

authEmitter.on('user:logout', (data) => {
  console.log(`[EVENT] User logout: ${data.username}`);
});

authEmitter.on('user:loginFailed', (data) => {
  console.warn(`[EVENT] ⚠ Failed login attempt for "${data.username}" | IP: ${data.ip}`);
});

authEmitter.on('user:passwordChanged', (data) => {
  console.log(`[EVENT] Password changed for: ${data.username}`);
});

// ─── Routes ──────────────────────────────────────────────────
app.use('/api/auth',   authRouter);
app.use('/api/scores', scoresRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status   : 'ok',
    timestamp: new Date().toISOString(),
    uptime   : process.uptime(),
  });
});

// Fallback – serve frontend for SPA routing
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

// ─── Error Handler ────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// ─── Start Server ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🏰 Math Castle Server running on http://localhost:${PORT}`);
  console.log(`   Mode     : ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Auth     : JWT + bcrypt + express-session`);
  console.log(`   Cookies  : cookie-parser + cookie-session\n`);
});

module.exports = app;
