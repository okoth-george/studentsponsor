const studentRepository = require('../repositories/studentRepository');
const sponsorRepository = require('../repositories/sponsorRepository');
const { fail } = require('./utils/authUtils');



const STUDENT_STATUSES = ['pending', 'verified', 'rejected'];
const SPONSOR_STATUSES = ['pending', 'verified', 'rejected'];

// ── STUDENTS ────────────────────────────────────────────────

/**
 * List all students, optionally filtered by status.
 * Admin uses this to find students awaiting verification.
 */
const getAllStudents = async (status = null) => {
  if (status && !STUDENT_STATUSES.includes(status)) {
    throw fail(`Invalid status filter. Must be one of: ${STUDENT_STATUSES.join(', ')}.`, 400);
  }
  return studentRepository.findAllStudents(status);
};

/**
 * Get one student's full profile by student_id.
 */
const getStudentById = async (student_id) => {
  const student = await studentRepository.findStudentById(student_id);
  if (!student) throw fail('Student not found.', 404);
  return student;
};

/**
 * Verify or reject a student profile.
 * Business rules:
 * 1. status must be a valid value
 * 2. admin_note is mandatory when rejecting — student must know why
 * 3. Student must exist
 */
const updateStudentStatus = async (student_id, status, admin_note) => {
  if (!STUDENT_STATUSES.includes(status)) {
    throw fail(`Status must be one of: ${STUDENT_STATUSES.join(', ')}.`, 400);
  }

  if (status === 'rejected' && !admin_note?.trim()) {
    throw fail('A rejection reason is required when rejecting a student.', 400);
  }

  const existing = await studentRepository.findStudentById(student_id);
  if (!existing) throw fail('Student not found.', 404);

  return studentRepository.updateStudentStatus(student_id, status, admin_note || null);
};

// ── SPONSORS ────────────────────────────────────────────────

/**
 * List all sponsors, optionally filtered by status.
 * Admin uses this to find sponsors awaiting approval.
 */
const getAllSponsors = async (status = null) => {
  if (status && !SPONSOR_STATUSES.includes(status)) {
    throw fail(`Invalid status filter. Must be one of: ${SPONSOR_STATUSES.join(', ')}.`, 400);
  }
  return sponsorRepository.findAllSponsors(status);
};

/**
 * Get one sponsor's full profile by sponsor_id.
 */
const getSponsorById = async (sponsor_id) => {
  const sponsor = await sponsorRepository.findSponsorById(sponsor_id);
  if (!sponsor) throw fail('Sponsor not found.', 404);
  return sponsor;
};

/**
 * Approve or reject a sponsor.
 * Business rules:
 * 1. status must be a valid value
 * 2. admin_note mandatory on rejection
 * 3. Cannot approve a sponsor whose email is not yet verified —
 *    admin must not bypass the email verification gate
 * 4. Revoking a verified sponsor (verified → rejected) is allowed
 *    e.g. fraud discovered after approval
 */
const updateSponsorStatus = async (sponsor_id, status, admin_note) => {
  if (!SPONSOR_STATUSES.includes(status)) {
    throw fail(`Status must be one of: ${SPONSOR_STATUSES.join(', ')}.`, 400);
  }

  const existing = await sponsorRepository.findSponsorById(sponsor_id);
  if (!existing) throw fail('Sponsor not found.', 404);

  if (status === 'verified' && !existing.is_email_verified) {
    throw fail(
      'Cannot approve this sponsor. Their email address has not been verified yet.',
      400
    );
  }

  if (status === 'rejected' && !admin_note?.trim()) {
    throw fail('A rejection reason is required when rejecting a sponsor.', 400);
  }

  return sponsorRepository.updateSponsorStatus(sponsor_id, status, admin_note || null);
};

// ── DASHBOARD SUMMARY ───────────────────────────────────────

/**
 * Returns counts admin needs at a glance:
 * total students, pending students, total sponsors, pending sponsors.
 * Two lightweight queries — no new repository functions needed
 * since findAllStudents/findAllSponsors already exist.
 */
const getDashboardSummary = async () => {
  const [allStudents, pendingStudents, allSponsors, pendingSponsors] = await Promise.all([
    studentRepository.findAllStudents(null),
    studentRepository.findAllStudents('pending'),
    sponsorRepository.findAllSponsors(null),
    sponsorRepository.findAllSponsors('pending'),
  ]);

  return {
    total_students: allStudents.length,
    pending_students: pendingStudents.length,
    total_sponsors: allSponsors.length,
    pending_sponsors: pendingSponsors.length,
  };
};

module.exports = {
  // Students
  getAllStudents,
  getStudentById,
  updateStudentStatus,

  // Sponsors
  getAllSponsors,
  getSponsorById,
  updateSponsorStatus,

  // Dashboard
  getDashboardSummary,
};