const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const userRepo = require('../repositories/userRepo');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../config/email');
require('dotenv').config();

/*
  SERVICE LAYER RULES
  ────────────────────
  - No pool.query here — use userRepo instead
  - No req/res here — that belongs in the controller
  - This is where business rules live:
      "a user can only register as student or sponsor"
      "lock account after 5 failed attempts"
      "refresh token must exist in DB to be valid"
*/

// ── TOKEN HELPERS ─────────────────────────────────────────────

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

// Strip sensitive fields before sending user to frontend
const sanitizeUser = (user) => {
  const {
    password, email_verify_token, email_verify_expires,
    login_attempts, lock_until, ...safe
  } = user;
  return safe;
};

// Throw a clean error with an HTTP status attached
const fail = (message, status) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

// ── REGISTER ─────────────────────────────────────────────────
const register = async ({ full_name, email, password, role, phone }) => {
  // Business rule: only student and sponsor can self-register
  if (!['student', 'sponsor'].includes(role)) {
    throw fail('Role must be student or sponsor.', 400);
  }

  // Business rule: email must be unique
  const existing = await userRepo.findByEmail(email.toLowerCase());
  if (existing) throw fail('An account with this email already exists.', 409);

  const hashedPassword = await bcrypt.hash(password, 12);
  const verifyToken = generateSecureToken();
  const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const user = await userRepo.create({
    full_name,
    email: email.toLowerCase(),
    password: hashedPassword,
    role,
    phone,
    verifyToken,
    verifyExpires,
  });

  // Business rule: students always get an empty profile row on register
  if (role === 'student') {
    await userRepo.createStudentProfile(user.user_id);
  }

  // Email failure does not block registration
  try {
    await sendVerificationEmail(user.email, user.full_name, verifyToken);
  } catch (mailErr) {
    console.error('Verification email failed:', mailErr.message);
  }

  return sanitizeUser(user);
};

// ── VERIFY EMAIL ─────────────────────────────────────────────
const verifyEmail = async (token) => {
  if (!token) throw fail('Token is required.', 400);

  const user = await userRepo.findByVerifyToken(token);
  if (!user) throw fail('Invalid or expired verification link. Please request a new one.', 400);

  await userRepo.markEmailVerified(user.user_id);
};

// ── RESEND VERIFICATION ───────────────────────────────────────
const resendVerification = async (email) => {
  const user = await userRepo.findByEmail(email.toLowerCase());

  // Silently succeed — prevents email enumeration
  if (!user || user.is_email_verified) return;

  const verifyToken = generateSecureToken();
  const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await userRepo.setVerifyToken(user.user_id, verifyToken, verifyExpires);
  await sendVerificationEmail(user.email, user.full_name, verifyToken);
};

// ── LOGIN ─────────────────────────────────────────────────────
const login = async (email, password) => {
  const MAX_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
  const LOCK_MINUTES = parseInt(process.env.LOCK_TIME_MINUTES) || 15;

  const user = await userRepo.findByEmail(email.toLowerCase());

  // Run bcrypt even when user not found — prevents timing attacks
  const dummyHash = '$2a$12$dummy.hash.to.prevent.timing.attacks.xxxxxxxxxx';
  if (!user) {
    await bcrypt.compare(password, dummyHash);
    throw fail('Invalid email or password.', 401);
  }

  // Business rule: deactivated accounts cannot log in
  if (!user.is_active) {
    throw fail('Your account has been deactivated. Contact support.', 403);
  }

  // Business rule: locked accounts must wait
  if (user.lock_until && new Date(user.lock_until) > new Date()) {
    const minutesLeft = Math.ceil((new Date(user.lock_until) - new Date()) / 60000);
    throw fail(`Account locked. Try again in ${minutesLeft} minute(s).`, 423);
  }

  const passwordMatch = await bcrypt.compare(password, user.password);

  if (!passwordMatch) {
    const newAttempts = user.login_attempts + 1;
    const shouldLock = newAttempts >= MAX_ATTEMPTS;
    const lockUntil = shouldLock
      ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000)
      : null;

    await userRepo.incrementLoginAttempts(user.user_id, newAttempts, lockUntil);

    const message = shouldLock
      ? `Too many failed attempts. Account locked for ${LOCK_MINUTES} minutes.`
      : `Invalid email or password. ${MAX_ATTEMPTS - newAttempts} attempt(s) remaining.`;

    throw fail(message, shouldLock ? 423 : 401);
  }

  // Business rule: email must be verified before login
  if (!user.is_email_verified) {
    const err = fail('Please verify your email before logging in.', 403);
    err.code = 'EMAIL_NOT_VERIFIED';
    throw err;
  }

  // All checks passed — reset lockout and issue tokens
  await userRepo.resetLoginAttempts(user.user_id);

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await userRepo.saveRefreshToken(user.user_id, refreshToken, refreshExpires);

  const studentProfile = user.role === 'student'
    ? await userRepo.findStudentSummary(user.user_id)
    : null;

  return { accessToken, refreshToken, user: sanitizeUser(user), studentProfile };
};

