const studentRepository = require('../../repositories/studentRepository');
const userRepository = require('../../repositories/userRepository');
const { fail } = require('../utils/authUtils');

/*
  STUDENT SERVICE
  ───────────────
  Business logic for student profile operations.
  Rules enforced here, not in the controller or repository.

  Controller → Service → Repository → DB
*/

// ── GET PROFILE ───────────────────────────────────────────────
/**
 * Returns the full student profile joined with school info.
 * Used on the student dashboard.
 */
const getStudentProfile = async (user_id) => {
  const profile = await studentRepository.findStudentByUserId(user_id);
  if (!profile) throw fail('Student profile not found.', 404);
  return profile;
};

// ── UPDATE PROFILE ────────────────────────────────────────────
/**
 * Business rules:
 * 1. Student must exist
 * 2. A verified student cannot edit their profile —
 *    changes after verification require admin involvement.
 *    (Prevents swapping school/admission after being approved.)
 * 3. fee_balance must be a positive number
 * 4. year_of_study must be between 1 and 8
 */
const updateStudentProfile = async (user_id, data) => {
  const existing = await studentRepository.findStudentByUserId(user_id);
  if (!existing) throw fail('Student profile not found.', 404);

  if (existing.status === 'verified') {
    throw fail(
      'Your profile is verified and cannot be edited. Contact support if changes are needed.',
      403
    );
  }

  const { school_id, admission_no, course, year_of_study, fee_balance, story, photo_url } = data;

  if (fee_balance !== undefined && (isNaN(fee_balance) || Number(fee_balance) < 0)) {
    throw fail('Fee balance must be a positive number.', 400);
  }

  if (year_of_study !== undefined && (year_of_study < 1 || year_of_study > 8)) {
    throw fail('Year of study must be between 1 and 8.', 400);
  }

  const updated = await studentRepository.updateStudentProfile(user_id, {
    school_id:    school_id    ?? existing.school_id,
    admission_no: admission_no ?? existing.admission_no,
    course:       course       ?? existing.course,
    year_of_study: year_of_study ?? existing.year_of_study,
    fee_balance:  fee_balance  ?? existing.fee_balance,
    story:        story        ?? existing.story,
    photo_url:    photo_url    ?? existing.photo_url,
  });

  return updated;
};

// ── UPDATE DOCUMENT ───────────────────────────────────────────
/**
 * Updates the fee statement document URL.
 * Called after a successful file upload.
 * Business rule: verified students cannot replace their document —
 * the document was part of what got them verified.
 */
const updateStudentDocument = async (user_id, doc_url) => {
  const existing = await studentRepository.findStudentByUserId(user_id);
  if (!existing) throw fail('Student profile not found.', 404);

  if (existing.status === 'verified') {
    throw fail(
      'Your profile is verified. Documents cannot be replaced. Contact support.',
      403
    );
  }

  if (!doc_url) throw fail('Document URL is required.', 400);

  const updated = await studentRepository.updateDocUrl(user_id, doc_url);
  return updated;
};

// ── ADMIN: GET ALL STUDENTS ───────────────────────────────────
/**
 * Returns all students, optionally filtered by status.
 * status filter values: 'pending' | 'verified' | 'rejected' | null (all)
 */
const getAllStudents = async (status = null) => {
  const allowed = ['pending', 'verified', 'rejected'];
  if (status && !allowed.includes(status)) {
    throw fail(`Invalid status filter. Must be one of: ${allowed.join(', ')}.`, 400);
  }
  return studentRepository.findAllStudents(status);
};

// ── ADMIN: GET STUDENT BY ID ──────────────────────────────────
const getStudentById = async (student_id) => {
  const student = await studentRepository.findStudentById(student_id);
  if (!student) throw fail('Student not found.', 404);
  return student;
};

// ── ADMIN: UPDATE STUDENT STATUS ──────────────────────────────
/**
 * Business rules:
 * 1. Status must be 'pending' | 'verified' | 'rejected'
 * 2. admin_note is mandatory when rejecting
 * 3. Cannot re-verify an already verified student without a note
 */
const updateStudentStatus = async (student_id, status, admin_note) => {
  const allowed = ['pending', 'verified', 'rejected'];
  if (!allowed.includes(status)) {
    throw fail(`Status must be one of: ${allowed.join(', ')}.`, 400);
  }

  if (status === 'rejected' && !admin_note?.trim()) {
    throw fail('A rejection reason is required when rejecting a student.', 400);
  }

  const existing = await studentRepository.findStudentById(student_id);
  if (!existing) throw fail('Student not found.', 404);

  const updated = await studentRepository.updateStudentStatus(student_id, status, admin_note || null);
  return updated;
};

module.exports = {
  getStudentProfile,
  updateStudentProfile,
  updateStudentDocument,
  getAllStudents,
  getStudentById,
  updateStudentStatus,
};