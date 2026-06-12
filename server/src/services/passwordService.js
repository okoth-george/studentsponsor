const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');
const { sendPasswordResetEmail } = require('../config/email');
const { generateSecureToken, fail } = require('./utils/authUtils');

// ── FORGOT PASSWORD ───────────────────────────────────────────
const forgotPassword = async (email) => {
  const user = await userRepository.findByEmail(email.toLowerCase());

  // Silently succeed — prevents email enumeration
  if (!user) return;

  const resetToken = generateSecureToken();
  const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await userRepository.invalidatePreviousResets(user.user_id);
  await userRepository.savePasswordReset(user.user_id, resetToken, resetExpires);
  await sendPasswordResetEmail(user.email, user.full_name, resetToken);
};

// ── RESET PASSWORD ────────────────────────────────────────────
const resetPassword = async (token, newPassword) => {
  const reset = await userRepository.findPasswordReset(token);
  if (!reset) throw fail('Invalid or expired reset link. Please request a new one.', 400);

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await userRepository.updatePassword(reset.user_id, hashedPassword);
  await userRepository.markResetTokenUsed(token);

  // Business rule: reset password invalidates all sessions everywhere
  await userRepository.deleteAllRefreshTokens(reset.user_id);
};

// ── CHANGE PASSWORD ───────────────────────────────────────────
const changePassword = async (user_id, currentPassword, newPassword) => {
  const user = await userRepository.findByEmail(
    (await userRepository.findById(user_id)).email
  );

  const match = await bcrypt.compare(currentPassword, user.password);
  if (!match) throw fail('Current password is incorrect.', 401);

  const newHash = await bcrypt.hash(newPassword, 12);
  await userRepository.updatePassword(user_id, newHash);

  // Business rule: changing password logs out all other devices
  await userRepository.deleteAllRefreshTokens(user_id);
};

module.exports = {
  forgotPassword,
  resetPassword,
  changePassword,
};