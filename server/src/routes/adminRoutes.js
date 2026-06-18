const express = require('express');
const router  = express.Router();

const {
  createAdmin,
  getDashboardSummary,
  getAllStudents,
  getStudentById,
  updateStudentStatus,
  getAllSponsors,
  getSponsorById,
  updateSponsorStatus,
} = require('../controllers/adminController');

const { authenticate, authorize } = require('../middleware/auth');

const {
  validateCreateAdmin,
} = require('../middleware/adminValidator');

const {validateUpdateSponsorStatus} =require('../middleware/sponsorValidator');
const {validateUpdateStudentStatus} =require('../middleware/studentValidator');


router.use(authenticate, authorize('admin'));

// ── ADMIN MANAGEMENT ──────────────────────────────────────────
router.post('/admins', validateCreateAdmin, createAdmin);

// ── DASHBOARD ─────────────────────────────────────────────────
router.get('/dashboard', getDashboardSummary);

// ── STUDENTS ──────────────────────────────────────────────────
router.get('/students', getAllStudents);
router.get('/students/:student_id', getStudentById);
router.patch(
  '/students/:student_id/status',
  validateUpdateStudentStatus,
  updateStudentStatus
);

// ── SPONSORS ──────────────────────────────────────────────────
router.get('/sponsors', getAllSponsors);
router.get('/sponsors/:sponsor_id', getSponsorById);
router.patch(
  '/sponsors/:sponsor_id/status',
  validateUpdateSponsorStatus,
  updateSponsorStatus
);

module.exports = router;