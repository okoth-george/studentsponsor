const { validationResult } = require('express-validator');
const adminService = require('../services/adminService');

/*
  ADMIN CONTROLLER
  ────────────────
  Responsibilities:
  1. Read from req (body, params, query)
  2. Call adminService
  3. Send response

  No business logic. No DB calls. No validation rules.
*/

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

module.exports = {
  getDashboardSummary,
  getAllStudents,
  getStudentById,
  updateStudentStatus,
  getAllSponsors,
  getSponsorById,
  updateSponsorStatus,
};