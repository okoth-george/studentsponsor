const express = require('express');
const router  = express.Router();

const {
  getDashboardSummary,
  getAllStudents,
  getStudentById,
  updateStudentStatus,
  getAllSponsors,
  getSponsorById,
  updateSponsorStatus,
} = require('../controllers/adminController');

const { authenticate, authorize } = require('../middleware/auth');

const { validateUpdateSponsorStatus } = require('../middleware/sponsorValidator');


const { validateUpdateStudentStatus } = require('../middleware/studentValidator');

/*
  ADMIN ROUTES
  ────────────
  Every route requires:
  1. authenticate        — valid JWT access token
  2. authorize('admin')  — role must be admin

  Admin has no profile of its own — these routes operate
  directly on students and sponsors created by other roles.
  Applied once via router.use() rather than repeating on
  every route below.
*/

router.use(authenticate, authorize('admin'));

// ── DASHBOARD ─────────────────────────────────────────────────
// GET /api/admin/dashboard → counts: total/pending students & sponsors
router.get('/dashboard', getDashboardSummary);

// ── STUDENTS ──────────────────────────────────────────────────
// GET   /api/admin/students                    → list all (optional ?status=pending)
// GET   /api/admin/students/:student_id        → view one student
// PATCH /api/admin/students/:student_id/status → verify or reject
router.get('/students', getAllStudents);
router.get('/students/:student_id', getStudentById);
router.patch(
  '/students/:student_id/status',
  validateUpdateStudentStatus,
  updateStudentStatus
);

// ── SPONSORS ──────────────────────────────────────────────────
// GET   /api/admin/sponsors                    → list all (optional ?status=pending)
// GET   /api/admin/sponsors/:sponsor_id        → view one sponsor
// PATCH /api/admin/sponsors/:sponsor_id/status → approve or reject
router.get('/sponsors', getAllSponsors);
router.get('/sponsors/:sponsor_id', getSponsorById);
router.patch(
  '/sponsors/:sponsor_id/status',
  validateUpdateSponsorStatus,
  updateSponsorStatus
);

module.exports = router;