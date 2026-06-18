const pool = require('../config/db');

/*
  BURSARY REPOSITORY
  ───────────────────
  The ONLY place in the codebase that writes raw SQL
  for bursary-related operations.

  Rules:
  - No business logic — just data in, data out
  - Every function takes plain values, returns plain objects
  - Services never see pool.query directly
  - Consistent with studentRepository / sponsorRepository pattern
*/

// ── CREATE ────────────────────────────────────────────────────

/**
 * Creates a new bursary. Called only after sponsorService
 * confirms the sponsor is verified (assertSponsorVerified).
 * slots is nullable — null means unlimited applicants.
 */
const createBursary = async (sponsor_id, {
  title,
  description,
  eligibility_criteria,
  amount,
  slots,
  deadline,
}) => {
  const result = await pool.query(
    `INSERT INTO bursaries
       (sponsor_id, title, description, eligibility_criteria, amount, slots, deadline)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      sponsor_id,
      title,
      description           || null,
      eligibility_criteria  || null,
      amount,
      slots                 || null,
      deadline,
    ]
  );
  return result.rows[0];
};

// ── FIND ──────────────────────────────────────────────────────

/**
 * Public listing — active bursaries with deadline not yet passed.
 * Used by students browsing available bursaries.
 * Joins sponsor organization name so the listing is useful
 * without a second lookup.
 * Newest first.
 */
const findActiveBursaries = async () => {
  const result = await pool.query(
    `SELECT
       b.*,
       sp.organization_name,
       sp.organization_type
     FROM bursaries b
     JOIN sponsors sp ON b.sponsor_id = sp.sponsor_id
     WHERE b.is_active = true
       AND b.deadline >= CURRENT_DATE
     ORDER BY b.created_at DESC`
  );
  return result.rows;
};

/**
 * Single bursary detail by ID — public view.
 * Used when a student clicks into a bursary to apply.
 */
const findBursaryById = async (bursary_id) => {
  const result = await pool.query(
    `SELECT
       b.*,
       sp.organization_name,
       sp.organization_type,
       sp.website
     FROM bursaries b
     JOIN sponsors sp ON b.sponsor_id = sp.sponsor_id
     WHERE b.bursary_id = $1`,
    [bursary_id]
  );
  return result.rows[0] || null;
};

/**
 * All bursaries belonging to one sponsor — including inactive
 * and expired ones. Used on the sponsor's own dashboard so they
 * can see their full history, not just what's currently live.
 */
const findBursariesBySponsorId = async (sponsor_id) => {
  const result = await pool.query(
    `SELECT *
     FROM bursaries
     WHERE sponsor_id = $1
     ORDER BY created_at DESC`,
    [sponsor_id]
  );
  return result.rows;
};

/**
 * Admin: list all bursaries regardless of status, sponsor, or deadline.
 * Optional is_active filter (true/false/null for all).
 */
const findAllBursaries = async (is_active = null) => {
  const result = await pool.query(
    `SELECT
       b.*,
       sp.organization_name
     FROM bursaries b
     JOIN sponsors sp ON b.sponsor_id = sp.sponsor_id
     WHERE ($1::boolean IS NULL OR b.is_active = $1)
     ORDER BY b.created_at DESC`,
    [is_active]
  );
  return result.rows;
};

/**
 * Counts how many applications exist for a given bursary.
 * Used by bursaryService to decide whether editing is still allowed —
 * once an application exists, the bursary's terms are locked.
 */
const countApplicationsForBursary = async (bursary_id) => {
  const result = await pool.query(
    `SELECT COUNT(*) AS count
     FROM applications
     WHERE bursary_id = $1`,
    [bursary_id]
  );
  return parseInt(result.rows[0].count, 10);
};

// ── UPDATE ────────────────────────────────────────────────────

/**
 * Full update of a bursary's editable fields.
 * Only called when bursaryService confirms no applications exist yet.
 * Does NOT touch is_active — that has its own function
 * since closing a bursary is a distinct action from editing terms.
 */
const updateBursary = async (bursary_id, {
  title,
  description,
  eligibility_criteria,
  amount,
  slots,
  deadline,
}) => {
  const result = await pool.query(
    `UPDATE bursaries SET
       title                 = $1,
       description           = $2,
       eligibility_criteria  = $3,
       amount                = $4,
       slots                 = $5,
       deadline              = $6,
       updated_at            = NOW()
     WHERE bursary_id = $7
     RETURNING *`,
    [
      title,
      description          || null,
      eligibility_criteria  || null,
      amount,
      slots                 || null,
      deadline,
      bursary_id,
    ]
  );
  return result.rows[0] || null;
};

/**
 * Toggles a bursary active/inactive.
 * This is the ONLY delete mechanism — never a hard DROP,
 * since applications may already reference this bursary.
 * Sponsor can close early (set false); admin can also
 * deactivate a bursary if it violates platform rules.
 */
const setBursaryActiveStatus = async (bursary_id, is_active) => {
  const result = await pool.query(
    `UPDATE bursaries SET
       is_active  = $1,
       updated_at = NOW()
     WHERE bursary_id = $2
     RETURNING bursary_id, title, is_active, updated_at`,
    [is_active, bursary_id]
  );
  return result.rows[0] || null;
};

// ─────────────────────────────────────────────────────────────

module.exports = {
  // Create
  createBursary,

  // Find
  findActiveBursaries,
  findBursaryById,
  findBursariesBySponsorId,
  findAllBursaries,
  countApplicationsForBursary,

  // Update
  updateBursary,
  setBursaryActiveStatus,
};