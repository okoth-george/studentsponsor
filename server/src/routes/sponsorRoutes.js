const express = require('express');
const router  = express.Router();

const {
  getsponsorProfile,
  updatesponsorProfile,
  getsponsorStats,
} = require('../controllers/sponsorController');

const { authenticate, authorize } = require('../middleware/auth');
const {
  validateUpdateSponsorProfile,
} = require('../middleware/sponsorValidator');


router.get(
  '/profile',
  authenticate,
  authorize('sponsor'),
  getsponsorProfile
);

router.patch(
  '/profile',
  authenticate,
  authorize('sponsor'),
  validateUpdateSponsorProfile,
  updatesponsorProfile
);

router.get(
  '/stats',
  authenticate,
  authorize('sponsor'),
  getsponsorStats
);

module.exports = router;