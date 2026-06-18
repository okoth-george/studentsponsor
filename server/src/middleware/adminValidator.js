const { body } = require('express-validator');
const { passwordRules } = require('./validators');


const validateCreateAdmin = [
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
  body('phone')
    .optional()
    .matches(/^2547\d{8}$/)
    .withMessage('Phone must be in format 2547XXXXXXXX (Kenyan M-Pesa format).'),
];

module.exports = {
  validateCreateAdmin,
};