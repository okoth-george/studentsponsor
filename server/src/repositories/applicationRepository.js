const pool = require('../config/db');


const createApplication = async (student_id, bursary_id, motivation_letter) => {
  const result = await pool.query(
    `INSERT INTO applications (student_id, bursary_id, motivation_letter)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [student_id, bursary_id, motivation_letter || null]
  );
  return result.rows[0];
};

// ── FIND ──────────────────────────────────────────────────────

/**
 * Student: view their own applications with bursary details.
 * Shows full history including all statuses.
 */
const findApplicationsByStudentId = async (student_id) => {
  const result = await pool.query(
    `SELECT
       a.*,
       b.title            AS bursary_title,
       b.amount           AS bursary_amount,
       b.deadline         AS bursary_deadline,
       sp.organization_name
     FROM applications a
     JOIN bursaries b  ON a.bursary_id = b.bursary_id
     JOIN sponsors  sp ON b.sponsor_id = sp.sponsor_id
     WHERE a.student_id = $1
     ORDER BY a.submitted_at DESC`,
    [student_id]
  );
  return result.rows;
};

/**
 * Sponsor: view all applications for a specific bursary.
 * Ownership check (bursary belongs to this sponsor) is
 * enforced in the service layer before this is called.
 */
const findApplicationsByBursaryId = async (bursary_id) => {
  const result = await pool.query(
    `SELECT
       a.*,
       u.full_name      AS student_name,
       u.email          AS student_email,
       u.phone          AS student_phone,
       s.admission_no,
       s.course,
       s.year_of_study,
       s.fee_balance,
       sc.name          AS school_name
     FROM applications a
     JOIN students  s  ON a.student_id  = s.student_id
     JOIN users     u  ON s.user_id     = u.user_id
     LEFT JOIN schools sc ON s.school_id = sc.school_id
     WHERE a.bursary_id = $1
     ORDER BY a.submitted_at DESC`,
    [bursary_id]
  );
  return result.rows;
};

/**
 * Admin: all applications across the platform.
 * Optional status filter — null returns everything.
 */
const findAllApplications = async (status = null) => {
  const result = await pool.query(
    `SELECT
       a.*,
       b.title            AS bursary_title,
       b.amount           AS bursary_amount,
       u.full_name        AS student_name,
       u.email            AS student_email,
       s.admission_no,
       s.course,
       sp.organization_name
     FROM applications a
     JOIN bursaries b  ON a.bursary_id = b.bursary_id
     JOIN students  s  ON a.student_id = s.student_id
     JOIN users     u  ON s.user_id    = u.user_id
     JOIN sponsors  sp ON b.sponsor_id = sp.sponsor_id
     WHERE ($1::text IS NULL OR a.status = $1)
     ORDER BY a.submitted_at DESC`,
    [status]
  );
  return result.rows;
};

/**
 * Single application — full detail with all joined data.
 * Used by service layer for ownership checks and
 * detailed views for sponsor and admin.
 */
const findApplicationById = async (application_id) => {
  const result = await pool.query(
    `SELECT
       a.*,
       b.title            AS bursary_title,
       b.amount           AS bursary_amount,
       b.deadline         AS bursary_deadline,
       b.sponsor_id,
       u.full_name        AS student_name,
       u.email            AS student_email,
       u.phone            AS student_phone,
       s.admission_no,
       s.course,
       s.year_of_study,
       s.fee_balance,
       s.story,
       s.doc_url,
       sc.name            AS school_name,
       sc.paybill_number,
       sp.organization_name
     FROM applications a
     JOIN bursaries b  ON a.bursary_id  = b.bursary_id
     JOIN students  s  ON a.student_id  = s.student_id
     JOIN users     u  ON s.user_id     = u.user_id
     LEFT JOIN schools sc ON s.school_id = sc.school_id
     JOIN sponsors  sp ON b.sponsor_id  = sp.sponsor_id
     WHERE a.application_id = $1`,
    [application_id]
  );
  return result.rows[0] || null;
};

/**
 * Checks if a student already applied to a specific bursary.
 * Returns the existing row (including status) so the service
 * can show a meaningful message like
 * "You already applied — current status: under_review".
 */
const findExistingApplication = async (student_id, bursary_id) => {
  const result = await pool.query(
    `SELECT application_id, status
     FROM applications
     WHERE student_id = $1 AND bursary_id = $2`,
    [student_id, bursary_id]
  );
  return result.rows[0] || null;
};

/**
 * Counts active applications for a student.
 * Active = pending, under_review, or approved.
 * Used to enforce the 3-application cap.
 * Named countActiveApplications to match service call.
 */
const countActiveApplications = async (student_id) => {
  const result = await pool.query(
    `SELECT COUNT(*) AS count
     FROM applications
     WHERE student_id = $1
       AND status IN ('pending', 'under_review', 'approved')`,
    [student_id]
  );
  return parseInt(result.rows[0].count, 10);
};

// ── UPDATE APPLICATION STATUS  ────────────────────────────────────────────────────

const updateApplicationStatus = async (
  application_id,
  status,
  reviewed_by,
  rejection_reason = null
) => {
  const result = await pool.query(
    `UPDATE applications SET
       status           = $1,
       reviewed_by      = $2,
       rejection_reason = $3,
       reviewed_at      = NOW(),
       updated_at       = NOW()
     WHERE application_id = $4
     RETURNING *`,
    [status, reviewed_by, rejection_reason, application_id]
  );
  return result.rows[0] || null;
};

// ── DELETE APPLICATION ────────────────────────────────────────────────────

const deleteApplication = async (application_id) => {
  await pool.query(
    'DELETE FROM applications WHERE application_id = $1',
    [application_id]
  );
};

// ─────────────────────────────────────────────────────────────

module.exports = {
  // Create
  createApplication,

  // Find
  findApplicationsByStudentId,
  findApplicationsByBursaryId,
  findAllApplications,
  findApplicationById,
  findExistingApplication,
  countActiveApplications,

  // Update
  updateApplicationStatus,

  // Delete
  deleteApplication,
};