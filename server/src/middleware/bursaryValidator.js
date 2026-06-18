const { body } = require('express-validator');

/*
  BURSARY VALIDATORS
  ───────────────────
  Kept separate from validator.js, studentValidator.js, and
  sponsorValidator.js — same pattern as adminValidator.js.
  No shared helpers needed from validator.js here since
  bursaries have no password fields, but the import pattern
  stays consistent: if a shared rule is ever needed,
  it comes from require('./validator').
*/

const VALID_ORG_AMOUNT_MIN = 1;

/**
 * Validates bursary creation payload.
 * title, amount, and deadline are required.
 * description, eligibility_criteria, slots are optional.
 */
const validateCreateBursary = [
  body('title')
    .trim()
    .notEmpty().withMessage('Bursary title is required.')
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be 3-200 characters.'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters.'),

  body('eligibility_criteria')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Eligibility criteria must not exceed 1000 characters.'),

  body('amount')
    .notEmpty().withMessage('Amount is required.')
    .isFloat({ min: VALID_ORG_AMOUNT_MIN })
    .withMessage('Amount must be a positive number.'),

  body('slots')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Slots must be a positive integer, or omitted for unlimited.'),

  body('deadline')
    .notEmpty().withMessage('Deadline is required.')
    .isISO8601().withMessage('Deadline must be a valid date (YYYY-MM-DD).')
    .toDate(),
];

/**
 * Validates bursary update payload.
 * Same shape as create — service layer blocks the update
 * entirely if applications already exist, so validators
 * just confirm the submitted data is well-formed.
 */
const validateUpdateBursary = [
  body('title')
    .trim()
    .notEmpty().withMessage('Bursary title is required.')
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be 3-200 characters.'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters.'),

  body('eligibility_criteria')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Eligibility criteria must not exceed 1000 characters.'),

  body('amount')
    .notEmpty().withMessage('Amount is required.')
    .isFloat({ min: VALID_ORG_AMOUNT_MIN })
    .withMessage('Amount must be a positive number.'),

  body('slots')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Slots must be a positive integer, or omitted for unlimited.'),

  body('deadline')
    .notEmpty().withMessage('Deadline is required.')
    .isISO8601().withMessage('Deadline must be a valid date (YYYY-MM-DD).')
    .toDate(),
];

module.exports = {
  validateCreateBursary,
  validateUpdateBursary,
};