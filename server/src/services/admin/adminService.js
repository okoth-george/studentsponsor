const bcrypt = require('bcryptjs');
const studentRepository = require('../../repositories/studentRepository');
const sponsorRepository = require('../../repositories/sponsorRepository');
const userRepository = require('../../repositories/userRepository');
const { sanitizeUser, fail } = require('../utils/authUtils');

/*
  ADMIN SERVICE
  ─────────────
  Admin has no profile table of its own — it operates directly
  on studentRepository and sponsorRepository.

  This file owns ALL business rules for admin actions on
  students and sponsors. Student/sponsor-facing services
  (studentService.js, sponsorService.js) do NOT expose
  admin actions — that separation is intentional.

  Controller → Service → Repository → DB
*/

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

// ── CREATE ADMIN ──────────────────────────────────────────────

/**
 * An existing admin creates a new admin account directly.
 * Bypasses the public registration flow entirely:
 * - No email verification token, no "check your email" step
 * - is_email_verified = true immediately
 * - New admin can log in right away with the password set here
 *
 * Business rules:
 * 1. full_name, email, password are required
 * 2. Email must be unique across the whole users table
 * 3. Password must meet the same strength rules as public
 *    registration (checked here since this bypasses
 *    validateRegister middleware)
 * 4. New admin should change their password after first login —
 *    not enforced by the system, just a recommendation surfaced
 *    in the response message
 */
const createAdmin = async ({ full_name, email, password, phone }) => {
  if (!full_name?.trim()) throw fail('Full name is required.', 400);
  if (!email?.trim())     throw fail('Email is required.', 400);
  if (!password)          throw fail('Password is required.', 400);

  const strongPassword =
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (!strongPassword) {
    throw fail(
      'Password must be at least 8 characters and include an uppercase letter, lowercase letter, number, and special character.',
      400
    );
  }

  const existing = await userRepository.findByEmail(email.toLowerCase());
  if (existing) throw fail('An account with this email already exists.', 409);

  const hashedPassword = await bcrypt.hash(password, 12);

  // Create directly as a fully verified admin —
  // no verifyToken/verifyExpires needed since this skips
  // the public verification flow entirely.
  const newAdmin = await userRepository.create({
    full_name,
    email: email.toLowerCase(),
    password: hashedPassword,
    role: 'admin',
    phone,
    verifyToken: null,
    verifyExpires: null,
  });

  // Mark verified immediately since admin vouched for this account
  await userRepository.markEmailVerified(newAdmin.user_id);

  return sanitizeUser(newAdmin);
};



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
  // Admin management
  createAdmin,

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