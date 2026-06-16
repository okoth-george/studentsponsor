const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');
const studentRepository = require('../repositories/studentRepository');
const sponsorRepository = require('../repositories/sponsorRepository');
const { sendVerificationEmail } = require('../config/email');
const { generateSecureToken, sanitizeUser, fail } = require('./utils/authUtils');

// ── REGISTER ─────────────────────────────────────────────────
const register = async ({ full_name, email, password, role, phone, organization_name, organization_type }) => {
  // Business rule: only student and sponsor can self-register
  if (!['student', 'sponsor'].includes(role)) {
    throw fail('Role must be student or sponsor.', 400);
  }

  // Business rule: sponsors must provide organization details
  if (role === 'sponsor') {
    if (!organization_name?.trim()) {
      throw fail('Organization name is required for sponsor registration.', 400);
    }
    if (!organization_type?.trim()) {
      throw fail('Organization type is required for sponsor registration.', 400);
    }
  }

  // Business rule: email must be unique
  const existing = await userRepository.findByEmail(email.toLowerCase());
  if (existing) throw fail('An account with this email already exists.', 409);

  const hashedPassword = await bcrypt.hash(password, 12);
  const verifyToken   = generateSecureToken();
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

  // Create role-specific profile row immediately on registration.
  // Both student and sponsor rows start blank/pending —
  // profile details are filled in after email verification.
  if (role === 'student') {
    await studentRepository.createStudentProfile(user.user_id);
  }

  if (role === 'sponsor') {
    await sponsorRepository.createSponsorProfile(user.user_id, {
      organization_name: organization_name.trim(),
      organization_type: organization_type.trim(),
    });
  }

  // DEV ONLY: log token to console so you can verify without email setup
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DEV] Email verify token for ${user.email}: ${verifyToken}`);
  }

  // Email failure does not block registration —
  // user can request a resend from the login screen
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

  const verifyToken   = generateSecureToken();
  const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await userRepository.setVerifyToken(user.user_id, verifyToken, verifyExpires);
  await sendVerificationEmail(user.email, user.full_name, verifyToken);
};

module.exports = {
  register,
  verifyEmail,
  resendVerification,
};