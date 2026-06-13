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

// ── STUDENT VALIDATORS ────────────────────────────────────────

/**
 * Validates the student profile update form.
 * All fields are optional — student may fill in sections gradually.
 * But if a field is present, it must be valid.
 */
const validateUpdateStudentProfile = [
  body('school_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('school_id must be a valid integer.'),

  body('admission_no')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Admission number must be 2-50 characters.'),

  body('course')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Course name must be 2-200 characters.'),

  body('year_of_study')
    .optional()
    .isInt({ min: 1, max: 8 })
    .withMessage('Year of study must be between 1 and 8.'),

  body('fee_balance')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Fee balance must be a positive number.'),

  body('story')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Personal statement must not exceed 2000 characters.'),

  body('photo_url')
    .optional()
    .trim()
    .isURL()
    .withMessage('Photo URL must be a valid URL.'),
];

/**
 * Validates admin status update on a student.
 * status is required. admin_note is required only when rejecting
 * (enforced in service layer since validators can't cross-reference fields easily).
 */
const validateUpdateStudentStatus = [
  body('status')
    .notEmpty().withMessage('Status is required.')
    .isIn(['pending', 'verified', 'rejected'])
    .withMessage("Status must be 'pending', 'verified', or 'rejected'."),

  body('admin_note')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Admin note must not exceed 500 characters.'),
];

module.exports = {
  // Auth
  validateRegister,
  validateLogin,
  validateResetPassword,
  validateChangePassword,

  // Student
  validateUpdateStudentProfile,
  validateUpdateStudentStatus,
};