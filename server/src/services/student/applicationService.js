const applicationRepository = require('../../repositories/applicationRepository');
const studentRepository     = require('../../repositories/studentRepository');
const bursaryRepository     = require('../../repositories/bursaryRepository');
const { fail } = require('../utils/authUtils');

/*
  APPLICATION SERVICE
  ────────────────────
  Business logic for application operations.
  All four confirmed rules enforced here:

  1. Only verified students can apply
  2. Cannot apply to a closed or expired bursary
  3. Maximum 3 active applications simultaneously
  4. Withdrawal only allowed when status = 'pending'
*/

const ACTIVE_STATUSES = ['pending', 'under_review', 'approved'];
const MAX_ACTIVE_APPLICATIONS = 3;

// ── APPLY ─────────────────────────────────────────────────────

/**
 * Student applies to a bursary.
 * Guards run in this exact order — most specific errors first
 * so the student always gets a meaningful message.
 */
const applyForBursary = async (user_id, bursary_id, motivation_letter) => {
  // Guard 1: student profile must exist
  const student = await studentRepository.findStudentByUserId(user_id);
  if (!student) throw fail('Student profile not found.', 404);

  // Guard 2: student must be verified — no unconfirmed enrollments
  if (student.status !== 'verified') {
    throw fail(
      'Your profile must be verified by an administrator before you can apply for bursaries.',
      403
    );
  }

  // Guard 3: bursary must exist
  const bursary = await bursaryRepository.findBursaryById(bursary_id);
  if (!bursary) throw fail('Bursary not found.', 404);

  // Guard 4: bursary must be active
  if (!bursary.is_active) {
    throw fail('This bursary is no longer accepting applications.', 400);
  }

  // Guard 5: bursary deadline must not have passed
  if (new Date(bursary.deadline) < new Date()) {
    throw fail('The deadline for this bursary has passed.', 400);
  }

  // Guard 6: student cannot apply to the same bursary twice
  const existing = await applicationRepository.findExistingApplication(
    student.student_id,
    bursary_id
  );
  if (existing) {
    throw fail(
      `You have already applied to this bursary. Current status: ${existing.status}.`,
      409
    );
  }

  // Guard 7: max 3 active applications simultaneously
  const activeCount = await applicationRepository.countActiveApplications(student.student_id);
  if (activeCount >= MAX_ACTIVE_APPLICATIONS) {
    throw fail(
      `You have reached the maximum of ${MAX_ACTIVE_APPLICATIONS} active applications. ` +
      'Wait for a decision on one of your existing applications before applying again.',
      400
    );
  }

  const application = await applicationRepository.createApplication(
    student.student_id,
    bursary_id,
    motivation_letter
  );

  return application;
};

// ── READ ──────────────────────────────────────────────────────

/**
 * Student views their own applications.
 */
const getMyApplications = async (user_id) => {
  const student = await studentRepository.findStudentByUserId(user_id);
  if (!student) throw fail('Student profile not found.', 404);
  return applicationRepository.findApplicationsByStudentId(student.student_id);
};

/**
 * Single application detail.
 * Used by student, sponsor, and admin — each with their
 * own ownership check in the respective route handler.
 */
const getApplicationById = async (application_id) => {
  const application = await applicationRepository.findApplicationById(application_id);
  if (!application) throw fail('Application not found.', 404);
  return application;
};

/**
 * Sponsor views all applications for one of their bursaries.
 * Ownership check: the bursary must belong to this sponsor.
 */
const getApplicationsForBursary = async (user_id, bursary_id) => {
  const bursary = await bursaryRepository.findBursaryById(bursary_id);
  if (!bursary) throw fail('Bursary not found.', 404);

  // Find sponsor profile to compare ownership
  const { sponsorRepository } = require('../../repositories/sponsorRepository');
  const sponsor = await require('../../repositories/sponsorRepository').findSponsorByUserId(user_id);
  if (!sponsor) throw fail('Sponsor profile not found.', 404);

  if (bursary.sponsor_id !== sponsor.sponsor_id) {
    throw fail('You can only view applications for bursaries you created.', 403);
  }

  return applicationRepository.findApplicationsByBursaryId(bursary_id);
};

// ── WITHDRAW ──────────────────────────────────────────────────

/**
 * Student withdraws their own application.
 * Business rules:
 * 1. Application must belong to this student
 * 2. Status must be 'pending' — once under review it's
 *    in admin/sponsor hands and cannot be withdrawn
 */
const withdrawApplication = async (user_id, application_id) => {
  const student = await studentRepository.findStudentByUserId(user_id);
  if (!student) throw fail('Student profile not found.', 404);

  const application = await applicationRepository.findApplicationById(application_id);
  if (!application) throw fail('Application not found.', 404);

  if (application.student_id !== student.student_id) {
    throw fail('You can only withdraw your own applications.', 403);
  }

  if (application.status !== 'pending') {
    throw fail(
      `This application cannot be withdrawn because it is currently '${application.status}'. ` +
      'Only pending applications can be withdrawn.',
      400
    );
  }

  await applicationRepository.deleteApplication(application_id);
};

// ── ADMIN ─────────────────────────────────────────────────────

/**
 * Admin lists all applications, optionally filtered by status.
 */
const getAllApplications = async (status = null) => {
  const VALID_STATUSES = ['pending', 'under_review', 'approved', 'rejected', 'funded'];
  if (status && !VALID_STATUSES.includes(status)) {
    throw fail(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}.`, 400);
  }
  return applicationRepository.findAllApplications(status);
};

/**
 * Admin updates application status.
 * Business rules:
 * 1. Valid status transitions only
 * 2. rejection_reason mandatory when rejecting
 * 3. Cannot move backward in the lifecycle
 *    (e.g. approved → pending is not allowed)
 */
const updateApplicationStatus = async (application_id, status, reviewed_by, rejection_reason) => {
  const VALID_STATUSES = ['pending', 'under_review', 'approved', 'rejected', 'funded'];
  if (!VALID_STATUSES.includes(status)) {
    throw fail(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}.`, 400);
  }

  const existing = await applicationRepository.findApplicationById(application_id);
  if (!existing) throw fail('Application not found.', 404);

  // Prevent backward transitions
  const ORDER = ['pending', 'under_review', 'approved', 'funded'];
  const currentIndex = ORDER.indexOf(existing.status);
  const newIndex     = ORDER.indexOf(status);

  if (existing.status === 'rejected') {
    throw fail('A rejected application cannot be updated.', 400);
  }

  if (existing.status === 'funded') {
    throw fail('A funded application cannot be updated.', 400);
  }

  if (newIndex !== -1 && currentIndex !== -1 && newIndex < currentIndex) {
    throw fail(
      `Cannot move application backward from '${existing.status}' to '${status}'.`,
      400
    );
  }

  if (status === 'rejected' && !rejection_reason?.trim()) {
    throw fail('A rejection reason is required when rejecting an application.', 400);
  }

  return applicationRepository.updateApplicationStatus(
    application_id,
    status,
    reviewed_by,
    rejection_reason || null
  );
};

module.exports = {
  // Student
  applyForBursary,
  getMyApplications,
  withdrawApplication,

  // Shared
  getApplicationById,
  getApplicationsForBursary,

  // Admin
  getAllApplications,
  updateApplicationStatus,
};