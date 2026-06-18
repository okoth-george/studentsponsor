const { validationResult } = require('express-validator');
const adminService = require('../services/admin/adminService');
const bursaryService = require('../services/sponsor/bursaryService');



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

// ── CREATE ADMIN ──────────────────────────────────────────────
// POST /api/admin/admins
const createAdmin = async (req, res) => {
  if (!validate(req, res)) return;
  try {
    const newAdmin = await adminService.createAdmin(req.body);
    res.status(201).json({
      success: true,
      message: 'Admin account created. Recommend they change their password after first login.',
      admin: newAdmin,
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// ── DASHBOARD ─────────────────────────────────────────────────
// GET /api/admin/dashboard
const getDashboardSummary = async (req, res) => {
  try {
    const summary = await adminService.getDashboardSummary();
    res.status(200).json({ success: true, summary });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// ── STUDENTS ──────────────────────────────────────────────────

// GET /api/admin/students?status=pending
const getAllStudents = async (req, res) => {
  try {
    const { status } = req.query;
    const students = await adminService.getAllStudents(status || null);
    res.status(200).json({ success: true, count: students.length, students });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/students/:student_id
const getStudentById = async (req, res) => {
  try {
    const student = await adminService.getStudentById(req.params.student_id);
    res.status(200).json({ success: true, student });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// PATCH /api/admin/students/:student_id/status
const updateStudentStatus = async (req, res) => {
  if (!validate(req, res)) return;
  try {
    const { status, admin_note } = req.body;
    const updated = await adminService.updateStudentStatus(
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

// ── SPONSORS ──────────────────────────────────────────────────

// GET /api/admin/sponsors?status=pending
const getAllSponsors = async (req, res) => {
  try {
    const { status } = req.query;
    const sponsors = await adminService.getAllSponsors(status || null);
    res.status(200).json({ success: true, count: sponsors.length, sponsors });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/sponsors/:sponsor_id
const getSponsorById = async (req, res) => {
  try {
    const sponsor = await adminService.getSponsorById(req.params.sponsor_id);
    res.status(200).json({ success: true, sponsor });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// PATCH /api/admin/sponsors/:sponsor_id/status
const updateSponsorStatus = async (req, res) => {
  if (!validate(req, res)) return;
  try {
    const { status, admin_note } = req.body;
    const updated = await adminService.updateSponsorStatus(
      req.params.sponsor_id,
      status,
      admin_note
    );
    res.status(200).json({
      success: true,
      message: `Sponsor status updated to '${status}'.`,
      sponsor: updated,
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};


// ── BURSARIES ─────────────────────────────────────────────────
 
// GET /api/admin/bursaries?is_active=true
const getAllBursariesForAdmin = async (req, res) => {
  try {
    const { is_active } = req.query;
    const filter = is_active === undefined ? null : is_active === 'true';
    const bursaries = await bursaryService.getAllBursariesForAdmin(filter);
    res.status(200).json({ success: true, count: bursaries.length, bursaries });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};
 
// PATCH /api/admin/bursaries/:bursary_id/deactivate
const adminDeactivateBursary = async (req, res) => {
  try {
    const updated = await bursaryService.adminDeactivateBursary(req.params.bursary_id);
    res.status(200).json({
      success: true,
      message: 'Bursary deactivated by admin.',
      bursary: updated,
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};
 

module.exports = {
  createAdmin,
  getDashboardSummary,
  getAllStudents,
  getStudentById,
  updateStudentStatus,
  getAllSponsors,
  getSponsorById,
  updateSponsorStatus,
  getAllBursariesForAdmin,
  adminDeactivateBursary,

};