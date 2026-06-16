const sponsorRepository = require('../../repositories/sponsorRepository');
const { fail } = require('../utils/authUtils');



// ── GET OWN PROFILE ───────────────────────────────────────────
/**
 * Returns the full sponsor profile joined with user info.
 * Used on the sponsor dashboard.
 */
const getSponsorProfile = async (user_id) => {
  const profile = await sponsorRepository.findSponsorByUserId(user_id);
  if (!profile) throw fail('Sponsor profile not found.', 404);
  return profile;
};

// ── UPDATE OWN PROFILE ────────────────────────────────────────

const updateSponsorProfile = async (user_id, data) => {
  const existing = await sponsorRepository.findSponsorByUserId(user_id);
  if (!existing) throw fail('Sponsor profile not found.', 404);

  if (existing.status === 'rejected') {
    throw fail(
      'Your account has been rejected. Contact support to appeal before making changes.',
      403
    );
  }

  const VALID_TYPES = ['ngo', 'company', 'individual', 'government', 'religious', 'alumni'];

  const { organization_name, organization_type, website, description } = data;

  if (!organization_name?.trim()) {
    throw fail('Organization name is required.', 400);
  }

  if (organization_type && !VALID_TYPES.includes(organization_type)) {
    throw fail(
      `Invalid organization type. Must be one of: ${VALID_TYPES.join(', ')}.`,
      400
    );
  }

  const updated = await sponsorRepository.updateSponsorProfile(user_id, {
    organization_name: organization_name.trim(),
    organization_type: organization_type ?? existing.organization_type,
    website:           website           ?? existing.website,
    description:       description       ?? existing.description,
  });

  return updated;
};

// ── GET OWN STATS ─────────────────────────────────────────────

const getSponsorStats = async (user_id) => {
  const existing = await sponsorRepository.findSponsorByUserId(user_id);
  if (!existing) throw fail('Sponsor profile not found.', 404);

  if (existing.status !== 'verified') {
    throw fail(
      'Stats are available after your account is approved by an administrator.',
      403
    );
  }

  const stats = await sponsorRepository.findSponsorStats(existing.sponsor_id);
  return stats;
};

// ── SHARED GUARD: ASSERT SPONSOR IS VERIFIED ──────────────────

const assertSponsorVerified = async (user_id) => {
  const sponsor = await sponsorRepository.findSponsorByUserId(user_id);

  if (!sponsor) {
    throw fail('Sponsor profile not found.', 404);
  }

  if (!sponsor.is_email_verified) {
    throw fail(
      'Please verify your email address before creating bursaries.',
      403
    );
  }

  if (sponsor.status === 'pending') {
    throw fail(
      'Your account is pending admin approval. You will be notified once approved.',
      403
    );
  }

  if (sponsor.status === 'rejected') {
    throw fail(
      'Your account has been rejected and cannot create bursaries. Contact support.',
      403
    );
  }

  return sponsor;
};

module.exports = {
  getSponsorProfile,
  updateSponsorProfile,
  getSponsorStats,
  assertSponsorVerified,
};