/**
 * ============================================================
 *  Advanced User Authentication Module
 *  Features:
 *   - bcrypt password hashing (cost factor 12)
 *   - JWT access tokens  (short-lived, 15 min)
 *   - JWT refresh tokens (long-lived, 7 days, stored in DB)
 *   - Account lockout   (5 failed attempts → 15 min lock)
 *   - Input validation  (regex + length checks)
 *   - Rate-limit awareness via authEmitter events
 * ============================================================
 */

'use strict';

const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const { authEmitter } = require('./authEventEmitter');

// ─── Config ───────────────────────────────────────────────────
const SALT_ROUNDS      = 12;
const ACCESS_TOKEN_TTL  = '15m';
const REFRESH_TOKEN_TTL = '7d';
const MAX_FAILED_LOGIN  = 5;
const LOCK_DURATION_MS  = 15 * 60 * 1000; // 15 minutes

const JWT_ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET  || 'mc-access-secret-change-in-prod';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'mc-refresh-secret-change-in-prod';

// ─── In-Memory "Database" ─────────────────────────────────────
// In production, replace these Maps with a real database (MongoDB, PostgreSQL, etc.)
const usersDB         = new Map(); // username → UserRecord
const refreshTokensDB = new Set(); // valid refresh tokens

/**
 * @typedef {Object} UserRecord
 * @property {string}   id            - UUID
 * @property {string}   username      - Unique username
 * @property {string}   email         - Email address
 * @property {string}   passwordHash  - bcrypt hash
 * @property {string}   role          - 'player' | 'admin'
 * @property {string}   createdAt     - ISO date string
 * @property {number}   failedAttempts
 * @property {number|null} lockedUntil  - Epoch ms, or null
 * @property {number}   highScore
 */

// ─── Validation Helpers ───────────────────────────────────────

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
const EMAIL_REGEX    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^])[A-Za-z\d@$!%*?&#^]{8,64}$/;

function validateRegistrationInput({ username, email, password }) {
  const errors = [];
  if (!USERNAME_REGEX.test(username))
    errors.push('Username must be 3–20 characters (letters, numbers, underscores).');
  if (!EMAIL_REGEX.test(email))
    errors.push('Invalid email address.');
  if (!PASSWORD_REGEX.test(password))
    errors.push(
      'Password must be 8–64 characters and include uppercase, lowercase, a digit, and a special character.'
    );
  return errors;
}

// ─── Token Helpers ────────────────────────────────────────────

function signAccessToken(payload) {
  return jwt.sign(payload, JWT_ACCESS_SECRET, {
    expiresIn : ACCESS_TOKEN_TTL,
    algorithm : 'HS256',
    issuer    : 'math-castle',
  });
}

function signRefreshToken(payload) {
  const token = jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn : REFRESH_TOKEN_TTL,
    algorithm : 'HS256',
    issuer    : 'math-castle',
  });
  refreshTokensDB.add(token);
  return token;
}

function verifyAccessToken(token) {
  return jwt.verify(token, JWT_ACCESS_SECRET, { algorithms: ['HS256'] });
}

function verifyRefreshToken(token) {
  if (!refreshTokensDB.has(token)) throw new Error('Refresh token not recognised.');
  return jwt.verify(token, JWT_REFRESH_SECRET, { algorithms: ['HS256'] });
}

function revokeRefreshToken(token) {
  refreshTokensDB.delete(token);
}

// ─── Core Auth Functions ──────────────────────────────────────

/**
 * Register a new user.
 * Returns { user, accessToken, refreshToken } on success.
 * Throws an Error with a human-readable message on failure.
 */
async function register({ username, email, password }) {
  // 1. Validate input
  const errors = validateRegistrationInput({ username, email, password });
  if (errors.length) throw Object.assign(new Error(errors.join(' ')), { status: 400 });

  // 2. Check for duplicate username
  if (usersDB.has(username.toLowerCase()))
    throw Object.assign(new Error('Username already taken.'), { status: 409 });

  // 3. Check for duplicate email
  const emailExists = [...usersDB.values()].some(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );
  if (emailExists)
    throw Object.assign(new Error('Email already registered.'), { status: 409 });

  // 4. Hash password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // 5. Create user record
  const user = {
    id            : crypto.randomUUID(),
    username,
    email,
    passwordHash,
    role          : 'player',
    createdAt     : new Date().toISOString(),
    failedAttempts: 0,
    lockedUntil   : null,
    highScore     : 0,
  };

  usersDB.set(username.toLowerCase(), user);

  // 6. Issue tokens
  const tokenPayload = { sub: user.id, username: user.username, role: user.role };
  const accessToken  = signAccessToken(tokenPayload);
  const refreshToken = signRefreshToken(tokenPayload);

  // 7. Emit event
  authEmitter.userRegistered(username);

  return {
    user        : sanitiseUser(user),
    accessToken,
    refreshToken,
  };
}

