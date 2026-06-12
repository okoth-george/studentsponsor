const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

// ── TOKEN GENERATION ──────────────────────────────────────────

const generateAccessToken = (user) =>
  jwt.sign(
    { user_id: user.user_id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );

const generateRefreshToken = (user) =>
  jwt.sign(
    { user_id: user.user_id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' }
  );

const generateSecureToken = () => crypto.randomBytes(32).toString('hex');

// ── DATA TRANSFORMATION ───────────────────────────────────────

// Strip sensitive fields before sending user to frontend
const sanitizeUser = (user) => {
  const {
    password, email_verify_token, email_verify_expires,
    login_attempts, lock_until, ...safe
  } = user;
  return safe;
};

// ── ERROR HANDLING HELPERS ────────────────────────────────────

// Throw a clean error with an HTTP status attached
const fail = (message, status) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateSecureToken,
  sanitizeUser,
  fail,
};