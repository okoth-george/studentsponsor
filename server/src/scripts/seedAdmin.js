

require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const [, , argName, argEmail, argPassword, argPhone] = process.argv;

// In production, no hardcoded fallback — force explicit input
const FALLBACK_NAME     = IS_PRODUCTION ? null : 'Admin User';
const FALLBACK_EMAIL    = IS_PRODUCTION ? null : 'admin@edubridge.com';
const FALLBACK_PASSWORD = IS_PRODUCTION ? null : 'Test1234!';
const FALLBACK_PHONE    = IS_PRODUCTION ? null : '254700000001';

const ADMIN_NAME     = argName     || process.env.SEED_ADMIN_NAME     || FALLBACK_NAME;
const ADMIN_EMAIL    = argEmail    || process.env.SEED_ADMIN_EMAIL    || FALLBACK_EMAIL;
const ADMIN_PASSWORD = argPassword || process.env.SEED_ADMIN_PASSWORD || FALLBACK_PASSWORD;
const ADMIN_PHONE    = argPhone    || process.env.SEED_ADMIN_PHONE    || FALLBACK_PHONE;

// Same phone format your validators.js enforces for everyone else.
// Seeding directly bypasses express-validator, so we check manually here.
const PHONE_REGEX = /^2547\d{8}$/;

const validateInputs = () => {
  if (IS_PRODUCTION && (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD)) {
    throw new Error(
      'Refusing to run in production without explicit admin details. ' +
      'Pass them as arguments or set SEED_ADMIN_NAME / SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD.'
    );
  }

  if (!ADMIN_NAME?.trim()) throw new Error('Admin name is required.');
  if (!/^\S+@\S+\.\S+$/.test(ADMIN_EMAIL)) throw new Error('A valid admin email is required.');

  const strongPassword =
    ADMIN_PASSWORD.length >= 8 &&
    /[A-Z]/.test(ADMIN_PASSWORD) &&
    /[a-z]/.test(ADMIN_PASSWORD) &&
    /[0-9]/.test(ADMIN_PASSWORD) &&
    /[!@#$%^&*(),.?":{}|<>]/.test(ADMIN_PASSWORD);

  if (!strongPassword) {
    throw new Error(
      'Password must be at least 8 characters and include an uppercase letter, ' +
      'lowercase letter, number, and special character.'
    );
  }

  if (ADMIN_PHONE && !PHONE_REGEX.test(ADMIN_PHONE)) {
    throw new Error('Phone must be in format 2547XXXXXXXX (Kenyan M-Pesa format).');
  }
};

const seedAdmin = async () => {
  try {
    validateInputs();

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

    const existing = await pool.query(
      'SELECT user_id FROM users WHERE email = $1',
      [ADMIN_EMAIL.toLowerCase()]
    );

    if (existing.rows.length > 0) {
      // Admin already exists — update password instead of duplicating
      await pool.query(
        `UPDATE users SET
           password = $1,
           updated_at = NOW()
         WHERE email = $2`,
        [hashedPassword, ADMIN_EMAIL.toLowerCase()]
      );
      console.log(`✔ Admin password updated for ${ADMIN_EMAIL}`);
    } else {
      // Create fresh admin account
      await pool.query(
        `INSERT INTO users
           (full_name, email, password, role, phone, is_email_verified)
         VALUES ($1, $2, $3, 'admin', $4, true)`,
        [ADMIN_NAME, ADMIN_EMAIL.toLowerCase(), hashedPassword, ADMIN_PHONE || null]
      );
      console.log(`✔ Admin account created: ${ADMIN_EMAIL}`);
    }

    if (!IS_PRODUCTION) {
      console.log(`  Login with: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    } else {
      console.log('  Admin created. Password not printed in production mode.');
    }
  } catch (err) {
    console.error('✘ Seeding admin failed:', err.message);
    process.exitCode = 1;
  } finally {
    
    await pool.end();
  }
};

seedAdmin();