const { body } = require('express-validator');

/*
  APPLICATION VALIDATOR
  ──────────────────────
  Kept separate from all other validator files.
  No shared helpers needed from validator.js here —
  applications have no password fields.
*/

/**
 * Validates student application submission.
 * bursary_id is required — identifies which bursary to apply to.
 * motivation_letter is optional but capped at 3000 characters.
 */
const validateApplyToBursary = [
  body('bursary_id')
    .notEmpty().withMessage('Bursary ID is required.')
    .isInt({ min: 1 }).withMessage('Bursary ID must be a valid integer.'),

  body('motivation_letter')
    .optional()
    .trim()
    .isLength({ max: 3000 })
    .withMessage('Motivation letter must not exceed 3000 characters.'),
];

/**
 * Validates status update on an application.
 * Used by both sponsor routes and admin routes.
 * rejection_reason mandatory on rejection is enforced
 * in the service layer — validators cannot cross-reference
 * field values cleanly.
 */
const validateUpdateApplicationStatus = [
  body('status')
    .notEmpty().withMessage('Status is required.')
    .isIn(['pending', 'under_review', 'approved', 'rejected', 'funded'])
    .withMessage(
      "Status must be one of: pending, under_review, approved, rejected, funded."
    ),

  body('rejection_reason')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Rejection reason must not exceed 1000 characters.'),
];

module.exports = {
  validateApplyToBursary,
  validateUpdateApplicationStatus,
};