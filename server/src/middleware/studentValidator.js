const { body } = require('express-validator');

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
  validateUpdateStudentProfile,
  validateUpdateStudentStatus,
};