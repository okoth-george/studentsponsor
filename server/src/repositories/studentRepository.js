const pool = require('../config/db');

/*
  STUDENT REPOSITORY
  ──────────────────
  The ONLY place in the codebase that writes raw SQL
  for student-related operations.

  Rules:
  - No business logic — just data in, data out
  - Every function takes plain values, returns plain objects
  - Services never see pool.query directly
  - Consistent with userRepository pattern
*/

// ── CREATE ────────────────────────────────────────────────────

/**
 * Called immediately after a student user is registered.
 * Creates a blank student row linked to the user.
 * Profile fields are filled in a separate updateStudentProfile call.
 */
const createStudentProfile = async (user_id) => {
  const result = await pool.query(
    `INSERT INTO students (user_id)
     VALUES ($1)
     RETURNING *`,
    [user_id]
  );
  return result.rows[0];
};

// ── FIND ──────────────────────────────────────────────────────

/**
 * Full student record joined with school info.
 * Used by the student viewing their own profile.
 */
const findStudentByUserId = async (user_id) => {
  const result = await pool.query(
    `SELECT
       s.*,
       sc.name           AS school_name,
       sc.paybill_number AS school_paybill,
       sc.county         AS school_county
     FROM students s
     LEFT JOIN schools sc ON s.school_id = sc.school_id
     WHERE s.user_id = $1`,
    [user_id]
  );
  return result.rows[0] || null;
};

/**
 * Lookup by student_id (not user_id).
 * Used when admin or sponsor references a student
 * via application or payment record.
 */
const findStudentById = async (student_id) => {
  const result = await pool.query(
    `SELECT
       s.*,
       u.full_name,
       u.email,
       u.phone,
       sc.name           AS school_name,
       sc.paybill_number AS school_paybill,
       sc.county         AS school_county
     FROM students s
     JOIN  users   u  ON s.user_id   = u.user_id
     LEFT JOIN schools sc ON s.school_id = sc.school_id
     WHERE s.student_id = $1`,
    [student_id]
  );
  return result.rows[0] || null;
};

/**
 * Lightweight summary — only what the dashboard header needs.
 * Avoids pulling the full row on every page load.
 */
const findStudentSummary = async (user_id) => {
  const result = await pool.query(
    `SELECT student_id, status, fee_balance
     FROM students
     WHERE user_id = $1`,
    [user_id]
  );
  return result.rows[0] || null;
};

/**
 * Admin: list all students with user info and school name.
 * Supports optional status filter ('pending', 'verified', 'rejected').
 * Returns newest first.
 */
const findAllStudents = async (status = null) => {
  const result = await pool.query(
    `SELECT
       s.student_id,
       s.status,
       s.fee_balance,
       s.course,
       s.year_of_study,
       s.admission_no,
       s.created_at,
       u.full_name,
       u.email,
       u.phone,
       sc.name AS school_name
     FROM students s
     JOIN  users   u  ON s.user_id   = u.user_id
     LEFT JOIN schools sc ON s.school_id = sc.school_id
     WHERE ($1::text IS NULL OR s.status = $1)
     ORDER BY s.created_at DESC`,
    [status]
  );
  return result.rows;
};

// ── UPDATE ────────────────────────────────────────────────────

/**
 * Full profile update — all editable fields at once.
 * MVP choice: simple over partial update.
 * Caller passes all fields; nulls are accepted.
 * Does NOT touch status, admin_note, or doc_url
 * (those have dedicated functions).
 */
const updateStudentProfile = async (user_id, {
  school_id,
  admission_no,
  course,
  year_of_study,
  fee_balance,
  story,
  photo_url,
}) => {
  const result = await pool.query(
    `UPDATE students SET
       school_id     = $1,
       admission_no  = $2,
       course        = $3,
       year_of_study = $4,
       fee_balance   = $5,
       story         = $6,
       photo_url     = $7,
       updated_at    = NOW()
     WHERE user_id = $8
     RETURNING *`,
    [
      school_id     || null,
      admission_no  || null,
      course        || null,
      year_of_study || null,
      fee_balance   ?? 0.00,
      story         || null,
      photo_url     || null,
      user_id,
    ]
  );
  return result.rows[0] || null;
};

/**
 * Updates only the fee statement document URL.
 * Kept separate because file upload is a distinct
 * HTTP flow from profile form submission.
 */
const updateDocUrl = async (user_id, doc_url) => {
  const result = await pool.query(
    `UPDATE students SET
       doc_url    = $1,
       updated_at = NOW()
     WHERE user_id = $2
     RETURNING student_id, doc_url, updated_at`,
    [doc_url, user_id]
  );
  return result.rows[0] || null;
};

/**
 * Admin only: change verification status and leave a note.
 * status must be one of: 'pending' | 'verified' | 'rejected'
 * admin_note is mandatory when rejecting (enforced in service layer).
 */
const updateStudentStatus = async (student_id, status, admin_note = null) => {
  const result = await pool.query(
    `UPDATE students SET
       status     = $1,
       admin_note = $2,
       updated_at = NOW()
     WHERE student_id = $3
     RETURNING student_id, status, admin_note, updated_at`,
    [status, admin_note, student_id]
  );
  return result.rows[0] || null;
};

/**
 * Admin or school: update fee balance after a payment is confirmed.
 * Called by paymentService after school_confirmed = true,
 * not called directly by the student.
 */
const updateFeeBalance = async (student_id, new_balance) => {
  const result = await pool.query(
    `UPDATE students SET
       fee_balance = $1,
       updated_at  = NOW()
     WHERE student_id = $2
     RETURNING student_id, fee_balance, updated_at`,
    [new_balance, student_id]
  );
  return result.rows[0] || null;
};

// ─────────────────────────────────────────────────────────────

module.exports = {
  // Create
  createStudentProfile,

  // Find
  findStudentByUserId,
  findStudentById,
  findStudentSummary,
  findAllStudents,

  // Update
  updateStudentProfile,
  updateDocUrl,
  updateStudentStatus,
  updateFeeBalance,
};