// ── REFRESH TOKEN ─────────────────────────────────────────────
const refresh = async (token) => {
  if (!token) throw fail('No refresh token provided.', 401);

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
  } catch {
    throw fail('Invalid refresh token. Please log in again.', 401);
  }

  // Business rule: token must exist in DB (not revoked via logout)
  const stored = await userRepo.findRefreshToken(token);
  if (!stored) throw fail('Refresh token expired or revoked. Please log in again.', 401);

  const user = await userRepo.findById(decoded.user_id);
  if (!user || !user.is_active) throw fail('User not found.', 401);

  return generateAccessToken(user);
};

// ── LOGOUT ────────────────────────────────────────────────────
const logout = async (token) => {
  if (token) await userRepo.deleteRefreshToken(token);
};

// ── FORGOT PASSWORD ───────────────────────────────────────────
const forgotPassword = async (email) => {
  const user = await userRepo.findByEmail(email.toLowerCase());

  // Silently succeed — prevents email enumeration
  if (!user) return;

  const resetToken = generateSecureToken();
  const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await userRepo.invalidatePreviousResets(user.user_id);
  await userRepo.savePasswordReset(user.user_id, resetToken, resetExpires);
  await sendPasswordResetEmail(user.email, user.full_name, resetToken);
};

// ── RESET PASSWORD ────────────────────────────────────────────
const resetPassword = async (token, newPassword) => {
  const reset = await userRepo.findPasswordReset(token);
  if (!reset) throw fail('Invalid or expired reset link. Please request a new one.', 400);

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await userRepo.updatePassword(reset.user_id, hashedPassword);
  await userRepo.markResetTokenUsed(token);

  // Business rule: reset password invalidates all sessions everywhere
  await userRepo.deleteAllRefreshTokens(reset.user_id);
};

// ── GET PROFILE ───────────────────────────────────────────────
const getProfile = async (user_id) => {
  const user = await userRepo.findById(user_id);
  if (!user) throw fail('User not found.', 404);

  if (user.role === 'student') {
    user.studentProfile = await userRepo.findStudentByUserId(user_id);
  }

  return user;
};

// ── CHANGE PASSWORD ───────────────────────────────────────────
const changePassword = async (user_id, currentPassword, newPassword) => {
  const user = await userRepo.findByEmail(
    (await userRepo.findById(user_id)).email
  );

  const match = await bcrypt.compare(currentPassword, user.password);
  if (!match) throw fail('Current password is incorrect.', 401);

  const newHash = await bcrypt.hash(newPassword, 12);
  await userRepo.updatePassword(user_id, newHash);

  // Business rule: changing password logs out all other devices
  await userRepo.deleteAllRefreshTokens(user_id);
};

module.exports = {
  register,
  verifyEmail,
  resendVerification,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  getProfile,
  changePassword,
};