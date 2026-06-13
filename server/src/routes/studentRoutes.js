const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const {
  getMyProfile,
  updateMyProfile,
  uploadDocument,
  getAllStudents,
  getStudentById,
  updateStudentStatus,
} = require('../controllers/studentController');

const { authenticate, authorize } = require('../middleware/auth');
const {
  validateUpdateStudentProfile,
  validateUpdateStudentStatus,
} = require('../middleware/validators');

/*
  MULTER CONFIG — MVP local file storage
  ───────────────────────────────────────
  Files saved to /uploads/documents/ on the server.
  In production: swap multer disk storage for S3/Cloudinary.
  Only PDF and images accepted. Max 5MB.
*/
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/documents/');
  },
  filename: (req, file, cb) => {
    // Filename: userId_timestamp.ext — prevents collisions
    const ext = path.extname(file.originalname);
    cb(null, `student_${req.user.user_id}_${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, JPEG, and PNG files are accepted.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

/*
  ROUTE STRUCTURE
  ───────────────
  Student routes  → require authenticate + role='student'
  Admin routes    → require authenticate + role='admin'

  Middleware order matters:
  authenticate first (who are you?) → authorize next (can you do this?)
*/

// ── STUDENT: OWN PROFILE ──────────────────────────────────────

// GET  /api/students/profile      → view own profile
// PATCH /api/students/profile     → update own profile
// POST /api/students/document     → upload fee statement

router.get(
  '/profile',
  authenticate,
  authorize('student'),
  getMyProfile
);

router.patch(
  '/profile',
  authenticate,
  authorize('student'),
  validateUpdateStudentProfile,
  updateMyProfile
);

router.post(
  '/document',
  authenticate,
  authorize('student'),
  upload.single('document'),
  uploadDocument
);

// ── ADMIN: STUDENT MANAGEMENT ─────────────────────────────────

// GET   /api/students              → list all students (optional ?status=pending)
// GET   /api/students/:student_id  → view one student
// PATCH /api/students/:student_id/status → verify or reject

router.get(
  '/',
  authenticate,
  authorize('admin'),
  getAllStudents
);

router.get(
  '/:student_id',
  authenticate,
  authorize('admin'),
  getStudentById
);

router.patch(
  '/:student_id/status',
  authenticate,
  authorize('admin'),
  validateUpdateStudentStatus,
  updateStudentStatus
);

module.exports = router;