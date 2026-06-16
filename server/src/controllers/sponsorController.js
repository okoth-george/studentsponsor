const { validationResult } = require('express-validator');
const sponsorService = require('../services/sponsor/sponsorService');


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
// GET /api/sponsors/profile
// Sponsor: view own full profile + organization info
const getsponsorProfile = async (req, res) => {
  try {
    const profile = await sponsorService.getSponsorProfile(req.user.user_id);
    res.status(200).json({ success: true, profile });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// ── UPDATE OWN PROFILE ────────────────────────────────────────
// PATCH /api/sponsors/profile
// Sponsor: update organization details
const updatesponsorProfile = async (req, res) => {
  if (!validate(req, res)) return;
  try {
    const updated = await sponsorService.updateSponsorProfile(req.user.user_id, req.body);
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      profile: updated,
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// ── GET OWN STATS ─────────────────────────────────────────────
// GET /api/sponsors/stats
// Sponsor: view impact dashboard
// Only available after admin approval
const getsponsorStats = async (req, res) => {
  try {
    const stats = await sponsorService.getSponsorStats(req.user.user_id);
    res.status(200).json({ success: true, stats });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getsponsorProfile,
  updatesponsorProfile,
  getsponsorStats,
};