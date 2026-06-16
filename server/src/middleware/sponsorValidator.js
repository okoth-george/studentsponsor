const {body} = require('express-validator');

 //Never trust user input 
const validateRegisterSponsor = [
  body('organization_name')
    .trim()
    .notEmpty().withMessage('Organization name is required.')
    .isLength({ min: 2, max: 200 })
    .withMessage('Organization name must be 2-200 characters.'),
 
  body('organization_type')
    .notEmpty().withMessage('Organization type is required.')
    .isIn(['ngo', 'company', 'individual', 'government', 'religious', 'alumni'])
    .withMessage(
      "Organization type must be one of: ngo, company, individual, government, religious, alumni."
    ),
];
 
/**
 * Validates sponsor profile update.
 * organization_name is required — cannot blank it out.
 * All other fields are optional but typed if present.
 */
const validateUpdateSponsorProfile = [
  body('organization_name')
    .trim()
    .notEmpty().withMessage('Organization name is required.')
    .isLength({ min: 2, max: 200 })
    .withMessage('Organization name must be 2-200 characters.'),
 
  body('organization_type')
    .optional()
    .isIn(['ngo', 'company', 'individual', 'government', 'religious', 'alumni'])
    .withMessage(
      "Organization type must be one of: ngo, company, individual, government, religious, alumni."
    ),
 
  body('website')
    .optional()
    .trim()
    .isURL()
    .withMessage('Website must be a valid URL (e.g. https://yourorg.org).'),
 
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters.'),
];
 
/**
 * Validates admin status update on a sponsor.
 * Same pattern as validateUpdateStudentStatus.
 * admin_note mandatory on rejection enforced in service layer.
 */
const validateUpdateSponsorStatus = [
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

module.exports={
    validateRegisterSponsor,
    validateUpdateSponsorProfile,
    validateUpdateSponsorStatus,
}
 
