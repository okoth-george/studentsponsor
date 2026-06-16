const { validationResult } = require('express-validator');
const studentService = require('../services/student/studentService');



// ── Validate helper ───────────────────────────────────────────
const validate = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({
      success: false,
      message: 'Validation failed.',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
    return false;
  }
  return true;
};

// ── GET OWN PROFILE ───────────────────────────────────────────
// GET /api/students/profile
// Student: view own full profile + school info
const getMyProfile = async (req, res) => {
  try {
    const profile = await studentService.getStudentProfile(req.user.user_id);
    res.status(200).json({ success: true, profile });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// ── UPDATE OWN PROFILE ────────────────────────────────────────
// PATCH /api/students/profile
// Student: fill in or edit profile fields
const updateMyProfile = async (req, res) => {
  if (!validate(req, res)) return;
  try {
    const updated = await studentService.updateStudentProfile(req.user.user_id, req.body);
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      profile: updated,
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// ── UPLOAD DOCUMENT ───────────────────────────────────────────
// POST /api/students/document
// Student: upload fee statement
// Expects multer middleware to have run first and set req.file
const uploadDocument = async (req, res) => {
  try {
    // req.file is set by multer middleware on the route
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please attach a PDF or image.',
      });
    }

    // In MVP: store the file path/URL as a string
    // In production: this would be the S3/Cloudinary URL returned after upload
    const doc_url = req.file.path;

    const updated = await studentService.updateStudentDocument(req.user.user_id, doc_url);
    res.status(200).json({
      success: true,
      message: 'Document uploaded successfully.',
      doc_url: updated.doc_url,
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// ── ADMIN: GET ALL STUDENTS ───────────────────────────────────
// GET /api/students?status=pending
// Admin: list all students, optional status filter
const getAllStudents = async (req, res) => {
  try {
    const { status } = req.query;
    const students = await studentService.getAllStudents(status || null);
    res.status(200).json({
      success: true,
      count: students.length,
      students,
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// ── ADMIN: GET STUDENT BY ID ──────────────────────────────────
// GET /api/students/:student_id
// Admin: view any student's full profile
const getStudentById = async (req, res) => {
  try {
    const student = await studentService.getStudentById(req.params.student_id);
    res.status(200).json({ success: true, student });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// ── ADMIN: UPDATE STUDENT STATUS ──────────────────────────────
// PATCH /api/students/:student_id/status
// Admin: verify or reject a student profile
const updateStudentStatus = async (req, res) => {
  if (!validate(req, res)) return;
  try {
    const { status, admin_note } = req.body;
    const updated = await studentService.updateStudentStatus(
      req.params.student_id,
      status,
      admin_note
    );
    res.status(200).json({
      success: true,
      message: `Student status updated to '${status}'.`,
      student: updated,
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  uploadDocument,
  getAllStudents,
  getStudentById,
  updateStudentStatus,
};