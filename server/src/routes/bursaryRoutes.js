const express = require('express');
const router  = express.Router();

const {
  getActiveBursaries,
  getBursaryById,
  createBursary,
  getMyBursaries,
  updateBursary,
  closeBursary,
  reopenBursary,
} = require('../controllers/bursaryController');

const { authenticate, authorize } = require('../middleware/auth');
const {
  validateCreateBursary,
  validateUpdateBursary,
} = require('../middleware/bursaryValidator');

/*
  BURSARY ROUTES
  ──────────────
  Mounted at /api/bursaries in app.js.

  Public routes  → no auth required, browsing is open to everyone
  Sponsor routes → require authenticate + authorize('sponsor')

  Admin actions on bursaries (list all, force-deactivate)
  live in adminRoutes.js under /api/admin/bursaries — not here.

  Route order matters: '/mine' must be declared BEFORE '/:bursary_id'
  or Express will try to match "mine" as a bursary_id parameter.
*/

// ── SPONSOR: OWN BURSARIES ────────────────────────────────────
// Declared first so '/mine' is not swallowed by '/:bursary_id'

router.get(
  '/mine',
  authenticate,
  authorize('sponsor'),
  getMyBursaries
);

router.post(
  '/',
  authenticate,
  authorize('sponsor'),
  validateCreateBursary,
  createBursary
);

router.patch(
  '/:bursary_id',
  authenticate,
  authorize('sponsor'),
  validateUpdateBursary,
  updateBursary
);

router.patch(
  '/:bursary_id/close',
  authenticate,
  authorize('sponsor'),
  closeBursary
);

router.patch(
  '/:bursary_id/reopen',
  authenticate,
  authorize('sponsor'),
  reopenBursary
);

// ── PUBLIC ─────────────────────────────────────────────────────
// Declared after '/mine' and the sponsor PATCH routes above,
// but '/:bursary_id' as a GET is still fine since GET '/mine'
// was already matched by its own explicit route above.

router.get('/', getActiveBursaries);
router.get('/:bursary_id', getBursaryById);

module.exports = router;