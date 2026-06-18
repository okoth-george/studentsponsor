const bursaryRepository = require('../../repositories/bursaryRepository');
const sponsorRepository = require('../../repositories/sponsorRepository');
const sponsorService    = require('./sponsorService');
const { fail } = require('../utils/authUtils');

/*
  BURSARY SERVICE
  ───────────────
  Business logic for bursary operations.
  Rules enforced here, not in the controller or repository.

  Controller → Service → Repository → DB

  Key rule: a sponsor must pass BOTH gates
  (email verified + admin approved) before creating
  or editing bursaries. Enforced via sponsorService.assertSponsorVerified.
*/

// ── CREATE ────────────────────────────────────────────────────

/**
 * Sponsor creates a new bursary.
 * Business rules:
 * 1. Sponsor must be verified (both gates) — assertSponsorVerified
 *    throws a descriptive error for each failure state.
 * 2. amount must be a positive number
 * 3. deadline must be in the future — a bursary with a past
 *    deadline is meaningless and confusing to students
 * 4. slots, if provided, must be a positive integer
 * 5. title is required
 */
const createBursary = async (user_id, data) => {
  const sponsor = await sponsorService.assertSponsorVerified(user_id);

  const { title, description, eligibility_criteria, amount, slots, deadline } = data;

  if (!title?.trim()) {
    throw fail('Bursary title is required.', 400);
  }

  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    throw fail('Amount must be a positive number.', 400);
  }

  if (!deadline) {
    throw fail('Deadline is required.', 400);
  }

  const deadlineDate = new Date(deadline);
  if (isNaN(deadlineDate.getTime()) || deadlineDate < new Date()) {
    throw fail('Deadline must be a valid future date.', 400);
  }

  if (slots !== undefined && slots !== null && (isNaN(slots) || Number(slots) <= 0)) {
    throw fail('Slots must be a positive number, or omitted for unlimited.', 400);
  }

  const bursary = await bursaryRepository.createBursary(sponsor.sponsor_id, {
    title: title.trim(),
    description,
    eligibility_criteria,
    amount,
    slots,
    deadline,
  });

  return bursary;
};

// ── READ ──────────────────────────────────────────────────────

/**
 * Public listing of active, open bursaries.
 * No auth required — even unverified students can browse,
 * per the earlier decision that browsing shows value early.
 */
const getActiveBursaries = async () => {
  return bursaryRepository.findActiveBursaries();
};

/**
 * Single bursary detail — public.
 */
const getBursaryById = async (bursary_id) => {
  const bursary = await bursaryRepository.findBursaryById(bursary_id);
  if (!bursary) throw fail('Bursary not found.', 404);
  return bursary;
};

/**
 * Sponsor's own bursaries — including inactive and expired.
 * Used on the sponsor dashboard to show full history.
 */
const getMyBursaries = async (user_id) => {
  const sponsor = await sponsorRepository.findSponsorByUserId(user_id);
  if (!sponsor) throw fail('Sponsor profile not found.', 404);

  return bursaryRepository.findBursariesBySponsorId(sponsor.sponsor_id);
};

// ── UPDATE ────────────────────────────────────────────────────

/**
 * Sponsor edits a bursary they own.
 * Business rules:
 * 1. Sponsor must be verified
 * 2. Bursary must exist
 * 3. Bursary must belong to this sponsor — a sponsor cannot
 *    edit another sponsor's bursary
 * 4. Editing is LOCKED once any application exists for this
 *    bursary — changing amount/deadline after someone applied
 *    is unfair to that applicant. Sponsor can still close it
 *    via setBursaryActive, just cannot change its terms.
 * 5. Same field validation as createBursary
 */
