const express = require('express');
const router  = express.Router();

const {
  applyForBursary,
  getMyApplications,
  getApplicationById,
  getApplicationsForBursary,
  withdrawApplication,
  getAllApplications,
  updateApplicationStatus,
} = require('../controllers/applicationController');

const { authenticate, authorize } = require('../middleware/auth');
const {
  validateApplyToBursary,
  validateUpdateApplicationStatus,
} = require('../middleware/applicationValidator');



// ── STUDENT ───────────────────────────────────────────────────

// GET   /api/applications/mine               → view own applications
// POST  /api/applications                    → submit application
// PATCH /api/applications/:id/withdraw       → withdraw pending application

router.get(
  '/mine',
  authenticate,
  authorize('student'),
  getMyApplications
);

router.post(
  '/',
  authenticate,
  authorize('student'),
  validateApplyToBursary,
  applyForBursary
);

router.patch(
  '/:application_id/withdraw',
  authenticate,
  authorize('student'),
  withdrawApplication
);

// ── SPONSOR ───────────────────────────────────────────────────

// GET   /api/applications/bursary/:bursary_id  → all applications for one bursary
// GET   /api/applications/:application_id      → single application detail
// PATCH /api/applications/:application_id/status → update application status

router.get(
  '/bursary/:bursary_id',
  authenticate,
  authorize('sponsor'),
  getApplicationsForBursary
);

router.get(
  '/:application_id',
  authenticate,
  authorize('sponsor'),
  getApplicationById
);

router.patch(
  '/:application_id/status',
  authenticate,
  authorize('sponsor'),
  validateUpdateApplicationStatus,
  updateApplicationStatus
);

// ── ADMIN ─────────────────────────────────────────────────────

// GET   /api/applications?status=pending       → all applications (optional filter)
// PATCH /api/applications/:id/status           → override any application status

// NOTE: Admin also has application routes in adminRoutes.js
// under /api/admin/applications for a cleaner separation.
// These sponsor routes above reuse the same controller functions
// since the service layer enforces role-specific ownership checks.

module.exports = router;