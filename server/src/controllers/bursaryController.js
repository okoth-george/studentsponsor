const { validationResult } = require('express-validator');
const bursaryService = require('../services/sponsor/bursaryService');

/*
  BURSARY CONTROLLER
  ──────────────────
  Responsibilities:
  1. Read from req (body, params, query)
  2. Call bursaryService
  3. Send response

  No business logic. No DB calls. No validation rules.
  Mirrors the pattern of studentController.js / sponsorController.js.
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

// ── PUBLIC ────────────────────────────────────────────────────

// GET /api/bursaries
// Public: list all active, open bursaries
const getActiveBursaries = async (req, res) => {
  try {
    const bursaries = await bursaryService.getActiveBursaries();
    res.status(200).json({ success: true, count: bursaries.length, bursaries });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// GET /api/bursaries/:bursary_id
// Public: view one bursary in detail
const getBursaryById = async (req, res) => {
  try {
    const bursary = await bursaryService.getBursaryById(req.params.bursary_id);
    res.status(200).json({ success: true, bursary });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// ── SPONSOR ───────────────────────────────────────────────────

// POST /api/bursaries
// Sponsor: create a new bursary (must be verified)
const createBursary = async (req, res) => {
  if (!validate(req, res)) return;
  try {
    const bursary = await bursaryService.createBursary(req.user.user_id, req.body);
    res.status(201).json({
      success: true,
      message: 'Bursary created successfully.',
      bursary,
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// GET /api/bursaries/mine
// Sponsor: view own bursaries (including inactive/expired)
const getMyBursaries = async (req, res) => {
  try {
    const bursaries = await bursaryService.getMyBursaries(req.user.user_id);
    res.status(200).json({ success: true, count: bursaries.length, bursaries });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// PATCH /api/bursaries/:bursary_id
// Sponsor: edit a bursary they own (locked once applications exist)
const updateBursary = async (req, res) => {
  if (!validate(req, res)) return;
  try {
    const updated = await bursaryService.updateBursary(
      req.user.user_id,
      req.params.bursary_id,
      req.body
    );
    res.status(200).json({
      success: true,
      message: 'Bursary updated successfully.',
      bursary: updated,
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// PATCH /api/bursaries/:bursary_id/close
// Sponsor: close a bursary early
const closeBursary = async (req, res) => {
  try {
    const updated = await bursaryService.closeBursary(req.user.user_id, req.params.bursary_id);
    res.status(200).json({
      success: true,
      message: 'Bursary closed successfully.',
      bursary: updated,
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// PATCH /api/bursaries/:bursary_id/reopen
// Sponsor: reopen a previously closed bursary
const reopenBursary = async (req, res) => {
  try {
    const updated = await bursaryService.reopenBursary(req.user.user_id, req.params.bursary_id);
    res.status(200).json({
      success: true,
      message: 'Bursary reopened successfully.',
      bursary: updated,
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// ── ADMIN ─────────────────────────────────────────────────────

// GET /api/admin/bursaries?is_active=true
// Admin: list all bursaries regardless of sponsor or status
const getAllBursariesForAdmin = async (req, res) => {
  try {
    const { is_active } = req.query;
    // Convert query string "true"/"false" to actual boolean, or null for "all"
    const filter = is_active === undefined ? null : is_active === 'true';
    const bursaries = await bursaryService.getAllBursariesForAdmin(filter);
    res.status(200).json({ success: true, count: bursaries.length, bursaries });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// PATCH /api/admin/bursaries/:bursary_id/deactivate
// Admin: force-deactivate a bursary that violates platform rules
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
  // Public
  getActiveBursaries,
  getBursaryById,

  // Sponsor
  createBursary,
  getMyBursaries,
  updateBursary,
  closeBursary,
  reopenBursary,

  // Admin
  getAllBursariesForAdmin,
  adminDeactivateBursary,
};