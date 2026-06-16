const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');
const studentRepository = require('../repositories/studentRepository'); 
const sponsorRepository = require('../repositories/sponsorRepository');
require('dotenv').config();

const {
  generateAccessToken,
  generateRefreshToken,
  sanitizeUser,
  fail
} = require('./utils/authUtils');

// ── LOGIN ─────────────────────────────────────────────────────
const login = async (email, password) => {
  const MAX_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
  const LOCK_MINUTES = parseInt(process.env.LOCK_TIME_MINUTES) || 15;

  const user = await userRepository.findByEmail(email.toLowerCase());

  const dummyHash = '$2a$12$dummy.hash.to.prevent.timing.attacks.xxxxxxxxxx';
  if (!user) {
    await bcrypt.compare(password, dummyHash);
    throw fail('Invalid email or password.', 401);
  }

  if (!user.is_active) {
    throw fail('Your account has been deactivated. Contact support.', 403);
  }

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

    await userRepository.incrementLoginAttempts(user.user_id, newAttempts, lockUntil);

    const message = shouldLock
      ? `Too many failed attempts. Account locked for ${LOCK_MINUTES} minutes.`
      : `Invalid email or password. ${MAX_ATTEMPTS - newAttempts} attempt(s) remaining.`;

    throw fail(message, shouldLock ? 423 : 401);
  }

  if (!user.is_email_verified) {
    const err = fail('Please verify your email before logging in.', 403);
    err.code = 'EMAIL_NOT_VERIFIED';
    throw err;
  }

  await userRepository.resetLoginAttempts(user.user_id);

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await userRepository.saveRefreshToken(user.user_id, refreshToken, refreshExpires);

  const studentProfile = user.role === 'student'
    ? await studentRepository.findStudentSummary(user.user_id)
    : null;

  const sponsorProfile = user.role === 'sponsor'
    ? await sponsorRepository.findSponsorSummary(user.user_id)
    : null;

  return { accessToken, refreshToken, user: sanitizeUser(user), studentProfile, sponsorProfile };
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

  const stored = await userRepository.findRefreshToken(token);
  if (!stored) throw fail('Refresh token expired or revoked. Please log in again.', 401);

  const user = await userRepository.findById(decoded.user_id);
  if (!user || !user.is_active) throw fail('User not found.', 401);

  return generateAccessToken(user);
};

// ── LOGOUT ────────────────────────────────────────────────────
const logout = async (token) => {
  if (token) await userRepository.deleteRefreshToken(token);
};

module.exports = {
  login,
  refresh,
  logout,
};