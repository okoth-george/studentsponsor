const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
  register, verifyEmail, resendVerification,
  login, refreshToken, logout,
  forgotPassword, resetPassword,
  getProfile, changePassword,
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const {
  validateRegister, validateLogin,
  validateResetPassword, validateChangePassword,
} = require('../middleware/validators');

/*
  RATE LIMITING EXPLAINED:
  ─────────────────────────
  Rate limiting stops brute-force and abuse by capping how many
  requests an IP can make in a time window.

  Login: max 10 attempts per 15 minutes per IP
  Register: max 5 registrations per hour per IP
  Password reset: max 3 requests per hour per IP
*/

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { success: false, message: 'Too many accounts created. Try again in an hour.' },
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { success: false, message: 'Too many reset requests. Try again in an hour.' },
});

// ── PUBLIC ROUTES ─────────────────────────────────────────────
router.post('/register',             registerLimiter,      validateRegister,      register);
router.post('/login',                loginLimiter,         validateLogin,         login);
router.get('/verify-email',                                                        verifyEmail);
router.post('/resend-verification',  passwordResetLimiter,                        resendVerification);
router.post('/forgot-password',      passwordResetLimiter,                        forgotPassword);
router.post('/reset-password',       passwordResetLimiter, validateResetPassword, resetPassword);
router.post('/refresh',                                                            refreshToken);

// ── PROTECTED ROUTES (require valid access token) ─────────────
router.get('/profile',         authenticate, getProfile);
router.patch('/change-password', authenticate, validateChangePassword, changePassword);
router.post('/logout',         authenticate, logout);

module.exports = router;