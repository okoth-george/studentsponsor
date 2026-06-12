const pool = require('../config/db');

/*
  REPOSITORY PATTERN
  ──────────────────
  This file is the ONLY place in the entire codebase that
  writes raw SQL for user-related operations.

  Rules:
  - No business logic here — just data in, data out
  - Every function takes plain values and returns plain objects
  - Callers (services) never see pool.query directly
  - If you switch from PostgreSQL to MySQL tomorrow,
    you only change this file — nothing else
*/

// ── FIND ─────────────────────────────────────────────────────

const findByEmail = async (email) => {
  const result = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
};

const findById = async (user_id) => {
  const result = await pool.query(
    `SELECT user_id, full_name, email, role, phone,
            is_active, is_email_verified, created_at
     FROM users WHERE user_id = $1`,
    [user_id]
  );
  return result.rows[0] || null;
};

const findByVerifyToken = async (token) => {
  const result = await pool.query(
    `SELECT user_id FROM users
     WHERE email_verify_token = $1
       AND email_verify_expires > NOW()
       AND is_email_verified = false`,
    [token]
  );
  return result.rows[0] || null;
};

// ── CREATE ────────────────────────────────────────────────────

const create = async ({ full_name, email, password, role, phone, verifyToken, verifyExpires }) => {
  const result = await pool.query(
    `INSERT INTO users
      (full_name, email, password, role, phone, email_verify_token, email_verify_expires)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [full_name, email, password, role, phone || null, verifyToken, verifyExpires]
  );
  return result.rows[0];
};

// ── UPDATE ────────────────────────────────────────────────────

const markEmailVerified = async (user_id) => {
  await pool.query(
    `UPDATE users SET
      is_email_verified = true,
      email_verify_token = NULL,
      email_verify_expires = NULL,
      updated_at = NOW()
     WHERE user_id = $1`,
    [user_id]
  );
};

const setVerifyToken = async (user_id, token, expires) => {
  await pool.query(
    `UPDATE users SET
      email_verify_token = $1,
      email_verify_expires = $2
     WHERE user_id = $3`,
    [token, expires, user_id]
  );
};

const incrementLoginAttempts = async (user_id, attempts, lockUntil) => {
  await pool.query(
    `UPDATE users SET
      login_attempts = $1,
      lock_until = $2,
      updated_at = NOW()
     WHERE user_id = $3`,
    [attempts, lockUntil, user_id]
  );
};

const resetLoginAttempts = async (user_id) => {
  await pool.query(
    `UPDATE users SET
      login_attempts = 0,
      lock_until = NULL,
      updated_at = NOW()
     WHERE user_id = $1`,
    [user_id]
  );
};

const updatePassword = async (user_id, hashedPassword) => {
  await pool.query(
    `UPDATE users SET
      password = $1,
      login_attempts = 0,
      lock_until = NULL,
      updated_at = NOW()
     WHERE user_id = $2`,
    [hashedPassword, user_id]
  );
};

// ── REFRESH TOKENS ────────────────────────────────────────────

const saveRefreshToken = async (user_id, token, expiresAt) => {
  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [user_id, token, expiresAt]
  );
};

const findRefreshToken = async (token) => {
  const result = await pool.query(
    'SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
    [token]
  );
  return result.rows[0] || null;
};

const deleteRefreshToken = async (token) => {
  await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
};

const deleteAllRefreshTokens = async (user_id) => {
  await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [user_id]);
};

// ── PASSWORD RESETS ───────────────────────────────────────────

const savePasswordReset = async (user_id, token, expiresAt) => {
  await pool.query(
    'INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [user_id, token, expiresAt]
  );
};

const findPasswordReset = async (token) => {
  const result = await pool.query(
    `SELECT pr.*, u.email, u.full_name
     FROM password_resets pr
     JOIN users u ON pr.user_id = u.user_id
     WHERE pr.token = $1 AND pr.expires_at > NOW() AND pr.used = false`,
    [token]
  );
  return result.rows[0] || null;
};

const invalidatePreviousResets = async (user_id) => {
  await pool.query(
    'UPDATE password_resets SET used = true WHERE user_id = $1',
    [user_id]
  );
};

const markResetTokenUsed = async (token) => {
  await pool.query(
    'UPDATE password_resets SET used = true WHERE token = $1',
    [token]
  );
};


module.exports = {
  
  // Account Recovery & Validation
  savePasswordReset,
  findPasswordReset,
  invalidatePreviousResets,
  markResetTokenUsed,
  setVerifyToken,
  markEmailVerified,

  // Session & Security Management
  saveRefreshToken,
  findRefreshToken,
  deleteRefreshToken,
  deleteAllRefreshTokens,
  incrementLoginAttempts,
  resetLoginAttempts,

  // Core CRUD
  create,
  findByEmail,
  findById,
  findByVerifyToken,
  updatePassword,
};