/**
 * Login with username + password.
 * Returns { user, accessToken, refreshToken } on success.
 */
async function login({ username, password, ip = 'unknown' }) {
  const key  = username.toLowerCase();
  const user = usersDB.get(key);

  // Unknown user — same error as wrong password (prevent enumeration)
  if (!user) {
    authEmitter.loginFailed(username, ip);
    throw Object.assign(new Error('Invalid credentials.'), { status: 401 });
  }

  // Account locked?
  if (user.lockedUntil && Date.now() < user.lockedUntil) {
    const waitMin = Math.ceil((user.lockedUntil - Date.now()) / 60000);
    throw Object.assign(
      new Error(`Account locked. Try again in ${waitMin} minute(s).`),
      { status: 423 }
    );
  }

  // Verify password
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    user.failedAttempts += 1;
    if (user.failedAttempts >= MAX_FAILED_LOGIN) {
      user.lockedUntil   = Date.now() + LOCK_DURATION_MS;
      user.failedAttempts = 0;
    }
    authEmitter.loginFailed(username, ip);
    throw Object.assign(new Error('Invalid credentials.'), { status: 401 });
  }

  // Reset lockout counters on success
  user.failedAttempts = 0;
  user.lockedUntil   = null;

  // Issue tokens
  const tokenPayload = { sub: user.id, username: user.username, role: user.role };
  const accessToken  = signAccessToken(tokenPayload);
  const refreshToken = signRefreshToken(tokenPayload);

  authEmitter.userLoggedIn(username, ip);

  return {
    user        : sanitiseUser(user),
    accessToken,
    refreshToken,
  };
}

/**
 * Refresh access token using a valid refresh token.
 */
function refreshAccess(refreshToken) {
  const decoded     = verifyRefreshToken(refreshToken); // throws if invalid
  const newAccess   = signAccessToken({
    sub     : decoded.sub,
    username: decoded.username,
    role    : decoded.role,
  });
  return { accessToken: newAccess };
}

/**
 * Logout – revokes the refresh token.
 */
function logout({ username, refreshToken }) {
  revokeRefreshToken(refreshToken);
  authEmitter.userLoggedOut(username);
}

/**
 * Change a user's password (requires old password verification).
 */
async function changePassword({ username, oldPassword, newPassword }) {
  const user = usersDB.get(username.toLowerCase());
  if (!user) throw Object.assign(new Error('User not found.'), { status: 404 });

  const match = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!match) throw Object.assign(new Error('Old password incorrect.'), { status: 401 });

  const errors = validateRegistrationInput({ username, email: user.email, password: newPassword });
  if (errors.length) throw Object.assign(new Error(errors.join(' ')), { status: 400 });

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  // Invalidate all refresh tokens (force re-login on all devices)
  for (const token of [...refreshTokensDB]) {
    try {
      const decoded = jwt.verify(token, JWT_REFRESH_SECRET, { algorithms: ['HS256'] });
      if (decoded.username === username) refreshTokensDB.delete(token);
    } catch (_) { /* expired / tampered – already invalid */ }
  }

  authEmitter.passwordChanged(username);
}

// ─── Utility ──────────────────────────────────────────────────

/** Strip sensitive fields before sending to the client */
function sanitiseUser(user) {
  const { passwordHash, failedAttempts, lockedUntil, ...safe } = user;
  return safe;
}

/** Get a user's public profile */
function getUser(username) {
  const user = usersDB.get(username.toLowerCase());
  if (!user) throw Object.assign(new Error('User not found.'), { status: 404 });
  return sanitiseUser(user);
}

/** Update high score */
function updateHighScore(username, score) {
  const user = usersDB.get(username.toLowerCase());
  if (!user) throw Object.assign(new Error('User not found.'), { status: 404 });
  if (score > user.highScore) user.highScore = score;
  return sanitiseUser(user);
}

module.exports = {
  register,
  login,
  logout,
  refreshAccess,
  changePassword,
  getUser,
  updateHighScore,
  verifyAccessToken,
};
