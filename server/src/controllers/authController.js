const { validationResult } = require('express-validator');
const authService = require('../services/authService');

/*
  CONTROLLER RESPONSIBILITY — only these three things:
  1. Read data from req (body, query, params, cookies)
  2. Call the service
  3. Send the response

  No business logic. No DB queries. No password hashing.
  All of that lives in authService.js.
*/

// Cookie options for the refresh token
const refreshCookieOptions = {
  httpOnly: true,    // JS cannot read this — XSS safe
  secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
  sameSite: 'strict', // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// ── Validate helper ───────────────────────────────────────────
// Reads express-validator errors and returns early if any exist
const validate = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({
      success: false,
      message: 'Validation failed.',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
    return false;
  }
  return true;
};

// ── REGISTER ─────────────────────────────────────────────────
// POST /api/auth/register
const register = async (req, res) => {
  if (!validate(req, res)) return;
  try {
    const user = await authService.register(req.body);
    res.status(201).json({
      success: true,
      message: 'Account created. Please check your email to verify your account.',
      user,
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// ── VERIFY EMAIL ─────────────────────────────────────────────
// GET /api/auth/verify-email?token=xxx
const verifyEmail = async (req, res) => {
  try {
    await authService.verifyEmail(req.query.token);
    res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now log in.',
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// ── RESEND VERIFICATION ───────────────────────────────────────
// POST /api/auth/resend-verification
const resendVerification = async (req, res) => {
  try {
    await authService.resendVerification(req.body.email);
    res.status(200).json({
      success: true,
      message: 'If this email exists and is unverified, a new link has been sent.',
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// ── LOGIN ─────────────────────────────────────────────────────
// POST /api/auth/login
const login = async (req, res) => {
  if (!validate(req, res)) return;
  try {
    const { email, password } = req.body;
    const { accessToken, refreshToken, user, studentProfile } =
      await authService.login(email, password);

    // Refresh token goes in httpOnly cookie — never in response body
    res.cookie('refreshToken', refreshToken, refreshCookieOptions);

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      accessToken,
      user,
      studentProfile,
    });
  } catch (err) {
    res.status(err.status || 500).json({
      success: false,
      message: err.message,
      ...(err.code && { code: err.code }),
    });
  }
};

// ── REFRESH TOKEN ─────────────────────────────────────────────
// POST /api/auth/refresh
const refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    const accessToken = await authService.refresh(token);
    res.status(200).json({ success: true, accessToken });
  } catch (err) {
    res.clearCookie('refreshToken');
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// ── LOGOUT ────────────────────────────────────────────────────
// POST /api/auth/logout
const logout = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    await authService.logout(token);
    res.clearCookie('refreshToken', refreshCookieOptions);
    res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// ── FORGOT PASSWORD ───────────────────────────────────────────
// POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    await authService.forgotPassword(req.body.email);
    res.status(200).json({
      success: true,
      message: 'If this email is registered, a reset link has been sent.',
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// ── RESET PASSWORD ────────────────────────────────────────────
// POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  if (!validate(req, res)) return;
  try {
    const { token, new_password } = req.body;
    await authService.resetPassword(token, new_password);
    res.status(200).json({
      success: true,
      message: 'Password reset successfully. Please log in with your new password.',
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// ── GET PROFILE ───────────────────────────────────────────────
// GET /api/auth/profile  (protected)
const getProfile = async (req, res) => {
  try {
    const user = await authService.getProfile(req.user.user_id);
    res.status(200).json({ success: true, user });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// ── CHANGE PASSWORD ───────────────────────────────────────────
// PATCH /api/auth/change-password  (protected)
const changePassword = async (req, res) => {
  if (!validate(req, res)) return;
  try {
    const { current_password, new_password } = req.body;
    await authService.changePassword(req.user.user_id, current_password, new_password);
    res.clearCookie('refreshToken', refreshCookieOptions);
    res.status(200).json({
      success: true,
      message: 'Password changed. Please log in again.',
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

module.exports = {
  register,
  verifyEmail,
  resendVerification,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  getProfile,
  changePassword,
};