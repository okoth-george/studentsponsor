const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');
const studentRepository = require('../repositories/studentRepository');
const { sendVerificationEmail } = require('../config/email');
const { generateSecureToken, sanitizeUser, fail } = require('./utils/authUtils');

// ── REGISTER ─────────────────────────────────────────────────
const register = async ({ full_name, email, password, role, phone }) => {
  // Business rule: only student and sponsor can self-register
  if (!['student', 'sponsor'].includes(role)) {
    throw fail('Role must be student or sponsor.', 400);
  }

  // Business rule: email must be unique
  const existing = await userRepository.findByEmail(email.toLowerCase());
  if (existing) throw fail('An account with this email already exists.', 409);

  const hashedPassword = await bcrypt.hash(password, 12);
  const verifyToken = generateSecureToken();
  const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const user = await userRepository.create({
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
    await studentRepository.createStudentProfile(user.user_id);
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

  const user = await userRepository.findByVerifyToken(token);
  if (!user) {
    throw fail('Invalid or expired verification link. Please request a new one.', 400);
  }

  await userRepository.markEmailVerified(user.user_id);
};

// ── RESEND VERIFICATION ───────────────────────────────────────
const resendVerification = async (email) => {
  const user = await userRepository.findByEmail(email.toLowerCase());

  // Silently succeed — prevents email enumeration
  if (!user || user.is_email_verified) return;

  const verifyToken = generateSecureToken();
  const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await userRepository.setVerifyToken(user.user_id, verifyToken, verifyExpires);
  await sendVerificationEmail(user.email, user.full_name, verifyToken);
};

module.exports = {
  register,
  verifyEmail,
  resendVerification,
};