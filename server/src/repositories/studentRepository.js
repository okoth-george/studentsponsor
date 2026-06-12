const pool = require('../config/db');

/*
  STUDENT REPOSITORY
  ───────────────────
  Handles all database operations related to students only.
*/

// ── CREATE STUDENT PROFILE ────────────────────────────────
const createStudentProfile = async (user_id) => {
  await pool.query(
    'INSERT INTO students (user_id) VALUES ($1)',
    [user_id]
  );
};

// ── FIND STUDENT BY USER ID ───────────────────────────────
const findStudentByUserId = async (user_id) => {
  const result = await pool.query(
    `SELECT s.*, sc.name AS school_name, sc.paybill_number
     FROM students s
     LEFT JOIN schools sc ON s.school_id = sc.school_id
     WHERE s.user_id = $1`,
    [user_id]
  );
  return result.rows[0] || null;
};

// ── GET STUDENT SUMMARY ───────────────────────────────────
const findStudentSummary = async (user_id) => {
  const result = await pool.query(
    `SELECT student_id, status, fee_balance
     FROM students
     WHERE user_id = $1`,
    [user_id]
  );
  return result.rows[0] || null;
};

module.exports = {
  createStudentProfile,
  findStudentByUserId,
  findStudentSummary,
};