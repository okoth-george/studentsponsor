const { validationResult } = require('express-validator');
const applicationService = require('../services/student/applicationService');

/*
  APPLICATION CONTROLLER
  ───────────────────────
  Responsibilities:
  1. Read from req (body, params, query)
  2. Call applicationService
  3. Send response

  No business logic. No DB calls. No validation rules.
  Function names match exactly what applicationRoutes.js imports.
*/

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

// ── STUDENT ───────────────────────────────────────────────────

// POST /api/applications
const applyForBursary = async (req, res) => {
  if (!validate(req, res)) return;
  try {
    const { bursary_id, motivation_letter } = req.body;
    const application = await applicationService.applyForBursary(
      req.user.user_id,
      bursary_id,
      motivation_letter
    );
    res.status(201).json({
      success: true,
      message: 'Application submitted successfully.',
      application,
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// GET /api/applications/mine
const getMyApplications = async (req, res) => {
  try {
    const applications = await applicationService.getMyApplications(req.user.user_id);
    res.status(200).json({ success: true, count: applications.length, applications });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// PATCH /api/applications/:application_id/withdraw
const withdrawApplication = async (req, res) => {
  try {
    await applicationService.withdrawApplication(
      req.user.user_id,
      req.params.application_id
    );
    res.status(200).json({
      success: true,
      message: 'Application withdrawn successfully.',
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// ── SPONSOR ───────────────────────────────────────────────────

// GET /api/applications/bursary/:bursary_id
const getApplicationsForBursary = async (req, res) => {
  try {
    const applications = await applicationService.getApplicationsForBursary(
      req.user.user_id,
      req.params.bursary_id
    );
    res.status(200).json({ success: true, count: applications.length, applications });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// GET /api/applications/:application_id
const getApplicationById = async (req, res) => {
  try {
    const application = await applicationService.getApplicationById(
      req.params.application_id
    );
    res.status(200).json({ success: true, application });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// PATCH /api/applications/:application_id/status
const updateApplicationStatus = async (req, res) => {
  if (!validate(req, res)) return;
  try {
    const { status, rejection_reason } = req.body;
    const updated = await applicationService.updateApplicationStatus(
      req.params.application_id,
      status,
      req.user.user_id,
      rejection_reason
    );
    res.status(200).json({
      success: true,
      message: `Application status updated to '${status}'.`,
      application: updated,
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

module.exports = {
  // Student
  applyForBursary,
  getMyApplications,
  withdrawApplication,

  // Sponsor & shared
  getApplicationsForBursary,
  getApplicationById,
  updateApplicationStatus,
};