const updateBursary = async (user_id, bursary_id, data) => {
  const sponsor = await sponsorService.assertSponsorVerified(user_id);

  const existing = await bursaryRepository.findBursaryById(bursary_id);
  if (!existing) throw fail('Bursary not found.', 404);

  if (existing.sponsor_id !== sponsor.sponsor_id) {
    throw fail('You can only edit bursaries you created.', 403);
  }

  const applicationCount = await bursaryRepository.countApplicationsForBursary(bursary_id);
  if (applicationCount > 0) {
    throw fail(
      'This bursary cannot be edited because students have already applied. You may still close it early.',
      403
    );
  }

  const { title, description, eligibility_criteria, amount, slots, deadline } = data;

  if (!title?.trim()) {
    throw fail('Bursary title is required.', 400);
  }

  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    throw fail('Amount must be a positive number.', 400);
  }

  if (!deadline) {
    throw fail('Deadline is required.', 400);
  }

  const deadlineDate = new Date(deadline);
  if (isNaN(deadlineDate.getTime()) || deadlineDate < new Date()) {
    throw fail('Deadline must be a valid future date.', 400);
  }

  if (slots !== undefined && slots !== null && (isNaN(slots) || Number(slots) <= 0)) {
    throw fail('Slots must be a positive number, or omitted for unlimited.', 400);
  }

  const updated = await bursaryRepository.updateBursary(bursary_id, {
    title: title.trim(),
    description,
    eligibility_criteria,
    amount,
    slots,
    deadline,
  });

  return updated;
};

/**
 * Sponsor closes their own bursary early.
 * Unlike updateBursary, this is allowed even after
 * applications exist — closing just stops new applications,
 * it doesn't change terms for existing applicants.
 */
const closeBursary = async (user_id, bursary_id) => {
  const sponsor = await sponsorService.assertSponsorVerified(user_id);

  const existing = await bursaryRepository.findBursaryById(bursary_id);
  if (!existing) throw fail('Bursary not found.', 404);

  if (existing.sponsor_id !== sponsor.sponsor_id) {
    throw fail('You can only close bursaries you created.', 403);
  }

  if (!existing.is_active) {
    throw fail('This bursary is already closed.', 400);
  }

  return bursaryRepository.setBursaryActiveStatus(bursary_id, false);
};

/**
 * Sponsor reopens a bursary they previously closed.
 * Blocked if the deadline has already passed —
 * reopening an expired bursary is meaningless.
 */
const reopenBursary = async (user_id, bursary_id) => {
  const sponsor = await sponsorService.assertSponsorVerified(user_id);

  const existing = await bursaryRepository.findBursaryById(bursary_id);
  if (!existing) throw fail('Bursary not found.', 404);

  if (existing.sponsor_id !== sponsor.sponsor_id) {
    throw fail('You can only reopen bursaries you created.', 403);
  }

  if (existing.is_active) {
    throw fail('This bursary is already active.', 400);
  }

  if (new Date(existing.deadline) < new Date()) {
    throw fail('Cannot reopen a bursary whose deadline has already passed.', 400);
  }

  return bursaryRepository.setBursaryActiveStatus(bursary_id, true);
};

// ── ADMIN ─────────────────────────────────────────────────────

/**
 * Admin: list all bursaries regardless of sponsor or status.
 * is_active filter optional: true | false | null (all)
 */
const getAllBursariesForAdmin = async (is_active = null) => {
  return bursaryRepository.findAllBursaries(is_active);
};

/**
 * Admin: force-deactivate a bursary that violates platform rules.
 * Unlike sponsor's closeBursary, admin can deactivate regardless
 * of ownership — this is a moderation action.
 */
const adminDeactivateBursary = async (bursary_id) => {
  const existing = await bursaryRepository.findBursaryById(bursary_id);
  if (!existing) throw fail('Bursary not found.', 404);

  if (!existing.is_active) {
    throw fail('This bursary is already inactive.', 400);
  }

  return bursaryRepository.setBursaryActiveStatus(bursary_id, false);
};

module.exports = {
  // Sponsor-facing
  createBursary,
  getMyBursaries,
  updateBursary,
  closeBursary,
  reopenBursary,

  // Public
  getActiveBursaries,
  getBursaryById,

  // Admin
  getAllBursariesForAdmin,
  adminDeactivateBursary,
};