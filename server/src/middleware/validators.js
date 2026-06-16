const { body } = require('express-validator');

/*
  WHY express-validator?
  ──────────────────────
  Never trust data from the client. Validate everything before
  it touches your database. express-validator lets you define
  rules as middleware that run before your controller.
  If validation fails, the controller reads the errors with
  validationResult(req) and returns 422 immediately.
*/

// ── SHARED RULES ──────────────────────────────────────────────

// Password must be 8+ chars, have uppercase, lowercase, number, special char
const passwordRules = () =>
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters.')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter.')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter.')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number.')
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage('Password must contain at least one special character.');

// ── AUTH VALIDATORS ───────────────────────────────────────────

const validateRegister = [
  body('full_name')
    .trim()
    .notEmpty().withMessage('Full name is required.')
    .isLength({ min: 2, max: 100 }).withMessage('Full name must be 2-100 characters.'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),
  passwordRules(),
  body('role')
    .notEmpty().withMessage('Role is required.')
    .isIn(['student', 'sponsor']).withMessage('Role must be student or sponsor.'),
  body('phone')
    .optional()
    .matches(/^2547\d{8}$/)
    .withMessage('Phone must be in format 2547XXXXXXXX (Kenyan M-Pesa format).'),
];

const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required.'),
];

const validateResetPassword = [
  body('token')
    .notEmpty().withMessage('Reset token is required.'),
  body('new_password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters.')
    .matches(/[A-Z]/).withMessage('Must contain an uppercase letter.')
    .matches(/[a-z]/).withMessage('Must contain a lowercase letter.')
    .matches(/[0-9]/).withMessage('Must contain a number.')
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Must contain a special character.'),
];

const validateChangePassword = [
  body('current_password')
    .notEmpty().withMessage('Current password is required.'),
  body('new_password')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters.')
    .matches(/[A-Z]/).withMessage('Must contain an uppercase letter.')
    .matches(/[a-z]/).withMessage('Must contain a lowercase letter.')
    .matches(/[0-9]/).withMessage('Must contain a number.')
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Must contain a special character.'),
];

module.exports = {
  // Auth
  validateRegister,
  validateLogin,
  validateResetPassword,
  validateChangePassword,

};