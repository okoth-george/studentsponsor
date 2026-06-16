const express = require('express');
const router  = express.Router();

const {
  getMyProfile,
  updateMyProfile,
  getMyStats,
} = require('../controllers/sponsorController');

const { authenticate, authorize } = require('../middleware/auth');
const {
  validateUpdateSponsorProfile,
} = require('../middleware/validators');


router.get(
  '/profile',
  authenticate,
  authorize('sponsor'),
  getMyProfile
);

router.patch(
  '/profile',
  authenticate,
  authorize('sponsor'),
  validateUpdateSponsorProfile,
  updateMyProfile
);

router.get(
  '/stats',
  authenticate,
  authorize('sponsor'),
  getMyStats
);

module.exports = router;