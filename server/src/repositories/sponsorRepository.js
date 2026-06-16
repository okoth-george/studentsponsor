const pool = require('../config/db');

const createSponsorProfile = async (user_id, { organization_name, organization_type }) => {
  const result = await pool.query(
    `INSERT INTO sponsors (user_id, organization_name, organization_type)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [user_id, organization_name, organization_type]
  );
  return result.rows[0];
};

// ── FIND ──────────────────────────────────────────────────────

/**
 * Full sponsor record joined with user info.
 * Used by the sponsor viewing their own profile.
 */
const findSponsorByUserId = async (user_id) => {
  const result = await pool.query(
    `SELECT
       sp.*,
       u.full_name,
       u.email,
       u.phone,
       u.is_email_verified,
       u.is_active
     FROM sponsors sp
     JOIN users u ON sp.user_id = u.user_id
     WHERE sp.user_id = $1`,
    [user_id]
  );
  return result.rows[0] || null;
};

/**
 * Lookup by sponsor_id (not user_id).
 * Used when bursaries or payment records reference a sponsor.
 */
const findSponsorById = async (sponsor_id) => {
  const result = await pool.query(
    `SELECT
       sp.*,
       u.full_name,
       u.email,
       u.phone,
       u.is_active
     FROM sponsors sp
     JOIN users u ON sp.user_id = u.user_id
     WHERE sp.sponsor_id = $1`,
    [sponsor_id]
  );
  return result.rows[0] || null;
};


const findSponsorSummary = async (user_id) => {
  const result = await pool.query(
    `SELECT sponsor_id, organization_name, organization_type, status
     FROM sponsors
     WHERE user_id = $1`,
    [user_id]
  );
  return result.rows[0] || null;
};

/**
 * Admin: list all sponsors, optionally filtered by status.
 * Returns newest first.
 */
const findAllSponsors = async (status = null) => {
  const result = await pool.query(
    `SELECT
       sp.sponsor_id,
       sp.organization_name,
       sp.organization_type,
       sp.website,
       sp.status,
       sp.admin_note,
       sp.created_at,
       u.full_name,
       u.email,
       u.phone,
       u.is_email_verified
     FROM sponsors sp
     JOIN users u ON sp.user_id = u.user_id
     WHERE ($1::text IS NULL OR sp.status = $1)
     ORDER BY sp.created_at DESC`,
    [status]
  );
  return result.rows;
};

// ── UPDATE ────────────────────────────────────────────────────

const updateSponsorProfile = async (user_id, {
  organization_name,
  organization_type,
  website,
  description,
}) => {
  const result = await pool.query(
    `UPDATE sponsors SET
       organization_name = $1,
       organization_type = $2,
       website           = $3,
       description       = $4,
       updated_at        = NOW()
     WHERE user_id = $5
     RETURNING *`,
    [
      organization_name,
      organization_type,
      website     || null,
      description || null,
      user_id,
    ]
  );
  return result.rows[0] || null;
};


const updateSponsorStatus = async (sponsor_id, status, admin_note = null) => {
  const result = await pool.query(
    `UPDATE sponsors SET
       status     = $1,
       admin_note = $2,
       updated_at = NOW()
     WHERE sponsor_id = $3
     RETURNING sponsor_id, organization_name, status, admin_note, updated_at`,
    [status, admin_note, sponsor_id]
  );
  return result.rows[0] || null;
};

// ── BURSARY STATS ─────────────────────────────────────────────


const findSponsorStats = async (sponsor_id) => {
  const result = await pool.query(
    `SELECT
       COUNT(DISTINCT b.bursary_id)                          AS total_bursaries,
       COUNT(DISTINCT b.bursary_id)
         FILTER (WHERE b.is_active = true AND b.deadline >= CURRENT_DATE)
                                                             AS active_bursaries,
       COALESCE(SUM(pr.amount) FILTER (WHERE pr.school_confirmed = true), 0)
                                                             AS total_funded,
       COUNT(DISTINCT pr.student_id)
         FILTER (WHERE pr.school_confirmed = true)           AS students_funded
     FROM sponsors sp
     LEFT JOIN bursaries     b  ON b.sponsor_id  = sp.sponsor_id
     LEFT JOIN payment_records pr ON pr.sponsor_id = sp.sponsor_id
     WHERE sp.sponsor_id = $1`,
    [sponsor_id]
  );
  return result.rows[0] || null;
};

// ─────────────────────────────────────────────────────────────

module.exports = {
  // Create
  createSponsorProfile,

  // Find
  findSponsorByUserId,
  findSponsorById,
  findSponsorSummary,
  findAllSponsors,

  // Update
  updateSponsorProfile,
  updateSponsorStatus,

  // Stats
  findSponsorStats,
};