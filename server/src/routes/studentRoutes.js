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
} = require('../middleware/studentValidator');

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



module.exports = router;